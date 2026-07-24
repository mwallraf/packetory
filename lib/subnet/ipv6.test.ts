import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { isParseError, parseCidr, type ParsedCidr } from "./parse";
import { computeIpv6 } from "./ipv6";

/** Parses a known-valid IPv6 CIDR for test setup; throws if parsing fails (a
 * test bug, not a case under test) so failures are loud, not silent. Mirrors
 * `lib/subnet/ipv4.test.ts`'s `parseIpv4` helper convention. */
function parseIpv6(cidr: string): ParsedCidr {
  const result = parseCidr(cidr);
  if (isParseError(result) || result.family !== "ipv6") {
    throw new Error(`test setup failure: expected a valid IPv6 CIDR, got ${cidr}`);
  }
  return result;
}

describe("computeIpv6", () => {
  it("2001:db8::/32 -> full core field set (SUBNET-05)", () => {
    const result = computeIpv6(parseIpv6("2001:db8::/32"));
    expect(result.compressed).toBe("2001:db8::");
    expect(result.expanded).toBe("2001:db8:0:0:0:0:0:0");
    expect(result.expanded).not.toContain("::");
    expect(result.expanded.split(":")).toHaveLength(8);
    expect(result.firstAddress).toBe("2001:db8::");
    expect(result.lastAddress).toBe(
      "2001:db8:ffff:ffff:ffff:ffff:ffff:ffff"
    );
    expect(result.addressCount).toBe("79228162514264337593543950336");
    expect(result.normalizedPrefix).toBe("2001:db8::/32");
    expect(result.boundaryNote).toBeNull();
  });

  it("2001:db8::1/127 -> both addresses usable, count 2, boundary note (D-04)", () => {
    const result = computeIpv6(parseIpv6("2001:db8::1/127"));
    expect(result.addressCount).toBe("2");
    expect(result.boundaryNote).not.toBeNull();
    expect(result.firstAddress).not.toBe(result.lastAddress);
  });

  it("2001:db8::5/128 -> single address, first==last, count 1, boundary note (D-04)", () => {
    const result = computeIpv6(parseIpv6("2001:db8::5/128"));
    expect(result.addressCount).toBe("1");
    expect(result.boundaryNote).not.toBeNull();
    expect(result.firstAddress).toBe(result.lastAddress);
  });

  it("is a pure function: repeated calls with the same input yield byte-identical results (concurrency edge)", () => {
    const parsed = parseIpv6("2001:db8:abcd::/48");
    const first = computeIpv6(parsed);
    const second = computeIpv6(parsed);
    expect(first).toEqual(second);
  });

  fcIt.prop([
    fc.integer({ min: 0, max: 128 }),
    fc.bigInt({ min: 0n, max: (1n << 128n) - 1n }),
  ])(
    "address count matches the exact 2^(128-prefix) formula for every prefix 0-128, with the /127 and /128 boundaries falling out of the same formula (property, SUBNET-05 precision edge)",
    (prefixLength, address) => {
      const parsed: ParsedCidr = {
        family: "ipv6",
        address,
        prefixLength,
      };
      const result = computeIpv6(parsed);
      const expected = 2n ** BigInt(128 - prefixLength);

      expect(result.addressCount).toBe(expected.toString());
      if (prefixLength === 127) {
        expect(result.addressCount).toBe("2");
        expect(result.boundaryNote).not.toBeNull();
      }
      if (prefixLength === 128) {
        expect(result.addressCount).toBe("1");
        expect(result.boundaryNote).not.toBeNull();
        expect(result.firstAddress).toBe(result.lastAddress);
      }
    }
  );
});
