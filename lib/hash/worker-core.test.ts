// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHashClient, type WorkerLike } from "./client";
import { encodeText } from "./source";
import type { Digests, WorkerRequest, WorkerResponse } from "./types";
import { createWorkerHandler } from "./worker-core";

const ABC_SHA256 =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const ABC_CRC32 = "352441c2";
const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const EMPTY_CRC32 = "00000000";

// Local hex helper: lib/hash/format.ts is deliberately not imported here.
const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

type ResultMsg = Extract<WorkerResponse, { type: "result" }>;
type ProgressMsg = Extract<WorkerResponse, { type: "progress" }>;

const results = (posts: WorkerResponse[]) =>
  posts.filter((m): m is ResultMsg => m.type === "result");
const progresses = (posts: WorkerResponse[]) =>
  posts.filter((m): m is ProgressMsg => m.type === "progress");

// TextEncoder output is typed over ArrayBufferLike; Blob wants ArrayBuffer.
const abcBlob = () => new Blob([encodeText("abc") as Uint8Array<ArrayBuffer>]);

const noYield = { yieldFn: async () => {} };

function makeHandler() {
  const posts: WorkerResponse[] = [];
  const handle = createWorkerHandler((m) => posts.push(m), noYield);
  return { posts, handle };
}

const start = (
  jobId: number,
  input: Extract<WorkerRequest, { type: "start" }>["input"],
): WorkerRequest => ({ type: "start", jobId, input });

let consoleSpies: ReturnType<typeof vi.spyOn>[] = [];

beforeEach(() => {
  consoleSpies = [
    vi.spyOn(console, "log").mockImplementation(() => {}),
    vi.spyOn(console, "error").mockImplementation(() => {}),
    vi.spyOn(console, "warn").mockImplementation(() => {}),
  ];
});

afterEach(() => {
  // HASH-02 privacy prohibition: the handler never writes to the console.
  for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

describe("createWorkerHandler direct protocol (HASH-04)", () => {
  it("hashes text 'abc' and posts progress done===total before the result (HASH-04 ordering)", async () => {
    const { posts, handle } = makeHandler();
    await handle(start(1, { kind: "text", text: "abc" }));

    const last = posts[posts.length - 1];
    expect(last.type).toBe("result");
    const r = last as ResultMsg;
    expect(r.jobId).toBe(1);
    expect(hex(r.digests.sha256)).toBe(ABC_SHA256);
    expect(hex(r.digests.crc32)).toBe(ABC_CRC32);

    const progress = progresses(posts);
    expect(progress.length).toBeGreaterThanOrEqual(1);
    expect(progress[0]).toMatchObject({ jobId: 1, done: 3, total: 3 });
    expect(posts.indexOf(progress[progress.length - 1])).toBeLessThan(
      posts.indexOf(last),
    );
  });

  it("emits non-decreasing progress ending at done===total, then the result (HASH-04 ordering)", async () => {
    const { posts, handle } = makeHandler();
    const text = "x".repeat(3 * 1024 * 1024 + 5);
    let t = 0;
    vi.spyOn(Date, "now").mockImplementation(() => (t += 200));
    await handle(start(1, { kind: "text", text }));

    const progress = progresses(posts);
    expect(progress).toHaveLength(4);
    const dones = progress.map((p) => p.done);
    for (let i = 1; i < dones.length; i++) {
      expect(dones[i]).toBeGreaterThanOrEqual(dones[i - 1]);
    }
    expect(progress.every((p) => p.total === 3145733)).toBe(true);
    const lastProgress = progress[progress.length - 1];
    expect(lastProgress.done).toBe(lastProgress.total);
    expect(posts[posts.length - 1].type).toBe("result");
    expect(results(posts)).toHaveLength(1);
  });

  it("throttles progress but always emits the final tick (HASH-04)", async () => {
    const { posts, handle } = makeHandler();
    const text = "x".repeat(3 * 1024 * 1024 + 5);
    await handle(start(1, { kind: "text", text }));

    const progress = progresses(posts);
    expect(progress.length).toBeGreaterThanOrEqual(1);
    expect(progress.length).toBeLessThanOrEqual(4);
    const lastProgress = progress[progress.length - 1];
    expect(lastProgress.done).toBe(lastProgress.total);
    expect(lastProgress.total).toBe(3145733);
  });

  it("posts exactly one result and no progress for empty text and an empty Blob (HASH-04 empty)", async () => {
    for (const input of [
      { kind: "text", text: "" } as const,
      { kind: "file", file: new Blob([]) } as const,
    ]) {
      const { posts, handle } = makeHandler();
      await handle(start(1, input));
      expect(posts).toHaveLength(1);
      const r = posts[0] as ResultMsg;
      expect(r.type).toBe("result");
      expect(hex(r.digests.sha256)).toBe(EMPTY_SHA256);
      expect(hex(r.digests.crc32)).toBe(EMPTY_CRC32);
      expect(progresses(posts)).toHaveLength(0);
    }
  });

  it("hashes a Blob input (HASH-04)", async () => {
    const { posts, handle } = makeHandler();
    await handle(start(1, { kind: "file", file: abcBlob() }));
    const [r] = results(posts);
    expect(hex(r.digests.crc32)).toBe(ABC_CRC32);
    expect(hex(r.digests.sha256)).toBe(ABC_SHA256);
  });

  it("posts cancelled and no result when cancel arrives in the same tick as start (HASH-04)", async () => {
    const { posts, handle } = makeHandler();
    const text = "x".repeat(8 * 1024 * 1024);
    const running = handle(start(1, { kind: "text", text }));
    void handle({ type: "cancel", jobId: 1 });
    await running;

    expect(posts).toContainEqual({ type: "cancelled", jobId: 1 });
    expect(results(posts)).toHaveLength(0);
  });

  it("ignores a cancel for an unknown jobId and a message of unknown type (HASH-04)", async () => {
    const { posts, handle } = makeHandler();
    await expect(
      handle({ type: "cancel", jobId: 999 }),
    ).resolves.toBeUndefined();
    await expect(
      handle({ type: "mystery", jobId: 1 } as unknown as WorkerRequest),
    ).resolves.toBeUndefined();
    expect(posts).toHaveLength(0);
  });

  it("posts a TypeError for an unsupported input kind (HASH-04)", async () => {
    const { posts, handle } = makeHandler();
    await handle(
      start(7, { kind: "url" } as unknown as { kind: "text"; text: string }),
    );
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      type: "error",
      jobId: 7,
      name: "TypeError",
    });
  });

  it("never echoes the input text in any posted message or console output (HASH-02 privacy prohibition)", async () => {
    const posts: WorkerResponse[] = [];
    const handle = createWorkerHandler((m) => posts.push(m), {
      yieldFn: async () => {
        throw new Error("boom");
      },
    });
    await handle(
      start(1, { kind: "text", text: "SENTINEL-c0ffee-secret" }),
    );

    const errors = posts.filter((m) => m.type === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ name: "Error", message: "boom" });
    expect(JSON.stringify(posts)).not.toContain("SENTINEL-c0ffee-secret");

    // A successful run must not leak the text either.
    const okPosts: WorkerResponse[] = [];
    const okHandle = createWorkerHandler((m) => okPosts.push(m), noYield);
    await okHandle(
      start(2, { kind: "text", text: "SENTINEL-c0ffee-secret" }),
    );
    expect(JSON.stringify(okPosts)).not.toContain("SENTINEL-c0ffee-secret");
    // Console silence is asserted for the whole file in afterEach.
  });

  it("reports an unreadable Blob slice as NotReadableError (HASH-04)", async () => {
    const { posts, handle } = makeHandler();
    const unreadable = {
      size: 10,
      slice: () => ({
        arrayBuffer: () =>
          Promise.reject(new DOMException("unreadable", "NotReadableError")),
      }),
    } as unknown as Blob;
    await handle(start(3, { kind: "file", file: unreadable }));
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      type: "error",
      jobId: 3,
      name: "NotReadableError",
    });
  });
});

/**
 * Loopback worker: postMessage -> setTimeout -> the REAL handler -> every
 * handler post -> setTimeout -> onmessage. Objects pass by reference (no
 * structuredClone, 08-RESEARCH Pitfall 4). Uses the default MessageChannel
 * yield and real hashing.
 */
function createLoopbackWorker(posts: WorkerResponse[]): WorkerLike {
  const handle = createWorkerHandler((m) => {
    posts.push(m);
    setTimeout(() => worker.onmessage?.({ data: m }), 0);
  });
  const worker: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage(msg: WorkerRequest) {
      setTimeout(() => void handle(msg), 0);
    },
    terminate() {},
  };
  return worker;
}

describe("loopback worker with real hashing (HASH-04)", () => {
  it("really aborts a superseded 8 MiB job and returns the published digest for the new one (HASH-04)", async () => {
    const posts: WorkerResponse[] = [];
    const client = createHashClient({
      createWorker: () => createLoopbackWorker(posts),
    });
    const p1 = client.start({ kind: "text", text: "x".repeat(8 * 1024 * 1024) });
    const p2 = client.start({ kind: "text", text: "abc" });

    await expect(p1).resolves.toEqual({ status: "cancelled" });
    const second = await p2;
    expect(second.status).toBe("done");
    const digests = (second as { status: "done"; digests: Digests }).digests;
    expect(hex(digests.sha256)).toBe(ABC_SHA256);

    // The worker itself stopped job 1; it was not merely ignored client-side.
    expect(posts).toContainEqual({ type: "cancelled", jobId: 1 });
    expect(
      posts.some((m) => m.type === "result" && m.jobId === 1),
    ).toBe(false);
    client.dispose();
  });

  it("hashes a File/Blob input through the loopback (HASH-04)", async () => {
    const posts: WorkerResponse[] = [];
    const client = createHashClient({
      createWorker: () => createLoopbackWorker(posts),
    });
    const outcome = await client.start({
      kind: "file",
      file: abcBlob(),
    });
    expect(outcome.status).toBe("done");
    const digests = (outcome as { status: "done"; digests: Digests }).digests;
    expect(hex(digests.crc32)).toBe(ABC_CRC32);
    client.dispose();
  });
});
