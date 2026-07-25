---
phase: 02-uuid-generator
plan: 01
subsystem: ui
tags: [nextjs, uuid, ssr-false, hydration, playwright, vitest, fast-check, tool-page]

requires:
  - phase: 01-shared-shell-registry
    provides: tools/registry.ts (SHELL-04), useCopyToClipboard hook, SiteHeader/MobileNav registry-driven nav, app/sitemap.ts registry-driven sitemap
provides:
  - "lib/uuid/generate.ts: framework-agnostic generateBatch/generateOne (v4/v7, defensively clamped 1-100)"
  - "app/tools/uuid/page.tsx + UuidToolLoader.tsx + UuidTool.tsx: first tool page, three-file Server-shell/ssr:false-loader/client-island split"
  - "tools/registry.ts uuid entry flipped to status:active, exercising the registry-driven nav/sitemap active-tool code paths for the first time"
affects: [02-02-uuid-controls, 02-03-uuid-seo, 02-04-uuid-export]

tech-stack:
  added: ["uuid@14.0.1 (exact-pinned)"]
  patterns:
    - "next/dynamic(..., {ssr:false}) client-only render boundary for CSPRNG-derived first-paint values, wrapped in a dedicated \"use client\" loader file (ssr:false is illegal directly in a Server Component)"
    - "Three-file tool-page split: Server Component page.tsx (shell/metadata) -> \"use client\" *Loader.tsx (dynamic ssr:false wrapper) -> \"use client\" *Tool.tsx (interactive island)"

key-files:
  created:
    - lib/uuid/generate.ts
    - lib/uuid/generate.test.ts
    - app/tools/uuid/page.tsx
    - app/tools/uuid/UuidToolLoader.tsx
    - app/tools/uuid/UuidTool.tsx
    - tests/e2e/uuid.spec.ts
  modified:
    - tools/registry.ts
    - tools/registry.test.ts
    - app/sitemap.test.ts
    - tests/e2e/home.spec.ts
    - tests/e2e/navigation.spec.ts
    - package.json
    - package-lock.json

key-decisions:
  - "uuid pinned to an exact version (14.0.1, no caret) rather than package.json's usual ^-range convention, per threat_model T-02-SC's explicit 'pin the exact version' mitigation for a package pulled into the client bundle."
  - "Registry-flip fallout: four pre-existing tests (tools/registry.test.ts, app/sitemap.test.ts, tests/e2e/home.spec.ts, tests/e2e/navigation.spec.ts) encoded a literal 'every tool is planned' Phase-1 assumption that the plan's own status:active flip broke; updated all four in place to assert uuid=active / others=planned rather than leaving the suite red."

patterns-established:
  - "Client-only render via next/dynamic({ssr:false}) is now the established fix for any future tool whose first-paint value is non-deterministic between server and client (subnet/DNS/MAC will not need this since they require input first, but any future zero-input random-value tool should follow this exact shape)."

requirements-completed: [UUID-01]

coverage:
  - id: D1
    description: "A visitor loading /tools/uuid immediately sees a valid v4 UUID with zero required input, and the served static HTML shows only the loading skeleton (never a baked-in UUID) — no hydration-mismatch flicker is possible."
    requirement: "UUID-01"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#loads a v4 UUID immediately"
        status: pass
      - kind: other
        ref: "npm run build && npm run start && curl -s http://localhost:3000/tools/uuid — grep confirmed only uuid-hero-skeleton present, no uuid-hero-value node and no baked-in UUID pattern in the static HTML"
        status: pass
    human_judgment: false
  - id: D2
    description: "The hero UUID can be copied with a one-click button that shows a visible 'Copied!' icon+label swap and an aria-live-announced confirmation for screen readers."
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#copies the hero value with a visible + announced confirmation"
        status: pass
    human_judgment: false
  - id: D3
    description: "lib/uuid/generate.ts is framework-agnostic (no React/Next import), delegates exclusively to the uuid package's CSPRNG-backed v4()/v7(), and defensively clamps count to the integer range [1,100] so it never throws regardless of caller input."
    requirement: "UUID-01"
    verification:
      - kind: unit
        ref: "lib/uuid/generate.test.ts (11 tests: v4/v7 validity+version, batch boundaries 0/1/100/101, canonical form, fast-check distinctness property)"
        status: pass
    human_judgment: false
  - id: D4
    description: "tools/registry.ts uuid entry is status:active, and the registry-derived nav (SiteHeader/MobileNav) and sitemap.xml pick up /tools/uuid automatically with no hand-edit to nav/sitemap components (SHELL-04)."
    verification:
      - kind: unit
        ref: "app/sitemap.test.ts#contains exactly the /tools/* entries for 'active' registry tools"
        status: pass
      - kind: e2e
        ref: "tests/e2e/navigation.spec.ts#hamburger trigger is visible; opening reveals all tool shortNames..."
        status: pass
      - kind: e2e
        ref: "tests/e2e/home.spec.ts#each 'planned' card shows a muted 'Coming soon' badge; the 'active' uuid card does not"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-23
status: complete
---

# Phase 2 Plan 01: UUID Hero Page (Walking Skeleton) Summary

**First tool page shipped: /tools/uuid renders a v4 UUID instantly via a next/dynamic(ssr:false) client-only boundary, with a one-click copy button reusing Phase 1's useCopyToClipboard, and the registry-driven nav/sitemap now surface the tool automatically.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-23T17:49:17+02:00
- **Completed:** 2026-07-23T17:55:33+02:00
- **Tasks:** 3 completed
- **Files modified:** 13 (6 created, 7 modified)

## Accomplishments

- Delivered UUID-01 end-to-end: a visitor loading `/tools/uuid` instantly sees a valid, copyable v4 UUID with zero required input and no hydration-mismatch flicker.
- Locked in the phase's central architectural pattern — `next/dynamic(..., { ssr: false })` inside a dedicated `"use client"` loader file — as the fix for CSPRNG-derived first-paint values, verified live by curling the built static HTML and confirming only the skeleton (never a baked-in UUID) is served.
- Shipped the framework-agnostic `lib/uuid/generate.ts` (v4/v7 batch generation, defensively clamped, property-tested with fast-check) that every later plan in this phase builds on.
- Flipped `tools/registry.ts`'s uuid entry to `status: "active"`, exercising the Phase 1 registry-driven nav/sitemap "active tool" code paths for the first time in this project.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install uuid + write the failing end-to-end happy-path test (RED)** - `f0fe7f1` (test)
2. **Task 2: lib/uuid/generate.ts — framework-agnostic v4/v7/batch generation (TDD)**
   - RED - `f4c7fb1` (test)
   - GREEN - `e85cc0e` (feat)
3. **Task 3: Tool-page split (Server shell + ssr:false loader + hero island) + registry flip (GREEN)** - `f4670f7` (feat)

**Plan metadata:** (pending — final `docs(02-01)` commit, see below)

## Files Created/Modified

- `lib/uuid/generate.ts` - Framework-agnostic `generateBatch`/`generateOne`; delegates to `uuid`'s CSPRNG-backed `v4()`/`v7()`, clamps count to [1,100]
- `lib/uuid/generate.test.ts` - Vitest + `@fast-check/vitest` property tests (11 tests)
- `app/tools/uuid/page.tsx` - Server Component page shell + minimal metadata (title mentions both v4/v7 per D-12)
- `app/tools/uuid/UuidToolLoader.tsx` - `next/dynamic(ssr:false)` boundary + fixed-height skeleton (CLS-free)
- `app/tools/uuid/UuidTool.tsx` - Hero v4 UUID + copy button (IpBadge-pattern icon+label swap, aria-live status, error fallback copy)
- `tests/e2e/uuid.spec.ts` - Playwright spec: hero load + copy-with-confirmation
- `tools/registry.ts` - uuid entry `status: "planned"` -> `"active"`
- `tools/registry.test.ts` - Updated stale "every entry is planned" assertion to reflect uuid=active
- `app/sitemap.test.ts` - Updated stale "no /tools/* entries" assertion to expect `/tools/uuid`
- `tests/e2e/home.spec.ts` - Updated "Coming soon" badge assertion to skip the now-active uuid card
- `tests/e2e/navigation.spec.ts` - Updated mobile-drawer anchor-count assertion (0 -> 1) for the now-navigable uuid link
- `package.json` / `package-lock.json` - Added `uuid@14.0.1` (exact-pinned)

## Decisions Made

- **Exact-pin `uuid`, not a caret range:** `package.json`'s existing convention mixes exact pins (next/react/react-dom) and caret ranges (everything else); `uuid` was pinned exact (`14.0.1`) specifically because threat_model T-02-SC calls this out as the mitigation for a third-party package shipped into the client bundle. Other deps in this plan continue the project's existing convention unchanged.
- **Registry-flip test fallout fixed in place, not deferred:** flipping `status: "planned" -> "active"` on the uuid registry entry is an explicit, required plan action (SHELL-04 verification), and it broke four pre-existing tests that had literally asserted "every registry tool is planned" as a Phase-1-only invariant. Rather than leave `npm test`/`npm run test:e2e` red (violating the plan's own `<verification>` gate) or skip/delete the tests, all four were updated in place to assert the new, correct steady-state (uuid=active, the other three=planned) — this is exactly the invariant Phase 1 built the dual-mode nav/card/sitemap logic to support.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Four pre-existing tests broke on the plan's own registry status flip**
- **Found during:** Task 3 (`npm test && npm run test:e2e` verification step)
- **Issue:** `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, and `tests/e2e/navigation.spec.ts` all contained an assertion hard-coded to Phase 1's "every tool is `planned`" state. Flipping the uuid entry to `active` (an explicit, required Task 3 action) made these four assertions factually wrong, not the new code.
- **Fix:** Updated each assertion to the new steady-state truth: uuid is `active` (visible in sitemap, no "Coming soon" badge, real nav links with `href`), the other three tools remain `planned` (unchanged behavior). No production code changed as part of this fix — only test expectations.
- **Files modified:** `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts`
- **Verification:** `npm test` (51/51 passing) and full `npx playwright test` (13/13 passing) both green after the fix.
- **Committed in:** `f4670f7` (part of the Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Necessary correctness fix directly caused by the plan's own mandated registry-status change; no scope creep, no production-code behavior change beyond what Task 3 already specified.

## Issues Encountered

- A stale dev server left over from the Task 1 RED verification (`reuseExistingServer: true` in `playwright.config.ts`) caused the first Task 3 e2e run to 404 against pre-Task-3 code. Resolved by killing the process on port 3000 before re-running; not a code defect, no fix needed beyond restarting the server.
- A stale `.next/types` cache produced spurious `tsc --noEmit` duplicate-declaration errors unrelated to any file touched this plan; resolved by `rm -rf .next` before the real typecheck run (ephemeral, gitignored build artifact — no source change).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/uuid/generate.ts` is ready for 02-02 to build version-switch/case/hyphen controls directly on top of `generateBatch`.
- The three-file Server-shell/`ssr:false`-loader/client-island pattern established here is the template 02-02/02-03/02-04 extend in place (same files, no new page-level architecture needed).
- No blockers identified for 02-02.

---
*Phase: 02-uuid-generator*
*Completed: 2026-07-23*

## Self-Check: PASSED

All created files verified present on disk (`lib/uuid/generate.ts`, `lib/uuid/generate.test.ts`, `app/tools/uuid/page.tsx`, `app/tools/uuid/UuidToolLoader.tsx`, `app/tools/uuid/UuidTool.tsx`, `tests/e2e/uuid.spec.ts`); all 4 task commit hashes (`f0fe7f1`, `f4c7fb1`, `e85cc0e`, `f4670f7`) verified present in `git log`.
