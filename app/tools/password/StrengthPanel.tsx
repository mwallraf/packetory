"use client";

import {
  EFF_WORD_COUNT,
  GUESS_RATES,
  GUESS_RATE_LABELS,
  STRENGTH_LABELS,
  crackTimeLog10Seconds,
  formatBits,
  formatCrackTime,
  passphraseEntropyBits,
  passwordEntropyBits,
  resolveAlphabet,
  strengthLevel,
  type GuessRateKey,
  type StrengthLevel,
  type ToolOptions,
} from "@/lib/password";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TOGGLE_ITEM_CLASS } from "./toggle-classes";

/**
 * Filled-segment colors (UI-SPEC "Strength meter colors"). Strong and Very
 * strong share a color; they differ in segment count and in the label text.
 */
export const LEVEL_SEGMENT_CLASS: Readonly<Record<StrengthLevel, string>> = {
  weak: "bg-destructive",
  fair: "bg-amber-700 dark:bg-amber-300",
  strong: "bg-emerald-700 dark:bg-emerald-300",
  veryStrong: "bg-emerald-700 dark:bg-emerald-300",
};

const FILLED: Readonly<Record<StrengthLevel, number>> = {
  weak: 1,
  fair: 2,
  strong: 3,
  veryStrong: 4,
};

const SEGMENTS = [0, 1, 2, 3] as const;

type MeterProps = { bits: number };

/**
 * Four decorative segments (D-06). The level comes from the raw bits; the
 * visible text label always carries the meaning, so the strip is aria-hidden.
 */
export function StrengthMeter({ bits }: MeterProps) {
  const level = strengthLevel(bits);
  const filled = FILLED[level];
  return (
    <div
      data-testid="password-strength-meter"
      data-level={level}
      aria-hidden="true"
      className="flex h-2 gap-1"
    >
      {SEGMENTS.map((i) => (
        <span
          key={i}
          data-filled={i < filled ? "true" : "false"}
          className={`h-2 flex-1 rounded-full ${
            i < filled ? LEVEL_SEGMENT_CLASS[level] : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * The pool line (D-07). Every figure is derived from the settings and the
 * library, never counted from an output string.
 */
export function poolLine(options: ToolOptions, bits: number): string {
  if (options.mode === "password") {
    return `${resolveAlphabet(options).poolSize} chars · ${formatBits(bits)}`;
  }
  const words = `${EFF_WORD_COUNT.toLocaleString("en-US")} words × ${options.words}`;
  return `${words}${options.appendNumber ? " + 1 digit" : ""} · ${formatBits(bits)}`;
}

/**
 * The crack-time sentence (D-08). It is always an average under a stated
 * assumption, never a guarantee. "less than" and "more than" phrases already
 * carry their own hedge, so they replace "About" and are capitalized.
 */
export function crackSentence(formatted: string): string {
  if (formatted.startsWith("less than ") || formatted.startsWith("more than ")) {
    return `${formatted.charAt(0).toUpperCase()}${formatted.slice(1)} to crack, on average`;
  }
  return `About ${formatted} to crack, on average`;
}

type Props = {
  options: ToolOptions;
  scenario: GuessRateKey;
  onScenarioChange: (next: GuessRateKey) => void;
};

/**
 * Strength panel (STR-01..04). A pure function of the current settings and the
 * attack scenario: no generated value is ever passed in, so Regenerate cannot
 * change it. Not a live region (D-06). Not memoized: the derivation costs
 * microseconds and the page guards ban memo hooks here.
 */
export function StrengthPanel({ options, scenario, onScenarioChange }: Props) {
  const bits =
    options.mode === "password"
      ? passwordEntropyBits(options)
      : passphraseEntropyBits(options);
  const level = strengthLevel(bits);
  const sentence = crackSentence(
    formatCrackTime(crackTimeLog10Seconds(bits, GUESS_RATES[scenario])),
  );

  function handleScenarioChange(next: string) {
    // Radix emits "" when the active item is clicked again; ignore it and any
    // unknown value so one scenario always stays selected.
    if (next !== "fast" && next !== "slow") return;
    if (next === scenario) return;
    onScenarioChange(next);
  }

  return (
    <section
      data-testid="password-strength"
      aria-labelledby="password-strength-heading"
      className="flex flex-col gap-4 rounded-md border border-border bg-background p-4"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2
            id="password-strength-heading"
            className="text-[14px] leading-[1.4] font-semibold text-foreground"
          >
            Strength
          </h2>
          <p
            data-testid="password-strength-label"
            className="text-[14px] leading-[1.4] font-semibold tabular-nums text-foreground"
          >
            {`${STRENGTH_LABELS[level]} · ${formatBits(bits)}`}
          </p>
        </div>
        <StrengthMeter bits={bits} />
        <p
          data-testid="password-strength-pool"
          className="text-[14px] leading-[1.4] font-normal tabular-nums text-muted-foreground"
        >
          {poolLine(options, bits)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p
          data-testid="password-crack-time"
          className="text-[16px] leading-[1.5] font-normal text-foreground"
        >
          {sentence}
        </p>
        <p
          data-testid="password-crack-assumption"
          className="text-[14px] leading-[1.4] font-normal text-muted-foreground"
        >
          {GUESS_RATE_LABELS[scenario]}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          id="password-scenario-label"
          className="text-[14px] leading-[1.4] font-semibold text-foreground"
        >
          Attack scenario
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          value={scenario}
          onValueChange={handleScenarioChange}
          aria-labelledby="password-scenario-label"
          data-testid="password-scenario"
          className="flex-wrap"
        >
          <ToggleGroupItem
            value="fast"
            data-testid="password-scenario-fast"
            className={TOGGLE_ITEM_CLASS}
          >
            Fast hash
          </ToggleGroupItem>
          <ToggleGroupItem
            value="slow"
            data-testid="password-scenario-slow"
            className={TOGGLE_ITEM_CLASS}
          >
            Slow hash (bcrypt)
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </section>
  );
}
