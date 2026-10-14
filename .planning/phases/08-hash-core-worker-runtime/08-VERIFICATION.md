---
phase: 08-hash-core-worker-runtime
verified: 2026-10-14T19:45:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/08-hash-core-worker-runtime/08-01-PLAN.md"
  - ".planning/phases/08-hash-core-worker-runtime/08-01-SUMMARY.md"
  - ".planning/phases/08-hash-core-worker-runtime/08-02-PLAN.md"
  - ".planning/phases/08-hash-core-worker-runtime/08-02-SUMMARY.md"
  - ".planning/phases/08-hash-core-worker-runtime/08-03-PLAN.md"
  - ".planning/phases/08-hash-core-worker-runtime/08-03-SUMMARY.md"
  - ".planning/phases/08-hash-core-worker-runtime/08-04-PLAN.md"
  - ".planning/phases/08-hash-core-worker-runtime/08-04-SUMMARY.md"
  - ".planning/phases/08-hash-core-worker-runtime/08-05-PLAN.md"
  - ".planning/phases/08-hash-core-worker-runtime/08-05-SUMMARY.md"
  - "eslint.config.mjs"
  - "lib/hash/algorithms.ts"
  - "lib/hash/client.ts"
  - "lib/hash/crc32.ts"
  - "lib/hash/engine.test.ts"
  - "lib/hash/engine.ts"
  - "lib/hash/format.ts"
  - "lib/hash/hash.worker.ts"
  - "lib/hash/job.ts"
  - "lib/hash/source.ts"
  - "lib/hash/types.ts"
  - "lib/hash/worker-core.ts"
  - "tests/e2e-prod/hash-worker.spec.ts"
covered_digest: "v3:sha256:a3e81f3589344fc6bea9812d0c831a5286fcfd3f9c4e14f23e85f9e0286cada0"
behavior_unverified: 0
overrides_applied: 0
advisory:
  - finding: "WR-01: client.start() can reject / leave dangling current job if worker.postMessage throws (08-REVIEW.md)"
    category: other
    reason: "Robustness gap in the client contract; Phase 9 UI should either fix it or handle rejections. Not a Phase 8 success-criterion failure."
    evidence_status: "code-read only (lib/hash/client.ts lines 119-122 confirmed: postMessage is unguarded)"
  - finding: "WR-02: worker messageerror not handled; job promise could hang"
    category: other
    reason: "Confirmed in client.ts: only onmessage/onerror are wired."
    evidence_status: "code-read only"
  - finding: "WR-03: bytesChunks/blobChunks accept fractional chunkSize (latent wrong digest)"
    category: other
    reason: "Confirmed guard is `!(chunkSize >= 1)`; production callers only pass integers, so latent."
    evidence_status: "code-read only"
human_verification:
  - test: "Firefox and Safari worker smoke check (08-05 Task 2 human-check; 08-VALIDATION manual-only row)"
    expected: "Run `HASH_SMOKE=1 npm run build && HASH_SMOKE=1 npm run start -- -p 3101`, open http://localhost:3101/hash-smoke in Firefox and in Safari, wait for 'ready', run `await window.__hashSmoke.start({ kind: 'text', text: 'abc' })` in devtools; result status is 'done' with sha256 ba7816bf...15ad in both browsers, no console errors"
    why_human: "Only Chromium is installed for Playwright; module-Worker behavior in Firefox/Safari (08-RESEARCH assumption A2) cannot be proven programmatically here. The check was not run, so the outcome is unrecorded."
---

# Phase 8: Hash Core & Worker Runtime Verification Report

**Phase Goal:** Any byte input (a string or a stream of chunks) yields the correct digest for all 10 algorithms, computed off the main thread. The correctness gate the tool route is built on.
**Verified:** 2026-10-14
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

All five ROADMAP success criteria are met in the codebase and by commands I ran myself. The only open item is the Firefox/Safari manual browser check, which is manual-only by design and was not run.

### Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|--------------------|--------|----------|
| 1 | Published digests for every vector (RFC 1321, FIPS 180-4, FIPS 202, RIPEMD-160, CRC `123456789` -> `cbf43926`), padding boundaries (0,1,55,56,63,64,65,111,112,127,128,129), SHA3 rate +/-1, million-`a`, 0-byte (`e3b0c442...b855`); CRC32 unsigned 8-digit hex | VERIFIED | `lib/hash/engine.test.ts` has the published vector table (empty-input sha256 `e3b0c442...` line 42, `cdc76e5c...` line 142, CRC catalogue line 154, million-`a` line 19) and `BOUNDARY_LENGTHS` [0,1,55,56,57,63,64,65,71,72,73,111,112,113,127,128,129,135,136,137] across all 10 algorithms vs `node:crypto`/`zlib.crc32` oracles, with oracle availability hard-asserted. `crc32.ts` reads: init 0xFFFFFFFF once, final XOR once in `digest()` forced via `>>> 0`, 4-byte big-endian output. I ran `npx vitest run lib/hash app/hash-smoke`: 10 files, 203/203 pass. |
| 2 | SHA3-256("") is `a7ffc6f8...f8434a`, never Keccak `c5d24601...`; negative test for both SHA3 variants | VERIFIED | `engine.test.ts` lines 21-28 (constants) and 242-255: asserts both SHA3-256 and SHA3-512 empty digests equal the FIPS 202 value and `not.toBe` the Keccak value. `engine.ts` imports only `sha3_256`/`sha3_512` (no keccak exports). |
| 3 | `é`, `€`, `🚀`, NFC vs NFD hash exactly as `printf '%s' ... \| sha256sum`; one TextEncoder choke point, no trim, no normalization | VERIFIED | `source.ts`: single module-level `TextEncoder`, `encodeText` does a bare `encoder.encode(text)`; `worker-core.ts` is the only text path and calls `encodeText`. `engine.test.ts` line 260 (`é€🚀`), line 265 (NFC != NFD), line 294 (binary-string property vs Buffer UTF-8); `source.test.ts` line 33 (NFD = 65 CC 81). All pass. |
| 4 | One-shot vs arbitrary chunking identical for all 10 algorithms; fast-check chunk-split property + differential vs `node:crypto`/`zlib.crc32` | VERIFIED | `job.test.ts` lines 57-74: `fc` properties over random bytes and random chunk-size sequences/sizes, compared against oracles; `crc32.test.ts` line 66 property; `runHashJob` feeds a single pass to all 10 fresh hashers. The prod e2e additionally hashes a 3 MiB + 5 byte Blob through 1 MiB slices and matches node oracles. All pass. |
| 5 | Production build: job runs in a Web Worker with correct digests; `@noble/hashes` only imported by `lib/hash/engine.ts` and only in the worker chunk; new job always cancels in-flight first; superseded/disposed job never delivers (fake-Worker tests) | VERIFIED (Chromium) | I ran `npm run test:e2e:prod` myself: 7/7 pass (text digests via worker, noble marker chunk fetched but absent from main-thread resource timing, Blob slices, 0-byte Blob, 96 MiB superseded job stops in under 2 s, dispose final, no third-party requests). Import boundary: grep of source shows `@noble/hashes` imported only in `engine.ts` (other hits are tests/comments/types text); `eslint.config.mjs` has a `no-restricted-imports` rule exempting only `lib/hash/engine.ts`; `boundaries.test.ts` passes. `client.ts` has only `import type` and `start()` calls `cancelCurrent()` (settle cancelled, then post cancel) before posting the new start; `w.onmessage` drops any message whose jobId is not `current.id`; `dispose()` sets `disposed` and `start()` returns cancelled afterward. `client.test.ts` FakeWorker tests ("never delivers a result for a superseded job") pass. Firefox/Safari not covered; see Human Verification. |

**Score:** 5/5 truths verified (0 behavior-unverified). SC5 is verified for Chromium only.

### Plan Must-Haves (08-01 frontmatter) spot-check

| Must-have | Status | Evidence |
|-----------|--------|----------|
| `@noble/hashes` exact-pinned 2.4.0, Next pinned 16.2.11 | VERIFIED | `package.json`: `"@noble/hashes": "2.4.0"`, `"next": "16.2.11"` |
| `/hash-smoke` calls `notFound()` unless `HASH_SMOKE === "1"`, noindex | VERIFIED | `app/hash-smoke/page.test.tsx` passes (in the 203); `tests/e2e/hash-smoke-gate.spec.ts` exists for the dev 404 |
| Single `new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" })` literal | VERIFIED | `client.ts` `createDefaultWorker` |
| Wiring client -> hash.worker -> worker-core -> job -> engine | VERIFIED | All links read in source; worker adapter calls `createWorkerHandler`; `worker-core` calls `runHashJob`; `job` uses `FACTORIES` |
| CI runs `test:e2e:prod` | VERIFIED | `.github/workflows/ci.yml:89` |

### Behavioral Spot-Checks / Gates run by verifier

| Command | Result | Status |
|---------|--------|--------|
| `npx vitest run lib/hash app/hash-smoke` | 10 files, 203 tests pass | PASS |
| `npm run typecheck` | clean | PASS |
| `npm run lint` | 0 errors, 1 pre-existing warning in `lib/mac/vendor.ts` (not in this phase) | PASS |
| `npm run test:e2e:prod` (production build, Chromium) | 7/7 pass | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| HASH-01 | 08-01, 08-02 | Correct digests for 10 algorithms vs published vectors incl. padding boundaries and SHA3-vs-Keccak | SATISFIED | SC1, SC2 above |
| HASH-02 | 08-02 | Text hashed as exact UTF-8 bytes, no trim/normalization | SATISFIED | SC3 above |
| HASH-03 | 08-02, 08-05 | Identical digests one-shot vs arbitrary chunks (property-tested) | SATISFIED | SC4 above |
| HASH-04 | 08-01, 08-03, 08-04, 08-05 | Hashing in a Web Worker; engine imported only from `engine.ts`; not in initial page JS | SATISFIED (Chromium) | SC5 above |

All four IDs appear in plan frontmatter and are marked Complete in REQUIREMENTS.md. No orphaned requirements: REQUIREMENTS.md maps only HASH-01..04 to Phase 8.

### Anti-Patterns Found

TBD/FIXME/XXX scan: none unreferenced in the phase's `lib/hash` source files (no debt-marker blockers). No stubs: the engine, job, worker-core and client are fully implemented and exercised end to end.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `lib/hash/client.ts` | 119-122 | `postMessage` unguarded (WR-01) | Warning | `start()` could reject and leave `current` dangling on `DataCloneError`; Phase 9 UI must handle |
| `lib/hash/client.ts` | 79-98 | No `onmessageerror` handler (WR-02) | Warning | Job promise could hang on an undeserializable worker message |
| `lib/hash/source.ts` | 25-28, 39-41 | Fractional `chunkSize` accepted (WR-03) | Warning | Latent wrong digest; current callers pass integers only |

The review disposition file records all six review findings (WR-01..03, IN-01..03) as `open`; none is a success-criterion failure. They are advisory and should be triaged, ideally WR-01/WR-02 before Phase 9 consumes the client.

### Human Verification Required

#### 1. Firefox and Safari worker smoke check

**Test:** `HASH_SMOKE=1 npm run build && HASH_SMOKE=1 npm run start -- -p 3101`; open `http://localhost:3101/hash-smoke` in Firefox and Safari; wait for "ready"; run `await window.__hashSmoke.start({ kind: "text", text: "abc" })` in devtools.
**Expected:** status `done`, sha256 `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`, no console errors, in both browsers.
**Why human:** Only Chromium is installed for Playwright; this is the manual-only row in 08-VALIDATION.md (module Worker support, assumption A2). Not run, so the outcome is unrecorded; a failure should be reported, not silently accepted.

### Gaps Summary

No gaps. Every ROADMAP success criterion is backed by code I read and tests I ran (203 unit tests, typecheck, lint, 7 production-build e2e tests). Status is `human_needed` solely because of the unrun Firefox/Safari check. Review warnings WR-01..03 are advisory and do not block the phase goal.

---

_Verified: 2026-10-14_
_Verifier: Claude (gsd-verifier)_
