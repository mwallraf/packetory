import { afterEach, describe, expect, it, vi } from "vitest";
import { createTextDiffClient } from "./client";
import { MAX_INPUT_LENGTH } from "./limits";
import type { TextDiffInput, TextDiffResult } from "./types";

class TestWorker {
  postMessage = vi.fn<(input: TextDiffInput) => void>();
  terminate = vi.fn();
  onmessage: ((event: MessageEvent<TextDiffResult>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  reply(data: TextDiffResult) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }
}

const input = { original: "old", modified: "new" };
const result: TextDiffResult = { status: "done", rows: [] };

describe("createTextDiffClient", () => {
  afterEach(() => vi.useRealTimers());

  it("does not start a worker for an oversized source", async () => {
    const makeWorker = vi.fn(() => new TestWorker());
    const client = createTextDiffClient(makeWorker);
    await expect(client.compare({ original: "x".repeat(MAX_INPUT_LENGTH + 1), modified: "" }))
      .resolves.toEqual({ status: "error", code: "input-limit" });
    expect(makeWorker).not.toHaveBeenCalled();
  });

  it("cancels exactly once and ignores a late response during the next job", async () => {
    const first = new TestWorker();
    const second = new TestWorker();
    const makeWorker = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const client = createTextDiffClient(makeWorker);
    expect(makeWorker).not.toHaveBeenCalled();

    const original = client.compare(input);
    expect(first.postMessage).toHaveBeenCalledWith(input);
    client.cancel();
    client.cancel();
    await expect(original).resolves.toEqual({ status: "cancelled" });
    expect(first.terminate).toHaveBeenCalledTimes(1);

    const retry = client.compare(input);
    first.reply({ status: "error", code: "worker-error" });
    second.reply(result);
    await expect(retry).resolves.toEqual(result);
    expect(second.terminate).toHaveBeenCalledTimes(1);
  });

  it("supersedes pending work with a fresh worker", async () => {
    const first = new TestWorker();
    const second = new TestWorker();
    const client = createTextDiffClient(vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second));
    const stale = client.compare(input);
    const latest = client.compare(input);
    await expect(stale).resolves.toEqual({ status: "cancelled" });
    expect(first.terminate).toHaveBeenCalledTimes(1);
    second.reply(result);
    await expect(latest).resolves.toEqual(result);
  });

  it("can retry after a worker throws during postMessage", async () => {
    const first = new TestWorker();
    const second = new TestWorker();
    first.postMessage.mockImplementationOnce(() => { throw new Error("input must not be exposed"); });
    const client = createTextDiffClient(vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second));
    await expect(client.compare(input)).resolves.toEqual({ status: "error", code: "worker-error" });
    expect(first.terminate).toHaveBeenCalledTimes(1);
    const retry = client.compare(input);
    second.reply(result);
    await expect(retry).resolves.toEqual(result);
  });

  it("terminates a silent worker and reports a recoverable error", async () => {
    vi.useFakeTimers();
    const worker = new TestWorker();
    const client = createTextDiffClient(() => worker);
    const compare = client.compare(input);
    await vi.runAllTimersAsync();
    await expect(compare).resolves.toEqual({ status: "error", code: "worker-error" });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
