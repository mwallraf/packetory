---
phase: 14-passphrase-strength-launch
plan: 06
subsystem: ui
tags: [react, nextjs, passphrase, a11y, live-region, privacy, vitest, playwright]
status: complete

requires:
  - phase: 14-passphrase-strength-launch
    provides: "14-01 StatusPhrase union and generatedPhrase(); 14-05 passphrase options panel and shared batch row"
provides:
  - "Mode-aware output: Copy passphrase, Copy passphrase {n}, Copy all passphrases, '{n} passphrases', passphrase error sentences"
  - "heroSeq/allSeq and a row copy counter so a repeated copy inside 2 s re-announces (closes 13-REVIEW IN-05); lib/hooks unchanged"
  - "ColoredPassword breakAfter prop: wbr after _ and . separators; overflow-wrap anywhere in Passphrase mode"
  - "Passphrase privacy exit-surface sweep and 320px wrapping/overflow e2e proofs"
affects: [14-07, 14-08]

actuals:
  tokens: 21000
  tasks: 2
  commits: 2
plan_head_before: e12cd26ed0a3af92952afeea1e9c0966eaeab834
plan_head_after: 530fb638f42e74054b3da5e896bb31065f6581bd
commits: 2

tech-stack:
  added: []
  patterns:
    - "Copy sequence counter bumped after each settled copy and listed in the announcement effect deps; a failed write leaves copied false so the effect stays silent"
    - "wbr after separator characters keeps textContent equal to the raw value"

key-files:
  created: []
  modified:
    - app/tools/password/PasswordTool.tsx
    - app/tools/password/PasswordOutput.tsx
    - app/tools/password/PasswordRow.tsx
    - app/tools/password/ColoredPassword.tsx
    - app/tools/password/PasswordTool.output.test.tsx
    - tests/e2e/password-privacy.spec.ts
    - tests/e2e/password-responsive.spec.ts

key-decisions:
  - "Re-announcement is driven by a post-copy counter in the island and rows, not by editing lib/hooks (diff against ec3f160 is empty)"
  - "RTL re-announce tests wait outside act with IS_REACT_ACT_ENVIRONMENT off, because inside act React batches the live region's clear and set into one commit and hides the repeat"

requirements-completed: [PHR-01]

duration: 15min
completed: 2026-11-12
---

# Phase 14 Plan 06: Passphrase output parity Summary

Passphrase output now names, counts, announces, colors, wraps and errors like Password output, with every repeated copy confirmed out loud and the privacy and 320px proofs extended to passphrases.

## What was built

- **PasswordOutput / PasswordRow / PasswordTool:** take `mode` and `separator`; names, toolbar count, Copy all name and passphrase error sentences follow the mode (the exhausted copy stays password-only). Batch-toolbar copy-failure line is `text-foreground`.
- **Repeat-copy announcements (D-20a):** `heroSeq` / `allSeq` in the island and a `copySeq` in each row are bumped after a settled copy and added to the effect dependencies. The keyboard chord goes through the same wrapper. A rejected write leaves `copied` false and stays silent.
- **ColoredPassword:** optional `breakAfter` renders a `wbr` after each `_` or `.` separator; hero and rows use `[overflow-wrap:anywhere]` in Passphrase mode and keep `break-all` in Password mode.
- **Tests:** 16 new RTL tests (names, counts, re-announce x4 targets, rejected write, wbr, classes, error copy, copy-failure class). I confirmed the re-announce tests fail when the counter is removed from the deps. E2E: passphrase session exit-surface sweep, passphrase name/live-region sweep, 320px light/dark hero (per-word Range rect check), 20 x 20-word `_` and `.` batches, bcrypt strength panel.

## Deviations from Plan

None - plan executed as written. Two small test-design notes: the per-word mid-word check skips EFF words containing their own hyphen (they may legitimately wrap there), and the wbr is emitted after the symbol run holding the separator (identical position for every real passphrase, since separators are never adjacent to other symbols).

## Verification

- `npx vitest run`: 79 files, 1440 tests pass. `npx vitest run app/tools/password`: 312 pass.
- `npm run typecheck`, `npx eslint app/tools/password tests/e2e/password-*.spec.ts`: clean.
- `git diff --quiet ec3f160 -- lib/hooks`: clean; package.json and package-lock.json unchanged.
- `npx playwright test tests/e2e/password*`: 67 pass (17 in the two specs of this plan).

## Backstop items (not blocking)

Recorded as `<human-check>`s for milestone UAT: password-manager, translation and VoiceOver check (CONTEXT human check 4, both modes); wrap-after-separator at 320px and the focus-ring tab-through of all new controls.

## Known Stubs

None.

## Threat Flags

None. No new network, storage or attribute surface; T-14-20 and T-14-21 are covered by the new e2e sweeps.

## Self-Check: PASSED

Files modified exist; commits 470f3a1 and 530fb63 are ancestors of HEAD.
