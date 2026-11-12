---
phase: 10-shared-about-section-config-parity
plan: 05
subsystem: testing
tags: [playwright, vitest, details-disclosure, json-ld, structural-guard]

requires:
  - phase: 10-shared-about-section-config-parity
    provides: ToolAbout component and openAbout helper (10-01), ToolAbout rollout to all six pages (10-04)
provides:
  - Cross-tool e2e proving tool first, About last, closed on load, native click/Enter/Space toggles and Tab order on all six pages
  - Registry-driven unit guard that fails if any page lacks ToolAbout or any other file emits ld+json or builds FAQPage
  - Shared expectServerAboutParity helper for JS-disabled server-HTML and JSON-LD parity
affects: [10-06, 10-07]

actuals:
  tokens: 6000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Registry-derived SLUGS and ACTIVE_TOOLS so a new tool page is checked without new spec files"
    - "JS-off parity assertions live once in tests/e2e/helpers/about-parity.ts and are reused by dev and production specs"

key-files:
  created:
    - app/tools/pages-about.test.ts
    - tests/e2e/about.spec.ts
    - tests/e2e/helpers/about-parity.ts
  modified: []

key-decisions:
  - "Guard compares repo-relative posix paths built from each root name plus its readdirSync entry, so components/ToolAbout.tsx is what gets compared"
  - "FAQPage guard matches the quoted literal in any quote style, scanning only non-comment lines so prose mentions never trip it"

patterns-established:
  - "Structural source guards drop comment lines (codeLines) before matching"

requirements-completed: [INFO-01, INFO-02, INFO-03, INFO-05]

coverage:
  - id: D1
    description: "On all six pages the tool comes first, About is main's last child with the worked example before the FAQ, both disclosures closed on load and independent native toggles by click, Enter and Space, with Tab moving between summaries"
    requirement: INFO-01
    verification:
      - kind: e2e
        ref: "tests/e2e/about.spec.ts#About area structure (12 tests, 6 slugs x 2)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Registry-driven guard fails if any non-planned tool page lacks ToolAbout, keeps page-local JSON-LD, or another file emits ld+json or builds FAQPage"
    requirement: INFO-05
    verification:
      - kind: unit
        ref: "app/tools/pages-about.test.ts (4 tests); negative check: renaming ToolAbout on the MAC page fails the guard"
        status: pass
    human_judgment: false
  - id: D3
    description: "With JavaScript disabled every page's server HTML holds exactly one FAQPage JSON-LD matching the visible FAQ item for item, collapsed content present, details closed, native summary toggle works"
    requirement: INFO-03
    verification:
      - kind: e2e
        ref: "tests/e2e/about.spec.ts#About area without JavaScript (6 tests via expectServerAboutParity)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-11-11
status: complete
plan_head_before: 667f8947a3a99a94859841d9215cccd4e540b823
plan_head_after: 99fa548f7cf1645a290b54ebbe62c929d68f601f
commits: 2
---

# Phase 10 Plan 05: Cross-tool About structure and parity guards Summary

**A registry-driven vitest guard plus an 18-test Playwright spec prove the shared About area on all six tools: tool first, closed on load, native toggles, Tab order, and one JS-off FAQPage JSON-LD matching the visible FAQ item for item.**

## Performance

- **Duration:** about 6 min
- **Started:** 2026-11-11T17:07Z
- **Completed:** 2026-11-11T17:14Z
- **Tasks:** 2 (Task 1 tracer, Task 2 auto)
- **Files modified:** 3 (all created)

## Accomplishments
- `tests/e2e/about.spec.ts` loops the registry (uuid, subnet, dns, mac, hash, config) and asserts exactly one of each About element, About as main's last child below the tool block, worked example before FAQ, h2 14px and muted, both disclosures independent under click, Enter and Space, and Tab from the first summary to the second.
- `app/tools/pages-about.test.ts` fails if a page drops ToolAbout, keeps a local `dangerouslySetInnerHTML`/ld+json/FAQPage, or if any file other than `components/ToolAbout.tsx` emits an ld+json script or any file other than `lib/seo/jsonld.ts` builds FAQPage; it also pins 4+ unique FAQ items per tool (Config 4-6) and registry/faq-data parity.
- `tests/e2e/helpers/about-parity.ts` exports `expectServerAboutParity`, the single copy of the JS-disabled assertions, ready for 10-06's production-build spec.

## Task Commits

1. **Task 1: Tracer - cross-tool structure and toggle e2e** - `e4037a2` (test)
2. **Task 2: Structural guard and JS-off parity helper** - `99fa548` (test)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified
- `tests/e2e/about.spec.ts` - Structure/toggle describe (12 tests) and JS-disabled describe (6 tests); 10-06 appends Enter-on-summary and 320px describes
- `app/tools/pages-about.test.ts` - Registry-driven INFO-05 source guard (4 tests)
- `tests/e2e/helpers/about-parity.ts` - Shared JS-off server-HTML and JSON-LD parity helper

## Decisions Made
- Tracer verified end to end (12/12 passing) before expansion; no checkpoint needed under end-of-phase mode with automated-only verify.
- Negative check performed manually: renaming `ToolAbout` on the MAC page made the guard fail, then the page was restored byte-identical.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Full unit suite (56 files, 743 tests), eslint and typecheck pass; `package.json` and `package-lock.json` unchanged since ede2221.

## Known Stubs

None.

## Threat Flags

None. T-10-14 mitigated by the structural guard; T-10-SC verified (`git diff --quiet ede2221 -- package.json package-lock.json` exits 0).

## Next Phase Readiness
- 10-06 can append the Enter-on-summary and 320px describes to `tests/e2e/about.spec.ts` and call `expectServerAboutParity` from a production-build spec.

## Self-Check: PASSED

- FOUND: app/tools/pages-about.test.ts, tests/e2e/about.spec.ts, tests/e2e/helpers/about-parity.ts
- FOUND commits: e4037a2, 99fa548

---
*Phase: 10-shared-about-section-config-parity*
*Completed: 2026-11-11*
