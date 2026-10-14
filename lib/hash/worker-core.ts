/**
 * Worker protocol handler (HASH-01, HASH-04). Pure and framework-agnostic:
 * no React/Next import and no `self` reference, so it runs under Vitest with
 * an injected `post` function. `hash.worker.ts` is the thin adapter that
 * wires it to `self.postMessage`.
 *
 * Privacy: posted messages carry only jobId, byte counts, digests, and a
 * thrown error's name/message. The input text (or any part of it) is never
 * included in a message, and nothing here logs to the console.
 */
import { runHashJob, type JobOptions } from "./job";
import { blobChunks, bytesChunks, encodeText } from "./source";
import type { WorkerRequest, WorkerResponse } from "./types";

/** Progress is throttled to ~10 Hz; the final tick is always emitted. */
export const PROGRESS_INTERVAL_MS = 100;

export function createWorkerHandler(
  post: (m: WorkerResponse) => void,
  jobDefaults: Pick<JobOptions, "yieldFn"> = {},
): (msg: WorkerRequest) => Promise<void> {
  const jobs = new Map<number, AbortController>();

  async function runJob(
    msg: Extract<WorkerRequest, { type: "start" }>,
  ): Promise<void> {
    const { jobId } = msg;
    const ac = new AbortController();
    jobs.set(jobId, ac); // register synchronously, before the first await
    try {
      let source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>;
      let total: number;
      const input = msg.input;
      if (input?.kind === "text") {
        const bytes = encodeText(input.text);
        source = bytesChunks(bytes);
        total = bytes.length;
      } else if (input?.kind === "file") {
        source = blobChunks(input.file);
        total = input.file.size;
      } else {
        post({
          type: "error",
          jobId,
          name: "TypeError",
          message: "Unsupported hash input",
        });
        return;
      }
      let sentProgress = false;
      let last = 0;
      const digests = await runHashJob(source, {
        ...jobDefaults,
        total,
        signal: ac.signal,
        onProgress: (done, t) => {
          const now = Date.now();
          if (!sentProgress || now - last >= PROGRESS_INTERVAL_MS || done === t) {
            sentProgress = true;
            last = now;
            post({ type: "progress", jobId, done, total: t });
          }
        },
      });
      post({ type: "result", jobId, digests });
    } catch (e) {
      if (ac.signal.aborted) {
        post({ type: "cancelled", jobId });
      } else if (e instanceof Error) {
        post({ type: "error", jobId, name: e.name, message: e.message });
      } else {
        post({
          type: "error",
          jobId,
          name: "Error",
          message: "Hash job failed",
        });
      }
    } finally {
      jobs.delete(jobId);
    }
  }

  return async function handle(msg: WorkerRequest): Promise<void> {
    if (msg?.type === "cancel") {
      jobs.get(msg.jobId)?.abort(); // unknown jobId is a silent no-op
    } else if (msg?.type === "start") {
      await runJob(msg);
    }
    // any other message type is ignored with no post
  };
}
