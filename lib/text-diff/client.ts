import { exceedsInputLength } from "./limits";
import type { TextDiffInput, TextDiffResult } from "./types";

export type TextDiffOutcome = TextDiffResult | { status: "cancelled" };

const WORKER_TIMEOUT_MS = 3_000;

type WorkerPort = {
  postMessage(input: TextDiffInput): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<TextDiffResult>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
};

function createDefaultWorker(): WorkerPort {
  return new Worker(new URL("./text-diff.worker.ts", import.meta.url), { type: "module" });
}

export function createTextDiffClient(createWorker = createDefaultWorker) {
  let cancelCurrent: (() => void) | undefined;

  return {
    compare(input: TextDiffInput): Promise<TextDiffOutcome> {
      cancelCurrent?.();
      if (exceedsInputLength(input.original, input.modified)) {
        return Promise.resolve({ status: "error", code: "input-limit" });
      }
      return new Promise((resolve) => {
        let worker: WorkerPort;
        try {
          worker = createWorker();
        } catch {
          resolve({ status: "error", code: "worker-error" });
          return;
        }

        const finish = (outcome: TextDiffOutcome) => {
          if (cancelCurrent !== cancel) return;
          cancelCurrent = undefined;
          clearTimeout(timeout);
          worker.terminate();
          resolve(outcome);
        };
        const cancel = () => finish({ status: "cancelled" });
        const fail = () => finish({ status: "error", code: "worker-error" });
        const timeout = setTimeout(fail, WORKER_TIMEOUT_MS);
        cancelCurrent = cancel;
        worker.onmessage = ({ data }) => finish(data);
        worker.onerror = (event) => {
          event.preventDefault();
          fail();
        };
        worker.onmessageerror = fail;
        try {
          worker.postMessage(input);
        } catch {
          fail();
        }
      });
    },
    cancel() {
      cancelCurrent?.();
    },
  };
}
