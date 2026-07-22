"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Two-state light/dark icon toggle (D-11 — no third "system" state exposed
 * in the UI, even though system preference seeds the initial theme).
 * Reads/writes localStorage synchronously via useTheme(), so no loading or
 * error state can occur (UI-SPEC theme-toggle consideration).
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      data-testid="theme-toggle"
      // 44x44 minimum hit area (QUAL-05/WCAG target-size) via padding around
      // a 20px icon; icon is accent-tinted per UI-SPEC's reserved accent list.
      className="size-11 shrink-0 rounded-lg p-0 text-primary hover:text-primary hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {isDark ? (
        <Sun aria-hidden="true" className="size-5" />
      ) : (
        <Moon aria-hidden="true" className="size-5" />
      )}
    </Button>
  );
}
