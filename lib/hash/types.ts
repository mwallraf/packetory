/**
 * Shared contracts for the hash runtime (HASH-01, HASH-04). Pure and
 * framework-agnostic: types only, no runtime code and no React/Next import.
 * Sits at the boundary between the main-thread client (`client.ts`), the Web
 * Worker protocol (`worker-core.ts`), and the hashing engine (`engine.ts`).
 */

export type AlgorithmId =
  | "md5"
  | "sha1"
  | "sha224"
  | "sha256"
  | "sha384"
  | "sha512"
  | "sha3-256"
  | "sha3-512"
  | "ripemd160"
  | "crc32";

/**
 * Structural subset shared by noble hashers and our CRC32 (noble's
 * `update()` returns `this`, so the return type is deliberately `unknown`).
 */
export type Hasher = {
  update(chunk: Uint8Array): unknown;
  digest(): Uint8Array;
};

export type Digests = Record<AlgorithmId, Uint8Array>;

export type HashInput =
  | { kind: "text"; text: string }
  | { kind: "file"; file: Blob };

export type WorkerRequest =
  | { type: "start"; jobId: number; input: HashInput }
  | { type: "cancel"; jobId: number };

export type WorkerResponse =
  | { type: "progress"; jobId: number; done: number; total: number }
  | { type: "result"; jobId: number; digests: Digests }
  | { type: "cancelled"; jobId: number }
  | { type: "error"; jobId: number; name: string; message: string };
