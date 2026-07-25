/**
 * Framework-agnostic single-resolver DoH JSON query (DNS-09, T-04-04). No
 * React/Next import. Builds the correct per-resolver request (Cloudflare
 * needs `Accept: application/dns-json` + `name`/`type` query params; Google
 * needs `name`/`type` only, per 04-RESEARCH.md's live-curl verification) and
 * composes a per-call timeout with the caller-supplied `AbortSignal` so a
 * hung resolver is treated as failed after `RESOLVER_TIMEOUT_MS` without
 * waiting forever.
 *
 * `CLOUDFLARE_URL`/`GOOGLE_URL` are hardcoded string literals (T-04-04) —
 * the only user-controlled inputs are `name`/`type`, both validated before
 * use; no custom-resolver feature exists.
 */

import type { RecordType } from "./types";

export const CLOUDFLARE_URL = "https://cloudflare-dns.com/dns-query";
export const GOOGLE_URL = "https://dns.google/resolve";
export const RESOLVER_TIMEOUT_MS = 5000;

/**
 * Queries a single DoH resolver for `name`/`type`, returning the raw
 * `Response` (callers inspect `.ok`/`.status`/`.json()` themselves, per
 * `lib/dns/resolve.ts`'s classification logic). Rejects with an
 * `AbortError`-named `DOMException` if the request exceeds `timeoutMs` OR
 * if the caller-supplied `signal` aborts first — both are surfaced via the
 * same internal controller so a single `catch` handles both cases upstream.
 */
export function queryResolver(
  name: string,
  type: RecordType,
  resolverUrl: string,
  signal: AbortSignal,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();

  const onExternalAbort = () => controller.abort();
  if (signal.aborted) {
    controller.abort();
  } else {
    signal.addEventListener("abort", onExternalAbort);
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = new URL(resolverUrl);
  url.searchParams.set("name", name);
  url.searchParams.set("type", type);

  const headers: Record<string, string> | undefined =
    resolverUrl === CLOUDFLARE_URL
      ? { accept: "application/dns-json" }
      : undefined;

  return fetch(url.toString(), {
    signal: controller.signal,
    headers,
  }).finally(() => {
    clearTimeout(timeoutId);
    signal.removeEventListener("abort", onExternalAbort);
  });
}
