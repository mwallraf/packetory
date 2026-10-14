---
phase: "8"
slug: "hash-core-worker-runtime"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-14"
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (+ fast-check 4.9.0 / @fast-check/vitest 0.4.1); Playwright 1.61.1 for the production worker proof |
| **Config file** | `vitest.config.ts` (unchanged; per-file `// @vitest-environment node`); NEW `playwright.prod.config.ts` (Wave 0) |
| **Quick run command** | `npx vitest run lib/hash` |
| **Full suite command** | `npm run typecheck && npm run lint && npm test && npm run test:e2e:prod` |
| **Estimated runtime** | ~1 second (quick); ~120 seconds (full, incl. production build) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/hash`
- **After every plan wave:** Run `npm run typecheck && npm run lint && npm test`
- **Before `/gsd-verify-work`:** Full suite plus `npm run build` and `npm run test:e2e:prod` must be green
- **Max feedback latency:** 5 seconds (quick); production e2e only at wave/phase gates

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| SC1 vectors | TBD | TBD | HASH-01 | — | Published digests for all 10 algorithms, boundary lengths, million-`a`, 0-byte | unit + differential | `npx vitest run lib/hash/engine.test.ts` | ❌ W0 | ⬜ pending |
| SC1 CRC | TBD | TBD | HASH-01 | — | CRC32 unsigned, 8-digit zero-padded (`cbf43926`, `"62"` → `0012d20a`) | unit | `npx vitest run lib/hash/crc32.test.ts` | ❌ W0 | ⬜ pending |
| SC2 SHA3 | TBD | TBD | HASH-01 | — | SHA3 not Keccak (negative test both variants) | unit (negative) | `npx vitest run lib/hash/engine.test.ts -t "SHA3"` | ❌ W0 | ⬜ pending |
| SC3 UTF-8 | TBD | TBD | HASH-02 | — | One TextEncoder choke point, no trim/normalize | unit | `npx vitest run lib/hash/engine.test.ts lib/hash/source.test.ts` | ❌ W0 | ⬜ pending |
| SC4 chunking | TBD | TBD | HASH-03 | — | Chunk-split == one-shot == oracle | property + differential | `npx vitest run lib/hash/engine.test.ts lib/hash/source.test.ts lib/hash/job.test.ts` | ❌ W0 | ⬜ pending |
| SC5 client | TBD | TBD | HASH-04 | — | Supersede cancels first; stale/disposed never deliver | unit (FakeWorker) | `npx vitest run lib/hash/client.test.ts` | ❌ W0 | ⬜ pending |
| SC5 protocol | TBD | TBD | HASH-04 | — | worker-core abort/progress/error | unit (loopback) | `npx vitest run lib/hash/worker-core.test.ts lib/hash/job.test.ts` | ❌ W0 | ⬜ pending |
| SC5 boundary | TBD | TBD | HASH-04 | — | `@noble/hashes` only in `engine.ts` | lint + unit | `npm run lint && npx vitest run lib/hash/boundaries.test.ts` | ❌ W0 | ⬜ pending |
| SC5 prod worker | TBD | TBD | HASH-04 | — | Worker in prod build; noble absent from initial client JS | e2e (prod build) | `npm run test:e2e:prod` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Repair local install: `rm -rf node_modules && npm ci`
- [ ] `npm install --save-exact @noble/hashes@2.4.0`
- [ ] `lib/hash/*` test files listed above
- [ ] ESLint `no-restricted-imports` block in `eslint.config.mjs`
- [ ] `app/hash-smoke/` env-gated harness
- [ ] `playwright.prod.config.ts`, `tests/e2e-prod/hash-worker.spec.ts`, `test:e2e:prod` script, CI step
- [ ] `npx playwright install chromium`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Worker behavior in Firefox/Safari | HASH-04 | Only Chromium automated in Phase 8 | Open `/hash-smoke` (built with `HASH_SMOKE=1`) in Firefox and Safari; confirm digests render |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
