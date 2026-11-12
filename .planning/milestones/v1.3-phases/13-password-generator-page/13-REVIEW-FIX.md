---
phase: 13-password-generator-page
fixed_at: 2026-11-11T23:35:00Z
review_path: .planning/phases/13-password-generator-page/13-REVIEW.md
iteration: 2
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** .planning/phases/13-password-generator-page/13-REVIEW.md (plus the top 3 fixes from 13-UI-REVIEW.md, recorded as UI-1..UI-3)
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (CR-01, WR-01..WR-03, UI-1..UI-3)
- Fixed: 7
- Skipped: 0

Info findings IN-01..IN-06 are out of scope for `critical_warning` and remain in REVIEW.md.

**Verification environment:** all gates ran in the main checkout (`/Users/mwallraf/Developer/packetory.dev`), not an isolated worktree (`workflow.use_worktrees` handled by the orchestrator; worktrees have no `node_modules`). The Playwright dev specs reused the existing `next dev` server on :3000. The prod SSR spec ran once, after the dev e2e run finished, through `playwright.prod.config.ts` (own build and server on :3101).

## Fixed Issues

### CR-01: Unguarded `replaceState` inside `commit` aborts regeneration

**Files modified:** `app/tools/password/PasswordTool.tsx`, `app/tools/password/PasswordTool.url.test.tsx`
**Commit:** 4b742a9
**Applied fix:** `writeUrl` now wraps `serializeOptions` and `history.replaceState` in `try/catch` (best-effort mirror, covers the mount-time call too). In `commit`, `writeUrl` now runs after `setOptions`, `generate` and `applyGenerated`, so a throwing URL write can no longer leave the output out of sync with the options. Added a jsdom test that makes `replaceState` throw a `SecurityError`, then changes the length and toggles digits and asserts the output still follows the options. Confirmed the test fails against the pre-fix code.
**Status:** fixed: requires human verification (logic change in the commit ordering and the error handling)

### WR-01: `generate()` reports every thrown error as "Secure random generation isn't available"

**Files modified:** `app/tools/password/PasswordTool.tsx`, `app/tools/password/PasswordOutput.tsx`, `app/tools/password/PasswordTool.test.tsx`
**Commit:** 2008e09
**Applied fix:** `GenError` gains `"unexpected"`. Only `CryptoUnavailableError` maps to `"crypto"`, and `GenerationExhaustedError` to `"exhausted"`. Anything else maps to `"unexpected"`, with a new `ERROR_COPY.unexpected` ("Something went wrong, so no password was generated." / "Press Enter to try again, or change an option."). Added a unit test where `getRandomValues` throws `Error("boom")`; it asserts the neutral message and that no Web Crypto wording appears. The existing e2e fail-closed test (which removes `getRandomValues`) still passes through the `CryptoUnavailableError` path.
**Status:** fixed: requires human verification (error-mapping logic; the new neutral copy is not in the locked UI-SPEC and may need approval)

### WR-02: Negative e2e assertions can pass before the code under test has acted

**Files modified:** `tests/e2e/password-keyboard.spec.ts`
**Commit:** 548c8e1
**Applied fix:** Added a `settle(page)` helper (250 ms in-page timeout) that runs after the keypress and before the absence assertions in the batch and selection tests. The batch test now also asserts the Copy all accessible name is unchanged. The selection test now proves its precondition (`getSelection()` equals the heading text) and also asserts the hero Copy name stays "Copy password". Mutation-checked: removing the `getSelection()` guard in `PasswordTool.tsx` now fails the selection test (restored afterwards).

### WR-03: Prod SSR leak detector ignores `<script>` content

**Files modified:** `tests/e2e-prod/password-ssr.spec.ts`
**Commit:** 5014e61
**Applied fix:** Added `flightPayloads` (decodes the JSON string arguments of every `self.__next_f.push(...)`) and `flightHasAllSetsRun`, which scans each quoted payload value for a 20-plus-character all-four-classes run. Real server HTML contains benign long mixed-class values (the build id, `.woff2` and other asset paths, `*-module__*` CSS-module class names), so those are excluded by `isBuildArtifact`. The server-HTML test now asserts both scans are clean. Added a positive control that hides `Aa0!`x5 in a flight push inside a `<script>` (the visible-text scan misses it, the payload scan finds it) and a negative control with a build id. Ran `npx playwright test -c playwright.prod.config.ts password-ssr`: 5 passed.
**Trade-off:** a leaked password that itself ends in `.js`, `.css`, `.map`, `.woff` or `.woff2`, or contains `-module__`, would be excluded. The chance for a 20-plus-character random password is negligible.

### UI-1: `PasswordRow.tsx` `px-2.5` violates the spacing contract

**Files modified:** `app/tools/password/PasswordRow.tsx`
**Commit:** e2b2feb
**Applied fix:** `px-2.5` (10px) is replaced by `px-2` (8px, on the 4px scale) on a button fixed at `w-11` (44px), so the icon-only button keeps its 44px target.

### UI-2: Copy reads weaker than the outlined Regenerate

**Files modified:** `app/tools/password/PasswordOutput.tsx`
**Commit:** 417e522
**Applied fix:** The hero Copy and batch Copy all buttons now have a filled accent resting state (`bg-primary text-primary-foreground hover:bg-primary/90`) instead of a borderless ghost. Regenerate is unchanged (neutral outline, not accent). The accent stays on copy controls only, and the contrast is the same as the existing site-wide accent precedent (white on cyan-600 is 3.68:1, and dark is much higher). A border or tint was avoided because UI-SPEC forbids the accent on borders and a 10% tint drops the caption below 3:1. Checked on a screenshot at 1000px: Copy all clearly outweighs Regenerate. Batch row copy buttons stay ghost accent icons.
**Status:** deviation from UI-SPEC to confirm: the spec says the copy controls use `text-primary` on a transparent background. A filled accent is a visual change that needs sign-off at UAT.

### UI-3: Batch row reflows when "Copied!" shows

**Files modified:** `app/tools/password/PasswordRow.tsx`
**Commit:** e2b2feb (same commit as UI-1)
**Applied fix:** The `<li>` no longer uses `flex-wrap`. The value and button now sit in an inner `flex items-start gap-2` row, and the button has a fixed `h-11 w-11` box in both states. The confirmed state is the `Check` icon only (size-5) plus an `sr-only` "Copied!" span, and the `aria-label` is still "Copied!". The copy-failure `<p>` moved outside the flex row (below it, `mt-2`), and it stays visible and `text-foreground`. Dev e2e (including the 320px batch specs) and unit tests pass.
**Status:** deviation from UI-SPEC to confirm: UI-SPEC says the row's confirmed state is `Check` plus a visible "Copied!" caption. The visible caption was dropped to prevent the reflow (this is the icon-only alternative from the UI audit). The Check icon is the visible confirmation, and "Copied!" stays in the DOM and the accessible name, so the existing tests still pass unchanged.

## Verification Results

- `npx vitest run app/tools/password lib/password`: 18 files, 591 tests passed (including `page-guards.test.ts` and `lib/password/boundaries.test.ts`).
- `npm run typecheck`: clean.
- `npm run lint`: 0 errors, 1 pre-existing warning in `lib/mac/vendor.ts`.
- `npx playwright test tests/e2e/password*.spec.ts`: 31 passed (run after the UI changes).
- `npx playwright test -c playwright.prod.config.ts password-ssr`: 5 passed (run after the WR-03 change, before the UI-1..UI-3 commits, which do not touch the SSR output).

No dependency changes. `lib/hooks`, `lib/analytics` and `lib/password` were not modified. No `.planning` files other than this report were touched.

---

# Iteration 2

**Source review:** `.planning/phases/13-password-generator-page/13-REVIEW.md` (iteration-2 review)
**Scope:** explicit, orchestrator-selected Info items IN-07, IN-09, IN-10. The frontmatter counts above describe this iteration (3 in scope, 3 fixed, 0 skipped). The iteration-1 counts (7 in scope, 7 fixed) are recorded in the Iteration 1 sections above. IN-01..IN-06 and IN-08 remain in REVIEW.md.

**Verification environment:** all gates ran in the main checkout, not an isolated worktree. The Playwright dev specs reused the `next dev` server on :3000, which was still up (HTTP 200) afterwards. The prod SSR spec ran once, after the dev e2e run finished, through `playwright.prod.config.ts`.

## Fixed Issues

### IN-07: Filled copy buttons are 3.68:1 (below WCAG AA 4.5:1)

**Files modified:** `app/tools/password/PasswordOutput.tsx`
**Commit:** 39e9e5b
**Applied fix:** The hero Copy and the batch Copy all buttons now use local classes instead of `bg-primary text-primary-foreground`. Light mode is `bg-[#0e7490] text-white hover:bg-[#155e75]` (cyan-700, hover cyan-800). Dark mode is `dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90`, the existing token pairing. `app/globals.css` and the global tokens are unchanged, and Regenerate is unchanged. The filled fill stays the only accent-filled control in the output area, so Copy remains visually primary over the outlined neutral Regenerate.

Computed WCAG contrast ratios (14px/600 text, AA threshold 4.5:1):

| Theme / state | Foreground | Background | Ratio |
|---------------|------------|------------|-------|
| Light, before | `#ffffff` | `#0891b2` (cyan-600) | 3.68:1 (fail) |
| Light, rest | `#ffffff` | `#0e7490` | 5.36:1 (pass) |
| Light, hover | `#ffffff` | `#155e75` | 7.27:1 (pass) |
| Dark, rest | `#020617` | `#22d3ee` | 11.16:1 (pass) |
| Dark, hover (`primary/90` over `#020617`, about `#1fbfd9`) | `#020617` | `#1fbfd9` | 9.14:1 (pass) |

**Status:** fixed. The UI-SPEC copy-control colour deviation from iteration 1 (UI-2) still needs UAT sign-off, but the contrast defect itself is closed. Untouched: the existing `ConfigTool.tsx` filled button stays at the site-wide 3.68:1 precedent, which is out of scope here.

### IN-09: The flight scan had no non-vacuity assertion on real HTML

**Files modified:** `tests/e2e-prod/password-ssr.spec.ts`
**Commit:** 0ef0b0d
**Applied fix:** The real-HTML server test now asserts `flightPayloads(html).length` is greater than 0 immediately before `flightHasAllSetsRun(html)`, so a Next change to the flight push format fails loudly instead of making the scan a silent no-op. The prod SSR spec passes against the current build.

### IN-10: Empty-result fallback rendered the "crypto" error

**Files modified:** `app/tools/password/PasswordOutput.tsx`
**Commit:** 0d74d1c
**Applied fix:** The `gen.results[0] === undefined` fallback now renders `<ErrorPanel error="unexpected" />`, matching the WR-01 mapping. The branch stays as defensive code. The state is effectively unreachable.

## Verification Results (iteration 2)

- `npx vitest run app/tools/password lib/password`: 18 files, 591 tests passed.
- `npm run typecheck`: clean.
- `npm run lint`: 0 errors, 1 pre-existing warning in `lib/mac/vendor.ts`.
- `npx playwright test tests/e2e/password*.spec.ts`: 31 passed.
- `npx playwright test -c playwright.prod.config.ts password-ssr`: 5 passed (run after the dev e2e run finished).

No dependency changes. `lib/hooks`, `lib/analytics`, `lib/password` and `app/globals.css` were not modified. REVIEW-FIX.md is not committed.

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
