import { describe, expect, it } from "vitest";
import { parseForwardedIp } from "./parseForwardedIp";

/** Minimal Headers-like test double satisfying the module's HeaderReader shape. */
function headersFrom(map: Record<string, string>) {
  return {
    get(name: string) {
      const key = Object.keys(map).find(
        (k) => k.toLowerCase() === name.toLowerCase()
      );
      return key ? map[key] : null;
    },
  };
}

describe("parseForwardedIp", () => {
  it("returns the IP from a single-value x-forwarded-for header", () => {
    const headers = headersFrom({ "x-forwarded-for": "203.0.113.7" });
    expect(parseForwardedIp(headers)).toBe("203.0.113.7");
  });

  it("returns the left-most (platform-trusted) client entry from a multi-hop x-forwarded-for header, not the last appended one (T-03-01 anti-spoof)", () => {
    const headers = headersFrom({
      "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
    });
    expect(parseForwardedIp(headers)).toBe("203.0.113.7");
  });

  it("preserves an IPv6 value unchanged (D-06 single-family, no normalization)", () => {
    const headers = headersFrom({ "x-forwarded-for": "2001:db8::1" });
    expect(parseForwardedIp(headers)).toBe("2001:db8::1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = headersFrom({ "x-real-ip": "198.51.100.23" });
    expect(parseForwardedIp(headers)).toBe("198.51.100.23");
  });

  it("returns null when no forwarded-IP header is present at all", () => {
    const headers = headersFrom({});
    expect(parseForwardedIp(headers)).toBeNull();
  });

  it("returns null when the candidate is not a plausible IPv4/IPv6 literal (D-07 unavailable signal + anti-spoof validation)", () => {
    const headers = headersFrom({
      "x-forwarded-for": "<script>alert(1)</script>",
    });
    expect(parseForwardedIp(headers)).toBeNull();
  });

  it("returns null when x-real-ip fallback value is unparseable", () => {
    const headers = headersFrom({ "x-real-ip": "not-an-ip" });
    expect(parseForwardedIp(headers)).toBeNull();
  });

  it("trims surrounding whitespace from the selected candidate", () => {
    const headers = headersFrom({
      "x-forwarded-for": "  203.0.113.7  , 70.41.3.18",
    });
    expect(parseForwardedIp(headers)).toBe("203.0.113.7");
  });
});
