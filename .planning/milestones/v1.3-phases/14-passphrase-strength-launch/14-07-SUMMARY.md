---
phase: 14-passphrase-strength-launch
plan: 07
subsystem: ui
tags: [registry, nav, sitemap, lucide, playwright, vitest]
status: complete

requires:
  - phase: 14-passphrase-strength-launch
    provides: "14-02 page and About area, 14-06 finished island"
provides:
  - "Password Generator registry entry (slug password, KeyRound, generate, active) feeding nav, drawer, landing grid and sitemap"
  - "KeyRound ICONS entry; nav links use px-2"
  - "All hard-coded tool counts moved to 7 (unit and e2e)"
  - "Nav fit spec at 640px and 700px with one-row, no-overflow and 8px toggle clearance assertions"
affects: [14-08]

actuals:
  tokens: 30000
  tasks: 3
  commits: 4
plan_head_before: bcd29bc4231bd797ede472ef5255d3899ce9174f
plan_head_after: 496f0a1372a7bea7b3b106e973caf5af1c64be51
commits: 4

tech-stack:
  added: []
  patterns:
    - "Registry-only registration: nav, drawer, grid and sitemap pick the tool up with no edits"

key-files:
  created: []
  modified:
    - components/ToolCard.tsx
    - components/SiteHeader.tsx
    - tools/registry.ts
    - tools/registry.test.ts
    - components/ToolCard.test.tsx
    - app/sitemap.test.ts
    - app/tools/pages-about.test.ts
    - app/tools/password/PasswordExample.tsx
    - tests/e2e/home.spec.ts
    - tests/e2e/navigation.spec.ts

key-decisions:
  - "Password sorts last (featured first, then by name), not between MAC and Subnet as CONTEXT D-10 prose said; only test expectations changed"
  - "px-2 applied unconditionally to nav links (D-11 first fallback); shortName 'Pass' fallback not needed"

requirements-completed: [PREG-01]

duration: 12min
completed: 2026-11-12
---

# Phase 14 Plan 07: Register the Password Generator Summary

Password Generator is registered (KeyRound icon, active) and appears last in the nav, drawer, landing grid and sitemap, with seven nav links fitting on one line at 640px and 700px.

## What was done

- Task 1 (bc09e12): KeyRound added to ICONS; nav-link padding 10px -> px-2.
- Task 2 (c557e47): registry entry with the UI-SPEC description; registry, ToolCard, sitemap and pages-about tests updated to 7 (password FAQ mapped in FAQ_BY_SLUG).
- Task 3 (496f0a1): home.spec expects 7 cards, Password last with the lucide-key-round icon and /tools/password href; navigation.spec drawer lists 7 links including Password; new describe "Desktop nav fits seven tools at 640px and 700px" runs at both widths.

## Measured nav fit (Chromium)

Link widths (px): Subnet 64.2, UUID 49.6, Config 60.3, DNS 45.6, Hash 50, MAC 48, Password 81.5.
Slack between the last link and the theme toggle: 23.4px at 640px, 53.4px at 700px (assertion requires at least 8px).

## Verification

- `npx vitest run`: 79 files, 1440 tests passed.
- `npm run typecheck`: clean. `npm run lint`: 0 errors, 1 pre-existing warning (lib/mac/vendor.ts unused type).
- `npm run test:e2e` (dev): 237 passed.
- `playwright.prod.config.ts about-prod password-ssr`: 12 passed.
- package.json and package-lock.json unchanged.
- Grep gates: no `six|toHaveCount(6)|< 6;` in home/navigation specs; no `toHaveLength(6)`/`size).toBe(6)` in registry/ToolCard tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Passphrase shape `<pre>` overflowed horizontally at 320px**
- **Found during:** Task 3 (full dev e2e; registering enrolled password in about.spec's 320px no-overflow check)
- **Issue:** `pre[password-worked-example-shape]` used `overflow-x-auto`; the 29-character shape is wider than the 320px content box, so the check flagged it (light and dark).
- **Fix:** replaced `overflow-x-auto` with `whitespace-pre-wrap break-words`; the shape now wraps at hyphens and textContent is unchanged.
- **Files modified:** app/tools/password/PasswordExample.tsx
- **Commit:** 838dcb8

Otherwise the plan was executed as written.

## Human checks (recorded, not blocking)

- Safari at 640px and 700px: seven nav links on one line, nothing clipped or overlapping the theme toggle; landing page shows the Password card with its key icon last (CONTEXT human check 5, UI E6-long-text). Backstop truth.

## Known Stubs

None.

## Threat Flags

None. app/layout.tsx root description remains stale (no Config or Password); left unchanged per plan.

## Self-Check: PASSED

Commits bc09e12, c557e47, 838dcb8, 496f0a1 present; modified files exist.
