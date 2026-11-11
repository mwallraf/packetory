---
phase: 14-passphrase-strength-launch
plan: 01
subsystem: ui
tags: [nextjs, react, radix-toggle-group, passphrase, eff-wordlist, playwright, vitest, lazy-loading]

requires:
  - phase: 12-password-library
    provides: "lib/password barrel, generatePassphraseBatch, lazy memoized loadWordlist, wordlistStaticImporters boundary guard"
  - phase: 13-password-generator
    provides: "PasswordTool island, PasswordOutput, page-guards.test.ts, ?mode URL codec"
provides:
  - "Mode toggle (Password/Passphrase) above the output zone with shared TOGGLE_ITEM_CLASS"
  - "Mode-aware island: generate(opts, generation, list), sequence-token requestLoad(), loading and wordlist-error output states"
  - "Closed StatusPhrase union extended with the passphrase phrases"
  - "Source guards relaxed for exactly one island import (@/lib/password/wordlist) with mutants proving they keep their teeth"
  - "Dev e2e tracer and production chunk-body proof that the EFF list is not in initial JS and loads once"
affects: [14-02, 14-03, 14-04, 14-08, passphrase-options, strength-panel, bookmark-restore]

actuals:
  tokens: 7900
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Sequence-token async loader: every commit bumps seqRef; a load continuation applies only while its token is current"
    - "Refs (seqRef, wordsRef, generationRef, lastLoadErrorRef) instead of closures for state read by async continuations"
    - "Production bundle proof via page.route + route.fetch body scan for a marker string"

key-files:
  created:
    - app/tools/password/toggle-classes.ts
    - app/tools/password/ModeToggle.tsx
    - tests/e2e/password-passphrase.spec.ts
    - tests/e2e/helpers/passphrase.ts
    - tests/e2e-prod/password-wordlist.spec.ts
  modified:
    - app/tools/password/PasswordTool.tsx
    - app/tools/password/PasswordOutput.tsx
    - app/tools/password/page-guards.test.ts
    - lib/password/boundaries.test.ts

key-decisions:
  - "A valid loaded list is cached in wordsRef even when its continuation is stale (token superseded); only the result application is gated by the token"
  - "Esc keeps the current mode (commit with mode: options.mode) so passphrase mode resets to a passphrase with the passphrase phrase, per UI-SPEC keyboard table"
  - "The island's only deep import is @/lib/password/wordlist; the vendored eff-large module stays forbidden everywhere, static or dynamic"

patterns-established:
  - "ModeToggle ignores Radix's empty deselect value and the current mode so exactly one item stays selected"
  - "Loading and error blocks share one pinned height pair that 14-08 re-pins"

requirements-completed: [PHR-01, PHR-03]

coverage:
  - id: D1
    description: "Mode toggle: choosing Passphrase lazy-loads the EFF list and shows 6 EFF words joined by '-' with ?mode=passphrase in the URL"
    requirement: PHR-01
    verification:
      - kind: e2e
        ref: "tests/e2e/password-passphrase.spec.ts#Passphrase shows 6 EFF words joined by -"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both modes keep their own settings; re-selecting the active mode changes nothing; a second Passphrase activation uses the cached list without the loading block"
    requirement: PHR-01
    verification:
      - kind: e2e
        ref: "tests/e2e/password-passphrase.spec.ts#both modes keep their own settings"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-passphrase.spec.ts#clicking the selected mode changes nothing"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-passphrase.spec.ts#a second Passphrase activation uses the cached list"
        status: pass
    human_judgment: false
  - id: D3
    description: "Production build: the EFF list is absent from initial page JS and arrives as exactly one chunk on first Passphrase use, never twice across Passphrase, Password, Passphrase"
    requirement: PHR-03
    verification:
      - kind: e2e
        ref: "tests/e2e-prod/password-wordlist.spec.ts#(a) initial load has no word list"
        status: pass
      - kind: e2e
        ref: "tests/e2e-prod/password-wordlist.spec.ts#(b) first Passphrase use fetches exactly one marker chunk"
        status: pass
    human_judgment: false
  - id: D4
    description: "Source guards allow exactly '@/lib/password/wordlist' from the island and still catch the loader elsewhere, the eff-large module (static and dynamic) and passphrase generator calls outside the island"
    requirement: PHR-03
    verification:
      - kind: unit
        ref: "app/tools/password/page-guards.test.ts"
        status: pass
      - kind: unit
        ref: "lib/password/boundaries.test.ts#detects a static import of the vendored list from the Password island (D-04)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Loading and error output states (text-free aria-hidden loading block, role=alert error panel without controls), the loading live-region phrases, and Enter / Ctrl+C doing nothing while loading or failed"
    requirement: PHR-01
    verification: []
    human_judgment: true
    rationale: "Implemented per UI-SPEC but not asserted by a browser or RTL test in this plan (the loading window is too short to observe on a local dev server without request interception); the race matrix and error Retry tests belong to 14-03. Verifier should confirm by throttling the chunk request."

duration: 5min
completed: 2026-11-11
plan_head_before: 9458650d32ffa7d9f279caf2e92a4f8a76a0f28e
plan_head_after: f9ab7f5211a5ca972b538a804c7565bc4d66a88e
commits: 2
status: complete
---

# Phase 14 Plan 01: Passphrase Mode Tracer Summary

**Password/Passphrase mode toggle with a sequence-token lazy loader for the EFF Large list, proven by a production-build spec that the 7,776-word list is never in initial JS and arrives as exactly one 62,303-character chunk on first use.**

## Performance

- **Duration:** about 5 min (wall clock 23:24Z to 23:29Z)
- **Started:** 2026-11-11T23:24:56Z
- **Completed:** 2026-11-11T23:29:00Z
- **Tasks:** 2
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments

- `ModeToggle` (Radix single ToggleGroup, `password-mode`, items `password-mode-password` / `password-mode-passphrase`) sits above `password-output-zone`; clicking Passphrase shows a 6-word EFF passphrase joined by `-` and rewrites the URL to `?mode=passphrase`.
- `PasswordTool` is mode-aware: `generate(opts, generation, list)` returns a `loading` result without drawing randomness when the list is absent, `requestLoad` applies a load result only while its token is current, and `commit()` no longer forces password mode.
- `PasswordOutput` renders a text-free, aria-hidden `password-wordlist-loading` block and a `password-wordlist-error` panel (no Retry yet, that is 14-03), each with no copy or regenerate controls.
- `page-guards.test.ts` allows exactly the specifier `@/lib/password/wordlist` from `PasswordTool.tsx`; new in-memory mutants prove the loader from OUTPUT, PAGE, faq-data and PasswordExample, the eff-large module (static and dynamic) from the island, and passphrase generator calls outside the island are all still caught. `boundaries.test.ts` gains an island static-import mutant.
- Production proof (`tests/e2e-prod/password-wordlist.spec.ts`): 18 JS chunks load initially and none holds the marker `abacus abdomen abdominal`; the first Passphrase activation fetches exactly one new chunk with the marker, `http://localhost:3101/_next/static/chunks/3cxtvbdyb3mnp.js` (62,303 characters, `.next/static/chunks/3cxtvbdyb3mnp.js`), and Passphrase, Password, Passphrase still totals one.

## Task Commits

1. **Task 1: Tracer - Passphrase toggle, lazy load, 6-word passphrase, ?mode=passphrase** - `49272c8` (feat)
2. **Task 2: Production proof the list is lazy and loads once, shared helper, boundary mutant** - `f9ab7f5` (test)

**Plan metadata:** committed separately (docs: complete plan).

## Files Created/Modified

- `app/tools/password/toggle-classes.ts` - `TOGGLE_ITEM_CLASS` shared by the three toggle groups
- `app/tools/password/ModeToggle.tsx` - Mode label plus single-select group, ignores deselect and no-op changes
- `app/tools/password/PasswordTool.tsx` - mode-aware generate, `requestLoad`, refs, extended `StatusPhrase`, new layout group
- `app/tools/password/PasswordOutput.tsx` - loading and wordlist-error states
- `app/tools/password/page-guards.test.ts` - one-specifier island exception, passphrase generator rule, new mutants
- `lib/password/boundaries.test.ts` - island static-import mutant
- `tests/e2e/password-passphrase.spec.ts` - dev e2e tracer (4 tests)
- `tests/e2e/helpers/passphrase.ts` - `EFF_MARKER`, `splitPassphrase` protecting the 4 hyphenated EFF words
- `tests/e2e-prod/password-wordlist.spec.ts` - production chunk-body scan (2 tests)

## Decisions Made

- Cache a successfully loaded list even when its continuation is stale: only applying the result is token-gated, so Passphrase, Password, Passphrase during the very first load does not pay a second loading block (the loader is memoized anyway, so no extra chunk request).
- Esc preserves the current mode and announces the matching `Options reset. New ... generated` phrase, following the UI-SPEC keyboard table; in Password mode behavior is unchanged.
- Loading and error blocks reuse the hero's current pinned `h-[124px] sm:h-[124px]` pair; 14-08 measures the final default passphrase hero.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] E2E expectation used the wrong URL parameter name**
- **Found during:** Task 1 (first dev e2e run)
- **Issue:** The "both modes keep their own settings" test asserted `?length=32`, but the codec writes `?len=32`.
- **Fix:** Corrected the assertion to `?len=32`.
- **Files modified:** `tests/e2e/password-passphrase.spec.ts`
- **Verification:** All 4 tests pass.
- **Committed in:** `49272c8`

---

**Total deviations:** 1 auto-fixed (1 test bug). **Impact on plan:** none; the fix was in the new spec only.

Two small judgment calls beyond the literal plan text, neither a deviation from its truths: the stale-list cache (above) and Esc keeping the mode (the `Options reset. New passphrase generated` phrase was added to the union by D-20(b) and needs a caller; UI-SPEC specifies it).

## Issues Encountered

- The production webServer build prints a pre-existing Tailwind CSS optimizer warning (`Invalid media query` for a `min-[Npx]:h-[Bpx]` token); it does not fail the build and is not caused by this plan.
- A helper script to count initial chunks via a manually started `next start` was blocked by the auto-mode classifier (it also called for killing Next processes, which could have hit the shared dev server). The count (18 initial JS chunks) was recorded instead through a Playwright annotation in the spec and read via the JSON reporter.

## Known Stubs

None. The wordlist-error panel intentionally has no Retry button until 14-03 (recorded in the plan assumptions).

## Threat Flags

None. No new network endpoint, auth path or trust-boundary file access; the only new surface is the existing lazy chunk, covered by T-14-01 and T-14-02.

## Verification

- `npx vitest run` (full suite): 74 files, 1342 tests passed.
- `npx playwright test` on password-passphrase, password, password-url, password-options, password-keyboard: 28 passed.
- `npx playwright test -c playwright.prod.config.ts password-wordlist`: 2 passed.
- `npm run typecheck` and eslint on all touched files: clean. `package.json` and `package-lock.json` unchanged.

## Next Phase Readiness

Ready for 14-02 and 14-03. Still open by design: bookmark restore of `?mode=passphrase`, the loader race matrix and Retry (14-03), passphrase options panel, strength panel, and the final skeleton height pins (14-08). The loading/error state human-check (D5) remains a verifier backstop.

---
*Phase: 14-passphrase-strength-launch*
*Completed: 2026-11-11*

## Self-Check: PASSED

All created files exist and both task commits (`49272c8`, `f9ab7f5`) are ancestors of HEAD.
