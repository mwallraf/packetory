import { normalizePassphraseOptions, clampBatchCount } from "./charset";
import { EFF_WORD_COUNT } from "./constants";
import { WordlistIntegrityError } from "./errors";
import { randomInt } from "./random";
import type { PassphraseOptions, RandomOptions } from "./types";

/**
 * Passphrase generator (D-13). Every word index is `randomInt(7776)` and the
 * optional digit is `randomInt(10)`, so both go through the same
 * rejection-sampled, unbiased sampler. Words are drawn with replacement.
 * Capitalize and the separator add 0 bits; the appended digit adds exactly
 * log2(10) and its position is fixed (the D-14 figures in the entropy
 * module). The list is a parameter so loading stays separate (see the
 * wordlist loader); a list that is not exactly 7,776 entries is refused
 * before any random draw.
 */
export function generatePassphrase(
  opts: PassphraseOptions,
  words: readonly string[],
  options: RandomOptions = {},
): string {
  if (!Array.isArray(words) || words.length !== EFF_WORD_COUNT) {
    throw new WordlistIntegrityError(
      EFF_WORD_COUNT,
      Array.isArray(words) ? words.length : 0,
    );
  }
  const o = normalizePassphraseOptions(opts);
  const chosen: string[] = [];
  for (let i = 0; i < o.words; i++) {
    chosen.push(words[randomInt(EFF_WORD_COUNT, options?.fill)]!);
  }
  const cased = o.capitalize
    ? chosen.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    : chosen;
  if (o.appendNumber) {
    const digit = randomInt(10, options?.fill);
    cased[cased.length - 1] = `${cased[cased.length - 1]}${digit}`;
  }
  return cased.join(o.separator);
}

export function generatePassphraseBatch(
  opts: PassphraseOptions,
  words: readonly string[],
  count: number,
  options: RandomOptions = {},
): string[] {
  return Array.from({ length: clampBatchCount(count) }, () =>
    generatePassphrase(opts, words, options),
  );
}
