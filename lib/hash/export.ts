/**
 * Copy-all payload formatters (OUT-02). Pure and framework-agnostic:
 * type-only imports besides the sibling metadata/format modules, no engine
 * or job import, so the HASH-04 boundary stays intact. Lines are joined with
 * "\n" and carry no trailing newline, so payloads are deterministic.
 */
import { ALGORITHMS } from "./algorithms";
import { formatDigest, toHex, type DigestEncoding } from "./format";
import type { Digests } from "./types";

/** One "LABEL: digest" line per algorithm in the given display encoding (CRC32 stays hex). */
export function formatLabeledList(digests: Digests, enc: DigestEncoding): string {
  return ALGORITHMS.map(
    (algo) => algo.label + ": " + formatDigest(algo.id, digests[algo.id], enc),
  ).join("\n");
}

/**
 * sha256sum-style checksum lines (D-15, D-16): a "# LABEL" comment line, then
 * the lowercase hex digest, exactly two spaces, and "-" (text input on
 * stdin). Always lowercase hex regardless of the display encoding.
 */
export function formatChecksumLines(digests: Digests): string {
  return ALGORITHMS.map(
    (algo) => "# " + algo.label + "\n" + toHex(digests[algo.id]) + "  -",
  ).join("\n");
}
