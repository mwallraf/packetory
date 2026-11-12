import {
  BATCH_DEFAULT,
  BATCH_MAX,
  BATCH_MIN,
  DEFAULT_OPTIONS,
  DEFAULT_SYMBOLS,
  DIGITS,
  LENGTH_DEFAULT,
  LENGTH_MAX,
  LENGTH_MIN,
  LOOK_ALIKES,
  LOWERCASE,
  MODES,
  SEPARATORS,
  SYMBOL_SET_MAX,
  UPPERCASE,
  WORDS_DEFAULT,
  WORDS_MAX,
  WORDS_MIN,
} from "./constants";
import type {
  Alphabet,
  Mode,
  PassphraseOptions,
  PasswordOptions,
  Separator,
  ToolOptions,
} from "./types";

/**
 * The trust boundary of the library: it does not trust its caller, so every
 * option object (UI state, URL-derived values, hostile input) is
 * re-normalized here into a fresh, total, in-range object. Normalizers never
 * spread or copy input keys, so unknown keys cannot leak through.
 */

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Total, NaN-safe integer clamp: non-numbers and non-finite numbers give
 * `fallback`; everything else is truncated and clamped into [min, max].
 */
export function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function isAlphanumeric(code: number): boolean {
  return (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a)
  );
}

/**
 * Normalizes a custom symbol set (D-07): keeps only printable ASCII
 * (0x21-0x7E) that is not a letter or digit, de-duplicated in first-seen
 * order (never sorted), capped at `SYMBOL_SET_MAX`; an empty result restores
 * `DEFAULT_SYMBOLS`. Excluding letters and digits is narrower than the
 * literal "printable ASCII" of PWD-05 on purpose: it keeps the four character
 * sets pairwise disjoint, so no character counts toward two sets.
 */
export function normalizeSymbols(input: unknown): string {
  if (typeof input !== "string") {
    return DEFAULT_SYMBOLS;
  }
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const ch of input) {
    if (ch.length !== 1) continue;
    const code = ch.charCodeAt(0);
    if (code < 0x21 || code > 0x7e || isAlphanumeric(code) || seen.has(ch)) {
      continue;
    }
    seen.add(ch);
    kept.push(ch);
    if (kept.length >= SYMBOL_SET_MAX) break;
  }
  return kept.length === 0 ? DEFAULT_SYMBOLS : kept.join("");
}

export function normalizePasswordOptions(input: unknown): PasswordOptions {
  const o = asRecord(input);
  let uppercase = asBoolean(o.uppercase, DEFAULT_OPTIONS.uppercase);
  let lowercase = asBoolean(o.lowercase, DEFAULT_OPTIONS.lowercase);
  let digits = asBoolean(o.digits, DEFAULT_OPTIONS.digits);
  let symbols = asBoolean(o.symbols, DEFAULT_OPTIONS.symbols);
  if (!uppercase && !lowercase && !digits && !symbols) {
    // D-09: an all-off selection can never generate; restore every set.
    uppercase = lowercase = digits = symbols = true;
  }
  return {
    length: clampInt(o.length, LENGTH_MIN, LENGTH_MAX, LENGTH_DEFAULT),
    uppercase,
    lowercase,
    digits,
    symbols,
    symbolSet: normalizeSymbols(o.symbolSet),
    avoidLookalikes: asBoolean(
      o.avoidLookalikes,
      DEFAULT_OPTIONS.avoidLookalikes,
    ),
  };
}

export function normalizePassphraseOptions(input: unknown): PassphraseOptions {
  const o = asRecord(input);
  const separator = (SEPARATORS as readonly unknown[]).includes(o.separator)
    ? (o.separator as Separator)
    : DEFAULT_OPTIONS.separator;
  return {
    words: clampInt(o.words, WORDS_MIN, WORDS_MAX, WORDS_DEFAULT),
    separator,
    capitalize: asBoolean(o.capitalize, false),
    appendNumber: asBoolean(o.appendNumber, false),
  };
}

/** Clamps a batch count to [BATCH_MIN, BATCH_MAX]; total and NaN-safe. */
export function clampBatchCount(count: unknown): number {
  return clampInt(count, BATCH_MIN, BATCH_MAX, BATCH_DEFAULT);
}

export function normalizeToolOptions(input: unknown): ToolOptions {
  const o = asRecord(input);
  const mode = (MODES as readonly unknown[]).includes(o.mode)
    ? (o.mode as Mode)
    : DEFAULT_OPTIONS.mode;
  return {
    mode,
    ...normalizePasswordOptions(input),
    ...normalizePassphraseOptions(input),
    batch: clampBatchCount(o.batch),
  };
}

function stripLookAlikes(chars: string): string {
  let out = "";
  for (const ch of chars) {
    if (!LOOK_ALIKES.includes(ch)) out += ch;
  }
  return out;
}

/**
 * The single pipeline from options to the alphabet (D-08): generation,
 * entropy and the URL codec all read this output, never `symbolSet` or
 * `DEFAULT_SYMBOLS` directly. Sets are ordered uppercase, lowercase, digits,
 * symbols (filtered by flags); the pool is their concatenation. With
 * `avoidLookalikes`, `LOOK_ALIKES` are removed from every set before the pool
 * is built, and a symbol set emptied that way falls back to `DEFAULT_SYMBOLS`
 * minus look-alikes (D-09).
 */
export function resolveAlphabet(input: unknown): Alphabet {
  const o = normalizePasswordOptions(input);
  const candidates: string[] = [];
  if (o.uppercase) candidates.push(UPPERCASE);
  if (o.lowercase) candidates.push(LOWERCASE);
  if (o.digits) candidates.push(DIGITS);
  if (o.symbols) candidates.push(o.symbolSet);

  const sets = candidates.map((set, index) => {
    if (!o.avoidLookalikes) return set;
    const isSymbols = o.symbols && index === candidates.length - 1;
    const stripped = stripLookAlikes(set);
    if (isSymbols && stripped.length === 0) {
      return stripLookAlikes(DEFAULT_SYMBOLS);
    }
    return stripped;
  });

  const pool = sets.join("");
  return Object.freeze({
    sets: Object.freeze(sets),
    pool,
    poolSize: pool.length,
  });
}
