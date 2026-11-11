"use client";

import { MODES, type Mode } from "@/lib/password";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TOGGLE_ITEM_CLASS } from "./toggle-classes";

const CAPTIONS: Record<Mode, string> = {
  password: "Password",
  passphrase: "Passphrase",
};

type Props = {
  mode: Mode;
  onModeChange: (next: Mode) => void;
};

/**
 * The "Mode" label plus the Password/Passphrase single-select toggle group
 * (D-01). Radix emits "" when the active item is clicked again; that and any
 * value that is not a known mode is ignored, so exactly one item always stays
 * selected and nothing regenerates (UI E1-error, the Hash deselect guard).
 */
export function ModeToggle({ mode, onModeChange }: Props) {
  function handleValueChange(next: string) {
    if (next === mode) return;
    const found = MODES.find((m) => m === next);
    if (found === undefined) return;
    onModeChange(found);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span
        id="password-mode-label"
        className="text-[14px] leading-[1.4] font-semibold text-foreground"
      >
        Mode
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={mode}
        onValueChange={handleValueChange}
        aria-labelledby="password-mode-label"
        data-testid="password-mode"
      >
        {MODES.map((m) => (
          <ToggleGroupItem
            key={m}
            value={m}
            data-testid={`password-mode-${m}`}
            className={TOGGLE_ITEM_CLASS}
          >
            {CAPTIONS[m]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
