import { describe, expect, it } from "vitest";
import { resolveAlphabet } from "./charset";
import {
  DEFAULT_OPTIONS,
  DEFAULT_POOL_SIZE,
  DEFAULT_SYMBOLS,
  DIGITS,
  LOWERCASE,
  UPPERCASE,
} from "./constants";
import { generatePassword } from "./generate";

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
