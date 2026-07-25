---
phase: 02-uuid-generator
plan: 02
subsystem: ui
tags: [nextjs, uuid, shadcn, radix-ui, keyboard-shortcuts, playwright, vitest, fast-check]

requires:
  - phase: 02-uuid-generator
    provides: "02-01: lib/uuid/generate.ts (generateBatch/generateOne), the three-file Server-shell/ssr:false-loader/client-island tool-page split, tools/registry.ts uuid=active"
provides:
  - "lib/uuid/format.ts: framework-agnostic formatUuids(uuids, {case, hyphens}) — pure reformat, no generator import, hyphen re-application via strip-then-reinsert at canonical 8-4-4-4-12 positions"
  - "UuidTool.tsx extended with version (v4/v7) ToggleGroup, live batch-count Input (1-100, clamped, inline out-of-range hint), always-visible Regenerate button, case/hyphens Switches, hero-vs-scroll-list display branch at count=2"
  - "First live wiring of Phase 1's useKeyboardShortcut hook: / focuses batch-count input, Enter regenerates, Ctrl/Cmd+C copies the primary value"
  - "components/ui/{toggle-group,toggle,switch,input,label,scroll-area}.tsx — generated shadcn primitives, no new npm dependency (all import from the already-installed radix-ui package)"
affects: [02-03-uuid-seo, 02-04-uuid-export]

tech-stack:
  added: []
  patterns:
    - "Single-source-of-truth state discipline (Pitfall 4): rawUuids regenerated ONLY on version switch/batch-count change/Regenerate; displayed strings always derived via formatUuids(rawUuids, {case, hyphens}) computed fresh on every render — case/hyphen toggles never call generateBatch"
    - "Reformat-by-reconstruction: format.ts always strips existing hyphens before conditionally reinserting them at fixed positions, rather than conditionally removing only — this makes the transform correct and symmetric in both directions instead of a one-way strip"

key-files:
  created:
    - lib/uuid/format.ts
    - lib/uuid/format.test.ts
    - components/ui/toggle-group.tsx
    - components/ui/toggle.tsx
    - components/ui/switch.tsx
    - components/ui/input.tsx
    - components/ui/label.tsx
    - components/ui/scroll-area.tsx
  modified:
    - app/tools/uuid/UuidTool.tsx
    - tests/e2e/uuid.spec.ts

key-decisions:
  - "format.ts implements hyphen toggling as strip-then-conditionally-reinsert-at-fixed-positions (not a one-way replaceAll removal) — this is what makes the hyphens:false -> hyphens:true round trip restore the byte-identical original value, satisfying the plan's literal round-trip property in both directions."
  - "Batch-count validation uses a separate `countInput` (raw typed string) state from the clamped `count` used for generation — the input always reflects exactly what the user typed (including invalid values), while `rawUuids`/`count` only update on a valid parse, per the Copywriting Contract's 'generation never blocked' requirement."

patterns-established:
  - "useKeyboardShortcut's first real consumer confirms the hook's unbound-safe/ref-based design works end-to-end with a genuine primary input (batch-count) — later tool pages (Subnet/DNS/MAC) can follow this exact wiring shape."

requirements-completed: [UUID-02, UUID-03, UUID-04]

coverage:
  - id: D1
    description: "Switching UUID version (v4<->v7) immediately regenerates fresh value(s) in the new version — never reformats an existing value into the other version (D-01, UUID-02)."
    requirement: "UUID-02"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#switches to v7 and regenerates a fresh, structurally different value"
        status: pass
      - kind: unit
        ref: "lib/uuid/generate.test.ts (02-01, unchanged) confirms generateBatch({version:'v7',...}) always returns structurally valid v7 values"
        status: pass
    human_judgment: false
  - id: D2
    description: "A visible Regenerate control is always present near the result, and the global Enter shortcut also triggers regeneration (D-03, UUID-03)."
    requirement: "UUID-03"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#regenerate produces a new value"
        status: pass
    human_judgment: false
  - id: D3
    description: "Changing the batch count regenerates the batch live as the count changes, clamped to 1-100 with an inline out-of-range hint and no generation blocking (D-04, UUID-03)."
    requirement: "UUID-03"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#generates a batch of N and scrolls a 100-row batch without page horizontal scroll"
        status: pass
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#out-of-range batch count shows the inline hint and keeps the last valid batch"
        status: pass
    human_judgment: false
  - id: D4
    description: "Toggling case or hyphens reformats the values already on screen in place, byte-identical round trip on double-toggle, never regenerating (D-02, UUID-04)."
    requirement: "UUID-04"
    verification:
      - kind: unit
        ref: "lib/uuid/format.test.ts (7 tests incl. fast-check round-trip and commutativity properties)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#case/hyphen toggles reformat in place without regenerating (D-02 round trip)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Batch count = 1 shows the single hero display; count 2-100 switches to the max-h-96 scrollable list at one deterministic branch point (D-05)."
    requirement: "UUID-03"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#generates a batch of N and scrolls a 100-row batch without page horizontal scroll"
        status: pass
    human_judgment: false
  - id: D6
    description: "/ focuses the batch-count input, resolving CONTEXT.md's flagged keyboard-shortcut discretion per UI-SPEC A1."
    requirement: "UUID-03"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#/ focuses the batch-count input"
        status: pass
    human_judgment: false
  - id: D7
    description: "320px visual backstops: the hero value wraps (hyphens on/off) and a 100-row batch scrolls inside max-h-96 with no page-level horizontal scroll."
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#hero value wraps without horizontal scroll at 320px, hyphens on and off / a full 100-row batch scrolls within its container at 320px without page horizontal scroll"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-07-23
status: complete
---

# Phase 2 Plan 02: UUID Controls (Version, Batch, Regenerate, Case/Hyphens) Summary

**Extended the read-only UUID hero into a full generator: v4/v7 version toggle, a live 1-100 batch count with inline validation, an always-visible Regenerate control, and case/hyphen switches that reformat in place — with `lib/uuid/format.ts` locking the regenerate-vs-reformat distinction (D-01/D-02) as a pure, order-independent, round-trip-safe transform.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-23T17:59:42+02:00
- **Completed:** 2026-07-23T18:04:31+02:00
- **Tasks:** 3 completed
- **Files modified:** 9 (8 created, 1 modified across generate steps; net: 6 created shadcn primitives, 1 created lib module + test, 2 modified)

## Accomplishments

- Delivered UUID-02/UUID-03/UUID-04 end-to-end: version switching always regenerates fresh values, batch count 1-100 regenerates live with an inline out-of-range hint, Regenerate (button + Enter) always works, and case/hyphens toggle reformats the on-screen value in place with a byte-identical round trip — never re-triggering randomness.
- Shipped `lib/uuid/format.ts`, a framework-agnostic pure transform (no React/Next/uuid import) whose hyphen handling strips-then-conditionally-reinserts at fixed canonical positions, making both toggle directions (on->off->on and off->on->off) true reformats rather than a one-way removal — verified via fast-check round-trip and commutativity properties.
- Generated 6 shadcn primitives (`toggle-group`, `toggle`, `switch`, `input`, `label`, `scroll-area`) with zero new npm dependencies — all resolve to the already-installed `radix-ui` package.
- Wired Phase 1's `useKeyboardShortcut` hook live for the first time in this project: `/` focuses the batch-count input (resolving CONTEXT.md's flagged discretion per UI-SPEC A1), `Enter` regenerates, `Ctrl/Cmd+C` copies the primary value.
- Established the hero-vs-scroll-list display branch (D-05) at the single deterministic count===1 boundary, backed by `ScrollArea` (`max-h-96`) for 2-100 rows, verified at 320px with a full 100-row batch causing no page-level horizontal scroll.

## Task Commits

Each task was committed atomically:

1. **Task 1: lib/uuid/format.ts — case + hyphen reformat (TDD)**
   - RED - `39f5217` (test)
   - GREEN - `95e812d` (feat)
2. **Task 2: Generate shadcn primitives + wire version/batch/regenerate/case/hyphen controls + keyboard shortcuts** - `3e9bed0` (feat)
3. **Task 3: Extend e2e spec — version switch, batch, regenerate, reformat, keyboard** - `aae6169` (test)

**Plan metadata:** (pending — final `docs(02-02)` commit, see below)

## Files Created/Modified

- `lib/uuid/format.ts` - Pure `formatUuids(uuids, {case, hyphens})`; no React/Next/uuid import; hyphen strip-then-reinsert at canonical positions
- `lib/uuid/format.test.ts` - Vitest + `@fast-check/vitest` (7 tests: canonical passthrough, uppercase, hyphen removal, totality, case round-trip, hyphen round-trip, commutativity)
- `components/ui/toggle-group.tsx`, `toggle.tsx` - shadcn-generated version segmented control primitive
- `components/ui/switch.tsx` - shadcn-generated case/hyphens toggle primitive
- `components/ui/input.tsx` - shadcn-generated batch-count text input primitive
- `components/ui/label.tsx` - shadcn-generated form-control label primitive
- `components/ui/scroll-area.tsx` - shadcn-generated batch-list scroll container primitive
- `app/tools/uuid/UuidTool.tsx` - Extended state `{rawUuids, version, count, case, hyphens}`; version ToggleGroup, batch-count Input with inline hint, Regenerate button, case/hyphens Switches, hero-vs-ScrollArea display branch, `useKeyboardShortcut` wiring
- `tests/e2e/uuid.spec.ts` - Added 8 tests: v7 switch, batch sizing (5 and 100 rows), out-of-range hint, regenerate, reformat round trip, `/` focus, two 320px backstops

## Decisions Made

- **Hyphen reformat is strip-then-reinsert, not one-way removal:** `applyHyphens` always strips any existing hyphens first, then conditionally reinserts them at the canonical 8-4-4-4-12 positions when `opts.hyphens` is true. This makes the transform correct and symmetric regardless of the input's current hyphen state, which is what satisfies the plan's literal round-trip assertion (`formatUuids(formatUuids(x,{hyphens:false}),{hyphens:true})` restores `x` byte-for-byte) — a naive "only remove, never reinsert" implementation would have failed that direction.
- **Separate raw-input state from clamped state:** `UuidTool.tsx` tracks `countInput` (exactly what the user typed) independently from `state.count`/`state.rawUuids` (only updated on a valid 1-100 integer parse). This lets the input always echo the user's literal keystrokes while generation stays clamped to the last valid value, matching the Copywriting Contract's "generation is never blocked on this validation message" requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `/` keyboard-shortcut e2e test flaked under parallel test-runner load**
- **Found during:** Task 3 (`npm run test:e2e` full-suite verification step)
- **Issue:** The new `/ focuses the batch-count input` test pressed `/` immediately after `page.goto()`, racing the `next/dynamic(ssr:false)` island's mount + `useKeyboardShortcut`'s window-listener-attaching effect. It passed reliably when the file ran in isolation but failed intermittently (`expect(locator).toBeFocused()` timing out, actual state "inactive") when run as part of the full 21-test suite under 4 parallel workers (CPU contention delaying hydration).
- **Fix:** Added `await expect(page.getByTestId("uuid-batch-count")).toBeVisible()` before `page.keyboard.press("/")`, ensuring the client island has mounted (and its keydown listener is attached) before the shortcut fires.
- **Files modified:** `tests/e2e/uuid.spec.ts`
- **Verification:** Ran `npm run test:e2e` twice in full (21/21 passing both times) after the fix, versus one observed failure before it.
- **Committed in:** `aae6169` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Test-only timing fix; no production code changed. No scope creep.

## Issues Encountered

- A leftover `npm run dev` background process (started for manual verification of the built HTML) held port 3000/3001, causing the first `npx playwright test` invocation to fail with "Another next dev server is already running." Resolved by killing the stale process before rerunning; not a code defect.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/uuid/format.ts` and the extended `UuidTool.tsx` state shape (`{rawUuids, version, count, case, hyphens}`) are ready for 02-04 to add the export-format field and Copy All/Download actions without restructuring existing state.
- The version/batch/case/hyphens controls and their `data-testid`s (`uuid-version-toggle`, `uuid-version-v4`/`v7`, `uuid-batch-count`, `uuid-batch-count-hint`, `uuid-regenerate`, `uuid-case-switch`, `uuid-hyphens-switch`, `uuid-batch-list`, `uuid-batch-row`) are stable and available for 02-03 (SEO/worked-example) and 02-04 (export) to reference without needing to add new hooks.
- No blockers identified for 02-03 or 02-04.

---
*Phase: 02-uuid-generator*
*Completed: 2026-07-23*

## Self-Check: PASSED

All created/modified files verified present on disk (`lib/uuid/format.ts`, `lib/uuid/format.test.ts`, `components/ui/toggle-group.tsx`, `components/ui/toggle.tsx`, `components/ui/switch.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/scroll-area.tsx`, `app/tools/uuid/UuidTool.tsx`, `tests/e2e/uuid.spec.ts`); all 4 task commit hashes (`39f5217`, `95e812d`, `3e9bed0`, `aae6169`) verified present in `git log`.
