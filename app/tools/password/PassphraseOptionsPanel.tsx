"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  APPEND_NUMBER_BITS,
  SEPARATORS,
  SEPARATOR_TOKENS,
  WORDS_MAX,
  WORDS_MIN,
  type Separator,
  type ToolOptions,
} from "@/lib/password";
import { EFF_LICENCE_URL, EFF_WORDLIST_URL } from "./eff-links";
import {
  BatchCountRow,
  HINT_CLASS,
  Kbd,
  LABEL_CLASS,
  RangeRow,
} from "./option-controls";
import { TOGGLE_ITEM_CLASS } from "./toggle-classes";

type Props = {
  options: ToolOptions;
  wordsDraft: string;
  wordsError: boolean;
  wordCountRef: React.Ref<HTMLInputElement>;
  batchDraft: string;
  batchError: boolean;
  onWordsDraftChange: (value: string) => void;
  onWordsBlur: () => void;
  onWordsSliderChange: (words: number) => void;
  onSeparatorChange: (separator: Separator) => void;
  onCapitalizeChange: (checked: boolean) => void;
  onAppendNumberChange: (checked: boolean) => void;
  onBatchDraftChange: (value: string) => void;
  onBatchBlur: () => void;
};

const SEPARATOR_NAMES: Record<Separator, string> = {
  "-": "Dash",
  _: "Underscore",
  ".": "Dot",
  " ": "Space",
};

const LINK =
  "text-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm";

/**
 * One switch cell: the switch and its label share a 44px row, and the hint
 * sits directly under the label text (not under the switch), so it reads as
 * belonging to its own control. Each cell is a grid item, so at sm and up
 * Capitalize and Append sit side by side.
 */
function SwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 items-center">
        <Switch
          id={id}
          data-testid={id}
          checked={checked}
          aria-describedby={`${id}-hint`}
          onCheckedChange={onCheckedChange}
        />
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="flex h-11 items-center">
          <Label htmlFor={id} className={LABEL_CLASS}>
            {label}
          </Label>
        </div>
        <p
          id={`${id}-hint`}
          data-testid={`${id}-hint`}
          className={`${HINT_CLASS} -mt-2`}
        >
          {hint}
        </p>
      </div>
    </div>
  );
}

/**
 * Presentational options section for Passphrase mode (PHR-02, D-02). It holds
 * no state: the island owns the options and the drafts and passes the
 * handlers. Only one of the two option panels is mounted at a time.
 */
export function PassphraseOptionsPanel({
  options,
  wordsDraft,
  wordsError,
  wordCountRef,
  batchDraft,
  batchError,
  onWordsDraftChange,
  onWordsBlur,
  onWordsSliderChange,
  onSeparatorChange,
  onCapitalizeChange,
  onAppendNumberChange,
  onBatchDraftChange,
  onBatchBlur,
}: Props) {
  // Radix emits "" when the active item is clicked again; that and any value
  // that is not a known separator is ignored, so one item always stays selected.
  function handleSeparatorChange(next: string) {
    if (next === options.separator) return;
    const found = SEPARATORS.find((s) => s === next);
    if (found === undefined) return;
    onSeparatorChange(found);
  }

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
          id="password-words"
          label="Word count"
          min={WORDS_MIN}
          max={WORDS_MAX}
          draft={wordsDraft}
          error={wordsError}
          value={options.words}
          inputRef={wordCountRef}
          testId="password-words"
          sliderTestId="password-words-slider"
          hintTestId="password-words-hint"
          onDraftChange={onWordsDraftChange}
          onBlur={onWordsBlur}
          onSliderChange={onWordsSliderChange}
        />

        <div className="flex flex-col gap-2 sm:col-span-2">
          <span
            id="password-separator-label"
            className="text-[14px] leading-[1.4] font-semibold text-foreground"
          >
            Separator
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            value={options.separator}
            onValueChange={handleSeparatorChange}
            aria-labelledby="password-separator-label"
            data-testid="password-separator"
            className="flex-wrap"
          >
            {SEPARATORS.map((sep) => (
              <ToggleGroupItem
                key={sep}
                value={sep}
                aria-label={SEPARATOR_NAMES[sep]}
                data-testid={`password-separator-${SEPARATOR_TOKENS[sep]}`}
                className={
                  sep === " "
                    ? TOGGLE_ITEM_CLASS
                    : `${TOGGLE_ITEM_CLASS} font-mono`
                }
              >
                {sep === " " ? "Space" : sep}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <SwitchRow
          id="password-capitalize"
          label="Capitalize words"
          checked={options.capitalize}
          onCheckedChange={onCapitalizeChange}
          hint="Capital first letter on every word. Adds 0 bits."
        />
        <SwitchRow
          id="password-append-number"
          label="Append a number"
          checked={options.appendNumber}
          onCheckedChange={onAppendNumberChange}
          hint={`A random digit after the last word. Adds about ${APPEND_NUMBER_BITS.toFixed(1)} bits.`}
        />

        <BatchCountRow
          draft={batchDraft}
          error={batchError}
          onDraftChange={onBatchDraftChange}
          onBlur={onBatchBlur}
        />

        <p
          data-testid="password-eff-credit"
          className="text-[14px] leading-[1.4] font-normal text-muted-foreground sm:col-span-2"
        >
          Words from the{" "}
          <a href={EFF_WORDLIST_URL} rel="noreferrer" className={LINK}>
            EFF Large Wordlist
          </a>{" "}
          (
          <a href={EFF_LICENCE_URL} rel="noreferrer" className={LINK}>
            CC BY
          </a>
          )
        </p>
      </div>
      <p
        data-testid="password-shortcuts"
        className="mt-6 text-[14px] leading-[1.4] font-normal text-muted-foreground"
      >
        Keyboard: <Kbd>/</Kbd> word count · <Kbd>Enter</Kbd> regenerate ·{" "}
        <Kbd>Esc</Kbd> reset options · <Kbd>Ctrl/Cmd</Kbd>+<Kbd>C</Kbd> copy
        (single passphrase)
      </p>
    </section>
  );
}
