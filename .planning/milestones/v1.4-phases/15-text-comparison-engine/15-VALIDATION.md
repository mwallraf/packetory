---
phase: 15
slug: text-comparison-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
---

# Phase 15 validation strategy

| Task | Requirement | Evidence | Status |
|---|---|---|---|
| 15-01-01 | DIFF-02 | Focused Vitest fixtures and production browser worker round trip with an inline IP edit | Pending |
| 15-01-02 | DIFF-01, DIFF-02 | Focused Vitest reconstruction, whitespace, ordering, budget, cancellation and retry fixtures | Pending |
| 15-01-03 | DIFF-01, DIFF-02 | TypeScript and gated production worker smoke | Pending |

Run `npx vitest run lib/text-diff` after each engine or worker change and `npx tsc --noEmit` before phase verification. Task 1 supplies the initial fixtures and production smoke. Tasks 1 and 3 run `npx playwright test -c playwright.prod.config.ts tests/e2e-prod/text-diff-worker.spec.ts`. The smoke must see a real worker start and verify its returned inline edit. Task 3 records the production outcome. The Phase 16 browser tests cover the public UI and rendering limits.
