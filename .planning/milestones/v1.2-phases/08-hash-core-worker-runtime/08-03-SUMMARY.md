---
phase: 08-hash-core-worker-runtime
plan: 03
subsystem: testing
tags: [vitest, web-worker, fake-worker, loopback, supersede-funnel, privacy]

requires:
  - phase: 08-hash-core-worker-runtime
    provides: "08-01 createHashClient supersede funnel and createWorkerHandler protocol handler"
provides:
  - lib/hash/client.test.ts FakeWorker suite pinning supersede, stale-drop, cancel, dispose, lazy worker, onerror recovery, throwing factory
  - lib/hash/worker-core.test.ts direct handler protocol tests plus a loopback end-to-end with real hashing
affects: [08-04, 08-05, phase-09, phase-10]

actuals:
  tokens: 4785
  tasks: 2
  commits: 2
plan_head_before: 8bea8c18a6b8ff83246bae08bf2b24167ba567b6
plan_head_after: 689290ad9861145df64e510856a4bef03878948a
commits: 2

tech-stack:
  added: []
  patterns:
    - "Injected FakeWorker (WorkerLike) with createWorker = vi.fn: no real Worker, no jsdom, awaits not timers"
    - "Loopback WorkerLike routing postMessage -> setTimeout -> real createWorkerHandler -> setTimeout -> onmessage, objects by reference"
    - "File-wide console spies asserted silent in afterEach as the HASH-02 no-console guard"

key-files:
  created:
    - lib/hash/client.test.ts
    - lib/hash/worker-core.test.ts
  modified: []

key-decisions:
  - "No production code changed: neither client.ts nor worker-core.ts exposed a defect"
  - "Unsupported-input, unknown-message and Blob-fixture casts live in the tests; Blob fixtures use a typed abcBlob() helper"

requirements-completed: [HASH-04]

coverage:
  - id: D1
    description: "Starting a new job through the client always cancels the in-flight one first (posted order start 1, cancel 1, start 2); a superseded or disposed job never delivers a result"
    requirement: HASH-04
    verification:
      - kind: unit
        ref: "lib/hash/client.test.ts#posts exactly start 1, cancel 1, start 2 when a job is superseded (HASH-04 ordering); #never delivers a result for a superseded job (HASH-04); #dispose() cancels the current job, terminates the worker, and blocks new workers (HASH-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Adjacency, empty-work, and ordering edge cases are explicit: identical inputs get distinct jobIds, cancel/dispose with nothing in flight never throws or constructs a worker, progress is forwarded only for the current job"
    requirement: HASH-04
    verification:
      - kind: unit
        ref: "lib/hash/client.test.ts#gives byte-identical inputs distinct jobIds and cancels the first (HASH-04 adjacency); #cancel() with nothing in flight posts nothing and does not throw (HASH-04 empty); #dispose() before any start() never constructs a worker (HASH-04 empty); #forwards progress only for the current job (HASH-04)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Worker crash and factory failure resolve as error outcomes (never reject), and the next start builds a fresh worker"
    requirement: HASH-04
    verification:
      - kind: unit
        ref: "lib/hash/client.test.ts#recovers from a worker crash with an error outcome and a fresh worker (HASH-04); #resolves (never rejects) with an error outcome when the worker factory throws (HASH-04)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Worker handler protocol: result after final progress with done===total, throttled-but-final progress, empty input posts one result and no progress, same-tick cancel posts cancelled, unknown cancel/message and unsupported input handled"
    requirement: HASH-04
    verification:
      - kind: unit
        ref: "lib/hash/worker-core.test.ts#createWorkerHandler direct protocol (HASH-04)"
        status: pass
    human_judgment: false
  - id: D5
    description: "With the real handler behind a loopback worker, superseding an 8 MiB job with 'abc' makes the worker post cancelled (never result) for job 1 and the published SHA-256 for job 2; a Blob input hashes through the loopback"
    requirement: HASH-04
    verification:
      - kind: unit
        ref: "lib/hash/worker-core.test.ts#loopback worker with real hashing (HASH-04)"
        status: pass
    human_judgment: false
  - id: D6
    description: "HASH-02 privacy prohibition: no posted message (success or error) contains the input text and nothing writes to console.log/error/warn"
    requirement: HASH-04
    verification:
      - kind: unit
        ref: "lib/hash/worker-core.test.ts#never echoes the input text in any posted message or console output (HASH-02 privacy prohibition)"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-10-14
status: complete
---

# Phase 8 Plan 03: Supersede/Cancel/Dispose Protocol Tests Summary

**Deterministic Node tests (FakeWorker plus a real-hashing loopback worker) proving "the latest request wins and nothing stale is ever delivered" for the hash client and worker handler, with the HASH-02 no-echo privacy sentinel**

## Performance

- **Duration:** 3 min
- **Started:** 2026-10-14T19:18:00Z
- **Completed:** 2026-10-14T19:20:30Z
- **Tasks:** 2
- **Files modified:** 2 (2 created)

## Accomplishments
- `client.test.ts` (14 tests): lazy single worker, exact posted order `[start 1, cancel 1, start 2]`, stale result drop, identical-input adjacency, cancel/dispose with and without a job in flight, progress filtered by jobId, worker error/cancelled/unknown messages, `onerror` recovery with a fresh worker, and a throwing factory resolving as an error outcome.
- `worker-core.test.ts` (12 tests): result-after-progress ordering, non-decreasing progress ending at `done === total` (with a `Date.now` spy and with real throttling), empty text/Blob posting one result and no progress, same-tick cancel, unknown cancel/message, unsupported input `TypeError`, `NotReadableError` passthrough, and the `SENTINEL-c0ffee-secret` privacy test plus a file-wide console-silence assertion.
- Loopback proof with real hashing and the default MessageChannel yield: the superseded 8 MiB job is aborted inside the handler (a `cancelled` post, no `result` post for jobId 1) while the superseding job returns the published SHA-256; a Blob job returns CRC32 `352441c2`.
- Closing static gate: `npm run typecheck` and `npx eslint lib/hash` clean; full `npm test` 450 passed (36 files).

## Task Commits

1. **Task 1: Supersede funnel, stale-drop, cancel, dispose, recovery via FakeWorker** - `09c3156` (test)
2. **Task 2: Worker protocol handler tests and loopback end-to-end** - `689290a` (test)

**Plan metadata:** recorded in the follow-up `docs(08-03)` commit.

## Files Created/Modified
- `lib/hash/client.test.ts` - FakeWorker suite for the supersede funnel and client lifecycle
- `lib/hash/worker-core.test.ts` - direct handler protocol tests and loopback worker end-to-end

## Decisions Made
- No production code was touched; neither `lib/hash/client.ts` nor `lib/hash/worker-core.ts` exposed a defect, so their import sets are unchanged for 08-04's boundary guard.
- Otherwise followed the plan as specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test-fixture typing error caught by the static gate**
- **Found during:** Task 2 (`npm run typecheck`)
- **Issue:** `new Blob([encodeText("abc")])` fails TS because `encodeText` returns `Uint8Array<ArrayBufferLike>` while `BlobPart` requires an `ArrayBuffer`-backed view (Vitest strips types so the tests had passed).
- **Fix:** Added an `abcBlob()` helper in `worker-core.test.ts` that casts to `Uint8Array<ArrayBuffer>`; both Blob fixtures use it.
- **Files modified:** lib/hash/worker-core.test.ts
- **Verification:** `npm run typecheck` and `npx eslint lib/hash` exit 0; 26 tests still pass.
- **Committed in:** 689290a

---

**Total deviations:** 1 auto-fixed (test typing)
**Impact on plan:** None on scope or contracts; test-only.

## Issues Encountered
None. No environment repair was needed (`node_modules` was present).

## Known Stubs
None.

## Threat Flags
None. This plan adds tests only; T-8-10, T-8-11, and T-8-12 mitigations are now each pinned by a named passing test.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ROADMAP Phase 8 success criterion 5 (second half) is covered at the protocol level. The test-local `FakeWorker` and `createLoopbackWorker` may be extracted by Phase 9 if the live-typing hook needs them.
- The HASH-02 privacy prohibition now has its planned test-tier check (`SENTINEL-c0ffee-secret`); its status flips from unresolved at verify time.
- 08-04 can assert the import sets of `client.ts` and `worker-core.ts`; neither file changed.

---
*Phase: 08-hash-core-worker-runtime*
*Completed: 2026-10-14*

## Self-Check: PASSED
