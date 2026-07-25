---
phase: 05-mac-address-inspector
reviewed: 2026-07-25T14:42:44Z
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
  info: 1
  total: 6
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-25T14:42:44Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

The MAC Address Inspector slice (`lib/mac/*`, `app/api/mac-vendor/route.ts`, `app/tools/mac/*`) is generally well-structured: parsing/formatting/classification are pure, total functions with solid edge-case test coverage, and the vendor-lookup race-safety machinery in `MacTool.tsx` (abort controller + monotonic sequence token + explicit-argument closures) is careful and appears correct on trace-through.

However, `app/api/mac-vendor/route.ts` — the one file in this slice that talks to a third party and makes an explicit, tested, and heavily-documented promise ("This route NEVER returns a 5xx to its own caller") — has a code path that violates that exact promise: if the upstream returns HTTP 200 with a JSON body of literal `null` (valid JSON, not malformed), the route throws an uncaught `TypeError` and Next.js will emit a 500 to the caller. This is provable by tracing the code, is not covered by the existing test suite, and directly contradicts the route's own documented contract. See CR-01.

Additional warnings cover: no rate limiting on the public vendor-lookup proxy, unvalidated/loosely-typed casts of third-party JSON on both the route and the client wrapper, a permanent per-session cache of failed lookups with no retry path, a documented-but-unused testing convention (fast-check property-based tests for `lib/mac`, called out explicitly in project `CLAUDE.md`), and one item of dead/unused exported types in `lib/mac/types.ts`.

## Critical Issues

### CR-01: Uncaught TypeError crashes `/api/mac-vendor` (violates the route's own "never 5xx" contract) when upstream returns a valid-JSON, non-object body

**File:** `app/api/mac-vendor/route.ts:98-113`
**Issue:**
The `try/catch` around JSON parsing only covers the `await response.json()` call itself — it does **not** cover the subsequent property access on the parsed result:

```ts
let body: UpstreamShape;
try {
  body = (await response.json()) as UpstreamShape;
} catch {
  return NextResponse.json({ status: "unavailable" }, { status: 200, headers: { "Cache-Control": "no-store" } });
}

if (!body.success) {   // <-- unguarded property access
  ...
}
```

`response.json()` does not throw for any value that is valid JSON, including the literal `null`, a bare number, or a bare string — only genuinely malformed JSON text throws. If the upstream (`api.maclookup.app`) ever responds `200` with a body of `null` (or any falsy non-object JSON value), `body` becomes `null`, and `!body.success` evaluates `null.success`, throwing `TypeError: Cannot read properties of null (reading 'success')`. This throw happens **outside** any try/catch in the handler, so it propagates uncaught out of the `GET` function. Next.js converts an uncaught exception in a Route Handler into a `500` response to the caller.

This is the exact failure mode the route's own module-level docstring explicitly promises never happens ("This route NEVER returns a 5xx to its own caller; a broken upstream degrades to a typed, non-throwing outcome") and the exact class of input (`success:false`, non-2xx, network error, non-JSON body) the existing test suite (`route.test.ts`) otherwise covers thoroughly — but no test exercises a `null`-bodied `200` response, so this gap ships untested. `[]`, `"a string"`, and `42` are all also technically off-contract but happen not to crash only because JS auto-boxes primitives (a non-null, non-object JSON value silently degrades to "unavailable" via the `!body.success` falsy check) — `null` is the one value that throws because `null`/`undefined` are the only JS values that are not auto-boxed.

**Fix:**
Validate the parsed body's shape (or wrap the property access) before touching `.success`/`.found`/`.company`:

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

if (
  !body ||
  typeof body !== "object" ||
  !(body as Partial<UpstreamShape>).success
) {
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

Also add a regression test to `route.test.ts` mirroring the existing "malformed/non-JSON" case, but with `new Response("null", { status: 200 })` (valid JSON, parses to `null`), asserting the route still returns `200 { status: "unavailable" }` rather than crashing.

## Warnings

### WR-01: No rate limiting / abuse protection on the public `/api/mac-vendor` proxy

**File:** `app/api/mac-vendor/route.ts:63-122`
**Issue:** The route accepts any syntactically-valid 6-hex-character `oui` and proxies it to `api.maclookup.app` with no per-IP or per-session request throttling. Since the OUI keyspace is small (16^6 ≈ 16.8M values) and every request is a live upstream call (`dynamic = "force-dynamic"`, no caching), a client can script repeated requests through this endpoint to scrape the third-party OUI database at scale, or to exhaust/anger the upstream's own rate limits, which would degrade the tool for all legitimate users (the upstream failing would surface as "lookup unavailable" for everyone). This is an availability/abuse-prevention gap, not covered by any test or comment in the codebase.
**Fix:** Add basic abuse protection — e.g., a per-IP token bucket (Vercel Edge Config/KV, or Vercel's built-in Firewall rate-limiting rules) in front of or inside this route, returning a `429`/degrading gracefully once a threshold is exceeded.

### WR-02: Third-party JSON is cast with `as`, never runtime-validated, on both the route and the client wrapper

**File:** `app/api/mac-vendor/route.ts:100` (`body = (await response.json()) as UpstreamShape;`), `lib/mac/vendor.ts:63` (`const body = (await response.json()) as MacVendorRouteResponse;`)
**Issue:** Both sites cast unknown external JSON directly to a TypeScript type with no runtime shape check (no zod/manual field-type validation). Beyond the crash in CR-01, this means a shape drift in either the upstream vendor API or (if CR-01 is fixed naively) this app's own route contract can silently produce wrong-but-plausible output instead of a clearly-classified `unavailable`/`not-found` — e.g. upstream sends `success: true` with `found: true` but omits `company`: `body.found ? body.company : null` yields `company: undefined`, which `JSON.stringify` drops from the response entirely, and the client then renders an empty vendor name (`body.company ?? ""`) instead of surfacing "unavailable". `found` being a truthy non-boolean, or `company` being a non-string, would similarly pass through unchecked.
**Fix:** Add minimal runtime validation of the upstream shape in `route.ts` (e.g., `typeof body.success === "boolean" && typeof body.found === "boolean" && (body.found ? typeof body.company === "string" : true)`) before trusting the fields, falling back to `unavailable` on mismatch — matching the same defensive posture already applied to network errors, non-2xx, and JSON-parse failures.

### WR-03: Failed vendor lookups are cached for the entire session with no retry path

**File:** `lib/mac/vendor.ts:50-77`
**Issue:** `vendorCache` stores the `unavailable` outcome for a given `ouiHex` exactly like a successful `found`/`not-found` result (`vendorCache.set(ouiHex, result)` runs unconditionally). If the very first lookup for an OUI fails due to a transient issue (a flaky connection, a momentary upstream blip, or the timeout in `route.ts` firing under load), every subsequent visit to that same OUI within the session — including a user simply re-typing/re-pasting the same address, or editing the host bytes back and forth — will short-circuit to the cached `unavailable` state with no fetch ever attempted again, even if the network/upstream has since fully recovered. Only a full page reload resets the cache. This is called out as intentional in the module's doc comment, but it is a real, user-visible robustness gap: a single transient failure becomes sticky for the rest of the session with no way for the user to retry.
**Fix:** Consider not caching `unavailable` results (only cache `found`/`not-found`, which are genuinely stable answers), or cache `unavailable` with a short TTL / one-shot "allow one retry" flag rather than for the lifetime of the session.

### WR-04: `lib/mac/*` unit tests don't use the project's mandated fast-check property-based testing

**Files:** `lib/mac/parse.test.ts`, `lib/mac/format.test.ts`, `lib/mac/classify.test.ts`, `lib/mac/vendor.test.ts`
**Issue:** The project's `CLAUDE.md` (Technology Stack section) explicitly states: *"Vitest + fast-check own all of `lib/uuid`, `lib/subnet`, `lib/dns` (pure parsing/formatting logic), `lib/mac` — this is where nearly all business-logic risk lives... This directly satisfies the brief's NFR: 'subnet and address logic uses boundary and property-based tests where practical.'"* None of the four `lib/mac` test files import or use `fast-check`/`@fast-check/vitest` — all are example-based tests only (hand-picked vectors and a handful of literal "pathological input" strings in `parse.test.ts`). This is a deviation from a documented, explicit project convention for exactly the modules it calls out by name, and leaves the byte-level parse/format/classify math without the boundary/property coverage the project brief requires (e.g., "for all valid 6-byte inputs, `parseMacInput(formatMac(bytes).colon)` round-trips to `bytes`" is exactly the kind of property this module is suited for and currently untested).
**Fix:** Add `fast-check`/`@fast-check/vitest` property tests for `lib/mac/parse.ts` and `lib/mac/format.ts` (round-trip and idempotency properties) and `lib/mac/classify.ts` (bit-level invariants across the full byte-0 range), per the existing project convention.

## Info

### IN-01: `MacLookupState`/`MacSuccessResult` types are exported but never used anywhere

**File:** `lib/mac/types.ts:73-97`
**Issue:** `MacSuccessResult` and `MacLookupState` are fully-documented discriminated-union types intended to model the MAC tool's UI state (`idle`/`incomplete-input`/`success`, embedding `formats`/`classification`/`vendor` together). A repo-wide search confirms neither type is imported or referenced anywhere outside their own declaration in `types.ts`. The actual implementation, `app/tools/mac/MacTool.tsx`, defines an entirely separate, differently-shaped `MacToolState` type (flat fields: `rawInput`, `lastValidFormats`, `lastValidClassification`, `isIncomplete`, `vendorState`, `vendorPending`) and never imports `MacLookupState`/`MacSuccessResult`. This indicates the type was designed ahead of/independently from the shipped implementation and is now dead code.
**Fix:** Either remove `MacLookupState`/`MacSuccessResult` from `lib/mac/types.ts` if `MacToolState`'s flat shape is the final design, or (if the discriminated union was the intended contract) refactor `MacTool.tsx` to use it so the two don't drift further.

---

_Reviewed: 2026-07-25T14:42:44Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
