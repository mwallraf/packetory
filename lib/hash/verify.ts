/**
 * Paste-to-verify matching for the hash tool (OUT-04, D-17, D-18). Pure and
 * framework-agnostic: type-only imports plus `ALGORITHMS` and the format
 * helpers, never the hashing engine. Total functions: nothing here throws for
 * any string input.
 *
 * `normalizeExpected` turns a pasted checksum in one of many real-world shapes
 * (case, spaces, colons, an algorithm prefix, a `sha256sum` line) into one
 * hex candidate; `matchExpected` compares that candidate against every row.
 * Matching is plain string equality with no algorithm restriction and no
 * prefix or partial matching.
 *
 * ReDoS guard (T-09-14): the UI caps input at 4096 characters and every
 * pattern below is anchored, bounded or a single-class replace, so work stays
 * linear in the input length.
 */
import { ALGORITHMS } from "./algorithms";
import { toBase64, toHex } from "./format";
import type { AlgorithmId, Digests } from "./types";

/** Hex lengths of the supported digests: CRC32, MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512. */
export const VALID_HEX_LENGTHS = [8, 32, 40, 56, 64, 96, 128] as const;

export type NormalizedExpected = {
  /** Lowercase hex candidate (separators removed); may be non-hex or the wrong length. */
  hex: string;
  /** Base64 candidate: the pasted tokens joined, separators kept (they are legal base64url). */
  base64: string;
  /** `hex` is all hex digits and has a length in `VALID_HEX_LENGTHS`. */
  hexIsValid: boolean;
};

export type VerifyResult =
  | { state: "idle" }
  | { state: "match"; ids: AlgorithmId[] }
  | { state: "no-match"; hint?: string };

/** Zero-width characters and the BOM, written as escapes (never literal). */
const ZERO_WIDTH_RE = /[\u200B-\u200D\u2060\uFEFF]/g;

/**
 * Known algorithm aliases only, then an optional `:` or `=`. Deliberately not
 * a generic `\w+:` strip, which would eat the first octet of `ab:cd:...`.
 */
const ALGORITHM_PREFIX_RE =
  /^(?:md5|sha-?1|sha-?224|sha-?256|sha-?384|sha-?512|sha3[-_]?256|sha3[-_]?512|ripemd-?160|crc-?32)\s*[:=]\s*/i;

/** Head of a BSD tag line: `SHA256 (`. The rest is parsed without a regex (see `extractBsdHash`). */
const BSD_HEAD_RE = /^[A-Za-z0-9_-]+\s*\(/;
/** What must follow the last `)` of a BSD tag line: `= <hash>`. */
const BSD_TAIL_RE = /^\s*=\s*(\S+)$/;
const LEADING_0X_RE = /^0x/i;
const WHITESPACE_RE = /\s+/;
const HEX_SEPARATORS_RE = /[:\-_]/g;
const HEX_ONLY_RE = /^[0-9a-f]+$/i;
const BASE64_URL_PLUS_RE = /-/g;
const BASE64_URL_SLASH_RE = /_/g;
const TRAILING_PADDING_RE = /=+$/;

/** Shown when a value that matched nothing is not a plausible hex digest. */
const HEX_LENGTH_HINT_PREFIX =
  "Expected 8, 32, 40, 56, 64, 96 or 128 hex characters; got ";

function isValidHexLength(length: number): boolean {
  return (VALID_HEX_LENGTHS as readonly number[]).includes(length);
}

function isValidHex(value: string): boolean {
  return isValidHexLength(value.length) && HEX_ONLY_RE.test(value);
}

/**
 * Rule 2: the BSD tag form `SHA256 (file name) = <hash>` (`shasum --tag`,
 * `openssl dgst`). Returns the hash, or `null` when `s` is not that shape.
 * Hand-rolled around the last `)` instead of one `\(.*\)\s*=\s*(\S+)$`
 * regex: that pattern backtracks quadratically on inputs full of `)`.
 */
function extractBsdHash(s: string): string | null {
  if (!BSD_HEAD_RE.test(s)) return null;
  const close = s.lastIndexOf(")");
  if (close < 0) return null;
  const tail = BSD_TAIL_RE.exec(s.slice(close + 1));
  return tail ? tail[1]! : null;
}

/** Base64 compared without padding, with base64url folded to standard. */
function canonicalBase64(value: string): string {
  return value
    .replace(BASE64_URL_PLUS_RE, "+")
    .replace(BASE64_URL_SLASH_RE, "/")
    .replace(TRAILING_PADDING_RE, "");
}

/**
 * Reduces a pasted checksum to its candidate forms, or `null` when nothing
 * but whitespace and invisible characters was pasted.
 */
export function normalizeExpected(raw: string): NormalizedExpected | null {
  // Rule 1: invisible characters, then trim.
  let s = raw.replace(ZERO_WIDTH_RE, "").trim();
  if (s === "") return null;

  // Rule 2: a BSD tag line yields just its hash.
  const bsd = extractBsdHash(s);
  if (bsd !== null) s = bsd;

  // Rule 3: a known algorithm prefix. The 0x strip applies to the hex
  // candidate only: a Base64 digest may legitimately begin with "0x".
  s = s.replace(ALGORITHM_PREFIX_RE, "");
  const hexSource = s.replace(LEADING_0X_RE, "");

  // Rule 4: tokens on whitespace; separators are noise only for hex.
  const tokens = hexSource.split(WHITESPACE_RE).filter((t) => t !== "");
  const joined = tokens.join("").replace(HEX_SEPARATORS_RE, "");
  const first = (tokens[0] ?? "").replace(HEX_SEPARATORS_RE, "");

  let candidate = joined;
  if (!isValidHex(joined) && tokens.length > 1 && isValidHex(first)) {
    // A `sha256sum` line: `<hash>  <filename>` or `<hash> *<filename>`.
    candidate = first;
  }

  // Rule 6 input: tokens joined with separators kept (legal base64url).
  const base64 = s.split(WHITESPACE_RE).filter((t) => t !== "").join("");

  const hex = candidate.toLowerCase();
  return { hex, base64, hexIsValid: isValidHex(hex) };
}

/** Compares a pasted checksum against every settled digest (ALGORITHMS order). */
export function matchExpected(raw: string, digests: Digests): VerifyResult {
  const n = normalizeExpected(raw);
  if (n === null) return { state: "idle" };

  // Rules 5 and 6: hex equality against every row, unioned with a
  // case-sensitive Base64 comparison against every non-CRC32 row. One pass
  // over ALGORITHMS keeps the ids deduplicated and in display order.
  const b64 = n.base64 === "" ? "" : canonicalBase64(n.base64);
  const ids: AlgorithmId[] = [];
  for (const algo of ALGORITHMS) {
    const bytes = digests[algo.id];
    const hexMatch = toHex(bytes) === n.hex;
    const b64Match =
      algo.id !== "crc32" && b64 !== "" && canonicalBase64(toBase64(bytes)) === b64;
    if (hexMatch || b64Match) ids.push(algo.id);
  }
  if (ids.length > 0) return { state: "match", ids };

  // Rule 7: a hint (never an error) when the hex candidate cannot be a digest.
  if (!n.hexIsValid) {
    return { state: "no-match", hint: `${HEX_LENGTH_HINT_PREFIX}${n.hex.length}.` };
  }
  return { state: "no-match" };
}

/**
 * Match copy: equality only, never authenticity wording (T-09-15).
 * One label "Matches X."; two "Matches X and Y."; more "Matches X, Y and Z.".
 */
export function describeMatch(ids: readonly AlgorithmId[]): string {
  const labels = ALGORITHMS.filter((a) => ids.includes(a.id)).map(
    (a) => a.label,
  );
  if (labels.length <= 1) return `Matches ${labels[0] ?? ""}.`;
  const head = labels.slice(0, -1).join(", ");
  return `Matches ${head} and ${labels[labels.length - 1]}.`;
}
