import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { isParseError, parseCidr } from "./parse";
import { compressIpv6, expandIpv6 } from "./format";

/** Parses a known-valid IPv6 literal (via the already-tested `parseCidr`, a
 * `/128` suffix is only a vehicle to reuse the existing address parser) into
 * a bigint for test setup; throws if parsing fails (a test bug, not a case
 * under test) so failures are loud, not silent. Mirrors `lib/subnet/
 * ipv4.test.ts`'s `parseIpv4` helper convention. */
function parseIpv6Literal(address: string): bigint {
  const result = parseCidr(`${address}/128`);
  if (isParseError(result) || result.family !== "ipv6") {
    throw new Error(`test setup failure: expected a valid IPv6 literal, got ${address}`);
  }
  return result.address;
}

describe("compressIpv6", () => {
  it("compresses the longest run of 2+ zero groups to '::' (RFC 5952)", () => {
    const address = parseIpv6Literal("2001:0db8:0000:0000:0000:0000:0000:0001");
    expect(compressIpv6(address)).toBe("2001:db8::1");
  });

  it("renders a lone single zero group as '0', not '::' (RFC 5952)", () => {
    const address = parseIpv6Literal("2001:0db8:0000:0001:0001:0001:0001:0001");
    expect(compressIpv6(address)).toBe("2001:db8:0:1:1:1:1:1");
  });

  it("compresses the longest zero run even when it isn't the first run (RFC 5952)", () => {
    // groups: 2001, 0, 0, 1, 0, 0, 0, 1 — first run is 2 zero groups (index
    // 1-2), second run is 3 zero groups (index 4-6); RFC 5952 requires the
    // LONGER run be compressed, not the first-encountered one.
    const address = parseIpv6Literal("2001:0000:0000:0001:0000:0000:0000:0001");
    expect(compressIpv6(address)).toBe("2001:0:0:1::1");
  });

  it("lowercases hex characters (RFC 5952)", () => {
    const address = parseIpv6Literal("2001:0DB8:0000:0000:0000:0000:0000:0001");
    expect(compressIpv6(address)).toBe(compressIpv6(address).toLowerCase());
  });
});

describe("expandIpv6", () => {
  it("renders all 8 groups colon-separated with leading zeros suppressed, never using '::'", () => {
    const address = parseIpv6Literal("2001:0db8:0000:0000:0000:0000:0000:0001");
    const expanded = expandIpv6(address);
    expect(expanded).toBe("2001:db8:0:0:0:0:0:1");
    expect(expanded).not.toContain("::");
    expect(expanded.split(":")).toHaveLength(8);
  });
});

describe("compressIpv6 / expandIpv6 round-trip", () => {
  it("both compressed and expanded forms reparse to the exact same address bigint (round-trip identity)", () => {
    const original = parseIpv6Literal("2001:0db8:0000:0000:0000:0000:0000:0001");
    const compressed = compressIpv6(original);
    const expanded = expandIpv6(original);
    expect(parseIpv6Literal(compressed)).toBe(original);
    expect(parseIpv6Literal(expanded)).toBe(original);
  });

  fcIt.prop([fc.bigInt({ min: 0n, max: (1n << 128n) - 1n })])(
    "every 128-bit address round-trips through compress and expand unchanged (property, RFC 5952)",
    (address) => {
      const compressed = compressIpv6(address);
      const expanded = expandIpv6(address);
      expect(parseIpv6Literal(compressed)).toBe(address);
      expect(parseIpv6Literal(expanded)).toBe(address);
    }
  );
});
