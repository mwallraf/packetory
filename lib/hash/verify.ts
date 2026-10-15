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
import { toHex } from "./format";
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
const ZERO_WIDTH_RE = /[​-‍⁠﻿]/g;

/**
 * Known algorithm aliases only, then an optional `:` or `=`. Deliberately not
 * a generic `\w+:` strip, which would eat the first octet of `ab:cd:...`.
 */
const ALGORITHM_PREFIX_RE =
  /^(?:md5|sha-?1|sha-?224|sha-?256|sha-?384|sha-?512|sha3[-_]?256|sha3[-_]?512|ripemd-?160|crc-?32)\s*[:=]\s*/i;

const LEADING_0X_RE = /^0x/i;
const WHITESPACE_RE = /\s+/;
const HEX_SEPARATORS_RE = /[:\-_]/g;
const HEX_ONLY_RE = /^[0-9a-f]+$/i;

function isValidHexLength(length: number): boolean {
  return (VALID_HEX_LENGTHS as readonly number[]).includes(length);
}

function isValidHex(value: string): boolean {
  return isValidHexLength(value.length) && HEX_ONLY_RE.test(value);
}

/**
 * Reduces a pasted checksum to its candidate forms, or `null` when nothing
 * but whitespace and invisible characters was pasted.
 */
export function normalizeExpected(raw: string): NormalizedExpected | null {
  // Rule 1: invisible characters, then trim.
  let s = raw.replace(ZERO_WIDTH_RE, "").trim();
  if (s === "") return null;

  // Rule 3: a known algorithm prefix, then a leading 0x.
  s = s.replace(ALGORITHM_PREFIX_RE, "");
  s = s.replace(LEADING_0X_RE, "");

  // Rule 4: tokens on whitespace.
  const tokens = s.split(WHITESPACE_RE).filter((t) => t !== "");
  const joinedRaw = tokens.join("");
  const joined = joinedRaw.replace(HEX_SEPARATORS_RE, "");
  const first = (tokens[0] ?? "").replace(HEX_SEPARATORS_RE, "");

  let candidate = joined;
  if (!isValidHex(joined) && tokens.length > 1 && isValidHex(first)) {
    // A `sha256sum` line: `<hash>  <filename>` or `<hash> *<filename>`.
    candidate = first;
  }

  const hex = candidate.toLowerCase();
  return { hex, base64: joinedRaw, hexIsValid: isValidHex(hex) };
}

/** Compares a pasted checksum against every settled digest (ALGORITHMS order). */
export function matchExpected(raw: string, digests: Digests): VerifyResult {
  const n = normalizeExpected(raw);
  if (n === null) return { state: "idle" };

  const ids: AlgorithmId[] = [];
  for (const algo of ALGORITHMS) {
    if (toHex(digests[algo.id]) === n.hex) ids.push(algo.id);
  }
  if (ids.length > 0) return { state: "match", ids };
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
