/**
 * Central, safe-by-default query-param redaction utility (QUAL-06, D-13).
 *
 * A param is reported to analytics ONLY if its name is explicitly present in
 * the `allowList`. There is no block-list, no denylist, and no default-report
 * path — the allow-list is the sole inclusion mechanism. This means a
 * brand-new, never-before-seen sensitive param (a future `?mac=`, `?secret=`,
 * an internal hostname, a private IP) is excluded automatically, with zero
 * code change, simply by never being added to the allow-list.
 *
 * Later tools ADD their known-safe param names to the allow-list as they
 * ship (e.g. Phase 4 DNS Lookup might add `type` for the record-type query
 * param). A param is excluded by default just by not being listed here.
 *
 * Framework-agnostic — no Next.js/React import — so it is independently
 * unit-testable and reusable from both client components and any future
 * API route.
 */

/**
 * Phase 1 default allow-list. Empty because no tool has shipped any URL
 * query-param state yet (Phase 3's Subnet Calculator is the first). Keep
 * this empty until a specific, reviewed param name is deliberately added.
 */
export const DEFAULT_ALLOW_LIST: readonly string[] = [];

/** Accepted input shapes for ergonomic reuse across pages/routes. */
export type RedactInput =
  | URLSearchParams
  | string
  | Record<string, string | undefined>;

/**
 * Returns only the entries of `input` whose key is explicitly present in
 * `allowList` (exact string match, not prefix/substring). Every other entry
 * is omitted entirely from the output — never blanked, never included by
 * default. Deterministic regardless of the input's param order (iterates
 * the allow-list, not the input). Never throws, even for an empty/missing
 * query string.
 */
export function redactParams(
  input: RedactInput,
  allowList: readonly string[] = DEFAULT_ALLOW_LIST
): Record<string, string> {
  const values = toValueMap(input);
  const result: Record<string, string> = {};

  for (const key of allowList) {
    const value = values.get(key);
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

/** Normalizes any accepted RedactInput shape into a key -> value lookup map. */
function toValueMap(input: RedactInput): Map<string, string> {
  if (input instanceof URLSearchParams) {
    return new Map(input.entries());
  }

  if (typeof input === "string") {
    const queryStart = input.indexOf("?");
    const queryString = queryStart >= 0 ? input.slice(queryStart + 1) : input;
    return new Map(new URLSearchParams(queryString).entries());
  }

  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      map.set(key, value);
    }
  }
  return map;
}
