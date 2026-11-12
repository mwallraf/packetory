import { afterEach, describe, expect, it, vi } from "vitest";
import * as barrel from "./index";

const exportsByName = barrel as unknown as Record<string, unknown>;

const CLOSE: ReadonlyArray<[string, number]> = [
  ["BITS_PER_WORD", 12.9248],
  ["APPEND_NUMBER_BITS", 3.3219],
];

const EXACT: ReadonlyArray<[string, unknown]> = [
  ["LENGTH_MIN", 4],
  ["LENGTH_MAX", 128],
  ["LENGTH_DEFAULT", 20],
  ["WORDS_MIN", 3],
  ["WORDS_MAX", 20],
  ["WORDS_DEFAULT", 6],
  ["BATCH_MIN", 1],
  ["BATCH_MAX", 20],
  ["BATCH_DEFAULT", 1],
  ["UPPERCASE", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
  ["LOWERCASE", "abcdefghijklmnopqrstuvwxyz"],
  ["DIGITS", "0123456789"],
  ["UPPERCASE_SIZE", 26],
  ["LOWERCASE_SIZE", 26],
  ["DIGITS_SIZE", 10],
  ["DEFAULT_SYMBOLS", "!@#$%^&*()-_=+[]{};:,.?"],
  ["DEFAULT_SYMBOLS_SIZE", 23],
  ["DEFAULT_POOL_SIZE", 85],
  ["SYMBOL_SET_MAX", 32],
  ["LOOK_ALIKES", "0Oo1lI|"],
  ["MAX_GENERATION_ATTEMPTS", 10_000],
  ["MAX_FILL_BYTES", 65_536],
  ["STRENGTH_THRESHOLDS", { fair: 40, strong: 75, veryStrong: 100 }],
  ["GUESS_RATES", { fast: 1e10, slow: 1e4 }],
  ["SECONDS_PER_YEAR", 31_557_600],
  ["EFF_WORD_COUNT", 7776],
  ["EFF_HYPHENATED_WORDS", ["drop-down", "felt-tip", "t-shirt", "yo-yo"]],
  ["EFF_HYPHENATED_WORD_COUNT", 4],
  ["SEPARATORS", ["-", "_", ".", " "]],
  ["MODES", ["password", "passphrase"]],
  ["MAX_SEARCH_LENGTH", 2048],
  ["MAX_SYMBOLS_PARAM_LENGTH", 64],
  [
    "PASSWORD_URL_KEYS",
    ["mode", "len", "u", "l", "d", "s", "sym", "amb", "words", "sep", "cap", "num", "n"],
  ],
  ["SEPARATOR_TOKENS", { "-": "dash", _: "underscore", ".": "dot", " ": "space" }],
];

const FUNCTIONS = [
  "randomInt",
  "resolveFill",
  "clampInt",
  "clampBatchCount",
  "normalizeSymbols",
  "normalizePasswordOptions",
  "normalizePassphraseOptions",
  "normalizeToolOptions",
  "resolveAlphabet",
  "generatePassword",
  "generateBatch",
  "generatePassphrase",
  "generatePassphraseBatch",
  "log2Big",
  "validPasswordCount",
  "passwordEntropyBits",
  "passphraseEntropyBits",
  "acceptanceProbability",
  "strengthLevel",
  "formatBits",
  "crackTimeLog10Seconds",
  "formatCrackTime",
  "parseOptions",
  "serializeOptions",
  "CryptoUnavailableError",
  "GenerationExhaustedError",
  "WordlistIntegrityError",
];

const ABSENT = [
  "loadWordlist",
  "createWordlistLoader",
  "queueFill",
  "constantFill",
  "recordingFill",
  "default",
];

describe("barrel surface (D-18)", () => {
  it.each(EXACT)("exports %s with its exact value", (name, expected) => {
    expect(name in exportsByName).toBe(true);
    expect(exportsByName[name]).toEqual(expected);
  });

  it.each(CLOSE)("exports %s close to %d", (name, expected) => {
    expect(exportsByName[name] as number).toBeCloseTo(expected, 3);
  });

  it.each(["DEFAULT_OPTIONS", "BITS_PER_WORD", "APPEND_NUMBER_BITS", "STRENGTH_LABELS", "GUESS_RATE_LABELS"])(
    "exports %s",
    (name) => {
      expect(name in exportsByName).toBe(true);
    },
  );

  it.each(FUNCTIONS)("exports %s as a function or class", (name) => {
    expect(typeof exportsByName[name]).toBe("function");
  });

  it.each(ABSENT)("does not export %s", (name) => {
    expect(name in exportsByName).toBe(false);
  });

  it("exposes no 7,776-element array and no string over 10,000 characters", () => {
    for (const value of Object.values(barrel)) {
      if (typeof value === "string") expect(value.length).toBeLessThanOrEqual(10_000);
      if (Array.isArray(value)) expect(value.length).not.toBe(7776);
    }
  });

  it("freezes the shared option, threshold, rate and key tables", () => {
    for (const table of [
      barrel.DEFAULT_OPTIONS,
      barrel.STRENGTH_THRESHOLDS,
      barrel.GUESS_RATES,
      barrel.PASSWORD_URL_KEYS,
    ]) {
      expect(Object.isFrozen(table)).toBe(true);
    }
  });

  it("keeps error names stable", () => {
    expect(new barrel.CryptoUnavailableError().name).toBe("CryptoUnavailableError");
    expect(new barrel.GenerationExhaustedError(3).name).toBe("GenerationExhaustedError");
    expect(new barrel.WordlistIntegrityError(7776, 3).name).toBe("WordlistIntegrityError");
  });
});

describe("import-time silence (D-04)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("importing the barrel in a fresh module graph draws no randomness", async () => {
    vi.resetModules();
    const webCrypto = vi.spyOn(globalThis.crypto, "getRandomValues");
    const mathRandom = vi.spyOn(Math, "random");
    const fresh = await import("./index");
    expect(typeof fresh.generatePassword).toBe("function");
    expect(webCrypto).toHaveBeenCalledTimes(0);
    expect(mathRandom).toHaveBeenCalledTimes(0);
  });
});
