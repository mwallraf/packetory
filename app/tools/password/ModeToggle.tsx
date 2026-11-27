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
 * The Password/Passphrase single-select toggle group
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
    <ToggleGroup
      type="single"
      variant="outline"
      value={mode}
      onValueChange={handleValueChange}
      aria-label="Mode"
      data-testid="password-mode"
      className="self-start"
    >
      {MODES.map((m) => (
        <ToggleGroupItem
          key={m}
          value={m}
          data-testid={`password-mode-${m}`}
          className={`${TOGGLE_ITEM_CLASS} px-3`}
        >
          {CAPTIONS[m]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
