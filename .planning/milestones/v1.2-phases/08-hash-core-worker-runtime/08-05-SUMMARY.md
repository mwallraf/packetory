---
phase: 08-hash-core-worker-runtime
plan: 05
subsystem: testing
tags: [playwright, production-build, web-worker, blob, noble-hashes, ci, node-crypto, privacy]

requires:
  - phase: 08-hash-core-worker-runtime
    provides: "08-01 worker runtime + /hash-smoke harness and prod Playwright config; 08-02 chunked Blob path; 08-03 supersede/cancel protocol; 08-04 boundary guards"
provides:
  - "Production-build e2e proof: 3 MiB + 5 Blob vs node oracles (10 algorithms), 0-byte Blob, 96 MiB supersede < 2 s, dispose finality, same-origin-only network"
  - "CI e2e job step running npm run test:e2e:prod after npm run test:e2e"
  - "Full phase gate green on the merged tree"
affects: [phase-09-hash-ui, phase-10]

actuals:
  tokens: 3200
  tasks: 2
  commits: 2
plan_head_before: c4a6afa935c521d6018465379df365c63627e0a1
plan_head_after: a92b2fbaabc9ab6e2b65ceed974a350312051e77
commits: 2

tech-stack:
  added: []
  patterns:
    - "Node-side oracleHex(bytes) over node:crypto + node:zlib crc32; every oracle mandatory, ripemd160 availability hard-asserted"
    - "In-page hex encoding inside each page.evaluate (page context cannot see Node helpers)"
    - "Non-vacuous network-silence assertion: record requests, require >= 1, then require same-origin for every http(s) URL"

key-files:
  created: []
  modified:
    - tests/e2e-prod/hash-worker.spec.ts
    - .github/workflows/ci.yml

key-decisions:
  - "Kept the 2000 ms supersede bound and never asserted the measured ~67 ms figure; test passed first run (463 ms total test time)"
  - "Ran prettier --write on the spec (the repo has no prettier config but the original file was already prettier-clean)"

requirements-completed: [HASH-03, HASH-04]

coverage:
  - id: D1
    description: "Production worker hashes a multi-chunk Blob via 1 MiB slices identically to node:crypto/zlib for all 10 algorithms with monotonic progress ending at done === total === 3145733"
    requirement: HASH-03
    verification:
      - kind: e2e
        ref: "tests/e2e-prod/hash-worker.spec.ts#worker hashes a Blob through 1 MiB slices and matches node oracles (HASH-03, HASH-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "0-byte Blob yields SHA-256 e3b0c442... and CRC32 00000000 in the production worker"
    requirement: HASH-04
    verification:
      - kind: e2e
        ref: "tests/e2e-prod/hash-worker.spec.ts#a 0-byte Blob yields the empty-input digests (HASH-04)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Superseding a 96 MiB job stops the worker: first job cancelled, successor 'abc' done with correct SHA-256 in < 2000 ms"
    requirement: HASH-04
    verification:
      - kind: e2e
        ref: "tests/e2e-prod/hash-worker.spec.ts#superseding a 96 MiB job stops the worker within 2 s (HASH-04)"
        status: pass
    human_judgment: false
  - id: D4
    description: "dispose() cancels the in-flight job and every later start() resolves cancelled without digests"
    requirement: HASH-04
    verification:
      - kind: e2e
        ref: "tests/e2e-prod/hash-worker.spec.ts#dispose is final: in-flight job cancelled, later starts never deliver (HASH-04)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Hashing text and a Blob issues no request to a non-same-origin host (HASH-04 privacy prohibition)"
    requirement: HASH-04
    verification:
      - kind: e2e
        ref: "tests/e2e-prod/hash-worker.spec.ts#hashing makes no third-party requests (HASH-04 privacy)"
        status: pass
    human_judgment: false
  - id: D6
    description: "CI e2e job runs npm run test:e2e:prod immediately after npm run test:e2e"
    verification:
      - kind: other
        ref: "grep -A1 -- '- run: npm run test:e2e$' .github/workflows/ci.yml | grep -q -- '- run: npm run test:e2e:prod'"
        status: pass
    human_judgment: false
  - id: D7
    description: "Cross-browser (Firefox, Safari) worker smoke check"
    verification: []
    human_judgment: true
    rationale: "Playwright here covers Chromium only; Firefox/Safari require an interactive manual run (08-VALIDATION manual-only row) which an unattended executor cannot perform."

duration: 12min
completed: 2026-10-14
status: complete
---

# Phase 8 Plan 05: Production proof expansion and CI gate Summary

**Production-build Playwright proof that the hash worker handles chunked Blobs against node oracles, abandons a superseded 96 MiB job in well under 2 s, treats dispose as final and stays same-origin, now enforced on every PR by a new CI step.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-10-14T19:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Five new production e2e tests alongside the two from 08-01 (7 passed): Blob (3 MiB + 5 bytes of 0x61) matches `node:crypto` + `zlib.crc32` for all 10 algorithms, ripemd160 availability hard-asserted, progress ticks non-decreasing with last tick `[3145733, 3145733]`; 0-byte Blob; 96 MiB supersede; dispose finality; network silence.
- CI `e2e` job gains `- run: npm run test:e2e:prod` directly after `npm run test:e2e` (sequential, so no shared `.next` race).
- Full phase gate green on the merged tree (see below).

## Task Commits

1. **Task 1: Production proof expansion** - `fbdd553` (test)
2. **Task 2: CI step + full phase gate** - `a92b2fb` (ci)

**Plan metadata:** committed separately (docs: complete plan)

## Full phase gate (final summary lines)

- `npm run typecheck`: `tsc --noEmit` exit 0, no errors
- `npm run lint`: `0 errors, 1 warning` (pre-existing `lib/mac/vendor.ts` unused `MacVendorRouteResponse`, out of scope, not from this phase)
- `npm test`: `Test Files 38 passed (38) / Tests 471 passed (471)`
- `npm run build` (no HASH_SMOKE): exit 0, route table printed
- `npm run test:e2e`: `69 passed (7.7s)`
- `npm run test:e2e:prod`: `7 passed (6.5s)`

## Files Created/Modified
- `tests/e2e-prod/hash-worker.spec.ts` - `oracleHex` helper plus five new production tests
- `.github/workflows/ci.yml` - one new step in the `e2e` job

## Decisions Made
- Kept the 2000 ms bound untouched; no flake observed across the two prod runs.
- Formatted the spec with prettier to match the previously prettier-clean file.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Cross-browser human-check (Firefox and Safari, 08-VALIDATION manual-only row) was NOT performed: this was an unattended executor run, and only Chromium browsers are installed for Playwright. Result: pending. Someone should run `HASH_SMOKE=1 npm run build && HASH_SMOKE=1 npm run start -- -p 3101`, open `http://localhost:3101/hash-smoke` in Firefox and Safari, wait for "ready", and run `await window.__hashSmoke.start({ kind: "text", text: "abc" })`, expecting status "done" (08-RESEARCH assumption A2). Flag for /gsd-verify-work.
- The HASH-04 privacy prohibition is now covered by the passing network-silence e2e test; its `status` stays for verify time to resolve.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 8 plans complete; the worker runtime is proven in a production build and gated in CI. Ready for /gsd-verify-work and Phase 9 UI. The Firefox/Safari manual check remains outstanding.

## Self-Check: PASSED

- `tests/e2e-prod/hash-worker.spec.ts` and `.github/workflows/ci.yml` exist and are committed (`fbdd553`, `a92b2fb` reachable from HEAD).
- All task acceptance greps passed; CI step order verified by grep.

---
*Phase: 08-hash-core-worker-runtime*
*Completed: 2026-10-14*
