/**
 * Client-side vendor-lookup wrapper + session in-memory OUI→result cache
 * (D-03, MAC-03). Mirrors `lib/dns/resolve.ts`'s "classify a fetch into a
 * typed, non-throwing outcome" shape, but simpler: `/api/mac-vendor` never
 * throws from this app's own perspective (05-RESEARCH.md Pattern 3) — it
 * always responds 200 with a typed `status` field, so the only genuine
 * failure modes `lookupVendor` itself has to classify are this client's own
 * network being unavailable, a non-2xx/malformed response from our own
 * route (defensive-only — the route is designed to never produce one), or
 * the caller's `AbortSignal` firing. An abort is cancellation, not a
 * failure — it is re-thrown untouched (mirrors `resolve.ts`'s Pitfall 2
 * handling) so the caller's own race-safety guard, not this cache, decides
 * what a cancelled lookup means.
 *
 * The cache is a plain module-level `Map<string, VendorState>` keyed by
 * `ouiHex` (6 hex chars) — session-scoped (cleared on a full page reload),
 * satisfying D-03's "re-editing the host portion of an already-looked-up
 * OUI does not re-hit the API" requirement. Every resolved kind (`found`,
 * `not-found`, `unavailable`) is cached, matching 05-RESEARCH.md's own
 * "Client-side session OUI cache + debounce" code example — an `unavailable`
 * result for a given OUI is not retried automatically within the same
 * session; a fresh page load (a new module instance) resets the cache.
 *
 * Only the 6-hex-character OUI is ever sent — `ouiHex` is the caller's
 * responsibility to supply from `classification.ouiHex` (MAC-10 by
 * construction; the full MAC is never in scope of this module at all).
 */
import type { VendorState } from "./types";

const vendorCache = new Map<string, VendorState>();

/** The exact shape `/api/mac-vendor` always responds with (200, typed
 * `status` field) — mirrors `route.ts`'s own response contract. */
type MacVendorRouteResponse =
  | { status: "unavailable" }
  | { status: "ok"; found: boolean; company: string | null };

/**
 * Resolves the vendor for a given OUI: a cache hit short-circuits with no
 * fetch at all; a cache miss fetches `/api/mac-vendor?oui=<ouiHex>`, maps
 * the route's response into the 4-kind `VendorState`, caches it, and
 * returns it. Never called for a locally-administered/likely-randomized MAC
 * (D-12) — callers gate that decision themselves (`classification`, not
 * `ouiHex` alone, carries that flag).
 */
export async function lookupVendor(
  ouiHex: string,
  signal?: AbortSignal
): Promise<VendorState> {
  const cached = vendorCache.get(ouiHex);
  if (cached) return cached;

  let result: VendorState;
  try {
    const response = await fetch(`/api/mac-vendor?oui=${ouiHex}`, { signal });
    if (!response.ok) {
      // Defensive-only: `route.ts` is designed to always respond 200 with a
      // typed status, so this branch should be unreachable in practice —
      // kept so a genuinely unexpected non-2xx still degrades neutrally
      // (D-11) rather than throwing an unclassified error.
      result = { kind: "unavailable" };
    } else {
      const body = (await response.json()) as MacVendorRouteResponse;
      result =
        body.status === "unavailable"
          ? { kind: "unavailable" }
          : body.found
            ? { kind: "found", company: body.company ?? "" }
            : { kind: "not-found" };
    }
  } catch (err) {
    if (signal?.aborted) throw err; // cancellation, not a failure (Pitfall 2)
    result = { kind: "unavailable" };
  }

  vendorCache.set(ouiHex, result);
  return result;
}

/** Test-only escape hatch to reset the module-level session cache between
 * test cases — never called from application code (the cache is meant to
 * persist for the lifetime of a real page session). */
export function __resetVendorCacheForTests(): void {
  vendorCache.clear();
}
