// @vitest-environment node
import { createHash, getHashes } from "node:crypto";
import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { ALGORITHM_IDS } from "./algorithms";
import { digestsToHex } from "./format";
import { hashBytes, hashText, runHashJob, yieldToEventLoop } from "./job";
import { blobChunks } from "./source";
import type { AlgorithmId } from "./types";

const noYield = async () => {};

// Every oracle is mandatory: nothing is skipped or swallowed, ripemd160 included.
function oracleHex(bytes: Uint8Array): Record<AlgorithmId, string> {
  const out = {} as Record<AlgorithmId, string>;
  for (const id of ALGORITHM_IDS) {
    out[id] =
      id === "crc32"
        ? crc32(bytes).toString(16).padStart(8, "0")
        : createHash(id).update(bytes).digest("hex");
  }
  return out;
}

function splitBytes(bytes: Uint8Array, sizes: number[]): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  let off = 0;
  let i = 0;
  while (off < bytes.length) {
    const size = sizes[i++ % sizes.length]!;
    if (chunks.length > 0) chunks.push(new Uint8Array(0)); // interleaved empty chunk
    chunks.push(bytes.subarray(off, off + size));
    off += size;
  }
  return chunks;
}

describe("node oracle availability (HASH-03)", () => {
  it("node:zlib crc32 exists (Node >= 22.2 required)", () => {
    expect(
      typeof crc32,
      "node:zlib crc32 missing - Node >= 22.2 required",
    ).toBe("function");
  });

  it("node:crypto exposes ripemd160", () => {
    expect(
      getHashes(),
      "node:crypto lacks ripemd160 - this OpenSSL build cannot serve as the RIPEMD-160 oracle",
    ).toContain("ripemd160");
  });
});

describe("chunk-split invariance (HASH-03)", () => {
  fcIt.prop([
    fc.uint8Array({ maxLength: 4096 }),
    fc.array(fc.integer({ min: 1, max: 300 }), { minLength: 1, maxLength: 20 }),
  ])(
    "any split (incl. 1-byte and empty chunks) equals one-shot and node oracles for all 10 algorithms",
    async (bytes, sizes) => {
      const chunks = splitBytes(bytes, sizes);
      const split = digestsToHex(await runHashJob(chunks, { yieldFn: noYield }));
      const oneShot = digestsToHex(
        await runHashJob([bytes], { yieldFn: noYield }),
      );
      expect(split).toEqual(oneShot);
      expect(split).toEqual(oracleHex(bytes));
    },
  );

  fcIt.prop([
    fc.uint8Array({ maxLength: 4096 }),
    fc.integer({ min: 1, max: 257 }),
  ])("Blob slices of any size equal hashBytes", async (bytes, chunkSize) => {
    const viaBlob = await runHashJob(blobChunks(new Blob([bytes]), chunkSize), {
      yieldFn: noYield,
    });
    expect(digestsToHex(viaBlob)).toEqual(digestsToHex(await hashBytes(bytes)));
  });
});

describe("runHashJob contract (HASH-02, HASH-03)", () => {
  const data = Uint8Array.from({ length: 10 }, (_, i) => i);
  const three = () => [data.subarray(0, 4), data.subarray(4, 8), data.subarray(8)];

  async function* asyncOf(chunks: Uint8Array[]) {
    for (const c of chunks) yield c;
  }

  it("accepts both a sync Iterable and an AsyncIterable", async () => {
    const sync = digestsToHex(await runHashJob(three(), { yieldFn: noYield }));
    const asyncRes = digestsToHex(
      await runHashJob(asyncOf(three()), { yieldFn: noYield }),
    );
    expect(sync).toEqual(asyncRes);
    expect(sync).toEqual(oracleHex(data));
  });

  it("reports cumulative progress with the passed total; last call is done === total", async () => {
    const calls: [number, number][] = [];
    await runHashJob(three(), {
      total: data.length,
      yieldFn: noYield,
      onProgress: (done, total) => calls.push([done, total]),
    });
    expect(calls).toEqual([
      [4, 10],
      [8, 10],
      [10, 10],
    ]);
  });

  it("awaits yieldFn once per chunk", async () => {
    let yields = 0;
    await runHashJob(three(), {
      yieldFn: async () => {
        yields++;
      },
    });
    expect(yields).toBe(3);
  });

  it("rejects with AbortError when the signal is already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const err = await runHashJob(three(), {
      signal: ctrl.signal,
      yieldFn: noYield,
    }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe("AbortError");
  });

  it("rejects with AbortError when aborted inside the first onProgress callback", async () => {
    const ctrl = new AbortController();
    const err = await runHashJob(three(), {
      signal: ctrl.signal,
      yieldFn: noYield,
      onProgress: () => ctrl.abort(),
    }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe("AbortError");
  });

  it("yieldToEventLoop resolves on a real MessageChannel", async () => {
    await expect(yieldToEventLoop()).resolves.toBeUndefined();
  });

  it("hashText('abc') gives the published SHA-256", async () => {
    expect(digestsToHex(await hashText("abc")).sha256).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashBytes with chunkSize 1 equals the default chunk size", async () => {
    const bytes = Uint8Array.from({ length: 777 }, (_, i) => (i * 13) & 255);
    expect(digestsToHex(await hashBytes(bytes, 1))).toEqual(
      digestsToHex(await hashBytes(bytes)),
    );
  });
});
