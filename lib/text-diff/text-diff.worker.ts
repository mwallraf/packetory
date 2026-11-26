import { compareText } from "./engine";
import type { TextDiffInput, TextDiffResult } from "./types";

self.onmessage = (event: MessageEvent<TextDiffInput>) => {
  let result: TextDiffResult;
  try {
    result = compareText(event.data);
  } catch {
    result = { status: "error", code: "worker-error" };
  }
  self.postMessage(result);
};
