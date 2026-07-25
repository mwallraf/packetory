---
phase: 5
slug: mac-address-inspector
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-25
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (unit/component, jsdom) + Playwright 1.61.1 (e2e), both already configured |
| **Config file** | `vitest.config.ts` (existing, unchanged), `playwright.config.ts` (existing, unchanged) |
| **Quick run command** | `npm run test -- lib/mac` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~30 seconds (unit) / ~2 minutes (full incl. e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- lib/mac` (and `app/tools/mac` / `app/api/mac-vendor` once those tests exist)
- **After every plan wave:** Run `npm run test && npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | MAC-01 | — | Strip+length-check input parsing, no backtracking-capable regex | unit | `vitest run lib/mac/parse.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 0 | MAC-02 | — | N/A | unit | `vitest run lib/mac/format.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 0 | MAC-04/MAC-05/MAC-06 | — | U/L and I/G bit classification against known test vectors (`02:00:00:..`, `01:00:5E:..`, `FF:FF:FF:..`) | unit | `vitest run lib/mac/classify.test.ts` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 0 | MAC-03 | V5/V13 | Server-side `/^[0-9A-Fa-f]{6}$/` re-validation of `oui` before use; only the 6-hex OUI ever crosses the browser→server boundary (never the full MAC) | unit (route) | `vitest run app/api/mac-vendor/route.test.ts` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | MAC-07/MAC-08/MAC-09 | — | Exact hedge wording for locally-administered MACs; classification badges render even when vendor fetch fails | component | `vitest run app/tools/mac/MacTool.test.tsx` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | MAC-08/MAC-09 | — | Vendor-unavailable state still shows full classification; copy confirmations for each field + full result | e2e | `playwright test tests/e2e/mac-lookup.spec.ts` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | MAC-10 | — | Full MAC never sent to analytics; `mac`/`oui` never added to `DEFAULT_ALLOW_LIST` | unit (regression guard) | `vitest run lib/analytics/redact.test.ts` | Partial — file exists, assertion is new | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs/plan/wave are draft estimates from research — reconciled against actual PLAN.md files by `/gsd-validate-phase`.*

---

## Wave 0 Requirements

- [ ] `lib/mac/parse.test.ts` — live-typing normalization across colon/dash/dot/none separator formats (MAC-01)
- [ ] `lib/mac/format.test.ts` — all 4 formatted variants produced correctly (MAC-02)
- [ ] `lib/mac/classify.test.ts` — U/L, I/G, and randomization-flag bit math against known test vectors (MAC-04/05/06)
- [ ] `app/api/mac-vendor/route.test.ts` — **first Route Handler unit test in the codebase** (`app/api/ip/route.ts` currently has none). Pattern: import the exported `GET` directly, invoke with a constructed `NextRequest` (e.g. `new NextRequest("http://localhost/api/mac-vendor?oui=3C22FB")`), mock global `fetch` (`vi.stubGlobal("fetch", ...)`), assert on the returned `NextResponse`'s `.status`/`await .json()`
- [ ] `app/tools/mac/MacTool.test.tsx` — component-level coverage for MAC-07/08/09 (hedge wording, vendor-failure resilience, copy confirmations)
- [ ] `tests/e2e/mac-lookup.spec.ts` — new e2e file; mocks `/api/mac-vendor` via `page.route()` (mirrors `tests/e2e/ip-widget.spec.ts`'s pattern) for both success and failure/unavailable scenarios
- [ ] Extend existing `lib/analytics/redact.test.ts` with a regression assertion that `DEFAULT_ALLOW_LIST` does not include `mac`/`oui`

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
