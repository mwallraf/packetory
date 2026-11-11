import { describe, expect, it, test } from "vitest";
import { fc } from "@fast-check/vitest";
import { resolveAlphabet } from "./charset";
import {
  DEFAULT_OPTIONS,
  DEFAULT_SYMBOLS,
  GUESS_RATES,
  MAX_GENERATION_ATTEMPTS,
} from "./constants";
import { crackTimeLog10Seconds, formatCrackTime } from "./crack-time";
import {
  acceptanceProbability,
  formatBits,
  log2Big,
  passphraseEntropyBits,
  passwordEntropyBits,
  strengthLevel,
  validPasswordCount,
} from "./entropy";
import type { PasswordOptions } from "./types";

/** The 32 printable non-alphanumeric ASCII characters in code order. */
const ALL_SYMBOLS = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

const base: PasswordOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  symbolSet: DEFAULT_SYMBOLS,
  avoidLookalikes: false,
};

function opts(over: Partial<PasswordOptions>): PasswordOptions {
  return { ...base, ...over };
}

describe("strength from settings (SC-4 tracer)", () => {
  it("default password: 128.0598 bits, '128 bits', veryStrong, and more than a trillion years on the fast hash", () => {
    const bits = passwordEntropyBits(DEFAULT_OPTIONS);
    expect(bits).toBeCloseTo(128.0598, 4);
    expect(formatBits(bits)).toBe("128 bits");
    expect(strengthLevel(bits)).toBe("veryStrong");
    expect(formatCrackTime(crackTimeLog10Seconds(bits, GUESS_RATES.fast))).toBe(
      "more than a trillion years",
    );
  });
});

describe("exact entropy (D-15)", () => {
  test.each([
    ["default L=20", opts({}), 128.0598],
    ["default sets L=4", opts({ length: 4 }), 21.8313],
    ["default sets L=128", opts({ length: 128 }), 820.402],
    ["look-alikes on L=20", opts({ avoidLookalikes: true }), 125.8903],
    ["look-alikes on L=4", opts({ avoidLookalikes: true, length: 4 }), 21.2784],
    ["symbolSet '!' L=4", opts({ symbolSet: "!", length: 4 }), 17.3078],
    [
      "look-alikes on, symbolSet '!' L=4",
      opts({ symbolSet: "!", length: 4, avoidLookalikes: true }),
      16.7549,
    ],
    [
      "uppercase only L=20",
      opts({ lowercase: false, digits: false, symbols: false }),
      94.0088,
    ],
  ])("%s", (_name, o, expected) => {
    expect(passwordEntropyBits(o)).toBeCloseTo(expected, 4);
  });

  it("the pool sizes behind the fixtures are 85 and 79", () => {
    expect(resolveAlphabet(opts({})).poolSize).toBe(85);
    expect(resolveAlphabet(opts({ avoidLookalikes: true })).poolSize).toBe(79);
  });

  it("symbols only with all 32 symbols is exactly 75 bits at L=15 and 100 at L=20 (log2Big exactness)", () => {
    const symbolsOnly = {
      uppercase: false,
      lowercase: false,
      digits: false,
      symbols: true,
      symbolSet: ALL_SYMBOLS,
    };
    expect(resolveAlphabet(opts(symbolsOnly)).poolSize).toBe(32);
    const b75 = passwordEntropyBits(opts({ ...symbolsOnly, length: 15 }));
    const b100 = passwordEntropyBits(opts({ ...symbolsOnly, length: 20 }));
    expect(b75).toBe(75);
    expect(b100).toBe(100);
    expect(formatBits(b75)).toBe("75 bits");
    expect(strengthLevel(b75)).toBe("strong");
    expect(strengthLevel(b100)).toBe("veryStrong");
  });

  it("never overstates: at L=4 with the default sets the figure is 21.8313, not the naive 25.6376", () => {
    const bits = passwordEntropyBits(opts({ length: 4 }));
    const naive = 4 * Math.log2(85);
    expect(naive).toBeCloseTo(25.6376, 4);
    expect(bits).toBeCloseTo(21.8313, 4);
    expect(bits).toBeLessThan(naive - 3);
  });

  test.each([
    [[1, 1, 1, 1], 4, 24n],
    [[2, 1, 1], 4, 96n],
    [[3, 2, 1, 1], 5, 2520n],
    [[2, 2], 3, 48n],
    [[26], 20, 26n ** 20n],
  ] as const)(
    "validPasswordCount(%j, %i) is %s (brute-force checked)",
    (sizes, length, expected) => {
      expect(validPasswordCount(sizes, length)).toBe(expected);
    },
  );

  it("acceptanceProbability: default 0.915104, worst case 0.010299, single set exactly 1", () => {
    expect(acceptanceProbability(opts({}))).toBeCloseTo(0.915104, 6);
    expect(
      acceptanceProbability(opts({ symbolSet: "!", length: 4 })),
    ).toBeCloseTo(0.010299, 6);
    expect(acceptanceProbability(opts({ avoidLookalikes: true }))).toBeCloseTo(
      0.879449,
      6,
    );
    expect(
      acceptanceProbability(
        opts({ lowercase: false, digits: false, symbols: false }),
      ),
    ).toBe(1);
    expect(acceptanceProbability(opts({ length: 4 }))).toBeCloseTo(0.071484, 6);
  });

  it("log2Big is exact for powers of two and rejects n < 1", () => {
    expect(log2Big(1n)).toBe(0);
    expect(log2Big(2n ** 75n)).toBe(75);
    expect(log2Big(2n ** 2000n)).toBe(2000);
    expect(() => log2Big(0n)).toThrow(RangeError);
    expect(() => log2Big(-5n)).toThrow(RangeError);
  });

  const optionsArb = fc.record({
    length: fc.integer({ min: 4, max: 128 }),
    mask: fc.integer({ min: 1, max: 15 }),
    symbolSet: fc.constantFrom(DEFAULT_SYMBOLS, ALL_SYMBOLS, "!", "!@#"),
    avoidLookalikes: fc.boolean(),
  });

  function fromArb(a: {
    length: number;
    mask: number;
    symbolSet: string;
    avoidLookalikes: boolean;
  }): PasswordOptions {
    return {
      length: a.length,
      uppercase: (a.mask & 1) !== 0,
      lowercase: (a.mask & 2) !== 0,
      digits: (a.mask & 4) !== 0,
      symbols: (a.mask & 8) !== 0,
      symbolSet: a.symbolSet,
      avoidLookalikes: a.avoidLookalikes,
    };
  }

  it("property: finite, non-negative, equals the exact count's log2 and never exceeds length * log2(pool)", () => {
    fc.assert(
      fc.property(optionsArb, (a) => {
        const o = fromArb(a);
        const { sets, poolSize } = resolveAlphabet(o);
        const bits = passwordEntropyBits(o);
        expect(Number.isFinite(bits)).toBe(true);
        // 0 is legitimate: symbols-only with a one-character set has exactly one
        // possible string, so the honest figure is 0 bits, never an overstatement.
        expect(bits).toBeGreaterThanOrEqual(0);
        expect(bits).toBe(
          log2Big(
            validPasswordCount(
              sets.map((s) => s.length),
              o.length,
            ),
          ),
        );
        expect(bits).toBeLessThanOrEqual(o.length * Math.log2(poolSize) + 1e-9);
      }),
      { numRuns: 300 },
    );
  });

  it("a pool with exactly one possible string reports exactly 0 bits", () => {
    const only = opts({
      uppercase: false,
      lowercase: false,
      digits: false,
      symbolSet: "!",
      length: 4,
    });
    expect(validPasswordCount([1], 4)).toBe(1n);
    expect(passwordEntropyBits(only)).toBe(0);
    expect(strengthLevel(passwordEntropyBits(only))).toBe("weak");
  });

  it("bits are non-decreasing as length goes from 4 to 128", () => {
    for (const o of [
      opts({}),
      opts({ symbolSet: "!" }),
      opts({ digits: false }),
    ]) {
      let previous = -Infinity;
      for (let length = 4; length <= 128; length++) {
        const bits = passwordEntropyBits({ ...o, length });
        expect(bits).toBeGreaterThanOrEqual(previous);
        previous = bits;
      }
    }
  });

  it("two calls with equal options are identical (stable across Regenerate)", () => {
    expect(passwordEntropyBits(opts({}))).toBe(passwordEntropyBits(opts({})));
    expect(passphraseEntropyBits({ ...DEFAULT_OPTIONS })).toBe(
      passphraseEntropyBits({ ...DEFAULT_OPTIONS }),
    );
  });

  it("takes options, never an output string (D-14)", () => {
    expect(passwordEntropyBits.length).toBe(1);
    expect(() => {
      // @ts-expect-error passwordEntropyBits takes options, never an output string (D-14)
      const bits = passwordEntropyBits("hunter2");
      // A string is normalized as no options at all: the default figure, not a
      // figure derived from the string's characters.
      expect(bits).toBeCloseTo(128.0598, 4);
    }).not.toThrow();
  });
});

describe("retry bound (D-03, SC-1)", () => {
  it("worst-case acceptance over the whole option grid is 1.0299%, so 10,000 attempts never exhaust", () => {
    let min = Infinity;
    let at: { L: number; mask: number; k: number; lookalikes: boolean } | null =
      null;
    for (const lookalikes of [false, true]) {
      for (let k = 1; k <= 32; k++) {
        for (let mask = 1; mask <= 15; mask++) {
          for (const L of [4, 5, 6, 8, 12, 20, 128]) {
            const p = acceptanceProbability({
              length: L,
              uppercase: (mask & 1) !== 0,
              lowercase: (mask & 2) !== 0,
              digits: (mask & 4) !== 0,
              symbols: (mask & 8) !== 0,
              symbolSet: ALL_SYMBOLS.slice(0, k),
              avoidLookalikes: lookalikes,
            });
            if (p < min) {
              min = p;
              at = { L, mask, k, lookalikes };
            }
          }
        }
      }
    }
    expect(min).toBeCloseTo(0.010299, 6);
    expect(at).toEqual({ L: 4, mask: 15, k: 1, lookalikes: false });
    expect(min).toBeGreaterThanOrEqual(0.005);
    expect((1 - min) ** MAX_GENERATION_ATTEMPTS).toBeLessThan(1e-40);
  });
});

describe("passphrase entropy (D-14)", () => {
  test.each([
    [3, false, 38.7744, "weak"],
    [4, false, 51.6993, "fair"],
    [5, false, 64.6241, "fair"],
    [6, false, 77.5489, "strong"],
    [6, true, 80.8708, "strong"],
    [7, false, 90.4737, "strong"],
    [8, false, 103.3985, "veryStrong"],
  ] as const)(
    "%i words, appendNumber %s: %f bits, %s",
    (words, appendNumber, expected, level) => {
      const bits = passphraseEntropyBits({
        words,
        appendNumber,
        capitalize: false,
        separator: "-",
      });
      expect(bits).toBeCloseTo(expected, 4);
      expect(strengthLevel(bits)).toBe(level);
    },
  );

  it("capitalize and separator add nothing", () => {
    const plain = passphraseEntropyBits({
      words: 6,
      appendNumber: false,
      capitalize: false,
      separator: "-",
    });
    for (const separator of ["-", "_", ".", " "] as const) {
      for (const capitalize of [false, true]) {
        expect(
          passphraseEntropyBits({
            words: 6,
            appendNumber: false,
            capitalize,
            separator,
          }),
        ).toBe(plain);
      }
    }
  });

  it("words clamp to 3..20", () => {
    const at = (words: number) =>
      passphraseEntropyBits({
        words,
        appendNumber: false,
        capitalize: false,
        separator: "-",
      });
    expect(at(2)).toBe(at(3));
    expect(at(99)).toBe(at(20));
    expect(at(Number.NaN)).toBe(at(6));
  });
});

describe("strength labels and display (D-16)", () => {
  test.each([
    [39.999, "weak"],
    [40, "fair"],
    [74.999, "fair"],
    [75, "strong"],
    [99.999, "strong"],
    [100, "veryStrong"],
    [0, "weak"],
    [-5, "weak"],
    [Number.NaN, "weak"],
    [-Infinity, "weak"],
    [Infinity, "veryStrong"],
  ] as const)("strengthLevel(%f) is %s", (bits, level) => {
    expect(strengthLevel(bits)).toBe(level);
  });

  test.each([
    [128.0598, "128 bits"],
    [77.5489, "77 bits"],
    [75, "75 bits"],
    [74.9999, "74 bits"],
    [Number.NaN, "0 bits"],
    [-3, "0 bits"],
  ] as const)("formatBits(%f) is %s", (bits, text) => {
    expect(formatBits(bits)).toBe(text);
  });

  it("property: the label never contradicts the floored display", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 2000, noNaN: true }), (bits) => {
        const floored = Math.floor(bits);
        const level = strengthLevel(bits);
        if (floored >= 75) expect(["strong", "veryStrong"]).toContain(level);
        if (floored >= 100) expect(level).toBe("veryStrong");
        if (floored >= 40) expect(level).not.toBe("weak");
      }),
    );
  });
});
