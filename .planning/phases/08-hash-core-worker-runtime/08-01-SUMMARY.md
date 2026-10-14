---
phase: 08-hash-core-worker-runtime
plan: 01
subsystem: infra
tags: [web-worker, turbopack, noble-hashes, crc32, playwright, next-16]

requires:
  - phase: 07
    provides: existing Next 16.2.11 app, Playwright and Vitest setup
provides:
  - lib/hash runtime chain (types, crc32, engine, source, job, worker-core, hash.worker, client)
  - HashClient supersede-funnel API (start/cancel/dispose -> HashOutcome) and WorkerRequest/WorkerResponse protocol
  - env-gated /hash-smoke production harness (window.__hashSmoke)
  - playwright.prod.config.ts + test:e2e:prod production-build e2e path
  - "@noble/hashes exact-pinned at 2.4.0, imported only by lib/hash/engine.ts"
affects: [08-02, 08-03, 08-04, 08-05, phase-09, phase-10]

actuals:
  tokens: 6350
  tasks: 1
  commits: 1
plan_head_before: 1e6b9c878c859fa311259b4021d2004d6277bf79
plan_head_after: e884e477540bf60f8b7ec93f516703676644ec96
commits: 1

tech-stack:
  added: ["@noble/hashes 2.4.0 (exact pin)"]
  patterns:
    - "Single-importer dependency seam (engine.ts), mirroring lib/uuid/generate.ts"
    - "Static Turbopack module Worker literal in exactly one place (client.ts)"
    - "Supersede funnel: every start() cancels the in-flight job first; stale jobIds dropped"
    - "Env-gated test-only route (notFound unless HASH_SMOKE=1)"
    - "Separate production-build Playwright config/dir so dev-only e2e can never satisfy the worker proof"

key-files:
  created:
    - lib/hash/types.ts
    - lib/hash/crc32.ts
    - lib/hash/engine.ts
    - lib/hash/source.ts
    - lib/hash/job.ts
    - lib/hash/worker-core.ts
    - lib/hash/hash.worker.ts
    - lib/hash/client.ts
    - app/hash-smoke/page.tsx
    - app/hash-smoke/HashSmoke.tsx
    - playwright.prod.config.ts
    - tests/e2e-prod/hash-worker.spec.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Kept the tracer as one 14-file task: every split would break the end-to-end production-worker verify"
  - "job.ts derives algorithm ids from Object.keys(FACTORIES) so the worker chain does not depend on display metadata (algorithms.ts deferred to 08-02)"
  - "Noble-only marker 'digest() was already called' used for the not-in-main-thread proof; crc32.ts deliberately throws only 'hash was destroyed'"
  - "HashSmoke 'ready' indicator driven by a useSyncExternalStore tied to window.__hashSmoke rather than setState in an effect"

patterns-established:
  - "lib/hash/* files carry a pure, framework-agnostic docblock header (lib/mac/format.ts style); no barrel index.ts"
  - "Worker messages carry only jobId, byte counts, digests, and thrown error name/message - never input text; no console logging"

requirements-completed: [HASH-01, HASH-04]

coverage:
  - id: D1
    description: "A real Turbopack module Web Worker in a Next 16.2.11 production build hashes text 'abc' to the published digest for all 10 algorithms"
    requirement: HASH-04
    verification:
      - kind: e2e
        ref: "tests/e2e-prod/hash-worker.spec.ts#worker returns the published digests for text in a production build (HASH-04, HASH-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "@noble/hashes code is downloaded only by the worker and never appears in main-thread resource timing"
    requirement: HASH-04
    verification:
      - kind: e2e
        ref: "tests/e2e-prod/hash-worker.spec.ts#@noble/hashes ships only in the worker chunk, never in main-thread JS (HASH-04)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Final lib/hash module architecture (engine seam, job, worker-core, supersede-funnel client) with exact-pinned @noble/hashes 2.4.0"
    requirement: HASH-01
    verification:
      - kind: other
        ref: "npm run typecheck && npx eslint lib/hash app/hash-smoke tests/e2e-prod playwright.prod.config.ts && npm test"
        status: pass
    human_judgment: false
  - id: D4
    description: "Unit-level coverage of the supersede funnel, abort timing, and full vector tables (owned by 08-02..08-05, not this tracer)"
    requirement: HASH-01
    verification: []
    human_judgment: true
    rationale: "Only the tracer's 'abc' vectors and the two production e2e proofs exist at this plan; the broader published-vector and client/protocol tests land in later plans of this phase"

duration: 7min
completed: 2026-10-14
status: complete
---

# Phase 8 Plan 01: Hash Core Worker Runtime Tracer Summary

**All 10 hash digests (MD5 through CRC32) computed by a Turbopack-bundled module Web Worker in a Next 16.2.11 production build, with `@noble/hashes@2.4.0` provably absent from main-thread JS**

## Performance

- **Duration:** 7 min
- **Started:** 2026-10-14T19:05:59Z
- **Completed:** 2026-10-14T19:12:34Z (plus resumed commit step on the phase branch)
- **Tasks:** 1 (tracer)
- **Files modified:** 14 (12 created, 2 modified)

## Accomplishments
- End-to-end tracer: `/hash-smoke` page -> `createHashClient` -> static `new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" })` -> `worker-core` -> `job` -> `engine` and back. The production spec confirms the published "abc" digests for all 10 algorithms (exact 10-key map).
- `@noble/hashes` is exact-pinned at 2.4.0 and imported only by `lib/hash/engine.ts`; a second production spec proves the noble-bearing chunk is fetched (non-vacuously, by the noble-only marker string) but is absent from main-thread resource timing.
- Final module architecture laid down for the remaining phase plans: typed `FACTORIES` seam, hand-rolled incremental IEEE CRC32, chunked byte/Blob sources, abortable job with MessageChannel yield, throttled progress (100 ms), and a supersede-funnel client.
- Production-build e2e path (`playwright.prod.config.ts`, `npm run test:e2e:prod`, port 3101, `reuseExistingServer: false`) so a dev server can never satisfy the worker proof.

## Task Commits

1. **Task 1: Tracer - text hashed by a Turbopack module Worker in a production build** - `e884e47` (feat)

**Plan metadata:** recorded in the follow-up `docs(08-01)` commits (SUMMARY, then STATE/ROADMAP/REQUIREMENTS).

## Files Created/Modified
- `lib/hash/types.ts` - AlgorithmId, Hasher, Digests, HashInput, WorkerRequest/WorkerResponse contracts
- `lib/hash/crc32.ts` - incremental IEEE CRC32, single-use semantics matching noble
- `lib/hash/engine.ts` - sole `@noble/hashes` importer; typed `FACTORIES` map (SHA3 only, never Keccak)
- `lib/hash/source.ts` - `encodeText` UTF-8 choke point (no trim/normalize), `bytesChunks`, `blobChunks`
- `lib/hash/job.ts` - `runHashJob` (abort, progress, yield), `hashBytes`, `hashText`
- `lib/hash/worker-core.ts` - protocol handler with per-job AbortController, throttled progress, privacy-safe errors
- `lib/hash/hash.worker.ts` - 3-line worker entry adapter
- `lib/hash/client.ts` - supersede-funnel client and the only Worker construction literal
- `app/hash-smoke/page.tsx` - HASH_SMOKE=1-gated, noindex harness route (Phase 9 removes it)
- `app/hash-smoke/HashSmoke.tsx` - client island exposing `window.__hashSmoke`
- `playwright.prod.config.ts` - production build + start on 3101
- `tests/e2e-prod/hash-worker.spec.ts` - published-digest proof and noble-not-in-main-thread proof
- `package.json` / `package-lock.json` - `@noble/hashes` 2.4.0 exact pin, `test:e2e:prod` script

## Decisions Made
- Tracer kept as a single 14-file task (justified in the plan: any split breaks the end-to-end verify).
- `job.ts` takes algorithm ids from `Object.keys(FACTORIES)`; display metadata (`algorithms.ts`) and `format.ts` deferred to 08-02.
- Followed plan otherwise as specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Environment repair beyond the planned `node_modules` rebuild**
- **Found during:** Task 1 (L1+L2 typecheck gate)
- **Issue:** The planned `rm -rf node_modules && npm ci` cleared the 183 iCloud ` 2` duplicates, but the gitignored `.next` directory carried the same duplicates (`.next/types/cache-life.d 2.ts`, `routes.d 2.ts`), causing `tsc` duplicate-identifier errors.
- **Fix:** Removed the gitignored `.next` build artifact (regenerated by the next build).
- **Files modified:** none tracked (`.next` is gitignored)
- **Verification:** `npm run typecheck` clean afterwards; `find node_modules -maxdepth 3 -name '* 2'` prints nothing.
- **Committed in:** n/a (untracked build output)

**2. [Rule 1 - Bug] `react-hooks/set-state-in-effect` lint error in the harness client island**
- **Found during:** Task 1 (eslint gate for app/hash-smoke)
- **Issue:** The planned `useEffect` that created the client and called `setReady(true)` is rejected by the repo's ESLint config.
- **Fix:** Replaced the state flag with a small `useSyncExternalStore` store that tracks `window.__hashSmoke`, so "ready" flips only once the client is actually exposed. `data-testid="hash-smoke-ready"` and the "ready"/"loading" text are unchanged.
- **Files modified:** app/hash-smoke/HashSmoke.tsx
- **Verification:** `npx eslint lib/hash app/hash-smoke tests/e2e-prod playwright.prod.config.ts` clean; `npm run test:e2e:prod` 2 passed.
- **Committed in:** e884e47

---

**Total deviations:** 2 auto-fixed (1 blocking environment, 1 lint bug)
**Impact on plan:** Both necessary to get the gates green; no scope creep and no contract change.

## Issues Encountered
- The first commit attempt was blocked by the protected-branch HEAD assertion (work was on `main`). Execution halted and was resumed on the user-chosen `gsd/phase-08-hash-core-worker-runtime` branch; no config was changed.
- The iCloud-synced repo location can reintroduce ` 2` duplicates in `node_modules` and `.next`; moving the repo is a user decision (08-RESEARCH Open Question 3) and was not done.

## Verification Results
- `npm run test:e2e:prod`: 2 passed (production build + start on port 3101, HASH_SMOKE=1)
- `npm run typecheck`: clean
- `npx eslint lib/hash app/hash-smoke tests/e2e-prod playwright.prod.config.ts`: clean
- `npm test`: 268 passed (28 files), re-run after the final HashSmoke change
- All 18 acceptance-criteria checks pass (exact pin, next 16.2.11, single noble importer, single Worker literal, type-only client imports, single TextEncoder, gated harness, noble marker unique to noble)

## Known Stubs

None. `app/hash-smoke` is an intentional, env-gated test harness scheduled for removal in Phase 9.

## Threat Flags

None beyond the plan's threat model (T-8-01 mitigated via `notFound()` gate, noindex metadata, and no registry/sitemap/nav entry).

## User Setup Required

None - no external service configuration required. `HASH_SMOKE` is a test-only build flag and must never be set in Vercel.

## Next Phase Readiness
- Ready for 08-02 (algorithm metadata, hex/Base64 formatting, published-vector and SHA3-vs-Keccak tests) on top of the final module architecture.
- Re-run the worker smoke test on any Next.js bump and re-check the noble marker string on any `@noble/hashes` bump.

---
*Phase: 08-hash-core-worker-runtime*
*Completed: 2026-10-14*

## Self-Check: PASSED
