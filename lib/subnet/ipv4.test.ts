import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { isParseError, parseCidr, type ParsedCidr } from "./parse";
import { computeIpv4 } from "./ipv4";

/** Parses a known-valid IPv4 CIDR for test setup; throws if parsing fails
 * (a test bug, not a case under test) so failures are loud, not silent. */
function parseIpv4(cidr: string): ParsedCidr {
  const result = parseCidr(cidr);
  if (isParseError(result) || result.family !== "ipv4") {
    throw new Error(`test setup failure: expected a valid IPv4 CIDR, got ${cidr}`);
  }
  return result;
}

describe("computeIpv4", () => {
  it("192.168.1.0/24 -> full core field set (SUBNET-04)", () => {
    const result = computeIpv4(parseIpv4("192.168.1.0/24"));
    expect(result.network).toBe("192.168.1.0");
    expect(result.broadcast).toBe("192.168.1.255");
    expect(result.firstHost).toBe("192.168.1.1");
    expect(result.lastHost).toBe("192.168.1.254");
    expect(result.usableHostCount).toBe("254");
    expect(result.subnetMask).toBe("255.255.255.0");
    expect(result.wildcardMask).toBe("0.0.0.255");
    expect(result.binary).toBe("11000000.10101000.00000001.00000000");
    expect(result.boundaryNote).toBeNull();
  });

  it("10.0.0.1/31 -> both addresses usable, count 2, RFC 3021 boundary note (D-04)", () => {
    const result = computeIpv4(parseIpv4("10.0.0.1/31"));
    expect(result.usableHostCount).toBe("2");
    expect(result.boundaryNote).not.toBeNull();
    expect(result.firstHost).not.toBe(result.lastHost);
  });

  it("10.0.0.5/32 -> single address, network=broadcast=first=last, count 1 (D-04)", () => {
    const result = computeIpv4(parseIpv4("10.0.0.5/32"));
    expect(result.usableHostCount).toBe("1");
    expect(result.boundaryNote).not.toBeNull();
    expect(result.network).toBe(result.broadcast);
    expect(result.network).toBe(result.firstHost);
    expect(result.network).toBe(result.lastHost);
  });

  it("is a pure function: repeated calls with the same input yield byte-identical results (concurrency edge)", () => {
    const parsed = parseIpv4("172.16.0.0/20");
    const first = computeIpv4(parsed);
    const second = computeIpv4(parsed);
    expect(first).toEqual(second);
  });

  fcIt.prop([fc.integer({ min: 0, max: 32 }), fc.integer({ min: 0, max: 4294967295 })])(
    "usable host count matches the exact 2^(32-prefix) formula with boundary adjustment, for every prefix 0-32 (property, SUBNET-04 precision edge)",
    (prefixLength, addressAsNumber) => {
      const parsed: ParsedCidr = {
        family: "ipv4",
        address: BigInt(addressAsNumber),
        prefixLength,
      };
      const result = computeIpv4(parsed);
      const hostBits = 32 - prefixLength;

      let expected: bigint;
      if (hostBits >= 2) {
        expected = (1n << BigInt(hostBits)) - 2n;
      } else if (hostBits === 1) {
        expected = 2n;
      } else {
        expected = 1n;
      }

      expect(result.usableHostCount).toBe(expected.toString());
      expect(Number.isNaN(Number(result.usableHostCount))).toBe(false);
    }
  );

  fcIt.prop([fc.integer({ min: 0, max: 32 }), fc.integer({ min: 0, max: 4294967295 })])(
    "network address is always <= broadcast address (property)",
    (prefixLength, addressAsNumber) => {
      const parsed: ParsedCidr = {
        family: "ipv4",
        address: BigInt(addressAsNumber),
        prefixLength,
      };
      const result = computeIpv4(parsed);
      const toBigInt = (dotted: string) =>
        dotted
          .split(".")
          .reduce((acc, octet) => (acc << 8n) | BigInt(octet), 0n);
      expect(toBigInt(result.network) <= toBigInt(result.broadcast)).toBe(true);
    }
  );
});
