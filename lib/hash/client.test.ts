// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createHashClient, type WorkerLike } from "./client";
import type {
  AlgorithmId,
  Digests,
  HashInput,
  WorkerRequest,
  WorkerResponse,
} from "./types";

class FakeWorker implements WorkerLike {
  posted: WorkerRequest[] = [];
  terminated = false;
  onmessage: WorkerLike["onmessage"] = null;
  onerror: WorkerLike["onerror"] = null;
  postMessage(m: WorkerRequest) {
    this.posted.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: WorkerResponse) {
    this.onmessage?.({ data });
  }
}

function setup() {
  const workers: FakeWorker[] = [];
  const createWorker = vi.fn(() => {
    const w = new FakeWorker();
    workers.push(w);
    return w;
  });
  return { client: createHashClient({ createWorker }), workers, createWorker };
}

/** The fake never hashes; any bytes per id satisfy the type. */
function fakeDigests(fill: number): Digests {
  const ids: AlgorithmId[] = [
    "md5",
    "sha1",
    "sha224",
    "sha256",
    "sha384",
    "sha512",
    "sha3-256",
    "sha3-512",
    "ripemd160",
    "crc32",
  ];
  const out = {} as Digests;
  for (const id of ids) out[id] = new Uint8Array([fill]);
  return out;
}

const textA: HashInput = { kind: "text", text: "A" };
const textB: HashInput = { kind: "text", text: "B" };

describe("createHashClient (HASH-04)", () => {
  it("creates the worker lazily and reuses a single worker (HASH-04)", () => {
    const { client, workers, createWorker } = setup();
    expect(createWorker).toHaveBeenCalledTimes(0);
    void client.start(textA);
    expect(createWorker).toHaveBeenCalledTimes(1);
    void client.start(textB);
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(workers).toHaveLength(1);
  });

  it("posts exactly start 1, cancel 1, start 2 when a job is superseded (HASH-04 ordering)", () => {
    const { client, workers } = setup();
    void client.start(textA);
    void client.start(textB);
    expect(workers[0].posted).toEqual([
      { type: "start", jobId: 1, input: textA },
      { type: "cancel", jobId: 1 },
      { type: "start", jobId: 2, input: textB },
    ]);
  });

  it("never delivers a result for a superseded job (HASH-04)", async () => {
    const { client, workers } = setup();
    const a = client.start(textA);
    const b = client.start(textB);
    await expect(a).resolves.toEqual({ status: "cancelled" });

    const w = workers[0];
    w.emit({ type: "result", jobId: 1, digests: fakeDigests(1) });
    // A is already settled; B is still pending until its own result arrives.
    const pending = await Promise.race([
      b.then(() => "settled"),
      Promise.resolve("pending"),
    ]);
    expect(pending).toBe("pending");

    const digests = fakeDigests(2);
    w.emit({ type: "result", jobId: 2, digests });
    await expect(b).resolves.toEqual({ status: "done", digests });
  });

  it("gives byte-identical inputs distinct jobIds and cancels the first (HASH-04 adjacency)", async () => {
    const { client, workers } = setup();
    const same: HashInput = { kind: "text", text: "same" };
    const a = client.start(same);
    const b = client.start({ kind: "text", text: "same" });
    const starts = workers[0].posted.filter((m) => m.type === "start");
    expect(starts.map((m) => m.jobId)).toEqual([1, 2]);
    await expect(a).resolves.toEqual({ status: "cancelled" });
    const digests = fakeDigests(3);
    workers[0].emit({ type: "result", jobId: 2, digests });
    await expect(b).resolves.toEqual({ status: "done", digests });
  });

  it("cancel() posts a cancel, resolves cancelled, and drops a late result (HASH-04)", async () => {
    const { client, workers } = setup();
    const p = client.start(textA);
    client.cancel();
    expect(workers[0].posted).toEqual([
      { type: "start", jobId: 1, input: textA },
      { type: "cancel", jobId: 1 },
    ]);
    await expect(p).resolves.toEqual({ status: "cancelled" });
    workers[0].emit({ type: "result", jobId: 1, digests: fakeDigests(1) });
    expect(workers[0].posted).toHaveLength(2);
  });

  it("cancel() with nothing in flight posts nothing and does not throw (HASH-04 empty)", async () => {
    const { client, workers, createWorker } = setup();
    expect(() => client.cancel()).not.toThrow();
    expect(createWorker).toHaveBeenCalledTimes(0);

    // After a completed job there is also nothing to cancel.
    const p = client.start(textA);
    workers[0].emit({ type: "result", jobId: 1, digests: fakeDigests(1) });
    await p;
    const before = workers[0].posted.length;
    expect(() => client.cancel()).not.toThrow();
    expect(workers[0].posted).toHaveLength(before);
  });

  it("dispose() cancels the current job, terminates the worker, and blocks new workers (HASH-04)", async () => {
    const { client, workers, createWorker } = setup();
    const p = client.start(textA);
    client.dispose();
    await expect(p).resolves.toEqual({ status: "cancelled" });
    expect(workers[0].terminated).toBe(true);
    workers[0].emit({ type: "result", jobId: 1, digests: fakeDigests(1) });

    const after = await client.start(textB);
    expect(after).toEqual({ status: "cancelled" });
    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it("dispose() before any start() never constructs a worker (HASH-04 empty)", async () => {
    const { client, createWorker } = setup();
    expect(() => client.dispose()).not.toThrow();
    expect(createWorker).toHaveBeenCalledTimes(0);
    await expect(client.start(textA)).resolves.toEqual({ status: "cancelled" });
    expect(createWorker).toHaveBeenCalledTimes(0);
  });

  it("forwards progress only for the current job (HASH-04)", () => {
    const { client, workers } = setup();
    const onProgressA = vi.fn();
    const onProgressB = vi.fn();
    void client.start(textA, { onProgress: onProgressA });
    void client.start(textB, { onProgress: onProgressB });

    workers[0].emit({ type: "progress", jobId: 1, done: 5, total: 10 });
    expect(onProgressA).not.toHaveBeenCalled();
    expect(onProgressB).not.toHaveBeenCalled();

    workers[0].emit({ type: "progress", jobId: 2, done: 7, total: 10 });
    expect(onProgressB).toHaveBeenCalledTimes(1);
    expect(onProgressB).toHaveBeenCalledWith(7, 10);
    expect(onProgressA).not.toHaveBeenCalled();
  });

  it("resolves an error outcome when the worker posts an error message (HASH-04)", async () => {
    const { client, workers } = setup();
    const p = client.start(textA);
    workers[0].emit({
      type: "error",
      jobId: 1,
      name: "NotReadableError",
      message: "unreadable",
    });
    await expect(p).resolves.toEqual({
      status: "error",
      name: "NotReadableError",
      message: "unreadable",
    });
  });

  it("resolves cancelled when the worker confirms cancellation of the current job (HASH-04)", async () => {
    const { client, workers } = setup();
    const p = client.start(textA);
    workers[0].emit({ type: "cancelled", jobId: 1 });
    await expect(p).resolves.toEqual({ status: "cancelled" });
  });

  it("ignores a message with an unknown type for the current job (HASH-04)", async () => {
    const { client, workers } = setup();
    const p = client.start(textA);
    workers[0].emit({ type: "mystery", jobId: 1 } as unknown as WorkerResponse);

    const state = await Promise.race([
      p.then(() => "settled"),
      Promise.resolve("pending"),
    ]);
    expect(state).toBe("pending");

    const digests = fakeDigests(4);
    workers[0].emit({ type: "result", jobId: 1, digests });
    await expect(p).resolves.toEqual({ status: "done", digests });
  });

  it("recovers from a worker crash with an error outcome and a fresh worker (HASH-04)", async () => {
    const { client, workers, createWorker } = setup();
    const p = client.start(textA);
    workers[0].onerror?.({ message: "boom" });
    await expect(p).resolves.toEqual({
      status: "error",
      name: "WorkerError",
      message: "boom",
    });
    expect(workers[0].terminated).toBe(true);

    const next = client.start(textB);
    expect(createWorker).toHaveBeenCalledTimes(2);
    expect(workers).toHaveLength(2);
    expect(workers[1].posted).toEqual([
      { type: "start", jobId: 2, input: textB },
    ]);
    const digests = fakeDigests(5);
    workers[1].emit({ type: "result", jobId: 2, digests });
    await expect(next).resolves.toEqual({ status: "done", digests });
  });

  it("resolves (never rejects) with an error outcome when the worker factory throws (HASH-04)", async () => {
    const createWorker = vi.fn((): WorkerLike => {
      throw new TypeError("no workers here");
    });
    const client = createHashClient({ createWorker });
    await expect(client.start(textA)).resolves.toEqual({
      status: "error",
      name: "TypeError",
      message: "no workers here",
    });
    expect(createWorker).toHaveBeenCalledTimes(1);
  });
});
