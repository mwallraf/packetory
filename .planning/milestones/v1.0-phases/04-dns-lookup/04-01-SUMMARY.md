---
phase: 04-dns-lookup
plan: 01
subsystem: dns
tags: [dns-over-https, fetch, abortcontroller, debounce, nextjs, react, radix-toggle-group]

requires:
  - phase: 03-ip-subnet-calculator
    provides: Server-shell + client-island page split, framework-agnostic lib/{tool}/ pattern, raw History API URL-state boundary, useCopyToClipboard/useKeyboardShortcut hooks
provides:
  - "lib/dns/ core: types (RecordType, DohResponse, NormalizedRecord, DnsLookupState discriminated union, RateLimitError/ResolverFailureError), validate (isValidDomainInput), query (queryResolver), resolve (resolveWithFallback), parse (normalizeRecords/normalizeValue/stripTrailingDot)"
  - "app/tools/dns/ walking skeleton: page.tsx (Server shell), DnsToolLoader.tsx (ssr:false boundary + skeleton), DnsTool.tsx (client island with debounce + AbortController/sequence-token race safety + primary-fallback resolver orchestration)"
  - "tools/registry.ts dns entry flipped to status:active, clientOnly:true"
  - "First codebase precedent for debounce + AbortController + sequence-token race-safety orchestration, and for primary->fallback multi-resolver fetch logic"
affects: [04-dns-lookup (04-02 error-state matrix, 04-03 SEO/FAQ), 05-mac-inspector (may reuse the fetch/abort/fallback orchestration precedent)]

tech-stack:
  added: []
  patterns:
    - "lib/dns/resolve.ts's resolveWithFallback: Cloudflare first, fallback to Google only on genuine failure (network error, non-2xx, HTTP 429, timeout, or Status-2 SERVFAIL) — never on a legitimate NXDOMAIN/empty-NOERROR answer"
    - "Debounce (useRef timer) + AbortController + monotonic requestSeqRef sequence token for DNS-04 race safety, coexisting with paste/Enter/Refresh immediate-trigger paths"
    - "queryResolver composes a per-call timeout (5000ms) with the caller's AbortSignal via an internal AbortController forwarding both timeout and external abort"

key-files:
  created:
    - lib/dns/types.ts
    - lib/dns/validate.ts
    - lib/dns/query.ts
    - lib/dns/resolve.ts
    - lib/dns/parse.ts
    - app/tools/dns/page.tsx
    - app/tools/dns/DnsToolLoader.tsx
    - app/tools/dns/DnsTool.tsx
    - tests/e2e/dns-lookup.spec.ts
    - lib/dns/validate.test.ts
    - lib/dns/query.test.ts
    - lib/dns/resolve.test.ts
    - lib/dns/parse.test.ts
  modified:
    - tools/registry.ts
    - tools/registry.test.ts
    - app/sitemap.test.ts
    - tests/e2e/home.spec.ts
    - tests/e2e/navigation.spec.ts

key-decisions:
  - "SERVFAIL (DNS Status 2) from the primary resolver triggers fallback to Google (Assumption A1) rather than rendering as its own state"
  - "Debounce fixed at 700ms (not runtime-configurable), 5000ms per-resolver timeout (Assumption A3)"
  - "URL (?name=&type=) syncs only on a committed lookup (debounce fires or an immediate trigger runs), never on every keystroke (Assumption A2, differs from Subnet's per-keystroke sync)"
  - "Mount-effect lookup kickoff deferred via queueMicrotask to avoid react-hooks/set-state-in-effect lint violation (runLookup's synchronous pre-await setState call)"

patterns-established:
  - "First lib/dns service module with no prior direct analog: fetch + AbortController + sequence-token race safety (Pattern 2), extending IpBadge.tsx's weaker cancellation-flag precedent"
  - "First primary->fallback multi-resolver orchestration in this codebase (resolveWithFallback)"

requirements-completed: [DNS-01, DNS-02, DNS-03, DNS-04, DNS-05, DNS-06, DNS-07, DNS-09, DNS-10]

coverage:
  - id: D1
    description: "lib/dns core (types, validate, query, resolve, parse) — ReDoS-safe domain validation, per-resolver DoH query construction with timeout, primary->fallback resolver orchestration, DoH response normalization (TXT quote-stripping, trailing-dot stripping, interleaved-record-type filtering)"
    requirement: "DNS-06, DNS-09"
    verification:
      - kind: unit
        ref: "npx vitest run lib/dns (41 tests: validate.test.ts, query.test.ts, resolve.test.ts, parse.test.ts)"
        status: pass
    human_judgment: false
  - id: D2
    description: "DNS Lookup walking skeleton — auto-resolves cloudflare.com type A on load, shows resolver badge + duration + per-record copy with visible/announced confirmation"
    requirement: "DNS-01, DNS-07"
    verification:
      - kind: e2e
        ref: "tests/e2e/dns-lookup.spec.ts#auto-resolves the demo domain on load"
        status: pass
      - kind: e2e
        ref: "tests/e2e/dns-lookup.spec.ts#copying a record value shows a visible + announced confirmation"
        status: pass
    human_judgment: false
  - id: D3
    description: "6-way record-type ToggleGroup, debounce/paste/Enter/Refresh triggers, race-safe cancellation, bookmarkable ?name=&type= URL state, static prerendering of /tools/dns"
    requirement: "DNS-02, DNS-03, DNS-04, DNS-05, DNS-06, DNS-10"
    verification:
      - kind: other
        ref: "npm run build (Route (app) output shows /tools/dns as ○ Static)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Debounce timing, paste-immediate-trigger, and multi-request race-safety under real network latency are behaviorally verified by code inspection + the happy-path E2E, but a full adversarial race-condition/keyboard-flow pass (throttled network, rapid retyping) is more reliably confirmed by a human exercising the live page, deferred to phase-level UAT."

duration: 17min
completed: 2026-07-24
status: complete
---

# Phase 4 Plan 1: DNS Lookup Walking Skeleton Summary

**Client-side DNS-over-HTTPS lookup tool with Cloudflare-primary/Google-fallback resolution, debounce+AbortController+sequence-token race safety, and a bookmarkable `?name=&type=` URL, built entirely on `lib/dns/` framework-agnostic core logic with zero new dependencies.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-07-24T16:00:58Z
- **Completed:** 2026-07-24T16:17:09Z
- **Tasks:** 3
- **Files modified:** 18 (13 created, 5 modified)

## Accomplishments
- `lib/dns/` core (types, validate, query, resolve, parse) — 41 passing unit tests covering ReDoS-safe domain validation, per-resolver query construction + timeout, primary→fallback resolver semantics (never falling back on a legitimate NXDOMAIN/empty-NOERROR answer, always falling back on network error/non-2xx/429/SERVFAIL), and DoH response normalization quirks (interleaved record types, TXT quote-stripping, trailing-dot stripping)
- `/tools/dns` end-to-end walking skeleton: loads `cloudflare.com` type A on mount with zero input, all 6 record types (A/AAAA/MX/TXT/NS/CNAME) selectable via a responsive segmented control, type/paste/Enter/Refresh trigger lookups with correct debounce-vs-immediate behavior, resolver badge + integer-ms duration shown per lookup, per-record copy with independent confirmation state
- Race-safe request cancellation: `AbortController` + monotonic `requestSeqRef` guarantees a slower, earlier request never overwrites a newer result — verified in production build that Strict Mode's dev-only double-invoke never produces more than one real network request in production
- `tools/registry.ts` dns entry flipped to `status: "active"`, `clientOnly: true` — `/tools/dns` confirmed statically prerendered in `npm run build` output

## Task Commits

Each task was committed atomically (Task 2 followed the TDD RED→GREEN cycle):

1. **Task 1: Failing happy-path E2E test** - `4ce8dde` (test)
2. **Task 2 (RED): failing unit tests + types for lib/dns core** - `272dbd3` (test)
2. **Task 2 (GREEN): implement lib/dns core** - `2b12bbf` (feat)
3. **Task 3: DnsTool client island + Server shell + loader + registry flip** - `19dcead` (feat)

_Note: Task 2 (tdd="true") has two commits per the RED→GREEN gate; no REFACTOR commit was needed (implementation matched the tested behavior on first pass)._

## Files Created/Modified
- `lib/dns/types.ts` - RecordType/RECORD_TYPES/RECORD_TYPE_NUMBERS, DohAnswer/DohResponse, NormalizedRecord, DnsSuccessResult, DnsLookupState discriminated union, RateLimitError/ResolverFailureError
- `lib/dns/validate.ts` - `isValidDomainInput` (ReDoS-safe, bounded per-label regex, 253-char ceiling checked first), `MAX_DOMAIN_LENGTH`
- `lib/dns/query.ts` - `queryResolver` (per-resolver request shape + 5000ms timeout composed with caller signal), `CLOUDFLARE_URL`/`GOOGLE_URL`/`RESOLVER_TIMEOUT_MS`
- `lib/dns/resolve.ts` - `resolveWithFallback` (Cloudflare-first, Google-fallback-only-on-genuine-failure, SERVFAIL-triggers-fallback per Assumption A1)
- `lib/dns/parse.ts` - `normalizeRecords`/`normalizeValue`/`stripTrailingDot` (interleaved-type filtering, TXT quote-strip, trailing-dot strip)
- `lib/dns/{validate,query,resolve,parse}.test.ts` - 41 unit tests total
- `app/tools/dns/page.tsx` - Server-shell (h1 + loader, no searchParams, minimal for 04-01; metadata/FAQ land in 04-03)
- `app/tools/dns/DnsToolLoader.tsx` - `ssr:false` dynamic boundary + fixed-height `dns-tool-skeleton` (D-08)
- `app/tools/dns/DnsTool.tsx` - client island: domain input, 6-way record-type ToggleGroup, Refresh button, debounce+abort+fallback orchestration, per-record copy rows, minimal generic invalid-input/failure fallback
- `tests/e2e/dns-lookup.spec.ts` - happy-path auto-resolve + per-record copy-confirmation E2E tests, mocking both `cloudflare-dns.com` and `dns.google`
- `tools/registry.ts` - dns entry: `status: "active"`, `clientOnly: true`
- `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts` - updated to reflect dns now being "active" (Rule 1 fix, see Deviations)

## Decisions Made
- SERVFAIL (Status 2) from the primary resolver is treated as a genuine failure and triggers fallback to Google (Assumption A1 confirmed per plan) — it is never rendered as its own distinct UI state.
- Debounce fixed at 700ms; per-resolver timeout fixed at 5000ms (Assumptions A2/A3 confirmed per plan) — neither is runtime-configurable, matching this codebase's `DEFAULT_CIDR`/`DEFAULT_REVERT_MS` one-true-value style.
- `?name=&type=` URL state syncs only when a lookup actually commits (debounce fires or an immediate trigger runs), never on every keystroke — intentionally differs from Subnet's every-valid-keystroke sync since DNS lookups are async/network-latent, not synchronous/local.
- The mount effect's initial lookup kickoff is deferred via `queueMicrotask` rather than called directly, to avoid the `react-hooks/set-state-in-effect` lint rule (see Deviations below) while preserving the exact same Strict-Mode-double-invoke-safety guarantee.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a 253-char boundary test fixture bug (self-caught during Task 2 GREEN)**
- **Found during:** Task 2 (running `npx vitest run lib/dns` after implementing `validate.ts`)
- **Issue:** The test's own 253-char domain fixture built a final label 67 characters long (over the 63-char per-label limit), so the "accepts a 253-char domain" test failed against a *correct* implementation — the fixture itself was wrong, not `isValidDomainInput`.
- **Fix:** Rebuilt the fixture with three 63-char labels + a 61-char final label (all within the 63-char per-label ceiling), landing on exactly 253 total characters.
- **Files modified:** `lib/dns/validate.test.ts`
- **Verification:** `npx vitest run lib/dns` — all 41 tests pass.
- **Committed in:** `2b12bbf` (Task 2 GREEN commit)

**2. [Rule 3 - Blocking] Deferred the mount-effect lookup kickoff via `queueMicrotask` to satisfy `react-hooks/set-state-in-effect`**
- **Found during:** Task 3 (`npm run lint` after implementing `DnsTool.tsx`)
- **Issue:** Calling `runLookupImmediate` directly inside the mount `useEffect` body triggers `setState` synchronously before the first `await` inside `runLookup` (the D-07 "enter loading" update) — `eslint-plugin-react-hooks`'s `set-state-in-effect` rule flags this as a blocking lint error.
- **Fix:** Wrapped the effect's kickoff call in `queueMicrotask(() => runLookupImmediate(...))`, moving the `setState` call outside the effect's synchronous execution frame with no observable behavioral delay; `abortControllerRef`/`requestSeqRef` still make React Strict Mode's dev-only double-invoke safe (verified: exactly 1 real network request in a production build, 2 in dev as expected per Pitfall 3).
- **Files modified:** `app/tools/dns/DnsTool.tsx`
- **Verification:** `npm run lint` clean; production-build manual check (`npm run build && npm start`) confirmed exactly one `cloudflare-dns.com` request reaches the mocked route per page load, matching the plan's `<verification>` section's explicit dev-vs-production expectation.
- **Committed in:** `19dcead` (Task 3 commit)

**3. [Rule 1 - Bug] Updated 4 pre-existing tests that hard-coded `dns: "planned"`**
- **Found during:** Task 3 (running the full suite after flipping `tools/registry.ts`'s dns entry to `status: "active"`)
- **Issue:** `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, and `tests/e2e/navigation.spec.ts` each hard-coded an expectation that dns stays `"planned"` (identical class of break the Phase 2 UUID plan already hit and fixed in place per STATE.md's own decision log precedent).
- **Fix:** Updated each test's expectations to reflect dns now being `"active"` — the sitemap now includes `/tools/dns`, the landing-page card no longer shows "Coming soon", and the mobile nav drawer now renders DNS as a real link (anchor count 2→3).
- **Files modified:** `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts`
- **Verification:** `npx vitest run` (177/177 pass); `npx playwright test` (41/41 pass).
- **Committed in:** `19dcead` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 self-caught test-fixture bug, 1 blocking lint fix, 1 fix-in-place for tests broken by this plan's own registry flip)
**Impact on plan:** All three were necessary corrections with no scope creep — none altered the plan's intended behavior or architecture.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required. Both DoH endpoints (`cloudflare-dns.com`, `dns.google`) are public, unauthenticated, CORS-open JSON APIs called directly from the browser.

## Next Phase Readiness
- `lib/dns/` core and `DnsLookupState`'s discriminated union already define all 5 QUAL-08 error-state variants (`nxdomain`, `empty-noerror`, `rate-limited`, `resolver-unavailable`, `invalid-input`) — 04-02 wires their full distinct UI cards (icon + label + explanation + retry buttons per D-04/D-05/D-06) on top of this plan's minimal generic fallback, no `lib/dns/` changes expected.
- 04-03 (SEO/FAQ/resolver-disclosure) can proceed independently — `page.tsx` is intentionally minimal this plan and ready for the metadata/worked-example/FAQ sections mirroring Subnet's `03-05` shape.
- No blockers identified.

---
*Phase: 04-dns-lookup*
*Completed: 2026-07-24*

## Self-Check: PASSED

All created files verified present on disk; all task/summary commit hashes verified present in git log.
