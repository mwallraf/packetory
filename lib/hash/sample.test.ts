// @vitest-environment node
import { createHash } from "node:crypto";
import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ALGORITHM_IDS } from "./algorithms";
import { toHex } from "./format";
import { hashText } from "./job";
import { SAMPLE_DIGEST_HEX, SAMPLE_TEXT, sampleDigests } from "./sample";

describe("sample constants (TEXT-01, D-02)", () => {
  it("TEXT-01: SAMPLE_TEXT is hello world with no trailing newline", () => {
    expect(SAMPLE_TEXT).toBe("hello world");
  });

  it("TEXT-01: SAMPLE_DIGEST_HEX has exactly the 10 keys of ALGORITHM_IDS", () => {
    expect(Object.keys(SAMPLE_DIGEST_HEX).sort()).toEqual(
      [...ALGORITHM_IDS].sort(),
    );
    expect(Object.keys(SAMPLE_DIGEST_HEX)).toHaveLength(10);
  });

  it("TEXT-01: sampleDigests() bytes hex-encode back to SAMPLE_DIGEST_HEX", () => {
    const digests = sampleDigests();
    for (const id of ALGORITHM_IDS) {
      expect(toHex(digests[id])).toBe(SAMPLE_DIGEST_HEX[id]);
    }
  });

  it("TEXT-01: constants equal the real engine output for SAMPLE_TEXT (pin)", async () => {
    const digests = await hashText(SAMPLE_TEXT);
    for (const id of ALGORITHM_IDS) {
      expect(toHex(digests[id])).toBe(SAMPLE_DIGEST_HEX[id]);
    }
  });

  it("TEXT-01: constants equal the node:crypto / zlib oracle", () => {
    const bytes = Buffer.from(SAMPLE_TEXT, "utf8");
    for (const id of ALGORITHM_IDS) {
      const expected =
        id === "crc32"
          ? crc32(bytes).toString(16).padStart(8, "0")
          : createHash(id).update(bytes).digest("hex");
      expect(SAMPLE_DIGEST_HEX[id]).toBe(expected);
    }
  });

  it("TEXT-01: mutating one sampleDigests() result does not change the next call", () => {
    const first = sampleDigests();
    first.sha256.fill(0);
    first.md5[0] = 0xff;
    const second = sampleDigests();
    expect(toHex(second.sha256)).toBe(SAMPLE_DIGEST_HEX.sha256);
    expect(toHex(second.md5)).toBe(SAMPLE_DIGEST_HEX.md5);
    expect(second.sha256).not.toBe(first.sha256);
  });
});
