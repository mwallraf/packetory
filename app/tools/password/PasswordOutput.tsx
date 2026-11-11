"use client";

import { Check, Copy, RefreshCw, TriangleAlert } from "lucide-react";
import type { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { ColoredPassword } from "./ColoredPassword";
import type { Mode, Separator } from "@/lib/password";
import type { Generated } from "./PasswordTool";
import { COPY_ERROR_TEXT, PasswordRow } from "./PasswordRow";

type CopyState = ReturnType<typeof useCopyToClipboard>;

type Props = {
  gen: Generated;
  mode: Mode;
  separator: Separator;
  heroCopy: CopyState;
  allCopy: CopyState;
  onCopyHero: (value: string) => void;
  onCopyAll: (value: string) => void;
  onRegenerate: () => void;
  onRetry: () => void;
  onRowCopied: () => void;
};

/** The noun for the current mode, used in names, counts and error copy. */
function nounFor(mode: Mode): "password" | "passphrase" {
  return mode === "passphrase" ? "passphrase" : "password";
}

/**
 * Passphrase wrap points (UI-SPEC decision 12): only "_" and "." give the
 * browser no natural break opportunity, so only they get a wbr after each
 * separator. "-" and Space already break there.
 */
function breakAfterFor(mode: Mode, separator: Separator): string | undefined {
  return mode === "passphrase" && (separator === "_" || separator === ".")
    ? separator
    : undefined;
}

/**
 * The fail-closed copy (D-03). Plain JS strings, not JSX text, so the
 * apostrophes need no entity.
 */
const ERROR_COPY = {
  crypto: {
    sentence:
      "Secure random generation isn't available in this browser, so no password was generated.",
    nextStep: "Try an up-to-date version of Chrome, Edge, Firefox or Safari.",
  },
  exhausted: {
    sentence:
      "Couldn't generate a password that uses every selected character set, so none is shown.",
    nextStep: "Press Enter to try again, or change an option.",
  },
  unexpected: {
    sentence: "Something went wrong, so no password was generated.",
    nextStep: "Press Enter to try again, or change an option.",
  },
} as const;

const PASSPHRASE_ERROR_SENTENCE = {
  crypto:
    "Secure random generation isn't available in this browser, so no passphrase was generated.",
  unexpected: "Something went wrong, so no passphrase was generated.",
} as const;

function ErrorPanel({
  error,
  mode,
}: {
  error: "crypto" | "exhausted" | "unexpected";
  mode: Mode;
}) {
  const base = ERROR_COPY[error];
  // The exhausted copy is password-only (it names character sets).
  const copy =
    mode === "passphrase" && error !== "exhausted"
      ? { ...base, sentence: PASSPHRASE_ERROR_SENTENCE[error] }
      : base;
  return (
    <div
      data-testid="password-error"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-background p-4"
    >
      <TriangleAlert
        aria-hidden="true"
        className="mt-1 size-4 shrink-0 text-destructive"
      />
      <div role="alert" className="flex flex-col gap-2">
        <p className="text-[16px] leading-[1.5] font-normal text-destructive">
          {copy.sentence}
        </p>
        <p className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
          {copy.nextStep}
        </p>
      </div>
    </div>
  );
}

/**
 * Pinned to the measured default 6-word passphrase hero so Loading and Error
 * never move the layout (D-16, D-17). Measured (14-08, Chromium, fonts loaded,
 * most frequent of 200 samples): 178px at 320px wide, 122px at 1280px wide.
 */
const WORDLIST_STATE_HEIGHT = "h-[178px] sm:h-[122px]";
const WORDLIST_STATE_MIN_HEIGHT = "min-h-[178px] sm:min-h-[122px]";

/** Text-free placeholder while the EFF list loads (D-04): no value, no controls. */
function WordlistLoading() {
  return (
    <div
      data-testid="password-wordlist-loading"
      aria-hidden="true"
      className={`${WORDLIST_STATE_HEIGHT} animate-pulse rounded-md border border-border bg-secondary motion-reduce:animate-none`}
    />
  );
}

/**
 * Fail-closed word-list failure (D-04, D-05): no passphrase from any source and
 * no copy or regenerate controls. Retry sits outside the alert node and does
 * not take focus when the panel appears (UI-SPEC "Wordlist states").
 */
function WordlistError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-testid="password-wordlist-error"
      className={`flex ${WORDLIST_STATE_MIN_HEIGHT} flex-col items-start gap-4 rounded-md border border-destructive/30 bg-background p-4`}
    >
      <div className="flex items-start gap-2">
        <TriangleAlert
          aria-hidden="true"
          className="mt-1 size-4 shrink-0 text-destructive"
        />
        <div role="alert" className="flex flex-col gap-2">
          <p className="text-[16px] leading-[1.5] font-normal text-destructive">
            {"Couldn't load the word list, so no passphrase was generated."}
          </p>
          <p className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
            Check your connection and try again.
          </p>
        </div>
      </div>
      <button
        type="button"
        data-testid="password-wordlist-retry"
        onClick={onRetry}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border px-4 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <RefreshCw aria-hidden="true" className="size-5" />
        <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
          Retry
        </span>
      </button>
    </div>
  );
}

function Hero({
  value,
  mode,
  separator,
  heroCopy,
  onCopyHero,
  onRegenerate,
}: {
  value: string;
  mode: Mode;
  separator: Separator;
  heroCopy: CopyState;
  onCopyHero: (value: string) => void;
  onRegenerate: () => void;
}) {
  return (
    <div
      data-testid="password-hero"
      className="flex flex-col gap-4 rounded-md border border-border bg-secondary p-4"
    >
      <div
        data-testid="password-output"
        translate="no"
        spellCheck={false}
        className={`font-mono text-[20px] leading-[1.4] font-semibold ${
          mode === "passphrase" ? "[overflow-wrap:anywhere]" : "break-all"
        } select-all text-foreground`}
      >
        <ColoredPassword
          value={value}
          breakAfter={breakAfterFor(mode, separator)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="password-copy"
          aria-label={heroCopy.copied ? "Copied!" : `Copy ${nounFor(mode)}`}
          onClick={() => onCopyHero(value)}
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#0e7490] px-4 text-white outline-none transition-colors hover:bg-[#155e75] focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
        >
          {heroCopy.copied ? (
            <>
              <Check aria-hidden="true" className="size-4" />
              <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
                Copied!
              </span>
            </>
          ) : (
            <>
              <Copy aria-hidden="true" className="size-5" />
              <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
                Copy
              </span>
            </>
          )}
        </button>
        <button
          type="button"
          data-testid="password-regenerate"
          onClick={onRegenerate}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border px-4 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <RefreshCw aria-hidden="true" className="size-5" />
          <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
            Regenerate
          </span>
        </button>
      </div>
      {heroCopy.error && (
        <p className="text-[14px] leading-[1.4] font-normal text-foreground">
          {COPY_ERROR_TEXT}
        </p>
      )}
    </div>
  );
}

function Batch({
  gen,
  mode,
  separator,
  allCopy,
  onCopyAll,
  onRegenerate,
  onRowCopied,
}: {
  gen: Generated;
  mode: Mode;
  separator: Separator;
  allCopy: CopyState;
  onCopyAll: (value: string) => void;
  onRegenerate: () => void;
  onRowCopied: () => void;
}) {
  const noun = nounFor(mode);
  return (
    <div data-testid="password-batch" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-[14px] leading-[1.4] font-semibold text-muted-foreground">
          {gen.results.length} {noun}s
        </p>
        <button
          type="button"
          data-testid="password-copy-all"
          aria-label={allCopy.copied ? "Copied!" : `Copy all ${noun}s`}
          onClick={() => onCopyAll(gen.results.join("\n"))}
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#0e7490] px-4 text-white outline-none transition-colors hover:bg-[#155e75] focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
        >
          {allCopy.copied ? (
            <>
              <Check aria-hidden="true" className="size-4" />
              <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
                Copied!
              </span>
            </>
          ) : (
            <>
              <Copy aria-hidden="true" className="size-5" />
              <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
                Copy all
              </span>
            </>
          )}
        </button>
        <button
          type="button"
          data-testid="password-regenerate"
          onClick={onRegenerate}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border px-4 text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <RefreshCw aria-hidden="true" className="size-5" />
          <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">
            Regenerate
          </span>
        </button>
      </div>
      {allCopy.error && (
        <p className="text-[14px] leading-[1.4] font-normal text-foreground">
          {COPY_ERROR_TEXT}
        </p>
      )}
      <ul
        data-testid="password-batch-list"
        className="flex flex-col divide-y divide-border rounded-md border border-border bg-secondary px-4"
      >
        {gen.results.map((value, index) => (
          <PasswordRow
            key={`${gen.generation}-${index}`}
            value={value}
            index={index}
            onCopied={onRowCopied}
            kind={noun}
            breakAfter={breakAfterFor(mode, separator)}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders exactly one of the hero, the batch list or the fail-closed error
 * panel (D-03, D-10). A generation is all-or-nothing, so the list never shows
 * a partial result. The password never appears in a title, aria-*, data-* or
 * key: rows are keyed by generation and index.
 */
export function PasswordOutput({
  gen,
  mode,
  separator,
  heroCopy,
  allCopy,
  onCopyHero,
  onCopyAll,
  onRegenerate,
  onRetry,
  onRowCopied,
}: Props) {
  if (gen.status === "loading") return <WordlistLoading />;
  if (gen.status === "wordlist-error") return <WordlistError onRetry={onRetry} />;
  if (gen.error !== null) {
    return <ErrorPanel error={gen.error} mode={mode} />;
  }
  const value = gen.results[0];
  if (value === undefined) {
    return <ErrorPanel error="unexpected" mode={mode} />;
  }
  if (gen.results.length > 1) {
    return (
      <Batch
        gen={gen}
        mode={mode}
        separator={separator}
        allCopy={allCopy}
        onCopyAll={onCopyAll}
        onRegenerate={onRegenerate}
        onRowCopied={onRowCopied}
      />
    );
  }
  return (
    <Hero
      value={value}
      mode={mode}
      separator={separator}
      heroCopy={heroCopy}
      onCopyHero={onCopyHero}
      onRegenerate={onRegenerate}
    />
  );
}
