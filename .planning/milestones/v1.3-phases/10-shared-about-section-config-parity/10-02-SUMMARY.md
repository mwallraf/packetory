---
phase: 10-shared-about-section-config-parity
plan: 02
subsystem: ui
tags: [keyboard-shortcut, details-summary, lucide-react, icons, vitest, tdd]

requires:
  - phase: 04-dns-lookup
    provides: useKeyboardShortcut hook with isInteractiveTarget Enter guard
provides:
  - useKeyboardShortcut Enter guard that treats summary (and descendants) as self-activating
  - Exported ICONS map and throwing assertToolIcon in components/ToolCard.tsx (no silent fallback)
  - Config registry entry using the FileTerminal icon
  - CFG-03 and ROADMAP Phase 10 SC-4 aligned to the landing-card icon scope (D-16)
affects: [10-03, 10-04, 10-05, 10-06]

actuals:
  tokens: 3200
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Icon resolution: assertToolIcon(name) void assertion then ICONS[name] index (a component-returning helper fails react-hooks/static-components)"
    - "Own-property membership via Object.hasOwn so prototype keys never resolve as icons"

key-files:
  created: []
  modified:
    - lib/hooks/useKeyboardShortcut.ts
    - lib/hooks/useKeyboardShortcut.test.ts
    - components/ToolCard.tsx
    - components/ToolCard.test.tsx
    - tools/registry.ts
    - tools/registry.test.ts
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md

key-decisions:
  - "Unknown icon names throw (test time and prerender time) instead of falling back to Fingerprint"
  - "Icon names must be unique across the registry (resolves the Config/Subnet Network collision)"
  - "Enter guard keys on closest('summary') only; focusable content inside an open disclosure behaves like any non-interactive element"

requirements-completed: [INFO-04, CFG-03]

coverage:
  - id: D1
    description: "Enter on a focused summary or any element inside it does not fire a tool's global Enter handler; Enter on a plain element still fires once"
    requirement: "INFO-04"
    verification:
      - kind: unit
        ref: "lib/hooks/useKeyboardShortcut.test.ts#does NOT fire the enter handler while focus is on a summary or inside one (INFO-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Config landing card renders the FileTerminal icon in the same slot as other cards; every registered icon has an explicit unique ICONS entry; unknown icon throws"
    requirement: "CFG-03"
    verification:
      - kind: unit
        ref: "components/ToolCard.test.tsx#renders the lucide FileTerminal icon for the Config registry entry (CFG-03)"
        status: pass
      - kind: unit
        ref: "components/ToolCard.test.tsx#throws for an unknown icon string instead of falling back (CFG-03)"
        status: pass
      - kind: unit
        ref: "tools/registry.test.ts#every registered icon has an explicit ICONS entry (CFG-03)"
        status: pass
      - kind: unit
        ref: "tools/registry.test.ts#Config uses FileTerminal and no two tools share an icon (CFG-03)"
        status: pass
    human_judgment: false
  - id: D3
    description: "REQUIREMENTS.md CFG-03 and ROADMAP Phase 10 SC-4 describe the landing-card-only icon scope and keep the explicit-ICONS unit-test clause"
    requirement: "CFG-03"
    verification:
      - kind: other
        ref: "grep 'icon on its landing card' .planning/REQUIREMENTS.md .planning/ROADMAP.md; diff against ede2221 of other Phase 10 ROADMAP lines exits 0"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-11-11
status: complete
plan_head_before: 13d54f06b7dbe13cc30d38e0bd97b81027527cd4
plan_head_after: 909b1265a68994f197d36f43bb143d16dacc1811
commits: 5
---

# Phase 10 Plan 02: Enter-on-summary guard and explicit tool icons Summary

**Global Enter shortcut now ignores focus on a summary (no more FAQ-open regenerating the UUID or re-running DNS), and Config gets its own FileTerminal icon with a throwing assertToolIcon replacing the silent Fingerprint fallback**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-11-11T17:04Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- `isInteractiveTarget` selector gains `summary`; Enter on a summary or any descendant is suppressed, Enter on a plain div still fires once; slash/escape/copy branches untouched (diff: 5 added, 1 deleted).
- `ICONS` exported with `FileTerminal`; `assertToolIcon` throws `Unknown tool icon "<name>"` using `Object.hasOwn` (prototype keys like `toString` rejected); `ToolCard` no longer falls back to Fingerprint.
- Config registry icon is `FileTerminal`; registry tests pin explicit ICONS entry for every tool and icon uniqueness (6 distinct classes rendered).
- CFG-03 and ROADMAP SC-4 amended to landing-card-only icon scope (D-16), explicit-ICONS test clause preserved; other Phase 10 ROADMAP lines verified unchanged against ede2221.

## Task Commits

1. **Task 1: Enter on summary guard (INFO-04)** - RED `a93f594` (test), GREEN `7917dff` (feat)
2. **Task 2: Config FileTerminal + explicit icons (CFG-03)** - RED `09391ee` (test), GREEN `b409543` (feat)
3. **Task 3: Amend CFG-03 and SC-4 wording (D-16)** - `909b126` (docs)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `lib/hooks/useKeyboardShortcut.ts` - isInteractiveTarget treats summary as self-activating
- `lib/hooks/useKeyboardShortcut.test.ts` - INFO-04 case
- `components/ToolCard.tsx` - exported ICONS, FileTerminal, assertToolIcon, fallback removed
- `components/ToolCard.test.tsx` - throw, FileTerminal, distinct-icon cases (silent-fallback case replaced)
- `tools/registry.ts` - Config icon FileTerminal
- `tools/registry.test.ts` - registry-wide explicit-icon and uniqueness cases
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` - amended wording

## Decisions Made
- Throw on unknown icons rather than render a substitute (reversible: one function).
- Void assertion plus map index (not a component-returning helper) because the latter fails react-hooks/static-components.
- Guard keys on `summary` only, per the planner assumption for the unresolved INFO-04 edge.

## TDD Gate Compliance
Both `tdd="true"` tasks followed RED then GREEN: `test(10-02)` commits `a93f594` and `09391ee` each failed on the planned assertions before their `feat(10-02)` commits `7917dff` and `b409543`. Task 1 RED failed with `enter` called twice (expected 0); Task 2 RED failed on the unknown-icon throw and FileTerminal render assertions. Some Task 2 RED cases failed with TypeError because `assertToolIcon` did not exist yet, which is the intended missing-symbol failure for new API.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. (A BSD `sed -i` invocation failed once on macOS; the edit was redone with Python before anything was committed.)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Hook guard and icon map are in place for the About rollout and 10-06's e2e Enter/request-count proof.
- Full vitest suite: 720 passing; eslint and typecheck clean; package.json and lockfile unchanged versus ede2221.

## Self-Check: PASSED
- Modified files exist; commits a93f594, 7917dff, 09391ee, b409543, 909b126 are ancestors of HEAD.
- All plan acceptance greps and verification commands passed.

---
*Phase: 10-shared-about-section-config-parity*
*Completed: 2026-11-11*
