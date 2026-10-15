---
phase: "09"
slug: "hash-tool-page-text-hashing"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-15"
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + fast-check 4.9.0 / @fast-check/vitest 0.4.1 + Testing Library 16.3.2 (jsdom); Playwright 1.61.1 |
| **Config file** | `vitest.config.ts`; `playwright.config.ts` (dev :3000); `playwright.prod.config.ts` (build+start :3101, `tests/e2e-prod`) |
| **Quick run command** | `npx vitest run lib/hash app/tools/hash` |
| **Full suite command** | `npm run typecheck && npm run lint && npm test && npx playwright test && npm run test:e2e:prod` |
| **Estimated runtime** | ~5 seconds quick; several minutes full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/hash app/tools/hash`
- **After every plan wave:** Run `npm run typecheck && npm run lint && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green, `npm run build` succeeds, `test:e2e:prod` still green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

Requirement → test map (task IDs filled in by the planner/executor):

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| TEXT-01 | sample constants == engine == node oracle; 10 rows on mount, zero worker calls; no CLS | unit + RTL + e2e | `npx vitest run lib/hash/sample.test.ts app/tools/hash/HashTool.test.tsx` | ❌ W0 | ⬜ pending |
| TEXT-02 | out-of-order results never overwrite newer; `cancelled` ignored; StrictMode remount | RTL | `npx vitest run app/tools/hash/HashTool.test.tsx` | ❌ W0 | ⬜ pending |
| TEXT-03 | UTF-8 byte count, newline/CRLF hint, soft-cap warning | RTL | `npx vitest run app/tools/hash/HashTool.test.tsx` | ❌ W0 | ⬜ pending |
| TEXT-04 | `?text=` restore; URL never changes while typing; Copy link capped; redact strips `text` | RTL + unit + e2e | `npx vitest run app/tools/hash lib/analytics/redact.test.ts` | ❌ W0 | ⬜ pending |
| OUT-01 | per-row copy + visible confirmation | RTL | `npx vitest run app/tools/hash/HashTool.test.tsx` | ❌ W0 | ⬜ pending |
| OUT-02 | labeled list / `sha256sum` lines exact | unit | `npx vitest run lib/hash/export.test.ts` | ❌ W0 | ⬜ pending |
| OUT-03 | hex/HEX/Base64 formatting, CRC32 stays hex, no re-hash | unit + fast-check + RTL | `npx vitest run lib/hash/format.test.ts` | ✅ extend | ⬜ pending |
| OUT-04 | expected-checksum normalization + match/no-match | unit + RTL | `npx vitest run lib/hash/verify.test.ts` | ❌ W0 | ⬜ pending |
| OUT-05 | MD5/SHA-1/CRC32 inline not-for-security label | RTL | `npx vitest run app/tools/hash/HashTool.test.tsx` | ❌ W0 | ⬜ pending |
| INT-01 | `/` focus, Esc cancel+restore, copy shortcut, Enter unbound | RTL + e2e | `npx playwright test tests/e2e/hash.spec.ts` | ❌ W0 | ⬜ pending |
| INT-03 | 320px no horizontal scroll, light+dark | e2e | `npx playwright test tests/e2e/hash.spec.ts` | ❌ W0 | ⬜ pending |
| INTG-01 | registry/sitemap/nav/grid counts + Hash icon | unit + e2e | `npx vitest run tools app/sitemap.test.ts components` | ✅ update | ⬜ pending |
| INTG-02 | metadata, worked example, FAQ + matching JSON-LD | e2e + unit | `npx playwright test tests/e2e/hash-seo.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/hash/sample.ts` + `sample.test.ts` — TEXT-01 pin
- [ ] `lib/hash/verify.ts` + `verify.test.ts`; `lib/hash/export.ts` + `export.test.ts`; `format.ts`/`format.test.ts` extensions
- [ ] `components/ui/textarea.tsx`
- [ ] `app/tools/hash/HashTool.test.tsx` (mocked `@/lib/hash/client` with deferred promises; `navigator.clipboard` stub)
- [ ] `tests/e2e/hash.spec.ts`, `tests/e2e/hash-seo.spec.ts`
- [ ] Update the four hard-coded-count tests + `redact.test.ts` case

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual polish of dark mode and stale-digest dimming | INT-03 / TEXT-02 | Subjective visual quality | Open `/tools/hash` at 320px and desktop in both themes; type quickly and confirm dimming is legible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
