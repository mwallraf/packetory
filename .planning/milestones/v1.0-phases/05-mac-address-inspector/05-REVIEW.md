---
phase: 05-mac-address-inspector
reviewed: 2026-07-25T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - app/api/mac-vendor/route.test.ts
  - app/api/mac-vendor/route.ts
  - app/sitemap.test.ts
  - app/tools/mac/MacTool.test.tsx
  - app/tools/mac/MacTool.tsx
  - app/tools/mac/MacToolLoader.tsx
  - app/tools/mac/faq-data.ts
  - app/tools/mac/page.tsx
  - lib/analytics/redact.test.ts
  - lib/mac/classify.test.ts
  - lib/mac/classify.ts
  - lib/mac/format.test.ts
  - lib/mac/format.ts
  - lib/mac/parse.test.ts
  - lib/mac/parse.ts
  - lib/mac/types.ts
  - lib/mac/vendor.test.ts
  - lib/mac/vendor.ts
  - tests/e2e/home.spec.ts
  - tests/e2e/mac-lookup.spec.ts
  - tests/e2e/navigation.spec.ts
  - tools/registry.test.ts
  - tools/registry.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the MAC Address Inspector vertical slice: pure `lib/mac/*` parse/format/classify modules, the `lib/mac/vendor.ts` client wrapper + session cache, the `app/api/mac-vendor` proxy route, the `MacTool` client island, and supporting page/registry/test files.

The pure math modules (`parse.ts`, `format.ts`, `classify.ts`) are correct, total functions with good boundary-case coverage (broadcast, IPv4-multicast, locally-administered, over/under-length input) — traced against their documented bit-level contracts with no defects found. The client-side race-safety machinery in `MacTool.tsx` (abort controller + monotonic sequence token + explicit-argument closures, guarding the mount, live-edit, incomplete-input, and Esc-reset paths) was traced through and is sound.

One BLOCKER was found in `app/api/mac-vendor/route.ts`: the upstream JSON body is type-asserted rather than validated, and a literal JSON `null` response body throws an uncaught `TypeError` outside the route's own try/catch, producing an unhandled 500 — directly violating this route's own documented invariant ("This route NEVER returns a 5xx to its own caller"). This is untested by the existing (otherwise thorough) `route.test.ts` suite. Four warnings and three info-level findings follow below, covering missing abuse protection on the public proxy, unvalidated third-party JSON shape more broadly, a permanently-sticky failure cache, an explicit project-mandated testing convention (`fast-check`) that isn't used for `lib/mac`, and some dead/unused code.

## Critical Issues

### CR-01: Upstream `null` JSON body crashes the route with an uncaught TypeError, violating the route's own "never 5xx" contract

**File:** `app/api/mac-vendor/route.ts:98-119`
**Issue:** The upstream response body is parsed and blindly type-asserted:
```ts
let body: UpstreamShape;
try {
  body = (await response.json()) as UpstreamShape;
} catch {
  return NextResponse.json({ status: "unavailable" }, ...);
}

if (!body.success) { ... }   // line 108 — OUTSIDE the try block
...
{ status: "ok", found: body.found, company: body.found ? body.company : null }  // line 119
```
`response.json()` only *throws* on a JSON syntax error. A syntactically valid but semantically empty body — the literal text `null` (which is valid JSON) — parses successfully to `body === null`, so the `try { ... } catch { ... }` wrapping `response.json()` never fires. Every subsequent property access (`body.success`, `body.found`, `body.company`) then throws `TypeError: Cannot read properties of null (reading 'success')`, uncaught, which Next.js turns into an unhandled-exception 500 response to the caller.

This is exactly the failure mode the route's own header docstring promises never happens, and exactly the class of case (`success:false`, non-2xx, network error, non-JSON body) the existing test suite otherwise covers thoroughly for every *other* malformed-upstream scenario — but no test exercises a `null`-bodied `200` response, so this gap ships untested. Non-null primitives (`42`, `"a string"`, `[]`) happen not to crash only because JS auto-boxes them for property access and fall through the `!body.success` falsy check to `unavailable` — `null` is the one JSON value that throws.

Note that `lib/mac/vendor.ts` (the client-side counterpart) does the equivalent property access *inside* its `try` block and therefore correctly degrades to `{ kind: "unavailable" }` for the identical `null`-body input — this route is the one place in the slice missing that protection.

**Fix:** Validate the parsed body's shape before touching any of its fields, and add a regression test:
```ts
let body: unknown;
try {
  body = await response.json();
} catch {
  return NextResponse.json(
    { status: "unavailable" },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

if (!body || typeof body !== "object" || !(body as Partial<UpstreamShape>).success) {
  return NextResponse.json(
    { status: "unavailable" },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

const upstream = body as UpstreamShape;
return NextResponse.json(
  { status: "ok", found: upstream.found, company: upstream.found ? upstream.company : null },
  { headers: { "Cache-Control": "no-store" } }
);
```
Add a case to `route.test.ts` mirroring the existing "malformed/non-JSON" test but using `new Response("null", { status: 200 })` (valid JSON, parses to `null`), asserting the route still returns `200 { status: "unavailable" }` instead of crashing.

## Warnings

### WR-01: No rate limiting / abuse protection on the public `/api/mac-vendor` proxy

**File:** `app/api/mac-vendor/route.ts:63-122`
**Issue:** The route accepts any syntactically-valid 6-hex-character `oui` and proxies it to `api.maclookup.app` with no per-IP or per-session request throttling, and `dynamic = "force-dynamic"` means every request is a live upstream call with no caching layer to absorb repeat traffic. A script can hammer this endpoint to scrape the third-party OUI database at scale, run up Vercel function-invocation usage, or exhaust the upstream's own rate limits — which would then degrade the tool for every legitimate user (an upstream failure surfaces as "lookup unavailable" for everyone, not just the abusive caller).
**Fix:** Add basic abuse protection — a per-IP token bucket (Vercel KV/Edge Config, or Vercel's built-in Firewall rate-limiting rules) in front of or inside this route, returning `429`/degrading gracefully once a threshold is exceeded.

### WR-02: Third-party JSON is cast with `as`, never runtime-validated, beyond the crash case in CR-01

**File:** `app/api/mac-vendor/route.ts:100`, `lib/mac/vendor.ts:63`
**Issue:** Both `body = (await response.json()) as UpstreamShape` and `const body = (await response.json()) as MacVendorRouteResponse` cast unknown external JSON directly to a TypeScript type with no runtime field-type check. Even after CR-01 is fixed for the `null` case, a shape drift in the upstream response (e.g. `success: true, found: true` but `company` omitted, or `found` present as a truthy non-boolean) passes through silently: `body.found ? body.company : null` yields `company: undefined`, which `JSON.stringify` drops from the response object entirely, and the client then renders an empty/blank vendor name instead of surfacing a classified `unavailable`/`not-found` state.
**Fix:** Add minimal runtime validation of the upstream shape (e.g. `typeof body.success === "boolean" && typeof body.found === "boolean" && (body.found ? typeof body.company === "string" : true)`) before trusting the fields, falling back to `unavailable` on any mismatch — matching the defensive posture already applied to network errors, non-2xx, and JSON-parse failures.

### WR-03: Failed vendor lookups are cached for the entire session with no retry path

**File:** `lib/mac/vendor.ts:50-77`
**Issue:** `vendorCache.set(ouiHex, result)` runs unconditionally, so an `unavailable` outcome (from a transient network blip, or the route's 4s upstream timeout firing under load) is cached exactly like a genuine `found`/`not-found` answer. Every subsequent visit to that same OUI within the session — re-typing the same address, editing the host bytes back and forth, pressing Esc — short-circuits to the cached `unavailable` state with no fetch ever attempted again, even after the network/upstream has fully recovered. Only a full page reload resets the cache. This is documented as an intentional trade-off in the module's comments, but it is a real, user-visible robustness gap with no in-app retry affordance.
**Fix:** Either don't cache `unavailable` (only cache the genuinely stable `found`/`not-found` outcomes), or cache it with a short TTL / one-shot "allow one retry" flag instead of session-lifetime stickiness.

### WR-04: `lib/mac/*` tests don't use the project's mandated fast-check property-based testing

**Files:** `lib/mac/parse.test.ts`, `lib/mac/format.test.ts`, `lib/mac/classify.test.ts`, `lib/mac/vendor.test.ts`
**Issue:** The project's `CLAUDE.md` explicitly states: *"Vitest + fast-check own all of `lib/uuid`, `lib/subnet`, `lib/dns`... `lib/mac`... This directly satisfies the brief's NFR: 'subnet and address logic uses boundary and property-based tests where practical.'"* None of the four `lib/mac` test files import or use `fast-check`/`@fast-check/vitest` — all are example-based tests only (hand-picked vectors plus a handful of literal "pathological input" strings in `parse.test.ts`). This is a deviation from an explicit, named project convention for exactly the module it calls out, and leaves properties like round-trip correctness (`parseMacInput(formatMac(bytes).colon)` should recover `bytes` for all valid 6-byte inputs) and full-byte-range classification invariants untested outside a handful of hand-picked vectors.
**Fix:** Add `fast-check`/`@fast-check/vitest` property tests for `lib/mac/parse.ts` and `lib/mac/format.ts` (round-trip/idempotency across all 6-byte tuples) and `lib/mac/classify.ts` (bit-level invariants across the full `byte[0]` 0-255 range), per the existing project convention already applied elsewhere.

## Info

### IN-01: `MacLookupState`/`MacSuccessResult` are dead, misleading exported types

**File:** `lib/mac/types.ts:73-97`
**Issue:** `MacSuccessResult` and `MacLookupState` are fully-documented discriminated-union types explicitly said to mirror `lib/dns/types.ts`'s `DnsLookupState` pattern (`idle`/`incomplete-input`/`success`, embedding `formats`/`classification`/`vendor` together). Neither type is imported anywhere outside its own declaration — `app/tools/mac/MacTool.tsx` defines and uses an entirely separate, flat `MacToolState` (`rawInput`, `lastValidFormats`, `lastValidClassification`, `isIncomplete`, `vendorState`, `vendorPending`) instead. The doc comments describe design decisions ("`idle`/`incomplete-input`/`success` were sufficient for 05-02's... slice") that never actually shipped, so a future maintainer reading `types.ts` for "the" MAC tool state contract is reading a stale, unused design that has already diverged from the real implementation.
**Fix:** Remove `MacLookupState`/`MacSuccessResult` (and their doc comments) since `MacToolState` is the shape actually in use, or refactor `MacTool.tsx` to use the discriminated union if that shape is preferred going forward, so the two cannot drift further.

### IN-02: `OUI_RE` and `UPSTREAM_TIMEOUT_MS` are exported but never imported elsewhere

**File:** `app/api/mac-vendor/route.ts:49,52`
**Issue:** Both constants are `export const` but are only referenced within `route.ts` itself; `route.test.ts` imports only `GET`. Exporting internals with no external consumer unnecessarily widens the module's public API surface.
**Fix:** Drop the `export` keyword unless a specific external consumer is planned.

### IN-03: `ToolDefinition.clientOnly` is unused, unenforced dead data

**File:** `tools/registry.ts:20,35,48,61,74`
**Issue:** `clientOnly` is declared and set per-tool (`true`/`false`) but is never read anywhere in the codebase (confirmed by repo-wide search — only assignments in `registry.ts`, zero consumers). For the MAC tool it's correctly set to `false` (reflecting that it now calls a server API route, unlike the three purely-client tools), but since nothing consumes the field, that correctness is currently unobservable and unenforced by any code path — a future tool could set this incorrectly with no test or build check ever catching it.
**Fix:** Either wire `clientOnly` into a real decision point (rendering behavior, or a build-time lint rule flagging `clientOnly: true` tools that import server-only APIs), or remove the field until it has a consumer.

---

_Reviewed: 2026-07-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
