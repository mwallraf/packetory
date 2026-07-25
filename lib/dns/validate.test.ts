import { describe, expect, it } from "vitest";
import { isValidDomainInput, MAX_DOMAIN_LENGTH } from "./validate";

describe("isValidDomainInput", () => {
  it("accepts a simple domain (DNS-01 demo domain shape)", () => {
    expect(isValidDomainInput("cloudflare.com")).toBe(true);
  });

  it("accepts a multi-label domain", () => {
    expect(isValidDomainInput("example.co.uk")).toBe(true);
  });

  it("accepts a domain with one trailing dot (absolute FQDN notation)", () => {
    expect(isValidDomainInput("cloudflare.com.")).toBe(true);
  });

  it("accepts a 253-char valid domain (QUAL-08 boundary)", () => {
    // Three max-length (63-char) labels + dots + a final label sized to
    // land exactly on 253 total, every label staying within the 63-char
    // per-label ceiling.
    const label63 = "a".repeat(63);
    const lastLabelLength = MAX_DOMAIN_LENGTH - 3 * (63 + 1);
    const domain = `${label63}.${label63}.${label63}.${"b".repeat(
      lastLabelLength
    )}`;
    expect(domain.length).toBe(MAX_DOMAIN_LENGTH);
    expect(isValidDomainInput(domain)).toBe(true);
  });

  it("rejects a 254-char domain (QUAL-08 boundary, MAX_DOMAIN_LENGTH=253)", () => {
    const label63 = "a".repeat(63);
    const lastLabelLength = MAX_DOMAIN_LENGTH - 3 * (63 + 1) + 1;
    const domain = `${label63}.${label63}.${label63}.${"b".repeat(
      lastLabelLength
    )}`;
    expect(domain.length).toBe(MAX_DOMAIN_LENGTH + 1);
    expect(isValidDomainInput(domain)).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidDomainInput("")).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    expect(isValidDomainInput("   ")).toBe(false);
  });

  it("rejects a label longer than 63 characters", () => {
    const domain = `${"a".repeat(64)}.com`;
    expect(isValidDomainInput(domain)).toBe(false);
  });

  it("rejects a label with a leading hyphen", () => {
    expect(isValidDomainInput("-cloudflare.com")).toBe(false);
  });

  it("rejects a label with a trailing hyphen", () => {
    expect(isValidDomainInput("cloudflare-.com")).toBe(false);
  });

  it.each([
    ["not a domain at all!!"],
    ["<script>alert(1)</script>"],
    ["a".repeat(10000)],
    ["...."],
    ["\n\t"],
    [".".repeat(300)],
  ])("never throws for pathological input: %s", (input) => {
    expect(() => isValidDomainInput(input)).not.toThrow();
  });
});
