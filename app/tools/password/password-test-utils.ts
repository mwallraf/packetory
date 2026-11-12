/**
 * Shared deterministic randomness helper for the Password tool's RTL suites.
 * Not a test file (no test infix), so vitest does not treat it as a suite.
 * Type-only import: it pulls nothing from the library at runtime.
 */
import type { RandomFill } from "@/lib/password";

/**
 * A `RandomFill` that cycles through `indices`, writing each as `value >>> 0`
 * into the passed buffer and returning it. The library draws one 32-bit value
 * per character and returns it modulo the pool size, so for small values the
 * written number is the pool index of the next character. For the default
 * pool (uppercase 0-25, lowercase 26-51, digits 52-61, symbols 62-84),
 * `cycleFill([0, 26, 52, 62])` yields "Aa0!" repeated.
 */
export function cycleFill(indices: readonly number[]): RandomFill {
  let position = 0;
  return (buf) => {
    for (let i = 0; i < buf.length; i++) {
      buf[i] = indices[position++ % indices.length]! >>> 0;
    }
    return buf;
  };
}
