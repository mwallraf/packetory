---
phase: 14-passphrase-strength-launch
plan: 03
subsystem: ui
tags: [react, nextjs, turbopack, eff-wordlist, state-machine, vitest, playwright]

requires:
  - phase: 14-passphrase-strength-launch
    provides: "14-01 lazy word-list loader, Generated.status, requestLoad, wordlist loading/error output blocks, prod chunk recorder"
provides:
  - "Passphrase bookmark restore: ?mode=passphrase kept and loaded through one deferred mount effect (D-03, D-05)"
  - "retryLoad(): reload on ChunkLoadError, loader again otherwise (D-04, RESEARCH Pitfall 1)"
  - "reload.ts reloadPage() wrapper (the only file that reloads the page)"
  - "Retry button in the fail-closed word-list error panel"
  - "RTL race matrix with a mocked loader; production abort-then-Retry spec"
affects: [14-05, 14-08]

actuals:
  tokens: 6000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Mount-time load is deferred a tick and cleared in the effect cleanup, so StrictMode's discarded run never starts a load"
    - "Page reload isolated in a mockable wrapper module"

key-files:
  created:
    - app/tools/password/reload.ts
    - app/tools/password/PasswordTool.passphrase.test.tsx
  modified:
    - app/tools/password/PasswordTool.tsx
    - app/tools/password/PasswordOutput.tsx
    - app/tools/password/PasswordTool.url.test.tsx
    - tests/e2e/password-passphrase.spec.ts
    - tests/e2e-prod/password-wordlist.spec.ts

key-decisions:
  - "The D-05 mount load is started from a setTimeout(0) inside the effect and cancelled in the cleanup: StrictMode awaits exactly one load promise instead of two, and the setState stays out of the effect body"
  - "Retry reloads the page only for a ChunkLoadError (Turbopack caches a rejected chunk import); every other failure re-calls the loader"

patterns-established:
  - "Async continuations apply only while their sequence token is current; the mount-effect cleanup also bumps the token so an unmounted island ignores a late settle"

requirements-completed: [PHR-01, PHR-03]

coverage:
  - id: C1
    description: "A ?mode=passphrase&words=8&sep=dot bookmark restores Passphrase with 8 dot-joined words, keeps the canonical search, and the default URL stays bare"
    requirement: PHR-01
    verification:
      - kind: e2e
        ref: "tests/e2e/password-passphrase.spec.ts#a passphrase bookmark restores the mode and options (D-03)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-passphrase.spec.ts#the default URL stays bare"
        status: pass
      - kind: unit
        ref: "app/tools/password/PasswordTool.url.test.tsx#mode=passphrase is restored and kept (D-03)"
        status: pass
    human_judgment: false
  - id: C2
    description: "StrictMode bookmark mount: loading state, one load promise, one applied result, announcements in order"
    requirement: PHR-01
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.passphrase.test.tsx#StrictMode applies exactly one result, awaits one load and announces in order"
        status: pass
    human_judgment: false
  - id: C3
    description: "Sequence token: mode switch back, newer options, unmount and stale rejection apply nothing; the latest options win (3 rows)"
    requirement: PHR-03
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.passphrase.test.tsx#sequence token (PHR-01, PHR-03; D-04)"
        status: pass
    human_judgment: false
  - id: C4
    description: "Fail closed: a list that is not 7,776 words shows the unexpected panel with no passphrase and no copy controls; the output zone always holds exactly one block"
    requirement: PHR-03
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.passphrase.test.tsx#a list that is not 7,776 words fails closed with the unexpected panel"
        status: pass
    human_judgment: false
  - id: C5
    description: "Retry: plain failure re-calls the loader and recovers; second failure re-shows the panel; ChunkLoadError calls reloadPage and not the loader; Enter on the error panel does nothing"
    requirement: PHR-03
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.passphrase.test.tsx#word-list error and Retry (PHR-03, D-04)"
        status: pass
    human_judgment: false
  - id: C6
    description: "Production build: first marker chunk aborted shows the D-04 error plus Retry and no copy controls; Retry reloads, mode=passphrase stays in the URL and a 6-word passphrase appears"
    requirement: PHR-03
    verification:
      - kind: e2e
        ref: "tests/e2e-prod/password-wordlist.spec.ts#(c) a failed load shows the error and Retry recovers"
        status: pass
    human_judgment: false
  - id: C7
    description: "Retry mechanism (reload on ChunkLoadError) reads correctly to a screen-reader user, and the ?mode=passphrase&n=5 bookmark's single content shift is acceptable"
    requirement: PHR-03
    verification: []
    human_judgment: true
    rationale: "Recorded human checks for the batched milestone UAT (plan assumptions A1 and E2-bookmark-batch), never blocking checkpoints in run mode."

duration: 7min
completed: 2026-11-11
plan_head_before: 40242f8e82b385c2732cbbd39b581f80f3618d6a
plan_head_after: 0e126f0be110537624c6ed5f136a151600a261dc
commits: 2
status: complete
---

# Phase 14 Plan 03: Bookmark Restore and Word-List Retry Summary

**A bookmarked `?mode=passphrase` link now restores Passphrase mode and its options through one deferred mount load guarded by the sequence token, and a failed word-list load shows a fail-closed error with a Retry that reloads the page for a ChunkLoadError (Turbopack caches rejected chunk imports) and re-calls the loader otherwise.**

## Performance

- **Duration:** about 7 min
- **Tasks:** 2
- **Files:** 7 (2 created, 5 modified)

## Accomplishments

- `PasswordTool.tsx`: the initializer no longer coerces the mode (D-03); one mount effect (D-05) starts the load via `setTimeout(0)` and its cleanup cancels the timer and bumps `seqRef`, so StrictMode awaits one promise and an unmounted island ignores a late settle. `retryLoad()` reloads on `ChunkLoadError`, otherwise applies the loading state and calls `requestLoad(options, true)`.
- `reload.ts` is the only file containing `location.reload`.
- `PasswordOutput.tsx`: `onRetry` prop and the `password-wordlist-retry` button, outside the `role="alert"` node, neutral outline classes, no focus move.
- `PasswordTool.passphrase.test.tsx` (new, 16 tests) with a mocked loader and deferreds: bookmark mount, StrictMode single load, mode-switch-back, newer-options-win (3 rows), unmount, stale rejection, 7,775-word list fails closed, one-block output zone, Retry matrix. `PasswordTool.url.test.tsx` flipped to keep `mode=passphrase` and canonical order.
- Dev e2e bookmark tests and the production spec (c): the first marker-bearing chunk is aborted, error plus Retry shown with no copy controls, Retry reloads and a 6-word `-` passphrase appears.

## Task Commits

1. **Task 1: Restore ?mode=passphrase bookmarks through one mount load; sequence-token race matrix** - `926e361` (feat)
2. **Task 2: Retry that recovers (reload on ChunkLoadError)** - `0e126f0` (feat)

## Decisions Made

- Deferring the mount load by a tick (rather than only relying on the cleanup token bump) keeps StrictMode to one `loadWordlist()` call, matching the plan's "only one load promise is awaited" truth.
- Retry for non-chunk failures first applies the loading state so the panel is replaced immediately and no previous value can reappear.

## Deviations from Plan

None - plan executed exactly as written. (Process note: Task 1's commit was staged from a Task-1-only version of `PasswordTool.tsx`/`PasswordOutput.tsx`, with the Task 2 code restored afterwards, to keep the two commits atomic.)

## Issues Encountered

- The production webServer build prints the same pre-existing Tailwind `Invalid media query` warning noted in 14-01 and 14-02; it does not fail the build.

## Human Checks Queued (batched milestone UAT)

1. Plan assumption A1: confirm the Retry-by-reload behaviour (error panel, Retry, then the passphrase returns after a reload) reads correctly with VoiceOver.
2. E2-bookmark-batch: a `?mode=passphrase&n=5` bookmark shifts the content below once when the batch replaces the hero-height loading block; accept or revisit. The 14-08 CLS gate covers the plain `?mode=passphrase` bookmark only.

## Known Stubs

None.

## Threat Flags

None. T-14-10 to T-14-13 are mitigated or accepted as planned: token checks and the RTL race matrix, reload on ChunkLoadError with the prod proof, no fallback list (wrong-length list maps to the error panel), and the reload carries only the options already in the URL.

## Verification

- `npx vitest run app/tools/password`: 9 files, 240 tests passed (passphrase suite 16, includes page-guards).
- `npx playwright test tests/e2e/password`: 43 passed (includes password-passphrase and password-url).
- `npx playwright test -c playwright.prod.config.ts password-wordlist`: 3 passed (a, b, c).
- `npm run typecheck` and eslint on the touched files: clean. `package.json` and `package-lock.json` unchanged.
- Acceptance greps: `mode: "password"` in PasswordTool.tsx 0; `rewritten without mode` in the url test 0; `ChunkLoadError` in PasswordTool.tsx 2; `location.reload` in non-test files: `reload.ts` only; `password-wordlist-retry` in PasswordOutput.tsx 1.

## Next Phase Readiness

Ready for 14-05 (word-count control; the token rule is already proven with Batch count) and 14-08 (CLS gate; the loading and error blocks are still pinned to 124px).

---
*Phase: 14-passphrase-strength-launch*

## Self-Check: PASSED
