import { MAX_FILL_BYTES } from "./constants";
import { CryptoUnavailableError } from "./errors";
import type { RandomFill } from "./types";

const TWO_32 = 4_294_967_296;
const MAX_REDRAWS = 1_000;

/**
 * Resolves the randomness source (D-02). An explicit `fill` wins; otherwise
 * the Web Crypto fill method is looked up at CALL time (never at import) and
 * bound to the crypto object, since an unbound call throws a TypeError. When
 * Web Crypto is absent this throws `CryptoUnavailableError`: there is never a
 * weaker fallback source. The returned wrapper rejects any request above
 * `MAX_FILL_BYTES` (a Web Crypto fill throws QuotaExceededError past 65,536
 * bytes) without touching the source.
 */
export function resolveFill(fill?: RandomFill): RandomFill {
  let source: RandomFill | undefined;
  if (typeof fill === "function") {
    source = fill;
  } else {
    source = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  }
  if (source === undefined) {
    throw new CryptoUnavailableError();
  }
  const resolved = source;
  return (buf: Uint32Array): Uint32Array => {
    if (buf.byteLength > MAX_FILL_BYTES) {
      throw new RangeError(
        `Random fill request of ${buf.byteLength} bytes exceeds the ${MAX_FILL_BYTES}-byte cap.`,
      );
    }
    return resolved(buf);
  };
}

/**
 * Uniform random integer in [0, maxExclusive) (D-01). This is the only file
 * in the library allowed to name the Web Crypto method, and the only place a
 * random value is reduced. Unbiased: it draws one Uint32 per fill call
 * (4 bytes, far inside the per-attempt bound and the 65,536-byte cap) and
 * accepts `r < 2^32 - (2^32 % n)`, so every residue is equally likely; larger
 * draws are redrawn. There is no shuffle anywhere in the library. Callers
 * pass `fill` for deterministic tests.
 */
export function randomInt(maxExclusive: number, fill?: RandomFill): number {
  if (
    !Number.isInteger(maxExclusive) ||
    maxExclusive < 1 ||
    maxExclusive > TWO_32
  ) {
    throw new RangeError(
      `randomInt: maxExclusive must be an integer in [1, ${TWO_32}].`,
    );
  }
  const draw = resolveFill(fill);
  const limit = TWO_32 - (TWO_32 % maxExclusive);
  const buf = new Uint32Array(1);
  for (let i = 0; i < MAX_REDRAWS; i++) {
    // Read from the array the fill RETURNS: a stub may return a fresh one.
    const r = draw(buf)[0]!;
    if (r < limit) {
      return r % maxExclusive;
    }
  }
  throw new RangeError(
    "randomInt: no value below the rejection limit after 1000 draws; the fill source is not uniform",
  );
}
