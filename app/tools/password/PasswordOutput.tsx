"use client";

import { Check, Copy, RefreshCw, TriangleAlert } from "lucide-react";
import type { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { ColoredPassword } from "./ColoredPassword";
import type { Generated } from "./PasswordTool";
import { COPY_ERROR_TEXT, PasswordRow } from "./PasswordRow";

type CopyState = ReturnType<typeof useCopyToClipboard>;

type Props = {
  gen: Generated;
  heroCopy: CopyState;
  allCopy: CopyState;
  onRegenerate: () => void;
  onRetry: () => void;
  onRowCopied: () => void;
};

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

function ErrorPanel({
  error,
}: {
  error: "crypto" | "exhausted" | "unexpected";
}) {
  const copy = ERROR_COPY[error];
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
 * Pinned to the hero's current height pair so Loading and Error never move the
 * layout; 14-08 re-pins it to the measured default passphrase hero (D-16).
 */
const WORDLIST_STATE_HEIGHT = "h-[124px] sm:h-[124px]";
const WORDLIST_STATE_MIN_HEIGHT = "min-h-[124px] sm:min-h-[124px]";

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
  heroCopy,
  onRegenerate,
}: {
  value: string;
  heroCopy: CopyState;
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
        className="font-mono text-[20px] leading-[1.4] font-semibold break-all select-all text-foreground"
      >
        <ColoredPassword value={value} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="password-copy"
          aria-label={heroCopy.copied ? "Copied!" : "Copy password"}
          onClick={() => void heroCopy.copy(value)}
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
  allCopy,
  onRegenerate,
  onRowCopied,
}: {
  gen: Generated;
  allCopy: CopyState;
  onRegenerate: () => void;
  onRowCopied: () => void;
}) {
  return (
    <div data-testid="password-batch" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-[14px] leading-[1.4] font-semibold text-muted-foreground">
          {gen.results.length} passwords
        </p>
        <button
          type="button"
          data-testid="password-copy-all"
          aria-label={allCopy.copied ? "Copied!" : "Copy all passwords"}
          onClick={() => void allCopy.copy(gen.results.join("\n"))}
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
        <p className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
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
  heroCopy,
  allCopy,
  onRegenerate,
  onRetry,
  onRowCopied,
}: Props) {
  if (gen.status === "loading") return <WordlistLoading />;
  if (gen.status === "wordlist-error") return <WordlistError onRetry={onRetry} />;
  if (gen.error !== null) {
    return <ErrorPanel error={gen.error} />;
  }
  const value = gen.results[0];
  if (value === undefined) {
    return <ErrorPanel error="unexpected" />;
  }
  if (gen.results.length > 1) {
    return (
      <Batch
        gen={gen}
        allCopy={allCopy}
        onRegenerate={onRegenerate}
        onRowCopied={onRowCopied}
      />
    );
  }
  return (
    <Hero value={value} heroCopy={heroCopy} onRegenerate={onRegenerate} />
  );
}
