---
phase: 04-dns-lookup
verified: 2026-07-24T19:35:00Z
status: gaps_found
score: 4/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "When multiple lookups overlap, only the most recent request's result is ever rendered — a slower earlier response is discarded via AbortController abort() plus a monotonic requestSeq token compared before setState (DNS-04). / ROADMAP SC 4: 'a slower earlier response can never overwrite a newer result on screen (verified under simulated out-of-order resolution).'"
    status: failed
    reason: >
      The race-safety guard (abort previous controller + bump requestSeqRef) only fires inside
      runLookup() — i.e. only when a NEW lookup is actually dispatched (a fired debounce or an
      immediate trigger). The code review (04-REVIEW.md CR-01) identified two distinct sub-cases
      of the same bug: (a) typing an invalid domain while an earlier lookup is in flight, and
      (b) typing a second VALID domain while an earlier debounced lookup's fetch is already in
      flight but the new edit's own debounce has not yet fired. 04-REVIEW-FIX.md's applied fix
      (commit a63c8aa, cancelInFlightLookup()) was wired into ONLY the invalid-input branches of
      handleDomainChange/handleDomainPaste (confirmed by reading the fix's own summary text and
      the current DnsTool.tsx source). handleDomainChange's VALID branch (line ~595-604) calls
      scheduleDebouncedLookup() but never cancelInFlightLookup() — so sub-case (b) remains
      unfixed. I independently reproduced this with a targeted Playwright probe (not committed):
      typed a slow domain (debounce fires, fetch takes 400ms), then — before that fetch resolved
      — typed a second, different, valid domain (starting its own fresh 700ms debounce). The
      first (now-stale) domain's response still landed and was rendered on screen while the
      second domain's own debounce had not yet fired, i.e. the UI displayed a result for a domain
      that no longer matched the current input. This directly contradicts the phase goal
      ("race-condition-free DNS answers") and ROADMAP Success Criterion 4, and is not covered by
      the existing DNS-04 E2E test (tests/e2e/dns-lookup.spec.ts's race test only races two
      Enter-triggered — i.e. immediately-dispatched — lookups against each other, a path where
      runLookup IS re-invoked and the guard does work correctly).
    artifacts:
      - path: "app/tools/dns/DnsTool.tsx"
        issue: "handleDomainChange's valid branch (~line 595) and scheduleDebouncedLookup do not abort the in-flight request / bump requestSeqRef before scheduling a new debounce timer, so an already-in-flight lookup's stale response is not superseded until its own debounce eventually fires."
    missing:
      - "Call cancelInFlightLookup() (or equivalent abort+seq-bump) from handleDomainChange's VALID branch before scheduleDebouncedLookup(), not only from the invalid branch — mirroring the fix already applied for invalid-input transitions."
      - "Add an E2E/unit regression test that types a slow-resolving domain, lets its debounce fire, then edits to a different valid domain before the first request resolves — asserting the stale response is never rendered once the input has moved on."
---

# Phase 4: DNS Lookup Verification Report

**Phase Goal:** Users get fast, accurate, race-condition-free DNS answers across common record types via DNS-over-HTTPS, with transparent resolver attribution and clearly distinguished result/error states — the first tool with an external async dependency.
**Verified:** 2026-07-24T19:35:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (mapped to ROADMAP Success Criteria)

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|------|--------|----------|
| 1 | User loads `/tools/dns` and sees a preselected demonstration domain already resolved. | ✓ VERIFIED | `DnsTool.tsx` mount effect calls `runLookupImmediate(DEFAULT_DOMAIN="cloudflare.com", DEFAULT_TYPE="A")` via `queueMicrotask`; `tests/e2e/dns-lookup.spec.ts#auto-resolves the demo domain on load` passes (re-ran locally: 11/11 DNS E2E tests pass). |
| 2 | Pasting/Enter resolves immediately; typing resolves after a ~600–800ms debounce; explicit refresh re-runs the lookup. | ✓ VERIFIED | `handleDomainPaste`/`useKeyboardShortcut` enter handler call `runLookupImmediate`; `handleDomainChange` (valid path) calls `scheduleDebouncedLookup` at `DEBOUNCE_MS = 700`; `handleRefresh` calls `runLookupImmediate`. Confirmed by code inspection and passing E2E tests. |
| 3 | Results display A/AAAA/MX/TXT/NS/CNAME with TTL, resolver used, duration; fallback fires only on genuine primary failure, never on legitimate empty/NXDOMAIN. | ✓ VERIFIED | `lib/dns/resolve.ts`'s `resolveWithFallback`/`queryAndClassify` returns `resolverUsed:"primary"` for ANY 2xx Status except Status 2 (SERVFAIL); only calls Google on network error/non-2xx/429/timeout/SERVFAIL. `lib/dns/resolve.test.ts` (part of the 60 passing unit tests I ran) explicitly asserts NXDOMAIN/empty-NOERROR never trigger a second fetch, and network-error/429/SERVFAIL do. `DnsTool.tsx` renders the `dns-resolver-badge`, `dns-duration`, and per-type record rows (MX priority/exchange split, TXT quote-stripped, NS/CNAME dot-stripped). |
| 4 | NXDOMAIN, empty-NOERROR, invalid-input, rate-limited, resolver-unavailable each render a distinct message, **and a slower earlier response can never overwrite a newer result on screen**. | ✗ **FAILED (partial)** | The 5 distinct state cards ARE correctly implemented and tested (`DnsTool.test.tsx`, `tests/e2e/dns-lookup.spec.ts` — all pass). However the "never overwrite a newer result" half of this criterion does **not** universally hold — see Gaps below. The shipped DNS-04 E2E race test only covers the Enter-immediate-vs-Enter-immediate race (which works); it does not cover the typed-debounce-vs-in-flight race (which is broken). Independently reproduced via a targeted probe test (see Gaps). |
| 5 | Domain/record-type state is reflected in the URL and can be bookmarked/shared. | ✓ VERIFIED | `syncUrlToLookup` called on commit (success/nxdomain/empty-noerror) via `window.history.replaceState`; `getInitialLookupFromUrl` reads `?name=&type=` on mount. `tests/e2e/dns-lookup.spec.ts#loading a ?name=&type= URL in a fresh context reproduces the exact lookup (MX)` passes. |

**Score:** 4/5 ROADMAP success criteria fully verified (SC4 partially fails on its race-safety clause).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/dns/types.ts` | Discriminated `DnsLookupState`, `DohResponse`, error classes | ✓ VERIFIED | All symbols present, substantive, imported by `resolve.ts`/`parse.ts`/`DnsTool.tsx`. |
| `lib/dns/validate.ts` | `isValidDomainInput`, `MAX_DOMAIN_LENGTH=253` | ✓ VERIFIED | ReDoS-safe bounded regex; length check before regex; unit-tested. |
| `lib/dns/query.ts` | `queryResolver` w/ per-resolver headers + timeout | ✓ VERIFIED | Composes external signal + internal timeout controller correctly. |
| `lib/dns/resolve.ts` | `resolveWithFallback` primary→fallback orchestration | ✓ VERIFIED | Matches documented contract; WR-02 fix (malformed-JSON→ResolverFailureError) present and tested. |
| `lib/dns/parse.ts` | `normalizeRecords`/`normalizeValue`/`stripTrailingDot` | ✓ VERIFIED | WR-01 fix (multi-segment TXT quote-join) present and tested. |
| `app/tools/dns/page.tsx` | Server shell, metadata, worked example, FAQ, JSON-LD | ✓ VERIFIED | No `searchParams` destructured; static in `npm run build` output (`○ /tools/dns`); FAQPage JSON-LD built from `faqItems` with `<`→`<` escape. |
| `app/tools/dns/DnsToolLoader.tsx` | `ssr:false` boundary + skeleton | ✓ VERIFIED | Matches Subnet precedent; `dns-tool-skeleton` fixed height. |
| `app/tools/dns/DnsTool.tsx` | Client island: orchestration + all render states | ⚠️ VERIFIED WITH KNOWN DEFECT | Present, wired, and does render all 5 QUAL-08 states + success/loading correctly — but its race-safety orchestration has the gap described above (CR-01's un-fixed second sub-case). |
| `tests/e2e/dns-lookup.spec.ts` | Happy-path + copy + error-state + race + bookmark E2E | ✓ VERIFIED (as written) | 8/8 tests pass; however the race test's coverage is narrower than the DNS-04 must-have claims (see gap). |
| `app/tools/dns/faq-data.ts` | `faqItems` incl. D-02 disclosure + DNS-09 explanation | ✓ VERIFIED | Both items present verbatim, naming Cloudflare and Google. |
| `tests/e2e/dns-seo.spec.ts` | Metadata/canonical/OG + FAQ disclosure + JSON-LD parity | ✓ VERIFIED | 3/3 tests pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `DnsTool.tsx` | `resolveWithFallback` (`lib/dns/resolve.ts`) | Single client-side entry point for every lookup trigger, passes `AbortController` signal | ✓ WIRED | Confirmed: every trigger path (mount, paste, Enter, type-change, refresh, try-again) ultimately calls `runLookup`, which calls `resolveWithFallback(domain, type, controller.signal)`. |
| `resolve.ts` | `query.ts` | Cloudflare first, Google only on genuine failure | ✓ WIRED | `resolverUsed` set by which call succeeded, never hardcoded — confirmed by code + `resolve.test.ts`. |
| `page.tsx` | (no `searchParams`) | Keeps `/tools/dns` statically prerendered | ✓ WIRED | Confirmed: `page.tsx` takes no props; `npm run build` shows `○ /tools/dns` (static). |
| `tools/registry.ts` | landing grid / nav / sitemap | `dns` entry `status:"active", clientOnly:true` | ✓ WIRED | Confirmed only those two fields changed; `tools/registry.test.ts`/`app/sitemap.test.ts`/nav E2E updated accordingly (per 04-01-SUMMARY Deviation #3), and `npm run build` includes `/tools/dns` in the sitemap-covered routes. |
| `page.tsx` `faqJsonLd.mainEntity` | `faq-data.ts` `faqItems` | Same source feeds FAQ + JSON-LD | ✓ WIRED | `faqJsonLd` is built by `.map()` over the imported `faqItems`; `dns-seo.spec.ts` asserts question-set parity (passes). |
| `handleDomainChange`/`handleDomainPaste` (invalid branch) | `cancelInFlightLookup()` | Abort in-flight request on invalid-input transition | ✓ WIRED | CR-01 fix confirmed present in both invalid branches. |
| `handleDomainChange` (**valid** branch) | `cancelInFlightLookup()` | Abort in-flight request on a superseding valid-edit transition | ✗ **NOT WIRED** | Confirmed absent — see Gaps. This is the root cause of the SC4 partial failure. |

### Behavioral Spot-Checks / Probe Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npx vitest run lib/dns app/tools/dns/DnsTool.test.tsx lib/hooks/useKeyboardShortcut.test.ts` | unit suite | 60/60 passed | ✓ PASS |
| `npx tsc --noEmit` (after clearing stale `.next/types` duplicate-artifact files) | typecheck | clean | ✓ PASS |
| `npm run build` | production build | succeeds; `/tools/dns` listed as `○ Static` | ✓ PASS |
| `npx playwright test tests/e2e/dns-lookup.spec.ts tests/e2e/dns-seo.spec.ts` | E2E suite | 11/11 passed | ✓ PASS |
| Targeted probe (not committed): type a slow-resolving domain, let its debounce fire, then edit to a different valid domain before the first request resolves | custom Playwright test, deleted after use | Stale first-domain response ("1.1.1.1") rendered on screen while the second domain's own debounce had not yet fired | ✗ **FAIL — confirms the CR-01 sub-case is unresolved** |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| DNS-01 | 04-01 | Preselected demo domain auto-resolves on load | ✓ SATISFIED | Mount-effect kickoff + passing E2E. |
| DNS-02 | 04-01 | Pasted domain resolves immediately | ✓ SATISFIED | `handleDomainPaste` → `runLookupImmediate`. |
| DNS-03 | 04-01/04-02 | Typed input resolves after debounce; Enter resolves immediately | ✓ SATISFIED | `DEBOUNCE_MS=700`; `useKeyboardShortcut` Enter-in-input regression fixed in 04-02 (verified: 2 new unit tests pass). |
| DNS-04 | 04-01/04-02 | Outdated in-flight requests cancelled via `AbortController` so stale results never overwrite newer ones | ✗ **BLOCKED (partial)** | Guard works for the two paths that call `runLookup` directly (immediate triggers racing each other); does NOT hold for a valid typed edit racing an already-in-flight debounced lookup. See Gaps. |
| DNS-05 | 04-01 | Explicit refresh control | ✓ SATISFIED | `handleRefresh` → `runLookupImmediate`. |
| DNS-06 | 04-01/04-02 | A/AAAA/MX/TXT/NS/CNAME supported | ✓ SATISFIED | `RECORD_TYPE_NUMBERS`, `normalizeValue`, MX priority/exchange split, toggle group renders all 6. |
| DNS-07 | 04-01/04-03 | Displays record values, TTL, resolver, duration | ✓ SATISFIED | `dns-resolver-badge`, `dns-duration`, per-record TTL row; worked example in `page.tsx`. |
| DNS-08 | 04-02 | NXDOMAIN vs empty-result distinguished | ✓ SATISFIED | Distinct cards + E2E asserting sibling absence. |
| DNS-09 | 04-01/04-03 | Primary + explicit fallback, never silent switch | ✓ SATISFIED | `resolveWithFallback` semantics + FAQ disclosure + `resolverUsed` transparency. |
| DNS-10 | 04-01/04-02 | URL reflects domain/type state, bookmarkable | ✓ SATISFIED | `syncUrlToLookup`/`getInitialLookupFromUrl` + passing round-trip E2E. |
| QUAL-08 | 04-02 | 5 distinct inline error/validation states | ✓ SATISFIED | All 5 states implemented with distinct copy/icon/color-role, tested. |

No orphaned requirements — all 11 requirement IDs (DNS-01..10, QUAL-08) declared across the three plans' `requirements:` frontmatter match REQUIREMENTS.md's Phase-4 mapping exactly.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `app/tools/dns/DnsTool.tsx` | `handleDomainChange` valid branch (~595-604) | Missing `cancelInFlightLookup()` call before scheduling a new debounce | 🛑 Blocker | Root cause of the DNS-04/SC4 race-safety gap above. |

No `TBD`/`FIXME`/`XXX` markers found in any phase-04 file. No `dangerouslySetInnerHTML` other than the two properly-escaped JSON-LD scripts (page.tsx, matching the T-04-01/T-03-01 precedent). No hardcoded empty stub returns found in `lib/dns/*` or `DnsTool.tsx`.

### Human Verification Required

None required to resolve the BLOCKER — it is a deterministic code-inspection + reproduced-test finding, not a subjective/visual judgment call.

Two minor items from the plans' `verification: backstop` truths were not independently exercised by a dedicated test and are informational only (not blocking, not counted as gaps since they are cosmetic/backstop-tier and the phase's core E2E long-text-wrap test already covers the closely related TXT-wrap case):
1. **Near-max-length (253-char) domain input doesn't break the control-row layout at 320px** — plausible given the input already wraps/scrolls internally per other tools' precedent, but not directly screenshotted/tested.
2. **IN-02 (code review, non-blocking):** the worked-example's hand-verified TTL (13s)/IP will drift from live reality over time — explicitly documented as illustrative and not a functional defect.

## Gaps Summary

The phase is substantially complete and well-tested: all 5 QUAL-08 error states, all 6 record types, resolver transparency, URL bookmarking, and SEO/FAQ/privacy-disclosure content are correctly implemented and covered by 60 passing unit tests and 11 passing E2E tests, matching the SUMMARY.md claims for those areas.

However, the code review (04-REVIEW.md, CR-01) identified a real race-condition bug in the DNS-04 race-safety contract with **two** sub-cases, and the subsequent fix (04-REVIEW-FIX.md, commit a63c8aa) resolved only one of them (the invalid-input transition). The second sub-case — a valid domain edit made while an earlier debounced lookup's network request is still in flight — remains unfixed in the current codebase. I independently confirmed this via a targeted, disposable Playwright reproduction: a stale first-domain response was rendered on screen after the user had already typed a second, different domain whose own debounce had not yet elapsed.

This is not a hypothetical or hard-to-verify concern — it is a deterministic logic gap directly in `handleDomainChange`'s valid branch, and it contradicts both the phase's stated goal ("race-condition-free DNS answers") and ROADMAP Success Criterion 4's explicit "a slower earlier response can never overwrite a newer result on screen" requirement. The existing DNS-04 E2E test does not catch it because it only exercises two Enter-triggered (immediate) lookups racing each other — a path where the existing guard already works correctly.

**Recommended fix:** call the same `cancelInFlightLookup()` helper (already implemented and used in the invalid branches) from `handleDomainChange`'s valid branch before `scheduleDebouncedLookup()`, and add a regression test that types a slow-resolving domain, lets its debounce fire, then edits to a second valid domain before the first request resolves.

---

_Verified: 2026-07-24T19:35:00Z_
_Verifier: Claude (gsd-verifier)_
