---
phase: 04-dns-lookup
plan: 02
subsystem: ui
tags: [dns-over-https, error-states, react, lucide-react, keyboard-shortcuts, vitest, playwright]

requires:
  - phase: 04-dns-lookup
    provides: "04-01's lib/dns/ core (types.ts's DnsLookupState discriminated union already declaring nxdomain/empty-noerror/rate-limited/resolver-unavailable/invalid-input, RateLimitError/ResolverFailureError classes, resolveWithFallback's Status-2-triggers-fallback semantics) and the DnsTool.tsx walking skeleton (debounce/AbortController/sequence-token orchestration, success/loading rendering)"
provides:
  - "DnsTool.tsx's classifyError branch: RateLimitError -> rate-limited, every other genuine failure (ResolverFailureError/network/timeout) -> resolver-unavailable; Status 3 -> nxdomain, Status 0 + empty Answer[] -> empty-noerror, checked before rendering success"
  - "Four new presentational state components (NxdomainCard, EmptyNoErrorCard, RateLimitedCard, ResolverUnavailableCard) with exact D-05/D-06 copy, D-04 icon+label+explanation, and (for the two destructive states) an inline dns-try-again button"
  - "invalid-input inline note upgraded with a TriangleAlert icon + dns-state-invalid testid, still wired via aria-invalid/aria-describedby, last valid result panel untouched"
  - "MX record rows split into labeled Priority/Exchange spans (dns-mx-priority/dns-mx-exchange)"
  - "DnsTool.test.tsx (8 tests) and an expanded tests/e2e/dns-lookup.spec.ts (8 tests) covering all 5 QUAL-08 states, D-07/D-08 loading/skeleton, the NXDOMAIN-vs-empty-NOERROR distinction, bookmarkable ?name=&type= round-trip, and the DNS-04 out-of-order race guarantee"
  - "A fixed useKeyboardShortcut.ts bug: the global Enter guard no longer treats plain text inputs as 'interactive', so Enter now fires while typing in a tool's primary input (was silently broken for DNS-03 and Subnet's Enter-blurs since Phase 1)"
affects: [04-dns-lookup (04-03 SEO/FAQ), 05-mac-inspector (inherits the fixed Enter-in-input keyboard-shortcut behavior for any future free-text input)]

tech-stack:
  added: []
  patterns:
    - "classifyError(err, lastValidResult) as the single dispatch point mapping thrown error classes to QUAL-08 states — never a shared generic 'something went wrong' branch (Pitfall 6)"
    - "Result-panel state priority: nxdomain/empty-noerror/rate-limited/resolver-unavailable each replace the whole panel; only invalid-input renders inline near the input while leaving the last valid result panel untouched; loading/success/skeleton fall through unchanged from 04-01"

key-files:
  created:
    - app/tools/dns/DnsTool.test.tsx
  modified:
    - app/tools/dns/DnsTool.tsx
    - tests/e2e/dns-lookup.spec.ts
    - lib/hooks/useKeyboardShortcut.ts
    - lib/hooks/useKeyboardShortcut.test.ts

key-decisions:
  - "Result panel shows exactly one of skeleton/loading-dim/success/one-of-4-error-cards per UI-SPEC's page structure; invalid-input is the sole exception, rendered inline near the domain input without touching the result panel at all"
  - "Every DnsLookupState variant (including the 4 error cards) continues to carry lastValidResult even though it isn't rendered under the error cards themselves, so the NEXT loading state still has something to dim over"
  - "URL (?name=&type=) is synced on nxdomain/empty-noerror in addition to success (all three are legitimate completed lookups per D-05), but NOT on rate-limited/resolver-unavailable, matching 04-01's existing commit-only-on-success precedent for genuine failures"

patterns-established:
  - "Per-error-state presentational card components (Nxdomain/EmptyNoError/RateLimited/ResolverUnavailable) as the reusable shape for any future tool needing >2 named error states — MAC Inspector inherits this precedent if it needs more than a single generic failure state"

requirements-completed: [DNS-04, DNS-08, QUAL-08]

coverage:
  - id: D1
    description: "Five distinct, correctly-classified QUAL-08 error-state cards (invalid-input, NXDOMAIN, empty-NOERROR, rate-limited, resolver-unavailable), each with its own icon, exact D-05/D-06 copy, and color role (neutral for the two legitimate DNS answers, destructive for the two genuine failures)"
    requirement: "QUAL-08, DNS-08"
    verification:
      - kind: unit
        ref: "npx vitest run app/tools/dns/DnsTool.test.tsx (8 tests: nxdomain, empty-noerror, rate-limited, resolver-unavailable, invalid-input, first-load skeleton, loading dim, MX split)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/dns-lookup.spec.ts#NXDOMAIN renders its own card / #empty-NOERROR renders its own card / #resolver-unavailable renders with a working inline Try-again button"
        status: pass
    human_judgment: false
  - id: D2
    description: "DNS-04's race-safety guarantee proven end-to-end: an earlier, artificially-delayed request never overwrites a later, faster one, even though it resolves after it"
    requirement: "DNS-04"
    verification:
      - kind: e2e
        ref: "tests/e2e/dns-lookup.spec.ts#the final-typed domain's result always wins, even when an earlier, slower request resolves later"
        status: pass
    human_judgment: false
  - id: D3
    description: "MX rows split into labeled Priority/Exchange spans; TXT/NS/CNAME already quote/dot-stripped by lib/dns/parse.ts render correctly; a long TXT value wraps without forcing horizontal scroll at 320px"
    requirement: "DNS-06"
    verification:
      - kind: unit
        ref: "app/tools/dns/DnsTool.test.tsx#splits MX record values into labeled Priority/Exchange spans"
        status: pass
      - kind: e2e
        ref: "tests/e2e/dns-lookup.spec.ts#a long TXT record wraps without forcing horizontal page scroll"
        status: pass
    human_judgment: false
  - id: D4
    description: "Bookmarkable ?name=&type= URL state reproduces an exact lookup (domain + non-default record type) in a fresh browser context"
    requirement: "DNS-10"
    verification:
      - kind: e2e
        ref: "tests/e2e/dns-lookup.spec.ts#loading a ?name=&type= URL in a fresh context reproduces the exact lookup (MX)"
        status: pass
    human_judgment: false
  - id: D5
    description: "useKeyboardShortcut's global Enter guard fixed so it fires while focus is inside a plain text input (was previously blocked for every tool's primary input, silently breaking DNS-03 and Subnet's Enter-blurs) — a native button/role=button/role=radio/link still correctly blocks it (CR-01 regression preserved)"
    verification:
      - kind: unit
        ref: "lib/hooks/useKeyboardShortcut.test.ts#fires the enter handler while focus is inside a plain text input / #does NOT fire the enter handler while focus is on a native button"
        status: pass
      - kind: e2e
        ref: "tests/e2e/dns-lookup.spec.ts#the final-typed domain's result always wins (exercises Enter-in-input live)"
        status: pass
    human_judgment: false

duration: 19min
completed: 2026-07-24
status: complete
---

# Phase 4 Plan 2: DNS Lookup Error-State Matrix Summary

**Full QUAL-08 5-state error matrix (invalid-input, NXDOMAIN, empty-NOERROR, rate-limited, resolver-unavailable) with distinct icons/copy/color roles and inline Try-again buttons, MX record display completeness, and an end-to-end proof of DNS-04's race-safety guarantee.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-07-24T18:18:49+02:00
- **Completed:** 2026-07-24T18:37:52+02:00
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- `classifyError` dispatches thrown errors from `resolveWithFallback` into exactly one of `rate-limited` (`RateLimitError`, both resolvers 429) or `resolver-unavailable` (`ResolverFailureError`/network error/timeout) — never a shared generic branch (Pitfall 6, T-04-06)
- Status-based branching added before rendering success: `Status 3` → `nxdomain`, `Status 0` with zero normalized records → `empty-noerror`, both checked before the existing success path — SERVFAIL never reaches this branch since `resolve.ts` already converts it to a fallback trigger (04-01 Assumption A1)
- Four new presentational cards (`NxdomainCard`, `EmptyNoErrorCard` — neutral; `RateLimitedCard`, `ResolverUnavailableCard` — destructive, each with its own `dns-try-again` button) using the exact UI-SPEC Copywriting Contract strings and icon assignments (`SearchX`/`Inbox`/`Clock`/`WifiOff`)
- `invalid-input` upgraded with a `TriangleAlert` icon and a `dns-state-invalid` testid, still wired via `aria-invalid`/`aria-describedby`, and still the only state that renders inline near the input while leaving the last valid result panel fully visible and untouched
- MX record rows now split into labeled Priority/Exchange spans (`dns-mx-priority`/`dns-mx-exchange`); TXT/NS/CNAME already arrive quote/dot-stripped from `lib/dns/parse.ts`
- `DnsTool.test.tsx` (8 tests) and an expanded `tests/e2e/dns-lookup.spec.ts` (+6 tests, 8 total) prove all 5 states, D-07 loading-dim/D-08 skeleton, the NXDOMAIN-vs-empty-NOERROR distinction (each asserts the sibling card is absent), the `?name=&type=` bookmark round-trip, and DNS-04's out-of-order race guarantee (an artificially-delayed first request never overwrites a faster second one)

## Task Commits

Each task was committed atomically:

1. **Task 1: Five distinct inline error states + classifyError + record-type display completeness** - `c1ba82e` (feat)
2. **Task 2: Component test for the 5 states + loading/skeleton; E2E error-state + out-of-order race coverage** - `b36bf33` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `app/tools/dns/DnsTool.tsx` - `classifyError`, Status-3/empty-Answer branching, 4 new state-card components, MX priority/exchange split, `handleTryAgain`, upgraded invalid-input block
- `app/tools/dns/DnsTool.test.tsx` - new: 8 Vitest + Testing Library tests covering all 5 states, D-07/D-08, and MX splitting
- `tests/e2e/dns-lookup.spec.ts` - +6 Playwright tests: NXDOMAIN/empty-noerror distinction, resolver-unavailable Try-again, bookmark round-trip, DNS-04 race test, 320px long-TXT backstop
- `lib/hooks/useKeyboardShortcut.ts` - `isInteractiveTarget` no longer treats plain text inputs as "interactive" (bug fix, see Deviations)
- `lib/hooks/useKeyboardShortcut.test.ts` - 2 new regression tests for the above fix

## Decisions Made
- The result panel renders exactly one of skeleton/loading-dim/success/one-of-4-error-cards at a time (UI-SPEC page structure) — `invalid-input` is the sole exception, staying inline near the input with the last valid result panel untouched, per its own must-have truth.
- Every `DnsLookupState` variant keeps carrying `lastValidResult` even for states that don't render it (nxdomain/empty-noerror/rate-limited/resolver-unavailable), so a subsequent loading state still has something to dim over — the data model was already shaped this way in 04-01, this plan just continues threading it through correctly on every new branch.
- `?name=&type=` URL sync now also fires on `nxdomain`/`empty-noerror` (both are legitimate completed lookups per D-05), in addition to `success` — it deliberately does NOT fire on `rate-limited`/`resolver-unavailable`, matching 04-01's existing "commit only on a real completed lookup" precedent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `useKeyboardShortcut`'s Enter guard silently disabled Enter while typing in a tool's own input**
- **Found during:** Task 2, while writing the DNS-04 race E2E test (which needs `Enter` to trigger an immediate lookup while focus is in the domain input, per DNS-03/UI-SPEC's locked Enter behavior)
- **Issue:** `isInteractiveTarget` delegated to `isEditableTarget`, which returns `true` for any `<input>`/`<textarea>`. Since the global Enter handler only fires when `!isInteractiveTarget(target)`, pressing Enter while focused in the domain input (or Subnet's CIDR input, or UUID's batch-count input) never invoked the tool's `enter` handler at all — a pre-existing bug from Phase 1's `useKeyboardShortcut`, unexercised by any prior E2E test because none of Phase 1-3's tests pressed Enter from inside the primary input.
- **Fix:** Narrowed `isInteractiveTarget` to only match native `button`/`[role="button"]`/`[role="radio"]`/`a[href]` targets (removing the `isEditableTarget` delegation), since none of this project's inputs are wrapped in a `<form>` and therefore never "self-activate" on Enter the way a button/radio does. The CR-01 double-fire guard for buttons/toggles is fully preserved.
- **Files modified:** `lib/hooks/useKeyboardShortcut.ts`
- **Verification:** Added 2 regression tests (`lib/hooks/useKeyboardShortcut.test.ts`) proving Enter now fires from inside a text input and still doesn't fire from a focused button; `npx vitest run` (187/187 pass); `npx playwright test` (47/47 pass, including the DNS-04 race test which exercises this live).
- **Committed in:** `b36bf33` (Task 2 commit)

**2. [Rule 1 - Bug] NXDOMAIN/empty-NOERROR explanation text lost its leading space**
- **Found during:** Task 2, writing the E2E assertion for the exact NXDOMAIN/empty-NOERROR copy
- **Issue:** `<span className="font-mono">{domain}</span> doesn't exist.` — because the text node continued onto a new source line before the closing `</span>`, JSX's per-line whitespace-trimming rule stripped the leading space right after the domain span, rendering "cloudflare.comdoesn't exist." with no space in the actual browser DOM (a classic JSX whitespace gotcha, invisible in casual code review).
- **Fix:** Added an explicit `{" "}` between the domain span and the following text in both `NxdomainCard` and `EmptyNoErrorCard`.
- **Files modified:** `app/tools/dns/DnsTool.tsx`
- **Verification:** `tests/e2e/dns-lookup.spec.ts#NXDOMAIN renders its own card` / `#empty-NOERROR renders its own card` now assert the exact concatenated copy and pass.
- **Committed in:** `b36bf33` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs found while writing this plan's own tests)
**Impact on plan:** Both fixes were necessary for the plan's own acceptance criteria (exact copy strings, a working Enter-driven race test) and have no scope creep — the keyboard-shortcut fix additionally un-breaks DNS-03 and Subnet's Enter-blur behavior, previously silently non-functional since Phase 1.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required; both DoH endpoints remain public, unauthenticated, CORS-open JSON APIs called directly from the browser (unchanged from 04-01).

## Next Phase Readiness
- The full QUAL-08 error matrix and DNS-04 race guarantee are now proven end-to-end; 04-03 (SEO/FAQ/resolver-disclosure) can proceed independently — it only touches `page.tsx`'s metadata/FAQ sections, not `DnsTool.tsx`.
- The `useKeyboardShortcut.ts` fix is a shared-infrastructure change: 05-mac-inspector (and any future tool with a primary free-text input) now gets correct Enter-while-typing behavior for free, with no further action needed.
- No blockers identified.

---
*Phase: 04-dns-lookup*
*Completed: 2026-07-24*

## Self-Check: PASSED

All created/modified files verified present on disk; both task commit hashes (`c1ba82e`, `b36bf33`) verified present in git log.
