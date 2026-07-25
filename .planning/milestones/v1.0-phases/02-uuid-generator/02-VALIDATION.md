---
phase: 2
slug: uuid-generator
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-23
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (unit/property) + `@fast-check/vitest` 0.4.1 + Playwright 1.61.1 (e2e) — all already installed, versions confirmed live against `package.json` |
| **Config file** | `vitest.config.ts` (jsdom, `include: ["**/*.test.{ts,tsx}"]`, excludes `tests/e2e/**`); `playwright.config.ts` (`testDir: ./tests/e2e`, `baseURL: http://localhost:3000`) |
| **Quick run command** | `npx vitest run lib/uuid` |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | ~15 seconds (unit) / ~60 seconds (full incl. e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/uuid`
- **After every plan wave:** Run `npm test && npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Task ID / Plan / Wave columns are populated once `/gsd-plan-phase` generates PLAN.md task IDs. Interim mapping below is keyed on requirement ID (from RESEARCH.md's Phase Requirements → Test Map) until planning completes.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | UUID-01 | — | v4 UUID displayed on load, no input, no hydration flicker | e2e | `npx playwright test tests/e2e/uuid.spec.ts -g "loads a v4"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UUID-02 | — | Switch to v7 regenerates fresh v7 value(s) | unit + e2e | `npx vitest run lib/uuid/generate.test.ts` / e2e | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UUID-03 | — | Regenerate single / batch 1–100 | unit (property) | `npx vitest run lib/uuid/generate.test.ts -t "batch"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UUID-04 | — | Case + hyphen toggles reformat in place (byte-identical round-trip) | unit (property, fast-check) | `npx vitest run lib/uuid/format.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UUID-05 | — | Export as text/CSV/JSON | unit | `npx vitest run lib/uuid/export.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UUID-06 | — | Copy single/all, download, visible confirmation | e2e | `npx playwright test tests/e2e/uuid.spec.ts -g "copy"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | QUAL-01 | — | Unique title/description/canonical/OG | unit (metadata assertion) or e2e (`<head>` inspection) | `npx playwright test tests/e2e/uuid.spec.ts -g "metadata"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | QUAL-02 | — | Worked example + FAQ content present | e2e (content assertion) | `npx playwright test tests/e2e/uuid.spec.ts -g "faq"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/uuid/generate.test.ts` — covers UUID-01, UUID-02, UUID-03 (fast-check property tests: batch-count boundaries 0/1/100/101, version switch produces structurally distinct output, byte-length/format invariants)
- [ ] `lib/uuid/format.test.ts` — covers UUID-04 (property test: `format(format(x, A), B)` composition and round-trip identity)
- [ ] `lib/uuid/export.test.ts` — covers UUID-05 (snapshot-style: given a fixed input array, exact text/CSV/JSON output)
- [ ] `tests/e2e/uuid.spec.ts` — covers UUID-01, UUID-06, QUAL-01, QUAL-02 (new file — no existing e2e spec touches `/tools/uuid`)
- [ ] No new framework install needed — all four test tools already present in `package.json`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero UUID value wraps (never clips) at ≤320px viewport, hyphens on and off | UUID-01/UUID-04 | Visual backstop from UI-SPEC (`## UI Considerations`, long-text row) — no automated visual-regression tooling configured this phase | Resize browser/devtools to 320px width; toggle hyphens on/off; confirm the 36/32-char value wraps or shrinks, never clips or causes horizontal scroll |
| Batch list (100 rows) scrolls within `max-h-96` without page-level layout shift, rows wrap at ≤320px | UUID-03/UUID-06 | Visual backstop from UI-SPEC (`## UI Considerations`, overflow + long-text rows) — no automated visual-regression tooling configured this phase | Set batch count to 100 at 320px width; confirm the list scrolls internally (no page CLS) and each row wraps rather than clipping |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
