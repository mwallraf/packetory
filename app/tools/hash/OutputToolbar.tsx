"use client";

import type { DigestEncoding } from "@/lib/hash/format";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const ITEM_CLASS =
  "text-[14px] leading-[1.4] font-semibold data-[state=on]:bg-primary/10 data-[state=on]:text-primary";

type OutputToolbarProps = {
  encoding: DigestEncoding;
  onEncodingChange: (encoding: DigestEncoding) => void;
};

/** Output toolbar: encoding toggle (OUT-03). Re-formats only, never re-hashes. */
export function OutputToolbar({ encoding, onEncodingChange }: OutputToolbarProps) {
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
    </div>
  );
}
