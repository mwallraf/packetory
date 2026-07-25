---
phase: 04-dns-lookup
plan: 04
subsystem: ui
tags: [dns-over-https, race-safety, react, playwright, gap-closure]

requires:
  - phase: 04-dns-lookup
    provides: "04-01's DnsTool.tsx orchestration (abortControllerRef/requestSeqRef/debounceTimerRef, runLookup's signal.aborted / seq!==requestSeqRef.current guards) and 04-02's cancelInFlightLookup() helper + its wiring into the invalid-input branches of handleDomainChange/handleDomainPaste (commit a63c8aa, CR-01 partial fix)"
provides:
  - "handleDomainChange's VALID branch now calls cancelInFlightLookup() before setState/scheduleDebouncedLookup, mirroring the invalid branch's already-applied CR-01 pattern -- closing the last DNS-04/ROADMAP SC4 race-safety gap identified in 04-VERIFICATION.md"
  - "A new E2E regression test proving the typed-debounce-vs-in-flight race is closed: a slow-resolving domain's debounce fires and its fetch goes in flight, then a different valid domain is typed before it resolves, and the stale response is never rendered"
affects: [04-dns-lookup (phase now fully verified, no open gaps)]

tech-stack:
  added: []
  patterns:
    - "Non-retrying instantaneous count sample (await locator.count(); expect(count).toBe(0)) instead of an auto-retrying expect(locator).toHaveCount(0) when the assertion must catch a TRANSIENT state that a later, unrelated event could silently overwrite before Playwright's default retry/poll window elapses -- otherwise the auto-retry masks exactly the race the test exists to catch"

key-files:
  created: []
  modified:
    - app/tools/dns/DnsTool.tsx
    - tests/e2e/dns-lookup.spec.ts

key-decisions:
  - "cancelInFlightLookup() call placed as the first statement of handleDomainChange's valid (else) branch, before the loading setState and before scheduleDebouncedLookup -- a one-line change, no new symbols, no re-signatured functions"
  - "The new E2E test samples the stale-value count via a plain (non-auto-retrying) locator.count() read at the critical checkpoint rather than expect(locator).toHaveCount(0), after discovering during verification that the auto-retrying assertion would silently pass on the pre-fix buggy code too (the second domain's own later, faster success would overwrite the transient stale render before the assertion's internal retry timeout elapsed)"

patterns-established:
  - "When asserting the ABSENCE of a transient render inside a timing-sensitive race test, prefer a synchronous one-shot count() + expect(...).toBe(0) over toHaveCount(0) -- auto-retrying locator assertions are the wrong tool when a later legitimate state change could overwrite the very bug you're trying to catch within the assertion's own retry window"

requirements-completed: [DNS-04]

coverage:
  - id: D1
    description: "handleDomainChange's valid branch aborts and orphans any in-flight lookup via cancelInFlightLookup() before scheduling the new debounce, so a stale in-flight response can no longer win against a superseding valid edit"
    requirement: "DNS-04"
    verification:
      - kind: unit
        ref: "npx vitest run app/tools/dns/DnsTool.test.tsx (8/8 pass, no regressions)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/dns-lookup.spec.ts#a valid typed edit cancels an already-in-flight debounced lookup so its stale response never renders (DNS-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A dedicated E2E regression test exercises the typed/debounce path (not Enter/immediate) and proves the stale response never renders -- confirmed to fail against the pre-fix code and pass against the fix"
    requirement: "DNS-04"
    verification:
      - kind: e2e
        ref: "tests/e2e/dns-lookup.spec.ts#a valid typed edit cancels an already-in-flight debounced lookup so its stale response never renders (DNS-04) -- manually verified fails pre-fix (Received: 1, Expected: 0), passes post-fix"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-25
status: complete
---

# Phase 4 Plan 4: DNS-04 Race-Safety Gap Closure Summary

**Closed the last DNS-04 race-safety gap by wiring `cancelInFlightLookup()` into `handleDomainChange`'s valid branch (one line) and proving it with a regression test that reproduces the exact typed-debounce-vs-in-flight sub-case 04-VERIFICATION.md identified as unfixed.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-25T10:51:17Z
- **Completed:** 2026-07-25T10:59:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `handleDomainChange`'s valid (else) branch now calls `cancelInFlightLookup()` as its first statement, before the `loading` `setState` and before `scheduleDebouncedLookup(value, state.recordType)` -- mirroring the pattern already applied to the invalid branches in commit `a63c8aa` (04-REVIEW-FIX.md CR-01)
- This makes DNS-04 / ROADMAP Phase 4 Success Criterion 4 ("a slower earlier response can never overwrite a newer result on screen") hold universally, for both invalid-input transitions (already fixed) and valid-domain edits (fixed here)
- Added a new Playwright test in the existing `DNS Lookup race safety (DNS-04)` describe block, driving the input via `fill()` only (the typed/debounce path, not `press("Enter")`), which types a slow-resolving domain, lets its debounce fire and fetch go in flight, then types a different valid domain before the slow fetch resolves, and asserts the stale `9.9.9.9` value is never rendered while `8.8.4.4` ultimately wins
- `grep -c 'cancelInFlightLookup(' app/tools/dns/DnsTool.tsx` now returns 4 (1 definition + 3 call sites: `handleDomainChange` invalid branch, `handleDomainPaste` invalid branch, `handleDomainChange` valid branch -- the new one)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire cancelInFlightLookup() into handleDomainChange's valid branch** - `c245f34` (fix)
2. **Task 2: Add an E2E regression test for the typed-debounce-vs-in-flight race** - `c3be14b` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `app/tools/dns/DnsTool.tsx` - added `cancelInFlightLookup()` call at the top of `handleDomainChange`'s valid branch, with an inline comment citing DNS-04/CR-01
- `tests/e2e/dns-lookup.spec.ts` - new test "a valid typed edit cancels an already-in-flight debounced lookup so its stale response never renders (DNS-04)" inside the existing DNS-04 race describe block

## Decisions Made
- The fix is scoped to exactly one line (plus a comment) in `handleDomainChange`'s valid branch -- no changes to `handleDomainPaste`, `handleTypeChange`, `handleRefresh`, `handleTryAgain`, or any immediate-trigger path, all of which already call `runLookup` directly via `runLookupImmediate` and were already race-safe.
- The new E2E test's critical assertion uses a one-shot `locator.count()` + `expect(count).toBe(0)` instead of `expect(locator).toHaveCount(0)`. During verification (manually reverting the Task 1 fix to confirm the test is a genuine regression guard), the auto-retrying `toHaveCount(0)` assertion was found to silently pass even on the pre-fix buggy code: Playwright polls that assertion for up to its default 5s timeout, and within that window the second domain's own (later-armed, but faster-resolving) debounced request would fire and legitimately overwrite the transient stale `9.9.9.9` render with `8.8.4.4` -- masking the very race the test exists to catch. Switching to a synchronous one-shot sample at the exact checkpoint (500ms after the second domain is typed, before its own 700ms debounce could have fired) makes the test genuinely fail pre-fix and pass post-fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's specified `toHaveCount(0)` assertion pattern would not have caught the regression it was written to guard against**
- **Found during:** Task 2, while manually verifying the new test fails against the pre-fix code (a step not explicitly required by the plan's acceptance criteria text, but necessary to honor the plan's own stated requirement: "The test must fail against the pre-fix code... that is what makes it a genuine regression guard for THIS sub-case")
- **Issue:** The plan's action spec called for `await expect(page.getByTestId("dns-record-value").filter({ hasText: "9.9.9.9" })).toHaveCount(0);` immediately after the 500ms checkpoint wait. Playwright's `expect(locator).toHaveCount(...)` auto-retries/polls for up to its default 5000ms timeout before failing. Reproduced via a disposable debug script and by temporarily removing the Task 1 fix: at the 500ms checkpoint the stale `9.9.9.9` value WAS transiently rendered (confirmed via a raw `count()`/`textContent()` read), but because the second domain's own debounce fires ~200ms later and its fast (undelayed) fetch resolves almost immediately, the auto-retrying assertion's polling window let that legitimate later success overwrite the DOM before the assertion's timeout elapsed -- so the assertion reported PASS even on the buggy, unfixed code.
- **Fix:** Replaced the auto-retrying assertion at the critical checkpoint with a synchronous one-shot sample: `const staleCountAtCheckpoint = await page.getByTestId("dns-record-value").filter({ hasText: "9.9.9.9" }).count(); expect(staleCountAtCheckpoint).toBe(0);`. This reads the DOM once, at the exact moment intended, with no retry masking. The subsequent "second domain ultimately wins" assertions correctly keep their auto-retrying `toHaveText`/`toHaveCount` form, since those are meant to wait for eventual settled state.
- **Files modified:** `tests/e2e/dns-lookup.spec.ts`
- **Verification:** Manually reverted the Task 1 fix (via a temporary Edit, restored immediately after) and reran the test in isolation: with the old `toHaveCount(0)` phrasing the test passed on buggy code (false negative); with the one-shot `count()`/`toBe(0)` phrasing the test correctly failed on buggy code (`Expected: 0, Received: 1`) and passed once the Task 1 fix was restored. Full `npx playwright test tests/e2e/dns-lookup.spec.ts` suite (9/9) and `npx vitest run app/tools/dns/DnsTool.test.tsx` (8/8) both green afterward; `npx tsc --noEmit` clean; `npm run build` keeps `/tools/dns` static (`○`).
- **Committed in:** `c3be14b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 -- test-correctness bug discovered while honoring the plan's own "must fail pre-fix" requirement)
**Impact on plan:** No scope creep -- the fix stayed entirely within the single new test's assertion strategy, required by the plan's own explicit acceptance criteria that the test genuinely distinguish pre-fix from post-fix behavior.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required; no new dependencies.

## Next Phase Readiness
- Phase 4 (DNS Lookup) is now fully verified: the last open gap from 04-VERIFICATION.md (DNS-04/ROADMAP SC4's race-safety guarantee for the valid-edit sub-case) is closed, tested, and proven to genuinely fail pre-fix.
- No blockers identified. Phase 4 is ready for final verification / UAT sign-off.

---
*Phase: 04-dns-lookup*
*Completed: 2026-07-25*

## Self-Check: PASSED

All modified files verified present on disk; both task commit hashes (`c245f34`, `c3be14b`) verified present in git log.
