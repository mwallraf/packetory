/**
 * RFC 5952 canonical IPv6 text representation (SUBNET-05, D-03). Imports no
 * UI framework code — framework-agnostic and independently testable,
 * mirroring `lib/uuid/format.ts`'s pure-reformat module contract. This
 * module NEVER calls `Number()` on an address value (RESEARCH.md Pitfall
 * 4) — every group is extracted from the 128-bit `bigint` via `BigInt`
 * shifts/masks.
 *
 * Both `compressIpv6` and `expandIpv6` are total (never throw for any
 * 128-bit `bigint`) and are lossless: reparsing either output reproduces
 * the exact same address (proven by `format.test.ts`'s round-trip
 * assertions, including a fast-check property test over the full 128-bit
 * range).
 */

const IPV6_GROUP_COUNT = 8n;
const IPV6_GROUP_BITS = 16n;

/** Splits a 128-bit address into its eight 16-bit groups (MSB group first),
 * each returned as a `number` (0-0xffff fits safely in a JS number — only
 * the 128-bit address itself must stay `bigint`, RESEARCH.md Pitfall 4). */
function toGroups(address: bigint): number[] {
  const groups: number[] = [];
  for (let i = 0n; i < IPV6_GROUP_COUNT; i++) {
    const shift = (IPV6_GROUP_COUNT - 1n - i) * IPV6_GROUP_BITS;
    groups.push(Number((address >> shift) & 0xffffn));
  }
  return groups;
}

/**
 * Compresses a 128-bit IPv6 address into its RFC 5952 canonical text form:
 * lowercase hex, leading zeros suppressed per group, and the single LONGEST
 * run of 2+ all-zero groups replaced by `::` (a lone single-zero group
 * stays `0`, never `::`, per RFC 5952 §4.2.2).
 */
export function compressIpv6(address: bigint): string {
  const groups = toGroups(address);

  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;
  groups.forEach((group, i) => {
    if (group === 0) {
      if (curStart === -1) curStart = i;
      curLen++;
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  });

  if (bestLen < 2) {
    // No run of 2+ zero groups -> no "::" per RFC 5952 (a lone "0000" group
    // stays "0", not "::").
    return groups.map((group) => group.toString(16)).join(":");
  }

  const before = groups.slice(0, bestStart).map((group) => group.toString(16));
  const after = groups.slice(bestStart + bestLen).map((group) => group.toString(16));
  return `${before.join(":")}::${after.join(":")}`;
}

/**
 * Expands a 128-bit IPv6 address into its full 8-group colon-separated form
 * (leading zeros suppressed per group, but `::` is never used).
 */
export function expandIpv6(address: bigint): string {
  return toGroups(address)
    .map((group) => group.toString(16))
    .join(":");
}
