import type { ParsedCidr } from "./parse";

/**
 * IPv6 subdivision-suggestion granularities (SUBNET-05, D-05/D-06). Imports
 * no UI framework code — framework-agnostic and independently testable,
 * mirroring `lib/uuid/generate.ts`'s clamp-not-throw / bounded-output
 * discipline (RESEARCH.md Open Question 2, Anti-Pattern section).
 *
 * `subdivisionOptions` NEVER enumerates or computes the actual child
 * subnets of a wide prefix (e.g. every /64 under a /48 — that would be an
 * unbounded, client-side-render-exploding operation for a /32). It only
 * ever returns a short, fixed list of standard next-step PREFIX LENGTHS
 * drawn from `{48, 56, 64}` (RFC 6177's common default-allocation
 * granularities), filtered to those strictly greater than the current
 * prefix. The result is always bounded to at most 3 entries — a structural
 * guarantee, not a runtime check, since the constant set itself only has 3
 * members.
 */

/** Fixed granularity set (RFC 6177: /48 site default, /56 common
 * residential/small-site default, /64 the universal single-subnet building
 * block) — never derived, never extended per-request. */
const STANDARD_SUBDIVISION_PREFIXES: readonly number[] = [48, 56, 64];

/**
 * Returns the bounded list of standard next-step IPv6 prefix lengths for
 * `parsed`, or `[]` when subdivision doesn't apply: IPv4 (SUBNET-05 is
 * IPv6-only) or a prefix already at/narrower than `/64` (already the
 * universal building block, nothing standard to suggest beyond it).
 *
 * Total and pure: never throws, never mutates `parsed`, and returns the
 * exact same array shape for the same input every call.
 */
export function subdivisionOptions(parsed: ParsedCidr): number[] {
  if (parsed.family === "ipv4" || parsed.prefixLength >= 64) return [];
  return STANDARD_SUBDIVISION_PREFIXES.filter(
    (prefix) => prefix > parsed.prefixLength
  );
}
