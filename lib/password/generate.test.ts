import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { normalizePasswordOptions, resolveAlphabet } from "./charset";
import {
  BATCH_MAX,
  DEFAULT_OPTIONS,
  DEFAULT_POOL_SIZE,
  DEFAULT_SYMBOLS,
  DIGITS,
  LENGTH_MAX,
  LENGTH_MIN,
  LOWERCASE,
  MAX_FILL_BYTES,
  MAX_GENERATION_ATTEMPTS,
  UPPERCASE,
} from "./constants";
import { GenerationExhaustedError } from "./errors";
import { generateBatch, generatePassword } from "./generate";
import { constantFill, queueFill, recordingFill } from "./test-utils";
import type { PasswordOptions } from "./types";

const DEFAULT_POOL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{};:,.?";

describe("generatePassword (PWD-04)", () => {
  it("default options: 20 characters from the 85-character pool with every set present (PWD-04 tracer)", () => {
    const { pool } = resolveAlphabet(DEFAULT_OPTIONS);
    for (let i = 0; i < 200; i++) {
      const pw = generatePassword(DEFAULT_OPTIONS);
      expect(pw).toHaveLength(20);
      expect(/[A-Z]/.test(pw)).toBe(true);
      expect(/[a-z]/.test(pw)).toBe(true);
      expect(/[0-9]/.test(pw)).toBe(true);
      expect([...pw].some((ch) => DEFAULT_SYMBOLS.includes(ch))).toBe(true);
      for (const ch of pw) expect(pool.includes(ch)).toBe(true);
    }
  });

  it("resolveAlphabet(DEFAULT_OPTIONS) is the exact default pool (D-06, D-08)", () => {
    const alphabet = resolveAlphabet(DEFAULT_OPTIONS);
    expect(alphabet.pool).toBe(DEFAULT_POOL);
    expect(alphabet.poolSize).toBe(DEFAULT_POOL_SIZE);
    expect([...alphabet.sets]).toEqual([
      UPPERCASE,
      LOWERCASE,
      DIGITS,
      DEFAULT_SYMBOLS,
    ]);
  });

  it("two default passwords differ", () => {
    expect(generatePassword(DEFAULT_OPTIONS)).not.toBe(
      generatePassword(DEFAULT_OPTIONS),
    );
  });
});

const PRINTABLE_PLUS = [
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(0x20 + i)),
  "é",
  "😀",
];

const FOUR_SETS: PasswordOptions = { ...DEFAULT_OPTIONS, length: 4 };

describe("PWD-04 proofs", () => {
  fcIt.prop(
    [
      fc.integer({ min: LENGTH_MIN, max: LENGTH_MAX }),
      fc.integer({ min: 1, max: 15 }),
      fc.string({ unit: fc.constantFrom(...PRINTABLE_PLUS) }),
      fc.boolean(),
    ],
    { numRuns: 200 },
  )(
    "PWD-04 property: every password over the full option space has the requested length, every enabled set, and only pool characters (SC-1)",
    (length, mask, symbolSet, avoidLookalikes) => {
      const opts: PasswordOptions = {
        length,
        uppercase: (mask & 1) !== 0,
        lowercase: (mask & 2) !== 0,
        digits: (mask & 4) !== 0,
        symbols: (mask & 8) !== 0,
        symbolSet,
        avoidLookalikes,
      };
      const pw = generatePassword(opts);
      const { sets, pool } = resolveAlphabet(opts);
      expect(pw).toHaveLength(normalizePasswordOptions(opts).length);
      for (const set of sets) {
        expect([...pw].some((ch) => set.includes(ch))).toBe(true);
      }
      for (const ch of pw) expect(pool.includes(ch)).toBe(true);
    },
  );

  it("whole-password resampling: a first draw missing a set is discarded entirely (PWD-04, D-03)", () => {
    const fill = queueFill([0, 26, 52, 0, 62, 52, 26, 0]);
    expect(generatePassword(FOUR_SETS, { fill })).toBe("!0aA");
    expect(fill.calls).toBe(8);
  });

  it("resampling never patches positions", () => {
    const fill = queueFill([0, 0, 0, 0, 0, 26, 52, 62]);
    expect(generatePassword(FOUR_SETS, { fill })).toBe("Aa0!");
    expect(fill.calls).toBe(8);
  });

  it("randomInt rejection redraws one character, not the password", () => {
    const fill = queueFill([4294967295, 0, 26, 52, 62]);
    expect(generatePassword(FOUR_SETS, { fill })).toBe("Aa0!");
    expect(fill.calls).toBe(5);
  });

  it("single-set options accept on the first attempt", () => {
    const fill = queueFill([0, 1, 2, 3]);
    const opts: PasswordOptions = {
      ...FOUR_SETS,
      lowercase: false,
      digits: false,
      symbols: false,
    };
    expect(generatePassword(opts, { fill })).toBe("ABCD");
    expect(fill.calls).toBe(4);
  });

  it("exhaustion: a fill stuck at index 0 throws GenerationExhaustedError after exactly 10,000 attempts and never returns a non-compliant password (D-03)", () => {
    const fill = constantFill(0);
    let caught: unknown;
    let returned: string | undefined;
    try {
      returned = generatePassword(FOUR_SETS, { fill });
    } catch (error) {
      caught = error;
    }
    expect(returned).toBeUndefined();
    expect(caught).toBeInstanceOf(GenerationExhaustedError);
    const error = caught as GenerationExhaustedError;
    expect(error.name).toBe("GenerationExhaustedError");
    expect(error.attempts).toBe(MAX_GENERATION_ATTEMPTS);
    expect(fill.calls).toBe(40000);
    expect(error.message).not.toContain("AAAA");
    expect(JSON.stringify(error)).not.toContain("AAAA");
    for (const value of Object.values(error)) {
      expect(String(value)).not.toContain("AAAA");
    }
  });

  it("the library re-normalizes hostile caller options (D-04)", () => {
    const hostile = (o: unknown) => o as PasswordOptions;
    expect(
      generatePassword(hostile({ ...DEFAULT_OPTIONS, length: 1e9 })),
    ).toHaveLength(128);
    expect(
      generatePassword(hostile({ ...DEFAULT_OPTIONS, length: NaN })),
    ).toHaveLength(20);
    const allOff = generatePassword(
      hostile({
        ...DEFAULT_OPTIONS,
        uppercase: false,
        lowercase: false,
        digits: false,
        symbols: false,
      }),
    );
    expect(/[A-Z]/.test(allOff)).toBe(true);
    expect(/[a-z]/.test(allOff)).toBe(true);
    expect(/[0-9]/.test(allOff)).toBe(true);
    expect([...allOff].some((ch) => DEFAULT_SYMBOLS.includes(ch))).toBe(true);
    const symbolsOnly = generatePassword(
      hostile({
        length: 30,
        uppercase: false,
        lowercase: false,
        digits: false,
        symbols: true,
        symbolSet: "abc",
      }),
    );
    for (const ch of symbolsOnly)
      expect(DEFAULT_SYMBOLS.includes(ch)).toBe(true);
  });

  it("Edge (PWD-04, adjacency): length equal to the number of enabled sets still succeeds with each set exactly once", () => {
    for (let i = 0; i < 100; i++) {
      const pw = generatePassword(FOUR_SETS);
      expect(pw).toHaveLength(4);
      for (const set of [UPPERCASE, LOWERCASE, DIGITS, DEFAULT_SYMBOLS]) {
        expect([...pw].filter((ch) => set.includes(ch))).toHaveLength(1);
      }
    }
  });

  fcIt.prop([fc.integer({ min: LENGTH_MIN, max: LENGTH_MAX })], {
    numRuns: 100,
  })(
    "Edge (PWD-04, encoding): Array.from(pw).length === pw.length === length and every char code is in 0x21-0x7E",
    (length) => {
      const pw = generatePassword({ ...DEFAULT_OPTIONS, length });
      expect(Array.from(pw)).toHaveLength(length);
      expect(pw).toHaveLength(length);
      for (let i = 0; i < pw.length; i++) {
        const code = pw.charCodeAt(i);
        expect(code).toBeGreaterThanOrEqual(0x21);
        expect(code).toBeLessThanOrEqual(0x7e);
      }
    },
  );

  it("Edge (PWD-04, ordering): equal queued fills produce equal passwords", () => {
    const a = generatePassword(FOUR_SETS, { fill: queueFill([0, 26, 52, 62]) });
    const b = generatePassword(FOUR_SETS, { fill: queueFill([0, 26, 52, 62]) });
    expect(a).toBe("Aa0!");
    expect(a).toBe(b);
  });
});

describe("generateBatch (D-04)", () => {
  it("20 x 128-character all-set passwords through a recording wrapper around real Web Crypto: all valid, every fill request at most 65,536 bytes (D-02 tracer)", () => {
    const fill = recordingFill((b) => crypto.getRandomValues(b));
    const batch = generateBatch(
      { ...DEFAULT_OPTIONS, length: LENGTH_MAX },
      BATCH_MAX,
      {
        fill,
      },
    );
    expect(batch).toHaveLength(20);
    for (const pw of batch) {
      expect(pw).toHaveLength(128);
      for (const set of [UPPERCASE, LOWERCASE, DIGITS, DEFAULT_SYMBOLS]) {
        expect([...pw].some((ch) => set.includes(ch))).toBe(true);
      }
    }
    expect(fill.requestedBytes.every((bytes) => bytes === 4)).toBe(true);
    expect(Math.max(...fill.requestedBytes)).toBeLessThanOrEqual(
      MAX_FILL_BYTES,
    );
    expect(fill.calls).toBeGreaterThanOrEqual(20 * 128);
  });

  it.each([
    [Number.NaN, 1],
    [-5, 1],
    [0, 1],
    [Number.POSITIVE_INFINITY, 1],
    ["5" as unknown as number, 1],
    [3.9, 3],
    [20, 20],
    [21, 20],
  ])("count is clamped totally: %s gives %s", (count, expected) => {
    const batch = generateBatch(DEFAULT_OPTIONS, count);
    expect(batch).toHaveLength(expected);
  });

  it("deterministic batch: uppercase only, length 4, queued fills give exactly ABCD and EFGH", () => {
    const opts: PasswordOptions = {
      ...DEFAULT_OPTIONS,
      length: 4,
      uppercase: true,
      lowercase: false,
      digits: false,
      symbols: false,
    };
    const batch = generateBatch(opts, 2, {
      fill: queueFill([0, 1, 2, 3, 4, 5, 6, 7]),
    });
    expect(batch).toEqual(["ABCD", "EFGH"]);
  });

  it("batch elements are independent draws: 20 default passwords are pairwise distinct", () => {
    const batch = generateBatch(DEFAULT_OPTIONS, 20);
    expect(new Set(batch).size).toBe(20);
  });
});
