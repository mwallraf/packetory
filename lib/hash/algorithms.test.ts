// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ALGORITHMS, ALGORITHM_IDS } from "./algorithms";
import { FACTORIES } from "./engine";
import { toHex } from "./format";
import { hashBytes } from "./job";

describe("ALGORITHMS metadata (HASH-01)", () => {
  it("lists the 10 algorithms in display order with labels and bit sizes", () => {
    expect(ALGORITHMS.map((a) => [a.id, a.label, a.bits])).toEqual([
      ["md5", "MD5", 128],
      ["sha1", "SHA-1", 160],
      ["sha224", "SHA-224", 224],
      ["sha256", "SHA-256", 256],
      ["sha384", "SHA-384", 384],
      ["sha512", "SHA-512", 512],
      ["sha3-256", "SHA3-256", 256],
      ["sha3-512", "SHA3-512", 512],
      ["ripemd160", "RIPEMD-160", 160],
      ["crc32", "CRC32", 32],
    ]);
  });

  it("flags notForSecurity for exactly md5, sha1, and crc32 (HASH-01 transparency)", () => {
    const flagged = ALGORITHMS.filter((a) => a.notForSecurity).map((a) => a.id);
    expect(flagged).toEqual(["md5", "sha1", "crc32"]);
    for (const a of ALGORITHMS) {
      expect(a.notForSecurity).toBe(["md5", "sha1", "crc32"].includes(a.id));
    }
  });

  it("ALGORITHM_IDS set-equals Object.keys(FACTORIES) and follows display order", () => {
    expect(ALGORITHM_IDS).toHaveLength(10);
    expect(new Set(ALGORITHM_IDS)).toEqual(new Set(Object.keys(FACTORIES)));
    expect(ALGORITHM_IDS).toEqual(ALGORITHMS.map((a) => a.id));
  });

  it("hex digest length equals bits / 4 for every algorithm (HASH-01)", async () => {
    const digests = await hashBytes(new Uint8Array(0));
    for (const a of ALGORITHMS) {
      expect(toHex(digests[a.id]), a.id).toHaveLength(a.bits / 4);
    }
  });
});
