---
phase: 14-passphrase-strength-launch
plan: 08
subsystem: testing
tags: [cls, skeleton, playwright, release-gate, lighthouse, first-load-js]
status: complete

requires:
  - phase: 14-passphrase-strength-launch
    provides: "14-01..14-07 finished island, About area, registry and nav"
provides:
  - "Final measured skeleton pin (mode row, hero, strength blocks) in PasswordToolLoader.tsx"
  - "Word-list loading block and error min-height pinned to the measured 6-word passphrase hero"
  - "password-layout.spec.ts: skeleton-equals-island, CLS, bookmark, mode-toggle, mode-row and reduced-motion gates"
  - "Green sequential local release gate and recorded first-load JS and Lighthouse advisory figures"
affects: []

actuals:
  tokens: 4500
  tasks: 2
  commits: 1
plan_head_before: 0d4fba2cf473ff5e03976d832c310b51041af4bc
plan_head_after: 4a9917049061c4e9d5713af652de6c5207966c29
commits: 1

tech-stack:
  added: []
  patterns:
    - "Skeleton pin read from the loader source, anchored on the password-skeleton element, compared to the settled island within 1px"

key-files:
  created:
    - tests/e2e/password-layout.spec.ts
  modified:
    - app/tools/password/PasswordToolLoader.tsx
    - app/tools/password/PasswordOutput.tsx

key-decisions:
  - "Hero skeleton block pinned to the measured 122px (single class), not the 13-06 124px, which also closes 13-REVIEW IN-03"
  - "CLS bound for default load held at 0.001 (no relaxation needed; 5 repeats green)"
  - "Strength-panel skeleton block is static (no pulse) so only the hero pulses"

patterns-established:
  - "Measured doc line: Measured (14-08, Chromium, default state, fonts loaded) with fractional heights, pinned to Math.round"

duration: 40min
completed: 2026-11-12
---

# Phase 14 Plan 08: Final skeleton pin, layout gates and release gate Summary

**The password page's skeleton now reserves exactly the settled default island (1374px at 320px wide, 960px at 1280px), CLS is gated on default load, a passphrase bookmark and mode toggling, and typecheck, lint, 1440 unit tests, the build, 246 dev e2e tests and 22 prod e2e tests all pass in sequence.**

## Measurements (Chromium, fonts loaded, scratchpad one-off, not committed)

| Item | 320px wide | 1280px wide |
|------|-----------|-------------|
| password-tool (default, Password mode, batch 1) | 1374.3px | 960.3px |
| Mode row | 44px | 44px |
| Hero (default) | 122px | 122px |
| Strength panel | 348.0px | 224.8px |
| Options panel | 796.3px | 505.6px |
| Passphrase hero, 6 words (200 Enter presses, most frequent) | 178px (197 of 200; 150px x3) | 122px (199 of 200; 150px x1) |
| Passphrase island height (informational) | 1270.7px | 956.8px |

Pins: skeleton root `h-[1374px] sm:h-[960px]` (Math.round of 1374.3 and 960.3); hero block `h-[122px]` (one class, duplicate sm class removed); strength block `h-[348px] sm:h-[225px]`; mode-row block `h-11 w-56`. `password-wordlist-loading` height and `password-wordlist-error` min-height: `178px` base, `122px` sm.

## What was built

- Task 1 (4a99170): `PasswordToolLoader.tsx` skeleton rebuilt (text-free, aria-hidden, a `gap-4` group of mode-row, hero and strength blocks inside a fixed-height `gap-8` root) with the "Measured (14-08 ...)" doc line; `PasswordOutput.tsx` loading block and error panel min-height pinned to the passphrase hero; new `tests/e2e/password-layout.spec.ts` (describe "Password layout (PREG-03, D-16, D-17)", 9 test cases): skeleton equals island within 1px and CLS at most 0.001 at 320 and 1280; `?mode=passphrase` bookmark CLS below 0.1 at 320 and 1280; server HTML skeleton carries the 44px mode row; the output zone top never moves across Password, Passphrase, Password toggles (0.5px); the mode row is one line at 320px; every `animate-pulse` string also carries `motion-reduce:animate-none`.
- Task 2: release gate, first-load figures, Lighthouse advisory and human-check queue (this file; no code change).

`npx playwright test tests/e2e/password-layout.spec.ts --repeat-each=5`: `45 passed (5.3s)`. The default CLS bound of 0.001 never flaked, so the Pattern 5 relax rule was not applied.

## Release gate (SC-5), strictly sequential, real exit codes

| Step | Exit | Summary line |
|------|------|--------------|
| Phase-boundary `git diff --quiet ec3f160 -- lib/password (except boundaries.test.ts) lib/hooks lib/analytics package.json package-lock.json` | 0 | no differences |
| `npm run typecheck` | 0 | `tsc --noEmit` clean |
| `npm run lint` | 0 | `1 problem (0 errors, 1 warning)`; the warning is the pre-existing unused `MacVendorRouteResponse` in an unrelated file |
| `npm test` | 0 | `Test Files  79 passed (79)`, `Tests  1440 passed (1440)` |
| `npm run build` | 0 | `Generating static pages (15/15)`; `/tools/password` static |
| `npm run test:e2e` | 0 | `246 passed (25.5s)` |
| `npm run test:e2e:prod` | 0 | `22 passed (11.7s)` |

No spec outside the password files failed.

## First-load JS (D-19 automated proxy, not a gate)

Production build under `next start -p 3102`, script `responseBodySize` summed over `requestfinished` script requests until network idle:

| Page | Scripts | Bytes on the wire | EFF word-list marker in initial scripts |
|------|---------|-------------------|------------------------------------------|
| /tools/password | 19 | 221,799 | absent |
| /tools/uuid | 19 | 218,546 | absent |
| /tools/hash | 18 | 216,709 | absent |
| /tools/subnet | 18 | 208,878 | absent |

/tools/password is 3.2 KB (1.5%) heavier than /tools/uuid; the 62,303-character EFF list chunk loads only on first Passphrase use (also proven by `password-wordlist.spec.ts`).

## Local Lighthouse advisory (local advisory, not the PREG-03 capture)

`npm view lighthouse@13.6.0 repository.url` returned `git+https://github.com/GoogleChrome/lighthouse.git`, so the one-off `npx --yes lighthouse@13.6.0` ran from the scratchpad against `next start -p 3102` with the Playwright Chromium; package.json untouched (boundary gate exit 0). Scores (Performance / Accessibility / Best Practices / SEO), CLS 0 everywhere:

| Page | Mobile | Desktop |
|------|--------|---------|
| /tools/password | 100 / 96 / 96 / 100 | 100 / 96 / 96 / 100 |
| /tools/subnet | 100 / 96 / 96 / 100 | 100 / 96 / 96 / 100 |

The two sub-100 scores are a site-wide footer `color-contrast` (4.34:1 muted text on the footer background) and a local-only 404 for the Vercel Analytics script. Both logged in `deferred-items.md`; neither is Phase 14 work. The 3102 server was stopped by its PID; the :3000 dev server was left running.

## Human Checks Queued (batched milestone UAT, backstop truths, not blocking)

1. **PREG-02 wording (14-02):** the privacy and clipboard FAQ wording, the "Runs locally in your browser" description and the intro; confirm they are honest (no claim the page can clear OS or extension clipboard history; Q2 reword from 14-05).
2. **PHR-04 EFF attribution:** CC BY wording in `eff-large.ts`, the About block and the credit line.
3. **PREG-03 Lighthouse 90+ on a Vercel preview** for /tools/password and /tools/subnet, mobile and desktop, all four categories, recorded next to the deferred Phase 11 before/after capture. Local advisory above is already 96 or higher everywhere.
4. **Password managers, translation, VoiceOver in both modes** (Password and Passphrase), including the mode and separator toggles and the "Loading word list" announcement; the Retry-by-reload mechanism with VoiceOver (14-03 A1); and acceptance of the UI-SPEC E2-bookmark-batch row (`?mode=passphrase&n>1` content shift, only the plain `?mode=passphrase` bookmark is CLS-gated, UI E9-layout loading-to-error panel no-shift check at 320px and 1280px).
5. **Seven-link nav in Safari at 640px and 700px** (Chromium measured: slack to the theme toggle 23.4px at 640px and 53.4px at 700px; Password link 81.5px).
6. **Carried from 13-06:** password managers (no save prompt or autofill on the tool), Chrome translation leaves values identical, VoiceOver reads the password as static text and never in names or announcements, 320px visual backstops in light and dark (labels, hints, shortcut line, 20 x 128 batch), focus rings on every control, Safari Copy shows "Copied!".

13-REVIEW info items still open: IN-01, IN-02, IN-04, IN-06, IN-08 (IN-08 icon-only row confirmation needs UAT sign-off). Closed here: IN-03 (skeleton pin, redundant sm hero class removed) and IN-05 by D-20a (as scoped in the plan).

## Deviations from Plan

None - plan executed exactly as written. Two minor choices: the mode-row one-line assertion compares tops of the two toggle items and the vertical centre of the Mode label (offsetTop would differ because the row is `items-center`), plus a 44.5px row-height cap; and the server-HTML 44px mode-row check lives in the new dev layout spec as well as being covered by the existing prod SSR spec.

## Known Stubs

None.

## Threat Flags

None. T-14-25 to T-14-27 and T-14-SC mitigated as planned (sequential gate with lines quoted, dependency diff gate exit 0, layout spec, pinned lighthouse with provenance check).

## Self-Check: PASSED

- tests/e2e/password-layout.spec.ts, PasswordToolLoader.tsx, PasswordOutput.tsx: FOUND
- Commit 4a99170: FOUND
