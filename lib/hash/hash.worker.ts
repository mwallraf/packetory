/**
 * Web Worker entry adapter (HASH-04). Framework-agnostic: no React/Next
 * import. All behavior lives in `worker-core.ts`; this file only wires the
 * handler to the worker's `self.postMessage` / `self.onmessage`. Compiles
 * under the repo's `dom` lib with no `webworker` lib.
 */
import { createWorkerHandler } from "./worker-core";
import type { WorkerRequest, WorkerResponse } from "./types";

const handle = createWorkerHandler((m: WorkerResponse) => self.postMessage(m));
self.onmessage = (ev: MessageEvent<WorkerRequest>) => {
  void handle(ev.data);
};
