---
phase: 13-password-generator-page
plan: 02
subsystem: ui
tags: [nextjs, react, password, options, url-state, history-api, vitest, playwright]

requires:
  - phase: 13-password-generator-page
    provides: "13-01 island contract: generate, initialState, applyGenerated, regenerate, Generated, GenError"
  - phase: 12-password-library
    provides: "normalizeSymbols, clampInt, normalizeToolOptions, parseOptions, serializeOptions and the length, symbol and look-alike constants"
provides:
  - "PasswordOptionsPanel: Length number input plus native slider, four set switches with last-set lock, Symbol set editor with three hint states, Avoid look-alikes"
  - "One commit(next) path in the island: normalize with mode forced to password, setOptions, writeUrl, generate, reset copy"
  - "Options-only address bar via window.history.replaceState(null, ...) on mount and on every commit; hostile and passphrase-mode links rewritten to canonical options"
  - "Two RTL suites and two e2e specs for PWD-02, PWD-03, PWD-05, PWD-06 and POUT-03"
affects: [13-03, 13-04, 13-05, 13-06, 14-password-registration]

actuals:
  tokens: 12300
  tasks: 3
  commits: 6
plan_head_before: cd3ba2c6c0b991dc7d367548fc1b875383b61037
plan_head_after: d2ce39c29a6a00fed0eef280a463cf36d8eb683f
commits: 6

tech-stack:
  added: []
  patterns:
    - "Presentational options panel holding no state; the island owns options and drafts and passes handlers"
    - "Draft strings for the Length and Symbol set inputs, committed only when valid or when normalized output differs from the committed set"
    - "Shared TEXT_INPUT_GUARDS object spread onto every option text input (D-08 autofill and spellcheck opt-outs)"
    - "URL written synchronously inside commit, never from an effect, plus a mount-only canonical rewrite"

key-files:
  created:
    - app/tools/password/PasswordOptionsPanel.tsx
    - app/tools/password/PasswordTool.options.test.tsx
    - app/tools/password/PasswordTool.url.test.tsx
    - tests/e2e/password-url.spec.ts
    - tests/e2e/password-options.spec.ts
  modified:
    - app/tools/password/PasswordTool.tsx

key-decisions:
  - "Order inside commit is normalize, setOptions, writeUrl, generate+reset; all synchronous so output and address bar already match the options when a handler returns"
  - "The mount-only writeUrl effect carries an eslint-disable for react-hooks/exhaustive-deps; it is idempotent under StrictMode"
  - "A bookmarked mode=passphrase is dropped by the mount rewrite until Phase 14 adds the mode toggle (RESEARCH Pitfall 7, recorded)"

patterns-established:
  - "Symbol hint priority: Symbols off, then no usable character (derived by hasUsableSymbol from normalizeSymbols), then the rule text with SYMBOL_SET_MAX interpolated"
  - "Locked last-set switch: disabled plus checked plus aria-describedby to the lock hint; its Label keeps full opacity via peer-disabled:opacity-100"

requirements-completed: [PWD-02, PWD-03, PWD-05, PWD-06, POUT-03]

coverage:
  - id: D1
    description: "Length 4-128 by number input and native slider kept in sync; invalid typing is explained and never applied; blur clamps or restores"
    requirement: PWD-02
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.options.test.tsx#Length number input and slider (PWD-02, D-05)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-options.spec.ts#typing a length regenerates; an invalid one is explained, not applied, and blur clamps"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-options.spec.ts#the slider sets the length and syncs the number input"
        status: pass
    human_judgment: false
  - id: D2
    description: "Four character-set switches regenerate output obeying the sets; the last enabled set is locked with a hint"
    requirement: PWD-03
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.options.test.tsx#Character set switches and the last-set lock (PWD-03, D-05)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-options.spec.ts#the last set left is locked with a visible hint"
        status: pass
    human_judgment: false
  - id: D3
    description: "Symbol set input generates live from normalizeSymbols(draft), rewrites on blur, shows three hint states and is disabled while Symbols is off"
    requirement: PWD-05
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.options.test.tsx#Symbol set editor (PWD-05, D-05)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-options.spec.ts#a custom symbol set drives the symbols; empty falls back to the default"
        status: pass
    human_judgment: false
  - id: D4
    description: "Avoid look-alikes removes every look-alike character and shows an always-visible hint built from LOOK_ALIKES"
    requirement: PWD-06
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.options.test.tsx#Avoid look-alikes (PWD-06)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-options.spec.ts#Avoid look-alikes removes every look-alike character"
        status: pass
    human_judgment: false
  - id: D5
    description: "The address bar mirrors the options only via replaceState(null); a bookmark restores them; a hostile URL loads clamped with no error and is rewritten to /tools/password?len=128; the password never reaches the URL or history.state"
    requirement: POUT-03
    verification:
      - kind: unit
        ref: "app/tools/password/PasswordTool.url.test.tsx#URL state on mount (POUT-03, D-07, D-13)"
        status: pass
      - kind: unit
        ref: "app/tools/password/PasswordTool.url.test.tsx#URL state follows every commit (POUT-03, D-13)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-url.spec.ts#Password URL state (POUT-03, D-13)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Option controls read comfortably at 320px and in light and dark (layout, label wrapping, lock hint, slider scale)"
    verification: []
    human_judgment: true
    rationale: "Visual layout and wrapping are UI-SPEC backstop truths (E3-long-text) that no test here asserts; plan 13-06 owns the responsive and theme checks."

duration: 4min
completed: 2026-11-11
status: complete
---

# Phase 13 Plan 02: Password Options and URL State Summary

**Length number input with native slider, four set switches with last-set lock, live-normalized symbol set editor and Avoid look-alikes, all through one commit() path that also mirrors the options (never the output) into the address bar with replaceState(null)**

## Performance

- **Duration:** about 4 min
- **Started:** 2026-11-11T22:03:22Z
- **Completed:** 2026-11-11T22:07Z
- **Tasks:** 3 (each RED commit then GREEN commit)
- **Files created:** 5, modified: 1

## Accomplishments

- `PasswordOptionsPanel` is stateless and renders Length (text input plus range slider with LENGTH_MIN/LENGTH_MAX scale and hint), four set switches (the last enabled one disabled, checked and described by the lock hint), the Symbol set input with its three-state hint, and Avoid look-alikes with a hint rendered from `LOOK_ALIKES`. No form, fieldset or output element; every text input spreads the D-08 guard attributes.
- `PasswordTool` gained `commit(next)` as the single option path (normalize with mode forced to password, set, write URL, generate, reset copy), draft state for Length and Symbol set, `parseIntInRange`, and a mount-only canonical URL rewrite.
- Invalid Length drafts (empty, 3, 129, 20.5, 1e2, 32.0, +20, 0x20, full-width and Arabic-Indic digits, a 400-digit string) show the hint, change nothing and make no Web Crypto call; blur clamps integers or restores the committed value.
- `?len=999&n=1e9&u=0&l=0&d=0&s=0&sym=%F0%9F%98%80abc&evil=1` loads a 128-character all-sets password with no error and is rewritten to `/tools/password?len=128`; `?mode=passphrase` is rewritten to the bare path; `?words=8&sep=dot` is preserved.
- Verification: full vitest 1219 of 1219 pass (password folder 97, including 112 with the redaction file); the three password e2e specs pass (16 of 16); typecheck and lint clean (one pre-existing warning in `lib/mac/vendor.ts`); the phase boundary diff against 8b2a3b1 is empty (analytics, library, hooks, package files untouched).

## Task Commits

1. **Task 1: Length and set switches with lock** - `df68d52` (test, RED) then `a5de181` (feat)
2. **Task 2: Symbol set editor and look-alikes** - `d145109` (test, RED) then `0f736bc` (feat)
3. **Task 3: Options-only URL state and e2e** - `bab355e` (test, RED) then `d2ce39c` (feat)

**Plan metadata:** recorded in the docs(13-02) commit that follows this file.

_Six commits in total (`plan_head_before..plan_head_after`): one RED and one GREEN per task._

## Files Created/Modified

- `app/tools/password/PasswordOptionsPanel.tsx` - presentational options section, exported `SetKey`
- `app/tools/password/PasswordTool.tsx` - `parseIntInRange`, `writeUrl`, `commit`, drafts and handlers, mount effect
- `app/tools/password/PasswordTool.options.test.tsx` - RTL for PWD-02/03/05/06 and D-08 attributes
- `app/tools/password/PasswordTool.url.test.tsx` - jsdom URL-state suite with a replaceState spy under StrictMode
- `tests/e2e/password-url.spec.ts` - bookmark restore, hostile URL, history length and state shape
- `tests/e2e/password-options.spec.ts` - real-browser option effects

## Decisions Made

- The URL is written inside `commit`, between `setOptions` and generation, never from an effect, so the address bar equals `serializeOptions(options)` as soon as any handler returns.
- Recorded for the verifier (RESEARCH Pitfall 7): a bookmarked `mode=passphrase` is dropped by the mount rewrite until Phase 14 introduces the mode toggle.
- Recorded for Phase 14 (plan assumption): with symbol set `|` and Avoid look-alikes on, the symbol hint keeps showing the rule text while generation silently uses DEFAULT_SYMBOLS minus look-alikes.

## Deviations from Plan

None - plan executed exactly as written, apart from three notes below that are not deviations from behavior.

Notes:

1. **Literal grep counts.** Two acceptance greps count source lines, not rendered elements: `peer-disabled:opacity-100` prints 1 (the plan expected at least 4) and `data-bwignore` prints 1 (the plan expected at least 2). The set rows are rendered from one mapped `Label` class constant and both text inputs spread one shared `TEXT_INPUT_GUARDS` object, so the attributes still land on all four labels and both inputs. The tests assert exactly that (all four labels carry the class; both inputs carry every guard attribute). Writing the strings out repeatedly would only duplicate code.
2. **Symbol cap test.** There are exactly 32 printable ASCII non-alphanumeric characters, which equals `SYMBOL_SET_MAX`, so "SYMBOL_SET_MAX + 1 distinct symbols" cannot exist. The test pastes all 32 (kept whole) and a 66-character mixed paste of those 32 plus letters, digits, spaces and repeats (capped to 32 on blur).
3. **Prettier** is not part of the gate and already flags five pre-existing files in this folder; it was not run with `--write`.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. The new surface (options inputs and the options-only URL) is covered by T-13-05 through T-13-08 and T-13-SC; `lib/analytics` and `package.json` are unchanged.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 13-03 can add shortcuts (`/`, Enter, Esc) on top of `commit`, the drafts and `writeUrl`; Esc needs to reset `lengthDraft`, `lengthError` and `symbolDraft` as well as `options`.
- Plan 13-04 adds the Batch count cell after Avoid look-alikes in the panel grid and the batch list; the `n` URL key already flows through `commit`.

## Self-Check: PASSED

- All created files exist on disk (panel, two RTL suites, two e2e specs).
- All six task commits are ancestors of HEAD (`git rev-list --count cd3ba2c..HEAD` prints 6).
- `git diff 8b2a3b1` over the phase boundary paths (tools, components, sitemap, layout, lib/hooks, lib/analytics, lib/password except boundaries.test.ts, package.json, package-lock.json) is empty.

---
*Phase: 13-password-generator-page*
*Completed: 2026-11-11*
