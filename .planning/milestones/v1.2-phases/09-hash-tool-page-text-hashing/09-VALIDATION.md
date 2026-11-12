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
| TEXT-01 | sample constants == engine == node oracle; 10 rows on mount, zero worker calls; no CLS (09-01 T1-T2, 09-09 T1) | unit + RTL + e2e | `npx vitest run lib/hash/sample.test.ts app/tools/hash/HashTool.test.tsx`; `npx playwright test tests/e2e/hash.spec.ts tests/e2e/hash-layout.spec.ts` | ❌ W0 | ⬜ pending |
| TEXT-02 | out-of-order results never overwrite newer; `cancelled` ignored; StrictMode remount; client never rejects/hangs (09-01 T2, 09-02 T1) | RTL + unit | `npx vitest run app/tools/hash/HashTool.test.tsx lib/hash/client.test.ts` | ❌ W0 | ⬜ pending |
| TEXT-03 | UTF-8 byte count, newline/CRLF hint, soft-cap warning + debounce (09-01 T3) | RTL + e2e | `npx vitest run app/tools/hash/HashTool.test.tsx`; `npx playwright test tests/e2e/hash.spec.ts` | ❌ W0 | ⬜ pending |
| TEXT-04 | `?text=` restore; URL never changes while typing; Copy link capped; redact strips `text` (09-06 T1-T3) | RTL + unit + e2e | `npx vitest run app/tools/hash/HashTool.url.test.tsx lib/hash/share-link.test.ts lib/analytics/redact.test.ts`; `npx playwright test tests/e2e/hash-url.spec.ts` | ❌ W0 | ⬜ pending |
| OUT-01 | per-row copy + visible confirmation (09-04 T1, T3) | RTL + e2e | `npx vitest run app/tools/hash/HashTool.output.test.tsx`; `npx playwright test tests/e2e/hash-output.spec.ts` | ❌ W0 | ⬜ pending |
| OUT-02 | labeled list / `sha256sum` lines exact (09-04 T2-T3) | unit + RTL | `npx vitest run lib/hash/export.test.ts app/tools/hash/HashTool.output.test.tsx` | ❌ W0 | ⬜ pending |
| OUT-03 | hex/HEX/Base64 formatting, CRC32 stays hex, no re-hash (09-04 T1-T3) | unit + fast-check + RTL | `npx vitest run lib/hash/format.test.ts app/tools/hash/HashTool.output.test.tsx` | ✅ extend | ⬜ pending |
| OUT-04 | expected-checksum normalization + match/no-match (09-05 T1-T2) | unit + RTL + e2e | `npx vitest run lib/hash/verify.test.ts app/tools/hash/HashTool.verify.test.tsx`; `npx playwright test tests/e2e/hash-verify.spec.ts` | ❌ W0 | ⬜ pending |
| OUT-05 | MD5/SHA-1/CRC32 inline not-for-security label (09-04 T3) | RTL | `npx vitest run app/tools/hash/HashTool.output.test.tsx` | ❌ W0 | ⬜ pending |
| INT-01 | `/` focus, Esc cancel+restore, copy shortcut, Enter unbound; Shift/Alt chords never copy (hook + SubnetTool consumer regression) (09-07 T1-T2) | RTL + e2e | `npx vitest run app/tools/hash/HashTool.keyboard.test.tsx lib/hooks/useKeyboardShortcut.test.ts app/tools/subnet/SubnetTool.test.tsx`; `npx playwright test tests/e2e/hash-keyboard.spec.ts` | ❌ W0 | ⬜ pending |
| INT-03 | 320px no horizontal scroll, light+dark; long digests wrap; motion-safe; full phase gate (09-09 T2) | e2e | `npx playwright test tests/e2e/hash-layout.spec.ts` | ❌ W0 | ⬜ pending |
| INTG-01 | registry/sitemap/nav/grid counts + Hash icon + 640px nav fit + registry-description D-27 guard (09-03 T1-T2) | unit + e2e | `npx vitest run tools app/sitemap.test.ts components/ToolCard.test.tsx`; `npx playwright test tests/e2e/home.spec.ts tests/e2e/navigation.spec.ts` | ✅ update | ⬜ pending |
| INTG-02 | FAQ + matching JSON-LD, exact D-27 "where" answer (09-08 T1); metadata, canonical, worked example (09-08 T2) | e2e + unit | `npx vitest run app/tools/hash/faq-data.test.ts`; `npx playwright test tests/e2e/hash-seo.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/hash/sample.ts` + `sample.test.ts` — TEXT-01 pin
- [ ] `lib/hash/verify.ts` + `verify.test.ts`; `lib/hash/export.ts` + `export.test.ts`; `format.ts`/`format.test.ts` extensions
- [ ] `components/ui/textarea.tsx`
- [ ] `app/tools/hash/HashTool.test.tsx` (mocked `@/lib/hash/client` with deferred promises; `navigator.clipboard` stub)
- [ ] `tests/e2e/hash.spec.ts`, `tests/e2e/hash-seo.spec.ts`, `tests/e2e/hash-output.spec.ts`, `tests/e2e/hash-verify.spec.ts`, `tests/e2e/hash-url.spec.ts`, `tests/e2e/hash-keyboard.spec.ts`, `tests/e2e/hash-layout.spec.ts` (one spec per plan slice; titles keep the `CLS`, `320px`, `keyboard` and `text=` keywords)
- [ ] `app/tools/hash/hash-test-utils.ts` shared fake client; per-slice RTL files `HashTool.output.test.tsx`, `HashTool.verify.test.tsx`, `HashTool.url.test.tsx`, `HashTool.keyboard.test.tsx`
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
