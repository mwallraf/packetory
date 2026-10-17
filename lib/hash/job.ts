/**
 * Incremental 10-algorithm hash job (HASH-01, HASH-04). Pure and
 * framework-agnostic: no React/Next import. One pass over the source feeds
 * all ten hashers; the job checks an `AbortSignal` before every chunk and
 * yields to the event loop after each one so a pending `cancel` message can
 * be delivered.
 *
 * Boundary: this module imports `engine.ts`, so importing `job.ts` from UI
 * code would pull the hashing engine into the main-thread bundle. It must be
 * imported only by `worker-core.ts` and tests; 08-04's boundaries.test.ts
 * enforces that.
 */
import { FACTORIES } from "./engine";
import { bytesChunks, CHUNK_SIZE, encodeText } from "./source";
import type { AlgorithmId, Digests } from "./types";

const abortError = () => new DOMException("Hash job aborted", "AbortError");

/**
 * MessageChannel macrotask yield: delivers a pending "cancel" message and
 * avoids the 4ms `setTimeout` clamp.
 */
export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => {
      port1.close();
      resolve();
    };
    port2.postMessage(null);
  });
}

export type JobOptions = {
  total?: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
  /** Tests inject `async () => {}`. */
  yieldFn?: () => Promise<void>;
};

export async function runHashJob(
  source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
  {
    total = 0,
    signal,
    onProgress,
    yieldFn = yieldToEventLoop,
  }: JobOptions = {},
): Promise<Digests> {
  // Fresh hasher per algorithm per job: hashers are single-use.
  const hashers = (Object.keys(FACTORIES) as AlgorithmId[]).map(
    (id) => [id, FACTORIES[id]()] as const,
  );
  let done = 0;
  for await (const chunk of source) {
    if (signal?.aborted) throw abortError();
    for (const [, h] of hashers) h.update(chunk); // one read feeds all hashers
    done += chunk.length;
    onProgress?.(done, total);
    await yieldFn();
  }
  if (signal?.aborted) throw abortError();
  return Object.fromEntries(
    hashers.map(([id, h]) => [id, h.digest()]),
  ) as Digests;
}

/** Test-and-worker-only helper: hash bytes with no event-loop yield. */
export function hashBytes(
  bytes: Uint8Array,
  chunkSize: number = CHUNK_SIZE,
): Promise<Digests> {
  return runHashJob(bytesChunks(bytes, chunkSize), {
    total: bytes.length,
    yieldFn: async () => {},
  });
}

/** Test-and-worker-only helper: hash UTF-8 text via `encodeText`. */
export function hashText(text: string): Promise<Digests> {
  return hashBytes(encodeText(text));
}
