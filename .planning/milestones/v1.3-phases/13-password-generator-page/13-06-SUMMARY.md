---
phase: 13-password-generator-page
plan: 06
subsystem: testing
tags: [playwright, e2e, privacy, responsive, skeleton, release-gate, password]

requires:
  - phase: 13-password-generator-page
    provides: "13-01..13-05 island, options, batch, keyboard shortcuts and the test ids used here"
provides:
  - "Real-browser privacy sweep proving no password reaches any exit surface (POUT-03, POUT-05)"
  - "320px light/dark overflow proof for the 128-character hero and the 20 x 128 batch (UI E1/E2/E7)"
  - "Skeleton pinned to measured default-island heights (D-17)"
  - "Green SC-5 release gate: typecheck, lint, unit, build, dev e2e, prod e2e"
affects: [14-password-registration]

actuals:
  tokens: 3925
  tasks: 2
  commits: 2
plan_head_before: 285ccbe0154d94d72f3a9c740d36acba17fafa1e
plan_head_after: ed6bef540dfa0d89aa36bb8debcb856d3ba04b24
commits: 2

tech-stack:
  added: []
  patterns:
    - "Privacy e2e records every shown password and scans requests (URL and body), page.url(), history.state, local/sessionStorage, cookies, title, every attribute, field values, a11y names and the live region, raw and percent-encoded"
    - "Measured skeleton pin: throwaway Playwright one-off, never committed; numbers recorded in the loader doc comment"

key-files:
  created:
    - tests/e2e/password-privacy.spec.ts
    - tests/e2e/password-responsive.spec.ts
  modified:
    - app/tools/password/PasswordToolLoader.tsx

key-decisions:
  - "Hero block pinned as h-[124px] sm:h-[124px] (122px measured at both widths, rounded up) to follow the plan's two-breakpoint form"
  - "E1-a11y-snapshot interpreted as accessible names, descriptions, attributes and the live region (the orchestrator decision); the password stays readable as static text"

requirements-completed: [PWD-01, POUT-03, POUT-05]

coverage:
  - id: D1
    description: "No generated password appears in any request URL or body, page.url(), history.state, localStorage, sessionStorage, cookie or document.title across a session (load, Copy, Regenerate, Batch 3, Copy all, Length 32)"
    requirement: POUT-03
    verification:
      - kind: e2e
        ref: "tests/e2e/password-privacy.spec.ts#no password reaches any exit surface"
        status: pass
    human_judgment: false
  - id: D2
    description: "No attribute, input or textarea value or placeholder holds a password; no form, output, fieldset, textarea, password input or contenteditable inside password-tool; output elements are DIVs with translate=no and spellcheck=false, no aria-hidden, no form ancestor; the three text inputs carry the full autofill-guard attribute set"
    requirement: POUT-05
    verification:
      - kind: e2e
        ref: "tests/e2e/password-privacy.spec.ts#no attribute, field value or form surface holds the password"
        status: pass
    human_judgment: false
  - id: D3
    description: "ariaSnapshot of password-options and the password-status text never contain a password; no button, textbox or label is named by one; every button name is one of the fixed phrases; status is aria-live polite"
    requirement: POUT-05
    verification:
      - kind: e2e
        ref: "tests/e2e/password-privacy.spec.ts#accessible names, descriptions and the live region never carry the password"
        status: pass
    human_judgment: true
    rationale: "E1-a11y-snapshot is an interpretation of 'absent from the a11y snapshot'; the user confirms it, and real screen-reader behavior needs VoiceOver at the milestone UAT"
  - id: D4
    description: "At 320 x 800 in light and dark, the 128-character hero and the 20 x 128 batch cause no horizontal overflow, no element past the viewport, row copy buttons stay inside the viewport, the batch list is not an inner scroller, and a row 'Copied!' does not introduce overflow"
    requirement: PWD-01
    verification:
      - kind: e2e
        ref: "tests/e2e/password-responsive.spec.ts#128-character hero fits 320px / 20 x 128 batch fits 320px (light and dark)"
        status: pass
    human_judgment: true
    rationale: "Automated half only; the visual wrapping, switch centering, focus rings and Safari copy are queued as milestone UAT backstops"
  - id: D5
    description: "Skeleton pinned to the measured default island heights with the measurement line"
    verification:
      - kind: other
        ref: "node skeleton-pin gate on app/tools/password/PasswordToolLoader.tsx (exit 0)"
        status: pass
    human_judgment: false
  - id: D6
    description: "SC-5 release gate: typecheck, lint, unit, build, dev e2e and prod e2e all exit 0, in sequence"
    verification:
      - kind: other
        ref: "npm run typecheck; npm run lint; npm test; npm run build; npm run test:e2e; npm run test:e2e:prod"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-11-11
status: complete
---

# Phase 13 Plan 06: End-to-end privacy sweep, 320px proof and release gate Summary

**Real-browser specs prove no generated password reaches the network, URL, history, storage, cookies, title, any attribute, any accessible name or the live region, the 128-character hero and 20 x 128 batch fit a 320px phone in light and dark, the skeleton is pinned to the measured 980/712px default island, and the full local release gate (typecheck, lint, 1333 unit tests, build, 194 dev e2e, 17 prod e2e) is green.**

## Performance

- **Duration:** 2 min by the wall clock (`date`) between the plan-start stamp and the last command
- **Started:** 2026-11-11T22:19:46Z
- **Completed:** 2026-11-11T22:21:21Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `password-privacy.spec.ts` (3 tests): a session of load, Copy, Regenerate, Batch 3, Copy all and Length 32 records every displayed password and asserts none appears (raw or percent-encoded) in any request URL or body, `page.url()`, `history.state`, local/session storage, `document.cookie`, context cookies, title or `location`. A second test scans every attribute, input/textarea value and placeholder, forbids form-like elements inside `password-tool`, and checks the DIV/`translate="no"`/`spellcheck="false"`/no `aria-hidden`/no form ancestor contract and the full D-08 attribute set on Length, Symbol set and Batch count. A third covers `ariaSnapshot`, the live region, accessible names and the fixed button-name vocabulary at batch 1 and batch 3.
- `password-responsive.spec.ts` (4 tests, 2 schemes x 2 paths): no horizontal overflow, empty offender scan, hero buttons inside 320px, batch row copy buttons inside the viewport, the batch list not a scroller, and a clean scan after a row shows "Copied!".
- Skeleton pinned (D-17). No layout-gate spec ships; Phase 14 owns the final pin and the CLS gate.

## Skeleton Measurements (D-17)

Measured with a throwaway Playwright one-off (not committed) against the dev server on :3000, Chromium, default state, `document.fonts.ready` awaited:

| Element | 320px wide (height 900) | 1280px wide (height 900) |
|---------|------------------------|--------------------------|
| `password-tool` | 977.9px (A) | 708.4px (B) |
| `password-hero` | 122px | 122px |

Pinned: outer `h-[980px] sm:h-[712px]` (A and B rounded up to a multiple of 4), hero block `h-[124px] sm:h-[124px]`. The doc comment holds the required line "Measured (13-06, Chromium, default state, fonts loaded): 320px wide 977.9px, 1280px wide 708.4px; pinned h-[980px] sm:h-[712px]."

## Release Gate (SC-5)

Run strictly one after the other; each exit code captured directly (output redirected to a log, not piped).

| Step | Command | Exit | Summary line |
|------|---------|------|--------------|
| 1 | `npm run typecheck` | 0 | `tsc --noEmit`, no errors |
| 2 | `npm run lint` | 0 | `1 problem (0 errors, 1 warning)` (pre-existing `MacVendorRouteResponse` unused in `lib/mac/vendor.ts`) |
| 3 | `npm test` | 0 | `Test Files 74 passed (74)`, `Tests 1333 passed (1333)` |
| 4 | `npm run build` | 0 | `Compiled successfully`, 15/15 static pages, `/tools/password` is `○ (Static)` |
| 5 | `npm run test:e2e` | 0 | `194 passed (19.7s)` |
| 6 | `npm run test:e2e:prod` | 0 | `17 passed (9.5s)` |

Plan-level gates: `npx playwright test tests/e2e/password-privacy.spec.ts tests/e2e/password-responsive.spec.ts` gave 7 passed; skeleton pin gate exits 0; Phase-boundary `git diff --quiet 8b2a3b1 -- tools components app/sitemap.ts app/layout.tsx lib/hooks lib/analytics lib/password ':!lib/password/boundaries.test.ts' package.json package-lock.json` exits 0. No spec outside the password files failed, so nothing needed a cause check.

## Task Commits

1. **Task 1: privacy sweep and 320px overflow proof** - `1ea4b4e` (test)
2. **Task 2: measured skeleton pin** - `ed6bef5` (feat)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified

- `tests/e2e/password-privacy.spec.ts` - session-wide no-leak proof across every exit surface
- `tests/e2e/password-responsive.spec.ts` - 320px light/dark overflow proof for the longest hero and batch
- `app/tools/password/PasswordToolLoader.tsx` - skeleton classes and doc comment pinned to the measurements

## Decisions Made

- Both new specs passed on the first run against the finished island, so no production code changed in Task 1.
- The hero block pin repeats 124px for both breakpoints because the hero measured 122px at both widths; it keeps the plan's `h-[..] sm:h-[..]` form.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Tailwind optimizer warning on the prod build (recorded only, no config change here).** `npm run build` prints `Found 1 warning while optimizing generated CSS` with `Invalid media query` for `min-[Npx]:h-[Bpx]` and `h-[Bpx]`. Cause: Tailwind scans class-like placeholder text (such as `h-[{N}px] sm:h-[{M}px]`) in `.planning/` docs. First observed in 13-01. The build still exits 0 and no real class is affected. A later fix would be a Tailwind `@source not` exclusion for `.planning/`; deliberately not done in this plan.
- The one lint warning (`lib/mac/vendor.ts`) is pre-existing and out of scope.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or storage surface; the plan adds tests and a skeleton size only. T-13-20 and T-13-23 are covered by the sweep and the sequential release gate. T-13-21 is queued as milestone UAT. T-13-22 is accepted (clipboard history is outside the page's reach).

## Human Checks Queued (batched milestone UAT after Phase 14, backstop truths, not blocking)

1. **Password managers (D-16):** Chrome built-in manager, Safari (iCloud Keychain) and 1Password or Bitwarden. Open `/tools/password`, change Length, the sets, Symbol set and Batch count, copy and regenerate. Expect no save-password prompt, no autofill icon or fill offer in any input, nothing offered for the output.
2. **Translation (D-16):** Chrome "Translate this page" to another language. Labels translate; hero and batch passwords stay identical to what Copy writes.
3. **VoiceOver / E1-a11y-snapshot interpretation:** in Safari the password is read as static text; Copy announces "Copied" without the value; Regenerate announces "New password generated"; the value is never a button name, description or announcement. The user confirms that "absent from the a11y snapshot" means names, descriptions, attributes and the live region, not static text.
4. **320px visual backstops (E2-overflow visual, E3, E7, E8):** labels, hints, the lock hint and the shortcut line wrap cleanly; switch labels stay centered; a row's "Copied!" reflows without overflow; the 20 x 128 batch grows in-page with every row copy reachable, in light and dark.
5. **Focus ring:** every interactive control (buttons, inputs, slider, switches) shows the `ring-ring/50` focus ring when tabbed to, unclipped.
6. **Safari copy:** Copy works and shows "Copied!".

POUT-05 edge row stays "unclassified by the probe" by rule; reviewed manually, its surfaces are covered by the POUT-05 truths in 13-04 and here. Flagged for the verifier.

## Phase 14 Hand-offs

- **Final skeleton pin and CLS gate:** re-measure once the strength meter and passphrase controls exist, then add the layout-gate spec (D-17). The current 980/712 pin covers only the 13-06 default island.
- **Remove noindex** from the password page when it is registered.
- **Registry, nav, landing grid and sitemap entries** (the tool is intentionally absent from all four now).
- **`?mode=passphrase` bookmarks are currently dropped** (Pitfall 7); Phase 14 introduces the mode and must restore them.
- **Relax the barrel-only import rule** in `lib/password/boundaries.test.ts` for the word-list loader (lazy-loaded wordlist module).
- **Double-copy re-announcement gap:** carried over from the plan's hand-off list (a repeated copy may not re-announce through the live region); not exercised or changed here, Phase 14 should review it.
- **Honest clipboard-history FAQ wording** (PREG-02): the page cannot clear OS or extension clipboard histories; auto-clear was rejected (Pitfall 6).

## Next Phase Readiness

Phase 13 plans are all complete; the phase is ready for verification and Phase 14 (registration, strength meter, passphrase mode).

## Self-Check: PASSED

- Files exist: `tests/e2e/password-privacy.spec.ts`, `tests/e2e/password-responsive.spec.ts`, `app/tools/password/PasswordToolLoader.tsx`.
- Commits `1ea4b4e` and `ed6bef5` are ancestors of HEAD; `git rev-list --count 285ccbe..HEAD` measured 2.

---
*Phase: 13-password-generator-page*
*Completed: 2026-11-11*
