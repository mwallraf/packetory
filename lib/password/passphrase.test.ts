import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS, EFF_WORD_COUNT } from "./constants";
import { generatePassphrase } from "./passphrase";
import { queueFill } from "./test-utils";
import { loadWordlist } from "./wordlist";

describe("passphrase tracer (D-13)", () => {
  it("default options: six EFF Large words joined by '-'", async () => {
    const words = await loadWordlist();
    expect(words.length).toBe(EFF_WORD_COUNT);
    expect(
      generatePassphrase(DEFAULT_OPTIONS, words, {
        fill: queueFill([0, 1, 2, 3, 4, 5]),
      }),
    ).toBe("abacus-abdomen-abdominal-abide-abiding-ability");
  });

  it("real Web Crypto: six distinct-by-chance list words", async () => {
    const words = await loadWordlist();
    const out = generatePassphrase({ ...DEFAULT_OPTIONS, separator: "_" }, words);
    const tokens = out.split("_");
    expect(tokens).toHaveLength(6);
    for (const t of tokens) {
      expect(words).toContain(t);
    }
  });
});
