// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { ALGORITHMS } from "./algorithms";
import { toBase64, toHex } from "./format";
import { hashText } from "./job";
import { SAMPLE_DIGEST_HEX, sampleDigests } from "./sample";
import type { AlgorithmId, Digests } from "./types";
import {
  describeMatch,
  matchExpected,
  normalizeExpected,
  VALID_HEX_LENGTHS,
} from "./verify";

const SHA256 = SAMPLE_DIGEST_HEX.sha256;
const SHA256_B64 = "uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=";
const HINT = (n: number) =>
  `Expected 8, 32, 40, 56, 64, 96 or 128 hex characters; got ${n}.`;

const d = sampleDigests();

function ids(raw: string, digests: Digests = d): AlgorithmId[] {
  const r = matchExpected(raw, digests);
  return r.state === "match" ? r.ids : [];
}

function chunk(hex: string, size: number): string {
  return hex.match(new RegExp(`.{1,${size}}`, "g"))!.join(" ");
}

describe("VALID_HEX_LENGTHS (OUT-04)", () => {
  it("OUT-04: lists the hex lengths of the supported digests", () => {
    expect([...VALID_HEX_LENGTHS]).toEqual([8, 32, 40, 56, 64, 96, 128]);
  });
});

describe("matchExpected hex shapes (OUT-04, D-17)", () => {
  const shapes: Array<[string, string]> = [
    ["upper-case", SHA256.toUpperCase()],
    ["sha256: prefix", "sha256:" + SHA256],
    ["SHA256: prefix, upper-case alias", "SHA256: " + SHA256],
    ["SHA-256 = prefix", "SHA-256 = " + SHA256],
    ["0x prefix", "0x" + SHA256],
    ["0X prefix upper-case", "0X" + SHA256.toUpperCase()],
    ["colon-separated bytes", SHA256.match(/../g)!.join(":")],
    ["space groups of 2", chunk(SHA256, 2)],
    ["space groups of 4", chunk(SHA256, 4)],
    ["space groups of 8", chunk(SHA256, 8)],
    ["sha256sum stdin line", SHA256 + "  -"],
    ["sha256sum text line", SHA256 + "  file.iso"],
    ["sha256sum binary line", SHA256 + " *file.iso"],
    ["BSD tag line", "SHA256 (file.iso) = " + SHA256],
    ["BSD tag with spaces in the name", "SHA256 (my file (1).iso) = " + SHA256],
    ["surrounding whitespace", "  \t" + SHA256 + "\n "],
    [
      "zero-width and NBSP wrapped",
      "\u200B\uFEFF\u00A0" + SHA256 + "\u00A0\u2060\u200D",
    ],
  ];

  it.each(shapes)("OUT-04: %s matches SHA-256 only", (_name, raw) => {
    expect(matchExpected(raw, d)).toEqual({ state: "match", ids: ["sha256"] });
  });

  it("OUT-04: a hex-only filename does not break a sha256sum line", () => {
    expect(ids(SHA256 + "  deadbeef")).toEqual(["sha256"]);
  });

  it("OUT-04: an 8-character first space group is not read as CRC32 plus a filename", () => {
    expect(ids(chunk(SHA256, 8))).toEqual(["sha256"]);
  });

  it("OUT-04: colon-separated hex is not mistaken for an algorithm prefix", () => {
    expect(ids(SAMPLE_DIGEST_HEX.md5.match(/../g)!.join(":"))).toEqual(["md5"]);
    expect(ids("0D:4A:11:85")).toEqual(["crc32"]);
  });

  it("OUT-04: CRC32 0D4A1185 matches crc32", () => {
    expect(ids("0D4A1185")).toEqual(["crc32"]);
    expect(ids("crc32: 0d4a1185")).toEqual(["crc32"]);
  });

  it("OUT-04: 40-hex SHA-1 matches only SHA-1 and 40-hex RIPEMD-160 only RIPEMD-160", () => {
    expect(ids(SAMPLE_DIGEST_HEX.sha1)).toEqual(["sha1"]);
    expect(ids(SAMPLE_DIGEST_HEX.ripemd160)).toEqual(["ripemd160"]);
  });

  it("OUT-04: real digests of one input match exactly one row per value", async () => {
    const real = await hashText("abc");
    for (const algo of ALGORITHMS) {
      expect(ids(toHex(real[algo.id]), real)).toEqual([algo.id]);
    }
  });

  it("OUT-04: a prefixed value equal to another algorithm still highlights that row (no algorithm restriction)", () => {
    expect(ids("sha256:" + SAMPLE_DIGEST_HEX["sha3-256"])).toEqual(["sha3-256"]);
  });

  it("OUT-04: identical SHA-256 and SHA3-256 bytes highlight both, in ALGORITHMS order", () => {
    const twin = sampleDigests();
    twin["sha3-256"] = twin.sha256.slice();
    const r = matchExpected(SHA256, twin);
    expect(r).toEqual({ state: "match", ids: ["sha256", "sha3-256"] });
    if (r.state === "match") {
      expect(describeMatch(r.ids)).toBe("Matches SHA-256 and SHA3-256.");
    }
  });
});

describe("matchExpected Base64 (OUT-04, D-17)", () => {
  const base64Url = SHA256_B64.replace(/\+/g, "-").replace(/\//g, "_");

  it("OUT-04: sanity - the sample Base64 is what toBase64 produces", () => {
    expect(toBase64(d.sha256)).toBe(SHA256_B64);
  });

  it.each([
    ["standard with padding", SHA256_B64],
    ["standard without padding", SHA256_B64.replace(/=+$/, "")],
    ["base64url with padding", base64Url],
    ["base64url without padding", base64Url.replace(/=+$/, "")],
    ["with a sha256 prefix", "sha256:" + SHA256_B64],
    ["wrapped in invisible characters", "\u200B" + SHA256_B64 + "\uFEFF"],
  ])("OUT-04: Base64 %s matches SHA-256", (_name, raw) => {
    expect(ids(raw)).toEqual(["sha256"]);
  });

  it("OUT-04: Base64 is compared case-sensitively", () => {
    expect(ids(SHA256_B64.toLowerCase())).toEqual([]);
    expect(ids(SHA256_B64.toUpperCase())).toEqual([]);
  });

  it("OUT-04: a Base64 value starting with 0x is not mangled by the 0x strip", () => {
    const custom = sampleDigests();
    // 0xD3 0x1B ... encodes to a string starting with "0x"
    custom.sha256 = new Uint8Array(32).fill(7);
    custom.sha256[0] = 0xd3;
    custom.sha256[1] = 0x1b;
    const b64 = toBase64(custom.sha256);
    expect(b64.startsWith("0x")).toBe(true);
    expect(ids(b64, custom)).toEqual(["sha256"]);
  });

  it("OUT-04: CRC32 is never compared as Base64", () => {
    const custom = sampleDigests();
    custom.crc32 = new Uint8Array([0xd3, 0x1b, 0x00, 0x00]);
    expect(ids(toBase64(custom.crc32), custom)).toEqual([]);
  });

  it("OUT-04: a hex value never matches through the Base64 path", () => {
    expect(matchExpected(SHA256, d)).toEqual({ state: "match", ids: ["sha256"] });
    expect(ids(SHA256.toUpperCase())).toEqual(["sha256"]);
  });
});

describe("matchExpected non-matches and hints (OUT-04, D-18)", () => {
  it("OUT-04: a valid-length hex that equals nothing is no-match without a hint", () => {
    expect(matchExpected("deadbeef", d)).toEqual({ state: "no-match" });
    expect(matchExpected("deadbeef".repeat(8), d)).toEqual({ state: "no-match" });
  });

  it("OUT-04: a non-hex value gets the neutral length hint with its length", () => {
    expect(matchExpected("xyz", d)).toEqual({ state: "no-match", hint: HINT(3) });
  });

  it("OUT-04: an invalid-length hex value gets the hint", () => {
    expect(matchExpected("abcd", d)).toEqual({ state: "no-match", hint: HINT(4) });
  });

  it("OUT-04: a truncated checksum is not prefix-matched and is hinted", () => {
    expect(matchExpected(SHA256.slice(0, 63), d)).toEqual({
      state: "no-match",
      hint: HINT(63),
    });
  });

  it("OUT-04: a longer-than-digest value is hinted, never matched", () => {
    expect(matchExpected(SHA256 + "0", d)).toEqual({
      state: "no-match",
      hint: HINT(65),
    });
  });

  it("OUT-04: a prefix with nothing after it is no-match with a zero-length hint", () => {
    expect(matchExpected("sha256:", d)).toEqual({
      state: "no-match",
      hint: HINT(0),
    });
  });

  it("OUT-04: the hint never contains the pasted value", () => {
    const r = matchExpected("secret-value", d);
    expect(r.state).toBe("no-match");
    if (r.state === "no-match") expect(r.hint).not.toContain("secret");
  });

  it("OUT-04: empty and whitespace-only values are idle", () => {
    expect(matchExpected("", d)).toEqual({ state: "idle" });
    expect(matchExpected("   \n\t ", d)).toEqual({ state: "idle" });
    expect(matchExpected("\u200B\uFEFF\u00A0", d)).toEqual({ state: "idle" });
    expect(normalizeExpected("  ")).toBeNull();
  });
});

describe("normalizeExpected (OUT-04)", () => {
  it("OUT-04: returns lowercase hex, the Base64 candidate and validity", () => {
    expect(normalizeExpected("SHA256: " + SHA256.toUpperCase())).toEqual({
      hex: SHA256,
      base64: SHA256.toUpperCase(),
      hexIsValid: true,
    });
    expect(normalizeExpected("nope")).toEqual({
      hex: "nope",
      base64: "nope",
      hexIsValid: false,
    });
  });
});

describe("describeMatch (OUT-04)", () => {
  it("OUT-04: one, two and three-or-more labels", () => {
    expect(describeMatch(["sha256"])).toBe("Matches SHA-256.");
    expect(describeMatch(["sha256", "sha3-256"])).toBe(
      "Matches SHA-256 and SHA3-256.",
    );
    expect(describeMatch(["md5", "sha1", "crc32"])).toBe(
      "Matches MD5, SHA-1 and CRC32.",
    );
  });

  it("OUT-04: lists labels in ALGORITHMS order whatever the input order", () => {
    expect(describeMatch(["crc32", "md5"])).toBe("Matches MD5 and CRC32.");
  });

  it("OUT-04: never uses authenticity wording (T-09-15)", () => {
    const text = describeMatch(ALGORITHMS.map((a) => a.id));
    expect(text).not.toMatch(/verified|authentic|safe|trusted/i);
  });
});

/** Distinct deterministic bytes for every row except the target's own. */
function digestsAround(target: AlgorithmId, bytes: Uint8Array): Digests {
  const out = {} as Digests;
  ALGORITHMS.forEach((algo, i) => {
    out[algo.id] = new Uint8Array(algo.bits / 8).fill(0x10 + i);
  });
  out[target] = bytes;
  return out;
}

describe("round-trip property (OUT-04)", () => {
  for (const algo of ALGORITHMS) {
    fcIt.prop(
      [
        fc.uint8Array({
          minLength: algo.bits / 8,
          maxLength: algo.bits / 8,
        }),
      ],
      { numRuns: 60 },
    )(`OUT-04: every pasted shape of the ${algo.id} digest matches exactly its rows`, (bytes) => {
      const digests = digestsAround(algo.id, bytes);
      const hex = toHex(bytes);
      // Rows whose bytes equal the target (a sibling can equal it only by chance).
      const expectedIds = ALGORITHMS.filter(
        (a) => toHex(digests[a.id]) === hex,
      ).map((a) => a.id);

      const shapes = [
        hex,
        hex.toUpperCase(),
        `${algo.id}:${hex}`,
        `${algo.id.toUpperCase()}: ${hex}`,
        `${hex}  -`,
        hex.match(/../g)!.join(":"),
        chunk(hex, 4),
      ];
      for (const raw of shapes) {
        expect(matchExpected(raw, digests)).toEqual({
          state: "match",
          ids: expectedIds,
        });
      }

      if (algo.id !== "crc32") {
        const b64Ids = expectedIds.filter((id) => id !== "crc32");
        const b64 = toBase64(bytes);
        const b64Shapes = [
          b64,
          b64.replace(/=+$/, ""),
          b64.replace(/\+/g, "-").replace(/\//g, "_"),
        ];
        for (const raw of b64Shapes) {
          expect(matchExpected(raw, digests)).toEqual({
            state: "match",
            ids: b64Ids,
          });
        }
      }
    });
  }
});

describe("performance and ReDoS guard (T-09-14)", () => {
  function timed(raw: string): number {
    const start = performance.now();
    matchExpected(raw, d);
    return performance.now() - start;
  }

  it("OUT-04: a 4096-character run of one letter finishes well under 50 ms", () => {
    expect(timed("a".repeat(4096))).toBeLessThan(50);
  });

  it("OUT-04: a 4096-character mixed-separator string finishes well under 50 ms", () => {
    expect(timed("a: -_ b".repeat(600).slice(0, 4096))).toBeLessThan(50);
  });

  it("OUT-04: adversarial prefix, whitespace and BSD-tag shapes stay linear", () => {
    expect(timed("sha256" + " ".repeat(4090))).toBeLessThan(50);
    expect(timed("a(" + ")".repeat(4090))).toBeLessThan(50);
    expect(timed("a(x)=" + ")=y".repeat(1300) + " z")).toBeLessThan(50);
    expect(timed(") ".repeat(2048))).toBeLessThan(50);
  });
});
