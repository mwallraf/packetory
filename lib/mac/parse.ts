/**
 * Total-function, never-throws MAC address input parser (MAC-01, D-04).
 * Mirrors `lib/dns/validate.ts`'s total-function contract, but needs NO
 * bounded/backtracking-safe regex (05-RESEARCH.md Pitfall 4) — a MAC
 * address is fixed-length with no nested-quantifier risk at all, so a
 * single global character-class strip followed by a plain length check is
 * already maximally safe against ReDoS (T-05-04, accepted-risk in the
 * threat register).
 *
 * Deliberately does NOT branch per separator style (05-RESEARCH.md
 * Pitfall 1) — Cisco dot-notation groups 4 hex digits per segment, which
 * does not align to byte boundaries the way colon/dash grouping does, so
 * per-format positional parsing would need special-cased logic for no
 * benefit. Every separator style — and any messy pasted noise, e.g. stray
 * whitespace or a trailing interface name copied from ifconfig/ipconfig
 * output — reduces to the same question: are there exactly 12 hex digits
 * in here?
 */
import type { ParsedMac } from "./types";

/** Single global character-class replace — no backtracking possible
 * (05-RESEARCH.md Pitfall 4). Declared as a module constant per
 * `lib/dns/validate.ts`'s convention. */
const HEX_ONLY_RE = /[^0-9A-Fa-f]/g;

/**
 * Strips every non-hex character from `raw`, then requires exactly 12 hex
 * characters remain. Never throws for any string input, however
 * pathological. Accepts colon, dash, Cisco-dot, no-separator, and messy
 * mixed/noisy input alike — separator style carries no information once
 * the 12 hex digits are recovered.
 */
export function parseMacInput(raw: string): ParsedMac {
  const hex = raw.replace(HEX_ONLY_RE, "");
  if (hex.length !== 12) return { valid: false };

  const bytes: number[] = [];
  for (let i = 0; i < 12; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return {
    valid: true,
    bytes: bytes as [number, number, number, number, number, number],
  };
}
