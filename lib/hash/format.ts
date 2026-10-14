/**
 * Lowercase hex encoding for digests (HASH-01). Pure and framework-agnostic:
 * type-only imports, no engine import. Phase 8 renders lowercase only; the
 * case toggle and Base64 are Phase 9 (OUT-03).
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
