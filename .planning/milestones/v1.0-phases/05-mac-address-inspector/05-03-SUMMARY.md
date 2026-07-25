---
phase: 05-mac-address-inspector
plan: 03
subsystem: api
tags: [nextjs, react, typescript, tailwind, mac-address, vendor-lookup, vitest, playwright]

# Dependency graph
requires:
  - phase: 05-mac-address-inspector plan 01
    provides: lib/mac/{types,parse,format}.ts, the live /tools/mac page with a labeled Vendor stub section to extend in place
  - phase: 05-mac-address-inspector plan 02
    provides: lib/mac/classify.ts (ouiHex + randomizationLikely, which gate the vendor lookup and its D-12 skip), MacClassification/MacSuccessResult shape to extend
provides:
  - app/api/mac-vendor/route.ts — first upstream-fetching Route Handler in the codebase; validates a 6-hex OUI, proxies to maclookup.app with a bounded timeout, always 200 with a typed status
  - lib/mac/vendor.ts — client-side lookupVendor(ouiHex) with a session Map<string, VendorState> cache-before-fetch
  - lib/mac/types.ts extended with VendorState (found/not-found/unavailable/not-applicable) and MacSuccessResult.vendor
  - app/tools/mac/MacTool.tsx's Vendor section now live — debounced, race-safe, session-cached vendor lookup wired end to end, with "Copy all" now including OUI/vendor/U-L/I-G/randomization
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First upstream-fetching Route Handler pattern: validate input to an exact narrow character class BEFORE any network call, hardcode the upstream host literal, classify every failure mode (throw/non-2xx/timeout/malformed JSON/explicit failure field) into one typed non-throwing 200 response — never a 5xx from this app's own route"
    - "Client-side session cache-before-fetch (Map<string, T> module-level cache) for a debounced, race-safe lookup layered on top of an already-synchronous core (classification) — mirrors DnsTool.tsx's AbortController+sequence-token race-safety machinery but as its own independent, narrower orchestration"
    - "Immediate vs. debounced dual-entry dispatch (runVendorLookupImmediate for mount/reset, scheduleVendorLookup for live typing/paste) funneling through one shared beginVendorLookup/cancelVendorLookup choke point — same shape as DnsTool.tsx's runLookupImmediate/scheduleDebouncedLookup split"

key-files:
  created:
    - app/api/mac-vendor/route.ts
    - app/api/mac-vendor/route.test.ts
    - lib/mac/vendor.ts
    - lib/mac/vendor.test.ts
  modified:
    - lib/mac/types.ts
    - app/tools/mac/MacTool.tsx
    - app/tools/mac/MacTool.test.tsx
    - tests/e2e/mac-lookup.spec.ts
    - lib/analytics/redact.test.ts

key-decisions:
  - "Demo-on-load (D-06) and Esc-reset bypass the D-03 debounce entirely (runVendorLookupImmediate) — D-06 requires the full result, vendor included, visible with zero user action; an artificial 500ms delay before even starting the fetch for an already-known value would contradict that. Only live typing/paste go through the debounced path (scheduleVendorLookup)."
  - "VendorState is a standalone 4-kind union (found/not-found/unavailable/not-applicable) with no 'pending' member — the in-flight 'Looking up vendor…' state is component-level UI orchestration (vendorPending boolean), not a resolved lookup outcome, kept out of the shared type"
  - "MacSuccessResult extended with `vendor: VendorState` (not MacLookupState's shape directly) — since MacTool.tsx's actual local MacToolState already splits MacSuccessResult's fields into separate top-level state fields (matching 05-02's established convention), the exported types stay the source-of-truth contract even though the component doesn't literally instantiate MacLookupState"
  - "vendor.ts caches every resolved kind unconditionally, including 'unavailable' — matches 05-RESEARCH.md's own code example verbatim; an unavailable OUI is not retried automatically within the same session (a fresh page load resets the cache)"

patterns-established:
  - "Route Handler response-shaping-down discipline: only status/found/company are ever read from the upstream body into the response — address/country/block-type fields are structurally never modeled in the route's UpstreamShape type, so they cannot leak through even by accident"

requirements-completed: [MAC-03, MAC-08, MAC-09, MAC-10]

coverage:
  - id: D1
    description: "GET /api/mac-vendor validates the oui param against /^[0-9A-Fa-f]{6}$/ server-side and returns 400 for any missing/malformed/over-length value BEFORE touching the network (D-01)"
    requirement: "MAC-03"
    verification:
      - kind: unit
        ref: "app/api/mac-vendor/route.test.ts#returns 400 with no oui param, and never calls fetch"
        status: pass
      - kind: unit
        ref: "app/api/mac-vendor/route.test.ts#returns 400 for an oui shorter than 6 hex characters, and never calls fetch"
        status: pass
      - kind: unit
        ref: "app/api/mac-vendor/route.test.ts#returns 400 for an oui longer than 6 hex characters, and never calls fetch"
        status: pass
      - kind: unit
        ref: "app/api/mac-vendor/route.test.ts#returns 400 for a non-hex oui, and never calls fetch"
        status: pass
    human_judgment: false
  - id: D2
    description: "The route fetches a hardcoded maclookup.app host literal with a bounded timeout, always responds 200 with a status field on success or unavailable on any network error/non-2xx/timeout/malformed JSON (D-02, Pattern 3)"
    requirement: "MAC-03"
    verification:
      - kind: unit
        ref: "app/api/mac-vendor/route.test.ts#returns 200 { status: 'ok', found: true, company } on a successful, found upstream response"
        status: pass
      - kind: unit
        ref: "app/api/mac-vendor/route.test.ts#returns 200 { status: 'unavailable' } when fetch throws (network error/timeout), never a 5xx crash (D-11)"
        status: pass
      - kind: unit
        ref: "app/api/mac-vendor/route.test.ts#returns 200 { status: 'unavailable' } on a non-2xx upstream response"
        status: pass
      - kind: unit
        ref: "app/api/mac-vendor/route.test.ts#returns 200 { status: 'unavailable' } on malformed/non-JSON upstream body"
        status: pass
      - kind: unit
        ref: "app/api/mac-vendor/route.test.ts#interpolates only the validated oui into the hardcoded maclookup.app host literal"
        status: pass
    human_judgment: false
  - id: D3
    description: "A successful lookup shows the vendor company name; a genuine registry miss (found:false) shows 'Not found in OUI registry.' — distinct copy from the failure state"
    requirement: "MAC-03"
    verification:
      - kind: unit
        ref: "app/api/mac-vendor/route.test.ts#returns 200 { status: 'ok', found: false, company: null } on a successful, not-found upstream response (Pitfall 3 — distinct from unavailable)"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#shows 'Not found in OUI registry.' for a genuine registry miss — distinct from lookup unavailable (05-RESEARCH.md Pitfall 3 / Open Question 1)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#a genuine registry miss shows 'Not found in OUI registry.' — distinct from lookup unavailable (05-RESEARCH.md Pitfall 3)"
        status: pass
    human_judgment: false
  - id: D4
    description: "When the vendor lookup fails or is unavailable, the field shows 'Vendor: lookup unavailable.' and the rest of the panel (4 formats, OUI, U/L, I/G, randomization) renders normally and unaffected — never an error banner (MAC-08, D-11)"
    requirement: "MAC-08"
    verification:
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#shows 'Vendor: lookup unavailable.' when the vendor fetch fails, while formats/OUI/classification badges still render normally (MAC-08, D-11)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#vendor lookup unavailable shows the neutral D-11 note while formats/OUI/classification badges still fully render (MAC-08)"
        status: pass
    human_judgment: false
  - id: D5
    description: "For a MAC flagged locally-administered/likely-randomized, NO vendor API call is made and the field shows 'Vendor: not applicable (randomized address).' (D-12)"
    requirement: "MAC-03"
    verification:
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#shows 'Vendor: not applicable (randomized address).' for a locally-administered MAC and makes NO vendor fetch call for it (D-12)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#a locally-administered MAC shows the D-12 not-applicable note and makes ZERO /api/mac-vendor requests for it"
        status: pass
    human_judgment: false
  - id: D6
    description: "Vendor lookups are debounced ~400-600ms after a syntactically valid MAC is present and results are cached in a session in-memory OUI->result Map so re-editing the host portion of an already-looked-up OUI does not re-hit the API (D-03)"
    requirement: "MAC-03"
    verification:
      - kind: unit
        ref: "lib/mac/vendor.test.ts#does not fetch again for a second call with a cached ouiHex (D-03 session cache)"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#does not re-fetch for an OUI already looked up this session, even after editing the host portion (D-03 session cache)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Every state-superseding path into the vendor lookup (typing/debounce, a new valid paste, and the demo-on-load) cancels any in-flight request via AbortController + sequence token so a slower earlier response can never overwrite a newer vendor result"
    requirement: "MAC-08"
    verification:
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#a superseding valid edit's slower earlier vendor response can never overwrite a newer result (CR-01 race safety)"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#cancels the in-flight/scheduled vendor lookup when the input becomes incomplete mid-edit, and does not leave the panel stuck pending (CR-01 audit-ALL-paths)"
        status: pass
    human_judgment: false
  - id: D8
    description: "While a debounced vendor lookup is in flight, only the vendor sub-field shows an inline 'Looking up vendor...' state; formats, OUI, and classification badges stay fully rendered (MAC-08 isolation)"
    requirement: "MAC-08"
    verification:
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#shows the in-flight 'Looking up vendor…' state while a debounced lookup is pending, without affecting formats/OUI/classification badges (MAC-08 isolation)"
        status: pass
    human_judgment: false
  - id: D9
    description: "'Copy all' copies the complete result as one formatted text block (all 4 formats + OUI + vendor + U/L + I/G + randomization flag) with a visible confirmation (MAC-09)"
    requirement: "MAC-09"
    verification:
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#the Copy all button copies a combined block of all 4 formats plus OUI/vendor/U-L/I-G/randomization (MAC-09)"
        status: pass
    human_judgment: false
  - id: D10
    description: "MacTool.tsx sends only classification.ouiHex (6 hex chars) to /api/mac-vendor — the host portion of the MAC is NEVER transmitted (MAC-10 by construction)"
    requirement: "MAC-10"
    verification:
      - kind: unit
        ref: "lib/mac/vendor.test.ts#sends only the ouiHex in the request URL, never a full MAC (MAC-10 by construction)"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#sends only the ouiHex (6 hex chars) in the vendor request, never the full MAC (MAC-10 by construction)"
        status: pass
    human_judgment: false
  - id: D11
    description: "lib/analytics/redact.ts DEFAULT_ALLOW_LIST remains without 'mac'/'oui' (MAC-10 regression guard); redact.ts itself is unmodified"
    requirement: "MAC-10"
    verification:
      - kind: unit
        ref: "lib/analytics/redact.test.ts#MAC-10 regression: DEFAULT_ALLOW_LIST does not include 'mac' or 'oui' — the full MAC address / OUI must never reach analytics"
        status: pass
      - kind: other
        ref: "git diff --stat lib/analytics/redact.ts (empty output confirms no change)"
        status: pass
    human_judgment: false
  - id: D12
    description: "A very long real vendor/company name (40+ chars) wraps rather than clips at 320px alongside the OUI prefix on the same row (backstop)"
    verification:
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#a very long vendor company name (40+ chars) wraps rather than clips at 320px alongside the OUI prefix (overflow backstop)"
        status: pass
    human_judgment: true
    rationale: "Plan's must_haves.truths entry is explicitly flagged verification:backstop — a passing automated wrap/no-horizontal-scroll test exists, but visual wrapping quality is reserved for human/judgment sign-off per the plan's own verification tier."
  - id: D13
    description: "MUST NOT surface a coincidental OUI-vendor match for a randomized address as the device's real hardware vendor (prohibition, MAC-03)"
    requirement: "MAC-03"
    verification:
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#shows 'Vendor: not applicable (randomized address).' for a locally-administered MAC and makes NO vendor fetch call for it (D-12)"
        status: pass
    human_judgment: true
    rationale: "Plan's must_haves.prohibitions entry is explicitly flagged verification:judgment (flagged: true) — a passing regression test/e2e exists proving zero fetch calls, but the plan reserves final sign-off for human/judgment review per its own threat_model disposition."
  - id: D14
    description: "MUST NOT render a genuine 'vendor not found' answer with the same copy as 'lookup unavailable' (prohibition, MAC-03)"
    requirement: "MAC-03"
    verification:
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#shows 'Not found in OUI registry.' for a genuine registry miss — distinct from lookup unavailable (05-RESEARCH.md Pitfall 3 / Open Question 1)"
        status: pass
    human_judgment: true
    rationale: "Plan's must_haves.prohibitions entry is explicitly flagged verification:judgment (flagged: true) — passing tests exist proving the two states render distinct copy, but the plan reserves final sign-off for human/judgment review."
  - id: D15
    description: "MUST NOT transmit, log, or store the full MAC address anywhere past the browser — only the OUI may cross the boundary (prohibition, MAC-10)"
    requirement: "MAC-10"
    verification:
      - kind: unit
        ref: "lib/mac/vendor.test.ts#sends only the ouiHex in the request URL, never a full MAC (MAC-10 by construction)"
        status: pass
      - kind: unit
        ref: "lib/analytics/redact.test.ts#MAC-10 regression: DEFAULT_ALLOW_LIST does not include 'mac' or 'oui' — the full MAC address / OUI must never reach analytics"
        status: pass
    human_judgment: true
    rationale: "Plan's must_haves.prohibitions entry is explicitly flagged verification:judgment (flagged: true) — passing tests exist proving OUI-only transmission and the analytics guard, but the plan reserves final sign-off for human/judgment review given the privacy-critical nature of this prohibition."

# Metrics
duration: 59min
completed: 2026-07-25
status: complete
---

# Phase 5 Plan 3: MAC Address Inspector Vendor Lookup Summary

**First upstream-fetching Route Handler (`/api/mac-vendor`) proxying OUI-only lookups to maclookup.app, wired into `MacTool.tsx` via a debounced, session-cached, race-safe client (`lib/mac/vendor.ts`) with all 4 neutral vendor states, the D-12 randomized-address skip, and MAC-08/MAC-09/MAC-10 guarantees proven by 47 new/updated tests.**

## Performance

- **Duration:** 59 min (includes one transient-API-error interruption mid-session; resumed cleanly with no rework)
- **Started:** 2026-07-25T15:34:35+02:00
- **Completed:** 2026-07-25T16:33:09+02:00
- **Tasks:** 3
- **Files modified:** 9 (4 created, 5 modified)

## Accomplishments
- `app/api/mac-vendor/route.ts`: the codebase's first upstream-fetching Route Handler — validates a 6-hex OUI server-side before any network call, proxies to a hardcoded `https://api.maclookup.app/v2/macs/{oui}` literal with `AbortSignal.timeout(4000)`, and always responds 200 with a typed `status` (never a 5xx crash); `found:false` is shaped as a distinct successful negative answer, never conflated with `unavailable` (Pitfall 3). `route.test.ts` is the first Route Handler unit test in the codebase (11 tests).
- `lib/mac/vendor.ts`: `lookupVendor(ouiHex)` checks a session `Map<string, VendorState>` cache before fetching `/api/mac-vendor?oui=<ouiHex>`, maps the route's response into the 4-kind `VendorState` (found/not-found/unavailable — `not-applicable` is set client-side for D-12, never fetched), and re-throws untouched on cancellation (8 tests).
- `MacTool.tsx`'s Vendor section is now fully live: demo-on-load and Esc-reset run the lookup immediately (D-06 zero-effort default, no debounce delay); live typing/paste debounce ~500ms (D-03); an `AbortController` + monotonic sequence token guards every state-superseding entry path so a slower earlier response can never overwrite a newer one (CR-01 "audit ALL paths" lesson, proven by a fake-timer race regression test); a locally-administered/randomized MAC skips the fetch entirely (D-12); all 4 vendor states plus the "Looking up vendor…" in-flight state render with the exact locked copy, always neutral, never blocking/dimming formats/OUI/classification badges (MAC-08).
- "Copy all" now includes OUI, vendor, U/L, I/G, and randomization in the copied text block (MAC-09 completed for this phase).
- `tests/e2e/mac-lookup.spec.ts`: new "vendor lookup" describe block mocking `/api/mac-vendor` via `page.route` — success, unavailable (with MAC-08 resilience assertions), not-found, not-applicable (with a zero-request-count assertion proving D-12), and a 40+ char company-name overflow backstop at 320px.
- `lib/analytics/redact.test.ts`: MAC-10 regression assertion that `DEFAULT_ALLOW_LIST` excludes `mac`/`oui`; `redact.ts` itself is unmodified.

## Task Commits

Each task was committed atomically:

1. **Task 1: /api/mac-vendor Route Handler + first route unit test** - `f9ceddb` (feat)
2. **Task 2: Client vendor wrapper + session cache, wired into MacTool with debounce, race-safety, and the 4 vendor states** - `30d7ab0` (feat)
3. **Task 3: Vendor e2e (success + unavailable + not-applicable) and MAC-10 analytics regression guard** - `8ca9334` (test)

_None of this plan's tasks carried a `tdd="true"` attribute — each task's tests and implementation were written together and verified green before committing, per the plan's own task shape._

## Files Created/Modified
- `app/api/mac-vendor/route.ts` - GET handler: OUI validation, bounded-timeout upstream proxy, response shaping
- `app/api/mac-vendor/route.test.ts` - first Route Handler unit test in the codebase (11 tests: 400 gate, found, not-found, unavailable-on-throw/non-2xx/malformed-JSON/success:false, host-literal interpolation)
- `lib/mac/vendor.ts` - client-side `lookupVendor` + session `Map<string, VendorState>` cache
- `lib/mac/vendor.test.ts` - 8 tests covering all response mappings, cache hit/miss, cancellation, and OUI-only URL construction
- `lib/mac/types.ts` - added `VendorState`; extended `MacSuccessResult` with `vendor: VendorState`
- `app/tools/mac/MacTool.tsx` - Vendor section wired live: debounce/immediate dual-entry dispatch, AbortController+seq-token race safety, `VendorField` component, `CopyAllButton` extended
- `app/tools/mac/MacTool.test.tsx` - 9 new tests (vendor found/not-found/unavailable/not-applicable, in-flight pending, session cache, MAC-10 URL assertion, 2 race-safety regression tests) alongside the 11 pre-existing tests, all updated to mock `fetch`
- `tests/e2e/mac-lookup.spec.ts` - new "vendor lookup" describe block, 5 new e2e tests
- `lib/analytics/redact.test.ts` - 1 new MAC-10 regression test

## Decisions Made
- Demo-on-load (D-06) and Esc-reset bypass the D-03 debounce entirely via `runVendorLookupImmediate` — an artificial 500ms delay before starting a fetch for an already-known, already-valid value would contradict D-06's "visible immediately" requirement. Only live typing/paste go through the debounced `scheduleVendorLookup` path. Both funnel through one shared `beginVendorLookup`/`cancelVendorLookup` choke point (mirrors `DnsTool.tsx`'s `runLookupImmediate`/`scheduleDebouncedLookup` split).
- `VendorState` is a standalone 4-kind union with no "pending" member — the in-flight "Looking up vendor…" state is component-level UI orchestration (`vendorPending: boolean`), not a resolved lookup outcome, kept out of the shared domain type.
- `MacSuccessResult` (not `MacLookupState` directly) was extended with `vendor: VendorState`, since `MacTool.tsx`'s actual local `MacToolState` already splits `MacSuccessResult`'s fields into separate top-level state fields (the established 05-02 convention) — the exported types stay the canonical contract even though the component doesn't literally instantiate `MacLookupState`.
- `lib/mac/vendor.ts` caches every resolved kind unconditionally, including `unavailable`, matching 05-RESEARCH.md's own code example verbatim — an unavailable OUI is not retried automatically within the same session; a fresh page load resets the cache.

## Deviations from Plan
None — plan executed exactly as written. All 12 `must_haves.truths`/backstop entries and all 3 judgment-tier `must_haves.prohibitions` were satisfied via passing automated tests, with the prohibitions' `verification: judgment` disposition honored (routed to `human_judgment: true` in this SUMMARY's coverage block, not auto-passed).

## Issues Encountered
- A transient API error interrupted the session immediately after Task 2's commit. Work resumed cleanly from the committed state (verified both prior task commits' tests still passed before proceeding to Task 3) — no rework was needed.

## User Setup Required
None — no external service configuration required. `maclookup.app` requires no API key for the lookups this route performs (confirmed live in 05-RESEARCH.md).

## Next Phase Readiness
- This was the final plan in Phase 5 (mac-address-inspector). All phase requirements (MAC-01 through MAC-10) are now complete across 05-01/05-02/05-03.
- Full suite green: 253 unit tests (27 files), 66 e2e tests, `npm run typecheck`/`npm run lint` clean, `next build` succeeds with `/api/mac-vendor` as a dynamic route and `/tools/mac` statically prerendered.
- The interim vendor-API-proxy architecture (D-01) is fully isolated to `app/api/mac-vendor/route.ts` + `lib/mac/vendor.ts` — swapping to the long-term local IEEE OUI dataset (tracked as `MAC-V2-02`, out of scope this milestone) will only touch those two files, never `lib/mac/classify.ts` or the UI, per 05-RESEARCH.md's stated design goal.
- No known stubs remain in the MAC tool — Classification (05-02) and Vendor (05-03) sections are both fully live.

---
*Phase: 05-mac-address-inspector*
*Completed: 2026-07-25*

## Self-Check: PASSED

All 5 created files verified present on disk (`app/api/mac-vendor/route.ts`, `app/api/mac-vendor/route.test.ts`, `lib/mac/vendor.ts`, `lib/mac/vendor.test.ts`, this SUMMARY); all 3 task commit hashes (`f9ceddb`, `30d7ab0`, `8ca9334`) verified present in `git log --oneline --all`.
