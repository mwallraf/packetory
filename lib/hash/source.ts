/**
 * Byte sources for the hash runtime (HASH-01). Pure and framework-agnostic:
 * no React/Next import. Owns the single UTF-8 choke point (`encodeText`) and
 * the chunked views over bytes and Blobs that feed `runHashJob`.
 *
 * `encodeText` applies no trim and no Unicode normalization. A lone
 * surrogate is encoded by `TextEncoder` as U+FFFD (EF BF BD); this is
 * documented behavior, not something to "fix".
 */

export const CHUNK_SIZE = 1 << 20; // 1 MiB

const encoder = new TextEncoder();

/** The ONE UTF-8 choke point: no trim, no normalize. */
export function encodeText(text: string): Uint8Array {
  return encoder.encode(text);
}

/** Yields `subarray` views of `bytes`, `chunkSize` at a time. */
export function* bytesChunks(
  bytes: Uint8Array,
  chunkSize = CHUNK_SIZE,
): Generator<Uint8Array> {
  if (!(chunkSize >= 1)) throw new RangeError("chunkSize must be >= 1");
  for (let off = 0; off < bytes.length; off += chunkSize) {
    yield bytes.subarray(off, off + chunkSize);
  }
}

/**
 * Yields `chunkSize`-byte slices of a Blob, reading one slice at a time -
 * never the whole Blob, and never `Blob.stream` (undefined in jsdom).
 */
export async function* blobChunks(
  blob: Blob,
  chunkSize = CHUNK_SIZE,
): AsyncGenerator<Uint8Array> {
  if (!(chunkSize >= 1)) throw new RangeError("chunkSize must be >= 1");
  for (let off = 0; off < blob.size; off += chunkSize) {
    yield new Uint8Array(await blob.slice(off, off + chunkSize).arrayBuffer());
  }
}
