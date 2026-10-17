/**
 * The hashing engine seam (HASH-01, HASH-04): the ONLY module in the
 * codebase that imports `@noble/hashes` (mirrors `lib/uuid/generate.ts`'s
 * single-importer precedent). Pure and framework-agnostic: no React/Next
 * import. It maps every `AlgorithmId` to a factory returning a fresh,
 * single-use hasher; the typed `Record` makes a missing algorithm a compile
 * error.
 *
 * Only `sha3_256` / `sha3_512` are imported from the sha3 subpath - never the
 * legacy Keccak variants, which hash differently and would still "work".
 */
import { sha224, sha256, sha384, sha512 } from "@noble/hashes/sha2.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { md5, ripemd160, sha1 } from "@noble/hashes/legacy.js";
import { createCrc32 } from "./crc32";
import type { AlgorithmId, Hasher } from "./types";

export const FACTORIES: Record<AlgorithmId, () => Hasher> = {
  md5: () => md5.create(),
  sha1: () => sha1.create(),
  sha224: () => sha224.create(),
  sha256: () => sha256.create(),
  sha384: () => sha384.create(),
  sha512: () => sha512.create(),
  "sha3-256": () => sha3_256.create(),
  "sha3-512": () => sha3_512.create(),
  ripemd160: () => ripemd160.create(),
  crc32: createCrc32,
};
