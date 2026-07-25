---
phase: 4
slug: dns-lookup
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (`environment: jsdom`) for `lib/dns/` unit tests + component tests; Playwright 1.61.1 for e2e |
| **Config file** | `vitest.config.ts` (existing, unchanged), `playwright.config.ts` (existing, unchanged) |
| **Quick run command** | `npx vitest run lib/dns` |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | ~30 seconds (unit) / ~2 minutes (full incl. e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/dns` (and `app/tools/dns` once component tests exist)
- **After every plan wave:** Run `npm test && npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | QUAL-08 (input validation) | — | Bounded per-label/total-length regex, no ReDoS | unit | `npx vitest run lib/dns/validate.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | DNS-06 | — | N/A | unit | `npx vitest run lib/dns/query.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 0 | DNS-08/DNS-09 | — | Fallback fires only on genuine primary failure, never on legitimate NXDOMAIN/empty-NOERROR | unit | `npx vitest run lib/dns/resolve.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 0 | DNS-06/DNS-07 | — | JSX-only rendering of record values (no `dangerouslySetInnerHTML`) — TXT records are attacker-influenced free text | unit | `npx vitest run lib/dns/parse.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | DNS-01/DNS-02/DNS-03/DNS-05/QUAL-08 | — | N/A | component | `npx vitest run app/tools/dns/DnsTool.test.tsx` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | DNS-04/DNS-10 | — | N/A | e2e | `npx playwright test tests/e2e/dns-lookup.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs/plan/wave are draft estimates from research — reconciled against actual PLAN.md files by `/gsd-validate-phase`.*

---

## Wave 0 Requirements

- [ ] `lib/dns/validate.test.ts` — domain-syntax validation (invalid-input state trigger), bounded regex + 253-char ceiling
- [ ] `lib/dns/query.test.ts` — single-resolver query construction and response typing
- [ ] `lib/dns/resolve.test.ts` — fallback-trigger logic (highest-risk module: fallback must fire ONLY on genuine failure, never on NXDOMAIN/empty-NOERROR) — needs mockable `fetch` (`vi.stubGlobal("fetch", ...)`, no MSW currently in devDependencies)
- [ ] `lib/dns/parse.test.ts` — TXT-quote-stripping, trailing-dot normalization, CNAME-filtered-from-A-query behavior (live-verified real-world quirks)
- [ ] `app/tools/dns/DnsTool.test.tsx` — component-level test for the 5 QUAL-08 error states + loading dim/skeleton states (D-07/D-08)
- [ ] `tests/e2e/dns-lookup.spec.ts` — new e2e file; mocks both `cloudflare-dns.com` and `dns.google` via `page.route()` (mirrors `tests/e2e/ip-widget.spec.ts`'s pattern); needs a delayed/out-of-order-response test double to verify DNS-04's race-safety claim end-to-end

No new framework install needed — Vitest/Playwright already fully configured from Phase 1.

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
