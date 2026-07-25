"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  CircleHelp,
  Copy,
  Loader2,
  type LucideIcon,
  Lock,
  Radio,
  ShieldAlert,
  ShieldOff,
  TriangleAlert,
  Unlock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { parseMacInput } from "@/lib/mac/parse";
import { formatMac } from "@/lib/mac/format";
import { classifyMac } from "@/lib/mac/classify";
import { lookupVendor } from "@/lib/mac/vendor";
import type { MacClassification, MacFormats, VendorState } from "@/lib/mac/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

/** D-06 (locked): the demo MAC pre-filled on first load — a real,
 * recognizable Apple-range OUI (3C:22:FB, also used as the worked example
 * in 05-RESEARCH.md). Its first octet is 0x3C (0b00111100): the U/L bit
 * (bit 1) is 0, so this address is universally-administered and will never
 * be flagged as locally-administered/likely-randomized once 05-02 ships
 * bit-level classification. */
const DEFAULT_MAC = "3C:22:FB:AA:BB:CC";

/** D-07's exact Copywriting Contract wording, verbatim. */
const INCOMPLETE_MAC_MESSAGE =
  "Keep typing — enter all 12 hex digits (e.g. 00:1A:2B:3C:4D:5E).";

const COPY_ERROR_MESSAGE =
  "Couldn't copy — select the text and copy manually.";

/** D-03 (locked): debounce vendor lookups 400-600ms after a syntactically
 * valid, non-randomized MAC is present — faster than DNS's 600-800ms since
 * the OUI-only payload/round-trip is smaller and the input is more
 * constrained (fixed-length hex). */
const VENDOR_DEBOUNCE_MS = 500;

/** UI-SPEC Copywriting Contract's exact locked vendor-field copy (D-11,
 * D-12, 05-RESEARCH.md Open Question 1), verbatim — never paraphrased at
 * the call site. */
const VENDOR_LOOKING_UP_MESSAGE = "Looking up vendor…";
const VENDOR_NOT_FOUND_MESSAGE = "Not found in OUI registry.";
const VENDOR_UNAVAILABLE_MESSAGE = "Vendor: lookup unavailable.";
const VENDOR_NOT_APPLICABLE_MESSAGE =
  "Vendor: not applicable (randomized address).";

/** UI-SPEC Copywriting Contract's exact locked classification-badge copy
 * (D-08/D-09), verbatim — never paraphrased at the call site. */
const UL_UNIVERSAL_LABEL = "Universally Administered.";
const UL_UNIVERSAL_EXPLANATION = "Assigned by the IEEE to a specific vendor.";
const UL_LOCAL_LABEL = "Locally Administered.";
const UL_LOCAL_EXPLANATION =
  "Set by software rather than assigned by a vendor — common for virtual adapters and privacy-randomized addresses.";
const IG_UNICAST_LABEL = "Unicast.";
const IG_UNICAST_EXPLANATION = "Addressed to a single device.";
const IG_MULTICAST_LABEL = "Multicast.";
const IG_MULTICAST_EXPLANATION = "Addressed to a group of devices.";
const RANDOMIZATION_LABEL = "Likely randomized (privacy MAC).";
const RANDOMIZATION_EXPLANATION =
  "This address has the locally-administered bit set, a pattern used by iOS/Android/Windows MAC randomization — it may not reflect the device's real hardware vendor.";

type MacToolState = {
  /** Always reflects exactly what's typed in the MAC input — single source
   * of truth for the controlled field. Never auto-reformatted (prohibition
   * MAC-01) — separators are never inserted/rewritten as the user types. */
  rawInput: string;
  /** The most recent successfully-parsed formats — kept rendered (dimmed,
   * not blanked) while `isIncomplete` is true (D-07), mirrors
   * `DnsTool.tsx`'s `lastValidResult` carried-on-every-non-success-variant
   * pattern. */
  lastValidFormats: MacFormats;
  /** The most recent successfully-computed bit-level classification — kept
   * rendered alongside `lastValidFormats` while `isIncomplete` is true
   * (D-07). Always completes together with `lastValidFormats` the instant a
   * MAC parses valid (MAC-08, no partial-state gap between the two). */
  lastValidClassification: MacClassification;
  isIncomplete: boolean;
  /** The current vendor lookup outcome (MAC-03) — `null` only in the
   * unreachable-in-practice window before the very first lookup has ever
   * been scheduled; every real render has either a resolved `VendorState`
   * or `vendorPending: true`. Kept rendered (not reset) while
   * `isIncomplete` is true, mirroring `lastValidFormats`/
   * `lastValidClassification`'s dim-and-keep behavior (D-07) — the whole
   * result panel, vendor field included, dims together rather than the
   * vendor field alone blanking. */
  vendorState: VendorState | null;
  /** True only while a debounced vendor fetch is actually in flight
   * (MAC-08 isolation: never blocks/dims formats, OUI, or classification
   * badges — only the vendor sub-field renders the "Looking up vendor…"
   * state while this is true). */
  vendorPending: boolean;
};

/** Computes the formats + classification for a known-valid constant MAC
 * string. `DEFAULT_MAC` is a compile-time-known-valid literal, so the
 * `!parsed.valid` branch is unreachable in practice — kept only so this
 * initializer stays a total function rather than assuming an invariant with
 * a non-null assertion. */
function resultForDefault(): {
  formats: MacFormats;
  classification: MacClassification;
} {
  const parsed = parseMacInput(DEFAULT_MAC);
  if (parsed.valid) {
    return {
      formats: formatMac(parsed.bytes),
      classification: classifyMac(parsed.bytes),
    };
  }
  return {
    formats: { colon: "", dash: "", dot: "", none: "" },
    classification: {
      ouiHex: "",
      isUnicast: true,
      isUniversallyAdministered: true,
      randomizationLikely: false,
    },
  };
}

function initialState(): MacToolState {
  const { formats, classification } = resultForDefault();
  // D-12: a locally-administered/likely-randomized demo MAC would skip the
  // vendor call entirely and start "not-applicable" — unreachable for
  // today's DEFAULT_MAC (universally-administered), but total regardless of
  // which constant DEFAULT_MAC is ever set to.
  return {
    rawInput: DEFAULT_MAC,
    lastValidFormats: formats,
    lastValidClassification: classification,
    isIncomplete: false,
    vendorState: classification.randomizationLikely
      ? { kind: "not-applicable" }
      : null,
    vendorPending: !classification.randomizationLikely,
  };
}

/** Derives the exact vendor-field copy text for a given resolved
 * `VendorState`/pending flag — the single source of truth both the live
 * `VendorField` UI and `CopyAllButton`'s full-result text block read from,
 * so the two can never drift (D-11/D-12/Open-Question-1 wording, verbatim). */
function vendorLineText(
  vendorState: VendorState | null,
  vendorPending: boolean
): string {
  if (vendorPending) return VENDOR_LOOKING_UP_MESSAGE;
  if (!vendorState) return VENDOR_UNAVAILABLE_MESSAGE;
  switch (vendorState.kind) {
    case "found":
      return vendorState.company;
    case "not-found":
      return VENDOR_NOT_FOUND_MESSAGE;
    case "unavailable":
      return VENDOR_UNAVAILABLE_MESSAGE;
    case "not-applicable":
      return VENDOR_NOT_APPLICABLE_MESSAGE;
  }
}

/**
 * One independently-copyable normalized-format row (D-05, MAC-09) — owns
 * its own `useCopyToClipboard()` instance so confirmation state never
 * bleeds between rows, mirrors `DnsRecordRow`'s per-field copy pattern.
 */
function FormatRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  const { copy, copied, error, reset } = useCopyToClipboard();

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset is a stable useCallback identity; omitted to avoid re-running on hook-identity changes.
  }, [value]);

  return (
    <div
      data-testid={testId}
      className="flex flex-col gap-1 rounded-md border border-border bg-secondary px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-[110px] shrink-0 text-[14px] leading-[1.4] font-semibold text-muted-foreground">
          {label}
        </span>
        <span
          data-testid={`${testId}-value`}
          className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => copy(value)}
          aria-label={copied ? "Copied!" : `Copy ${label} format`}
          data-testid={`${testId}-copy`}
          // 44x44 minimum hit area via padding; accent-tinted per UI-SPEC's
          // reserved list (every copy action).
          className="ml-auto inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      {/* Not color-alone: icon swap above is the primary confirmation
          signal; this announces the same change to screen readers. */}
      <span
        aria-live="polite"
        className="sr-only"
        data-testid={`${testId}-status`}
      >
        {copied ? "Copied!" : ""}
      </span>
      {error && (
        <span className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
          {COPY_ERROR_MESSAGE}
        </span>
      )}
    </div>
  );
}

/**
 * "Copy all" — copies the complete result (all 4 formats + OUI + vendor +
 * U/L + I/G + randomization flag) as one formatted text block (MAC-09,
 * Copywriting Contract's Primary CTA).
 */
function CopyAllButton({
  formats,
  classification,
  vendorState,
  vendorPending,
}: {
  formats: MacFormats;
  classification: MacClassification;
  vendorState: VendorState | null;
  vendorPending: boolean;
}) {
  const { copy, copied, error, reset } = useCopyToClipboard();

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset is a stable useCallback identity; omitted to avoid re-running on hook-identity changes.
  }, [formats.colon]);

  const fullText = [
    `Colon: ${formats.colon}`,
    `Dash: ${formats.dash}`,
    `Cisco (dot): ${formats.dot}`,
    `No separator: ${formats.none}`,
    `OUI: ${classification.ouiHex}`,
    `Vendor: ${vendorLineText(vendorState, vendorPending)}`,
    `U/L: ${
      classification.isUniversallyAdministered
        ? "Universally Administered"
        : "Locally Administered"
    }`,
    `I/G: ${classification.isUnicast ? "Unicast" : "Multicast"}`,
    `Randomization: ${
      classification.randomizationLikely
        ? "Likely randomized (privacy MAC)"
        : "Not flagged"
    }`,
  ].join("\n");

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => copy(fullText)}
        aria-label={copied ? "Copied!" : "Copy all formats"}
        data-testid="mac-copy-all"
        // 44x44 minimum hit area via padding, accent-tinted (D-05/MAC-09's
        // "Copy all" primary CTA).
        className="inline-flex h-11 w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-3 text-[14px] leading-[1.4] font-semibold text-primary outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {copied ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
        Copy all
      </button>
      <span
        aria-live="polite"
        className="sr-only"
        data-testid="mac-copy-all-status"
      >
        {copied ? "Copied!" : ""}
      </span>
      {error && (
        <span className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
          {COPY_ERROR_MESSAGE}
        </span>
      )}
    </div>
  );
}

/**
 * One labeled classification badge + its one-line plain-language
 * explanation (D-08, QUAL-05 — the distinction is carried by text, never
 * color alone). Always the neutral/outline `Badge` variant, never
 * destructive/accent (UI-SPEC Color section) — informational classification,
 * not a warning or a call-to-action.
 */
function ClassificationBadge({
  icon: Icon,
  label,
  explanation,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  explanation: string;
  testId: string;
}) {
  return (
    <div data-testid={testId} className="flex flex-col gap-1">
      <Badge
        data-testid={`${testId}-pill`}
        variant="outline"
        className="gap-1.5"
      >
        <Icon aria-hidden="true" className="size-3" />
        {label}
      </Badge>
      <span className="text-[16px] leading-[1.5] font-normal text-muted-foreground">
        {explanation}
      </span>
    </div>
  );
}

/**
 * The vendor sub-field (MAC-03, MAC-08, D-11, D-12) — always exactly one of
 * 5 renders: the in-flight "Looking up vendor…" note, or one of the 4
 * resolved `VendorState` kinds. Every branch is a plain neutral
 * `text-muted-foreground`/`text-foreground` note (never destructive, never
 * an error banner) per the UI-SPEC Color section's explicit "no genuine
 * failure state exists in this phase" decision. `company` uses
 * `break-words` (not `break-all` like the hex format/OUI rows) since a real
 * vendor name is prose, not a raw technical value — this is the overflow
 * backstop: a 40+ character company name wraps rather than clips at 320px.
 */
function VendorField({
  vendorState,
  vendorPending,
}: {
  vendorState: VendorState | null;
  vendorPending: boolean;
}) {
  if (vendorPending) {
    return (
      <div
        data-testid="mac-vendor-value"
        className="flex items-center gap-2 text-[16px] leading-[1.5] font-normal text-muted-foreground"
      >
        <Loader2
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin"
        />
        <span>{VENDOR_LOOKING_UP_MESSAGE}</span>
      </div>
    );
  }

  // Defensive-only: unreachable in practice — `vendorPending` starts `true`
  // (or `vendorState` starts `not-applicable`) the instant a valid MAC
  // exists, so a non-pending `null` state never renders for real.
  if (!vendorState) {
    return (
      <div
        data-testid="mac-vendor-value"
        className="text-[16px] leading-[1.5] font-normal text-muted-foreground"
      >
        {VENDOR_UNAVAILABLE_MESSAGE}
      </div>
    );
  }

  switch (vendorState.kind) {
    case "found":
      return (
        <div
          data-testid="mac-vendor-value"
          className="flex items-start gap-2 text-[16px] leading-[1.5] font-normal text-foreground"
        >
          <Building2
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <span className="break-words">{vendorState.company}</span>
        </div>
      );
    case "not-found":
      return (
        <div
          data-testid="mac-vendor-value"
          className="flex items-center gap-2 text-[16px] leading-[1.5] font-normal text-muted-foreground"
        >
          <CircleHelp aria-hidden="true" className="size-4 shrink-0" />
          <span>{VENDOR_NOT_FOUND_MESSAGE}</span>
        </div>
      );
    case "unavailable":
      return (
        <div
          data-testid="mac-vendor-value"
          className="flex items-center gap-2 text-[16px] leading-[1.5] font-normal text-muted-foreground"
        >
          <CircleHelp aria-hidden="true" className="size-4 shrink-0" />
          <span>{VENDOR_UNAVAILABLE_MESSAGE}</span>
        </div>
      );
    case "not-applicable":
      return (
        <div
          data-testid="mac-vendor-value"
          className="flex items-center gap-2 text-[16px] leading-[1.5] font-normal text-muted-foreground"
        >
          <ShieldOff aria-hidden="true" className="size-4 shrink-0" />
          <span>{VENDOR_NOT_APPLICABLE_MESSAGE}</span>
        </div>
      );
  }
}

/**
 * The MAC Address Inspector client island (MAC-01..MAC-10, D-01..D-12).
 * Extends the Server-shell/Client-island + keyboard-shortcut patterns
 * established by `DnsTool.tsx`/`SubnetTool.tsx`. Parsing, formatting, and
 * bit-level classification are all pure, offline, in-browser math — MAC-08
 * requires them to render in full with zero dependency on the vendor
 * lookup, so `handleInputChange` computes and commits them synchronously,
 * structurally before any vendor-lookup scheduling below even runs
 * (05-RESEARCH.md Pitfall 2).
 *
 * The vendor lookup (MAC-03) is the one genuinely async, network-dependent
 * piece: debounced (`VENDOR_DEBOUNCE_MS`, D-03), session-cached
 * (`lib/mac/vendor.ts`), and race-safe via an `AbortController` +
 * monotonic sequence token guarding every state-superseding entry path —
 * a new valid edit, a paste (both flow through `handleInputChange`), the
 * Esc reset, and the initial demo-on-load mount effect all cancel any
 * in-flight vendor request before scheduling/dispatching the next one
 * (mirrors `DnsTool.tsx`'s `cancelInFlightLookup`/CR-01 "audit ALL paths"
 * lesson). A locally-administered/likely-randomized MAC (D-10) skips the
 * fetch entirely (D-12) — `scheduleVendorLookup` branches on
 * `classification.randomizationLikely` before ever touching the network.
 */
export function MacTool() {
  const [state, setState] = useState<MacToolState>(initialState);
  const inputRef = useRef<HTMLInputElement>(null);

  // Vendor-lookup race-safety machinery (mirrors DnsTool.tsx's
  // abortControllerRef/requestSeqRef/debounceTimerRef trio) — kept
  // independent of any DNS-tool refs; this is MAC's own vendor-only async
  // orchestration.
  const vendorAbortRef = useRef<AbortController | null>(null);
  const vendorSeqRef = useRef(0);
  const vendorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Aborts any in-flight vendor request and bumps the sequence token so its
   * (eventually-arriving) response can never win a race against a state
   * transition that supersedes it, and clears any pending debounce timer.
   * Called at the top of every state-superseding path into the vendor
   * lookup — mirrors `DnsTool.tsx`'s `cancelInFlightLookup` (CR-01 "audit
   * ALL paths" lesson: this must be reachable from every entry path that
   * can supersede a scheduled/in-flight lookup, not just the "obvious" one).
   */
  function cancelVendorLookup() {
    vendorAbortRef.current?.abort();
    vendorSeqRef.current++; // orphan any in-flight/scheduled lookup's seq check
    if (vendorDebounceRef.current) {
      clearTimeout(vendorDebounceRef.current);
      vendorDebounceRef.current = null;
    }
  }

  /**
   * The actual fetch, run after the debounce fires. `ouiHex` is always an
   * explicit argument (never read from `state` inside this function), so
   * this closure is safe to call from any render — mirrors `DnsTool.tsx`'s
   * `runLookup` explicit-argument discipline.
   */
  async function runVendorLookup(ouiHex: string) {
    vendorAbortRef.current?.abort();
    const controller = new AbortController();
    vendorAbortRef.current = controller;
    const seq = ++vendorSeqRef.current;

    try {
      const result = await lookupVendor(ouiHex, controller.signal);
      if (seq !== vendorSeqRef.current) return; // superseded by a newer request
      setState((prev) => ({ ...prev, vendorState: result, vendorPending: false }));
    } catch {
      if (controller.signal.aborted) return; // cancellation, not a failure (Pitfall 2)
      if (seq !== vendorSeqRef.current) return;
      setState((prev) => ({
        ...prev,
        vendorState: { kind: "unavailable" },
        vendorPending: false,
      }));
    }
  }

  /**
   * Decides whether to skip the vendor call entirely (D-12: the MAC is
   * already flagged locally-administered/likely-randomized — never surface
   * a coincidental OUI match as if it were the device's real hardware
   * vendor) or to start a real lookup, either immediately or after the D-03
   * debounce window. Cancels any prior in-flight/scheduled lookup first —
   * this is the single choke point every entry path below calls through.
   */
  function beginVendorLookup(
    classification: MacClassification,
    { immediate }: { immediate: boolean }
  ) {
    cancelVendorLookup();

    if (classification.randomizationLikely) {
      setState((prev) => ({
        ...prev,
        vendorState: { kind: "not-applicable" },
        vendorPending: false,
      }));
      return; // D-12: no fetch at all
    }

    setState((prev) => ({ ...prev, vendorPending: true }));
    const ouiHex = classification.ouiHex;
    if (immediate) {
      void runVendorLookup(ouiHex);
      return;
    }
    vendorDebounceRef.current = setTimeout(() => {
      vendorDebounceRef.current = null;
      void runVendorLookup(ouiHex);
    }, VENDOR_DEBOUNCE_MS);
  }

  /** Live-typing/paste entry point (D-03: debounced ~400-600ms). */
  function scheduleVendorLookup(classification: MacClassification) {
    beginVendorLookup(classification, { immediate: false });
  }

  /** Demo-on-load and Esc-reset entry points — D-06 requires the full
   * result, vendor included, to be visible with zero user action required;
   * an artificial debounce delay before even starting the fetch for a
   * value that's already known (no live typing to debounce against) would
   * contradict that, so these two paths bypass the debounce timer and start
   * the lookup right away (mirrors `DnsTool.tsx`'s `runLookupImmediate`). */
  function runVendorLookupImmediate(classification: MacClassification) {
    beginVendorLookup(classification, { immediate: true });
  }

  // Mount-only: start the vendor lookup for the demo MAC immediately (D-06)
  // — the "demo-on-load" entry path the CR-01 lesson explicitly calls out
  // as one of the paths that must cancel/race-guard correctly, not just the
  // typing/paste paths. Deferred to a microtask for the same reason
  // DnsTool.tsx defers its own mount kickoff: `beginVendorLookup` calls
  // `setState` synchronously before any `await`, which trips
  // `react-hooks/set-state-in-effect` if invoked directly from the effect
  // body.
  useEffect(() => {
    queueMicrotask(() => {
      runVendorLookupImmediate(state.lastValidClassification);
    });
    return () => {
      cancelVendorLookup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run exactly once on mount with the lazily-initialized demo classification; runVendorLookupImmediate is intentionally omitted (recreated every render, not a stable dependency).
  }, []);

  useKeyboardShortcut({
    slash: () => inputRef.current?.focus(),
    // D-07/UI-SPEC assumption: Esc resets the input back to the demo MAC,
    // clearing any inline incomplete-input note and restoring the full
    // demo result immediately — including re-starting the vendor lookup for
    // the demo MAC's OUI without a debounce delay (a cache hit in practice,
    // since it was already looked up on mount, D-03).
    escape: () => {
      const next = initialState();
      setState(next);
      runVendorLookupImmediate(next.lastValidClassification);
    },
  });

  function handleInputChange(value: string) {
    // The raw controlled value is never rewritten here — MAC-01's
    // prohibition against auto-inserting/reformatting separators as the
    // user types. Only `parseMacInput`/`formatMac` (both pure, no mutation
    // of `value` itself) ever run against it.
    const parsed = parseMacInput(value);
    if (parsed.valid) {
      // classifyMac runs synchronously, immediately after a successful
      // parse — structurally before any vendor-lookup scheduling could ever
      // be reached (MAC-08 ordering, 05-RESEARCH.md Pitfall 2). No fetch,
      // no async, no debounce sits between a valid parse and classification.
      const classification = classifyMac(parsed.bytes);
      setState((prev) => ({
        ...prev,
        rawInput: value,
        lastValidFormats: formatMac(parsed.bytes),
        lastValidClassification: classification,
        isIncomplete: false,
      }));
      // A superseding valid edit or paste (both flow through this handler)
      // must cancel any already-in-flight/scheduled vendor lookup before
      // arming the next one — otherwise a slower earlier response could
      // still land and render after the input has moved on to a different
      // MAC (CR-01 "audit ALL paths" lesson). `scheduleVendorLookup` itself
      // is the single choke point that performs this cancellation.
      scheduleVendorLookup(classification);
      return;
    }
    // An incomplete/invalid in-progress edit also cancels any in-flight
    // vendor lookup (same CR-01 lesson) — but does not schedule a new one,
    // since there is no valid classification to look up yet. The last
    // resolved `vendorState` is left untouched so it dims-and-keeps
    // alongside `lastValidFormats`/`lastValidClassification` (D-07).
    cancelVendorLookup();
    setState((prev) => ({
      ...prev,
      rawInput: value,
      isIncomplete: true,
      vendorPending: false,
    }));
  }

  const formats = state.lastValidFormats;
  const classification = state.lastValidClassification;
  const vendorState = state.vendorState;
  const vendorPending = state.vendorPending;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="mac-input"
          className="text-[14px] leading-[1.4] font-semibold"
        >
          MAC address
        </Label>
        <Input
          id="mac-input"
          ref={inputRef}
          data-testid="mac-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={state.rawInput}
          onChange={(event) => handleInputChange(event.target.value)}
          aria-invalid={state.isIncomplete}
          aria-describedby={
            state.isIncomplete ? "mac-incomplete-note" : undefined
          }
          className="font-mono"
        />
        {state.isIncomplete && (
          <div
            id="mac-incomplete-note"
            data-testid="mac-state-incomplete"
            className="flex items-center gap-2 text-[14px] leading-[1.4] font-normal text-muted-foreground"
          >
            <TriangleAlert
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span>{INCOMPLETE_MAC_MESSAGE}</span>
          </div>
        )}
      </div>

      <div
        data-testid="mac-result-panel"
        className={cn(
          "flex flex-col gap-6",
          state.isIncomplete && "opacity-50"
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
              Normalized formats
            </h2>
            <CopyAllButton
              formats={formats}
              classification={classification}
              vendorState={vendorState}
              vendorPending={vendorPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <FormatRow
              label="Colon"
              value={formats.colon}
              testId="mac-format-colon"
            />
            <FormatRow
              label="Dash"
              value={formats.dash}
              testId="mac-format-dash"
            />
            <FormatRow
              label="Cisco (dot)"
              value={formats.dot}
              testId="mac-format-dot"
            />
            <FormatRow
              label="No separator"
              value={formats.none}
              testId="mac-format-none"
            />
          </div>
        </div>

        {/* Computed synchronously, offline, the instant a MAC parses valid
            (MAC-08, 05-RESEARCH.md Pattern 2/Pitfall 2) — OUI prefix
            (MAC-04) plus U/L (MAC-05), I/G (MAC-06), and the conditional
            randomization-hedge badge (MAC-07, D-09/D-10). Zero dependency
            on the "Vendor" stub section below, which 05-03 extends. */}
        <div
          data-testid="mac-classification-section"
          className="flex flex-col gap-4"
        >
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            Classification
          </h2>
          <FormatRow
            label="OUI prefix"
            value={classification.ouiHex}
            testId="mac-oui"
          />
          <div className="flex flex-wrap gap-4">
            {classification.isUniversallyAdministered ? (
              <ClassificationBadge
                icon={Unlock}
                label={UL_UNIVERSAL_LABEL}
                explanation={UL_UNIVERSAL_EXPLANATION}
                testId="mac-badge-ul"
              />
            ) : (
              <ClassificationBadge
                icon={Lock}
                label={UL_LOCAL_LABEL}
                explanation={UL_LOCAL_EXPLANATION}
                testId="mac-badge-ul"
              />
            )}
            {classification.isUnicast ? (
              <ClassificationBadge
                icon={User}
                label={IG_UNICAST_LABEL}
                explanation={IG_UNICAST_EXPLANATION}
                testId="mac-badge-ig"
              />
            ) : (
              <ClassificationBadge
                icon={Radio}
                label={IG_MULTICAST_LABEL}
                explanation={IG_MULTICAST_EXPLANATION}
                testId="mac-badge-ig"
              />
            )}
            {classification.randomizationLikely && (
              <ClassificationBadge
                icon={ShieldAlert}
                label={RANDOMIZATION_LABEL}
                explanation={RANDOMIZATION_EXPLANATION}
                testId="mac-badge-randomization"
              />
            )}
          </div>
        </div>

        {/* Vendor/OUI lookup (MAC-03) — debounced, session-cached, race-safe
            async lookup layered on top of the always-synchronous formats/
            classification above. Its own loading/failure/skip states never
            block or dim the rest of the panel (MAC-08 isolation). */}
        <div data-testid="mac-vendor-section" className="flex flex-col gap-2">
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            Vendor
          </h2>
          <VendorField vendorState={vendorState} vendorPending={vendorPending} />
        </div>
      </div>
    </div>
  );
}
