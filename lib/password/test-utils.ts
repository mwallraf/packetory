import type { RandomFill } from "./types";

/**
 * Deterministic `RandomFill` builders for tests (D-02): this phase's suites
 * and the Phase 13-14 UI tests use them so output is reproducible. A test
 * helper only: production modules and the library barrel never import it.
 * Like the rest of the library it never names the Web Crypto method and
 * imports no node module.
 */

export type RecordingFill = RandomFill & {
  readonly calls: number;
  readonly requestedBytes: readonly number[];
};

function recorded(
  requested: number[],
  fillBuffer: (buf: Uint32Array) => Uint32Array,
): RecordingFill {
  const fn = ((buf: Uint32Array): Uint32Array => {
    requested.push(buf.byteLength);
    return fillBuffer(buf);
  }) as RandomFill;
  Object.defineProperties(fn, {
    calls: { get: () => requested.length },
    requestedBytes: { get: () => requested.slice() },
  });
  return fn as RecordingFill;
}

/**
 * Fills each request with the next queued values (each as `value >>> 0`),
 * writing into the PASSED buffer and returning it. Throws when the queue
 * cannot cover a request, so a test can never loop forever.
 */
export function queueFill(values: readonly number[]): RecordingFill {
  let position = 0;
  return recorded([], (buf) => {
    if (position + buf.length > values.length) {
      throw new Error(
        `queueFill: queue exhausted after ${values.length} values`,
      );
    }
    for (let i = 0; i < buf.length; i++) {
      buf[i] = values[position++]! >>> 0;
    }
    return buf;
  });
}

/** Fills every slot with `value >>> 0`, forever. */
export function constantFill(value: number): RecordingFill {
  return recorded([], (buf) => {
    buf.fill(value >>> 0);
    return buf;
  });
}

/** Records each request, then delegates to `source`. */
export function recordingFill(source: RandomFill): RecordingFill {
  return recorded([], (buf) => source(buf));
}
