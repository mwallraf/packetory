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
  onmessageerror: WorkerLike["onmessageerror"] = null;
  /** When set, the next "start" postMessage throws this value once. */
  throwOnStart: unknown = undefined;
  postMessage(m: WorkerRequest) {
    if (m.type === "start" && this.throwOnStart !== undefined) {
      const e = this.throwOnStart;
      this.throwOnStart = undefined;
      throw e;
    }
    this.posted.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: WorkerResponse) {
    this.onmessage?.({ data });
  }
}

function setup(opts: { throwOnStart?: unknown } = {}) {
  const workers: FakeWorker[] = [];
  const createWorker = vi.fn(() => {
    const w = new FakeWorker();
    if (workers.length === 0) w.throwOnStart = opts.throwOnStart;
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

  it("resolves an error outcome instead of rejecting when postMessage throws, then recovers (WR-01, HASH-04)", async () => {
    const { client, workers, createWorker } = setup({
      throwOnStart: new DOMException("could not clone", "DataCloneError"),
    });
    await expect(client.start(textA)).resolves.toEqual({
      status: "error",
      name: "DataCloneError",
      message: "could not clone",
    });
    expect(workers[0].terminated).toBe(false);

    // A late worker message for the failed job is dropped.
    workers[0].emit({ type: "result", jobId: 1, digests: fakeDigests(1) });

    const next = client.start(textB);
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(workers[0].posted).toEqual([
      { type: "start", jobId: 2, input: textB },
    ]);
    const digests = fakeDigests(6);
    workers[0].emit({ type: "result", jobId: 2, digests });
    await expect(next).resolves.toEqual({ status: "done", digests });
  });

  it("clears the current-job slot when postMessage throws so a late result changes nothing (WR-01, HASH-04)", async () => {
    const { client, workers } = setup({ throwOnStart: new Error("nope") });
    const p = client.start(textA);
    await expect(p).resolves.toEqual({
      status: "error",
      name: "Error",
      message: "nope",
    });
    // Nothing in flight: cancel() posts nothing (current slot is clear).
    client.cancel();
    expect(workers[0].posted).toEqual([]);
  });

  it("maps a thrown non-Error value to an error outcome named Error (WR-01, HASH-04)", async () => {
    const { client } = setup({ throwOnStart: "plain string" });
    await expect(client.start(textA)).resolves.toEqual({
      status: "error",
      name: "Error",
      message: "Worker postMessage failed",
    });
  });

  it("settles the in-flight job, terminates the worker and rebuilds on messageerror (WR-02, HASH-04)", async () => {
    const { client, workers, createWorker } = setup();
    const p = client.start(textA);
    workers[0].onmessageerror?.({});
    await expect(p).resolves.toEqual({
      status: "error",
      name: "WorkerError",
      message: "Unreadable worker message",
    });
    expect(workers[0].terminated).toBe(true);

    const next = client.start(textB);
    expect(createWorker).toHaveBeenCalledTimes(2);
    expect(workers[1].posted).toEqual([
      { type: "start", jobId: 2, input: textB },
    ]);
    const digests = fakeDigests(7);
    workers[1].emit({ type: "result", jobId: 2, digests });
    await expect(next).resolves.toEqual({ status: "done", digests });
  });

  it("messageerror with no job in flight does not throw and still tears the worker down (WR-02, HASH-04)", async () => {
    const { client, workers, createWorker } = setup();
    const p = client.start(textA);
    workers[0].emit({ type: "result", jobId: 1, digests: fakeDigests(1) });
    await p;
    expect(() => workers[0].onmessageerror?.({})).not.toThrow();
    expect(workers[0].terminated).toBe(true);
    void client.start(textB);
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it("never puts the input text in a WR-01 or WR-02 error outcome (T-09-07, HASH-04)", async () => {
    const secret: HashInput = { kind: "text", text: "SENTINEL-secret-text" };

    const a = setup({ throwOnStart: new DOMException("could not clone", "DataCloneError") });
    const o1 = await a.client.start(secret);

    const b = setup();
    const p = b.client.start(secret);
    b.workers[0].onmessageerror?.({});
    const o2 = await p;

    for (const o of [o1, o2]) {
      expect(o.status).toBe("error");
      expect(JSON.stringify(o)).not.toContain("SENTINEL-secret-text");
    }
  });
});
