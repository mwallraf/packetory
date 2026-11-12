import { beforeAll, describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { DEFAULT_OPTIONS, EFF_WORD_COUNT } from "./constants";
import { WordlistIntegrityError } from "./errors";
import { generatePassphrase, generatePassphraseBatch } from "./passphrase";
import { queueFill } from "./test-utils";
import type { PassphraseOptions, Separator } from "./types";
import { loadWordlist } from "./wordlist";

let words: readonly string[];

beforeAll(async () => {
  words = await loadWordlist();
});

const base = (over: Partial<PassphraseOptions>): PassphraseOptions => ({
  words: 3,
  separator: "-",
  capitalize: false,
  appendNumber: false,
  ...over,
});

describe("passphrase tracer (D-13)", () => {
  it("default options: six EFF Large words joined by '-'", () => {
    expect(words.length).toBe(EFF_WORD_COUNT);
    expect(
      generatePassphrase(DEFAULT_OPTIONS, words, {
        fill: queueFill([0, 1, 2, 3, 4, 5]),
      }),
    ).toBe("abacus-abdomen-abdominal-abide-abiding-ability");
  });

  it("real Web Crypto: six distinct-by-chance list words", () => {
    const out = generatePassphrase({ ...DEFAULT_OPTIONS, separator: "_" }, words);
    const tokens = out.split("_");
    expect(tokens).toHaveLength(6);
    for (const t of tokens) {
      expect(words).toContain(t);
    }
  });
});

describe("passphrase options (D-13)", () => {
  it("capitalize uppercases only the first character of each word", () => {
    const fill = queueFill([6639, 2008, 7747]);
    expect(
      generatePassphrase(base({ separator: ".", capitalize: true }), words, {
        fill,
      }),
    ).toBe("T-shirt.Drop-down.Yo-yo");
  });

  it("appendNumber puts the digit on the end of the last word", () => {
    const fill = queueFill([0, 1, 2, 7]);
    expect(
      generatePassphrase(base({ separator: " ", appendNumber: true }), words, {
        fill,
      }),
    ).toBe("abacus abdomen abdominal7");
    expect(fill.calls).toBe(4);
  });

  it("capitalize with appendNumber and '_'", () => {
    const fill = queueFill([0, 1, 2, 9]);
    expect(
      generatePassphrase(
        base({ separator: "_", capitalize: true, appendNumber: true }),
        words,
        { fill },
      ),
    ).toBe("Abacus_Abdomen_Abdominal9");
    expect(fill.calls).toBe(4);
  });

  it("hyphenated words keep their hyphens under the '-' separator", () => {
    expect(
      generatePassphrase(base({}), words, { fill: queueFill([6639, 7747, 0]) }),
    ).toBe("t-shirt-yo-yo-abacus");
  });

  it("words clamp to 3..20 and fall back to 6 on NaN", () => {
    const count = (n: unknown) =>
      generatePassphrase(
        { ...base({}), words: n as number, separator: " " },
        words,
      ).split(" ").length;
    expect(count(2)).toBe(3);
    expect(count(99)).toBe(20);
    expect(count(Number.NaN)).toBe(6);
  });

  it("a bad separator falls back to '-' and a space stays", () => {
    const fillValues = [0, 1, 2];
    expect(
      generatePassphrase(
        base({ separator: "," as unknown as Separator }),
        words,
        { fill: queueFill(fillValues) },
      ),
    ).toBe("abacus-abdomen-abdominal");
    expect(
      generatePassphrase(base({ separator: " " }), words, {
        fill: queueFill(fillValues),
      }),
    ).toBe("abacus abdomen abdominal");
  });

  const SEPARATORS_UNAMBIGUOUS: Separator[] = ["_", ".", " "];
  fcIt.prop(
    {
      count: fc.integer({ min: 3, max: 20 }),
      separator: fc.constantFrom(...SEPARATORS_UNAMBIGUOUS),
      capitalize: fc.boolean(),
      appendNumber: fc.boolean(),
    },
    { numRuns: 200 },
  )("real Web Crypto output is well-formed", (c) => {
    const out = generatePassphrase(
      {
        words: c.count,
        separator: c.separator,
        capitalize: c.capitalize,
        appendNumber: c.appendNumber,
      },
      words,
    );
    const tokens = out.split(c.separator);
    expect(tokens).toHaveLength(c.count);
    const set = new Set(words);
    tokens.forEach((token, i) => {
      let t = token;
      if (c.appendNumber && i === tokens.length - 1) {
        expect(t).toMatch(/\d$/);
        t = t.slice(0, -1);
      }
      expect(t).not.toMatch(/\d/);
      if (c.capitalize) {
        expect(t.charAt(0)).toMatch(/[A-Z]/);
        t = t.charAt(0).toLowerCase() + t.slice(1);
      }
      expect(set.has(t)).toBe(true);
    });
    if (!c.appendNumber) {
      expect(out).not.toMatch(/\d/);
    }
  });
});

describe("rejection-sampled draws (D-13, PWD-04 sampler)", () => {
  it("redraws a word value at or above the 7776 rejection limit", () => {
    const fill = queueFill([4294964736, 5, 1, 2]);
    expect(generatePassphrase(base({}), words, { fill })).toBe(
      "ability-abdomen-abdominal",
    );
    expect(fill.calls).toBe(4);
  });

  it("redraws a digit value at or above the 10 rejection limit", () => {
    const fill = queueFill([0, 1, 2, 4294967290, 3]);
    expect(generatePassphrase(base({ appendNumber: true }), words, { fill })).toBe(
      "abacus-abdomen-abdominal3",
    );
    expect(fill.calls).toBe(5);
  });
});

describe("wordlist integrity guard (D-13)", () => {
  it("refuses a 7775-entry list before any draw", () => {
    const fill = queueFill([0, 1, 2]);
    let caught: unknown;
    try {
      generatePassphrase(base({}), words.slice(0, 7775), { fill });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(WordlistIntegrityError);
    const err = caught as WordlistIntegrityError;
    expect(err.expected).toBe(7776);
    expect(err.received).toBe(7775);
    expect(fill.calls).toBe(0);
    expect(err.message).not.toContain("abacus");
    expect(err.message).not.toContain("zoom");
    expect(JSON.stringify(err)).not.toContain("abacus");
    expect(JSON.stringify(err)).not.toContain("zoom");
  });

  it("refuses a non-array list with received 0", () => {
    const fill = queueFill([0, 1, 2]);
    let caught: unknown;
    try {
      generatePassphrase(base({}), "abacus zoom" as unknown as string[], {
        fill,
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(WordlistIntegrityError);
    const err = caught as WordlistIntegrityError;
    expect(err.received).toBe(0);
    expect(fill.calls).toBe(0);
    expect(err.message).not.toContain("abacus");
    expect(err.message).not.toContain("zoom");
    expect(JSON.stringify(err)).not.toContain("abacus");
    expect(JSON.stringify(err)).not.toContain("zoom");
  });
});

describe("generatePassphraseBatch (D-13)", () => {
  it("returns the requested number of passphrases", () => {
    expect(generatePassphraseBatch(DEFAULT_OPTIONS, words, 3)).toHaveLength(3);
  });

  it("clamps the count to 1..20", () => {
    expect(generatePassphraseBatch(DEFAULT_OPTIONS, words, 0)).toHaveLength(1);
    expect(generatePassphraseBatch(DEFAULT_OPTIONS, words, 21)).toHaveLength(20);
    expect(
      generatePassphraseBatch(DEFAULT_OPTIONS, words, Number.NaN),
    ).toHaveLength(1);
  });
});
