/**
 * First-paint sample for the hash tool (TEXT-01, D-02). Pure and
 * framework-agnostic: type-only imports, never imports the engine, so the
 * tool island can paint the 10 digests of `hello world` synchronously without
 * a worker round-trip. Values were node-verified (node:crypto / zlib.crc32)
 * in 09-RESEARCH and are pinned to the engine by `sample.test.ts`.
 */
import type { AlgorithmId, Digests } from "./types";

/** No trailing newline (D-02). */
export const SAMPLE_TEXT = "hello world";

export const SAMPLE_DIGEST_HEX: Readonly<Record<AlgorithmId, string>> = {
  md5: "5eb63bbbe01eeed093cb22bb8f5acdc3",
  sha1: "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed",
  sha224: "2f05477fc24bb4faefd86517156dafdecec45b8ad3cf2522a563582b",
  sha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  sha384:
    "fdbd8e75a67f29f701a4e040385e2e23986303ea10239211af907fcbb83578b3e417cb71ce646efd0819dd8c088de1bd",
  sha512:
    "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f",
  "sha3-256": "644bcc7e564373040999aac89e7622f3ca71fba1d972fd94a31c3bfbf24e3938",
  "sha3-512":
    "840006653e9ac9e95117a15c915caab81662918e925de9e004f774ff82d7079a40d4d27b1b372657c61d46d470304c88c788b3a4527ad074d1dccbee5dbaa99a",
  ripemd160: "98c615784ccb5fe5936fbc0cbe9dfdb408d92f0f",
  crc32: "0d4a1185",
};

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Fresh bytes on every call so no caller can mutate shared state. */
export function sampleDigests(): Digests {
  const out = {} as Digests;
  for (const id of Object.keys(SAMPLE_DIGEST_HEX) as AlgorithmId[]) {
    out[id] = hexToBytes(SAMPLE_DIGEST_HEX[id]);
  }
  return out;
}
