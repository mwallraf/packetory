// @vitest-environment node
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ALGORITHM_IDS } from "./algorithms";
import {
  digestsToHex,
  formatDigest,
  toBase64,
  toHex,
  toHexUpper,
} from "./format";
import { sampleDigests } from "./sample";
import type { AlgorithmId, Digests } from "./types";

describe("toHex (HASH-01)", () => {
  it("encodes empty input as an empty string", () => {
    expect(toHex(new Uint8Array(0))).toBe("");
  });

  it("keeps a leading zero byte: 00 12 d2 0a -> 0012d20a", () => {
    expect(toHex(new Uint8Array([0x00, 0x12, 0xd2, 0x0a]))).toBe("0012d20a");
  });

  it("matches Buffer hex for all 256 byte values and is lowercase", () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    const hex = toHex(all);
    expect(hex).toBe(Buffer.from(all).toString("hex"));
    expect(hex).not.toMatch(/[A-F]/);
    expect(hex).toHaveLength(512);
  });
});

describe("digestsToHex (HASH-01)", () => {
  it("maps every AlgorithmId to the hex of its bytes with exactly 10 keys", () => {
    const digests = Object.fromEntries(
      ALGORITHM_IDS.map((id, i) => [id, new Uint8Array([i, 0xff, 0x00])]),
    ) as Digests;
    const hex = digestsToHex(digests);
    expect(Object.keys(hex).sort()).toEqual([...ALGORITHM_IDS].sort());
    ALGORITHM_IDS.forEach((id: AlgorithmId, i) => {
      expect(hex[id]).toBe(toHex(new Uint8Array([i, 0xff, 0x00])));
    });
  });
});

describe("toHexUpper (OUT-03)", () => {
  it("OUT-03: keeps the leading zero byte and uppercases: 00 12 d2 0a -> 0012D20A", () => {
    expect(toHexUpper(new Uint8Array([0x00, 0x12, 0xd2, 0x0a]))).toBe("0012D20A");
  });
});

describe("toBase64 (OUT-03)", () => {
  it("OUT-03: encodes empty input as an empty string", () => {
    expect(toBase64(new Uint8Array(0))).toBe("");
  });

  it("OUT-03: matches Buffer base64 for any byte array up to 64 bytes", () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 64 }), (bytes) => {
        expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
      }),
    );
  });
});

describe("formatDigest (OUT-03, D-11)", () => {
  const d = sampleDigests();

  it("OUT-03: sha256 in base64 is the node-verified value", () => {
    expect(formatDigest("sha256", d.sha256, "base64")).toBe(
      "uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=",
    );
  });

  it("OUT-03: crc32 stays lowercase hex under base64", () => {
    expect(formatDigest("crc32", d.crc32, "base64")).toBe("0d4a1185");
  });

  it("OUT-03: crc32 follows the case choice under HEX", () => {
    expect(formatDigest("crc32", d.crc32, "HEX")).toBe("0D4A1185");
    expect(formatDigest("crc32", d.crc32, "hex")).toBe("0d4a1185");
  });

  it("OUT-03: md5 under HEX is the uppercase hex", () => {
    expect(formatDigest("md5", d.md5, "HEX")).toBe(
      "5EB63BBBE01EEED093CB22BB8F5ACDC3",
    );
  });
});
