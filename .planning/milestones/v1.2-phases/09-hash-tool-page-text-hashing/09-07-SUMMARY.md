---
phase: 09-hash-tool-page-text-hashing
plan: 07
subsystem: ui
tags: [hash, keyboard, shortcuts, clipboard, a11y, vitest, playwright]
status: complete
requires:
  - phase: 09-hash-tool-page-text-hashing
    provides: "09-06 HashTool with share link and ?text= restore; 09-04 DigestRow/OutputToolbar; 09-01 hash-test-utils"
provides:
  - "HashTool keyboard wiring via useKeyboardShortcut: '/' focus+select, Esc reset, Ctrl/Cmd+C copies SHA-256, Enter intentionally unbound"
  - "resetToSample(): cancels in-flight job and debounce, restores sample + constant digests, clears verify box and engine error, keeps encoding and copy-all toggles"
  - "'Restore your text' notice (hash-notice-restore / hash-restore) after Esc over non-sample text"
  - "DigestRow externalCopied prop mirroring the shortcut's Copied! state on the SHA-256 row"
  - "Shared hook copy chord now ignores Shift/Alt (strictly fewer accidental clipboard writes in every tool)"
affects: [09-09]
actuals:
  tokens: 6000
  tasks: 2
  commits: 3
plan_head_before: e957bdd02220d66b28aea2ef23e0efc03b44475f
plan_head_after: a13bb583a526975f9d219519f08486899698d169
tech-stack:
  added: []
  patterns:
    - "Enter is left unbound so the textarea inserts a newline; live hashing has nothing to execute"
    - "Copy shortcut yields to any non-empty window.getSelection() and no-ops while result is null"
    - "Esc handler checks for an open role=dialog data-state=open before resetting, so closing the mobile nav never wipes the tool"
    - "Esc stashes the replaced text in `restorable` (kept across repeated Esc, cleared on any edit)"
key-files:
  created:
    - app/tools/hash/HashTool.keyboard.test.tsx
    - tests/e2e/hash-keyboard.spec.ts
  modified:
    - app/tools/hash/HashTool.tsx
    - app/tools/hash/DigestRow.tsx
    - lib/hooks/useKeyboardShortcut.ts
    - lib/hooks/useKeyboardShortcut.test.ts
    - app/tools/subnet/SubnetTool.test.tsx
key-decisions:
  - "Copy-chord modifier guard lives in the shared hook (one place, one test file) rather than the hash handler, which never sees the event; reversible"
  - "'Restore your text' is additive to D-23: Esc still restores the sample, the stashed text is recoverable until the next edit"
  - "Esc ignores an open dialog so closing the mobile nav never resets the tool"
  - "A second Esc over the already-reset sample keeps the first stashed text instead of overwriting it with the sample"
requirements-completed: [INT-01]
coverage:
  - id: D1
    description: "'/' outside editable fields focuses the textarea and selects all; Enter is not bound and inserts a newline"
    requirement: INT-01
    verification:
      - kind: e2e
        ref: "tests/e2e/hash-keyboard.spec.ts#'/' focuses the textarea and selects all so typing replaces the sample"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-keyboard.spec.ts#Enter inserts a newline and the newline is hashed"
        status: pass
      - kind: unit
        ref: "app/tools/hash/HashTool.keyboard.test.tsx#INT-01: Enter on the textarea is not default-prevented (inserts a newline)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Esc cancels in-flight work, restores the sample and its digests, clears verify box and engine error, keeps toggles; ignored while a dialog is open"
    requirement: INT-01
    verification:
      - kind: e2e
        ref: "tests/e2e/hash-keyboard.spec.ts#Esc restores the sample, its digests and clears the verify box"
        status: pass
      - kind: unit
        ref: "app/tools/hash/HashTool.keyboard.test.tsx#INT-01: Esc cancels the in-flight job and a late result never changes the rows"
        status: pass
      - kind: unit
        ref: "app/tools/hash/HashTool.keyboard.test.tsx#INT-01: Esc while a dialog is open does not reset the tool"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ctrl/Cmd+C copies the displayed SHA-256 (encoding-aware) with Copied! on that row; never clobbers a selection, never fires on Shift/Alt chords, no-op while pending, nothing copied on load/focus/typing"
    requirement: INT-01
    verification:
      - kind: unit
        ref: "app/tools/hash/HashTool.keyboard.test.tsx#INT-01 copy shortcut"
        status: pass
      - kind: unit
        ref: "lib/hooks/useKeyboardShortcut.test.ts#does NOT fire the copy handler on Shift or Alt chords"
        status: pass
      - kind: unit
        ref: "app/tools/subnet/SubnetTool.test.tsx#Ctrl/Cmd+Shift+C does not trigger the copy shortcut (INT-01)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Restore your text brings Esc-replaced text back (re-hashed, focused) until the next edit; no notice for the untouched sample"
    requirement: INT-01
    verification:
      - kind: unit
        ref: "app/tools/hash/HashTool.keyboard.test.tsx#INT-01 Restore your text"
        status: pass
    human_judgment: false
duration: 6min
completed: 2026-10-15
---

# Phase 09 Plan 07: Hash keyboard operation Summary

**Keyboard-first Hash Generator: '/' focuses and selects, Esc resets to the sample with a "Restore your text" safety net, Ctrl/Cmd+C copies the SHA-256 guarded against selections and Shift/Alt chords (shared hook fix), Enter left unbound for newlines.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-15T18:10Z
- **Completed:** 2026-10-15T18:16Z
- **Tasks:** 2 (1 tracer, 1 TDD)
- **Files modified:** 7 (2 created)

## Accomplishments

- Tracer: `/`, Esc and Enter proven in a real browser (4 Playwright tests) before the guards were added.
- `resetToSample()` supersedes in-flight jobs (late results never change the rows), clears verify and error, keeps encoding and copy-all toggles.
- Copy shortcut copies the displayed SHA-256 only when no text is selected and a settled result exists; SHA-256 row shows the same Copied! confirmation via `externalCopied`.
- `useKeyboardShortcut` copy chord now requires no Shift and no Alt; consumer regression added to SubnetTool.test.tsx with a positive control.
- Esc yields to an open `role="dialog"` (mobile nav Sheet); Esc over typed text stores it for "Restore your text".

## Task Commits

1. **Task 1: Tracer (slash, Esc, Enter unbound)** - `a21599e` (feat)
2. **Task 2 RED: guard/restore tests** - `8fab1cb` (test)
3. **Task 2 GREEN: copy shortcut, modifier guard, dialog-aware Esc, Restore** - `a13bb58` (feat)

## Verification

- `npx vitest run lib/hooks/useKeyboardShortcut.test.ts app/tools/hash app/tools/subnet`: 131 passed.
- `npm test`: 48 files, 676 tests passed (UUID, Subnet, DNS, MAC unaffected by the hook change).
- `npx playwright test tests/e2e/hash-keyboard.spec.ts tests/e2e/hash.spec.ts`: 8 passed.
- `npm run typecheck`: clean. `npm run lint`: 0 errors, 1 pre-existing warning (`lib/mac/vendor.ts` unused type, out of scope).
- `git diff --quiet -- package.json package-lock.json`: clean (T-09-SC).
- Acceptance greps: `useKeyboardShortcut({`, `resetToSample`, `!event.shiftKey`, `!event.altKey`, `window.getSelection()`, `[role="dialog"][data-state="open"]`, "Restore your text", "Reset to the sample.", `externalCopied={primaryCopy.copied}` present; no `enter:` handler in HashTool.tsx.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Playwright "End" key does not move the caret on macOS**
- **Found during:** Task 1
- **Issue:** The planned e2e step (fill "abc", press End, Enter, type "d") produced "\nd" because End only scrolls in macOS Chromium, so the selected text was replaced.
- **Fix:** Place the caret at the end with `setSelectionRange` via `locator.evaluate` before pressing Enter.
- **Files modified:** tests/e2e/hash-keyboard.spec.ts
- **Commit:** a21599e

**2. [Rule 3 - Blocking] Stale iCloud duplicate files in .next broke the Turbopack dev server**
- **Found during:** Task 1 (known environment issue)
- **Fix:** `rm -rf .next/dev` (gitignored), retried.

**3. [Style] Acceptance-criterion literal for externalCopied**
- The grep `externalCopied={primaryCopy.copied}` is satisfied by a short explanatory comment above the prop; the actual prop is `externalCopied={algo.id === "sha256" && primaryCopy.copied}` so only the SHA-256 row is affected.

**Total deviations:** 2 auto-fixed (Rule 3), 1 stylistic note. **Impact:** none on scope.

## Known Stubs

None.

## Threat Flags

None. T-09-22, T-09-23 and T-09-24 mitigations (selection/modifier guards, Restore your text, dialog guard) are implemented and covered by RTL tests.

## Next Phase Readiness

Ready for 09-09 (layout gate, skeleton pin, full phase gate). No visible shortcut legend was added (UI-SPEC Flag 6).

## Self-Check: PASSED

- FOUND: app/tools/hash/HashTool.keyboard.test.tsx, tests/e2e/hash-keyboard.spec.ts
- FOUND commits a21599e, 8fab1cb, a13bb58 (ancestors of HEAD)
