---
phase: 12-password-core-library
plan: 02
subsystem: password-core-library
tags: [web-crypto, csprng, rejection-sampling, fail-closed, batch, vitest, fast-check]
status: complete

requires: ["12-01"]
provides:
  - "generateBatch(opts, count, options): 1-20 independent passwords with total NaN-safe count clamping (D-04)"
  - "SC-2 proofs on randomInt: no modulo bias at the exact rejection boundaries, 65,536-byte fill cap, fail-closed Web Crypto, call-time binding, import-time silence"
affects: [12-03, 12-04, 12-05, 13-password-tool-ui]

actuals:
  tokens: 6200
  tasks: 3
  commits: 3
plan_head_before: 727797235a64a45c30da7f4005121a457f991320
plan_head_after: 2cd8785583c16fc17cec57c65c1c0ff53b7545e9

tech-stack:
  added: []
  patterns:
    - "Test-local withoutWebCrypto(replacement, fn) override with finally-restore for fail-closed proofs"
    - "Runtime Math random spy as complement to the source grep guard"

key-files:
  created:
    - lib/password/random.test.ts
  modified:
    - lib/password/generate.ts
    - lib/password/generate.test.ts

key-decisions:
  - "random.ts was not changed: every SC-2 proof passed against the 12-01 implementation"

requirements-completed: [PWD-04]

coverage:
  - id: D1
    description: "randomInt is unbiased: limit - 1 accepted, limit and 2^32 - 1 redrawn for n = 85, 94, 7776, limit % n === 0, property over n in [1, 2^32]"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/password/random.test.ts#randomInt rejection sampling (SC-2, D-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No fill request above 65,536 bytes: resolveFill boundary 16,384 / 16,385 elements; every randomInt draw is 4 bytes"
    verification:
      - kind: unit
        ref: "lib/password/random.test.ts#fill byte cap (SC-2, D-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "With Web Crypto absent every generator throws CryptoUnavailableError, produces nothing and never calls Math random; explicit fill and restore both work; default fill is bound at call time"
    verification:
      - kind: unit
        ref: "lib/password/random.test.ts#fail-closed Web Crypto (SC-2, D-02, PWD-07 guarantee)"
        status: pass
    human_judgment: false
  - id: D4
    description: "generateBatch returns clampBatchCount(count) independent passwords; a 20 x 128-character batch is valid; importing the modules draws nothing"
    verification:
      - kind: unit
        ref: "lib/password/generate.test.ts#generateBatch (D-04), import-time silence (D-04)"
        status: pass
    human_judgment: false

duration: 3 min
completed: 2026-11-11
---

# Phase 12 Plan 02: Batch generation and SC-2 CSPRNG proofs Summary

**generateBatch (1-20 passwords, NaN-safe clamping) plus stubbed-RNG proofs that randomInt has no modulo bias at its exact rejection limits, caps fills at 65,536 bytes, fails closed without Web Crypto, and draws nothing at import.**

## Accomplishments

- `generateBatch` in `lib/password/generate.ts`: clamps `count` with `clampBatchCount`, then returns independent `generatePassword` draws through the same fill seam. A 20 x 128-character batch over real Web Crypto is valid, with every fill request exactly 4 bytes.
- `lib/password/random.test.ts` (new, 24 tests): rejection boundaries for n = 85 (limit equals 2^32 - 1), 94 and 7776 with `limit % n === 0`; n = 1 and n = 2^32 edges; invalid-n RangeError before any fill call; returned-array read; bounded 1,000-redraw failure; a 500-run property over n in [1, 2^32]; the 16,384 / 16,385-element byte cap and real `QuotaExceededError`; fail-closed behavior with crypto undefined or method-less, explicit fill, restore, and a call-time `this` binding stub.
- `generate.test.ts`: "generateBatch (D-04)" and "import-time silence (D-04)" (fresh module graph, zero Web Crypto and zero Math random calls).
- Full suite `npx vitest run lib/password`: 3 files, 78 tests pass.

## Task Commits

1. **Task 1: Tracer, generateBatch** - `b54d5f7` (feat)
2. **Task 2: No modulo bias and byte cap proofs** - `fabb059` (test)
3. **Task 3: Fail-closed, call-time binding, import silence** - `2cd8785` (test)

## Deviations from Plan

None - plan executed exactly as written. No production defect was exposed, so `random.ts` is unchanged. Prettier was run on the touched files (no repo Prettier config; formatting only).

**Total deviations:** 0.

## Verification

- `npx vitest run lib/password`: 78 passed. `npm run typecheck` clean. `npx eslint lib/password` clean; `npm run lint` shows only the pre-existing `lib/mac/vendor.ts` warning (out of scope).
- R2 gates: only `lib/password/random.ts` names `getRandomValues` among non-test files; no Math random member reference anywhere in `lib/password`.
- `git diff --quiet f1b330c -- package.json package-lock.json` exits 0.
- Task acceptance greps pass (generateBatch 1, clampBatchCount 1, 4294964736 1, QuotaExceededError 1, 16_385 2, withoutWebCrypto 6, vi.resetModules 1, Math random spy 2).

## Known Stubs

None.

## Threat Flags

None. No network, storage, console or route surface added.

## Self-Check: PASSED

`lib/password/random.test.ts` exists; commits `b54d5f7`, `fabb059`, `2cd8785` are ancestors of HEAD.
