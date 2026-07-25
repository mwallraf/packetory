import { describe, expect, it } from "vitest";
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
});
