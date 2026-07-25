/**
 * Framework-agnostic primary→fallback DNS-over-HTTPS resolution (DNS-09,
 * T-04-04). No React/Next import. Implements 04-RESEARCH.md Pattern 3
 * exactly: Cloudflare first; a successful 2xx response is a completed
 * lookup from the primary resolver for ANY DNS `Status` (0=NOERROR
 * including empty NODATA, 3=NXDOMAIN) EXCEPT `Status: 2` (SERVFAIL), which
 * is treated as a genuine failure per Assumption A1 (04-01-PLAN.md
 * `<assumptions>`). Google is only ever attempted on a genuine primary
 * failure (network error, non-2xx HTTP status, HTTP 429, timeout, or
 * SERVFAIL) — never on a legitimate NXDOMAIN/empty-NOERROR answer
 * (D-01/D-09 "never silently switching when results could differ").
 *
 * A caller-aborted `signal` propagates untouched (re-thrown, no fallback
 * attempt) — cancellation is not a "failure" (Pitfall 2).
 */

import { CLOUDFLARE_URL, GOOGLE_URL, queryResolver, RESOLVER_TIMEOUT_MS } from "./query";
import {
  RateLimitError,
  ResolverFailureError,
  type DohResponse,
  type RecordType,
  type ResolverUsed,
} from "./types";

/**
 * Queries one resolver and classifies its outcome into either a parsed
 * `DohResponse` or a thrown, already-classified error (`RateLimitError` /
 * `ResolverFailureError`). A raw network-level throw from `queryResolver`
 * itself (not a `Response` at all — e.g. a `TypeError` from a DNS/network
 * failure) is wrapped into `ResolverFailureError` here so every caller only
 * ever has to handle the two typed error classes, never a raw unclassified
 * exception — UNLESS the signal was already aborted, in which case the
 * original abort error is re-thrown untouched (cancellation, not failure).
 */
async function queryAndClassify(
  name: string,
  type: RecordType,
  resolverUrl: string,
  signal: AbortSignal
): Promise<DohResponse> {
  let response: Response;
  try {
    response = await queryResolver(name, type, resolverUrl, signal, RESOLVER_TIMEOUT_MS);
  } catch (err) {
    if (signal.aborted) throw err;
    throw new ResolverFailureError(null);
  }

  if (response.status === 429) throw new RateLimitError();
  if (!response.ok) throw new ResolverFailureError(response.status);

  // WR-02: a 2xx response with a malformed/non-JSON body (e.g. an
  // intermittent CDN error page or truncated response) must also be
  // classified into `ResolverFailureError` — never a raw `SyntaxError` —
  // so every caller can keep relying on the two-typed-error contract this
  // module documents above.
  let body: DohResponse;
  try {
    body = (await response.json()) as DohResponse;
  } catch {
    throw new ResolverFailureError(response.status);
  }
  // Assumption A1: SERVFAIL is a genuine resolver failure, not a legitimate
  // negative answer — trigger fallback rather than rendering it directly.
  if (body.Status === 2) throw new ResolverFailureError(response.status);

  return body;
}

/**
 * Resolves `name`/`type` via Cloudflare first, falling back to Google only
 * on a genuine primary-resolver failure. Returns which resolver actually
 * produced the rendered answer (`resolverUsed`) — never hardcoded or
 * assumed, always set by which call succeeded (T-04-01/T-04-04
 * transparency requirement).
 */
export async function resolveWithFallback(
  name: string,
  type: RecordType,
  signal: AbortSignal
): Promise<{ resolverUsed: ResolverUsed; response: DohResponse }> {
  try {
    const response = await queryAndClassify(name, type, CLOUDFLARE_URL, signal);
    return { resolverUsed: "primary", response };
  } catch (err) {
    if (signal.aborted) throw err;
    const response = await queryAndClassify(name, type, GOOGLE_URL, signal);
    return { resolverUsed: "fallback", response };
  }
}
