"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { ColoredPassword } from "./ColoredPassword";

/** Shown next to any control whose clipboard write was rejected. */
export const COPY_ERROR_TEXT =
  "Couldn't copy — select the text and copy manually.";

type Props = {
  value: string;
  index: number;
  onCopied: () => void;
  /** Names the row control and picks the wrapping rule (PHR-01 parity). */
  kind?: "password" | "passphrase";
  /** "-", "_" or "." in Passphrase mode: break before each separator. */
  breakBefore?: string;
};

/**
 * One batch row (POUT-02, D-10). It owns its own copy hook, so a confirmation
 * never bleeds into another row. The accessible name carries the 1-based
 * position only; the password is never in an aria-label, title, data-* or key.
 * `onCopied` tells the island a copy succeeded so it can announce the fixed
 * phrase; it fires from the hook's `copied` flag, never from the click.
 */
export function PasswordRow({
  value,
  index,
  onCopied,
  kind = "password",
  breakBefore,
}: Props) {
  const { copy, copied, error } = useCopyToClipboard();
  // Bumped after every successful copy so a repeat copy inside the 2 s window
  // (when `copied` stays true) still re-runs the announcement effect (D-20a).
  // The hook is unchanged: a rejected write leaves `copied` false, so the
  // effect's early return keeps a failure silent.
  const [copySeq, setCopySeq] = useState(0);

  // The announcement is scheduled through a timer so no state is set
  // synchronously in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(onCopied, 0);
    return () => clearTimeout(timer);
  }, [copied, copySeq, onCopied]);

  async function onCopyClick() {
    await copy(value);
    setCopySeq((n) => n + 1);
  }

  return (
    <li data-testid="password-row" className="py-1">
      {/* No wrap: the button keeps a fixed 44px box in both states, so the
          confirmation never moves the button or reflows the value (UI-3). */}
      <div className="flex items-start gap-2">
        <div
          data-testid="password-row-value"
          translate="no"
          spellCheck={false}
          className={`min-w-0 flex-1 py-2 font-mono text-[16px] leading-[1.5] font-normal ${
            kind === "passphrase" ? "[overflow-wrap:anywhere]" : "break-all"
          } select-all text-foreground`}
        >
          <ColoredPassword value={value} breakBefore={breakBefore} />
        </div>
        <button
          type="button"
          data-testid="password-row-copy"
          aria-label={copied ? "Copied!" : `Copy ${kind} ${index + 1}`}
          onClick={() => void onCopyClick()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full px-2 text-primary outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {copied ? (
            <>
              <Check aria-hidden="true" className="size-5" />
              <span className="sr-only">Copied!</span>
            </>
          ) : (
            <Copy aria-hidden="true" className="size-5" />
          )}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[14px] leading-[1.4] font-normal text-foreground">
          {COPY_ERROR_TEXT}
        </p>
      )}
    </li>
  );
}
