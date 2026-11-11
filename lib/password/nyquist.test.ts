import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS, MAX_FILL_BYTES } from "./constants";
import { generateBatch } from "./generate";
import { generatePassphraseBatch } from "./passphrase";
import { recordingFill } from "./test-utils";
import { loadWordlist } from "./wordlist";

// Nyquist gap fill (SC2): the 65,536-byte cap must hold on the passphrase
// path and under heavy rejection, not just on the happy password path.

let words: readonly string[];
beforeAll(async () => {
  words = await loadWordlist();
});

describe("byte cap under worst-case load (SC2)", () => {
  it("max passphrase batch (20 x 20 words + number) never issues a fill above 65,536 bytes", () => {
    const fill = recordingFill((b) => crypto.getRandomValues(b));
    const batch = generatePassphraseBatch(
      { words: 20, separator: " ", capitalize: true, appendNumber: true },
      words,
      20,
      { fill },
    );
    expect(batch).toHaveLength(20);
    expect(fill.calls).toBeGreaterThan(0);
    for (const n of fill.requestedBytes)
      expect(n).toBeLessThanOrEqual(MAX_FILL_BYTES);
  });

  it("a source rejecting every other draw still keeps each request within the cap and yields valid 128-char passwords", () => {
    let flip = false;
    const fill = recordingFill((b) => {
      crypto.getRandomValues(b);
      for (let i = 0; i < b.length; i++) {
        flip = !flip;
        if (flip) b[i] = 0xffffffff;
      }
      return b;
    });
    const batch = generateBatch({ ...DEFAULT_OPTIONS, length: 128 }, 20, {
      fill,
    });
    expect(batch).toHaveLength(20);
    for (const pw of batch) expect(pw).toHaveLength(128);
    for (const n of fill.requestedBytes)
      expect(n).toBeLessThanOrEqual(MAX_FILL_BYTES);
  });
});
