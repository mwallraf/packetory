// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ALGORITHM_IDS } from "./algorithms";
import { digestsToHex, toHex } from "./format";
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
