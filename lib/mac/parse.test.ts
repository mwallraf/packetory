import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { parseMacInput } from "./parse";
import { formatMac } from "./format";

describe("parseMacInput", () => {
  it("accepts colon-separated input (MAC-01, D-04)", () => {
    expect(parseMacInput("00:1A:2B:3C:4D:5E")).toEqual({
      valid: true,
      bytes: [0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e],
    });
  });

  it("accepts dash-separated input", () => {
    expect(parseMacInput("00-1A-2B-3C-4D-5E")).toEqual({
      valid: true,
      bytes: [0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e],
    });
  });

  it("accepts Cisco dot-notation input (4-hex groups not aligned to byte boundaries, Pitfall 1)", () => {
    expect(parseMacInput("001A.2B3C.4D5E")).toEqual({
      valid: true,
      bytes: [0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e],
    });
  });

  it("accepts no-separator input", () => {
    expect(parseMacInput("001A2B3C4D5E")).toEqual({
      valid: true,
      bytes: [0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e],
    });
  });

  it("extracts hex digits despite surrounding whitespace/punctuation noise carrying no extra hex characters", () => {
    expect(parseMacInput("  00:1a-2b.3c4d5E  !!")).toEqual({
      valid: true,
      bytes: [0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e],
    });
  });

  it("rejects (never crashes on) messy input whose trailing noise itself contains extra hex-valid characters, e.g. an ifconfig/ipconfig interface-name suffix (backstop: parse must still correctly extract-or-reject, never throw)", () => {
    // "eth0" contributes its own hex-valid characters ("e" and "0"), so the
    // stripped string is 14 hex characters, not 12 — correctly rejected
    // rather than silently truncated or mis-parsed.
    expect(parseMacInput("00:1A:2B:3C:4D:5E eth0")).toEqual({
      valid: false,
    });
  });

  it("rejects a partial address (fewer than 12 hex digits)", () => {
    expect(parseMacInput("00:1A")).toEqual({ valid: false });
  });

  it("rejects an over-length address (13+ hex digits)", () => {
    expect(parseMacInput("00:1A:2B:3C:4D:5E:7F")).toEqual({ valid: false });
  });

  it("rejects non-hex garbage", () => {
    expect(parseMacInput("GGZZ not a mac at all")).toEqual({ valid: false });
  });

  it("rejects an empty string", () => {
    expect(parseMacInput("")).toEqual({ valid: false });
  });

  it.each([
    ["a".repeat(10000)],
    ["\n\t"],
    [":".repeat(300)],
    ["<script>alert(1)</script>"],
  ])("never throws for pathological input: %s", (input) => {
    expect(() => parseMacInput(input)).not.toThrow();
  });

  // Property-based tests (WR-04) — per CLAUDE.md's Testing Stack convention
  // ("Vitest + fast-check own all of ... lib/mac"), exercised across the
  // full 6-byte tuple space rather than a handful of hand-picked vectors.
  const byteArb = fc.integer({ min: 0, max: 255 });
  const bytesArb = fc.tuple(byteArb, byteArb, byteArb, byteArb, byteArb, byteArb);

  fcIt.prop([bytesArb])(
    "round-trips through every formatMac() variant: parseMacInput(formatMac(bytes)[variant]) recovers the original bytes (MAC-01/MAC-02 contract)",
    (bytes) => {
      const formats = formatMac(bytes);
      for (const variant of ["colon", "dash", "dot", "none"] as const) {
        expect(parseMacInput(formats[variant])).toEqual({
          valid: true,
          bytes,
        });
      }
    }
  );

  fcIt.prop([fc.string()])(
    "never throws for any arbitrary string input (total function, D-04)",
    (raw) => {
      expect(() => parseMacInput(raw)).not.toThrow();
    }
  );

  fcIt.prop([fc.string({ minLength: 0, maxLength: 11 })])(
    "rejects any input of 11 characters or fewer — stripping non-hex characters can only shrink the string, so it can never reach the required 12 hex digits",
    (tooShort) => {
      expect(parseMacInput(tooShort)).toEqual({ valid: false });
    }
  );
});
