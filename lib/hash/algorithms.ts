/**
 * Display metadata for the hash tool (HASH-01). Pure and framework-agnostic:
 * a type-only import and no engine/noble import, so server components (Phase 9)
 * can render labels and sizes without pulling the hashing engine into a
 * client bundle.
 *
 * Display order is the order of `ALGORITHMS`. `notForSecurity` drives the
 * inline security labels Phase 9 renders (OUT-05): MD5 and SHA-1 are
 * collision-broken and CRC32 is a checksum, not a cryptographic hash. This
 * implements the HASH-01 transparency prohibition - they are never presented
 * as suitable for security purposes.
 */
import type { AlgorithmId } from "./types";

export type AlgorithmMeta = {
  id: AlgorithmId;
  label: string;
  bits: number;
  notForSecurity: boolean;
};

export const ALGORITHMS = [
  { id: "md5", label: "MD5", bits: 128, notForSecurity: true },
  { id: "sha1", label: "SHA-1", bits: 160, notForSecurity: true },
  { id: "sha224", label: "SHA-224", bits: 224, notForSecurity: false },
  { id: "sha256", label: "SHA-256", bits: 256, notForSecurity: false },
  { id: "sha384", label: "SHA-384", bits: 384, notForSecurity: false },
  { id: "sha512", label: "SHA-512", bits: 512, notForSecurity: false },
  { id: "sha3-256", label: "SHA3-256", bits: 256, notForSecurity: false },
  { id: "sha3-512", label: "SHA3-512", bits: 512, notForSecurity: false },
  { id: "ripemd160", label: "RIPEMD-160", bits: 160, notForSecurity: false },
  { id: "crc32", label: "CRC32", bits: 32, notForSecurity: true },
] as const satisfies readonly AlgorithmMeta[];

export const ALGORITHM_IDS: readonly AlgorithmId[] = ALGORITHMS.map(
  (a) => a.id,
);
