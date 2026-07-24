"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clock,
  Copy,
  Inbox,
  Loader2,
  RefreshCw,
  SearchX,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { isValidDomainInput } from "@/lib/dns/validate";
import { resolveWithFallback } from "@/lib/dns/resolve";
import { normalizeRecords } from "@/lib/dns/parse";
import {
  RateLimitError,
  RECORD_TYPES,
  type DnsLookupState,
  type DnsSuccessResult,
  type NormalizedRecord,
  type RecordType,
} from "@/lib/dns/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** D-10 (locked): the demo domain resolved on first load — a real, stable
 * domain with a rich record set, thematically fitting since Cloudflare is
 * also the primary DoH resolver (D-01). Never reported to analytics per
 * D-03 regardless. */
const DEFAULT_DOMAIN = "cloudflare.com";
/** D-11 (locked): the most familiar/expected default record type. */
const DEFAULT_TYPE: RecordType = "A";
/** Open Question 1 (resolved): fixed constant within the locked 600-800ms
 * window, not runtime-configurable — matches this codebase's
 * `DEFAULT_CIDR`/`DEFAULT_REVERT_MS` one-true-value style. */
const DEBOUNCE_MS = 700;
/** A3 (resolved): per-resolver timeout ceiling lives in lib/dns/query.ts;
 * not duplicated here. */

const INVALID_DOMAIN_MESSAGE =
  "Enter a valid domain name, like cloudflare.com or example.co.uk.";

/** Exact D-05/D-06 Copywriting Contract strings (04-UI-SPEC.md) — verbatim,
 * never paraphrased, so the NXDOMAIN-vs-empty-NOERROR and
 * rate-limited-vs-resolver-unavailable distinctions read exactly as the
 * design contract specifies (Pitfall 6). */
const RATE_LIMITED_LABEL = "Too many lookups.";
const RATE_LIMITED_EXPLANATION = "Please wait a moment and try again.";
const RESOLVER_UNAVAILABLE_LABEL = "Resolvers unreachable.";
const RESOLVER_UNAVAILABLE_EXPLANATION =
  "DNS resolvers are unreachable right now — check your connection and try again.";

/** Type guard narrowing an arbitrary URL param string to a `RecordType`,
 * mirroring `lib/subnet/parse.ts`'s `isParseError` type-guard convention. */
function isRecordType(value: string | null): value is RecordType {
  return !!value && (RECORD_TYPES as readonly string[]).includes(value);
}

/**
 * Reads the initial domain + record type from `?name=&type=` entirely
 * client-side (RESEARCH.md Pattern 1, mirrors Subnet's
 * `getInitialCidrFromUrl`) — never `useSearchParams()`, since this
 * component is never server-rendered (`ssr:false`). An invalid/missing
 * `name` falls back to `DEFAULT_DOMAIN`; an invalid/missing `type` falls
 * back to `DEFAULT_TYPE` — independently, so a valid `name` with a garbled
 * `type` still resolves the right domain at the default type rather than
 * discarding both.
 */
function getInitialLookupFromUrl(): { domain: string; type: RecordType } {
  if (typeof window === "undefined") {
    return { domain: DEFAULT_DOMAIN, type: DEFAULT_TYPE };
  }
  const params = new URLSearchParams(window.location.search);
  const rawName = params.get("name");
  const rawType = params.get("type");
  const domain =
    rawName && isValidDomainInput(rawName) ? rawName : DEFAULT_DOMAIN;
  const type = isRecordType(rawType) ? rawType : DEFAULT_TYPE;
  return { domain, type };
}

/**
 * Writes the current domain + record type to the URL via the raw History
 * API (RESEARCH.md Pattern 2/Assumption A2) — never `router.replace()`.
 * Per A2, this is called only when a lookup actually commits (debounce
 * fires or an immediate trigger runs), never on every keystroke.
 */
function syncUrlToLookup(domain: string, type: RecordType): void {
  const params = new URLSearchParams();
  params.set("name", domain);
  params.set("type", type);
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", url);
}

/** Extracts the last successful result from any `DnsLookupState` variant —
 * `success` holds it directly as `result`; every other non-idle variant
 * carries it as `lastValidResult` (D-07's "keep last valid result visible"
 * principle, direct precedent from `SubnetTool.tsx`'s `lastValidCidr`). */
function lastValidResultFrom(lookup: DnsLookupState): DnsSuccessResult | null {
  if (lookup.status === "success") return lookup.result;
  if (lookup.status === "idle") return null;
  return lookup.lastValidResult;
}

/**
 * Classifies a thrown error from `resolveWithFallback` into its own distinct
 * QUAL-08 state (D-04/D-06, Pitfall 6) — `RateLimitError` (an HTTP 429 from
 * either resolver) and every other genuine failure (`ResolverFailureError`,
 * a raw network error, or a timeout) MUST NOT collapse into one generic
 * "something went wrong" branch; each carries independently worded copy and
 * its own inline Try-again affordance (T-04-06).
 */
function classifyError(
  err: unknown,
  lastValidResult: DnsSuccessResult | null
): DnsLookupState {
  if (err instanceof RateLimitError) {
    return { status: "rate-limited", lastValidResult };
  }
  return { status: "resolver-unavailable", lastValidResult };
}

type DnsToolState = {
  /** Always reflects exactly what's typed in the domain input — single
   * source of truth for the controlled field. */
  rawDomain: string;
  recordType: RecordType;
  lookup: DnsLookupState;
};

/** Fixed-height skeleton matching `DnsToolLoader.tsx`'s placeholder
 * (D-08) — shown here for the window between mount and the FIRST lookup
 * ever resolving, since `DnsToolLoader`'s own skeleton only covers the
 * earlier "before this island has even mounted" window. Exactly one of
 * the two is ever present in the DOM at a time. */
function DnsResultSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="dns-tool-skeleton"
      className="h-[420px] animate-pulse rounded-md border border-border bg-secondary"
    />
  );
}

/**
 * One independently-copyable DNS record row (value + TTL) — owns its own
 * `useCopyToClipboard()` instance so confirmation state never bleeds
 * between records (must_haves), mirrors `SubnetTool.tsx`'s `CopyableField`.
 */
function DnsRecordRow({
  index,
  record,
  recordType,
}: {
  index: number;
  record: NormalizedRecord;
  recordType: RecordType;
}) {
  const { copy, copied, error, reset } = useCopyToClipboard();

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset is a stable useCallback identity; omitted to avoid re-running on hook-identity changes.
  }, [record.value]);

  // MX display completeness (DNS-06): `record.value` is the untouched
  // "priority exchange" string from `normalizeValue` (lib/dns/parse.ts never
  // splits it) — split on the FIRST space only, so an exchange hostname can
  // never itself be mistaken for containing the priority.
  const isMx = recordType === "MX";
  const firstSpace = isMx ? record.value.indexOf(" ") : -1;
  const mxPriority = isMx && firstSpace !== -1 ? record.value.slice(0, firstSpace) : record.value;
  const mxExchange = isMx && firstSpace !== -1 ? record.value.slice(firstSpace + 1) : "";

  return (
    <div
      data-testid={`dns-record-row-${index}`}
      className="flex flex-col gap-1 rounded-md border border-border bg-secondary px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Every record value renders as a JSX text node only — never
            dangerouslySetInnerHTML — so attacker-controlled TXT/MX/NS/CNAME
            content is escaped by React's default rendering (T-04-01). */}
        {isMx ? (
          <span
            data-testid="dns-record-value"
            className="flex flex-wrap items-center gap-3 font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
          >
            <span data-testid="dns-mx-priority">
              <span className="font-sans text-[14px] font-semibold text-foreground">
                Priority:{" "}
              </span>
              {mxPriority}
            </span>
            <span data-testid="dns-mx-exchange" className="break-all">
              <span className="font-sans text-[14px] font-semibold text-foreground">
                Exchange:{" "}
              </span>
              {mxExchange}
            </span>
          </span>
        ) : (
          <span
            data-testid="dns-record-value"
            className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
          >
            {record.value}
          </span>
        )}
        <button
          type="button"
          onClick={() => copy(record.value)}
          aria-label={copied ? "Copied!" : "Copy record value"}
          data-testid={`dns-copy-record-${index}`}
          // 44x44 minimum hit area via padding; accent-tinted per UI-SPEC's
          // reserved list (every copy action).
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      {/* Not color-alone: icon swap above is the primary confirmation
          signal; this announces the same change to screen readers
          (QUAL-04/QUAL-05). */}
      <span
        aria-live="polite"
        className="sr-only"
        data-testid={`dns-copy-record-${index}-status`}
      >
        {copied ? "Copied!" : ""}
      </span>
      {error && (
        <span className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
          Couldn&apos;t copy — select the text and copy manually.
        </span>
      )}
      <span
        data-testid="dns-record-ttl"
        className="font-mono text-[16px] leading-[1.5] font-normal text-muted-foreground"
      >
        TTL: {record.ttl}
      </span>
    </div>
  );
}

/**
 * NXDOMAIN card (D-05, neutral — a legitimate DNS answer, not a failure).
 * Replaces the whole result panel (page structure step 4); never shown
 * alongside the last valid record grid.
 */
function NxdomainCard({ domain }: { domain: string }) {
  return (
    <div
      data-testid="dns-state-nxdomain"
      className="flex flex-col gap-2 rounded-md border border-border bg-secondary px-4 py-4"
    >
      <div className="flex items-center gap-2">
        <SearchX aria-hidden="true" className="size-5 text-muted-foreground" />
        <span className="text-[20px] leading-[1.2] font-semibold text-foreground">
          No such domain.
        </span>
      </div>
      <span className="text-[16px] leading-[1.5] font-normal text-muted-foreground">
        <span className="font-mono">{domain}</span> doesn&apos;t exist.
      </span>
    </div>
  );
}

/**
 * Empty-NOERROR card (D-05, neutral — equally a legitimate DNS answer:
 * "this domain exists, no records of this type"). Explicitly never
 * conflated with NXDOMAIN (DNS-08).
 */
function EmptyNoErrorCard({
  domain,
  recordType,
}: {
  domain: string;
  recordType: RecordType;
}) {
  return (
    <div
      data-testid="dns-state-empty-noerror"
      className="flex flex-col gap-2 rounded-md border border-border bg-secondary px-4 py-4"
    >
      <div className="flex items-center gap-2">
        <Inbox aria-hidden="true" className="size-5 text-muted-foreground" />
        <span className="text-[20px] leading-[1.2] font-semibold text-foreground">
          No {recordType} records.
        </span>
      </div>
      <span className="text-[16px] leading-[1.5] font-normal text-muted-foreground">
        <span className="font-mono">{domain}</span> exists but has none of
        this type.
      </span>
    </div>
  );
}

/**
 * Rate-limited card (D-06, destructive — a genuine service-side failure
 * condition per UI-SPEC's Color reserved list). Carries its own inline
 * Try-again button in addition to the page's general Refresh control.
 */
function RateLimitedCard({ onTryAgain }: { onTryAgain: () => void }) {
  return (
    <div
      data-testid="dns-state-rate-limited"
      className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-4"
    >
      <div className="flex items-center gap-2">
        <Clock aria-hidden="true" className="size-5 text-destructive" />
        <span className="text-[20px] leading-[1.2] font-semibold text-foreground">
          {RATE_LIMITED_LABEL}
        </span>
      </div>
      <span className="text-[16px] leading-[1.5] font-normal text-muted-foreground">
        {RATE_LIMITED_EXPLANATION}
      </span>
      <button
        type="button"
        onClick={onTryAgain}
        data-testid="dns-try-again"
        // 44x44 minimum hit area via padding; destructive-tinted to match
        // the card (D-06's own retry affordance, distinct from the page's
        // general Refresh control).
        className="inline-flex h-11 w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border border-destructive/30 px-3 text-[14px] leading-[1.4] font-semibold text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * Resolver-unavailable card (D-06, destructive — a genuine service-side
 * failure condition). Carries its own inline Try-again button, independently
 * worded from rate-limited per Pitfall 6 (never a shared generic component).
 */
function ResolverUnavailableCard({ onTryAgain }: { onTryAgain: () => void }) {
  return (
    <div
      data-testid="dns-state-resolver-unavailable"
      className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-4"
    >
      <div className="flex items-center gap-2">
        <WifiOff aria-hidden="true" className="size-5 text-destructive" />
        <span className="text-[20px] leading-[1.2] font-semibold text-foreground">
          {RESOLVER_UNAVAILABLE_LABEL}
        </span>
      </div>
      <span className="text-[16px] leading-[1.5] font-normal text-muted-foreground">
        {RESOLVER_UNAVAILABLE_EXPLANATION}
      </span>
      <button
        type="button"
        onClick={onTryAgain}
        data-testid="dns-try-again"
        className="inline-flex h-11 w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border border-destructive/30 px-3 text-[14px] leading-[1.4] font-semibold text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * The DNS Lookup client island (DNS-01..07, DNS-09, DNS-10, QUAL-08).
 * Extends the Server-shell/Client-island + URL-state + keyboard-shortcut
 * patterns established by `SubnetTool.tsx`/`UuidTool.tsx` with this
 * codebase's first debounce + `AbortController` + primary/fallback-resolver
 * orchestration (RESEARCH.md Patterns 1-3). Renders the full 5-state
 * QUAL-08 error matrix (invalid-input, nxdomain, empty-noerror,
 * rate-limited, resolver-unavailable) plus loading/skeleton/success.
 */
export function DnsTool() {
  // Lazy initializer (single render, no cascading second render) — this
  // component only ever mounts client-side (`ssr:false` loader boundary),
  // so `window` is always defined the first time this body runs.
  const [state, setState] = useState<DnsToolState>(() => {
    const { domain, type } = getInitialLookupFromUrl();
    return {
      rawDomain: domain,
      recordType: type,
      lookup: { status: "loading", lastValidResult: null },
    };
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * The core lookup orchestration (RESEARCH.md Pattern 2): aborts any
   * in-flight request, bumps the monotonic sequence token, and discards
   * the response if a newer request has since started — the belt-and-
   * suspenders race-safety guarantee DNS-04 requires. `domain`/`type` are
   * always explicit arguments (never read from `state` inside this
   * function), so this closure is safe to call from any render.
   */
  async function runLookup(domain: string, type: RecordType) {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const seq = ++requestSeqRef.current;

    setState((prev) => ({
      ...prev,
      lookup: {
        status: "loading",
        lastValidResult: lastValidResultFrom(prev.lookup),
      },
    }));

    try {
      const started = performance.now();
      const { resolverUsed, response } = await resolveWithFallback(
        domain,
        type,
        controller.signal
      );
      const durationMs = Math.round(performance.now() - started);

      if (seq !== requestSeqRef.current) return; // superseded by a newer request

      // Status-3 (NXDOMAIN) is checked BEFORE rendering success — a genuine,
      // legitimate negative DNS answer per Pattern 3, never conflated with
      // empty-NOERROR (DNS-08, D-05). SERVFAIL (Status 2) never reaches this
      // branch: `resolveWithFallback` already throws `ResolverFailureError`
      // for it upstream (Assumption A1), so it can never surface as its own
      // UI state here.
      if (response.Status === 3) {
        setState((prev) => ({
          ...prev,
          lookup: {
            status: "nxdomain",
            domain,
            lastValidResult: lastValidResultFrom(prev.lookup),
          },
        }));
        syncUrlToLookup(domain, type);
        return;
      }

      const records = normalizeRecords(response, type);

      // A successful (non-NXDOMAIN) response with zero normalized rows is
      // the empty-NOERROR state (DNS-08, D-05) — never a blank/placeholder
      // list.
      if (records.length === 0) {
        setState((prev) => ({
          ...prev,
          lookup: {
            status: "empty-noerror",
            domain,
            recordType: type,
            lastValidResult: lastValidResultFrom(prev.lookup),
          },
        }));
        syncUrlToLookup(domain, type);
        return;
      }

      const result: DnsSuccessResult = {
        domain,
        recordType: type,
        records,
        resolverUsed,
        durationMs,
      };
      setState((prev) => ({ ...prev, lookup: { status: "success", result } }));
      syncUrlToLookup(domain, type); // commit-only sync, never on every keystroke (A2)
    } catch (err) {
      if (controller.signal.aborted) return; // cancellation, not a failure (Pitfall 2)
      if (seq !== requestSeqRef.current) return;
      // Full 5-state QUAL-08 classification (D-04/D-06, Pitfall 6):
      // RateLimitError -> rate-limited; every other genuine failure
      // (ResolverFailureError, raw network error, timeout) ->
      // resolver-unavailable. The two are never collapsed into one generic
      // branch (T-04-06).
      setState((prev) => ({
        ...prev,
        lookup: classifyError(err, lastValidResultFrom(prev.lookup)),
      }));
    }
  }

  function runLookupImmediate(domain: string, type: RecordType) {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void runLookup(domain, type);
  }

  function scheduleDebouncedLookup(domain: string, type: RecordType) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runLookup(domain, type);
    }, DEBOUNCE_MS);
  }

  // Mount-only: run the initial (URL-derived or default demo-domain) lookup
  // once. Cleanup aborts the in-flight controller, which is what makes
  // React Strict Mode's dev-only double-invoke safe (Pitfall 3) — the first
  // mount's cleanup aborts its own request before the second mount starts a
  // new one, so only one real network request per real page load reaches
  // production.
  useEffect(() => {
    // Deferred to a microtask: `runLookupImmediate` -> `runLookup` calls
    // `setState` synchronously before its first `await` (the D-07 "enter
    // loading" update), which trips `react-hooks/set-state-in-effect` if
    // invoked directly from an effect body. `queueMicrotask` moves the
    // kickoff outside the effect's synchronous execution frame with no
    // observable behavioral delay; `abortControllerRef`/`requestSeqRef`
    // still make React Strict Mode's dev-only double-invoke safe (Pitfall
    // 3) since both microtasks run before either request's fetch settles.
    queueMicrotask(() => {
      runLookupImmediate(state.rawDomain, state.recordType);
    });
    return () => {
      abortControllerRef.current?.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run exactly once on mount with the lazily-initialized URL-derived domain/type; runLookupImmediate is intentionally omitted (recreated every render, not a stable dependency).
  }, []);

  useKeyboardShortcut({
    slash: () => inputRef.current?.focus(),
    enter: () => {
      if (isValidDomainInput(state.rawDomain)) {
        runLookupImmediate(state.rawDomain, state.recordType);
      }
    },
  });

  function handleDomainChange(value: string) {
    const valid = isValidDomainInput(value);

    if (!valid) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setState((prev) => ({
        ...prev,
        rawDomain: value,
        lookup: {
          status: "invalid-input",
          message: INVALID_DOMAIN_MESSAGE,
          lastValidResult: lastValidResultFrom(prev.lookup),
        },
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      rawDomain: value,
      lookup: {
        status: "loading",
        lastValidResult: lastValidResultFrom(prev.lookup),
      },
    }));
    scheduleDebouncedLookup(value, state.recordType);
  }

  // DNS-02: a pasted domain resolves immediately, bypassing the debounce
  // timer. `onPaste` fires BEFORE the browser applies the pasted text to
  // the input's value, so this reads the post-paste value on the next
  // microtask/timer tick rather than the (stale) event target value.
  function handleDomainPaste() {
    window.setTimeout(() => {
      const value = inputRef.current?.value ?? state.rawDomain;
      if (isValidDomainInput(value)) {
        setState((prev) => ({ ...prev, rawDomain: value }));
        runLookupImmediate(value, state.recordType);
      } else {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        setState((prev) => ({
          ...prev,
          rawDomain: value,
          lookup: {
            status: "invalid-input",
            message: INVALID_DOMAIN_MESSAGE,
            lastValidResult: lastValidResultFrom(prev.lookup),
          },
        }));
      }
    }, 0);
  }

  function handleTypeChange(nextType: string) {
    // Radix single-select ToggleGroup emits "" on deselect (clicking the
    // already-active toggle) — ignore it so exactly one type stays
    // selected (RESEARCH.md Anti-Patterns, UuidTool.tsx precedent).
    if (!isRecordType(nextType)) return;
    setState((prev) => ({ ...prev, recordType: nextType }));
    if (isValidDomainInput(state.rawDomain)) {
      runLookupImmediate(state.rawDomain, nextType);
    }
  }

  function handleRefresh() {
    if (!isValidDomainInput(state.rawDomain)) return;
    runLookupImmediate(state.rawDomain, state.recordType);
  }

  /** The rate-limited/resolver-unavailable cards' own inline "Try again"
   * button (D-06) — re-runs the current domain+type lookup immediately,
   * same as Refresh, but reachable directly inside the error card itself
   * with no need to hunt for the general Refresh control. */
  function handleTryAgain() {
    runLookupImmediate(state.rawDomain, state.recordType);
  }

  const activeResult = lastValidResultFrom(state.lookup);
  const isLoading = state.lookup.status === "loading";
  const invalidMessage =
    state.lookup.status === "invalid-input" ? state.lookup.message : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-1 min-w-[220px] flex-col gap-1.5">
          <Label
            htmlFor="dns-domain-input"
            className="text-[14px] leading-[1.4] font-semibold"
          >
            Domain
          </Label>
          <Input
            id="dns-domain-input"
            ref={inputRef}
            data-testid="dns-domain-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={state.rawDomain}
            onChange={(event) => handleDomainChange(event.target.value)}
            onPaste={handleDomainPaste}
            aria-invalid={!!invalidMessage}
            aria-describedby={invalidMessage ? "dns-validation-note" : undefined}
          />
          {invalidMessage && (
            <div
              id="dns-validation-note"
              data-testid="dns-state-invalid"
              className="flex items-center gap-2 text-[14px] leading-[1.4] font-normal text-muted-foreground"
            >
              <TriangleAlert
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span>{invalidMessage}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            id="dns-record-type-label"
            className="text-[14px] leading-[1.4] font-semibold"
          >
            Record type
          </Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={state.recordType}
            onValueChange={handleTypeChange}
            aria-labelledby="dns-record-type-label"
            data-testid="dns-record-type-toggle"
            className="grid grid-cols-3 grid-rows-2 gap-2 sm:grid-cols-6 sm:grid-rows-1"
          >
            {RECORD_TYPES.map((type) => (
              <ToggleGroupItem
                key={type}
                value={type}
                data-testid={`dns-record-type-${type}`}
                className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                {type}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh lookup"
          data-testid="dns-refresh"
          // 44x44 minimum hit area via padding, accent-tinted per UI-SPEC
          // (the page's core repeatable action, DNS-05).
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <RefreshCw aria-hidden="true" className="size-5" />
          <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
            Refresh
          </span>
        </button>
      </div>

      {state.lookup.status === "nxdomain" ? (
        <NxdomainCard domain={state.lookup.domain} />
      ) : state.lookup.status === "empty-noerror" ? (
        <EmptyNoErrorCard
          domain={state.lookup.domain}
          recordType={state.lookup.recordType}
        />
      ) : state.lookup.status === "rate-limited" ? (
        <RateLimitedCard onTryAgain={handleTryAgain} />
      ) : state.lookup.status === "resolver-unavailable" ? (
        <ResolverUnavailableCard onTryAgain={handleTryAgain} />
      ) : !activeResult && isLoading ? (
        <DnsResultSkeleton />
      ) : !activeResult ? (
        // Defensive-only fallback: no last-valid result exists and the
        // current state isn't one of the 5 named QUAL-08 states or loading
        // — unreachable in practice post-D-10 (the demo domain always
        // resolves to one of the classified states above), kept only as a
        // safety net so the panel is never silently blank.
        <div
          data-testid="dns-generic-error"
          className="flex flex-col gap-2 rounded-md border border-border bg-secondary px-4 py-4"
        >
          <span className="text-[16px] leading-[1.5] font-normal text-muted-foreground">
            Couldn&apos;t look up this domain right now. Try refreshing.
          </span>
        </div>
      ) : (
        <div className={cn("relative flex flex-col gap-4", isLoading && "opacity-50")}>
          {isLoading && (
            <Loader2
              aria-hidden="true"
              data-testid="dns-loading-spinner"
              className="absolute right-2 top-2 size-5 animate-spin text-primary"
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" data-testid="dns-resolver-badge">
              {activeResult.resolverUsed === "primary"
                ? "Primary resolver"
                : "Fallback resolver"}
            </Badge>
            <span
              data-testid="dns-duration"
              className="text-[14px] leading-[1.4] font-normal text-muted-foreground"
            >
              {activeResult.durationMs}ms
            </span>
          </div>
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            {activeResult.recordType} records for{" "}
            <span className="font-mono">{activeResult.domain}</span>
          </h2>
          <div
            data-testid="dns-record-list"
            className="flex flex-col gap-4"
          >
            {activeResult.records.map((record, index) => (
              <DnsRecordRow
                key={`${index}-${record.name}-${record.value}`}
                index={index}
                record={record}
                recordType={activeResult.recordType}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DnsTool;
