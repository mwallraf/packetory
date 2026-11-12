"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  LENGTH_MAX,
  LENGTH_MIN,
  LOOK_ALIKES,
  SYMBOL_SET_MAX,
  normalizeSymbols,
  type ToolOptions,
} from "@/lib/password";
import {
  BatchCountRow,
  HINT_CLASS,
  Kbd,
  LABEL_CLASS,
  RangeRow,
  TEXT_INPUT_GUARDS,
} from "./option-controls";

export type SetKey = "uppercase" | "lowercase" | "digits" | "symbols";

type Props = {
  options: ToolOptions;
  lengthDraft: string;
  lengthError: boolean;
  lengthRef: React.Ref<HTMLInputElement>;
  symbolDraft: string;
  batchDraft: string;
  batchError: boolean;
  onLengthDraftChange: (value: string) => void;
  onLengthBlur: () => void;
  onSliderChange: (length: number) => void;
  onSetToggle: (key: SetKey, checked: boolean) => void;
  onSymbolDraftChange: (value: string) => void;
  onSymbolBlur: () => void;
  onLookalikesChange: (checked: boolean) => void;
  onBatchDraftChange: (value: string) => void;
  onBatchBlur: () => void;
};

const SET_LABEL_CLASS = `${LABEL_CLASS} peer-disabled:opacity-100`;

const SET_ROWS: ReadonlyArray<{
  key: SetKey;
  label: string;
  example: string | null;
}> = [
  { key: "uppercase", label: "Uppercase", example: "A–Z" },
  { key: "lowercase", label: "Lowercase", example: "a–z" },
  { key: "digits", label: "Digits", example: "0–9" },
  { key: "symbols", label: "Symbols", example: null },
];

/**
 * True when the draft holds at least one character the library would keep.
 * It derives the rule from `normalizeSymbols` instead of restating it
 * (RESEARCH Pattern 5).
 */
function hasUsableSymbol(draft: string): boolean {
  for (const ch of draft) {
    if (normalizeSymbols(ch) === ch) return true;
  }
  return false;
}

/** The symbol hint has exactly one state, in this priority order. */
function symbolHint(symbolsOn: boolean, draft: string): string {
  if (!symbolsOn) return "Turn on Symbols to use this set";
  if (!hasUsableSymbol(draft)) return "Empty, so the default set is used";
  return `Up to ${SYMBOL_SET_MAX} printable ASCII symbols. Letters, digits, spaces and repeats are removed when you leave the field.`;
}

/**
 * Presentational options section (PWD-02, PWD-03). It holds no state: the
 * island owns the options and the drafts and passes the handlers. There is no
 * form, fieldset or output element in here (D-08, RESEARCH Pitfall 8).
 */
export function PasswordOptionsPanel({
  options,
  lengthDraft,
  lengthError,
  lengthRef,
  symbolDraft,
  batchDraft,
  batchError,
  onLengthDraftChange,
  onLengthBlur,
  onSliderChange,
  onSetToggle,
  onSymbolDraftChange,
  onSymbolBlur,
  onLookalikesChange,
  onBatchDraftChange,
  onBatchBlur,
}: Props) {
  const enabled = SET_ROWS.filter((row) => options[row.key]).length;
  const locked = enabled === 1;

  return (
    <section
      data-testid="password-options"
      aria-labelledby="password-options-heading"
    >
      <h2
        id="password-options-heading"
        className="text-[20px] leading-[1.2] font-semibold text-foreground"
      >
        Options
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <RangeRow
          id="password-length"
          label="Length"
          min={LENGTH_MIN}
          max={LENGTH_MAX}
          draft={lengthDraft}
          error={lengthError}
          value={options.length}
          inputRef={lengthRef}
          suffix="characters"
          testId="password-length"
          sliderTestId="password-length-slider"
          hintTestId="password-length-hint"
          onDraftChange={onLengthDraftChange}
          onBlur={onLengthBlur}
          onSliderChange={onSliderChange}
        />

        <div
          role="group"
          aria-labelledby="password-sets-label"
          className="flex flex-col gap-2"
        >
          <span
            id="password-sets-label"
            className="text-[14px] leading-[1.4] font-semibold text-foreground"
          >
            Character sets
          </span>
          {SET_ROWS.map(({ key, label, example }) => {
            const checked = options[key];
            const isLast = locked && checked;
            return (
              <div key={key} className="flex min-h-11 items-center gap-4">
                <Switch
                  id={`password-set-${key}`}
                  data-testid={`password-set-${key}`}
                  checked={checked}
                  disabled={isLast}
                  aria-describedby={
                    isLast ? "password-sets-lock-hint" : undefined
                  }
                  onCheckedChange={(next) => onSetToggle(key, next)}
                />
                <Label
                  htmlFor={`password-set-${key}`}
                  className={SET_LABEL_CLASS}
                >
                  {label}
                  {example && (
                    <span className="font-mono font-normal text-muted-foreground">
                      {example}
                    </span>
                  )}
                </Label>
              </div>
            );
          })}
          {locked && (
            <p
              id="password-sets-lock-hint"
              data-testid="password-sets-lock-hint"
              className={HINT_CLASS}
            >
              At least one character set must stay on
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password-symbols" className={LABEL_CLASS}>
              Symbol set
            </Label>
            <Input
              id="password-symbols"
              data-testid="password-symbols"
              type="text"
              className="h-11 font-mono text-base md:text-base"
              value={symbolDraft}
              disabled={!options.symbols}
              aria-describedby="password-symbols-hint"
              onChange={(e) => onSymbolDraftChange(e.target.value)}
              onBlur={onSymbolBlur}
              {...TEXT_INPUT_GUARDS}
            />
            <p
              id="password-symbols-hint"
              data-testid="password-symbols-hint"
              className={HINT_CLASS}
            >
              {symbolHint(options.symbols, symbolDraft)}
            </p>
          </div>


          <div className="flex flex-col gap-2">
            <div className="flex min-h-11 items-center gap-4">
              <Switch
                id="password-lookalikes"
                data-testid="password-lookalikes"
                checked={options.avoidLookalikes}
                aria-describedby="password-lookalikes-hint"
                onCheckedChange={onLookalikesChange}
              />
              <Label htmlFor="password-lookalikes" className={LABEL_CLASS}>
                Avoid look-alikes
              </Label>
            </div>
            <p
              id="password-lookalikes-hint"
              data-testid="password-lookalikes-hint"
              className={HINT_CLASS}
            >
              Removes{" "}
              <span className="font-mono">
                {LOOK_ALIKES.split("").join(" ")}
              </span>
            </p>
          </div>
        </div>

        <BatchCountRow
          draft={batchDraft}
          error={batchError}
          onDraftChange={onBatchDraftChange}
          onBlur={onBatchBlur}
        />
      </div>
      <p
        data-testid="password-shortcuts"
        className="mt-6 text-[14px] leading-[1.4] font-normal text-muted-foreground"
      >
        Keyboard: <Kbd>/</Kbd> length · <Kbd>Enter</Kbd> regenerate ·{" "}
        <Kbd>Esc</Kbd> reset options · <Kbd>Ctrl/Cmd</Kbd>+<Kbd>C</Kbd> copy
        (single password)
      </p>
    </section>
  );
}
