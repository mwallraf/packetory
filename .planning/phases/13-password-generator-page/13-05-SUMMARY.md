---
phase: 13-password-generator-page
plan: 05
subsystem: ui
tags: [nextjs, react, password, keyboard, shortcuts, vitest, playwright]

requires:
  - phase: 13-password-generator-page
    provides: "13-04 island with commit(), regenerate(), announce(), heroCopy, drafts, StatusPhrase incl. the reset phrase"
  - phase: 10-shared-about-section-config-parity
    provides: "lib/hooks/useKeyboardShortcut (used unchanged)"
provides:
  - "Keyboard-first Password tool: / focuses and selects Length, Enter regenerates, Esc resets everything without moving focus, Ctrl/Cmd+C copies a single result"
  - "Local getSelection guard so a user's text selection is never overridden"
  - "Shortcut hint line (password-shortcuts) with five kbd elements"
  - "RTL suite (25 tests) and a 7-test e2e spec incl. the Web Crypto call-count no-double-fire proof"
affects: [13-06, 14-password-registration]

actuals:
  tokens: 9900
  tasks: 2
  commits: 3
plan_head_before: e15724df88b440bb78d1b67aec7cbf4aea0e1ed1
plan_head_after: 99ed912bdf040e9b46a5905f35c5bdd20d15dc86
commits: 3

tech-stack:
  added: []
  patterns:
    - "Copy chord handler is undefined unless exactly one result and no error (WR-03 precedent), and returns early on a non-empty window.getSelection()"
    - "resetAll() reuses commit({...DEFAULT_OPTIONS}) plus draft resets: no key change, no remount, so focus stays"
    - "e2e proves 'exactly one generation' by wrapping Crypto.prototype.getRandomValues and asserting a call delta in [20, 39]"

key-files:
  created:
    - app/tools/password/PasswordTool.keyboard.test.tsx
    - tests/e2e/password-keyboard.spec.ts
  modified:
    - app/tools/password/PasswordTool.tsx
    - app/tools/password/PasswordOptionsPanel.tsx

key-decisions:
  - "Esc announces 'Options reset. New password generated' only when the regeneration succeeded; the error state stays silent"
  - "Selection guard is local to the island; the shared-hook fix (Phase 10 WR-01/WR-02) stays deferred and lib/hooks is untouched"
  - "The Length input ref is passed as a plain lengthRef prop (React 19 ref-as-prop through the shadcn Input spread)"

patterns-established:
  - "Shortcut hint line: one muted paragraph with kbd elements under the options grid, text asserted exactly in RTL"

requirements-completed: [POUT-04]

coverage:
  - id: D1
    description: "/ focuses and selects Length (not with Ctrl/Meta/Alt, not from an editable field or the slider)"
    requirement: POUT-04
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.keyboard.test.tsx#Slash focuses and selects Length"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-keyboard.spec.ts#/ focuses and selects Length"
        status: pass
    human_judgment: false
  - id: D2
    description: "Enter regenerates and announces; never a second generation on a focused button or switch"
    requirement: POUT-04
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.keyboard.test.tsx#Enter regenerates"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-keyboard.spec.ts#Enter on a focused button or switch never double-fires"
        status: pass
    human_judgment: false
  - id: D3
    description: "Esc resets options, drafts, hints and URL, announces the reset phrase, and leaves focus in place"
    requirement: POUT-04
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.keyboard.test.tsx#Escape resets everything and keeps focus"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-keyboard.spec.ts#Esc resets every option and keeps focus"
        status: pass
    human_judgment: false
  - id: D4
    description: "Ctrl/Cmd+C copies a single result with visible confirmation; nothing for batches, errors, selections or editable focus"
    requirement: POUT-04
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.keyboard.test.tsx#Ctrl/Cmd+C copies the single password"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-keyboard.spec.ts#Ctrl/Cmd+C copies the single result / does nothing for a batch / leaves a user selection alone"
        status: pass
    human_judgment: false
  - id: D5
    description: "Shortcut hint line reads exactly as specified with five kbd keys"
    requirement: POUT-04
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.keyboard.test.tsx#Shortcut hint"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-11-11
status: complete
---

# Phase 13 Plan 05: Keyboard shortcuts Summary

**Password tool made keyboard-first through the unchanged shared hook: `/` jumps to Length, Enter regenerates without ever double-firing on a focused button or switch, Esc resets every option and draft while keeping focus, and Ctrl/Cmd+C copies a single password unless the user has selected text.**

## Performance

- **Duration:** 12 min
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- One `useKeyboardShortcut({ slash, enter, escape, copy })` call in `PasswordTool`, with `lengthRef` reaching the Length input and a `resetAll()` that resets the length, symbol and batch drafts plus their hints, commits `DEFAULT_OPTIONS` (bare URL, copy hooks reset) and announces the reset phrase on success.
- Copy chord defined only for exactly one result with no error, guarded by a non-empty `window.getSelection()` check, so batches, the fail-closed state and user selections never trigger a copy.
- Shortcut hint line under the options grid with five `<kbd>` elements; its text matches the UI-SPEC string exactly.
- Real-browser proof that Enter on a focused Regenerate button or Avoid look-alikes switch adds exactly one generation's worth of Web Crypto calls (delta 20 to 39), the switch toggles once, and Enter on Copy adds none.

## Task Commits

1. **Task 1 RED: failing keyboard tests** - `6c6883a` (test)
2. **Task 1 GREEN: shortcut wiring and hint** - `3dea298` (feat)
3. **Task 2: e2e keyboard spec** - `99ed912` (test)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified
- `app/tools/password/PasswordTool.tsx` - hook wiring, `lengthRef`, `resetAll()`, selection-guarded copy handler
- `app/tools/password/PasswordOptionsPanel.tsx` - `lengthRef` prop on the Length input, shortcut hint with `Kbd` helper
- `app/tools/password/PasswordTool.keyboard.test.tsx` - 25 RTL tests for POUT-04 and its edges
- `tests/e2e/password-keyboard.spec.ts` - 7 real-browser tests incl. the call-count proof

## Decisions Made
- Esc reuses `commit({ ...DEFAULT_OPTIONS })` rather than a bespoke path, so the URL write, copy-hook reset and normalization stay in one place.
- The e2e selection test accepts either the sentinel or the selected heading text on the clipboard (native copy behavior varies); it asserts only that the password is never written.
- `ControlOrMeta+c` worked in this environment; no platform-key fallback was needed (assumption A3 not triggered).

## Deviations from Plan

None - plan executed exactly as written.

The 13-04 executor's note was applied: Esc resets `batchDraft` and `batchError` alongside the length and symbol drafts, and Ctrl/Cmd+C applies to the hero only. The tool-level hook tests cover this.

## Issues Encountered

None. One pre-existing lint warning in `lib/mac/vendor.ts` (`MacVendorRouteResponse` unused) is out of scope and untouched.

## Verification

- `npx vitest run app/tools/password lib/password/boundaries.test.ts`: 8 files, 242 tests pass.
- `npx playwright test tests/e2e/password-keyboard.spec.ts`: 7 passed; `password.spec.ts`, `password-url.spec.ts`, `password-options.spec.ts`: 17 passed.
- `npm run typecheck`, `npx eslint app/tools/password`: clean; `npm run lint`: 0 errors (1 pre-existing warning).
- Diff gate against `8b2a3b1` on `lib/hooks`, `lib/analytics`, `lib/password` (except boundaries test), `tools`, `components`, `app/sitemap.ts`, `app/layout.tsx`, `package.json`, `package-lock.json`: no changes.
- Acceptance greps: `useKeyboardShortcut({` 1, `getSelection()` 1, reset phrase 2, `password-shortcuts` 1, `Crypto.prototype.getRandomValues` 3, `ControlOrMeta+c` 3, listed e2e tests 7.

## Known Stubs

None.

## Threat Flags

None - no new network, auth or storage surface. T-13-17 and T-13-18 are mitigated and tested (selection guard, undefined copy handler, call-count delta).

## Next Phase Readiness

POUT-04 is proven in jsdom and a real browser. Ready for 13-06.

## Self-Check: PASSED

- Files exist: PasswordTool.keyboard.test.tsx, password-keyboard.spec.ts, PasswordTool.tsx, PasswordOptionsPanel.tsx.
- Commits `6c6883a`, `3dea298`, `99ed912` are ancestors of HEAD.

---
*Phase: 13-password-generator-page*
*Completed: 2026-11-11*
