---
phase: 16
slug: text-diff-workspace-release
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-26
---

# Phase 16 validation strategy

The deterministic Vitest and production Playwright checks grow with each task. The first tracer creates the public route fixture. The three waves run sequentially so their production servers never compete for port 3101.

| Task | Requirements | Evidence | Status |
|---|---|---|---|
| 16-01-01 | WORK-01, VIEW-02 | Production public route through the real worker, checking the exact IP edit | Pending |
| 16-01-02 | WORK-01, WORK-02, WORK-03 | Unit tests for input gating, shortcuts, edit, cancellation, late completion, and reset focus | Pending |
| 16-01-03 | WORK-04, VIEW-02 | Workspace and production checks for the example, identical state and live status | Pending |
| 16-02-01 | VIEW-01, VIEW-03 | Fold model tests and production responsive checks for semantic changes, overflow and keyboard focus | Pending |
| 16-02-02 | DIFF-03 | Budget boundaries, recoverable errors and representative production profiling | Pending |
| 16-02-03 | DIFF-04 | Non-vacuous production comparison with synthetic sentinels and data-exit inspection | Pending |
| 16-03-01 | VIEW-04 | Registry/sitemap tests and production home-to-worker tracer | Pending |
| 16-03-02 | VIEW-04 | Desktop and mobile navigation, metadata and production About parity | Pending |

## Phase verification

- `npx vitest run app/tools/diff lib/text-diff tools/registry.test.ts app/sitemap.test.ts components/ToolCard.test.tsx app/tools/pages-about.test.ts`
- `npx tsc --noEmit`
- `npx playwright test -c playwright.prod.config.ts tests/e2e-prod/text-diff.spec.ts tests/e2e-prod/text-diff-results.spec.ts tests/e2e-prod/text-diff-privacy.spec.ts tests/e2e-prod/text-diff-discovery.spec.ts tests/e2e-prod/about-prod.spec.ts`
- `npx playwright test tests/e2e/home.spec.ts tests/e2e/navigation.spec.ts`

## Source coverage

| Source | Coverage |
|---|---|
| Phase 16 roadmap goal and all five success criteria | 16-01 public journey and reset, 16-02 rendering, limits and privacy, 16-03 navigation |
| Requirement IDs assigned to Phase 16 | All ten are mapped individually in the task table |
| Milestone research | 16-01 local worker and lifecycle, 16-02 literal rendering, representative bounds and privacy checks, 16-03 static-first reachability |
| Approved user decisions and UI contract | 16-01 paste-first, trim-to-gate, shortcut, reset, and editable example. 16-02 responsive views, semantic colors, numbering, inline spans, and expandable context. 16-03 shared shell and page conventions. Deferred actions remain outside the phase. |
