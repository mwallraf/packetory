/**
 * Hand-rolled incremental IEEE CRC32 hasher (HASH-01). Pure and
 * framework-agnostic: no React/Next import, no dependencies. Exposes the same
 * `Hasher` shape as the noble hashers so `engine.ts` can map every algorithm
 * id to a fresh hasher uniformly.
 *
 * Reflected polynomial 0xEDB88320; the register is initialised once per
 * hasher and the final XOR is applied once inside `digest()`. Like noble's
 * hashers it is single-use: any call after `digest()` throws.
 */
import type { Hasher } from "./types";

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function createCrc32(): Hasher {
  let crc = 0xffffffff; // init ONCE per hasher
  let done = false;
  return {
    update(chunk) {
      if (done) throw new Error("hash was destroyed");
      for (let i = 0; i < chunk.length; i++) {
        crc = TABLE[(crc ^ chunk[i]!) & 0xff]! ^ (crc >>> 8);
      }
      return this;
    },
    digest() {
      if (done) throw new Error("hash was destroyed");
      done = true;
      const v = (crc ^ 0xffffffff) >>> 0; // final XOR ONCE, forced unsigned
      return new Uint8Array([
        v >>> 24,
        (v >>> 16) & 255,
        (v >>> 8) & 255,
        v & 255,
      ]); // 4 bytes, big-endian
    },
  };
}
