import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { classifyMac } from "./classify";

/**
 * Test vectors are the exact live-verified vectors from 05-RESEARCH.md's
 * D-10 Verification Results — cross-checked against maclookup.app's own
 * independent `isRand` field (MAC-04, MAC-05, MAC-06, MAC-07).
 */
describe("classifyMac", () => {
  it("classifies a universally-administered unicast address (byte0=0x00)", () => {
    const result = classifyMac([0x00, 0x1a, 0x2b, 0x00, 0x00, 0x00]);

    expect(result.ouiHex).toBe("001A2B");
    expect(result.isUnicast).toBe(true);
    expect(result.isUniversallyAdministered).toBe(true);
    expect(result.randomizationLikely).toBe(false);
  });

  it("classifies the canonical locally-administered address (byte0=0x02)", () => {
    const result = classifyMac([0x02, 0x00, 0x00, 0x00, 0x00, 0x00]);

    expect(result.ouiHex).toBe("020000");
    expect(result.isUnicast).toBe(true);
    expect(result.isUniversallyAdministered).toBe(false);
    expect(result.randomizationLikely).toBe(true);
  });

  it("classifies the broadcast address as locally-administered multicast (byte0=0xFF)", () => {
    const result = classifyMac([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);

    expect(result.ouiHex).toBe("FFFFFF");
    expect(result.isUnicast).toBe(false);
    expect(result.isUniversallyAdministered).toBe(false);
    expect(result.randomizationLikely).toBe(true);
  });

  it("classifies the IPv4-multicast MAC as universally-administered, NOT randomized (I/G=1 but U/L=0, byte0=0x01) — proves the flag tracks U/L, not I/G (D-10)", () => {
    const result = classifyMac([0x01, 0x00, 0x5e, 0x00, 0x00, 0x00]);

    expect(result.ouiHex).toBe("01005E");
    expect(result.isUnicast).toBe(false);
    expect(result.isUniversallyAdministered).toBe(true);
    expect(result.randomizationLikely).toBe(false);
  });

  // Property-based tests (WR-04) — per CLAUDE.md's Testing Stack convention
  // ("Vitest + fast-check own all of ... lib/mac"), exercised across the
  // full byte[0] 0-255 range rather than a handful of hand-picked vectors,
  // asserting the bit-level invariants directly from the documented
  // I/G-bit-0 and U/L-bit-1 contract (MAC-04, MAC-05, MAC-06, MAC-07, D-10).
  const byteArb = fc.integer({ min: 0, max: 255 });
  const bytesArb = fc.tuple(byteArb, byteArb, byteArb, byteArb, byteArb, byteArb);

  fcIt.prop([bytesArb])(
    "isUnicast tracks bit 0 (I/G) of byte[0] alone, across the full byte range and any other-byte values",
    (bytes) => {
      const result = classifyMac(bytes);
      expect(result.isUnicast).toBe((bytes[0] & 0x01) === 0);
    }
  );

  fcIt.prop([bytesArb])(
    "isUniversallyAdministered tracks bit 1 (U/L) of byte[0] alone, and randomizationLikely is always its exact negation (D-10)",
    (bytes) => {
      const result = classifyMac(bytes);
      expect(result.isUniversallyAdministered).toBe((bytes[0] & 0x02) === 0);
      expect(result.randomizationLikely).toBe(!result.isUniversallyAdministered);
    }
  );

  fcIt.prop([bytesArb])(
    "ouiHex is always the first 3 bytes as 6 uppercase hex characters, for any 6-byte input",
    (bytes) => {
      const result = classifyMac(bytes);
      const expected = bytes
        .slice(0, 3)
        .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
        .join("");
      expect(result.ouiHex).toBe(expected);
      expect(result.ouiHex).toHaveLength(6);
    }
  );
});
