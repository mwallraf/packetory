"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { isValidDomainInput } from "@/lib/dns/validate";
import { resolveWithFallback } from "@/lib/dns/resolve";
import { normalizeRecords } from "@/lib/dns/parse";
import {
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
}: {
  index: number;
  record: NormalizedRecord;
}) {
  const { copy, copied, error, reset } = useCopyToClipboard();

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset is a stable useCallback identity; omitted to avoid re-running on hook-identity changes.
  }, [record.value]);

  return (
    <div
      data-testid={`dns-record-row-${index}`}
      className="flex flex-col gap-1 rounded-md border border-border bg-secondary px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Every record value renders as a JSX text node only — never
            dangerouslySetInnerHTML — so attacker-controlled TXT content is
            escaped by React's default rendering (T-04-01). */}
        <span
          data-testid="dns-record-value"
          className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
        >
          {record.value}
        </span>
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
 * The DNS Lookup client island (DNS-01..07, DNS-09, DNS-10). Extends the
 * Server-shell/Client-island + URL-state + keyboard-shortcut patterns
 * established by `SubnetTool.tsx`/`UuidTool.tsx` with this codebase's first
 * debounce + `AbortController` + primary/fallback-resolver orchestration
 * (RESEARCH.md Patterns 1-3). This plan (04-01) renders success + loading +
 * a minimal generic invalid-input/failure fallback — the full 5-state
 * QUAL-08 error matrix ships in 04-02.
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

      const records = normalizeRecords(response, type);
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
      // Minimal generic failure fallback for this plan — the full 5-state
      // QUAL-08 classification (rate-limited vs. resolver-unavailable vs.
      // nxdomain vs. empty-noerror) ships in 04-02.
      void err;
      setState((prev) => ({
        ...prev,
        lookup: {
          status: "resolver-unavailable",
          lastValidResult: lastValidResultFrom(prev.lookup),
        },
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
            <span
              id="dns-validation-note"
              data-testid="dns-validation-note"
              className="text-[14px] leading-[1.4] font-normal text-muted-foreground"
            >
              {invalidMessage}
            </span>
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

      {!activeResult && isLoading ? (
        <DnsResultSkeleton />
      ) : !activeResult ? (
        // Minimal generic failure fallback (full 5-state matrix in 04-02):
        // only reachable if the very first lookup itself fails.
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
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DnsTool;
