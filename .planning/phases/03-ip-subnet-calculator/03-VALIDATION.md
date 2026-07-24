---
phase: 3
slug: ip-subnet-calculator
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (unit/property) + Playwright 1.61.1 (e2e) |
| **Config file** | `vitest.config.ts` (jsdom, globals, `**/*.test.{ts,tsx}`) / `playwright.config.ts` (`tests/e2e/`, `baseURL: http://localhost:3000`) |
| **Quick run command** | `npx vitest run lib/subnet` |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | ~30 seconds (unit) / ~2 minutes (full incl. e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/subnet` (and `app/tools/subnet` once component tests exist)
- **After every plan wave:** Run `npm test && npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | SUBNET-01 | — | N/A | unit | `npx vitest run lib/subnet/parse.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 0 | SUBNET-04 | — | N/A | unit + property | `npx vitest run lib/subnet/ipv4.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 0 | SUBNET-05 | — | N/A | unit + property | `npx vitest run lib/subnet/ipv6.test.ts lib/subnet/subdivide.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 0 | SUBNET-04/05 | — | N/A | unit | `npx vitest run lib/subnet/format.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 0 | SUBNET-04/05 | — | N/A | unit | `npx vitest run lib/subnet/reverse-dns.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | SUBNET-02/03/06 | — | N/A | component | `npx vitest run app/tools/subnet` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | SUBNET-07 | — | N/A | e2e | `npx playwright test tests/e2e/subnet.spec.ts -g "bookmark"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/subnet/parse.test.ts` — covers SUBNET-01
- [ ] `lib/subnet/ipv4.test.ts` (+ fast-check property tests over prefix 0–32) — covers SUBNET-04
- [ ] `lib/subnet/ipv6.test.ts` (+ fast-check property tests over prefix 0–128) — covers SUBNET-05
- [ ] `lib/subnet/format.test.ts` — RFC-5952 compression/expansion round-trips
- [ ] `lib/subnet/reverse-dns.test.ts` — covers reverse-DNS field for both families
- [ ] `lib/subnet/subdivide.test.ts` — covers SUBNET-05 subdivision option generation
- [ ] `app/tools/subnet/SubnetTool.test.tsx` (Testing Library) — covers SUBNET-02, SUBNET-03, SUBNET-06
- [ ] `tests/e2e/subnet.spec.ts` (Playwright) — covers SUBNET-07 bookmark round-trip (load a URL with `?cidr=...` in a fresh context, assert the rendered result matches)

No new framework install needed — all test infrastructure already exists from Phase 1/2.

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
