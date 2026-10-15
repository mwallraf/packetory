// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ALGORITHMS } from "./algorithms";
import { formatChecksumLines, formatLabeledList } from "./export";
import { hashText } from "./job";
import { sampleDigests } from "./sample";

const SHA256_HEX =
  "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";

describe("formatLabeledList (OUT-02)", () => {
  const d = sampleDigests();

  it("OUT-02: 10 lines in ALGORITHMS order, joined by newline, no trailing newline", () => {
    const text = formatLabeledList(d, "hex");
    const lines = text.split("\n");
    expect(lines).toHaveLength(10);
    expect(text.endsWith("\n")).toBe(false);
    expect(lines[0]).toBe("MD5: 5eb63bbbe01eeed093cb22bb8f5acdc3");
    expect(lines[3]).toBe(`SHA-256: ${SHA256_HEX}`);
    expect(lines[9]).toBe("CRC32: 0d4a1185");
    expect(lines.map((l) => l.split(":")[0])).toEqual(
      ALGORITHMS.map((a) => a.label),
    );
  });

  it("OUT-02: HEX uppercases every digest", () => {
    for (const line of formatLabeledList(d, "HEX").split("\n")) {
      const digest = line.split(": ")[1]!;
      expect(digest).toBe(digest.toUpperCase());
    }
  });

  it("OUT-02: base64 encodes everything except CRC32, which stays hex", () => {
    const lines = formatLabeledList(d, "base64").split("\n");
    expect(lines[3]).toBe("SHA-256: uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=");
    expect(lines[9]).toBe("CRC32: 0d4a1185");
  });
});

describe("formatChecksumLines (OUT-02, D-15, D-16)", () => {
  const d = sampleDigests();

  it("OUT-02: 20 lines alternating '# LABEL' and 'hex  -' in ALGORITHMS order", () => {
    const lines = formatChecksumLines(d).split("\n");
    expect(lines).toHaveLength(20);
    ALGORITHMS.forEach((algo, i) => {
      expect(lines[i * 2]).toBe(`# ${algo.label}`);
      expect(lines[i * 2 + 1]).toMatch(/^[0-9a-f]+ {2}-$/);
    });
    expect(lines[1]).toBe("5eb63bbbe01eeed093cb22bb8f5acdc3  -");
    expect(lines[7]).toBe(`${SHA256_HEX}  -`);
  });

  it("OUT-02: uses exactly two spaces before the dash (sha256sum text mode)", () => {
    const digestLine = formatChecksumLines(d).split("\n")[1]!;
    expect(digestLine.endsWith("  -")).toBe(true);
    expect(digestLine.endsWith("   -")).toBe(false);
  });

  it("OUT-02: empty-input digests still export all 10 algorithms", async () => {
    const empty = await hashText("");
    const lines = formatChecksumLines(empty).split("\n");
    expect(lines).toHaveLength(20);
    expect(lines).toContain(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  -",
    );
    expect(lines).toContain("00000000  -");
    expect(formatLabeledList(empty, "hex").split("\n")).toHaveLength(10);
  });
});
