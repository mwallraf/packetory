/**
 * Shared RTL helpers for the hash tool tests. Not a test file. Imports only
 * vitest, type-only client/types and the algorithm metadata - never `job`,
 * `engine` or `worker-core` - so the HASH-04 boundaries walk stays green.
 */
import { vi, type Mock } from "vitest";
import type { HashClient, HashOutcome } from "@/lib/hash/client";
import { ALGORITHMS } from "@/lib/hash/algorithms";
import type { Digests, HashInput } from "@/lib/hash/types";

export type FakeStart = {
  input: HashInput;
  resolve: (outcome: HashOutcome) => void;
  reject: (error: unknown) => void;
};

export type FakeHashClient = {
  client: HashClient;
  starts: FakeStart[];
  cancel: Mock;
  dispose: Mock;
};

/**
 * A HashClient whose `start()` records the input and returns a deferred
 * promise, so tests resolve (or reject) each job at a moment of their choice.
 */
export function createFakeHashClient(): FakeHashClient {
  const starts: FakeStart[] = [];
  const cancel = vi.fn();
  const dispose = vi.fn();
  const client: HashClient = {
    start(input) {
      return new Promise<HashOutcome>((resolve, reject) => {
        starts.push({ input, resolve, reject });
      });
    },
    cancel,
    dispose,
  };
  return { client, starts, cancel, dispose };
}

/** Every algorithm gets `bits / 8` bytes filled with `fill`. */
export function fakeDigests(fill: number): Digests {
  const out = {} as Digests;
  for (const algo of ALGORITHMS) {
    out[algo.id] = new Uint8Array(algo.bits / 8).fill(fill);
  }
  return out;
}

/** Replaces `navigator.clipboard` with a resolving `writeText` mock. */
export function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  return writeText;
}
