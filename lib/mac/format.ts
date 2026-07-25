/**
 * Pure, framework-agnostic MAC address formatter (MAC-02, D-05). Produces
 * all 4 simultaneous normalized format variants from an already-parsed
 * byte tuple — mirrors `lib/dns/parse.ts`'s "compute synchronously from
 * already-validated input" shape. Imports no UI framework code.
 */
import type { MacFormats } from "./types";

/** Uppercase, zero-padded 2-hex-digit strings, one per byte — internal
 * helper shared by all 4 output variants below. */
function toHexPairs(bytes: readonly number[]): string[] {
  return bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0"));
}

/**
 * Builds colon/dash/dot(Cisco)/no-separator variants from a 6-byte MAC.
 * The Cisco dot form groups the flattened 12-hex-digit string into three
 * 4-hex-digit segments — these segment boundaries do NOT align to byte
 * boundaries (05-RESEARCH.md Pitfall 1), which is why `dot` is derived from
 * the flattened string rather than from `pairs` directly.
 */
export function formatMac(bytes: readonly number[]): MacFormats {
  const pairs = toHexPairs(bytes);
  const flat = pairs.join("");
  return {
    colon: pairs.join(":"),
    dash: pairs.join("-"),
    dot: `${flat.slice(0, 4)}.${flat.slice(4, 8)}.${flat.slice(8, 12)}`,
    none: flat,
  };
}
