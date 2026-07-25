/**
 * Pure, network-free bit-level MAC classification (MAC-04, MAC-05, MAC-06,
 * MAC-07). Mirrors `lib/dns/parse.ts`'s "compute synchronously from
 * already-validated input" shape — a pure transform with no side effects.
 *
 * Live cross-checked against `maclookup.app`'s own independent `isRand`
 * field (05-RESEARCH.md D-10 Verification Results): 4 test vectors agree,
 * including the `01:00:5E` IPv4-multicast case, which proves the
 * randomization flag tracks the U/L bit alone — never the I/G bit.
 *
 * MUST NEVER read from a vendor-API response (05-RESEARCH.md Anti-Patterns,
 * Pitfall 2) — MAC-08 requires classification to keep working when the
 * vendor lookup fails entirely, so this function must be structurally
 * incapable of depending on `fetch` succeeding. No network, no async,
 * no import from anything vendor-related.
 */
import type { MacClassification } from "./types";

/**
 * Derives OUI, I/G (unicast/multicast), U/L (universally/locally
 * administered), and the randomization-likely hedge flag from the first 3
 * bytes of a parsed MAC. `bytes` is expected to already be a
 * successfully-parsed 6-byte tuple (see `lib/mac/parse.ts`), but this
 * function only ever reads `bytes[0..2]`.
 */
export function classifyMac(bytes: readonly number[]): MacClassification {
  const first = bytes[0];
  // I/G bit (bit 0 of byte[0]): 0 = unicast, 1 = multicast/broadcast.
  const isUnicast = (first & 0x01) === 0;
  // U/L bit (bit 1 of byte[0]): 0 = universally administered (IEEE-assigned
  // OUI), 1 = locally administered (software-set, e.g. privacy MACs).
  const isUniversallyAdministered = (first & 0x02) === 0;
  const ouiHex = bytes
    .slice(0, 3)
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join("");

  return {
    ouiHex,
    isUnicast,
    isUniversallyAdministered,
    // D-10: driven by the U/L bit alone, no secondary heuristic.
    randomizationLikely: !isUniversallyAdministered,
  };
}
