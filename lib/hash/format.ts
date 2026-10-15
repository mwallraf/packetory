/**
 * Digest encodings (HASH-01, OUT-03). Pure and framework-agnostic: type-only
 * imports, no engine import. `toHex` is the canonical lowercase form; Phase 9
 * adds the uppercase case toggle and Base64 on top of it. CRC32 is a 32-bit
 * checksum conventionally written in hex, so it stays hex under Base64
 * (D-11).
 *
 * The 256-entry table is padded per byte so a leading zero byte can never be
 * dropped (the classic CRC32 bug: `(0x12d20a).toString(16)` loses a digit).
 */
import type { AlgorithmId, Digests } from "./types";

const HEX: readonly string[] = Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, "0"),
);

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += HEX[bytes[i]!]!;
  return out;
}

export function digestsToHex(digests: Digests): Record<AlgorithmId, string> {
  const out = {} as Record<AlgorithmId, string>;
  for (const id of Object.keys(digests) as AlgorithmId[]) {
    out[id] = toHex(digests[id]);
  }
  return out;
}

/** The three display encodings of the output toggle (OUT-03). */
export type DigestEncoding = "hex" | "HEX" | "base64";

export function toHexUpper(bytes: Uint8Array): string {
  return toHex(bytes).toUpperCase();
}

/** Standard Base64 (with padding). Digests are at most 64 bytes. */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

/**
 * Formats stored digest bytes for display or export. CRC32 never becomes
 * Base64: it stays hex (upper-case only when the HEX toggle is chosen).
 */
export function formatDigest(
  id: AlgorithmId,
  bytes: Uint8Array,
  enc: DigestEncoding,
): string {
  if (id === "crc32") return enc === "HEX" ? toHexUpper(bytes) : toHex(bytes);
  if (enc === "base64") return toBase64(bytes);
  return enc === "HEX" ? toHexUpper(bytes) : toHex(bytes);
}
