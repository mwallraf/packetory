import {
  normalizePassphraseOptions,
  normalizePasswordOptions,
  resolveAlphabet,
} from "./charset";
import {
  APPEND_NUMBER_BITS,
  BITS_PER_WORD,
  STRENGTH_THRESHOLDS,
} from "./constants";
import type {
  PassphraseOptions,
  PasswordOptions,
  StrengthLevel,
} from "./types";

/**
 * Strength figures, computed from settings only (D-14). Nothing here accepts or
 * reads a generated string, so the numbers are stable across Regenerate.
 *
 * Password entropy describes the uniform-over-valid-strings distribution that
 * generatePassword's whole-password resampling produces (D-15), so it is honest
 * at short lengths: it never exceeds log2 of the number of strings the
 * generator can actually output.
 */

/**
 * log2 of a positive bigint without converting the whole value to a double
 * (which would overflow past 2^1024). Keeps the top 53 bits, so the result is
 * exact for powers of two.
 */
export function log2Big(n: bigint): number {
  if (n < 1n) {
    throw new RangeError("log2Big requires n >= 1");
  }
  const bitLength = n.toString(2).length;
  if (bitLength <= 53) {
    return Math.log2(Number(n));
  }
  const shift = bitLength - 53;
  return shift + Math.log2(Number(n >> BigInt(shift)));
}

/**
 * Exact count of length-`length` strings over the union of the (disjoint) sets
 * that contain at least one character from every set, by inclusion-exclusion:
 * sum over subsets S of (-1)^|S| * (N - sum(S))^length.
 */
export function validPasswordCount(
  setSizes: readonly number[],
  length: number,
): bigint {
  const total = setSizes.reduce((a, b) => a + b, 0);
  const L = BigInt(length);
  const k = setSizes.length;
  let count = 0n;
  for (let mask = 0; mask < 1 << k; mask++) {
    let removed = 0;
    let bits = 0;
    for (let i = 0; i < k; i++) {
      if (mask & (1 << i)) {
        removed += setSizes[i];
        bits++;
      }
    }
    const term = BigInt(total - removed) ** L;
    count += bits % 2 === 0 ? term : -term;
  }
  return count;
}

function resolvedSizesAndLength(opts: PasswordOptions): {
  sizes: number[];
  length: number;
} {
  const { sets } = resolveAlphabet(opts);
  const { length } = normalizePasswordOptions(opts);
  return { sizes: sets.map((s) => s.length), length };
}

export function passwordEntropyBits(opts: PasswordOptions): number {
  const { sizes, length } = resolvedSizesAndLength(opts);
  return log2Big(validPasswordCount(sizes, length));
}

export function passphraseEntropyBits(opts: PassphraseOptions): number {
  const { words, appendNumber } = normalizePassphraseOptions(opts);
  return words * BITS_PER_WORD + (appendNumber ? APPEND_NUMBER_BITS : 0);
}

/**
 * Probability that one uniformly random string over the whole pool contains
 * every enabled set. Drives the analytic proof that MAX_GENERATION_ATTEMPTS
 * essentially never exhausts (D-03). Exact to 2^-53; exactly 1 when every
 * string is valid.
 */
export function acceptanceProbability(opts: PasswordOptions): number {
  const { sizes, length } = resolvedSizesAndLength(opts);
  const valid = validPasswordCount(sizes, length);
  const total = BigInt(sizes.reduce((a, b) => a + b, 0)) ** BigInt(length);
  return Number((valid << 53n) / total) / 2 ** 53;
}

/** Label from the raw bits, never a rounded value (D-16). NaN is "weak". */
export function strengthLevel(bits: number): StrengthLevel {
  if (bits >= STRENGTH_THRESHOLDS.veryStrong) return "veryStrong";
  if (bits >= STRENGTH_THRESHOLDS.strong) return "strong";
  if (bits >= STRENGTH_THRESHOLDS.fair) return "fair";
  return "weak";
}

/** Floors, so the displayed figure never overstates the real one (D-16). */
export function formatBits(bits: number): string {
  return `${Number.isFinite(bits) && bits > 0 ? Math.floor(bits) : 0} bits`;
}
