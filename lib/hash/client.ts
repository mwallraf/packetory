/**
 * Main-thread hash client (HASH-04). Framework-agnostic: no React/Next
 * import. Owns the worker lifecycle and the "supersede funnel": every
 * `start()` first resolves the in-flight job as cancelled and posts its
 * cancel message, then starts the new job; any worker message whose jobId is
 * not the current job is dropped.
 *
 * Two guarantees keep a live-typing UI from ever hanging or crashing:
 * `start()` never rejects (a throwing start `postMessage`, e.g. a
 * DataCloneError, resolves an error outcome and clears the job slot), and a
 * worker `messageerror` settles the in-flight job as an error, terminates the
 * worker, and lets the next `start()` build a fresh one.
 *
 * Every import here is type-only. This file never imports the engine, the
 * job runner, or the worker core, so loading it adds no hashing code to the
 * main-thread bundle - the engine reaches the browser only through the
 * Worker chunk.
 */
import type {
  Digests,
  HashInput,
  WorkerRequest,
  WorkerResponse,
} from "./types";

export type WorkerLike = {
  postMessage(msg: WorkerRequest): void;
  terminate(): void;
  onmessage: ((ev: { data: WorkerResponse }) => void) | null;
  onerror: ((ev: { message?: string }) => void) | null;
  onmessageerror?: ((ev: unknown) => void) | null;
};

export type HashOutcome =
  | { status: "done"; digests: Digests }
  | { status: "cancelled" }
  | { status: "error"; name: string; message: string };

export type HashClient = {
  start(
    input: HashInput,
    opts?: { onProgress?: (done: number, total: number) => void },
  ): Promise<HashOutcome>;
  cancel(): void;
  dispose(): void;
};

/**
 * The ONLY `new Worker(new URL(...))` literal in the codebase. Bundlers need
 * this exact static shape (the `new URL(...)` lexically inside the
 * `new Worker(...)` call) to emit the worker chunk.
 */
export function createDefaultWorker(): WorkerLike {
  return new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike;
}

export function createHashClient(
  opts: { createWorker?: () => WorkerLike } = {},
): HashClient {
  const make = opts.createWorker ?? createDefaultWorker;
  let worker: WorkerLike | null = null;
  let disposed = false;
  let seq = 0;
  let current: {
    id: number;
    resolve: (o: HashOutcome) => void;
    onProgress?: (done: number, total: number) => void;
  } | null = null;

  function settle(o: HashOutcome) {
    const c = current;
    current = null;
    c?.resolve(o);
  }

  function cancelCurrent() {
    if (!current) return;
    const { id } = current;
    settle({ status: "cancelled" });
    worker?.postMessage({ type: "cancel", jobId: id });
  }

  function ensureWorker(): WorkerLike {
    if (worker) return worker;
    const w = make();
    w.onmessage = (ev) => {
      const m = ev.data;
      if (!current || m.jobId !== current.id) return; // stale: superseded/disposed/unknown
      if (m.type === "progress") current.onProgress?.(m.done, m.total);
      else if (m.type === "result") settle({ status: "done", digests: m.digests });
      else if (m.type === "cancelled") settle({ status: "cancelled" });
      else if (m.type === "error") {
        settle({ status: "error", name: m.name, message: m.message });
      }
      // any other message type is ignored
    };
    w.onerror = (ev) => {
      settle({
        status: "error",
        name: "WorkerError",
        message: ev.message ?? "Worker failed",
      });
      w.terminate();
      if (worker === w) worker = null; // next start() builds a fresh worker
    };
    w.onmessageerror = () => {
      settle({
        status: "error",
        name: "WorkerError",
        message: "Unreadable worker message",
      });
      w.terminate();
      if (worker === w) worker = null; // next start() builds a fresh worker
    };
    worker = w;
    return w;
  }

  return {
    start(input, o) {
      cancelCurrent(); // THE single supersede funnel
      if (disposed) return Promise.resolve({ status: "cancelled" });
      let w: WorkerLike;
      try {
        w = ensureWorker();
      } catch (e) {
        const err = e instanceof Error ? e : null;
        return Promise.resolve({
          status: "error",
          name: err?.name ?? "Error",
          message: err?.message ?? "Worker failed",
        });
      }
      const id = ++seq;
      return new Promise<HashOutcome>((resolve) => {
        current = { id, resolve, onProgress: o?.onProgress };
        try {
          w.postMessage({ type: "start", jobId: id, input });
        } catch (e) {
          // Never reject; never echo the input. The worker stays up: a
          // DataCloneError is an input problem, not a worker failure.
          const err = e instanceof Error ? e : null;
          settle({
            status: "error",
            name: err?.name ?? "Error",
            message: err?.message ?? "Worker postMessage failed",
          });
        }
      });
    },
    cancel: cancelCurrent,
    dispose() {
      cancelCurrent();
      disposed = true;
      worker?.terminate();
      worker = null;
    },
  };
}
