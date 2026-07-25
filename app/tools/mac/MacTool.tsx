"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { parseMacInput } from "@/lib/mac/parse";
import { formatMac } from "@/lib/mac/format";
import type { MacFormats } from "@/lib/mac/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  isIncomplete: boolean;
};

/** Computes the formats for a known-valid constant MAC string. `DEFAULT_MAC`
 * is a compile-time-known-valid literal, so the `!parsed.valid` branch is
 * unreachable in practice — kept only so this initializer stays a total
 * function rather than assuming an invariant with a non-null assertion. */
function formatsForDefault(): MacFormats {
  const parsed = parseMacInput(DEFAULT_MAC);
  if (parsed.valid) return formatMac(parsed.bytes);
  return { colon: "", dash: "", dot: "", none: "" };
}

function initialState(): MacToolState {
  return {
    rawInput: DEFAULT_MAC,
    lastValidFormats: formatsForDefault(),
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
 * The MAC Address Inspector client island — walking-skeleton slice
 * (MAC-01, MAC-02, MAC-09, D-04..D-07). Extends the Server-shell/Client-
 * island + keyboard-shortcut patterns established by
 * `DnsTool.tsx`/`SubnetTool.tsx`, but this slice is fully synchronous —
 * parsing and formatting are pure, offline, in-browser math with no
 * debounce/AbortController/network orchestration needed (that machinery
 * belongs to 05-03's vendor lookup, layered on top of this file later
 * without restructuring it).
 *
 * The result panel below the 4 format rows carries labeled "Classification"
 * and "Vendor" stub sections (05-UI-SPEC.md page-structure step 5b/5c) so
 * 05-02/05-03 extend this panel in place rather than restructuring it.
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
      setState({
        rawInput: value,
        lastValidFormats: formatMac(parsed.bytes),
        isIncomplete: false,
      });
      return;
    }
    setState((prev) => ({ ...prev, rawInput: value, isIncomplete: true }));
  }

  const formats = state.lastValidFormats;

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

        {/* Stub sections for 05-02 (bit-level classification: U/L, I/G,
            randomization hedge) and 05-03 (vendor/OUI lookup) — labeled per
            05-UI-SPEC.md's page-structure step 5b/5c so those slices extend
            this panel in place rather than restructuring it. Nothing here
            is a real result yet; MAC-04..MAC-08 ship in later plans. */}
        <div
          data-testid="mac-classification-section"
          className="flex flex-col gap-2"
        >
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            Classification
          </h2>
          <p className="text-[16px] leading-[1.5] font-normal text-muted-foreground">
            U/L and I/G bit classification ships in a later update.
          </p>
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
