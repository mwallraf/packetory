// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { blobChunks, bytesChunks, CHUNK_SIZE, encodeText } from "./source";

const bytes300 = Uint8Array.from({ length: 300 }, (_, i) => (i * 7 + 3) & 255);
const SIZES = [1, 63, 64, 65, CHUNK_SIZE];

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

async function collect(it: AsyncIterable<Uint8Array>): Promise<Uint8Array[]> {
  const out: Uint8Array[] = [];
  for await (const c of it) out.push(c);
  return out;
}

describe("encodeText byte contract (HASH-02)", () => {
  it("CHUNK_SIZE is 1 MiB", () => {
    expect(CHUNK_SIZE).toBe(1048576);
  });

  it("NFC e-acute is C3 A9", () => {
    expect([...encodeText("é")]).toEqual([0xc3, 0xa9]);
  });

  it("NFD e-acute is 65 CC 81 (no normalization)", () => {
    expect([...encodeText("é")]).toEqual([0x65, 0xcc, 0x81]);
  });

  it("a lone surrogate encodes as EF BF BD", () => {
    expect([...encodeText("\ud83d")]).toEqual([0xef, 0xbf, 0xbd]);
  });

  it("does not trim whitespace", () => {
    expect(encodeText(" a\n")).toHaveLength(3);
  });

  it("encodes the empty string as zero bytes", () => {
    expect(encodeText("")).toHaveLength(0);
  });
});

describe("bytesChunks (HASH-02, HASH-03)", () => {
  it.each(SIZES)("chunkSize %i: concatenation equals input, full chunks except last", (size) => {
    const chunks = [...bytesChunks(bytes300, size)];
    expect(concat(chunks)).toEqual(bytes300);
    chunks.slice(0, -1).forEach((c) => expect(c.length).toBe(size));
    expect(chunks[chunks.length - 1]!.length).toBeGreaterThan(0);
  });

  it("yields subarray views, not copies", () => {
    const chunks = [...bytesChunks(bytes300, 64)];
    expect(chunks[1]!.byteOffset).toBe(64);
    expect(chunks[1]!.buffer).toBe(bytes300.buffer);
  });

  it("yields zero chunks for empty input", () => {
    expect([...bytesChunks(new Uint8Array(0))]).toHaveLength(0);
  });

  it.each([0, -1, NaN])("throws RangeError for chunkSize %s", (size) => {
    expect(() => [...bytesChunks(bytes300, size)]).toThrow(RangeError);
  });
});

describe("blobChunks (HASH-02, HASH-03)", () => {
  it.each(SIZES)("chunkSize %i: concatenation equals input, bounded slice reads", async (size) => {
    const blob = new Blob([bytes300]);
    const spy = vi.spyOn(blob, "arrayBuffer");
    const chunks = await collect(blobChunks(blob, size));
    expect(concat(chunks)).toEqual(bytes300);
    chunks.slice(0, -1).forEach((c) => expect(c.length).toBe(size));
    expect(spy).not.toHaveBeenCalled(); // only slices are read, never the whole Blob
  });

  it("yields zero chunks for an empty Blob", async () => {
    expect(await collect(blobChunks(new Blob([])))).toHaveLength(0);
  });

  it.each([0, -1, NaN])("throws RangeError for chunkSize %s", async (size) => {
    await expect(blobChunks(new Blob([bytes300]), size).next()).rejects.toThrow(
      RangeError,
    );
  });
});
