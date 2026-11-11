---
phase: 14-passphrase-strength-launch
plan: 05
subsystem: ui
tags: [react, nextjs, passphrase, options-panel, keyboard, vitest, playwright]
status: complete

requires:
  - phase: 14-passphrase-strength-launch
    provides: "14-01 island commit()/wordsRef/toggle classes; 14-02 eff-links; 14-04 scenario state and Esc scenario reset"
provides:
  - "PassphraseOptionsPanel: Word count 3-20, four-item Separator toggle group, Capitalize words, Append a number, shared Batch count, EFF credit line, passphrase shortcut line"
  - "option-controls.tsx: shared RangeRow (min/max at the slider ends), BatchCountRow, Kbd, TEXT_INPUT_GUARDS, LABEL_CLASS, HINT_CLASS"
  - "PasswordOptionsPanel reflowed onto the shared grid (13-UI-REVIEW Fix 4 and Fix 5) with every testid and accessible name unchanged"
  - "Island word-count draft handlers, separator/capitalize/append commits, mode-aware panel, / focusing Word count in Passphrase mode"
affects: [14-06, 14-07, 14-08]

actuals:
  tokens: 14650
  tasks: 2
  commits: 3
plan_head_before: b67ac72ff6aecf304280c125812703377d58d742
plan_head_after: 168db8489468d72c5842db4c6a6e2b7242d886be
commits: 3

tech-stack:
  added: []
  patterns:
    - "Stateless presentational option panels; the island owns drafts and every change goes through commit()"
    - "Radix single-select deselect guard (empty or unknown value ignored) reused for the Separator group"
    - "Shared RangeRow for Length and Word count so both slider rows stay identical"

key-files:
  created:
    - app/tools/password/option-controls.tsx
    - app/tools/password/PassphraseOptionsPanel.tsx
    - app/tools/password/PasswordTool.passphrase-options.test.tsx
  modified:
    - app/tools/password/PasswordOptionsPanel.tsx
    - app/tools/password/PasswordTool.tsx
    - app/tools/password/PasswordTool.keyboard.test.tsx
    - app/tools/password/faq-data.ts
    - app/tools/password/faq-data.test.ts
    - tests/e2e/password-keyboard.spec.ts
    - tests/e2e/password-url.spec.ts
    - tests/e2e/password-passphrase.spec.ts

key-decisions:
  - "Esc keeps the current mode (D-02): resetAll() already committed DEFAULT_OPTIONS with the mode kept from 14-04; only the words draft reset was added."
  - "Esc while the list is loading announces nothing: commit() restarts the load under a new token and the existing 'Word list loaded' phrase is the only announcement."
  - "package.json and package-lock.json unchanged; no library added."

requirements-completed: [PHR-02, PHR-01, PHR-04]

duration: 20min
completed: 2026-11-12
---

# Phase 14 Plan 05: Passphrase options, shared grid and keyboard parity Summary

Passphrase mode now has Word count (3-20, Length draft rules), four separators, Capitalize words, Append a number, the shared Batch count and a visible EFF credit line, with `/`, Enter, Esc (mode kept) and Ctrl/Cmd+C behaving as in Password mode, and both panels sharing one grid.

## What was built

- `option-controls.tsx`: `RangeRow` (label, number input, optional suffix, min number, slider, max number on one 44px row, error hint with `aria-invalid`/`aria-describedby`), `BatchCountRow` (own full-width row), `Kbd`, `TEXT_INPUT_GUARDS`, `LABEL_CLASS`, `HINT_CLASS`.
- `PassphraseOptionsPanel.tsx`: ids and testids per UI-SPEC (`password-words`, `password-words-slider`, `password-words-hint`, `password-separator`, `password-separator-{dash|underscore|dot|space}`, `password-capitalize`, `password-append-number`, `password-eff-credit`). Separator items are generated from `SEPARATORS`, accessible names from a typed `Record<Separator, string>`, testids from `SEPARATOR_TOKENS`. The hints use `APPEND_NUMBER_BITS.toFixed(1)`. The credit links reuse `EFF_WORDLIST_URL` / `EFF_LICENCE_URL` with `rel="noreferrer"`.
- `PasswordOptionsPanel.tsx`: Length via `RangeRow`; right column stacks Symbol set then Avoid look-alikes; Batch count in its own row. Existing `PasswordTool.options.test.tsx` passes without edits.
- `PasswordTool.tsx`: `wordsDraft`/`wordsError`, `wordCountRef`, `onWordsDraftChange`/`onWordsBlur`/`onWordsSliderChange`, `onSeparatorChange`, `onCapitalizeChange`, `onAppendNumberChange` (all through `commit()`), mode-aware panel, `/` targets Word count in Passphrase mode, `resetAll()` also resets the words draft.

## Verification

- `npx vitest run`: 79 files, 1424 tests passed (the unchanged options suite included).
- `npm run typecheck`, `npx eslint app/tools/password tests/e2e`: clean.
- Playwright (dev server on :3000): password-keyboard, password-url, password-passphrase, password-options, password (40 tests) and password-responsive, -privacy, -strength, -seo (17 tests) all passed. `test:e2e:prod` was not run in this plan.
- Banned-spacing grep (`gap-1.5|px-2.5|gap-3|mt-3|px-3`) prints 0 for both new files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FAQ copy named the Web Crypto method, tripping the boundary guard (orchestrator-directed pre-step)**
- **Found during:** pre-step before Task 1 (first logged in 14-04 deferred-items.md)
- **Issue:** `faq-data.ts` Q2 (added by 14-02, e5bab08) contained the literal `crypto.getRandomValues`, which `lib/password/boundaries.test.ts` forbids outside `lib/password/random.ts`; the full `npx vitest run` had 5 failures.
- **Fix:** Reworded to "your browser's cryptographically secure random number generator (the Web Crypto API)"; `faq-data.test.ts` now asserts the new wording and that the method name is absent. The guard was not weakened. Marked resolved in `deferred-items.md`.
- **Files modified:** app/tools/password/faq-data.ts, app/tools/password/faq-data.test.ts, .planning/phases/14-passphrase-strength-launch/deferred-items.md
- **Commit:** 467b22c
- **UAT:** the FAQ Q2 wording is a human-check.

### Plan notes

- Task 2's `resetAll()` and keyboard changes were largely already in place from 14-04 (mode kept, scenario reset, announcement only on a ready result); Task 2 added the `/` routing (done in the Task 1 commit with the island wiring), RTL and e2e proofs.
- The task 1 RTL tests passed on first run because implementation was written before the test file (no separate RED commit); each behavior in the plan list is asserted.

## Known Stubs

None.

## Threat Flags

None. The mitigations in the register are covered: T-14-17 (hostile `words=99&sep=evil` e2e), T-14-18 (`parseIntInRange` boundary RTL), T-14-19 (`rel="noreferrer"`, e2e records no eff.org request).

## Human checks (backstops, not blocking)

- UI E3-long-text at 320px: switch hints, credit line and four separator items wrap without truncation or overflow (the existing 320px overflow e2e passes; a visual pass is left to UAT).
- FAQ Q2 reworded copy.

## Self-Check: PASSED

- FOUND: app/tools/password/option-controls.tsx, PassphraseOptionsPanel.tsx, PasswordTool.passphrase-options.test.tsx
- FOUND commits: 467b22c, b0bcedf, 168db84
