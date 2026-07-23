"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { generateBatch } from "@/lib/uuid/generate";

/**
 * The interactive UUID tool island (UUID-01, UUID-06 single-copy path).
 * Rendered exclusively client-side via `UuidToolLoader`'s `ssr:false`
 * dynamic import — there is no server-rendered counterpart for this
 * component's CSPRNG-derived output to mismatch against on hydration
 * (see 02-RESEARCH.md Architecture Patterns -> Pattern 1).
 *
 * This slice fixes version to v4 and renders a single hero value only —
 * version switching, case/hyphen formatting, batch count, and export
 * controls arrive in Plan 02-02/02-04. Deliberately holds no unused state
 * fields for those future controls (would trip lint / add dead state).
 */
export function UuidTool() {
  const [rawUuids] = useState<string[]>(() =>
    generateBatch({ version: "v4", count: 1 })
  );
  const { copy, copied, error } = useCopyToClipboard();

  const heroValue = rawUuids[0]!;

  return (
    <div
      data-testid="uuid-hero"
      className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-secondary px-4 py-4"
    >
      <span
        data-testid="uuid-hero-value"
        className="font-mono text-[20px] leading-[1.2] font-semibold break-all text-foreground"
      >
        {heroValue}
      </span>
      <button
        type="button"
        onClick={() => copy(heroValue)}
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
      {/* Not color-alone: icon+label swap above is the primary confirmation
          signal; this announces the same change to screen readers
          (QUAL-04/QUAL-05), mirroring IpBadge's exact pattern. */}
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
  );
}

export default UuidTool;
