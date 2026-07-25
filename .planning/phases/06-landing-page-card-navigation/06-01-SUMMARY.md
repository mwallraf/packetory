---
phase: 06-landing-page-card-navigation
plan: 01
subsystem: ui
tags: [next-link, tailwind-has-selector, stretched-link, accessibility, testing-library, playwright]

# Dependency graph
requires:
  - phase: 01-shared-shell-registry
    provides: "ToolCard component, tools/registry.ts ToolDefinition shape, SiteHeader.tsx isNavigable/href nav pattern to mirror"
provides:
  - "ToolCard whole-card click navigation via the stretched-link pattern (LP-01)"
  - "Full-card hover + focus-visible ring affordance on navigable cards (D-03/D-04)"
  - "Component unit test proving active/featured navigable, planned inert, name-only accessible link"
  - "Updated home E2E coverage: reversed anchor assertion, click-anywhere navigation, keyboard activation"
affects: [06-02-human-verify-checkpoint]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stretched-link pattern: Link with after:absolute after:inset-0 inside CardTitle, relative on the Card ancestor"
    - "Tailwind has-[:hover]/has-[:focus-visible] state selectors on a container to reflect a descendant's interaction state"

key-files:
  created:
    - components/ToolCard.test.tsx
  modified:
    - components/ToolCard.tsx
    - tests/e2e/home.spec.ts

key-decisions:
  - "Followed CONTEXT.md D-01..D-06 and UI-SPEC's prescriptive class list verbatim — no implementation discretion needed beyond what was already resolved."

patterns-established:
  - "Card-as-click-target: stretched-link inside the title only (not a whole-card <a> wrap), keeping the accessible name to just the item name — reusable for any future card-grid component."

requirements-completed: [LP-01]

coverage:
  - id: D1
    description: "Active/featured tool cards render a single stretched-link Link (href=/tools/{slug}) inside CardTitle whose accessible name is exactly tool.name, with the whole Card as the clickable hit area (LP-01)."
    requirement: "LP-01"
    verification:
      - kind: unit
        ref: "components/ToolCard.test.tsx#renders exactly one anchor for an active tool, href /tools/{slug}, accessible name is exactly tool.name (D-02)"
        status: pass
      - kind: unit
        ref: "components/ToolCard.test.tsx#renders a featured tool identically navigable — one anchor, correct href"
        status: pass
      - kind: e2e
        ref: "tests/e2e/home.spec.ts#clicking anywhere on an active tool card navigates to its /tools/{slug} page"
        status: pass
    human_judgment: false
  - id: D2
    description: "An active card is reachable by Tab and activates on Enter (keyboard operability, roadmap SC2)."
    requirement: "LP-01"
    verification:
      - kind: e2e
        ref: "tests/e2e/home.spec.ts#a tool card link is reachable by keyboard and activates on Enter"
        status: pass
    human_judgment: false
  - id: D3
    description: "A status:'planned' card renders no anchor, no has-[:hover]/has-[:focus-visible] ring classes, and does not navigate (roadmap SC3, D-05/D-06)."
    requirement: "LP-01"
    verification:
      - kind: unit
        ref: "components/ToolCard.test.tsx#renders zero anchors for a planned tool and no hover/focus-visible ring classes (D-05/D-06)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full-card hover + focus-visible ring visually encloses the entire card boundary at every breakpoint (UI-SPEC populated/backstop row) — deferred to plan 06-02's human-verify checkpoint, not verifiable by automated DOM/class assertions alone."
    verification: []
    human_judgment: true
    rationale: "Visual enclosure of the ring across breakpoints (including 320px) requires a rendered/visual check; this plan proves the classes are conditionally present via unit tests, but the actual visual result is plan 06-02's explicit human-verify checkpoint per the UI-SPEC backstop row."

# Metrics
duration: 25min
completed: 2026-07-25
status: complete
---

# Phase 06 Plan 01: Landing Page Card Navigation Summary

**ToolCard now uses the stretched-link pattern (Link + after:inset-0 inside CardTitle, relative on Card) so clicking anywhere on an active card navigates to its /tools/{slug} page, with a full-card hover/focus-visible ring; planned cards stay fully inert.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-25T21:35:00Z
- **Completed:** 2026-07-25T22:00:00Z
- **Tasks:** 3
- **Files modified:** 3 (1 new, 2 modified)

## Accomplishments
- `components/ToolCard.tsx` now renders a stretched-link `<Link>` inside `CardTitle` for navigable tools, with `relative` on `Card` and conditional `has-[:hover]`/`has-[:focus-visible]` full-card ring classes, exactly matching the UI-SPEC's prescriptive class list; planned cards receive zero new markup or classes.
- New `components/ToolCard.test.tsx` proves active and featured tools render exactly one anchor with `href=/tools/{slug}` and an accessible name equal to `tool.name` only (excluding description/category text), while a fabricated planned fixture renders zero anchors and no ring classes.
- `tests/e2e/home.spec.ts` reverses the old "no wrapping anchor" assertion to `toHaveCount(1)`, and adds two new E2E tests: clicking a non-title corner point of a card navigates to a `/tools/{slug}` URL, and keyboard focus + Enter on a card's link also navigates — proving both success criteria 1 and 2 from the roadmap.

## Task Commits

Each task was committed atomically:

1. **Task 1: Make active ToolCards clickable via stretched-link + full-card ring** - `2d96ea4` (feat)
2. **Task 2: Component unit test for active-link structure and planned-inert rendering** - `fb12947` (test)
3. **Task 3: Update home E2E — reverse anchor assertion, add click + keyboard navigation tests** - `b22efff` (test)

**Plan metadata:** (final docs commit follows this summary)

## Files Created/Modified
- `components/ToolCard.tsx` - Adds `href`/`isNavigable`, `relative` + conditional hover/focus-visible ring classes on `Card`, and a stretched-link `<Link>` inside `CardTitle` for navigable tools only.
- `components/ToolCard.test.tsx` - New Vitest + Testing Library component test (5 tests): active/featured single-anchor structure, planned zero-anchor/no-ring, `relative` class on all states, all four data-testids present on all states.
- `tests/e2e/home.spec.ts` - Reversed the per-card anchor count assertion (0 → 1) and its title; added "clicking anywhere on an active tool card navigates" and "a tool card link is reachable by keyboard and activates on Enter" tests.

## Decisions Made
None - plan executed exactly as written; all implementation discretion (D-01 through D-06, and the UI-SPEC's "Prescriptive implementation" class list) was already resolved in 06-CONTEXT.md and 06-UI-SPEC.md before this plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The first draft of the unit test's "excludes category text" assertion (`not.toContain("DNS")`) failed because the active fixture's own name ("DNS Lookup") legitimately contains the substring "DNS" — this was a test-authoring bug, not a component bug. Fixed by changing the active fixture's `category` to `"web"` (label "Web", which does not overlap with "DNS Lookup") so the assertion correctly isolates category-text leakage from the tool name itself. No component code changed; caught before commit via `npm test -- ToolCard`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 06-02 (human-verify checkpoint for the full-card hover/focus-visible ring across breakpoints, including 320px) is unblocked — the classes it needs to visually confirm are now shipped and unit-tested for conditional presence.
- Full regression run confirmed clean: `npm test` (268/268 unit tests pass across 28 files) and `npm run test:e2e` (68/68 Playwright tests pass, including all pre-existing DNS/MAC/Subnet/UUID/nav/privacy suites) — no unrelated breakage from this change.
- `npm run typecheck` and `npm run lint` both exit 0 (one pre-existing unrelated lint warning in `lib/mac/vendor.ts`, out of this plan's scope).

---
*Phase: 06-landing-page-card-navigation*
*Completed: 2026-07-25*

## Self-Check: PASSED

All created/modified files verified present on disk; all four task/summary commit hashes (`2d96ea4`, `fb12947`, `b22efff`, `8d2ba58`) verified present in `git log`.
