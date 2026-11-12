---
phase: 09-hash-tool-page-text-hashing
plan: 02
subsystem: testing
tags: [web-worker, hashing, resilience, vitest]
requires:
  - phase: 08-hash-core-worker-runtime
    provides: createHashClient supersede funnel, WorkerLike seam
provides:
  - "HashClient.start() never rejects: a throwing start postMessage resolves an error outcome (WR-01)"
  - "Worker messageerror settles the in-flight job, terminates the worker and rebuilds on next start (WR-02)"
affects: [09-03, 09-07, 09-09]
actuals:
  tokens: 1850
  tasks: 1
  commits: 2
plan_head_before: 707e00145f0bda454f81eba45df2d9a827a9437c
plan_head_after: eff2f65cd09b4cc1b3556b46e44c113ecac81cf5
tech-stack:
  added: []
  patterns:
    - "Optional WorkerLike.onmessageerror keeps other WorkerLike implementers valid"
    - "Error outcomes built only from the thrown error or fixed strings (never the input)"
key-files:
  created: []
  modified:
    - lib/hash/client.ts
    - lib/hash/client.test.ts
key-decisions:
  - "onmessageerror is optional on WorkerLike so worker-core loopback test needs no edit"
  - "postMessage throw does not terminate the worker (input problem); messageerror does (channel unusable)"
requirements-completed: [TEXT-02]
coverage:
  - id: D1
    description: "start() resolves an error outcome instead of rejecting when postMessage throws; slot cleared, late message dropped, next job id 2 works"
    requirement: TEXT-02
    verification:
      - kind: unit
        ref: "lib/hash/client.test.ts#WR-01 cases (3)"
        status: pass
    human_judgment: false
  - id: D2
    description: "messageerror settles the job, terminates the worker, next start() builds a fresh worker; safe with no job in flight"
    requirement: TEXT-02
    verification:
      - kind: unit
        ref: "lib/hash/client.test.ts#WR-02 cases (2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Error outcomes never contain the input text"
    verification:
      - kind: unit
        ref: "lib/hash/client.test.ts#T-09-07 sentinel case"
        status: pass
    human_judgment: false
duration: 3min
completed: 2026-10-15
status: complete
---

# Phase 9 Plan 02: Hash client hardening Summary

**`createHashClient.start()` can no longer reject or hang: a throwing start `postMessage` resolves an error outcome, and a worker `messageerror` settles the job, terminates the worker and rebuilds on the next start (WR-01, WR-02).**

## Performance

- **Duration:** 3 min
- **Tasks:** 1 (tracer, TDD)
- **Files modified:** 2

## Accomplishments

- WR-01: the start `postMessage` is wrapped in try/catch inside the Promise executor; the outcome carries the thrown error's name/message (or `Error` / `Worker postMessage failed`). The worker stays up and the next job posts `jobId: 2` on the same worker.
- WR-02: `ensureWorker()` assigns `onmessageerror`, mirroring the existing `onerror` teardown with the fixed message `Unreadable worker message`.
- 6 new regression cases on the FakeWorker harness (3 WR-01, 2 WR-02, 1 sentinel-input check for T-09-07).

## Task Commits

1. Task 1 (tracer): `f1878b6` test (RED), `eff2f65` fix (GREEN)

## Deviations from Plan

None - plan executed exactly as written. The tracer gate passed: the `<verify>` commands were re-run end-to-end after GREEN (client, worker-core, boundaries: 42 tests; engine, job, source, format, algorithms, crc32: 156 tests; typecheck and eslint clean) before finishing.

## Issues Encountered

None. `.next/dev` was removed once before typecheck as a precaution against iCloud duplicate files.

## Known Stubs

None.

## Threat Flags

None. T-09-05 (messageerror teardown), T-09-06 (start never rejects), T-09-07 (no input echo, sentinel-tested) and T-09-SC (package.json/lock untouched) are mitigated and tested. `worker-core.ts`, `worker-core.test.ts` and `hash.worker.ts` are unchanged; `client.ts` still has a single type-only import.

## Verification

- `npx vitest run lib/hash/client.test.ts lib/hash/worker-core.test.ts lib/hash/boundaries.test.ts`: 42 pass.
- Remaining Phase 8 suites: 156 pass.
- `npm run typecheck` and `npx eslint lib/hash`: clean.
- `test:e2e:prod` intentionally not run (shared `.next`); 09-09's phase gate re-proves the production worker.

## Self-Check: PASSED

lib/hash/client.ts and lib/hash/client.test.ts exist; commits f1878b6 and eff2f65 are ancestors of HEAD.
