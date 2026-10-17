---
phase: 09-hash-tool-page-text-hashing
plan: 09
subsystem: ui
tags: [hash, layout, cls, skeleton, playwright, release-gate]
status: complete
requires:
  - phase: 09-hash-tool-page-text-hashing
    provides: "09-01..09-08 final island, page shell, FAQ and worked example"
provides:
  - "Measured, pinned skeleton heights h-[2240px] sm:h-[1612px] in HashToolLoader.tsx"
  - "tests/e2e/hash-layout.spec.ts: skeleton-vs-island height, CLS observer at 320/375/768/1280, 320px light/dark overflow"
  - "Full phase gate evidence including the untouched production worker proof"
affects: []
actuals:
  tokens: 4000
  tasks: 2
  commits: 1
plan_head_before: 14d48a89d97389adfbbb4b94af641771982de0d2
plan_head_after: 35a6fce0053c47f7831e036be23d5efd535dfa3f
tech-stack:
  added: []
  patterns:
    - "Layout pins are read from component source by the e2e spec so a stale or guessed constant fails the gate"
key-files:
  created:
    - tests/e2e/hash-layout.spec.ts
  modified:
    - app/tools/hash/HashToolLoader.tsx
key-decisions:
  - "Skeleton heights are measured (2237.9px at 320, 1610.0px at 1280) and pinned rounded up to a multiple of 4: 2240 / 1612; no intermediate breakpoint class was needed"
requirements-completed: [TEXT-01, INT-03]
coverage:
  - id: D1
    description: "Skeleton heights pinned to measured island heights; no CLS across the swap"
    requirement: TEXT-01
    verification:
      - kind: e2e
        ref: "tests/e2e/hash-layout.spec.ts#skeleton heights match the settled island (TEXT-01, no CLS)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-layout.spec.ts#layout shift stays below 0.01 (TEXT-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No horizontal scroll at 320px in light and dark, long digests wrap"
    requirement: INT-03
    verification:
      - kind: e2e
        ref: "tests/e2e/hash-layout.spec.ts#no horizontal scroll at 320px in light (INT-03)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-layout.spec.ts#no horizontal scroll at 320px in dark (INT-03)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every animation under app/tools/hash is motion-safe"
    requirement: TEXT-01
    verification:
      - kind: command
        ref: "grep -nE '(^|[^:])animate-(pulse|spin)' app/tools/hash/*.tsx (no matches)"
        status: pass
    human_judgment: false
duration: 20 min
completed: 2026-10-15
---

# Phase 9 Plan 09: Layout and Release Gate Summary

Measured and pinned the hash tool skeleton (2240px below sm, 1612px from sm up) so the skeleton-to-island swap is within 4px of the real island, added a layout e2e spec (height match, CLS observer at four widths, 320px light/dark no-overflow with long digests wrapping), and ran the full phase gate green including the unchanged Phase 8 production worker proof.

## Measurements (Chromium, sample state, fonts loaded, dev server)

| Width | Settled island height |
|-------|----------------------|
| 320 | 2237.94px |
| 375 | 2040.75px |
| 639 | 1733.56px |
| 640 | 1757.97px |
| 768 / 1024 / 1280 | 1609.97px |

Pins: `h-[2240px] sm:h-[1612px]` (09-01 estimates were 1960 / 1600; the 320px estimate was 278px short). The skeleton doc comment records the values, widths and date. At 375px and 639px the skeleton is taller than the island by about 200px, but the CLS observer stays below 0.01 at 320, 375, 768 and 1280, so no intermediate breakpoint class was added.

## Tasks

1. Tracer: measure, pin, prove no shift. Commit 35a6fce (includes the whole spec file, including the Task 2 320px test, because the file was authored in one pass).
2. 320px light/dark overflow, motion-safe audit, full gate. The 320px test passed first run; no component fix was needed, so Task 2 produced no separate code commit.

## Full gate evidence (run sequentially)

- `npm run typecheck`: clean.
- `npm run lint`: 0 errors, 1 pre-existing warning (`lib/mac/vendor.ts` unused `MacVendorRouteResponse`, out of scope).
- `npm test`: 48 files, 676 tests passed.
- `npm run build`: succeeded; route list shows `○ /tools/hash` (static prerender).
- `npm run test:e2e` (dev): 101 passed.
- `npm run test:e2e:prod`: 7 passed (hash worker proof).
- `git diff --quiet 8b25e1a -- app/hash-smoke tests/e2e-prod playwright.prod.config.ts`: exit 0 (untouched).
- `git diff --quiet -- package.json package-lock.json`: exit 0 (no installs).
- `grep -nE "(^|[^:])animate-(pulse|spin)" app/tools/hash/*.tsx`: no matches (all animations motion-safe).

## Deviations from Plan

None - plan executed exactly as written. Note: the CLS observer test also passed against the unpinned 09-01 estimates (the swap shift happens largely below the first viewport), so the height-match test is the sensitive guard; the CLS test is the end-to-end backstop.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- tests/e2e/hash-layout.spec.ts and app/tools/hash/HashToolLoader.tsx exist; commit 35a6fce is on the branch.
