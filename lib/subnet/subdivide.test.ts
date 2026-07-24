import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { subdivisionOptions } from "./subdivide";
import type { ParsedCidr } from "./parse";

/** Minimal `ParsedCidr` builder — `address` is irrelevant to
 * `subdivisionOptions` (it only inspects `family`/`prefixLength`), so a
 * fixed placeholder value is used throughout (mirrors `ipv4.test.ts`'s
 * bounded-output test style). */
function cidr(family: ParsedCidr["family"], prefixLength: number): ParsedCidr {
  return { family, address: 0n, prefixLength };
}

describe("subdivisionOptions", () => {
  it("a /32 IPv6 prefix returns the full standard next-step list (RFC 6177 /56-/64)", () => {
    expect(subdivisionOptions(cidr("ipv6", 32))).toEqual([48, 56, 64]);
  });

  it("a /48 IPv6 prefix returns [56, 64]", () => {
    expect(subdivisionOptions(cidr("ipv6", 48))).toEqual([56, 64]);
  });

  it("a /56 IPv6 prefix returns [64]", () => {
    expect(subdivisionOptions(cidr("ipv6", 56))).toEqual([64]);
  });

  it("a /64 IPv6 prefix (already the universal building block) returns []", () => {
    expect(subdivisionOptions(cidr("ipv6", 64))).toEqual([]);
  });

  it("a /100 IPv6 prefix (narrower than /64) returns []", () => {
    expect(subdivisionOptions(cidr("ipv6", 100))).toEqual([]);
  });

  it("any IPv4 ParsedCidr returns [], regardless of prefix length", () => {
    expect(subdivisionOptions(cidr("ipv4", 8))).toEqual([]);
    expect(subdivisionOptions(cidr("ipv4", 24))).toEqual([]);
    expect(subdivisionOptions(cidr("ipv4", 32))).toEqual([]);
  });

  // Bounded-output invariant (RESEARCH.md Anti-Pattern: never enumerate all
  // children of a wide prefix) — every returned list is short (<= 3) and
  // every value is strictly greater than the input prefix and <= 64, for
  // ANY family/prefix combination, not just the illustrative cases above.
  fcIt.prop([
    fc.constantFrom("ipv4" as const, "ipv6" as const),
    fc.integer({ min: 0, max: 128 }),
  ])(
    "every returned list has length <= 3 and every value is in (prefix, 64] (property)",
    (family, prefixLength) => {
      const options = subdivisionOptions(cidr(family, prefixLength));
      expect(options.length).toBeLessThanOrEqual(3);
      for (const option of options) {
        expect(option).toBeGreaterThan(prefixLength);
        expect(option).toBeLessThanOrEqual(64);
      }
    }
  );
});
