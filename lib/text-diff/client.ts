import type { TextDiffInput, TextDiffResult } from "./types";

export type TextDiffOutcome = TextDiffResult | { status: "cancelled" };

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
      return new Promise((resolve) => {
        try {
          const worker = createWorker();
          const finish = (outcome: TextDiffOutcome) => {
            if (cancelCurrent !== cancel) return;
            cancelCurrent = undefined;
            worker.terminate();
            resolve(outcome);
          };
          const cancel = () => finish({ status: "cancelled" });
          cancelCurrent = cancel;
          worker.onmessage = ({ data }) => finish(data);
          worker.onerror = (event) => {
            event.preventDefault();
            finish({ status: "error", code: "worker-error" });
          };
          worker.onmessageerror = () => finish({ status: "error", code: "worker-error" });
          try {
            worker.postMessage(input);
          } catch {
            finish({ status: "error", code: "worker-error" });
          }
        } catch {
          resolve({ status: "error", code: "worker-error" });
        }
      });
    },
    cancel() {
      cancelCurrent?.();
    },
  };
}
