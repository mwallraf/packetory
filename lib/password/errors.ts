/**
 * Typed errors for the password library. None of them carries generated or
 * candidate characters: only counts and fixed prose (R6).
 */

export class CryptoUnavailableError extends Error {
  override readonly name = "CryptoUnavailableError";

  constructor() {
    super(
      "Web Crypto is unavailable in this environment, so no secure random value can be generated.",
    );
  }
}

export class GenerationExhaustedError extends Error {
  override readonly name = "GenerationExhaustedError";
  readonly attempts: number;

  constructor(attempts: number) {
    super(
      `No password containing every enabled character set was found in ${attempts} attempts.`,
    );
    this.attempts = attempts;
  }
}

export class WordlistIntegrityError extends Error {
  override readonly name = "WordlistIntegrityError";
  readonly expected: number;
  readonly received: number;

  constructor(expected: number, received: number) {
    super(`Expected a ${expected}-word list, received ${received} words.`);
    this.expected = expected;
    this.received = received;
  }
}
