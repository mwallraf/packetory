---
phase: 14-passphrase-strength-launch
plan: 04
subsystem: ui
tags: [react, nextjs, entropy, strength-meter, vitest, playwright]
status: complete

requires:
  - phase: 14-passphrase-strength-launch
    provides: "14-01 TOGGLE_ITEM_CLASS and island group; Phase 12 entropy and crack-time library"
provides:
  - "StrengthPanel: 4-segment meter, label with floored bits, pool line, crack-time sentence with stated assumption, Fast/Slow scenario toggle"
  - "poolLine, crackSentence, StrengthMeter and LEVEL_SEGMENT_CLASS exports"
  - "Island scenario state (display-only, Esc resets to fast)"
affects: [14-05, 14-08]

actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: a0b620c130ba7024bd856efb5a8787e3bfd7d037
plan_head_after: 222f469ae804b8b188b53efc3baab4bcc9a56edf
commits: 2

tech-stack:
  added: []
  patterns:
    - "Pure display component whose only inputs are options and scenario; no generated string can reach it"
    - "Radix single-select deselect guard (empty value ignored) reused for the Attack scenario toggle"

key-files:
  created:
    - app/tools/password/StrengthPanel.tsx
    - app/tools/password/StrengthPanel.test.tsx
    - app/tools/password/PasswordTool.strength.test.tsx
    - tests/e2e/password-strength.spec.ts
  modified:
    - app/tools/password/PasswordTool.tsx

key-decisions:
  - "Strength level comes from raw bits and every displayed figure from formatBits (floor), so append-number reads 80 bits, not CONTEXT's 81"
  - "No useMemo: the page guards ban it and the derivation costs microseconds"
  - "Scenario is local useState in the island, never in the URL, never announced"

patterns-established:
  - "crackSentence drops 'About' and capitalizes for 'less than' / 'more than' phrases, always ending 'to crack, on average'"

requirements-completed: [STR-01, STR-02, STR-03, STR-04]

duration: 12min
completed: 2026-11-12
---

# Phase 14 Plan 04: Strength Panel Summary

**Settings-only strength panel (meter, floored bits, pool line, average crack time with its guess-rate assumption, Fast/bcrypt scenario toggle) rendered under the output in both modes and stable across Regenerate.**

## Accomplishments
- `StrengthPanel` derives everything from `options` and `scenario` through the Phase 12 library: default password reads "Very strong · 128 bits" / "85 chars · 128 bits", default passphrase "Strong · 77 bits" / "7,776 words × 6 · 77 bits", Append a number "… + 1 digit · 80 bits".
- Crack sentence follows the about / less than / more than rule; the assumption is `GUESS_RATE_LABELS[scenario]` verbatim; Slow hash turns the default passphrase from "350 thousand years" into "350 billion years".
- Wired as the third child of the island's top group, rendered in every output state (loading, word-list error, crypto error). Scenario change only calls `setScenario`; Esc resets it to fast.
- Verified: `npx vitest run app/tools/password` 275 passed; `npx playwright test tests/e2e/password` 47 passed (includes the 4 new strength specs, passphrase and keyboard specs); typecheck and eslint clean; package.json untouched.

## Task Commits
1. Task 1: Pure StrengthPanel and unit tests - `f8b6228`
2. Task 2: Island wiring, RTL and e2e proof - `222f469`

## Deviations from Plan
None - plan executed exactly as written.

The Task 1 test for "label at 99.99 bits reads Strong · 99 bits" exercises the same helpers the panel uses (`strengthLevel`, `formatBits`, `STRENGTH_LABELS`) because no settings combination yields exactly 99.99 bits; the meter itself is tested at 99.99 directly.

## Deferred Issues
- Full `npx vitest run` shows 5 failures in `lib/password/boundaries.test.ts`, caused by the literal `crypto.getRandomValues` inside `app/tools/password/faq-data.ts` (14-02, commit e5bab08). Not caused by this plan, reproduces with no 14-04 code involved. Logged in `.planning/phases/14-passphrase-strength-launch/deferred-items.md`.

## Backstop truths (human check)
- UI E4-contrast: in light and dark, filled meter segments are distinct from the panel background and the label stays readable at all four levels (classes follow the UI-SPEC contrast table; visual confirmation remains a human check).

## Known Stubs
None.

## Threat Flags
None. The panel adds no endpoints, storage or URL writes; T-14-14, T-14-15 and T-14-16 mitigations are covered by tests (raw-bit level, floored figures, no live region, no generated value in props, "on average" wording).

## Self-Check: PASSED
- app/tools/password/StrengthPanel.tsx, StrengthPanel.test.tsx, PasswordTool.strength.test.tsx, tests/e2e/password-strength.spec.ts all exist.
- Commits f8b6228 and 222f469 are ancestors of HEAD.
