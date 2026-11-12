import {
  APPEND_NUMBER_BITS,
  BITS_PER_WORD,
  DEFAULT_OPTIONS,
  DEFAULT_POOL_SIZE,
  DEFAULT_SYMBOLS_SIZE,
  DIGITS_SIZE,
  EFF_HYPHENATED_WORDS,
  EFF_HYPHENATED_WORD_COUNT,
  EFF_WORD_COUNT,
  GUESS_RATES,
  GUESS_RATE_LABELS,
  LENGTH_DEFAULT,
  LOWERCASE_SIZE,
  STRENGTH_LABELS,
  STRENGTH_THRESHOLDS,
  UPPERCASE_SIZE,
  WORDS_DEFAULT,
  crackTimeLog10Seconds,
  formatBits,
  formatCrackTime,
  passphraseEntropyBits,
  passwordEntropyBits,
  strengthLevel,
} from "@/lib/password";

/**
 * Single source of truth for the Password page's FAQ content (PREG-02, D-14).
 * `ToolAbout` maps over `faqItems` for both the visible FAQ prose and the
 * FAQPage JSON-LD, so structured data and on-screen content cannot drift.
 *
 * Copy rules:
 * - Every number is a template expression over `@/lib/password` constants or
 *   functions; nothing is restated as a literal (D-14).
 * - Answers are plain strings with no JSX and no links, so the JSON-LD text
 *   equals the rendered text.
 * - Q5 (privacy) and Q6 (clipboard) are the D-15 drafts, human-gated: they are
 *   pinned by an exact-equality test and need explicit approval at the batched
 *   milestone UAT. Any change is a copy-only edit here. They must not promise
 *   auto-clear or any clipboard clearing (rejected in Phase 13).
 * - The hyphenated-word answer must stay honest: it says "no practical
 *   effect" and never claims the effect is exactly zero.
 */

export type FaqItem = {
  question: string;
  answer: string;
};

/**
 * Crack-time phrasing: "about {t}" unless `t` already reads "less than ..." or
 * "more than ..." (UI-SPEC, so no "about more than").
 */
export function aboutTime(t: string): string {
  return /^(less|more) than\b/.test(t) ? t : `about ${t}`;
}

/** "a, b, c and d" */
export function joinList(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const passwordBits = passwordEntropyBits(DEFAULT_OPTIONS);
const passphraseBits = passphraseEntropyBits(DEFAULT_OPTIONS);
const passphraseWithNumberBits = passphraseEntropyBits({
  ...DEFAULT_OPTIONS,
  appendNumber: true,
});

/**
 * The default-state figures, computed once from the library. The worked example
 * (PasswordExample) shares these so the About prose and the FAQ cannot differ.
 */
export const defaultFigures = {
  passwordBits,
  passwordLabel: STRENGTH_LABELS[strengthLevel(passwordBits)],
  passwordFast: formatCrackTime(
    crackTimeLog10Seconds(passwordBits, GUESS_RATES.fast),
  ),
  passwordSlow: formatCrackTime(
    crackTimeLog10Seconds(passwordBits, GUESS_RATES.slow),
  ),
  passphraseBits,
  passphraseLabel: STRENGTH_LABELS[strengthLevel(passphraseBits)],
  passphraseFast: formatCrackTime(
    crackTimeLog10Seconds(passphraseBits, GUESS_RATES.fast),
  ),
  passphraseSlow: formatCrackTime(
    crackTimeLog10Seconds(passphraseBits, GUESS_RATES.slow),
  ),
  passphraseWithNumberBits,
};

const wordCount = EFF_WORD_COUNT.toLocaleString("en-US");
const bitsPerWord = BITS_PER_WORD.toFixed(1);
const appendBits = APPEND_NUMBER_BITS.toFixed(1);
const f = defaultFigures;

export const faqItems: FaqItem[] = [
  {
    question: "How strong is the default password?",
    answer: `The default password is ${LENGTH_DEFAULT} characters drawn from a ${DEFAULT_POOL_SIZE}-character pool: ${UPPERCASE_SIZE} uppercase letters, ${LOWERCASE_SIZE} lowercase letters, ${DIGITS_SIZE} digits and ${DEFAULT_SYMBOLS_SIZE} symbols. Requiring at least one character from each set leaves about ${formatBits(f.passwordBits)} of entropy, which is labelled ${f.passwordLabel}. On average it would take ${f.passwordFast} to crack with a fast hash, and ${f.passwordSlow} with a slow hash.`,
  },
  {
    question: "How are passphrases generated?",
    answer: `Each word is picked uniformly at random, with replacement, from the ${wordCount}-word EFF Large Wordlist using your browser's cryptographically secure random number generator (the Web Crypto API), so each word adds about ${bitsPerWord} bits. The default ${WORDS_DEFAULT} words give about ${formatBits(f.passphraseBits)} (${f.passphraseLabel}). Capitalizing words and the choice of separator add 0 bits, because they follow a fixed pattern. Appending a random digit adds about ${appendBits} bits.`,
  },
  {
    question: "Why does the word list contain hyphenated words?",
    answer: `The EFF Large Wordlist is used unmodified, and ${EFF_HYPHENATED_WORD_COUNT} of its words contain a hyphen: ${joinList(EFF_HYPHENATED_WORDS)}. With the - separator, a passphrase containing one of them can look as if it has an extra word boundary. This has no practical effect on strength, because the estimate counts whole words picked from the full list. If you want word boundaries to stay unambiguous, choose _, . or Space as the separator.`,
  },
  {
    question: "How are strength and crack time estimated?",
    answer: `Strength is computed from your settings, not from the generated result, and it assumes an attacker who knows those settings. Below ${STRENGTH_THRESHOLDS.fair} bits is ${STRENGTH_LABELS.weak}, ${STRENGTH_THRESHOLDS.fair} to ${STRENGTH_THRESHOLDS.strong - 1} is ${STRENGTH_LABELS.fair}, ${STRENGTH_THRESHOLDS.strong} to ${STRENGTH_THRESHOLDS.veryStrong - 1} is ${STRENGTH_LABELS.strong} and ${STRENGTH_THRESHOLDS.veryStrong} or more is ${STRENGTH_LABELS.veryStrong}. The crack time is the average time needed to search half of all possible results at one of two stated rates. ${GUESS_RATE_LABELS.fast}. ${GUESS_RATE_LABELS.slow}.`,
  },
  {
    question: "Is my password sent anywhere or saved?",
    answer:
      "No. Passwords and passphrases are generated in this browser tab with the Web Crypto API and are never sent to a server, written to the address bar, or saved. Only your options (length, character sets, word count and so on) appear in the URL, so you can bookmark them.",
  },
  {
    question: "Does Packetory clear my clipboard?",
    answer:
      "No. A copied password sits in your system clipboard like anything else you copy, and your operating system or a clipboard-manager extension may keep it in a clipboard history that this page cannot see or clear. Paste it straight into your password manager, then copy something else or clear your clipboard history if that matters to you.",
  },
];
