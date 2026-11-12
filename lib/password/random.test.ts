import { afterEach, describe, expect, it, vi } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { DEFAULT_OPTIONS, MAX_FILL_BYTES } from "./constants";
import { CryptoUnavailableError } from "./errors";
import { generateBatch, generatePassword } from "./generate";
import { randomInt, resolveFill } from "./random";
import { constantFill, queueFill, recordingFill } from "./test-utils";

const TWO_32 = 2 ** 32;

describe("randomInt rejection sampling (SC-2, D-01)", () => {
  // n = 85 note: its limit (4294967295) equals 2^32 - 1, so the raw value
  // 2^32 - 1 is both "limit" and "the largest Uint32" and is rejected once.
  it.each([
    [85, 4294967295],
    [94, 4294967254],
    [7776, 4294964736],
  ])(
    "n=%i: limit %i is exact, limit - 1 is accepted, limit and 2^32 - 1 are redrawn",
    (n, limit) => {
      expect(limit).toBe(TWO_32 - (TWO_32 % n));
      // Every residue has exactly limit / n accepted preimages: exactly uniform.
      expect(limit % n).toBe(0);
      expect((limit - 1) % n).toBe(n - 1);

      const accept = queueFill([limit - 1]);
      expect(randomInt(n, accept)).toBe(n - 1);
      expect(accept.calls).toBe(1);

      const rejectLimit = queueFill([limit, 7]);
      expect(randomInt(n, rejectLimit)).toBe(7);
      expect(rejectLimit.calls).toBe(2);

      const rejectMax = queueFill([TWO_32 - 1, 7]);
      expect(randomInt(n, rejectMax)).toBe(7);
      // For n = 85 the limit IS 2^32 - 1, so this is the same boundary.
      expect(rejectMax.calls).toBe(2);
    },
  );

  it("n=1 returns 0 after one call, whatever the raw value", () => {
    const fill = queueFill([123456]);
    expect(randomInt(1, fill)).toBe(0);
    expect(fill.calls).toBe(1);
  });

  it("n=2^32 returns the raw value after one call", () => {
    const fill = queueFill([4294967295]);
    expect(randomInt(TWO_32, fill)).toBe(4294967295);
    expect(fill.calls).toBe(1);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, TWO_32 + 1, "85"])(
    "invalid maxExclusive %s throws RangeError before any fill call",
    (bad) => {
      const fill = queueFill([1, 2, 3]);
      expect(() => randomInt(bad as number, fill)).toThrow(RangeError);
      expect(fill.calls).toBe(0);
    },
  );

  it("reads the value from the array the fill returns, not the passed buffer", () => {
    const fill = (buf: Uint32Array): Uint32Array => {
      buf[0] = 5;
      return Uint32Array.of(9);
    };
    expect(randomInt(85, fill)).toBe(9);
  });

  it("a constantly rejected source throws RangeError after exactly 1000 calls", () => {
    const fill = constantFill(4294967295);
    expect(() => randomInt(85, fill)).toThrow(RangeError);
    expect(fill.calls).toBe(1000);
  });

  fcIt.prop(
    [
      fc.integer({ min: 1, max: TWO_32 }),
      fc.integer({ min: 0, max: TWO_32 - 1 }),
    ],
    { numRuns: 500 },
  )("every result is an integer in [0, n)", (n, r) => {
    const result = randomInt(n, queueFill([r, 0]));
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(n);
    const limit = TWO_32 - (TWO_32 % n);
    expect(result).toBe(r < limit ? r % n : 0);
  });
});

describe("fill byte cap (SC-2, D-02)", () => {
  it("resolveFill rejects a 16,385-element request (65,540 bytes) without calling the source", () => {
    const stub = queueFill([1]);
    const wrapped = resolveFill(stub);
    expect(() => wrapped(new Uint32Array(16_385))).toThrow(RangeError);
    expect(stub.calls).toBe(0);
  });

  it("resolveFill passes a 16,384-element request (65,536 bytes) through", () => {
    const stub = recordingFill((b) => b);
    const wrapped = resolveFill(stub);
    const buf = new Uint32Array(16_384);
    expect(wrapped(buf)).toBe(buf);
    expect(stub.calls).toBe(1);
    expect(stub.requestedBytes).toEqual([MAX_FILL_BYTES]);
  });

  it("real Web Crypto refuses requests above 65,536 bytes (why the cap exists)", () => {
    expect(() => crypto.getRandomValues(new Uint32Array(16_384))).not.toThrow();
    let caught: unknown;
    try {
      crypto.getRandomValues(new Uint32Array(16_385));
    } catch (error) {
      caught = error;
    }
    expect((caught as { name?: string } | undefined)?.name).toBe(
      "QuotaExceededError",
    );
  });

  it("single-value draws: every randomInt request is 4 bytes", () => {
    const fill = recordingFill((b) => crypto.getRandomValues(b));
    for (let i = 0; i < 1000; i++) randomInt(85, fill);
    expect(fill.calls).toBeGreaterThanOrEqual(1000);
    expect(fill.requestedBytes.every((bytes) => bytes === 4)).toBe(true);
  });
});

/**
 * Runs `fn` with `globalThis.crypto` replaced, restoring the saved value in a
 * `finally` so no later test sees a broken global.
 */
function withoutWebCrypto<T>(replacement: unknown, fn: () => T): T {
  const saved = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", {
    value: replacement,
    configurable: true,
    writable: true,
  });
  try {
    return fn();
  } finally {
    Object.defineProperty(globalThis, "crypto", {
      value: saved,
      configurable: true,
      writable: true,
    });
  }
}

function expectCryptoUnavailable(call: () => unknown): void {
  expect(call).toThrow(CryptoUnavailableError);
  let caught: unknown;
  try {
    call();
  } catch (error) {
    caught = error;
  }
  expect((caught as Error).name).toBe("CryptoUnavailableError");
}

describe("fail-closed Web Crypto (SC-2, D-02, PWD-07 guarantee)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["randomInt(85)", () => randomInt(85)],
    ["randomInt(1)", () => randomInt(1)],
    [
      "generatePassword(DEFAULT_OPTIONS)",
      () => generatePassword(DEFAULT_OPTIONS),
    ],
    [
      "generateBatch(DEFAULT_OPTIONS, 5)",
      () => generateBatch(DEFAULT_OPTIONS, 5),
    ],
  ])(
    "%s with crypto undefined throws CryptoUnavailableError, no output, Math random never used",
    (_label, call) => {
      const spy = vi.spyOn(Math, "random");
      withoutWebCrypto(undefined, () => {
        expectCryptoUnavailable(call);
      });
      expect(spy).toHaveBeenCalledTimes(0);
    },
  );

  it("crypto without the fill method (an empty object) throws CryptoUnavailableError", () => {
    const spy = vi.spyOn(Math, "random");
    withoutWebCrypto({}, () => {
      expectCryptoUnavailable(() => randomInt(85));
      expectCryptoUnavailable(() => generatePassword(DEFAULT_OPTIONS));
    });
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it("an explicit fill still works when crypto is undefined", () => {
    withoutWebCrypto(undefined, () => {
      expect(randomInt(85, queueFill([3]))).toBe(3);
      const upperOnly = {
        ...DEFAULT_OPTIONS,
        length: 4,
        lowercase: false,
        digits: false,
        symbols: false,
      };
      expect(
        generatePassword(upperOnly, { fill: queueFill([0, 1, 2, 3]) }),
      ).toBe("ABCD");
    });
  });

  it("restoring crypto restores generation (call-time resolution)", () => {
    withoutWebCrypto(undefined, () => {
      expectCryptoUnavailable(() => randomInt(85));
    });
    expect(generatePassword(DEFAULT_OPTIONS)).toHaveLength(20);
  });

  it("the default fill is bound to a crypto object installed after import (call-time binding)", () => {
    const stub = {
      getRandomValues(this: unknown, buf: Uint32Array): Uint32Array {
        if (this !== stub) {
          throw new TypeError("Illegal invocation");
        }
        buf.fill(7);
        return buf;
      },
    };
    withoutWebCrypto(stub, () => {
      expect(randomInt(85)).toBe(7);
    });
  });
});
