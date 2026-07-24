import { describe, expect, it } from "vitest";
import { isParseError, parseCidr } from "./parse";

describe("parseCidr", () => {
  it("parses a valid IPv4 CIDR, auto-detected by dot shape (SUBNET-01)", () => {
    const result = parseCidr("192.168.1.0/24");
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.family).toBe("ipv4");
      expect(result.prefixLength).toBe(24);
      expect(typeof result.address).toBe("bigint");
    }
  });

  it("parses a valid IPv6 CIDR, auto-detected by colon shape (SUBNET-01)", () => {
    const result = parseCidr("2001:db8::/32");
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.family).toBe("ipv6");
      expect(result.prefixLength).toBe(32);
      expect(typeof result.address).toBe("bigint");
    }
  });

  it("returns a ParseError for a bare address with no prefix (parse-ambiguity edge, SUBNET-01)", () => {
    const result = parseCidr("10.0.0.0");
    expect(isParseError(result)).toBe(true);
  });

  it.each([
    ["999.1.1.1/24", "out-of-range octet"],
    ["10.0.0.0/33", "prefix exceeds ipv4 max"],
    ["", "empty input"],
    ["garbage", "unparseable garbage"],
    ["01.0.0.0/8", "leading-zero octet"],
    ["10.0.0.0/24/1", "more than one slash"],
    ["2001:db8::/129", "prefix exceeds ipv6 max"],
    ["not:valid:ipv6::/64", "malformed ipv6 literal"],
  ])("returns a ParseError for %s (%s)", (input) => {
    const result = parseCidr(input);
    expect(isParseError(result)).toBe(true);
  });

  it.each([
    ["::ffff:192.168.1.1/128", "IPv4-mapped IPv6 literal (RFC 4291 §2.5.5)"],
    ["::1.2.3.4/128", "IPv4-compatible IPv6 literal (RFC 4291 §2.5.6)"],
  ])(
    "returns a ParseError for %s (%s) consistently, not a validator/parser disagreement (WR-02 regression)",
    (input) => {
      const result = parseCidr(input);
      expect(isParseError(result)).toBe(true);
    }
  );

  it("never throws for malformed or pathological input (total function contract)", () => {
    expect(() => parseCidr("::::::::::::")).not.toThrow();
    expect(() => parseCidr("a".repeat(5000))).not.toThrow();
    expect(() => parseCidr("/24")).not.toThrow();
  });

  it("returns byte-identical results for repeated calls with the same input (concurrency edge, SUBNET-04)", () => {
    const first = parseCidr("192.168.1.0/24");
    const second = parseCidr("192.168.1.0/24");
    expect(first).toEqual(second);
  });
});

describe("isParseError", () => {
  it("narrows a ParseError result", () => {
    const result = parseCidr("garbage");
    if (isParseError(result)) {
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    } else {
      throw new Error("expected a ParseError");
    }
  });
});
