---
phase: "11"
slug: "subnet-calculator-compaction"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Reconstructed after execution (State B): no VALIDATION.md was seeded because the user skipped research for this layout-only phase.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (@playwright/test, Chromium) + Vitest |
| **Config file** | `playwright.config.ts`, `playwright.prod.config.ts`, `vitest.config.*` |
| **Quick run command** | `npx playwright test tests/e2e/subnet-layout.spec.ts` |
| **Full suite command** | `npm run typecheck && npm run lint && npm run test && npm run build && npm run test:e2e && npm run test:e2e:prod` |
| **Estimated runtime** | ~60 seconds quick, ~5 minutes full |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/e2e/subnet-layout.spec.ts tests/e2e/subnet.spec.ts tests/e2e/subnet-seo.spec.ts`
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | SUBNET-08 | — | N/A | e2e | `npx playwright test tests/e2e/subnet-layout.spec.ts -g "IPv4 /24 default"` | ✅ | ✅ green |
| 11-01-02 | 01 | 1 | SUBNET-09 | — | N/A | e2e | `npx playwright test tests/e2e/subnet-layout.spec.ts -g "IPv6"` | ✅ | ✅ green |
| 11-01-02 | 01 | 1 | SUBNET-10 | T-11-01..05 | Fields, copy controls and testids preserved; no overflow at 320/375 | e2e | `npx playwright test tests/e2e/subnet-layout.spec.ts tests/e2e/about.spec.ts -g "subnet\|SUBNET-10\|untruncated\|copy"` | ✅ | ✅ green |
| 11-01-03 | 01 | 1 | SUBNET-10 | T-11-SC | Skeleton pins within 4px; no dependency change | e2e + git | `npx playwright test tests/e2e/subnet-layout.spec.ts -g "skeleton" && git diff --quiet 8a94a0f -- package.json package-lock.json lib/subnet` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Lighthouse baseline (production vs Phase 11 preview, mobile + desktop) | ROADMAP Phase 11 research flag | Needs a pushed branch + authenticated Vercel preview; deferred to milestone UAT by user decision | Follow "Human capture steps" in 11-01-SUMMARY.md |
| CLS re-measure at 375x800 and 1280x800 | CLAUDE.md "no avoidable CLS" | Reported, not gated (D-18) | Compare against Phase 10 baseline 0.167 / 0.029 |
| Real 1366x768 laptop look, light and dark | SUBNET-08 | Visual judgement | Open /tools/subnet on a laptop; whole result visible without scrolling |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-11
