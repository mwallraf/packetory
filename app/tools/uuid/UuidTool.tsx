"use client";

import { useRef, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { generateBatch, type UuidVersion } from "@/lib/uuid/generate";
import { formatUuids, type UuidCase } from "@/lib/uuid/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";

const BATCH_COUNT_HINT = "Enter a number between 1 and 100";

type UuidToolState = {
  /** Single source of truth (Pitfall 4, D-01/D-03/D-04): regenerated ONLY
   * on version switch, batch-count change, or Regenerate — never on
   * case/hyphen toggles. */
  rawUuids: string[];
  version: UuidVersion;
  count: number;
  case: UuidCase;
  hyphens: boolean;
};

/** Parses a raw batch-count input string; returns the clamped integer
 * value if it's a plain non-negative integer in [1,100], or `null` for
 * anything else (non-numeric, decimal, negative, >100) — the caller shows
 * the inline hint and keeps the last valid batch (UUID-03, Copywriting
 * Contract). */
function parseCountInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (parsed < 1 || parsed > 100) return null;
  return parsed;
}

/**
 * The interactive UUID tool island (UUID-02, UUID-03, UUID-04). Extends the
 * 02-01 hero-only slice with version switching, a live batch count,
 * Regenerate, and case/hyphen reformatting — plus the first live wiring of
 * Phase 1's `useKeyboardShortcut` (`/` -> focus batch-count input, `Enter`
 * -> regenerate, `Ctrl/Cmd+C` -> copy the primary value).
 *
 * `rawUuids` is regenerated ONLY on version switch (D-01), batch-count
 * change (D-04), or Regenerate/Enter (D-03). The DISPLAYED strings are
 * always `formatUuids(rawUuids, {case, hyphens})`, a pure derivation
 * computed on every render — case/hyphen toggles reformat in place and
 * never regenerate (D-02, RESEARCH.md Pitfall 4).
 */
export function UuidTool() {
  const [state, setState] = useState<UuidToolState>(() => ({
    rawUuids: generateBatch({ version: "v4", count: 1 }),
    version: "v4",
    count: 1,
    case: "lower",
    hyphens: true,
  }));
  const [countInput, setCountInput] = useState("1");
  const [countError, setCountError] = useState(false);

  const { copy, copied, error } = useCopyToClipboard();
  const countInputRef = useRef<HTMLInputElement>(null);

  const displayValues = formatUuids(state.rawUuids, {
    case: state.case,
    hyphens: state.hyphens,
  });
  const primaryValue = displayValues[0] ?? "";

  useKeyboardShortcut({
    slash: () => countInputRef.current?.focus(),
    enter: () => regenerate(),
    copy: () => copy(primaryValue),
  });

  function regenerate() {
    setState((prev) => ({
      ...prev,
      rawUuids: generateBatch({ version: prev.version, count: prev.count }),
    }));
  }

  function handleVersionChange(nextVersion: string) {
    // Radix's single-select ToggleGroup emits "" on deselect (clicking the
    // already-active item) — ignore it so a version is always selected.
    if (nextVersion !== "v4" && nextVersion !== "v7") return;
    setState((prev) => ({
      ...prev,
      version: nextVersion,
      rawUuids: generateBatch({ version: nextVersion, count: prev.count }),
    }));
  }

  function handleCountInputChange(value: string) {
    setCountInput(value);
    const parsed = parseCountInput(value);
    if (parsed === null) {
      setCountError(true);
      return;
    }
    setCountError(false);
    setState((prev) => ({
      ...prev,
      count: parsed,
      rawUuids: generateBatch({ version: prev.version, count: parsed }),
    }));
  }

  function handleCaseChange(checked: boolean) {
    setState((prev) => ({ ...prev, case: checked ? "upper" : "lower" }));
  }

  function handleHyphensChange(checked: boolean) {
    setState((prev) => ({ ...prev, hyphens: checked }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[14px] leading-[1.4] font-semibold">
            Version
          </Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={state.version}
            onValueChange={handleVersionChange}
            data-testid="uuid-version-toggle"
          >
            <ToggleGroupItem
              value="v4"
              data-testid="uuid-version-v4"
              className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
            >
              v4
            </ToggleGroupItem>
            <ToggleGroupItem
              value="v7"
              data-testid="uuid-version-v7"
              className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
            >
              v7
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="uuid-batch-count"
            className="text-[14px] leading-[1.4] font-semibold"
          >
            Batch count
          </Label>
          <Input
            id="uuid-batch-count"
            ref={countInputRef}
            data-testid="uuid-batch-count"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={countInput}
            onChange={(event) => handleCountInputChange(event.target.value)}
            aria-invalid={countError}
            aria-describedby={countError ? "uuid-batch-count-hint" : undefined}
            className="w-20"
          />
          {countError && (
            <span
              id="uuid-batch-count-hint"
              data-testid="uuid-batch-count-hint"
              className="text-[14px] leading-[1.4] font-normal text-muted-foreground"
            >
              {BATCH_COUNT_HINT}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={regenerate}
          aria-label="Regenerate"
          data-testid="uuid-regenerate"
          // 44x44 minimum hit area via padding, accent-tinted per UI-SPEC
          // (the page's core repeatable action, D-03).
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <RefreshCw aria-hidden="true" className="size-5" />
          <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
            Regenerate
          </span>
        </button>

        <div className="flex items-center gap-2">
          <Label
            htmlFor="uuid-case-switch"
            className="text-[14px] leading-[1.4] font-semibold"
          >
            Case
          </Label>
          <Switch
            id="uuid-case-switch"
            data-testid="uuid-case-switch"
            checked={state.case === "upper"}
            onCheckedChange={handleCaseChange}
          />
          <span className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
            {state.case === "upper" ? "Upper" : "Lower"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Label
            htmlFor="uuid-hyphens-switch"
            className="text-[14px] leading-[1.4] font-semibold"
          >
            Hyphens
          </Label>
          <Switch
            id="uuid-hyphens-switch"
            data-testid="uuid-hyphens-switch"
            checked={state.hyphens}
            onCheckedChange={handleHyphensChange}
          />
          <span className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
            {state.hyphens ? "On" : "Off"}
          </span>
        </div>
      </div>

      {state.count === 1 ? (
        <div
          data-testid="uuid-hero"
          className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-secondary px-4 py-4"
        >
          <span
            data-testid="uuid-hero-value"
            className="font-mono text-[20px] leading-[1.2] font-semibold break-all text-foreground"
          >
            {primaryValue}
          </span>
          <button
            type="button"
            onClick={() => copy(primaryValue)}
            aria-label={copied ? "Copied!" : "Copy UUID"}
            data-testid="uuid-copy"
            // 44x44 minimum hit area via padding around a smaller icon;
            // accent-tinted per UI-SPEC's reserved list (copy actions).
            className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {copied ? (
              <>
                <Check aria-hidden="true" className="size-4" />
                <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
                  Copied!
                </span>
              </>
            ) : (
              <Copy aria-hidden="true" className="size-5" />
            )}
          </button>
          {/* Not color-alone: icon+label swap above is the primary
              confirmation signal; this announces the same change to screen
              readers (QUAL-04/QUAL-05), mirroring IpBadge's exact pattern. */}
          <span
            aria-live="polite"
            className="sr-only"
            data-testid="uuid-copy-status"
          >
            {copied ? "Copied!" : ""}
          </span>
          {error && (
            <span className="w-full text-[14px] leading-[1.4] font-normal text-muted-foreground">
              Couldn&apos;t copy — select the text and copy manually.
            </span>
          )}
        </div>
      ) : (
        <ScrollArea
          data-testid="uuid-batch-list"
          className="max-h-96 rounded-md border border-border bg-secondary"
        >
          <div className="flex flex-col divide-y divide-border px-4">
            {displayValues.map((value, index) => (
              <div
                key={`${index}-${value}`}
                data-testid="uuid-batch-row"
                className="py-2 font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
              >
                {value}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export default UuidTool;
