---
phase: 12-password-core-library
plan: 03
subsystem: password-core-library
tags: [entropy, bigint, inclusion-exclusion, crack-time, strength, vitest, fast-check]
status: complete

requires: ["12-01"]
provides:
  - "passwordEntropyBits: exact log2 of the valid-string count (BigInt inclusion-exclusion), from options only"
  - "passphraseEntropyBits: words * log2(7776) + log2(10) with append-number, constant word count"
  - "acceptanceProbability and the analytic proof that MAX_GENERATION_ATTEMPTS (10,000) never exhausts"
  - "strengthLevel / formatBits: labels from raw bits at 40/75/100, display floored"
  - "crackTimeLog10Seconds / formatCrackTime: log-space average-case crack time and shared human text"
affects: [12-04, 12-05, 13-password-tool-ui, 14-password-faq]

actuals:
  tokens: 9500
  tasks: 3
  commits: 3
plan_head_before: e0f6e8a082e2e39c8bbe356c4b2ae7b734d300e5
plan_head_after: ca8c672a2fdbf2033efeeb9fcc06b668460471b4

tech-stack:
  added: []
  patterns:
    - "Exact BigInt counting with a top-53-bit log2 (exact for powers of two)"
    - "12-significant-digit rounding before flooring so exact bucket boundaries survive float error"

key-files:
  created:
    - lib/password/entropy.ts
    - lib/password/entropy.test.ts
    - lib/password/crack-time.ts
    - lib/password/crack-time.test.ts
  modified: []

key-decisions:
  - "Entropy of a one-string pool (symbols-only, 1 symbol) is exactly 0 bits, so the property asserts >= 0 rather than > 0"
  - "passphraseEntropyBits and acceptanceProbability landed in the Task 1 commit with the rest of entropy.ts; Task 2 is test-only"

requirements-completed: [PWD-04]

coverage:
  - id: D1
    description: "Reported password entropy is the exact log2 of the generator's valid-string count; default 128.0598, L=4 default sets 21.8313 (not naive 25.6376), never above length * log2(pool) across the option grid"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/password/entropy.test.ts#exact entropy (D-15)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Worst-case acceptance over the whole option grid is 0.010299 (L=4, 4 sets, 1 symbol, look-alikes off) >= 0.005, failure probability under 1e-40 at 10,000 attempts"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/password/entropy.test.ts#retry bound (D-03, SC-1)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Passphrase entropy and strength labels switch exactly at 40/75/100; the floored display never contradicts the label"
    verification:
      - kind: unit
        ref: "lib/password/entropy.test.ts#passphrase entropy (D-14), strength labels and display (D-16)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Crack time is computed in log space for both guess rates, never overflows at 128 characters, and reads correctly in every bucket including exact boundaries and the success-criterion scenarios"
    verification:
      - kind: unit
        ref: "lib/password/crack-time.test.ts"
        status: pass
    human_judgment: false

duration: 6 min
completed: 2026-11-11
---

# Phase 12 Plan 03: Strength figures and crack time Summary

**Exact BigInt inclusion-exclusion password entropy (128.0598 bits for the default, 21.8313 at L=4, never overstated), passphrase entropy, labels switching exactly at 40/75/100, log-space crack time with float-safe buckets, and an analytic proof that the 10,000-attempt retry bound essentially never exhausts (worst case 1.03% acceptance).**

## Accomplishments

- `lib/password/entropy.ts`: `log2Big`, `validPasswordCount`, `passwordEntropyBits`, `passphraseEntropyBits`, `acceptanceProbability`, `strengthLevel`, `formatBits`. All read only `resolveAlphabet` set sizes and normalized length; no random import, no generated string argument (a string is a type error, proven by `@ts-expect-error`).
- `lib/password/crack-time.ts`: `crackTimeLog10Seconds` and `formatCrackTime`, with the overflow shortcut at 1e13 years-equivalent, 12-significant-digit rounding, singular forms, and the "more than a trillion years" cap.
- Tests: 52 in `entropy.test.ts` (every D-15 fixture to 4 decimals, exact 75 and 100 bit rows through `log2Big`, brute-force-checked counts, a never-overstate property over length 4-128 x 15 masks x symbol sets x look-alikes, non-decreasing-in-length, the grid scan with its minimum and its arguments, passphrase fixtures, label and display thresholds with a floor-vs-label property) and the crack-time suite (every success-criterion scenario end to end, log-space finiteness at 128 characters, every bucket and boundary, a monotonic-rank property over 500 runs, label assumptions). Full `npx vitest run lib/password`: 5 files, 170 tests pass.

## Task Commits

1. **Task 1: Tracer, default options to bits, label and crack-time text** - `67d61ff` (feat)
2. **Task 2: Exact entropy, passphrase entropy, retry bound fixtures** - `5a43712` (test)
3. **Task 3: Crack-time buckets, boundaries and scenarios** - `ca8c672` (test)

## Deviations from Plan

**1. [Rule 1 - Bug] Property asserted entropy > 0, but a one-string pool legitimately has 0 bits**
- **Found during:** Task 2
- **Issue:** fast-check found `{length: 4, symbols only, symbolSet: "!"}`: the generator can only emit `!!!!`, so exact entropy is 0. The plan's "finite and > 0" was a spec error, not an implementation defect (0 is the honest, non-overstated figure).
- **Fix:** Property asserts `>= 0` with a comment, and an explicit test pins the one-string pool at exactly 0 bits ("weak"). Implementation unchanged.
- **Files modified:** `lib/password/entropy.test.ts`
- **Commit:** `5a43712`

**2. [Ordering] `passphraseEntropyBits` and `acceptanceProbability` were written with Task 1's entropy.ts**
- Both are small and share the same helper; Task 1's acceptance greps (5 and 2 exports) still pass, and Task 2's commit is test-only. No behavior change vs. the plan.

Formatting: ran Prettier on the new files (no repo Prettier config).

**Total deviations:** 1 auto-fixed (test spec), 1 ordering note.

## Verification

- `npx vitest run lib/password`: 170 passed. `npm run typecheck` clean (the `@ts-expect-error` directive is used). `npx eslint lib/password` clean.
- `git diff --quiet f1b330c -- package.json package-lock.json` exits 0 (no dependency change).
- R2 grep (no Math random member access in `lib/password`) passes; entropy.ts and crack-time.ts do not import `./random`.
- Acceptance greps: 125.8903 x1, 124.7884 x0, 0.010299 x3, `@ts-expect-error` x1, `more than a trillion years` in crack-time.ts x1, `toPrecision(12)` x1, `350 thousand years` in the test x1.
- Tracer gate: `<verify>` re-run end to end after Task 1 passed before expansion.

## Known Stubs

None.

## Threat Flags

None. Pure maths: no network, storage, console or route surface.

## Self-Check: PASSED

`lib/password/entropy.ts`, `entropy.test.ts`, `crack-time.ts`, `crack-time.test.ts` exist; commits `67d61ff`, `5a43712`, `ca8c672` are ancestors of HEAD.
