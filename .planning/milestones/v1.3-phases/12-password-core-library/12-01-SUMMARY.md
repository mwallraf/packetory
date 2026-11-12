---
phase: 12-password-core-library
plan: 01
subsystem: password-core-library
tags: [web-crypto, csprng, rejection-sampling, fast-check, vitest, typescript]
status: complete

requires: []
provides:
  - "lib/password types, constants (bounds, defaults, FAQ numbers, DEFAULT_OPTIONS) and typed errors"
  - "randomInt: the single audited unbiased Uint32 rejection-sampling CSPRNG primitive, with a RandomFill test seam"
  - "resolveAlphabet and option normalizers: the trust boundary for every later consumer"
  - "generatePassword with whole-password resampling (PWD-04)"
  - "queueFill / constantFill / recordingFill deterministic fill helpers"
affects: [12-02, 12-03, 12-04, 12-05, 13-password-tool-ui, 14-password-faq]

actuals:
  tokens: 9130
  tasks: 3
  commits: 3
plan_head_before: 9ee957107a2f05beb7529e60e952b4063f39e32e
plan_head_after: 42180e2098f6d26ba7a119569c14880f0066fae4

tech-stack:
  added: []
  patterns:
    - "Randomness confined to lib/password/random.ts; everything else draws via randomInt with an injectable fill"
    - "Total, NaN-safe normalizers that build fresh objects and never copy input keys"
    - "Whole-password rejection resampling, never patching or shuffling"

key-files:
  created:
    - lib/password/types.ts
    - lib/password/constants.ts
    - lib/password/errors.ts
    - lib/password/random.ts
    - lib/password/charset.ts
    - lib/password/generate.ts
    - lib/password/test-utils.ts
    - lib/password/generate.test.ts
    - lib/password/charset.test.ts
  modified: []

key-decisions:
  - "Option normalization lives in charset.ts alongside resolveAlphabet (single trust boundary, no import cycle)"
  - "ToolOptions field names and constant names are the cross-phase contract for Phases 13-14"
  - "Defaults fixed by orchestrator: symbols on, avoidLookalikes false, capitalize false, appendNumber false, batch 1, mode password, separator hyphen"

patterns-established:
  - "RandomFill seam: tests inject queueFill/constantFill instead of mocking globals"
  - "Edge-case tests titled 'Edge (PWD-04, <class>): ...'"

requirements-completed: [PWD-04]

coverage:
  - id: D1
    description: "Every generated password has the normalized length, at least one character of each enabled set and only pool characters, across the full option space"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/password/generate.test.ts#PWD-04 property"
        status: pass
    human_judgment: false
  - id: D2
    description: "One-of-each is enforced by whole-password resampling only; exhaustion throws a typed error after exactly 10,000 attempts and leaks no characters"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/password/generate.test.ts#whole-password resampling, exhaustion"
        status: pass
    human_judgment: false
  - id: D3
    description: "Alphabet pipeline (85/79 pool sizes, symbol normalization, look-alike fallback) and option normalizers are total and pinned by example, edge and property tests"
    verification:
      - kind: unit
        ref: "lib/password/charset.test.ts"
        status: pass
    human_judgment: false

duration: 3 min
completed: 2026-11-11
---

# Phase 12 Plan 01: Password core library foundation Summary

**Unbiased Web Crypto password generation (Uint32 rejection sampling, whole-password resampling for one-of-each-set) with a total option-normalization trust boundary and deterministic fill helpers, no new dependencies.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-11T20:42:00Z
- **Completed:** 2026-11-11T20:45:10Z
- **Tasks:** 3 (1 tracer, 2 TDD auto)
- **Files created:** 9

## Accomplishments

- Contracts for later plans: `types.ts`, `constants.ts` (every bound, default and FAQ number plus `DEFAULT_OPTIONS`), `errors.ts`.
- `randomInt` is the only code in the library that names the Web Crypto fill method and the only place a random value is reduced (`r < 2^32 - (2^32 % n)`, then `%`). The default fill is resolved at call time and bound to `globalThis.crypto`; absence throws `CryptoUnavailableError`; requests over 65,536 bytes throw `RangeError`.
- `resolveAlphabet` produces the 85-character default pool (79 with look-alikes removed, sizes 24/24/8/23); `normalizeSymbols` keeps printable non-alphanumeric ASCII, first-seen order, capped at 32, defaulting when empty.
- `generatePassword` re-normalizes options and resamples the whole password until every enabled set is present, bounded by 10,000 attempts.
- 39 tests pass: the PWD-04 property (200 runs over length 4-128, all 15 set masks, raw symbol strings, look-alike on/off), deterministic queue tests, the 40,000-call exhaustion test, four edge tests in each of charset and generate suites.

## Task Commits

1. **Task 1: Tracer, default password end to end** - `246e1fe` (feat)
2. **Task 2: Alphabet rules and normalizer tests** - `0dfe2fc` (test)
3. **Task 3: PWD-04 proofs and deterministic fills** - `42180e2` (test)

## Deviations from Plan

None - plan executed exactly as written. The plan permitted changing implementation only if tests exposed a defect; none did.

Incidental: ran `prettier --write lib/password` before the Task 3 commit (the repo has no Prettier config or enforcement; existing files also differ), so Task 3's commit also contains formatting-only changes to `charset.test.ts`.

**Total deviations:** 0.

## Verification

- `npx vitest run lib/password`: 2 files, 39 tests passed.
- `npm run typecheck` and `npx eslint lib/password`: clean. `npm run lint` shows only a pre-existing warning in `lib/mac/vendor.ts` (out of scope).
- Confinement gate: only `lib/password/random.ts` names `getRandomValues` among non-test files. Math random access grep: nothing. No react/next imports. No production import of `test-utils`.
- `git diff --quiet f1b330c -- package.json package-lock.json` exits 0.
- All task acceptance greps pass (DEFAULT_POOL_SIZE 85, RandomFill type, bound fill expression, exhaustion throw, 4 edge titles in charset tests, 7 charset exports, 3 fill helpers, `PWD-04 property`, `40000`).

## Known Stubs

None.

## Threat Flags

None. No network, storage, console or route surface was added.

## Self-Check: PASSED

All nine files under `lib/password/` exist; commits `246e1fe`, `0dfe2fc`, `42180e2` are ancestors of HEAD.
