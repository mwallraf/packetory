"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BATCH_MAX, BATCH_MIN } from "@/lib/password";

/**
 * Attributes that keep password managers, autofill and spellcheck away from an
 * option input (D-08). No `name`, no `type="password"`, and never inside a form.
 */
export const TEXT_INPUT_GUARDS = {
  autoComplete: "off",
  spellCheck: false,
  autoCorrect: "off",
  autoCapitalize: "off",
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
  "data-form-type": "other",
} as const;

export const LABEL_CLASS = "text-[14px] leading-[1.4] font-semibold";
export const HINT_CLASS =
  "text-[14px] leading-[1.4] font-normal text-muted-foreground";

const KBD_CLASS =
  "rounded-sm border border-border bg-secondary px-1 font-mono text-[14px] leading-[1.4] text-foreground";

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className={KBD_CLASS}>{children}</kbd>;
}

type RangeRowProps = {
  /** Input id; the label id is `${id}-label` and the hint id `${id}-hint`. */
  id: string;
  label: string;
  min: number;
  max: number;
  /** The text in the number input (a draft, so it may be invalid). */
  draft: string;
  error: boolean;
  /** The committed value that the slider shows. */
  value: number;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Optional unit text after the input, for example "characters". */
  suffix?: string;
  testId: string;
  sliderTestId: string;
  hintTestId: string;
  onDraftChange: (value: string) => void;
  onBlur: () => void;
  onSliderChange: (value: number) => void;
};

/**
 * The shared label, number input and slider row of Length and Word count
 * (UI-SPEC "Range rows", 13-UI-REVIEW Fix 4): the min and max numbers sit at
 * the two ends of the slider row, level with the track, so the 44px hit area
 * is kept. It holds no state; the island owns the draft and the commit.
 */
export function RangeRow({
  id,
  label,
  min,
  max,
  draft,
  error,
  value,
  inputRef,
  suffix,
  testId,
  sliderTestId,
  hintTestId,
  onDraftChange,
  onBlur,
  onSliderChange,
}: RangeRowProps) {
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id} id={labelId} className={LABEL_CLASS}>
          {label}
        </Label>
        <Input
          id={id}
          ref={inputRef}
          data-testid={testId}
          type="text"
          inputMode="numeric"
          className="h-11 w-20 text-base md:text-base"
          value={draft}
          aria-invalid={error}
          aria-describedby={error ? hintId : undefined}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onBlur}
          {...TEXT_INPUT_GUARDS}
        />
        {suffix && <span className={HINT_CLASS}>{suffix}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="text-[14px] leading-[1.4] font-normal tabular-nums text-muted-foreground"
        >
          {min}
        </span>
        <input
          type="range"
          data-testid={sliderTestId}
          aria-labelledby={labelId}
          min={min}
          max={max}
          step={1}
          value={value}
          autoComplete="off"
          className="h-11 min-w-0 flex-1 cursor-pointer rounded-full accent-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onChange={(e) => onSliderChange(Number(e.target.value))}
        />
        <span
          aria-hidden="true"
          className="text-[14px] leading-[1.4] font-normal tabular-nums text-muted-foreground"
        >
          {max}
        </span>
      </div>
      {error && (
        <span id={hintId} data-testid={hintTestId} className={HINT_CLASS}>
          {`Enter a number between ${min} and ${max}`}
        </span>
      )}
    </div>
  );
}

type BatchCountRowProps = {
  draft: string;
  error: boolean;
  onDraftChange: (value: string) => void;
  onBlur: () => void;
};

/** The Batch count control, shared by both modes, in its own full-width row. */
export function BatchCountRow({
  draft,
  error,
  onDraftChange,
  onBlur,
}: BatchCountRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="password-batch-count" className={LABEL_CLASS}>
          Batch count
        </Label>
        <Input
          id="password-batch-count"
          data-testid="password-batch-count"
          type="text"
          inputMode="numeric"
          className="h-11 w-20 text-base md:text-base"
          value={draft}
          aria-invalid={error}
          aria-describedby={error ? "password-batch-count-hint" : undefined}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onBlur}
          {...TEXT_INPUT_GUARDS}
        />
      </div>
      {error && (
        <span
          id="password-batch-count-hint"
          data-testid="password-batch-count-hint"
          className={HINT_CLASS}
        >
          {`Enter a number between ${BATCH_MIN} and ${BATCH_MAX}`}
        </span>
      )}
    </div>
  );
}
