"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

/** localStorage key holding the visitor's manual theme choice (D-10). Never a cookie. */
export const THEME_STORAGE_KEY = "packetory-theme";

/** Validates an arbitrary value against the only two theme states we expose (D-11). */
export function isValidTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Inline script source, injected into <head> by app/layout.tsx and executed
 * before first paint. Reads localStorage (falling back to
 * `prefers-color-scheme`, D-09) and applies the theme class to <html>
 * synchronously, so there is no light-to-dark flash (FOUC) and no
 * hydration-mismatch warning once React mounts (T-01-02: any stored value
 * outside {light, dark} is ignored rather than trusted).
 */
export const THEME_INIT_SCRIPT = `(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();`;

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * `document.documentElement`'s class attribute is an external system (set by
 * THEME_INIT_SCRIPT before React ever mounts). useSyncExternalStore is the
 * React-recommended way to read + subscribe to a value like this without a
 * setState-in-effect anti-pattern (react-hooks/set-state-in-effect): React
 * renders `getServerSnapshot` on the server/initial hydration pass and
 * swaps to the real client value before paint, with no mismatch warning.
 */
function subscribeToThemeClass(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  // SSR placeholder — the real theme is applied client-side by
  // THEME_INIT_SCRIPT before paint; React reconciles this safely.
  return "light";
}

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToThemeClass,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  const toggleTheme = useCallback(() => {
    const next: Theme = getThemeSnapshot() === "dark" ? "light" : "dark";
    applyThemeClass(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (e.g. private browsing) — theme still
      // applies for this session, just won't persist across reloads.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
