/**
 * Reverse-DNS zone name construction for both address families (SUBNET-04's
 * 8th IPv4 field; the same IPv6 path is first consumed by the IPv6 grid in
 * a later plan). Imports no UI framework code — framework-agnostic,
 * mirroring `lib/uuid/format.ts`'s pure-derivation shape. Both functions
 * are total (never throw) and never call `Number()` on the address
 * `bigint` (RESEARCH.md Pitfall 4) — every octet/nibble is extracted via
 * `BigInt` shifts/masks.
 *
 * Callers pass the already-computed NETWORK address (not the raw parsed
 * address) — this module does no masking of its own, matching how
 * `SubnetTool.tsx` calls it with `computeIpv4`'s `network` field.
 *
 * RFC-clean reverse-DNS zone names only exist at octet (IPv4, 8-bit) or
 * nibble (IPv6, 4-bit) prefix boundaries. Per RESEARCH.md Pitfall 2 /
 * Assumption A1 (a flagged planner assumption, not a locked user decision —
 * see 03-02-PLAN.md's "Surfaced assumption" section), a non-aligned prefix
 * truncates to the nearest FULLY-COVERED boundary — `floor(prefixLength/8)`
 * octets for IPv4, `floor(prefixLength/4)` nibbles for IPv6 — and the
 * returned `aligned` flag tells the caller whether to attach the
 * not-exactly-aligned note. A full RFC 2317 classless-delegation name is
 * deliberately NOT built this phase.
 */

export type ReverseZoneResult = {
  zone: string;
  aligned: boolean;
};

const IPV4_OCTET_COUNT = 4n;
const IPV6_NIBBLE_COUNT = 32n;
const IPV6_NIBBLE_COUNT_NUMBER = 32;

/**
 * Builds the IPv4 `in-addr.arpa.` reverse-DNS zone name: reverses the
 * network octets and truncates to `floor(prefixLength / 8)` octets.
 * `aligned` is `true` only when `prefixLength` lands exactly on an 8-bit
 * octet boundary.
 */
export function ipv4ReverseZone(
  address: bigint,
  prefixLength: number
): ReverseZoneResult {
  const octets: string[] = [];
  for (let i = 0n; i < IPV4_OCTET_COUNT; i++) {
    const shift = (IPV4_OCTET_COUNT - 1n - i) * 8n;
    octets.push(((address >> shift) & 0xffn).toString());
  }

  const coveredOctets = Math.floor(prefixLength / 8);
  const aligned = prefixLength % 8 === 0;
  const zoneLabels = octets.slice(0, coveredOctets).reverse();

  return { zone: `${zoneLabels.join(".")}.in-addr.arpa.`, aligned };
}

/**
 * Builds the IPv6 `ip6.arpa.` reverse-DNS zone name per RFC 3596: the
 * nibble sequence is reversed, low-order nibble first, then truncated to
 * `floor(prefixLength / 4)` nibbles. `aligned` is `true` only when
 * `prefixLength` lands exactly on a 4-bit nibble boundary.
 */
export function ipv6ReverseZone(
  address: bigint,
  prefixLength: number
): ReverseZoneResult {
  const fullNibbles: string[] = [];
  for (let i = 0n; i < IPV6_NIBBLE_COUNT; i++) {
    const shift = i * 4n;
    const nibble = (address >> shift) & 0xfn;
    fullNibbles.push(nibble.toString(16));
  }
  // fullNibbles[0] is already the LOWEST-order nibble (RFC 3596's "low-order
  // nibble first" reversed ordering) because of how the shift above walks
  // from the least-significant bits upward.

  const coveredNibbles = Math.floor(prefixLength / 4);
  const aligned = prefixLength % 4 === 0;
  const zoneLabels = fullNibbles.slice(IPV6_NIBBLE_COUNT_NUMBER - coveredNibbles);

  return { zone: `${zoneLabels.join(".")}.ip6.arpa.`, aligned };
}
