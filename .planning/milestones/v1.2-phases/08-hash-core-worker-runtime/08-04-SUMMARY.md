---
phase: 08-hash-core-worker-runtime
plan: 04
subsystem: testing
tags: [eslint, no-restricted-imports, vitest, import-graph, playwright, noble-hashes, web-worker]

requires:
  - phase: 08-hash-core-worker-runtime
    provides: "08-01 engine chain (engine/job/worker-core/hash.worker/client) and the /hash-smoke gated harness"
provides:
  - "ESLint flat-config block: @noble/hashes importable only from lib/hash/engine.ts"
  - "lib/hash/boundaries.test.ts source-walk guard with in-memory injected-mutation proofs"
  - "app/hash-smoke/page.test.tsx harness gate unit test"
  - "tests/e2e/hash-smoke-gate.spec.ts dev-server 404 proof"
affects: [08-05, phase-09-hash-ui, phase-10]

actuals:
  tokens: 4300
  tasks: 2
  commits: 2
plan_head_before: e5c71cb656b8cabe7abb98d845134b30934e74ec
plan_head_after: 089f27445378160bd20c80c925d6512f6d3091ba

tech-stack:
  added: []
  patterns:
    - "Pure import-graph analysis (analyze(sources)) over a Map of POSIX path to text, so mutation tests run in memory"
    - "Injected-mutation tests committed as permanent guard-has-teeth proofs, no tracked file edited"

key-files:
  created:
    - lib/hash/boundaries.test.ts
    - app/hash-smoke/page.test.tsx
    - tests/e2e/hash-smoke-gate.spec.ts
  modified:
    - eslint.config.mjs

key-decisions:
  - "Specifier regex covers from-imports, bare imports, dynamic import() and require(), so lint bypass via dynamic forms is still caught (T-8-15)"
  - "boundaries.test.ts excludes itself from the walk because it contains the patterns it searches for"

patterns-established:
  - "Engine chain enforced twice: ESLint for noble imports, source-walk test for importer sets of engine/job/worker-core and the single Worker literal"

requirements-completed: [HASH-04]

coverage:
  - id: D1
    description: "Importing @noble/hashes outside lib/hash/engine.ts is an ESLint error; engine.ts is exempt"
    requirement: HASH-04
    verification:
      - kind: other
        ref: "npx eslint --stdin probes: app/noble-probe.ts reports no-restricted-imports, lib/hash/engine.ts clean; npm run lint exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Source-walk test proves engine reachable only via hash.worker -> worker-core -> job -> engine, client.ts imports only types, single Worker literal, with non-vacuity checks"
    requirement: HASH-04
    verification:
      - kind: unit
        ref: "lib/hash/boundaries.test.ts#hash engine import boundaries (HASH-04)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Guard detects an engine import in client.ts, a dynamic import of job.ts from UI, and a require() of @noble/hashes (in-memory mutations)"
    requirement: HASH-04
    verification:
      - kind: unit
        ref: "lib/hash/boundaries.test.ts#boundary guard has teeth - injected mutations in memory (HASH-04)"
        status: pass
    human_judgment: false
  - id: D4
    description: "/hash-smoke returns notFound for every HASH_SMOKE value other than '1', renders the island for '1', is noindex/nofollow, and is absent from registry/sitemap/nav"
    requirement: HASH-04
    verification:
      - kind: unit
        ref: "app/hash-smoke/page.test.tsx#/hash-smoke harness gate (HASH-04)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Dev server answers GET /hash-smoke with 404 and renders no harness without the flag"
    requirement: HASH-04
    verification:
      - kind: e2e
        ref: "tests/e2e/hash-smoke-gate.spec.ts#hash-smoke harness is 404 without HASH_SMOKE=1 (HASH-04)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-10-14
status: complete
---

# Phase 8 Plan 04: Engine Boundary Guard and Harness Gate Summary

**ESLint `no-restricted-imports` plus a source-walk import-graph test (with in-memory mutation proofs) keep @noble/hashes and the engine chain out of initial page JS, and unit plus dev-server tests prove /hash-smoke is 404 without HASH_SMOKE=1.**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-10-14T19:22:28Z
- **Tasks:** 2
- **Files modified:** 4 (1 modified, 3 created)

## Accomplishments
- `@noble/hashes` outside `lib/hash/engine.ts` is now an ESLint error; the engine file itself lints clean.
- `lib/hash/boundaries.test.ts` asserts importer sets: noble importers are exactly `[engine.ts]`, engine importers `[job.ts]`, job importers `[worker-core.ts]`, worker-core importers `[hash.worker.ts]`, every `client.ts` import resolves to `lib/hash/types`, and the Worker literal lives only in `client.ts`; includes non-vacuity checks (at least 8 files under lib/hash, engine's sha2/sha3/legacy subpaths seen).
- Three injected-mutation cases (engine import appended to client.ts, dynamic `import()` of job from `components/Probe.tsx`, `require()` of noble from `app/probe.ts`) are all detected, and each mutant result differs from the real-tree result; the real tree passes every assertion. No tracked file was edited for the proof.
- Harness gate proven: every non-"1" HASH_SMOKE value (unset, "", "0", "true", " 1") calls `notFound()`, "1" renders `HashSmoke`, robots is `{ index: false, follow: false }`, and registry/sitemap/SiteHeader/MobileNav never mention `hash-smoke`; the dev server returns 404 with no harness testid.

## Task Commits

1. **Task 1: Lint rule and source-walk import-graph guard** - `6cb7668` (feat)
2. **Task 2: Harness gate unit test and dev-server 404 e2e** - `089f274` (test)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified
- `eslint.config.mjs` - flat-config block restricting `@noble/hashes` imports (ignores `lib/hash/engine.ts`)
- `lib/hash/boundaries.test.ts` - pure `analyze()` source-walk guard plus in-memory mutation tests
- `app/hash-smoke/page.test.tsx` - env-gate, metadata, and nav/registry/sitemap absence tests
- `tests/e2e/hash-smoke-gate.spec.ts` - Playwright 404 check on the default dev-server suite

## Decisions Made
- Specifier regex handles from, bare import, dynamic `import()`, and `require()` so lint-bypass forms are still caught by the walk.
- The test excludes itself from the walk because it contains the patterns it searches for.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. `npm run lint` shows one pre-existing warning (`MacVendorRouteResponse` unused in `lib/mac/vendor.ts`), unrelated and out of scope. `npm run typecheck` is clean.

## Verification
- `npx vitest run lib/hash/boundaries.test.ts`: 10 passed
- `npx vitest run app/hash-smoke/page.test.tsx`: 11 passed
- ESLint stdin probes: violation reported for `app/noble-probe.ts`; `lib/hash/engine.ts` clean
- `npm run lint`: 0 errors; `npm run typecheck`: clean
- `npx playwright test tests/e2e/hash-smoke-gate.spec.ts`: 1 passed
- This plan's commits touch no `lib/hash/client.ts`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 08-05 can re-run `boundaries.test.ts` over the merged tree; the HASH-04 prohibition now has passing test-tier checks for verify time.

## Self-Check: PASSED

---
*Phase: 08-hash-core-worker-runtime*
*Completed: 2026-10-14*
