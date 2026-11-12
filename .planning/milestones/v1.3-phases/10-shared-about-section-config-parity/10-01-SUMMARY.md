---
phase: 10-shared-about-section-config-parity
plan: 01
subsystem: ui
tags: [nextjs, server-components, details, json-ld, faqpage, playwright, vitest]

requires:
  - phase: 02-uuid-generator
    provides: UUID page with faq-data.ts, per-page FAQPage JSON-LD, uuid-seo e2e spec
provides:
  - lib/seo/jsonld.ts shared FAQPage builder and escaping serializer
  - components/ToolAbout.tsx shared server About area (two closed native details) and FaqJsonLd
  - tests/e2e/helpers/about.ts openAbout Playwright helper
  - /tools/uuid migrated to ToolAbout (tracer consumer)
affects: [10-02, 10-03, 10-04, 10-05, 10-06, 14-password]

actuals:
  tokens: 9500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "About area is a zero-JS server component: native details, group-open chevron rotation, no handlers"
    - "One JSON-LD builder; FaqJsonLd inside ToolAbout renders the script from the same faqItems array as the visible FAQ"
    - "e2e opens disclosures via openAbout (asserts open attribute, not visibility)"

key-files:
  created:
    - lib/seo/jsonld.ts
    - lib/seo/jsonld.test.ts
    - components/ToolAbout.tsx
    - components/ToolAbout.test.tsx
    - tests/e2e/helpers/about.ts
  modified:
    - app/tools/uuid/page.tsx
    - tests/e2e/uuid-seo.spec.ts

key-decisions:
  - "Worked-example markup passed to ToolAbout as children, preserving each page's existing body verbatim"
  - "FaqJsonLd lives in components/ToolAbout.tsx beside ToolAbout so one module owns visible FAQ and its JSON-LD"
  - "Plain border-t border-border separator rather than the client Radix separator component"

requirements-completed: [INFO-01, INFO-02, INFO-03, INFO-05]

coverage:
  - id: D1
    description: "/tools/uuid renders the tool first, then a closed muted About area with Worked example and FAQ disclosures"
    requirement: "INFO-01"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid-seo.spec.ts#faq content is present and JSON-LD matches"
        status: pass
      - kind: unit
        ref: "components/ToolAbout.test.tsx#renders two details, both closed on load (INFO-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "One shared FAQPage JSON-LD builder, escaped and byte-identical to the legacy per-page output"
    requirement: "INFO-05"
    verification:
      - kind: unit
        ref: "lib/seo/jsonld.test.ts#is byte-identical to the legacy per-page output (INFO-05)"
        status: pass
      - kind: unit
        ref: "lib/seo/jsonld.test.ts#escapes every < and round-trips through JSON.parse (T-10-01)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Visual polish of the muted About area (spacing, focus ring, chevron rotation) matches the UI-SPEC"
    verification: []
    human_judgment: true
    rationale: "Visual adequacy is not asserted by any automated test; class-token tests only pin the contract"

duration: 20min
completed: 2026-11-11
status: complete
plan_head_before: ceb59e6c1d04c29a6339b0619282c0a95d0f3c2a
plan_head_after: 2455849
commits: 2
---

# Phase 10 Plan 01: Shared About Section Tracer Summary

**Zero-JS server `ToolAbout` (two closed native details plus one escaped FAQPage JSON-LD from a single shared builder) wired end-to-end on /tools/uuid and pinned by unit and e2e tests**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-11-11
- **Tasks:** 2
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- `lib/seo/jsonld.ts` is the one FAQPage builder (`buildFaqJsonLd`) and serializer (`serializeJsonLd`, escapes every `<`); output is byte-identical to the legacy per-page JSON.
- `components/ToolAbout.tsx` renders the muted "About this tool" area as the last child of `main`, with Worked example and "FAQ (N questions)" details both closed on load, no client JavaScript, and `FaqJsonLd` as the single JSON-LD script.
- `/tools/uuid` keeps no page-local builder or `dangerouslySetInnerHTML`; `uuid-seo.spec.ts` asserts no open details on load and opens disclosures via the shared `openAbout` helper.
- 15 new unit tests; whole suite 714 passing; uuid e2e 16 of 16 passing.

## Task Commits

1. **Task 1: Tracer - shared ToolAbout and JSON-LD builder on /tools/uuid** - `51957c5` (feat)
2. **Task 2: Pin builder and ToolAbout contracts with unit tests** - `2455849` (test)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `lib/seo/jsonld.ts` - FaqItem type, buildFaqJsonLd, serializeJsonLd
- `components/ToolAbout.tsx` - ToolAbout and FaqJsonLd server components
- `tests/e2e/helpers/about.ts` - openAbout helper
- `app/tools/uuid/page.tsx` - migrated to ToolAbout
- `tests/e2e/uuid-seo.spec.ts` - closed-on-load assert and openAbout calls
- `lib/seo/jsonld.test.ts`, `components/ToolAbout.test.tsx` - contract tests

## Decisions Made
- Children-based worked example, `FaqJsonLd` colocated in `ToolAbout.tsx`, plain border separator (per plan).

## Deviations from Plan

None - plan executed exactly as written.

Process notes (not code deviations): the first commit attempt halted because HEAD was on protected `main`; the user moved work onto `gsd/phase-10-shared-about-section-config-parity` and execution resumed. Task 2 tests assert behavior already shipped in Task 1, as the plan specifies, so they passed on first run (no separate failing RED state); TDD gate applies to the plan's `tdd="true"` task only as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ToolAbout, FaqJsonLd, buildFaqJsonLd, serializeJsonLd and openAbout are ready for 10-03 through 10-06.

## Self-Check: PASSED
- Created files exist (jsonld.ts, ToolAbout.tsx, about.ts, both test files).
- Commits 51957c5 and 2455849 are ancestors of HEAD.

---
*Phase: 10-shared-about-section-config-parity*
*Completed: 2026-11-11*
