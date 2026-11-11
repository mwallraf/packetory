import { resolveAlphabet, normalizePasswordOptions } from "./charset";
import { MAX_GENERATION_ATTEMPTS } from "./constants";
import { GenerationExhaustedError } from "./errors";
import { randomInt } from "./random";
import type { PasswordOptions, RandomOptions } from "./types";

/**
 * Generates one password (PWD-04). The options are re-normalized here (the
 * library does not trust its caller, D-04), so any input yields a valid
 * password. Every character is `pool[randomInt(pool.length)]`. The "at least
 * one character of every enabled set" rule is enforced by whole-password
 * resampling only (D-03): a candidate missing a set is discarded entirely and
 * a fresh one drawn. No position is ever patched, no required characters are
 * chosen first and nothing is shuffled, which yields the uniform distribution
 * over valid strings that the exact entropy calculation describes.
 *
 * After `MAX_GENERATION_ATTEMPTS` failed candidates it throws
 * `GenerationExhaustedError` (carrying only the attempt count), never a
 * non-compliant password.
 */
export function generatePassword(
  opts: PasswordOptions,
  options: RandomOptions = {},
): string {
  const norm = normalizePasswordOptions(opts);
  const { sets, pool } = resolveAlphabet(norm);
  const fill = options?.fill;

  const setIndex = new Map<string, number>();
  sets.forEach((set, index) => {
    for (const ch of set) setIndex.set(ch, index);
  });
  const fullMask = (1 << sets.length) - 1;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    let candidate = "";
    let seen = 0;
    for (let i = 0; i < norm.length; i++) {
      const ch = pool[randomInt(pool.length, fill)]!;
      seen |= 1 << setIndex.get(ch)!;
      candidate += ch;
    }
    if (seen === fullMask) {
      return candidate;
    }
  }
  throw new GenerationExhaustedError(MAX_GENERATION_ATTEMPTS);
}
