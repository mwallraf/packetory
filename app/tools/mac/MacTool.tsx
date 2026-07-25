"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  type LucideIcon,
  Lock,
  Radio,
  ShieldAlert,
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
import type { MacClassification, MacFormats } from "@/lib/mac/types";
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
  return {
    rawInput: DEFAULT_MAC,
    lastValidFormats: formats,
    lastValidClassification: classification,
    isIncomplete: false,
  };
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
 * "Copy all" — copies the complete 4-format result as one formatted text
 * block (MAC-09, Copywriting Contract's Primary CTA).
 */
function CopyAllButton({ formats }: { formats: MacFormats }) {
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
 * The MAC Address Inspector client island (MAC-01, MAC-02, MAC-04..MAC-07,
 * MAC-09, D-04..D-10). Extends the Server-shell/Client-island +
 * keyboard-shortcut patterns established by `DnsTool.tsx`/`SubnetTool.tsx`.
 * Parsing, formatting, AND bit-level classification are all pure, offline,
 * in-browser math with no debounce/AbortController/network orchestration
 * needed (that machinery belongs to 05-03's vendor lookup, layered on top of
 * this file later without restructuring it) — this is exactly what MAC-08
 * requires: classification renders in full with zero dependency on the
 * vendor lookup.
 *
 * The result panel below the 4 format rows carries a labeled "Vendor" stub
 * section (05-UI-SPEC.md page-structure step 5c) so 05-03 extends this panel
 * in place rather than restructuring it.
 */
export function MacTool() {
  const [state, setState] = useState<MacToolState>(initialState);
  const inputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcut({
    slash: () => inputRef.current?.focus(),
    // D-07/UI-SPEC assumption: Esc resets the input back to the demo MAC,
    // clearing any inline incomplete-input note and restoring the full
    // demo result.
    escape: () => setState(initialState()),
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
      setState({
        rawInput: value,
        lastValidFormats: formatMac(parsed.bytes),
        lastValidClassification: classification,
        isIncomplete: false,
      });
      return;
    }
    setState((prev) => ({ ...prev, rawInput: value, isIncomplete: true }));
  }

  const formats = state.lastValidFormats;
  const classification = state.lastValidClassification;

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
            <CopyAllButton formats={formats} />
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

        <div data-testid="mac-vendor-section" className="flex flex-col gap-2">
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            Vendor
          </h2>
          <p className="text-[16px] leading-[1.5] font-normal text-muted-foreground">
            Vendor/OUI lookup ships in a later update.
          </p>
        </div>
      </div>
    </div>
  );
}
