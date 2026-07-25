---
phase: 05-mac-address-inspector
fixed_at: 2026-07-25T17:10:00Z
review_path: .planning/phases/05-mac-address-inspector/05-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 4
skipped: 1
status: partial
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-07-25T17:10:00Z
**Source review:** .planning/phases/05-mac-address-inspector/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (critical + warning): 5
- Fixed: 4
- Skipped: 1

## Fixed Issues

### CR-01: Upstream `null` JSON body crashes the route with an uncaught TypeError, violating the route's own "never 5xx" contract

**Files modified:** `app/api/mac-vendor/route.ts`, `app/api/mac-vendor/route.test.ts`
**Commit:** `52b81fb`
**Applied fix:** Changed the parsed upstream body's type from a blind `as UpstreamShape` cast to `unknown`, then added an explicit shape guard (`!body || typeof body !== "object" || !(body as Partial<UpstreamShape>).success`) before any field is ever read, returning `{ status: "unavailable" }` on any mismatch — including the literal JSON `null` case that previously threw an uncaught `TypeError` and escaped the route's try/catch. Added a regression test using `new Response("null", { status: 200 })` asserting the route still returns `200 { status: "unavailable" }` instead of crashing. All 12 tests in `route.test.ts` pass (11 existing + 1 new).

### WR-02: Third-party JSON is cast with `as`, never runtime-validated, beyond the crash case in CR-01

**Files modified:** `app/api/mac-vendor/route.ts`, `lib/mac/vendor.ts`
**Commit:** `7941719`
**Applied fix:** Extended the route's shape guard (built on top of CR-01's fix) to type-check every field, not just presence: `typeof success === "boolean"`, `typeof found === "boolean"`, and `found ? typeof company === "string" : true` — any shape drift now degrades to `unavailable` instead of silently producing `company: undefined`. Applied the equivalent fix in the client wrapper `lib/mac/vendor.ts`: extracted a new `toVendorState(parsed: unknown)` helper that validates the route's response shape before mapping it to a `VendorState`, replacing the previous blind `as MacVendorRouteResponse` cast. No behavior change for well-formed responses — verified via the existing `route.test.ts` (12 tests) and `vendor.test.ts` (9 tests, pre-WR-03 addition), all passing.

### WR-03: Failed vendor lookups are cached for the entire session with no retry path

**Files modified:** `lib/mac/vendor.ts`, `lib/mac/vendor.test.ts`
**Commit:** `0706be7`
**Applied fix:** Changed `lookupVendor` to only cache the genuinely stable `found`/`not-found` outcomes (`if (result.kind !== "unavailable") vendorCache.set(...)`), so an `unavailable` result from a transient network blip or the route's upstream timeout is no longer sticky for the rest of the session — the next lookup for that OUI retries the fetch instead of short-circuiting to a stale failure. Updated the module docstring to reflect the new caching contract. Added a regression test asserting a second `lookupVendor` call after an `unavailable` first result triggers a second `fetch` and can succeed. All 9 tests in `vendor.test.ts` pass (8 existing + 1 new).

### WR-04: `lib/mac/*` tests don't use the project's mandated fast-check property-based testing

**Files modified:** `lib/mac/parse.test.ts`, `lib/mac/format.test.ts`, `lib/mac/classify.test.ts`
**Commit:** `646d396`
**Applied fix:** Added `@fast-check/vitest` property tests to all three modules, matching the project's existing convention (`lib/uuid/format.test.ts`, `lib/subnet/*.test.ts`):
- `parse.test.ts`: round-trip identity across the full 6-byte tuple space (`parseMacInput(formatMac(bytes)[variant])` recovers the original `bytes` for all 4 separator variants), a total-function/never-throws property over arbitrary strings, and a rejection property for any input of 11 characters or fewer.
- `format.test.ts`: a property asserting every variant is always uppercase hex with exactly 12 hex digits, and a property asserting all 4 variants agree on the same underlying hex digits (differing only in separator placement).
- `classify.test.ts`: bit-level invariants across the full `byte[0]` 0-255 range (and arbitrary other-byte values) — `isUnicast` tracks the I/G bit, `isUniversallyAdministered`/`randomizationLikely` track the U/L bit and its exact negation, and `ouiHex` is always the first 3 bytes as 6 uppercase hex characters.

Total test count across the 3 files went from 21 example-based tests to 31 tests (21 existing + 10 new, several of which run hundreds of generated cases each). All pass.

## Skipped Issues

### WR-01: No rate limiting / abuse protection on the public `/api/mac-vendor` proxy

**File:** `app/api/mac-vendor/route.ts:63-122`
**Reason:** This finding requires an infrastructure/architecture decision beyond what an autonomous code-fix should make unilaterally. The review's own fix suggestion offers two real options, both out of scope for a source-only fix:
1. A distributed per-IP token bucket backed by Vercel KV or Upstash Redis — neither is currently a project dependency; adding one means provisioning a new external service, wiring up env vars, and a build/deploy decision the user should make explicitly, not something to silently introduce.
2. Vercel's built-in Firewall rate-limiting rules — configured entirely in the Vercel dashboard, not a source-code change at all, so there is no file to edit for this option.

A third option — a naive in-process in-memory limiter with no external dependency — was considered and rejected: (a) it would give false confidence, since Vercel serverless functions are not guaranteed to reuse the same warm instance across requests, so in-memory state does not reliably enforce a limit across a real attacker's traffic; and (b) the only existing IP-extraction utility in this codebase, `lib/network/parseForwardedIp.ts`, carries an explicit project-established invariant in its own docstring — *"Display-only: the returned value MUST NOT be used for any security or access-control decision (see `<threat_model>` T-03-01 in the owning plan)"* — and rate-limiting is exactly such a decision. Building a second, security-grade IP-trust utility solely to unblock this fix would itself be a meaningful design change requiring its own threat-model review, not a safe autonomous patch.

Recommend the user decide between provisioning Vercel KV/Upstash for a real distributed limiter, or configuring Vercel Firewall rate-limiting rules from the dashboard, then follow up with a dedicated implementation task.

---

_Fixed: 2026-07-25T17:10:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
