"use client";

import { useEffect } from "react";
import { Check, CircleCheck, Copy, Info, ShieldAlert } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Reused verbatim from the MAC/DNS/UUID tools. */
export const COPY_ERROR_MESSAGE =
  "Couldn't copy — select the text and copy manually.";

type DigestRowProps = {
  id: string;
  label: string;
  /** The digest exactly as displayed (current encoding); this is what is copied. */
  value: string;
  primary: boolean;
  /** MD5, SHA-1 and CRC32 (OUT-05): an inline text badge, never a tooltip. */
  notForSecurity: boolean;
  /** CRC32 while Base64 is selected: it stays hex, say so. */
  alwaysHex: boolean;
  /** Verify (OUT-04): this row's digest equals the pasted expected checksum. */
  matched?: boolean;
  /** A `?text=` restore is still hashing: placeholder value, copy disabled. */
  pending?: boolean;
  /** Characters of the settled hex digest, so the pending row is the same height. */
  placeholderLength: number;
};

/**
 * One digest row (OUT-01): label, copy button with visible confirmation and
 * the digest value. Owns its own `useCopyToClipboard()` so confirmation never
 * bleeds between rows.
 */
export function DigestRow({
  id,
  label,
  value,
  primary,
  notForSecurity,
  alwaysHex,
  matched = false,
  pending = false,
  placeholderLength,
}: DigestRowProps) {
  const { copy, copied, error, reset } = useCopyToClipboard();

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset is a stable useCallback identity; omitted to avoid re-running on hook-identity changes.
  }, [value]);

  return (
    <div
      data-testid={"hash-row-" + id}
      className={cn(
        "flex flex-col gap-1 rounded-md border px-4 py-3",
        matched
          ? "border-primary bg-primary/10"
          : "border-border bg-secondary",
        primary && "border-l-4 border-l-primary",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
          {label}
        </span>
        {notForSecurity && (
          <Badge
            variant="outline"
            data-testid={"hash-row-" + id + "-security"}
            className="h-auto gap-1 px-2 py-1 text-[14px] leading-[1.4] font-semibold text-foreground"
          >
            {id === "crc32" ? (
              <>
                <Info aria-hidden="true" className="size-4" />
                Error detection only
              </>
            ) : (
              <>
                <ShieldAlert aria-hidden="true" className="size-4" />
                Not for security
              </>
            )}
          </Badge>
        )}
        {matched && (
          <Badge
            variant="outline"
            data-testid={"hash-row-" + id + "-match"}
            className="h-auto gap-1 border-primary px-2 py-1 text-[14px] leading-[1.4] font-semibold text-foreground"
          >
            <CircleCheck aria-hidden="true" className="size-4 text-primary" />
            Match
          </Badge>
        )}
        {alwaysHex && (
          <span
            data-testid={"hash-row-" + id + "-always-hex"}
            className="text-[14px] leading-[1.4] font-normal text-muted-foreground"
          >
            Always hex
          </span>
        )}
        <button
          type="button"
          onClick={() => copy(value)}
          disabled={pending}
          aria-label={copied ? "Copied!" : "Copy " + label + " digest"}
          data-testid={"hash-row-" + id + "-copy"}
          className="ml-auto inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      <span
        data-testid={"hash-row-" + id + "-value"}
        className={cn(
          "min-w-0 font-mono text-base leading-[1.5] break-all text-foreground",
          primary && "font-semibold",
        )}
      >
        {pending ? (
          <>
            <span
              aria-hidden="true"
              className="block motion-safe:animate-pulse rounded bg-muted"
            >
              <span className="text-transparent select-none">
                {"0".repeat(placeholderLength)}
              </span>
            </span>
            <span className="sr-only">Computing</span>
          </>
        ) : (
          value
        )}
      </span>
      {/* Not color-alone: the icon swap is the primary signal; this announces
          the same change to screen readers. */}
      <span
        aria-live="polite"
        className="sr-only"
        data-testid={"hash-row-" + id + "-status"}
      >
        {copied ? "Copied!" : ""}
      </span>
      {error && (
        <span className="text-[14px] leading-[1.4] font-normal text-muted-foreground">
          {COPY_ERROR_MESSAGE}
        </span>
      )}
    </div>
  );
}
