import type { ParsedCidr } from "./parse";

/**
 * IPv4 CIDR breakdown math (SUBNET-04, D-03, D-04). BigInt end-to-end per
 * RESEARCH.md Pattern 3 — no numeric-type coercion of any address/mask
 * value, so 32-bit overflow/sign issues from JS's native 32-bit-signed bitwise
 * operators (RESEARCH.md Pitfall 4) never enter this module. Framework-
 * agnostic (no React/Next import), mirroring `lib/uuid/generate.ts`'s
 * total-function, never-throw-for-well-typed-input contract.
 */

const IPV4_BIT_WIDTH = 32n;
const IPV4_ALL_ONES = (1n << IPV4_BIT_WIDTH) - 1n;

export type Ipv4Result = {
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  /** Decimal string (BigInt.toString) so 128-bit IPv6 siblings can share
   * this shape later without a numeric-precision risk. */
  usableHostCount: string;
  subnetMask: string;
  wildcardMask: string;
  /** Dot-separated 8-bit groups of the network address (Assumption A3),
   * e.g. "11000000.10101000.00000001.00000000". */
  binary: string;
  prefixLength: number;
  /** Non-null only for /31 and /32 (D-04 boundary prefixes) — a real
   * explanatory note, never a hidden/omitted field. */
  boundaryNote: string | null;
};

function maskFor(prefixLength: bigint): bigint {
  const hostBits = IPV4_BIT_WIDTH - prefixLength;
  return hostBits === 0n ? IPV4_ALL_ONES : IPV4_ALL_ONES ^ ((1n << hostBits) - 1n);
}

function networkAddress(address: bigint, mask: bigint): bigint {
  return address & mask;
}

function broadcastAddress(address: bigint, mask: bigint): bigint {
  return address | (mask ^ IPV4_ALL_ONES);
}

function toDottedDecimal(address: bigint): string {
  const octets: string[] = [];
  for (let shift = 24n; shift >= 0n; shift -= 8n) {
    octets.push(((address >> shift) & 0xffn).toString());
  }
  return octets.join(".");
}

function toDottedBinary(address: bigint): string {
  const groups: string[] = [];
  for (let shift = 24n; shift >= 0n; shift -= 8n) {
    const octet = (address >> shift) & 0xffn;
    groups.push(octet.toString(2).padStart(8, "0"));
  }
  return groups.join(".");
}

/**
 * Computes the full IPv4 field set for a parsed CIDR (SUBNET-04). Branches
 * host-count/usable-range logic explicitly on `32 - prefixLength`
 * (RESEARCH.md Pitfall 3 / D-04): >=2 host bits uses the ordinary "-2"
 * usable-range formula; exactly 1 (`/31`) treats both addresses as usable
 * (RFC 3021); exactly 0 (`/32`) collapses network/broadcast/first/last to
 * the single address. Every branch returns real values plus a `note` —
 * never `null`/`"N/A"` fields (D-04).
 *
 * Pure and total: never throws, never mutates `parsed`, and returns
 * byte-identical results for repeated/interleaved calls with the same input
 * (SUBNET-04 concurrency edge) — no shared mutable state.
 */
export function computeIpv4(parsed: ParsedCidr): Ipv4Result {
  const prefixLength = BigInt(parsed.prefixLength);
  const mask = maskFor(prefixLength);
  const network = networkAddress(parsed.address, mask);
  const broadcast = broadcastAddress(network, mask);
  const wildcard = mask ^ IPV4_ALL_ONES;
  const hostBits = IPV4_BIT_WIDTH - prefixLength;

  let firstHost: bigint;
  let lastHost: bigint;
  let usableHostCount: bigint;
  let boundaryNote: string | null;

  if (hostBits >= 2n) {
    firstHost = network + 1n;
    lastHost = broadcast - 1n;
    usableHostCount = (1n << hostBits) - 2n;
    boundaryNote = null;
  } else if (hostBits === 1n) {
    firstHost = network;
    lastHost = broadcast;
    usableHostCount = 2n;
    boundaryNote =
      "Both addresses are usable — /31 point-to-point links have no broadcast address (RFC 3021).";
  } else {
    firstHost = network;
    lastHost = network;
    usableHostCount = 1n;
    boundaryNote =
      "Single address — network, broadcast, first, and last host are all the same address.";
  }

  return {
    network: toDottedDecimal(network),
    broadcast: toDottedDecimal(broadcast),
    firstHost: toDottedDecimal(firstHost),
    lastHost: toDottedDecimal(lastHost),
    usableHostCount: usableHostCount.toString(),
    subnetMask: toDottedDecimal(mask),
    wildcardMask: toDottedDecimal(wildcard),
    binary: toDottedBinary(network),
    prefixLength: parsed.prefixLength,
    boundaryNote,
  };
}
