import { describe, expect, it } from "vitest";
import { isParseError, parseCidr } from "./parse";
import { ipv4ReverseZone, ipv6ReverseZone } from "./reverse-dns";

/** Parses a known-valid IPv4 CIDR for test setup; throws if parsing fails (a
 * test bug, not a case under test). Mirrors `lib/subnet/ipv4.test.ts`'s
 * `parseIpv4` helper convention. */
function parseIpv4Address(cidr: string): bigint {
  const result = parseCidr(cidr);
  if (isParseError(result) || result.family !== "ipv4") {
    throw new Error(`test setup failure: expected a valid IPv4 CIDR, got ${cidr}`);
  }
  return result.address;
}

/** Parses a known-valid IPv6 CIDR for test setup; throws if parsing fails (a
 * test bug, not a case under test). */
function parseIpv6Address(cidr: string): bigint {
  const result = parseCidr(cidr);
  if (isParseError(result) || result.family !== "ipv6") {
    throw new Error(`test setup failure: expected a valid IPv6 CIDR, got ${cidr}`);
  }
  return result.address;
}

describe("ipv4ReverseZone", () => {
  it("192.168.1.0/24 -> octet-aligned zone, aligned:true", () => {
    const result = ipv4ReverseZone(parseIpv4Address("192.168.1.0/24"), 24);
    expect(result.zone).toBe("1.168.192.in-addr.arpa.");
    expect(result.aligned).toBe(true);
  });

  it("192.168.16.0/20 -> truncated to floor(20/8)=2 octets, aligned:false (Pitfall 2 / Assumption A1)", () => {
    const result = ipv4ReverseZone(parseIpv4Address("192.168.16.0/20"), 20);
    expect(result.zone).toBe("168.192.in-addr.arpa.");
    expect(result.aligned).toBe(false);
  });

  it("0.0.0.0/0 -> zero covered octets does not produce a leading '.' (WR-01 regression)", () => {
    const result = ipv4ReverseZone(parseIpv4Address("0.0.0.0/0"), 0);
    expect(result.zone).toBe("in-addr.arpa.");
    expect(result.aligned).toBe(true);
  });

  it("10.0.0.0/4 -> floor(4/8)=0 covered octets does not produce a leading '.' (WR-01 regression)", () => {
    const result = ipv4ReverseZone(parseIpv4Address("10.0.0.0/4"), 4);
    expect(result.zone).toBe("in-addr.arpa.");
    expect(result.aligned).toBe(false);
  });
});

describe("ipv6ReverseZone", () => {
  it("2001:db8::/32 -> the well-known 8-nibble reversed zone, aligned:true (RFC 3596)", () => {
    const result = ipv6ReverseZone(parseIpv6Address("2001:db8::/32"), 32);
    expect(result.zone).toBe("8.b.d.0.1.0.0.2.ip6.arpa.");
    expect(result.aligned).toBe(true);
  });

  // NOTE: the plan's illustrative /52 example is internally inconsistent
  // with its own `aligned = (prefix % 4 === 0)` formula — 52 % 4 === 0, so
  // /52 IS nibble-aligned (floor(52/4)=13, aligned:true), not the
  // non-aligned case the plan's <behavior> text described. /54 is the
  // nearest prefix that keeps floor(prefix/4)=13 while genuinely being
  // non-nibble-aligned (54 % 4 === 2); see 03-02-SUMMARY.md deviations.
  it("2001:db8::/54 -> truncated to floor(54/4)=13 nibbles, aligned:false (Pitfall 2 / Assumption A1)", () => {
    const result = ipv6ReverseZone(parseIpv6Address("2001:db8::/54"), 54);
    expect(result.zone).toBe("0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa.");
    expect(result.aligned).toBe(false);
  });

  it("::/0 -> zero covered nibbles does not produce a leading '.' (WR-01 regression)", () => {
    const result = ipv6ReverseZone(parseIpv6Address("::/0"), 0);
    expect(result.zone).toBe("ip6.arpa.");
    expect(result.aligned).toBe(true);
  });

  it("2001:db8::/3 -> floor(3/4)=0 covered nibbles does not produce a leading '.' (WR-01 regression)", () => {
    const result = ipv6ReverseZone(parseIpv6Address("2001:db8::/3"), 3);
    expect(result.zone).toBe("ip6.arpa.");
    expect(result.aligned).toBe(false);
  });
});
