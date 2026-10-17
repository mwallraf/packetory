// @vitest-environment node
import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { createCrc32 } from "./crc32";
import { toHex } from "./format";

const enc = new TextEncoder();

function crcHex(input: string): string {
  const h = createCrc32();
  h.update(enc.encode(input));
  return toHex(h.digest());
}

function readU32(bytes: Uint8Array): number {
  return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, false);
}

describe("CRC32 oracle availability (HASH-01)", () => {
  it("node:zlib crc32 exists (Node >= 22.2 required)", () => {
    expect(
      typeof crc32,
      "node:zlib crc32 missing - Node >= 22.2 required",
    ).toBe("function");
  });
});

describe("CRC32 catalogue and precision (HASH-01)", () => {
  it.each([
    ["123456789", "cbf43926"],
    ["", "00000000"],
    ["a", "e8b7be43"],
    ["abc", "352441c2"],
    ["62", "0012d20a"],
    ["The quick brown fox jumps over the lazy dog", "414fa339"],
  ])("crc32 vector %#", (input, expected) => {
    expect(crcHex(input)).toBe(expected);
    expect(expected).toHaveLength(8);
  });

  it("digest is always 4 bytes", () => {
    for (const s of ["", "a", "62", "123456789"]) {
      const h = createCrc32();
      h.update(enc.encode(s));
      expect(h.digest()).toHaveLength(4);
    }
  });

  it("incremental update equals one-shot (123456789 split 4/5)", () => {
    const h = createCrc32();
    h.update(enc.encode("1234"));
    h.update(enc.encode("56789"));
    expect(toHex(h.digest())).toBe("cbf43926");
  });

  it("is single-use: digest() or update() after digest() throws", () => {
    const h = createCrc32();
    h.digest();
    expect(() => h.digest()).toThrow(/hash was destroyed/);
    expect(() => h.update(new Uint8Array(1))).toThrow(/hash was destroyed/);
  });
});

describe("CRC32 vs zlib.crc32 (HASH-01, HASH-03)", () => {
  fcIt.prop([fc.uint8Array({ maxLength: 2048 }), fc.nat()])(
    "unsigned big-endian digest equals zlib.crc32, also across a split point",
    (bytes, n) => {
      const split = n % (bytes.length + 1);
      const head = bytes.subarray(0, split);
      const tail = bytes.subarray(split);

      const h = createCrc32();
      h.update(head);
      h.update(tail);
      const value = readU32(h.digest());

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBe(crc32(bytes));
      expect(value).toBe(crc32(tail, crc32(head)));
    },
  );
});
