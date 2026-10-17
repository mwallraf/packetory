"use client";

import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { describeMatch, type VerifyResult } from "@/lib/hash/verify";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NO_MATCH_COPY =
  "No match. This value doesn't equal any digest of the current text.";

type VerifyBoxProps = {
  value: string;
  onChange: (value: string) => void;
  /** `pending` while the displayed digests belong to older text (D-19). */
  result: VerifyResult | { state: "pending" };
};

/**
 * Expected-checksum field plus a polite live result line (OUT-04, D-17/D-18).
 * A mismatch is neutral (muted icon and text, never the destructive color): it
 * is information, not an error. Match copy states equality only.
 */
export function VerifyBox({ value, onChange, result }: VerifyBoxProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Label
          htmlFor="hash-verify"
          className="shrink-0 text-[14px] leading-[1.4] font-semibold text-foreground sm:w-[160px]"
        >
          Expected checksum
        </Label>
        <Input
          id="hash-verify"
          data-testid="hash-verify"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={4096}
          placeholder="Paste a checksum, e.g. sha256:... or a sha256sum line"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          className="h-11 font-mono text-base md:text-base"
        />
      </div>
      <p
        data-testid="hash-verify-result"
        aria-live="polite"
        className="flex min-h-[24px] items-start gap-2 text-[14px] leading-[1.4] text-muted-foreground"
      >
        {result.state === "match" && (
          <>
            <CircleCheck
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            <span className="text-foreground">{describeMatch(result.ids)}</span>
          </>
        )}
        {result.state === "no-match" && (
          <>
            <CircleX aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {NO_MATCH_COPY}
              {result.hint ? ` ${result.hint}` : ""}
            </span>
          </>
        )}
        {result.state === "pending" && (
          <>
            <LoaderCircle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 motion-safe:animate-spin"
            />
            <span>Comparing...</span>
          </>
        )}
      </p>
    </div>
  );
}
