import { v4 as uuidv4, v7 as uuidv7 } from "uuid";

export type UuidVersion = "v4" | "v7";

export type GenerateBatchOptions = {
  version: UuidVersion;
  count: number;
};

/**
 * Generates a batch of UUIDs (D-01: version is a generation input, not a
 * reformat — switching v4<->v7 always produces fresh values, never
 * reinterprets an existing string). Delegates exclusively to the `uuid`
 * package's `v4()`/`v7()`, both backed by the Web Crypto CSPRNG
 * (`crypto.getRandomValues`) — never `Math.random` (T-02-01).
 *
 * `count` is defensively clamped to the integer range [1, 100] via
 * flooring + min/max, so this function is total: it never throws and
 * always returns a non-empty array, even for non-integer, negative, zero,
 * or out-of-range input. The caller (UI layer) also validates/clamps
 * batch-count input, but this module must not trust its caller.
 *
 * Returned strings are the canonical lowercase, hyphenated, 36-character
 * form (the `uuid` package's default output).
 */
export function generateBatch({
  version,
  count,
}: GenerateBatchOptions): string[] {
  // `NaN` must be normalized before clamping: `Math.trunc(NaN)`,
  // `Math.max`/`Math.min` all propagate `NaN`, and `Array.from({ length:
  // NaN }, ...)` coerces the length to 0 (`ToLength(NaN) === 0`), silently
  // returning `[]` and breaking this function's "always non-empty" total
  // contract (WR-01).
  const safeCount = Number.isFinite(count) ? count : 1;
  const clampedCount = Math.min(100, Math.max(1, Math.trunc(safeCount)));
  const generate = version === "v7" ? uuidv7 : uuidv4;
  return Array.from({ length: clampedCount }, () => generate());
}

/** Convenience: generates a single UUID of the given version. */
export function generateOne(version: UuidVersion): string {
  return generateBatch({ version, count: 1 })[0]!;
}
