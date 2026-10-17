---
phase: 08-hash-core-worker-runtime
plan: 02
subsystem: testing
tags: [vitest, fast-check, noble-hashes, crc32, sha3, node-oracle]

requires:
  - phase: 08-hash-core-worker-runtime
    provides: "08-01 lib/hash runtime chain (engine FACTORIES, source, job, crc32)"
provides:
  - lib/hash/algorithms.ts server-safe display metadata (ALGORITHMS, ALGORITHM_IDS, AlgorithmMeta) with notForSecurity flags
  - lib/hash/format.ts toHex (256-entry padded table) and digestsToHex
  - six node-environment test files proving published vectors, padding/rate boundaries, SHA3-not-Keccak, UTF-8 bytes, CRC32 precision, and chunk-split invariance
affects: [08-03, 08-04, 08-05, phase-09]

actuals:
  tokens: 7200
  tasks: 3
  commits: 3
plan_head_before: 2278f46e2f23b7596d2523b604b0e6c81d40bd18
plan_head_after: 04dca35d5faad3b75da24371c8594b58fa0d1035
commits: 3

tech-stack:
  added: []
  patterns:
    - "Every lib/hash test file starts with // @vitest-environment node"
    - "Mandatory node oracles (node:crypto createHash, node:zlib crc32) with hard availability assertions, never skipped"
    - "Short it.each labels so the million-a input never lands in a test title"
    - "Mutation check run in a scratch copy outside the checkout, never against tracked engine.ts"

key-files:
  created:
    - lib/hash/algorithms.ts
    - lib/hash/algorithms.test.ts
    - lib/hash/format.ts
    - lib/hash/format.test.ts
    - lib/hash/crc32.test.ts
    - lib/hash/engine.test.ts
    - lib/hash/source.test.ts
    - lib/hash/job.test.ts
  modified: []

key-decisions:
  - "Single-use assertion accepts both noble messages: SHA2/MD-family say 'hash was destroyed', the Keccak-based SHA3 class says 'digest() was already called'"
  - "Boundary table asserts all 20 lengths x 10 algorithms against node oracles with no try/catch or skip, ripemd160 availability hard-asserted"

patterns-established:
  - "Vector tables as {name, input, expected: Partial<Record<AlgorithmId,string>>} rows hashed once per input via a memoized hexOf()"
  - "Property tests split bytes by cycling a size list and interleaving empty chunks"

requirements-completed: [HASH-01, HASH-02, HASH-03]

coverage:
  - id: D1
    description: "All 49 published vectors (MD5 x7, SHA-1 x4, SHA-224 x4, SHA-256 x4, SHA-384 x4, SHA-512 x4, SHA3-256 x4, SHA3-512 x3, RIPEMD-160 x9, CRC32 x6) incl. million-a pass"
    requirement: HASH-01
    verification:
      - kind: unit
        ref: "lib/hash/engine.test.ts#published vectors (HASH-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "20 padding and sponge-rate boundary lengths x 10 algorithms equal node:crypto / zlib.crc32 oracles"
    requirement: HASH-01
    verification:
      - kind: unit
        ref: "lib/hash/engine.test.ts#padding and sponge-rate boundaries (HASH-01)"
        status: pass
    human_judgment: false
  - id: D3
    description: "SHA3-256/512 are FIPS 202 and not Keccak, with the negative proven by a scratch-copy mutation (control pass, Keccak-swapped mutant fails)"
    requirement: HASH-01
    verification:
      - kind: unit
        ref: "lib/hash/engine.test.ts#SHA3 is FIPS 202, not legacy Keccak (HASH-01)"
        status: pass
    human_judgment: false
  - id: D4
    description: "CRC32 is unsigned, always 8 lowercase hex digits, catalogue-correct (cbf43926, 0012d20a, e8b7be43) and equals zlib.crc32 across split points"
    requirement: HASH-01
    verification:
      - kind: unit
        ref: "lib/hash/crc32.test.ts, lib/hash/format.test.ts#toHex (HASH-01)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Hashing is over exact UTF-8 bytes via encodeText: NFC != NFD, lone surrogate = EF BF BD, no trim, empty and single-char vectors"
    requirement: HASH-02
    verification:
      - kind: unit
        ref: "lib/hash/engine.test.ts#UTF-8 bytes, no trim, no normalize (HASH-02); lib/hash/source.test.ts#encodeText byte contract (HASH-02)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Arbitrary chunking (1-byte, empty chunks, Blob slices) yields digests identical to one-shot and node oracles for all 10 algorithms; abort/progress/yield contract pinned"
    requirement: HASH-03
    verification:
      - kind: unit
        ref: "lib/hash/job.test.ts#chunk-split invariance (HASH-03); lib/hash/job.test.ts#runHashJob contract"
        status: pass
    human_judgment: false
  - id: D7
    description: "ALGORITHMS display metadata with notForSecurity true for exactly md5, sha1, crc32, noble-free and server-safe"
    requirement: HASH-01
    verification:
      - kind: unit
        ref: "lib/hash/algorithms.test.ts#flags notForSecurity for exactly md5, sha1, and crc32 (HASH-01 transparency)"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-10-14
status: complete
---

# Phase 8 Plan 02: Hash Engine Correctness Gate Summary

**Published-vector, padding-boundary, SHA3-not-Keccak, UTF-8, and chunk-split-invariance gate for all 10 hash algorithms against mandatory node:crypto / zlib.crc32 oracles, plus the noble-free `algorithms.ts` and `format.ts` modules Phase 9 renders from**

## Performance

- **Duration:** 2 min
- **Started:** 2026-10-14T19:14:21Z
- **Completed:** 2026-10-14T19:16:46Z
- **Tasks:** 3
- **Files modified:** 8 (8 created)

## Accomplishments
- `ALGORITHMS`/`ALGORITHM_IDS` (labels, bit sizes, display order, `notForSecurity` for exactly md5/sha1/crc32) and `toHex`/`digestsToHex` exist as server-safe modules with type-only imports.
- `engine.test.ts` pins all 49 published vectors (million-`a` included), 20 boundary lengths x 10 algorithms against independent oracles (ripemd160 and `zlib.crc32` availability hard-asserted, no skip paths), FIPS 202 vs Keccak negatives, and NFC/NFD/emoji/lone-surrogate UTF-8 vectors.
- `job.test.ts` property-proves chunk-split invariance (random sizes, 1-byte and interleaved empty chunks, Blob slices) against one-shot hashing and the oracles; abort, progress, and yield behavior of `runHashJob` is pinned.
- Full lib/hash suite: 156 tests pass; whole repo `npm test` 424 passed (34 files); `npm run typecheck` and `npx eslint lib/hash` clean.

## Keccak mutation check (scratch copy, tracked engine.ts untouched)
- Scratch copy of `lib/hash` in a temp dir under the scratchpad, `node_modules` symlinked, own `vitest.config.mjs` (`environment: "node"`).
- Control run (`-t "SHA3"`): 2 passed, 98 skipped.
- After `perl -pi -e 's/\bsha3_256\b/keccak_256/g'` (3 occurrences confirmed): mutant run failed with 1 failed test (`SHA3-256 of empty input is the FIPS 202 value, not Keccak-256`).
- `git status --porcelain -- lib/hash/engine.ts` was empty throughout; the scratch dir was removed.

## Task Commits

1. **Task 1: Display metadata, hex formatting, CRC32 precision** - `bb37de8` (feat)
2. **Task 2: Engine vector gate** - `391f25a` (test)
3. **Task 3: Chunk-split invariance and chunk-source contracts** - `04dca35` (test)

**Plan metadata:** recorded in the follow-up `docs(08-02)` commit.

## Files Created/Modified
- `lib/hash/algorithms.ts` - ALGORITHMS, ALGORITHM_IDS, AlgorithmMeta (type-only import)
- `lib/hash/format.ts` - toHex via 256-entry padded table, digestsToHex
- `lib/hash/algorithms.test.ts` - metadata invariants, notForSecurity flags, bits/4 hex length
- `lib/hash/format.test.ts` - toHex padding/lowercase, digestsToHex key coverage
- `lib/hash/crc32.test.ts` - catalogue vectors, unsigned/8-digit, zlib.crc32 property
- `lib/hash/engine.test.ts` - vectors, boundaries, Keccak negatives, UTF-8, single-use
- `lib/hash/source.test.ts` - encodeText bytes, bytesChunks/blobChunks sizes, RangeError, bounded Blob reads
- `lib/hash/job.test.ts` - chunk-split and Blob properties, runHashJob contract

## Decisions Made
- The single-use assertion accepts either noble message (see deviation 1).
- Otherwise followed the plan as specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan assumed one single-use error message for all 10 hashers**
- **Found during:** Task 2 (engine.test.ts single-use block)
- **Issue:** The plan (truth 9, block f) expected `/hash was destroyed/` from update()/digest() after digest() for every algorithm. `@noble/hashes` 2.4.0's Keccak-based SHA3 class throws `digest() was already called` instead (SHA2/MD-family and our CRC32 say `hash was destroyed`). Behavior is single-use in all 10 cases; only the message differs.
- **Fix:** Single-use regex is `/hash was destroyed|digest\(\) was already called/`, with a comment naming which family emits which message.
- **Files modified:** lib/hash/engine.test.ts
- **Verification:** `npx vitest run lib/hash/engine.test.ts` 100 passed.
- **Committed in:** 391f25a

---

**Total deviations:** 1 auto-fixed (1 test-expectation bug)
**Impact on plan:** Test-only; the single-use guarantee is still asserted for every algorithm. No scope creep.

## Issues Encountered
None. The mutation check's first attempt used the scratch-root fallback config (`--config`) from the start, so no retry was needed. The mutant swapped only `sha3_256` (per the plan's perl command), so the failing count is 1; the SHA3-512 negative is covered by the same mechanism but was not separately mutated.

## Known Stubs
None.

## Threat Flags
None. This plan adds no runtime surface (two pure modules and tests).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `ALGORITHMS`, `ALGORITHM_IDS`, and `toHex`/`digestsToHex` are importable by Phase 9 from noble-free modules.
- 08-03/08-04 can run against the same engine chain; no tracked file outside this plan's `files_modified` was edited.
- Oracles require Node >= 22.2 (zlib.crc32) and an OpenSSL exposing ripemd160; both are hard-asserted, so a CI runtime lacking either fails loudly.

---
*Phase: 08-hash-core-worker-runtime*
*Completed: 2026-10-14*

## Self-Check: PASSED
