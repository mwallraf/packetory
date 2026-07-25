import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/mac-vendor?oui=<6 hex chars> — proxies a single OUI (Organizationally
 * Unique Identifier, the first 3 bytes of a MAC address) to maclookup.app's
 * public vendor-lookup API (MAC-03, D-01, D-02). This is the FIRST
 * upstream-fetching Route Handler in this codebase — `app/api/ip/route.ts`
 * reads only request headers, it never calls out to a third party.
 *
 * Privacy (MAC-10, T-05-02): the caller (`lib/mac/vendor.ts`) sends only the
 * 6-hex-character OUI, never the full MAC — `classification.ouiHex` is
 * computed from `bytes[0..2]` only, so the host portion of the address
 * (bytes[3..5]) is architecturally incapable of reaching this route, this
 * route's logs, or the upstream request. `oui` is independently re-validated
 * here (never trust the client alone — this endpoint is public and directly
 * reachable) before it is ever interpolated into the outbound URL.
 *
 * Security (T-05-01, V5/V13): the upstream host is a HARDCODED string
 * literal (`https://api.maclookup.app`) — never derived from request input —
 * mirroring `lib/dns/query.ts`'s `CLOUDFLARE_URL`/`GOOGLE_URL` convention.
 * `oui` is validated against a strict, fixed-length hex pattern BEFORE any
 * network call, so a missing/malformed/over-length value is rejected with a
 * 400 with zero upstream traffic (D-01).
 *
 * Resilience (D-02, D-11, mirrors `lib/dns/resolve.ts`'s
 * try/catch-per-failure-mode classification): every upstream failure mode —
 * network error, non-2xx, timeout, malformed JSON, or an explicit
 * `{success:false}` body — collapses into a 200 `{ status: "unavailable" }`
 * response. This route NEVER returns a 5xx to its own caller; a broken
 * upstream degrades to a typed, non-throwing outcome the client can render
 * neutrally (D-11) rather than crash on.
 *
 * `body.found === false` is a LEGITIMATE negative answer (the OUI is
 * syntactically fine but genuinely not in the registry) — distinct from
 * "unavailable" (05-RESEARCH.md Pitfall 3 / Open Question 1). The two are
 * never conflated: `{ status: "ok", found: false, company: null }` vs.
 * `{ status: "unavailable" }`.
 *
 * Response is shaped DOWN to the minimal safe payload — `status`/`found`/
 * `company` only. The upstream's `address`/`country`/`block_type` fields (and
 * any other vendor-detail fields) are never read into the response.
 */

// Reads the request's own oui param on every hit and calls out to a live
// third-party API — never cache this response (D-02).
export const dynamic = "force-dynamic";

/** Exactly 6 hex characters — the OUI, never a full 12-hex-digit MAC. */
export const OUI_RE = /^[0-9A-Fa-f]{6}$/;
/** Bounds the upstream call so a hung maclookup.app can never hang this
 * route's own response indefinitely (T-05-05). */
export const UPSTREAM_TIMEOUT_MS = 4000;

/** Only the fields this route ever reads from the upstream body — every
 * other upstream field (address, country, block_type, isRand, ...) is
 * intentionally never modeled here, so it structurally cannot leak through. */
type UpstreamShape = {
  success: boolean;
  found: boolean;
  company: string;
};

export async function GET(request: NextRequest) {
  const oui = request.nextUrl.searchParams.get("oui");

  // V5/V13 gate: never forward unsanitized/malformed input upstream — reject
  // BEFORE any network call, not a best-effort pass-through.
  if (!oui || !OUI_RE.test(oui)) {
    return NextResponse.json(
      { error: "oui must be exactly 6 hex characters" },
      { status: 400 }
    );
  }

  let response: Response;
  try {
    // Hardcoded host literal (T-05-01) — only the pre-validated `oui` is
    // interpolated, never any other part of the request.
    response = await fetch(`https://api.maclookup.app/v2/macs/${oui}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    // Network error or timeout — a routine, expected outcome for a
    // third-party proxy (D-11), never a 5xx crash of this route.
    return NextResponse.json(
      { status: "unavailable" },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  // A syntactically valid JSON body (e.g. the literal `null`) parses
  // successfully without throwing, so it must be shape-checked here BEFORE
  // any field is ever touched — otherwise `body.success` throws an uncaught
  // TypeError on a `null` body, escaping this try/catch and crashing the
  // route with an unhandled 500 (CR-01).
  if (!body || typeof body !== "object" || !(body as Partial<UpstreamShape>).success) {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  const upstream = body as UpstreamShape;

  // upstream.found === false is a genuine negative registry answer, not a
  // failure (Pitfall 3) — shaped down to only found/company, never the
  // upstream's address/country/block-type detail fields.
  return NextResponse.json(
    {
      status: "ok",
      found: upstream.found,
      company: upstream.found ? upstream.company : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
