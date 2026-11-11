---
phase: 13-password-generator-page
plan: 03
subsystem: testing
tags: [vitest, source-guards, privacy, password, mutation-tests]

requires:
  - phase: 12-password-library
    provides: "lib/password/boundaries.test.ts pure analyze() guard (randomness, word-list, side-channel rules)"
  - phase: 13-password-generator-page
    provides: "13-01 page files: page.tsx, PasswordToolLoader.tsx, PasswordTool.tsx, PasswordOutput.tsx"
provides:
  - "Phase 12 boundary guard extended to app/tools/password via WALK_DIRS (D-15)"
  - "page-guards.test.ts: pure analyzePage with persistence, router/URL, data-exit, output-surface, generation-location and import-boundary rules"
  - "In-memory mutants proving every rule family flips on real page files"
affects: [13-04, 13-05, 13-06, 14-password-registration]

actuals:
  tokens: 6000
  tasks: 2
  commits: 2
plan_head_before: e712657abe8aec67af85ef1956db74acb2355748
plan_head_after: 47cc1eee579dd4d49176d76acd3ad4e82773d449
commits: 2

tech-stack:
  added: []
  patterns:
    - "Sibling pure-analyze guard per feature folder; helpers duplicated in shape rather than refactoring a verified guard"
    - "Rule hits reported as file::label so a failure names the exact ban that tripped"
    - "Forbidden snippets and patterns assembled from string parts (self-hygiene)"

key-files:
  created:
    - app/tools/password/page-guards.test.ts
  modified:
    - lib/password/boundaries.test.ts

key-decisions:
  - "Duplicated the small walk/stripComments/specifier helpers into page-guards.test.ts (RESEARCH Open Question 1)"
  - "Barrel-only import rule is deliberately strict for Phase 13; Phase 14 must relax it for the word-list loader"
  - "Non-vacuous assertions name only 13-01 files so wave-2 sibling plans do not race the guard"

patterns-established:
  - "Page bans apply to non-test files only; tests may use storage, console and the Web Crypto method for spying"

requirements-completed: [PWD-01, PWD-07, POUT-03, POUT-05]

coverage:
  - id: D1
    description: "Phase 12 randomness and word-list rules now cover the password page; page-file mutants prove they fire"
    requirement: PWD-07
    verification:
      - kind: unit
        ref: "lib/password/boundaries.test.ts#walks the password page (D-15)"
        status: pass
      - kind: unit
        ref: "lib/password/boundaries.test.ts#page: (4 mutant tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No storage, router/fragment, analytics, console, network, download or output-surface use in the page, enforced by npm test"
    requirement: POUT-03
    verification:
      - kind: unit
        ref: "app/tools/password/page-guards.test.ts#password page bans (D-12, D-13, D-15)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Generation only in the client island, no memo or window guard, barrel-only imports, server page never imports the island, loader uses ssr: false"
    requirement: PWD-01
    verification:
      - kind: unit
        ref: "app/tools/password/page-guards.test.ts#page guards have teeth - in-memory mutants"
        status: pass
    human_judgment: false
  - id: D4
    description: "No form, output, textarea, password input, editable or title surface and no raw-HTML prop"
    requirement: POUT-05
    verification:
      - kind: unit
        ref: "app/tools/password/page-guards.test.ts#no raw-HTML, form, output, textarea, password-input, editable or title surface (POUT-05)"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-11-11
status: complete
---

# Phase 13 Plan 03: Page Source Guards Summary

**Phase 12's randomness and word-list guard now walks the password page, and a new pure page guard bans storage, router/fragment, analytics/console/network/download, form/title/raw-HTML surfaces, out-of-island generation and deep library imports, each proven by in-memory mutants on real page files.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-11-11T22:05:00Z
- **Completed:** 2026-11-11T22:11:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- `WALK_DIRS` now includes `app/tools/password`; the framework, side-channel, loader and test-utils rules stay scoped to `lib/password/` because the page legitimately imports React and Next.
- New `walks the password page (D-15)` real-tree test plus four `page:` mutants (Math random in the real island, Web Crypto method in a non-test helper, allowed in a test file but a Math random reference there still caught, static word-list import in the real page).
- New `app/tools/password/page-guards.test.ts` with pure `analyzePage` and 34 mutant tests; the real tree is clean on every rule.

## Task Commits

1. **Task 1: Extend the Phase 12 boundary guard to the page** - `a518487` (test)
2. **Task 2: Page guard with in-memory teeth** - `47cc1ee` (test)

**Plan metadata:** committed separately (docs: complete plan)

_Both tasks are guard tests only; the real tree already satisfied every rule, so no GREEN production commit was needed. Task 1's RED was observed by temporarily reverting WALK_DIRS: the walk assertion failed, then passed with the change restored._

## Files Created/Modified
- `lib/password/boundaries.test.ts` - WALK_DIRS extended, comment updated, page walk test and four page mutants
- `app/tools/password/page-guards.test.ts` - Phase 13 page bans, pure analysis and mutants

## Decisions Made
- Duplicated the small helpers instead of refactoring the verified Phase 12 guard.
- Rule hits are `file::label` strings, so a regression names the exact banned construct.
- Import rule is barrel-only for Phase 13; Phase 14 must relax it for the word-list loader.

## Deviations from Plan

None - plan executed exactly as written. No real page file tripped a rule, so no page fix was needed.

## Issues Encountered
- `npm run lint` reports one pre-existing warning (`MacVendorRouteResponse` unused in `lib/mac/vendor.ts`); out of scope, no errors.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - tests only, no new runtime surface.

## Next Phase Readiness
- Every later plan's `npx vitest run app/tools/password` re-checks the bans, including files created after this plan (PasswordOptionsPanel.tsx, PasswordRow.tsx) via the directory walk.
- Ready for 13-04.

## Self-Check: PASSED

- `app/tools/password/page-guards.test.ts` exists; `lib/password/boundaries.test.ts` modified.
- Commits `a518487` and `47cc1ee` are ancestors of HEAD.
- `npx vitest run app/tools/password lib/password`: 16 files, 525 tests pass; `npm run typecheck` clean; lint 0 errors.
- `git diff --quiet 8b2a3b1 -- lib/password ':!lib/password/boundaries.test.ts'` exits 0; package.json untouched.

---
*Phase: 13-password-generator-page*
*Completed: 2026-11-11*
