/**
 * Shared types for the password library (framework-agnostic; types only, no
 * runtime code). The field names of `PasswordOptions`, `PassphraseOptions`
 * and `ToolOptions` are the cross-phase contract the UI and URL codec import.
 */

export type Mode = "password" | "passphrase";

export type Separator = "-" | "_" | "." | " ";

export type StrengthLevel = "weak" | "fair" | "strong" | "veryStrong";

export type GuessRateKey = "fast" | "slow";

/**
 * The injectable randomness seam (D-02). It fills the passed buffer in place
 * and returns it, exactly like the Web Crypto fill method.
 */
export type RandomFill = (buf: Uint32Array) => Uint32Array;

export type RandomOptions = { fill?: RandomFill };

export type PasswordOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  symbolSet: string;
  avoidLookalikes: boolean;
};

export type PassphraseOptions = {
  words: number;
  separator: Separator;
  capitalize: boolean;
  appendNumber: boolean;
};

export interface ToolOptions extends PasswordOptions, PassphraseOptions {
  mode: Mode;
  batch: number;
}

export type Alphabet = {
  sets: readonly string[];
  pool: string;
  poolSize: number;
};
