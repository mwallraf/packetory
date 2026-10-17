"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { DigestEncoding } from "@/lib/hash/format";
import { formatChecksumLines, formatLabeledList } from "@/lib/hash/export";
import type { Digests } from "@/lib/hash/types";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { COPY_ERROR_MESSAGE } from "./DigestRow";

type CopyFormat = "labeled" | "checksum";

const ITEM_CLASS =
  "text-[14px] leading-[1.4] font-semibold data-[state=on]:bg-primary/10 data-[state=on]:text-primary";

type OutputToolbarProps = {
  encoding: DigestEncoding;
  onEncodingChange: (encoding: DigestEncoding) => void;
  /** The digests currently on screen; Copy all exports exactly these. */
  digests: Digests | null;
  /** The digests belong to older text (or hashing failed): Copy all is disabled. */
  copyDisabled?: boolean;
};

/**
 * Output toolbar: encoding toggle (OUT-03, re-formats only, never re-hashes)
 * and copy-all as a labeled list or checksum lines (OUT-02).
 */
export function OutputToolbar({
  encoding,
  onEncodingChange,
  digests,
  copyDisabled = false,
}: OutputToolbarProps) {
  // Module-private to the toolbar: no other component needs it, and Esc
  // handling elsewhere must not reset it.
  const [copyFormat, setCopyFormat] = useState<CopyFormat>("labeled");
  const { copy, copied, error, reset } = useCopyToClipboard();

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset is a stable useCallback identity; omitted to avoid re-running on hook-identity changes.
  }, [encoding, copyFormat, digests]);

  function handleCopyFormatChange(next: string) {
    // Radix emits "" on deselect; ignore it so one format is always selected.
    if (next !== "labeled" && next !== "checksum") return;
    setCopyFormat(next);
  }

  function handleCopyAll() {
    if (digests === null || copyDisabled) return;
    // Snapshot at click time.
    const payload =
      copyFormat === "checksum"
        ? formatChecksumLines(digests)
        : formatLabeledList(digests, encoding);
    void copy(payload);
  }

  function handleEncodingChange(next: string) {
    // Radix's single-select ToggleGroup emits "" on deselect (clicking the
    // active item); ignore it so one encoding is always selected.
    if (next !== "hex" && next !== "HEX" && next !== "base64") return;
    onEncodingChange(next);
  }

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      <div className="flex flex-col gap-2">
        <Label
          id="hash-encoding-label"
          className="text-[14px] leading-[1.4] font-semibold"
        >
          Encoding
        </Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={encoding}
          onValueChange={handleEncodingChange}
          aria-labelledby="hash-encoding-label"
          data-testid="hash-encoding-toggle"
        >
          <ToggleGroupItem
            value="hex"
            aria-label="Lowercase hex"
            data-testid="hash-encoding-hex"
            className={ITEM_CLASS}
          >
            hex
          </ToggleGroupItem>
          <ToggleGroupItem
            value="HEX"
            aria-label="Uppercase hex"
            data-testid="hash-encoding-HEX"
            className={ITEM_CLASS}
          >
            HEX
          </ToggleGroupItem>
          <ToggleGroupItem
            value="base64"
            data-testid="hash-encoding-base64"
            className={ITEM_CLASS}
          >
            Base64
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Label
          id="hash-copyall-label"
          className="text-[14px] leading-[1.4] font-semibold"
        >
          Copy all as
        </Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={copyFormat}
          onValueChange={handleCopyFormatChange}
          aria-labelledby="hash-copyall-label"
          data-testid="hash-copyall-format"
        >
          <ToggleGroupItem
            value="labeled"
            data-testid="hash-copyall-labeled"
            className={ITEM_CLASS}
          >
            Labeled list
          </ToggleGroupItem>
          <ToggleGroupItem
            value="checksum"
            data-testid="hash-copyall-checksum"
            className={ITEM_CLASS}
          >
            Checksum lines
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          onClick={handleCopyAll}
          disabled={digests === null || copyDisabled}
          data-testid="hash-copy-all"
          className="h-11 gap-1 text-primary"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? "Copied!" : "Copy all digests"}
        </Button>
        <span
          aria-live="polite"
          className="sr-only"
          data-testid="hash-copy-all-status"
        >
          {copied ? "Copied!" : ""}
        </span>
      </div>
      {error && (
        <span className="basis-full text-[14px] leading-[1.4] font-normal text-muted-foreground">
          {COPY_ERROR_MESSAGE}
        </span>
      )}
    </div>
  );
}
