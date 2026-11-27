---
phase: 16-text-diff-workspace-release
plan: "01"
subsystem: ui
tags: [text-diff, browser-worker, react, accessibility]
requires:
  - phase: 15-text-comparison-engine
    provides: Typed comparison worker and cancellable browser client
provides:
  - Public Text Diff workspace and production worker round trip
  - Race-safe reset, keyboard submission, and editable example
affects: [16-02, 16-03]
tech-stack:
  added: []
  patterns: [static route with browser workspace, request generation guard]
key-files:
  created:
    - app/tools/diff/page.tsx
    - app/tools/diff/TextDiffWorkspace.tsx
    - app/tools/diff/TextDiffResults.tsx
    - app/tools/diff/example.ts
    - app/tools/diff/TextDiffWorkspace.test.tsx
    - tests/e2e-prod/text-diff.spec.ts
  modified: []
key-decisions:
  - Move focus to Original when loading the example because the example button disappears.
requirements-completed: [WORK-01, WORK-02, WORK-03, WORK-04, VIEW-02]
actuals:
  tokens: 4968
  tasks: 3
  commits: 6
commits: 6
plan_head_before: 07dc8a1d9885eef7e983c8868b395cf8378dc882
plan_head_after: fef568dc13470d8c1281f7f29da7860d66878889
duration: 4min
completed: 2026-11-27
status: complete
---

# Phase 16 Plan 01 — Text Diff workspace

The public route compares two raw snippets in a real browser worker and displays exact edits. A request generation guard discards late results after edits, reset, and unmount.

## Accomplishments

- Added the static `/tools/diff` route with editable Original and Modified fields. The workspace trims only for the validity check and starts the worker only when a valid pair is submitted.
- Compare uses the same path from the form button, Control+Enter, or Command+Enter. Clear all cancels work, removes results and status, and returns focus to Original.
- Try an example fills both editors and compares a one-digit IP change and one added line. The live status announces work, errors, identical snippets, change counts, and stale results.
- Results render comparison text literally. The next plan adds responsive review, folding, and rendering limits.

## Verification

| Check | Result |
|---|---|
| `npx vitest run app/tools/diff/TextDiffWorkspace.test.tsx` | 6 passed |
| `npx playwright test -c playwright.prod.config.ts tests/e2e-prod/text-diff.spec.ts` | 2 passed in production Chromium |
| `npx tsc --noEmit` | Passed |
| `npx eslint app/tools/diff tests/e2e-prod/text-diff.spec.ts` | Passed |

The production build reported the same CSS optimization warning on the RED and GREEN builds. The public tracer observed a worker served from the production bundle and asserted the exact removed and added digits.

## TDD Gate Compliance

GSD validated all three RED reports as `RED_EVIDENCE_OK`. The first test reached the production server and received 404 for the missing workspace route. The stale-result test showed that an edit retained the old summary. The example test found the action absent in the empty workspace. Each assertion passed after its implementation, and the production tracer was rerun before expansion.

| Task | RED | GREEN |
|---|---|---|
| Public worker tracer | `af5efe1` | `52ce18d` |
| Workspace lifecycle | `cfb8c0c` | `e9db599` |
| Editable example | `9c64d3b` | `fef568d` |

## Self-Check: PASSED

All six implementation and test files exist, and the six listed task commits are in the current branch history.
