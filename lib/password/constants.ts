import type {
  GuessRateKey,
  Mode,
  Separator,
  StrengthLevel,
  ToolOptions,
} from "./types";

/**
 * Single source of every bound, default and FAQ-facing number for the
 * password tool. The UI, the URL parser and the Phase 14 FAQ import from here
 * instead of restating numbers. The REQUIREMENTS.md STR-02 example of
 * "84 chars" is superseded by `DEFAULT_POOL_SIZE` (85).
 */

export const LENGTH_MIN = 4;
export const LENGTH_MAX = 128;
export const LENGTH_DEFAULT = 20;

export const WORDS_MIN = 3;
export const WORDS_MAX = 20;
export const WORDS_DEFAULT = 6;

export const BATCH_MIN = 1;
export const BATCH_MAX = 20;
export const BATCH_DEFAULT = 1;

export const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
export const DIGITS = "0123456789";

export const UPPERCASE_SIZE = 26;
export const LOWERCASE_SIZE = 26;
export const DIGITS_SIZE = 10;

export const DEFAULT_SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";
export const DEFAULT_SYMBOLS_SIZE = 23;
export const DEFAULT_POOL_SIZE = 85;

export const SYMBOL_SET_MAX = 32;
export const LOOK_ALIKES = "0Oo1lI|";

export const MAX_GENERATION_ATTEMPTS = 10_000;
export const MAX_FILL_BYTES = 65_536;

export const STRENGTH_THRESHOLDS = Object.freeze({
  fair: 40,
  strong: 75,
  veryStrong: 100,
});

export const STRENGTH_LABELS: Readonly<Record<StrengthLevel, string>> =
  Object.freeze({
    weak: "Weak",
    fair: "Fair",
    strong: "Strong",
    veryStrong: "Very strong",
  });

export const GUESS_RATES = Object.freeze({ fast: 1e10, slow: 1e4 });

export const GUESS_RATE_LABELS: Readonly<Record<GuessRateKey, string>> =
  Object.freeze({
    fast: "Fast hash, offline attack: 10 billion guesses per second",
    slow: "Slow hash (bcrypt-style, cost about 10, one modern GPU): 10 thousand guesses per second",
  });

export const SECONDS_PER_YEAR = 31_557_600;

export const EFF_WORD_COUNT = 7776;
export const BITS_PER_WORD = Math.log2(EFF_WORD_COUNT);
export const APPEND_NUMBER_BITS = Math.log2(10);

export const EFF_HYPHENATED_WORDS: readonly string[] = Object.freeze([
  "drop-down",
  "felt-tip",
  "t-shirt",
  "yo-yo",
]);
export const EFF_HYPHENATED_WORD_COUNT = 4;

export const SEPARATORS: readonly Separator[] = Object.freeze([
  "-",
  "_",
  ".",
  " ",
] as Separator[]);

export const MODES: readonly Mode[] = Object.freeze([
  "password",
  "passphrase",
] as Mode[]);

export const DEFAULT_OPTIONS: Readonly<ToolOptions> = Object.freeze({
  mode: "password",
  length: LENGTH_DEFAULT,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  symbolSet: DEFAULT_SYMBOLS,
  avoidLookalikes: false,
  words: WORDS_DEFAULT,
  separator: "-",
  capitalize: false,
  appendNumber: false,
  batch: BATCH_DEFAULT,
} satisfies ToolOptions);
