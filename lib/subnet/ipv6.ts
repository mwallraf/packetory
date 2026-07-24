import type { ParsedCidr } from "./parse";
import { compressIpv6, expandIpv6 } from "./format";

/**
 * IPv6 CIDR breakdown math (SUBNET-05, D-03, D-04). 128-bit BigInt end-to-end
 * per RESEARCH.md Pattern 3 — mirrors `lib/subnet/ipv4.ts`'s mask-arithmetic
 * shape at 128 bits instead of 32. Imports no UI framework code
 * (framework-agnostic), and reuses `compressIpv6`/`expandIpv6`
 * (`lib/subnet/format.ts`, built in 03-02) for the RFC 5952 notation fields
 * rather than duplicating group-extraction logic.
 *
 * Unlike `computeIpv4`'s `usableHostCount` (which subtracts the
 * network/broadcast reserved addresses for the ordinary case), `addressCount`
 * here is the TOTAL address count for the block (SUBNET-05's "address
 * count" field). That total is exactly `2^(128 - prefixLength)` for every
 * prefix 0-128 with no further adjustment, including /127 and /128
 * (RESEARCH.md Pitfall 3): the boundary branch below only decides which
 * explanatory `boundaryNote` to attach — the numeric value and the
 * first/last-address formula both already fall out correctly from the
 * general network/inverted-mask arithmetic at those prefixes, so no
 * special-cased VALUE formula is needed.
 */

const IPV6_BIT_WIDTH = 128n;
const IPV6_ALL_ONES = (1n << IPV6_BIT_WIDTH) - 1n;

export type Ipv6Result = {
  /** Canonical compressed network address plus `/prefix`, e.g. "2001:db8::/32". */
  normalizedPrefix: string;
  /** RFC 5952 compressed form of the network address. */
  compressed: string;
  /** Full 8-group expanded form of the network address (never uses "::"). */
  expanded: string;
  /** First address in the block, RFC 5952 compressed form. */
  firstAddress: string;
  /** Last address in the block, RFC 5952 compressed form. */
  lastAddress: string;
  /** Decimal string (BigInt.toString) — the total address count for the
   * block, not a "usable" count (IPv6 has no network/broadcast reservation
   * convention analogous to IPv4's). */
  addressCount: string;
  prefixLength: number;
  /** Non-null only for /127 and /128 (D-04 boundary prefixes) — a real
   * explanatory note, never a hidden/omitted field. */
  boundaryNote: string | null;
};

function maskFor(prefixLength: bigint): bigint {
  const hostBits = IPV6_BIT_WIDTH - prefixLength;
  return hostBits === 0n ? IPV6_ALL_ONES : IPV6_ALL_ONES ^ ((1n << hostBits) - 1n);
}

function networkAddress(address: bigint, mask: bigint): bigint {
  return address & mask;
}

function lastAddressOf(network: bigint, mask: bigint): bigint {
  return network | (mask ^ IPV6_ALL_ONES);
}

/**
 * Computes the full IPv6 field set for a parsed CIDR (SUBNET-05). The
 * network (first) address and the OR-with-inverted-mask "last" address use
 * the same general 128-bit mask arithmetic at every prefix — /127 and /128
 * need no special-cased VALUE formula (RESEARCH.md Pitfall 3's branch here
 * only selects the explanatory note). Every branch returns real values plus
 * a `boundaryNote` — never `null`/`"N/A"` fields (D-04).
 *
 * Pure and total: never throws, never mutates `parsed`, and returns
 * byte-identical results for repeated/interleaved calls with the same input
 * (SUBNET-05 concurrency edge) — no shared mutable state.
 */
export function computeIpv6(parsed: ParsedCidr): Ipv6Result {
  const prefixLength = BigInt(parsed.prefixLength);
  const mask = maskFor(prefixLength);
  const network = networkAddress(parsed.address, mask);
  const last = lastAddressOf(network, mask);
  const hostBits = IPV6_BIT_WIDTH - prefixLength;
  const addressCount = 1n << hostBits;

  let boundaryNote: string | null;
  if (hostBits >= 2n) {
    boundaryNote = null;
  } else if (hostBits === 1n) {
    boundaryNote =
      "Both addresses are usable — /127 point-to-point links follow the same no-broadcast convention as IPv4 /31.";
  } else {
    boundaryNote = "Single address — first and last address are the same address.";
  }

  const compressed = compressIpv6(network);

  return {
    normalizedPrefix: `${compressed}/${parsed.prefixLength}`,
    compressed,
    expanded: expandIpv6(network),
    firstAddress: compressed,
    lastAddress: compressIpv6(last),
    addressCount: addressCount.toString(),
    prefixLength: parsed.prefixLength,
    boundaryNote,
  };
}
