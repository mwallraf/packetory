"use client";

import { Check, Copy, RefreshCw, TriangleAlert } from "lucide-react";
import type { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { ColoredPassword } from "./ColoredPassword";
import type { Generated } from "./PasswordTool";

type CopyState = ReturnType<typeof useCopyToClipboard>;

type Props = {
  gen: Generated;
  heroCopy: CopyState;
  onRegenerate: () => void;
};

const COPY_ERROR_TEXT = "Couldn't copy — select the text and copy manually.";

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
} as const;

function ErrorPanel({ error }: { error: "crypto" | "exhausted" }) {
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
          className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-primary outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

/**
 * Renders exactly one of the hero or the fail-closed error panel (D-03,
 * D-10). The password never appears in a title, aria-*, data-* or key. The
 * batch list for more than one result is plan 13-04's (POUT-02); until then
 * the hero shows `results[0]`.
 */
export function PasswordOutput({ gen, heroCopy, onRegenerate }: Props) {
  if (gen.error !== null) {
    return <ErrorPanel error={gen.error} />;
  }
  const value = gen.results[0];
  if (value === undefined) {
    return <ErrorPanel error="crypto" />;
  }
  return (
    <Hero value={value} heroCopy={heroCopy} onRegenerate={onRegenerate} />
  );
}
