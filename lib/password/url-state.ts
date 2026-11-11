import { normalizeSymbols, normalizeToolOptions } from "./charset";
import { DEFAULT_OPTIONS, DEFAULT_SYMBOLS, MODES, SEPARATORS } from "./constants";
import type { Mode, Separator, ToolOptions } from "./types";

/**
 * URL options codec (D-19..D-22). Pure and total: it never touches a browser
 * global (Phase 13 does the address-bar write) and never uses a `#` fragment.
 *
 * The URL carries options only, never generated output (POUT-03). The
 * signature of `serializeOptions` takes only `ToolOptions`, and the tests
 * prove that at type level. Every field is a bounded enum, a bounded number or
 * a normalized symbol set of at most 32 characters, so nothing the user (or an
 * attacker) puts in a link can become a password, and nothing generated can
 * leave through the query.
 *
 * `serializeOptions` returns "" for defaults and "k=v&..." otherwise, with no
 * leading "?"; `parseOptions` accepts both forms and strips one leading "?".
 */

/** Whitelisted keys, also the fixed serialization order. */
export const PASSWORD_URL_KEYS = Object.freeze([
  "mode",
  "len",
  "u",
  "l",
  "d",
  "s",
  "sym",
  "amb",
  "words",
  "sep",
  "cap",
  "num",
  "n",
] as const);

export const SEPARATOR_TOKENS: Readonly<Record<Separator, string>> =
  Object.freeze({
    "-": "dash",
    _: "underscore",
    ".": "dot",
    " ": "space",
  });

/** Any raw search string longer than this is dropped wholesale (Pitfall 7). */
export const MAX_SEARCH_LENGTH = 2048;
/** Limit on the DECODED `sym` value (a raw-length check would drop valid links). */
export const MAX_SYMBOLS_PARAM_LENGTH = 64;

const DIGITS_RE = /^\d{1,4}$/;

function parseCount(value: string | null, fallback: number): number {
  return value !== null && DIGITS_RE.test(value) ? Number(value) : fallback;
}

function parseFlag(value: string | null, fallback: boolean): boolean {
  if (value === "1") return true;
  if (value === "0") return false;
  return fallback;
}

function parseSeparator(value: string | null): Separator {
  if (value === null) return DEFAULT_OPTIONS.separator;
  for (const sep of SEPARATORS) {
    if (SEPARATOR_TOKENS[sep] === value) return sep;
  }
  return DEFAULT_OPTIONS.separator;
}

function parseMode(value: string | null): Mode {
  for (const mode of MODES) {
    if (mode === value) return mode;
  }
  return DEFAULT_OPTIONS.mode;
}

export function parseOptions(search: string): ToolOptions {
  if (typeof search !== "string" || search.length > MAX_SEARCH_LENGTH) {
    return normalizeToolOptions({});
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return normalizeToolOptions({});
  }

  const sym = params.get("sym");
  const d = DEFAULT_OPTIONS;

  // Fresh literal: parsed keys are never copied, so "__proto__" cannot pollute.
  const candidate = {
    mode: parseMode(params.get("mode")),
    length: parseCount(params.get("len"), d.length),
    uppercase: parseFlag(params.get("u"), d.uppercase),
    lowercase: parseFlag(params.get("l"), d.lowercase),
    digits: parseFlag(params.get("d"), d.digits),
    symbols: parseFlag(params.get("s"), d.symbols),
    symbolSet:
      sym === null || sym.length > MAX_SYMBOLS_PARAM_LENGTH
        ? DEFAULT_SYMBOLS
        : normalizeSymbols(sym),
    avoidLookalikes: parseFlag(params.get("amb"), d.avoidLookalikes),
    words: parseCount(params.get("words"), d.words),
    separator: parseSeparator(params.get("sep")),
    capitalize: parseFlag(params.get("cap"), d.capitalize),
    appendNumber: parseFlag(params.get("num"), d.appendNumber),
    batch: parseCount(params.get("n"), d.batch),
  };

  return normalizeToolOptions(candidate);
}

export function serializeOptions(opts: ToolOptions): string {
  const o = normalizeToolOptions(opts);
  const d = DEFAULT_OPTIONS;
  const params = new URLSearchParams();
  const flag = (value: boolean) => (value ? "1" : "0");

  if (o.mode !== d.mode) params.append("mode", o.mode);
  if (o.length !== d.length) params.append("len", String(o.length));
  if (o.uppercase !== d.uppercase) params.append("u", flag(o.uppercase));
  if (o.lowercase !== d.lowercase) params.append("l", flag(o.lowercase));
  if (o.digits !== d.digits) params.append("d", flag(o.digits));
  if (o.symbols !== d.symbols) params.append("s", flag(o.symbols));
  if (o.symbolSet !== d.symbolSet) params.append("sym", o.symbolSet);
  if (o.avoidLookalikes !== d.avoidLookalikes) {
    params.append("amb", flag(o.avoidLookalikes));
  }
  if (o.words !== d.words) params.append("words", String(o.words));
  if (o.separator !== d.separator) {
    params.append("sep", SEPARATOR_TOKENS[o.separator]);
  }
  if (o.capitalize !== d.capitalize) params.append("cap", flag(o.capitalize));
  if (o.appendNumber !== d.appendNumber) {
    params.append("num", flag(o.appendNumber));
  }
  if (o.batch !== d.batch) params.append("n", String(o.batch));

  return params.toString();
}
