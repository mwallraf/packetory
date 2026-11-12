---
phase: 13-password-generator-page
plan: 04
subsystem: ui
tags: [nextjs, react, password, batch, clipboard, aria-live, vitest, playwright]

requires:
  - phase: 13-password-generator-page
    provides: "13-01 island (generate, applyGenerated, regenerate, Generated) and 13-02 commit()/drafts/parseIntInRange/writeUrl"
  - phase: 13-password-generator-page
    provides: "13-03 page-guards.test.ts and the Phase 12 boundary guard walking app/tools/password"
  - phase: 12-password-library
    provides: "BATCH_MIN, BATCH_MAX, clampInt, generateBatch (all-or-nothing)"
provides:
  - "PasswordRow: one batch row with its own copy hook and an onCopied notifier"
  - "PasswordOutput: hero for one result, batch toolbar plus keyed row list for 2-20, error panel for any error"
  - "Batch count input in the options panel using the Length draft rules and the D-08 attribute set"
  - "One polite sr-only live region (password-status) holding only fixed StatusPhrase values, driven by copy success"
  - "RTL suite (39 tests) incl. the POUT-05 attribute scan, and one batch/copy e2e"
affects: [13-05, 13-06, 14-password-registration]

actuals:
  tokens: 8500
  tasks: 2
  commits: 4
plan_head_before: 58e49a62bc3fc176d6e272cb4c3aa3a4884f84ab
plan_head_after: babb688e2f52ede0ba40e3c5b63732c659281830
commits: 4

tech-stack:
  added: []
  patterns:
    - "Live-region announcements follow the copy hook's copied flag through a setTimeout(0) effect (never the click handler), clearing the region to empty first so repeated phrases re-announce"
    - "StatusPhrase union with one numeric template literal: a password cannot be passed to announce()"
    - "Rows keyed by `${generation}-${index}` so a regeneration remounts every row and resets its copy state"
    - "Attribute-scan test helper: every attribute except data-kind, plus input value/placeholder, plus live region text, must not contain a displayed password"

key-files:
  created:
    - app/tools/password/PasswordRow.tsx
    - app/tools/password/PasswordTool.output.test.tsx
  modified:
    - app/tools/password/PasswordOutput.tsx
    - app/tools/password/PasswordOptionsPanel.tsx
    - app/tools/password/PasswordTool.tsx
    - tests/e2e/password.spec.ts

key-decisions:
  - "COPY_ERROR_TEXT lives in PasswordRow.tsx and is imported by PasswordOutput (hero, Copy all) so the three error lines share one constant without a new file"
  - "Row list items use flex-wrap so the w-full copy-failure line wraps under that row's value while the value keeps flex-1"
  - "A batch-count commit from blur (clamp) also announces, like a typed commit; invalid drafts and unchanged counts announce nothing"
  - "commit() now returns the applied Generated; regenerate() and the batch handlers announce only when error is null"

patterns-established:
  - "Notifier-prop rows: child owns its hook, parent receives a stable onCopied callback and decides what to announce"

requirements-completed: [POUT-01, POUT-02, POUT-05]

coverage:
  - id: D1
    description: "Batch count input (D-05, D-08): valid commits and regenerates; invalid shows the hint with aria-invalid and does not regenerate; blur clamps or restores"
    requirement: POUT-02
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.output.test.tsx#Batch count input (POUT-02, D-05, D-08)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Hero at batch 1; at 2..20 a toolbar with count, Copy all and Regenerate over a list of exactly n rows; never an empty list; error replaces everything and a mid-fill failure shows zero rows"
    requirement: POUT-02
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.output.test.tsx#Hero or batch view (POUT-02, D-10)"
        status: pass
      - kind: unit
        ref: "app/tools/password/PasswordTool.output.test.tsx#Batch error states (D-03, PWD-07)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password.spec.ts#a bookmarked batch restores, copies one per line and per row, and resizes"
        status: pass
    human_judgment: false
  - id: D3
    description: "Per-row copy with independent Copied! confirmations, Copy all joined by a newline with no trailing newline, Regenerate clears every confirmation, rejected writes show a visible line and change nothing"
    requirement: POUT-01
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.output.test.tsx#Copy all and row copy (POUT-01, POUT-02)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password.spec.ts#a bookmarked batch restores, copies one per line and per row, and resizes"
        status: pass
    human_judgment: false
  - id: D4
    description: "One polite live region holding only fixed phrases, driven by copy success, silent on option changes, invalid drafts, copy failure and the error state, re-announcing repeats"
    requirement: POUT-05
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.output.test.tsx#Live region (D-11, POUT-05)"
        status: pass
    human_judgment: false
  - id: D5
    description: "No displayed password in any attribute (except data-kind), input value, placeholder, key or the live region, at batch 1 and 5 across load, copy, Copy all and Regenerate"
    requirement: POUT-05
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.output.test.tsx#POUT-05 attribute scan"
        status: pass
      - kind: unit
        ref: "app/tools/password/page-guards.test.ts#password page bans (D-12, D-13, D-15)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Batch toolbar, rows and live-region behavior read and sound right for a screen-reader user and at 320px width"
    verification: []
    human_judgment: true
    rationale: "Actual screen-reader announcement and 320px row wrapping are UI-SPEC backstop truths that no test asserts; plan 13-06 owns responsive and theme checks."

duration: 5min
completed: 2026-11-11
status: complete
---

# Phase 13 Plan 04: Batch, Row Copy and Live Region Summary

**Batch of 1-20 passwords with per-row copy, newline-joined Copy all, a Length-style batch-count input, and one polite live region that can only ever say fixed phrases, proven by an attribute scan that finds no password anywhere outside the visible value**

## Performance

- **Duration:** about 5 min
- **Started:** 2026-11-11T22:11:30Z
- **Completed:** 2026-11-11T22:16Z
- **Tasks:** 2 (each a RED commit then a GREEN commit)
- **Files created:** 2, modified: 4

## Accomplishments

- `PasswordRow` owns its own `useCopyToClipboard`, shows an icon-only Copy button named "Copy password {i}" (1-based) that becomes "Copied!", and a w-full failure line under the row.
- `PasswordOutput` renders exactly one of: the hero (one result), the batch block (toolbar "{n} passwords", Copy all, Regenerate, copy-all error line, list keyed by generation and index), or the fail-closed error panel.
- The Batch count cell (id and testid `password-batch-count`) uses the Length draft rules with `BATCH_MIN`/`BATCH_MAX`, the full D-08 attribute set, and the hint `Enter a number between 1 and 20`.
- The island gained `batchDraft`/`batchError`, `allCopy` (reset in `applyGenerated`), `StatusPhrase`, `generatedPhrase`, `announce`, effects on `heroCopy.copied` and `allCopy.copied`, a stable `onRowCopied`, and the `password-status` span as the last root child, outside the output zone.
- Verification: full vitest 1308 of 1308; password folder plus boundary guard 217 of 217; password e2e (3 specs, 17 tests) all pass; typecheck clean; lint 0 errors (one pre-existing warning in `lib/mac/vendor.ts`); phase-boundary diff against 8b2a3b1 empty (package files, hooks, analytics and library untouched).

## Task Commits

1. **Task 1: Batch of 1-20, per-row copy, Copy all** - `17ba5a5` (test, RED) then `160e1b7` (feat)
2. **Task 2: Live region, fixed phrases, batch e2e** - `c2afe7d` (test, RED) then `babb688` (feat)

**Plan metadata:** recorded in the docs(13-04) commit that follows this file.

## Files Created/Modified

- `app/tools/password/PasswordRow.tsx` - one batch row, own copy hook, `onCopied` via a timer effect, exports `COPY_ERROR_TEXT`
- `app/tools/password/PasswordOutput.tsx` - hero | batch | error, new props `allCopy`, `onRowCopied`
- `app/tools/password/PasswordOptionsPanel.tsx` - Batch count cell, props `batchDraft`, `batchError`, `onBatchDraftChange`, `onBatchBlur`
- `app/tools/password/PasswordTool.tsx` - batch draft, `allCopy`, live region machinery; `commit()` returns the applied `Generated`
- `app/tools/password/PasswordTool.output.test.tsx` - RTL for POUT-01/02/05 and D-11 (39 tests)
- `tests/e2e/password.spec.ts` - describe "Password batch and copy (POUT-01, POUT-02, D-11)"

## Decisions Made

- Shared copy-failure constant is exported from `PasswordRow.tsx` rather than a new module.
- Rows use `flex-wrap` so the `w-full` error line sits under the row value (the UI-SPEC row class list alone cannot wrap it).
- Blur-clamp commits at the batch count also announce; unchanged and invalid drafts do not.
- Recorded, accepted gaps from the plan assumptions:
  - Copying the same target twice inside the 2 s window leaves `copied` true, so the second copy is not re-announced (fixable later with a per-hook copy counter).
  - A clipboard write that resolves after a Regenerate can briefly show "Copied!" next to the new value (RESEARCH Pitfall 5); rows remount per generation and `writeText` resolves in milliseconds.

## Deviations from Plan

None - plan executed exactly as written, apart from two notes that are not behavior deviations:

1. **Acceptance grep 3 is regex-sensitive.** `grep -c 'gen.generation}-${index}'` prints 0 as a basic regex but `grep -cF` prints 1; the key is present at `PasswordOutput.tsx:189` as `key={`${gen.generation}-${index}`}`.
2. **`onCopied` timing.** Task 1 accepted the `onCopied` prop and left it uncalled (island passed a no-op); Task 2 wired it, as the plan describes.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. The surface added (copy-all clipboard write, live region) is covered by T-13-13 through T-13-16 and T-13-SC; `package.json`, `lib/analytics` and `lib/hooks` are unchanged.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 13-05 can use `announce("Options reset. New password generated")` (already in `StatusPhrase`), `commit()` returning `Generated`, `batchDraft`/`batchError` (Esc must reset them along with the length and symbol drafts), and `allCopy`; Ctrl/Cmd+C applies to the hero only (undefined at batch > 1).
- Plan 13-06 owns the backstop checks: screen-reader announcement, 320px wrapping of rows and toolbar, light and dark contrast.

## Self-Check: PASSED

- `PasswordRow.tsx` and `PasswordTool.output.test.tsx` exist on disk.
- Commits `17ba5a5`, `160e1b7`, `c2afe7d`, `babb688` are ancestors of HEAD (`git rev-list --count 58e49a6..HEAD` prints 4).
- Acceptance greps: row-copy testid 1, `join("\n")` 1, key pattern 1 (fixed-string), `BATCH_MAX` in the panel 2, `aria-live="polite"` 1, `type StatusPhrase` 1, `new passwords generated` 2, e2e describe 1.
- `git diff --quiet 8b2a3b1` over the phase-boundary paths exits 0.

---
*Phase: 13-password-generator-page*
*Completed: 2026-11-11*
