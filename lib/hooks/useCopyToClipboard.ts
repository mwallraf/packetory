"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_REVERT_MS = 2000;

/**
 * Reusable, value-agnostic one-click-copy primitive (project-brief.md §3/§6
 * — "one-click copy with visible confirmation everywhere"). Every later
 * tool's copy button (IPs, UUIDs, CIDRs, MAC addresses) reuses this same
 * hook rather than reimplementing clipboard + confirmation-timing logic.
 *
 * `copy(value)` writes the exact string via `navigator.clipboard.writeText`
 * — byte-for-byte, no trimming/casing changes — and sets `copied=true` for
 * ~2s before auto-reverting. A rejected write sets `error=true` and leaves
 * `copied=false`, but never throws out of `copy()`. The visible "Copied!"
 * swap and any `aria-live` announcement are the consumer's responsibility;
 * this hook only exposes the state that drives both.
 */
export function useCopyToClipboard(revertMs: number = DEFAULT_REVERT_MS) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const revertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (revertTimeoutRef.current) clearTimeout(revertTimeoutRef.current);
    };
  }, []);

  const copy = useCallback(
    async (value: string) => {
      if (revertTimeoutRef.current) {
        clearTimeout(revertTimeoutRef.current);
        revertTimeoutRef.current = null;
      }

      try {
        await navigator.clipboard.writeText(value);
        setError(false);
        setCopied(true);
        revertTimeoutRef.current = setTimeout(() => {
          setCopied(false);
        }, revertMs);
      } catch {
        setCopied(false);
        setError(true);
      }
    },
    [revertMs]
  );

  return { copy, copied, error };
}
