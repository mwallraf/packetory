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
| 08-01-T1 (SC5 prod worker, text + boundary) | 08-01 | 1 | HASH-01, HASH-04 | T-8-SC, T-8-01, T-8-02, T-8-03, T-8-04 | Tracer: in a `HASH_SMOKE=1` production build the module Worker returns the published "abc" digest for all 10 algorithms; the noble-only marker chunk is fetched but never in main-thread resource timing | e2e (prod build) | `npm run test:e2e:prod` | ❌ created by 08-01-T1 | ⬜ pending |
| 08-02-T1 (SC1 CRC + metadata) | 08-02 | 2 | HASH-01 | T-8-07, T-8-09 | CRC32 unsigned, 8-digit zero-padded (`cbf43926`, `"62"` → `0012d20a`), chunk-invariant vs `zlib.crc32`; `notForSecurity` true for exactly md5/sha1/crc32; `toHex` keeps leading zero bytes | unit + property | `npx vitest run lib/hash/algorithms.test.ts lib/hash/format.test.ts lib/hash/crc32.test.ts` | ❌ created by 08-02-T1 | ⬜ pending |
| 08-02-T2 (SC1 vectors) | 08-02 | 2 | HASH-01 | T-8-06 | Published digests for all 10 algorithms, 20 boundary lengths x 10 algorithms vs mandatory `node:crypto`/`zlib.crc32` oracles (ripemd160 availability hard-asserted, no skip), million-`a`, 0-byte | unit + differential | `npx vitest run lib/hash/engine.test.ts` | ❌ created by 08-02-T2 | ⬜ pending |
| 08-02-T2 (SC2 SHA3) | 08-02 | 2 | HASH-01 | T-8-06 | SHA3 not Keccak (negative test both variants); scratch-copy Keccak mutant fails, control passes | unit (negative) | `npx vitest run lib/hash/engine.test.ts -t "SHA3"` | ❌ created by 08-02-T2 | ⬜ pending |
| 08-02-T2 (SC3 UTF-8 vectors) | 08-02 | 2 | HASH-02 | T-8-08 | NFC ≠ NFD, emoji, lone surrogate → EF BF BD, no trim; binary-string property vs Buffer UTF-8 | unit + property | `npx vitest run lib/hash/engine.test.ts -t "UTF-8"` | ❌ created by 08-02-T2 | ⬜ pending |
| 08-02-T3 (SC3 choke point + SC4 chunking) | 08-02 | 2 | HASH-02, HASH-03 | T-8-08, T-8-03 | One TextEncoder choke point; chunk-split == one-shot == oracle for all 10 algorithms; Blob-slice path; `runHashJob` abort/progress/yield contract | property + differential + static gate | `npx vitest run lib/hash/source.test.ts lib/hash/job.test.ts && npx vitest run lib/hash && npm run typecheck && npx eslint lib/hash` (typecheck + lint cover all eight 08-02 files) | ❌ created by 08-02-T3 | ⬜ pending |
| 08-03-T1 (SC5 client) | 08-03 | 2 | HASH-04 | T-8-10 | Supersede cancels first; stale/disposed never deliver; lazy single worker; onerror recovery | unit (FakeWorker) | `npx vitest run lib/hash/client.test.ts` | ❌ created by 08-03-T1 | ⬜ pending |
| 08-03-T2 (SC5 protocol) | 08-03 | 2 | HASH-02, HASH-04 | T-8-11, T-8-12 | worker-core abort/progress/error; no posted message or console output echoes input text (sentinel); loopback supersede really aborts | unit (loopback) + static gate | `npx vitest run lib/hash/worker-core.test.ts lib/hash/client.test.ts && npm run typecheck && npx eslint lib/hash` (typecheck + lint cover both 08-03 test files) | ❌ created by 08-03-T2 | ⬜ pending |
| 08-04-T1 (SC5 boundary) | 08-04 | 2 | HASH-04 | T-8-13, T-8-15 | `@noble/hashes` only in `engine.ts` (lint); engine reachable only via job → worker-core → hash.worker; in-memory injected mutants detected | lint + unit + typecheck | `npm run lint && npx vitest run lib/hash/boundaries.test.ts && npm run typecheck` | ❌ created by 08-04-T1 | ⬜ pending |
| 08-04-T2 (harness gate) | 08-04 | 2 | HASH-04 | T-8-14, T-8-01 | `/hash-smoke` calls `notFound()` unless `HASH_SMOKE` is exactly `"1"`; noindex; absent from registry/sitemap/nav; dev server answers 404 | unit + e2e (dev) | `npx vitest run app/hash-smoke/page.test.tsx && npx playwright test tests/e2e/hash-smoke-gate.spec.ts` | ❌ created by 08-04-T2 | ⬜ pending |
| 08-05-T1 (SC5 prod worker, Blob + cancel + network) | 08-05 | 3 | HASH-03, HASH-04 | T-8-16, T-8-17 | Prod build: 3 MiB + 5 byte Blob == mandatory node oracles with ordered progress; 0-byte Blob; superseded 96 MiB job stops (< 2000 ms); dispose final; no cross-origin request | e2e (prod build) | `npm run test:e2e:prod` | ❌ extended by 08-05-T1 | ⬜ pending |
| 08-05-T2 (CI wiring + phase gate) | 08-05 | 3 | HASH-04 | T-8-18 | CI e2e job runs `npm run test:e2e:prod` after `npm run test:e2e`; full gate green on the merged tree | CI config + full suite | `npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e && npm run test:e2e:prod` | ❌ modified by 08-05-T2 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Repair local install: `rm -rf node_modules && npm ci` (owner: 08-01-T1 step 1, wave 1; re-checked by the per-plan install check at the start of 08-02-T1, 08-03-T1, 08-04-T1, 08-05-T1)
- [ ] `npm install --save-exact @noble/hashes@2.4.0` (owner: 08-01-T1 step 1, wave 1)
- [ ] `lib/hash/*` test files listed above (owners: 08-02-T1/T2/T3 for algorithms, format, crc32, engine, source, job tests; 08-03-T1/T2 for client and worker-core tests; 08-04-T1 for boundaries test; all wave 2)
- [ ] ESLint `no-restricted-imports` block in `eslint.config.mjs` (owner: 08-04-T1, wave 2)
- [ ] `app/hash-smoke/` env-gated harness (owner: 08-01-T1, wave 1; gate tests 08-04-T2, wave 2)
- [ ] `playwright.prod.config.ts`, `tests/e2e-prod/hash-worker.spec.ts`, `test:e2e:prod` script (owner: 08-01-T1, wave 1); CI step (owner: 08-05-T2, wave 3)
- [ ] `npx playwright install chromium` (owner: 08-01-T1 step 1, wave 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Worker behavior in Firefox/Safari | HASH-04 | Only Chromium automated in Phase 8 | Open `/hash-smoke` (built with `HASH_SMOKE=1`) in Firefox and Safari; confirm digests render (owner: 08-05-T2 human-check, wave 3) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
