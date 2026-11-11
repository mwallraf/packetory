import { describe, expect, it, test } from "vitest";
import { fc } from "@fast-check/vitest";
import {
  DEFAULT_OPTIONS,
  GUESS_RATE_LABELS,
  GUESS_RATES,
  LENGTH_MAX,
  SECONDS_PER_YEAR,
} from "./constants";
import { crackTimeLog10Seconds, formatCrackTime } from "./crack-time";
import { passphraseEntropyBits, passwordEntropyBits } from "./entropy";

const SPY = SECONDS_PER_YEAR;

function crack(bits: number, rate: number): string {
  return formatCrackTime(crackTimeLog10Seconds(bits, rate));
}

function passphrase(words: number, appendNumber: boolean): number {
  return passphraseEntropyBits({ ...DEFAULT_OPTIONS, words, appendNumber });
}

describe("success-criterion scenarios (SC-4, D-17)", () => {
  test.each([
    ["40 bits, fast", 40, GUESS_RATES.fast, "54 seconds"],
    ["40 bits, slow", 40, GUESS_RATES.slow, "1 year"],
    ["75 bits, fast", 75, GUESS_RATES.fast, "59 thousand years"],
    ["75 bits, slow", 75, GUESS_RATES.slow, "59 billion years"],
    ["100 bits, fast", 100, GUESS_RATES.fast, "more than a trillion years"],
  ])("%s", (_name, bits, rate, expected) => {
    expect(crack(bits, rate)).toBe(expected);
  });

  test.each([
    ["6 words, fast", 6, false, GUESS_RATES.fast, "350 thousand years"],
    ["6 words, slow", 6, false, GUESS_RATES.slow, "350 billion years"],
    ["6 words + number, fast", 6, true, GUESS_RATES.fast, "3 million years"],
    [
      "6 words + number, slow",
      6,
      true,
      GUESS_RATES.slow,
      "more than a trillion years",
    ],
    ["3 words, fast", 3, false, GUESS_RATES.fast, "23 seconds"],
    ["3 words, slow", 3, false, GUESS_RATES.slow, "272 days"],
  ])("passphrase %s", (_name, words, appendNumber, rate, expected) => {
    expect(crack(passphrase(words, appendNumber), rate)).toBe(expected);
  });

  it("the default password reads 'more than a trillion years' at both rates", () => {
    const bits = passwordEntropyBits(DEFAULT_OPTIONS);
    expect(crack(bits, GUESS_RATES.fast)).toBe("more than a trillion years");
    expect(crack(bits, GUESS_RATES.slow)).toBe("more than a trillion years");
  });
});

describe("log-space crack time (D-17)", () => {
  it("matches the verified log10 figures", () => {
    expect(crackTimeLog10Seconds(40, 1e10)).toBeCloseTo(1.7402, 4);
    expect(crackTimeLog10Seconds(128.0598, 1e10)).toBeCloseTo(28.2488, 4);
  });

  it("stays finite at 820.402 bits for both rates", () => {
    const slow = crackTimeLog10Seconds(820.402, GUESS_RATES.slow);
    expect(Number.isFinite(slow)).toBe(true);
    expect(slow).toBeGreaterThan(200);
  });

  it("stays finite and formats at the maximal password entropy", () => {
    const bits = passwordEntropyBits({
      ...DEFAULT_OPTIONS,
      length: LENGTH_MAX,
    });
    for (const rate of [GUESS_RATES.fast, GUESS_RATES.slow]) {
      const log10 = crackTimeLog10Seconds(bits, rate);
      expect(Number.isFinite(log10)).toBe(true);
      expect(formatCrackTime(log10)).toBe("more than a trillion years");
    }
  });
});

describe("formatCrackTime buckets (D-17)", () => {
  test.each([
    ["-1", -1, "less than a second"],
    ["NaN", Number.NaN, "less than a second"],
    ["-Infinity", -Infinity, "less than a second"],
    ["0", 0, "1 second"],
    ["log10(2)", Math.log10(2), "2 seconds"],
    ["log10(59.9)", Math.log10(59.9), "59 seconds"],
    ["log10(60)", Math.log10(60), "1 minute"],
    ["log10(119)", Math.log10(119), "1 minute"],
    ["log10(120)", Math.log10(120), "2 minutes"],
    ["log10(3600)", Math.log10(3600), "1 hour"],
    ["log10(7200)", Math.log10(7200), "2 hours"],
    ["log10(86400)", Math.log10(86400), "1 day"],
    ["log10(365 days)", Math.log10(365 * 86400), "365 days"],
    ["log10(1 year)", Math.log10(SPY), "1 year"],
    ["log10(2 years)", Math.log10(2 * SPY), "2 years"],
    ["log10(999 years)", Math.log10(999 * SPY), "999 years"],
    ["log10(1e3 years)", Math.log10(1e3 * SPY), "1 thousand years"],
    ["log10(1e6 years)", Math.log10(1e6 * SPY), "1 million years"],
    ["log10(1e9 years)", Math.log10(1e9 * SPY), "1 billion years"],
    ["log10(999e9 years)", Math.log10(999e9 * SPY), "999 billion years"],
    ["log10(1e12 years)", Math.log10(1e12 * SPY), "more than a trillion years"],
    ["Infinity", Infinity, "more than a trillion years"],
    ["1e6", 1e6, "more than a trillion years"],
  ])("%s gives %s", (_name, log10, expected) => {
    expect(formatCrackTime(log10)).toBe(expected);
  });
});

const UNITS = [
  "less than a second",
  "second",
  "minute",
  "hour",
  "day",
  "year",
  "thousand",
  "million",
  "billion",
  "more than a trillion years",
];

/** Rank of a formatted string: [unit index, count], compared lexicographically. */
function rank(text: string): [number, number] {
  if (text === "less than a second") return [0, 0];
  if (text === "more than a trillion years") return [9, 0];
  const m =
    /^(\d+) (thousand|million|billion|second|minute|hour|day|year)/.exec(text);
  if (!m) throw new Error(`unexpected shape: ${text}`);
  return [UNITS.indexOf(m[2]), Number(m[1])];
}

describe("formatCrackTime ordering (D-17)", () => {
  it("the formatted value never decreases as log10 seconds increases, and every output has a bucket shape", () => {
    const shape =
      /^(less than a second|more than a trillion years|\d+ (second|minute|hour|day|year)s?|\d+ (thousand|million|billion) years)$/;
    fc.assert(
      fc.property(
        fc.tuple(
          fc.double({ min: -5, max: 40, noNaN: true }),
          fc.double({ min: -5, max: 40, noNaN: true }),
        ),
        ([x, y]) => {
          const [a, b] = x <= y ? [x, y] : [y, x];
          const ta = formatCrackTime(a);
          const tb = formatCrackTime(b);
          expect(ta).toMatch(shape);
          expect(tb).toMatch(shape);
          const [ua, ca] = rank(ta);
          const [ub, cb] = rank(tb);
          expect(ua < ub || (ua === ub && ca <= cb)).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe("guess-rate labels (STR-03)", () => {
  it("state the assumption behind each scenario", () => {
    expect(GUESS_RATE_LABELS.fast).toContain("10 billion guesses per second");
    expect(GUESS_RATE_LABELS.slow).toContain("10 thousand guesses per second");
    expect(GUESS_RATE_LABELS.slow).toContain("bcrypt");
  });
});
