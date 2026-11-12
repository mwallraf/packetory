---
phase: 10-shared-about-section-config-parity
plan: 04
subsystem: ui
tags: [nextjs, server-components, details-disclosure, json-ld, playwright]

requires:
  - phase: 10-shared-about-section-config-parity
    provides: ToolAbout + openAbout helper (10-01), Config faq-data + ConfigExample (10-03)
provides:
  - Subnet, DNS, MAC, Hash and Config pages rendering the shared closed About area
  - Config worked example, 4-item FAQ and single FAQPage JSON-LD on /tools/config
  - config-seo.spec.ts and openAbout-based subnet/dns/hash SEO specs
affects: [10-05, 10-06, 10-07]

actuals:
  tokens: 14000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Tool page = tool, then ToolAbout as last child of main; worked-example body moved verbatim as children"
    - "320px overflow for Config scoped to the About section, not documentElement"

key-files:
  created:
    - tests/e2e/config-seo.spec.ts
  modified:
    - app/tools/config/page.tsx
    - app/tools/subnet/page.tsx
    - app/tools/dns/page.tsx
    - app/tools/mac/page.tsx
    - app/tools/hash/page.tsx
    - tests/e2e/subnet-seo.spec.ts
    - tests/e2e/dns-seo.spec.ts
    - tests/e2e/hash-seo.spec.ts

key-decisions:
  - "Config led as the tracer because it is the only page gaining new content; the other four pages followed the same migration"
  - "Worked-example bodies moved verbatim; only the wrapper section, 20px h2 and the body div mt-4 were dropped"
  - "Config 320px test measures the About section (scrollWidth and right edge), not documentElement, since the Config tool island at 320px is not owned by Phase 10"

patterns-established:
  - "Migration: delete page-local FAQPage builder, script element and mt-12 sections; render ToolAbout slug faqItems"

requirements-completed: [INFO-01, INFO-02, INFO-03, INFO-05, CFG-01, CFG-02]

coverage:
  - id: D1
    description: "Subnet, DNS, MAC, Hash and Config pages render ToolAbout as the last child of main with no page-local JSON-LD"
    requirement: INFO-01
    verification:
      - kind: e2e
        ref: "tests/e2e/subnet-seo.spec.ts, dns-seo.spec.ts, hash-seo.spec.ts, config-seo.spec.ts; npm run test:e2e (110 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "/tools/config shows the highlighted worked example and 4-item FAQ with one FAQPage JSON-LD matching item for item"
    requirement: CFG-02
    verification:
      - kind: e2e
        ref: "tests/e2e/config-seo.spec.ts#faq is closed on load, has 4-6 items and the JSON-LD matches it item for item"
        status: pass
      - kind: e2e
        ref: "tests/e2e/config-seo.spec.ts#worked example shows the highlighted RFC 5737 sample"
        status: pass
    human_judgment: false
  - id: D3
    description: "Config example pane scrolls inside itself at 320px without widening the About area"
    requirement: CFG-01
    verification:
      - kind: e2e
        ref: "tests/e2e/config-seo.spec.ts#example pane scrolls inside itself at 320px without widening the About area"
        status: pass
    human_judgment: true
    rationale: "Visual left-alignment of the Config About area with the h1 and overall look are judgment calls beyond the geometry assertions"

duration: 10min
completed: 2026-11-11
status: complete
plan_head_before: 7950c3da23e8e948723effbf15cdf449ccf1d7f1
plan_head_after: 5e28f18b39505b1f652310d0f3bd53be7244c67a
commits: 3
---

# Phase 10 Plan 04: Roll ToolAbout out to Subnet, DNS, MAC, Hash and Config Summary

**Five tool pages now share the closed ToolAbout area with one escaped FAQPage JSON-LD each, and /tools/config gains its highlighted RFC 5737 worked example, 4-item FAQ and a new config-seo e2e.**

## Performance

- **Duration:** about 10 min
- **Started:** 2026-11-11T17:08:49Z
- **Tasks:** 3
- **Files modified:** 9 (1 created)

## Accomplishments
- Config page renders `ToolAbout slug="config"` with `ConfigExample` after the tool, keeping its `max-w-6xl` main and `max-w-3xl` intro.
- Subnet, DNS, MAC and Hash pages lost their page-local JSON-LD builders, script elements and 20px worked-example/FAQ sections (net -198 lines); inner testids such as `hash-worked-example-sha256` are preserved.
- `config-seo.spec.ts` covers metadata, 4-item FAQ/JSON-LD parity, the highlighted sample (all seven token kinds) and the 320px pane overflow; subnet/dns/hash SEO specs open the disclosures through `openAbout`.
- Full dev e2e suite (110 tests) and unit suite (739 tests) pass; typecheck clean.

## Task Commits

1. **Task 1: Config tracer (ToolAbout + ConfigExample + config-seo spec)** - `cbfb20e` (feat)
2. **Task 2: Subnet and DNS migration + spec openAbout** - `ddb6c02` (feat)
3. **Task 3: MAC and Hash migration + hash-seo openAbout, full e2e** - `5e28f18` (feat)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified
- `app/tools/config/page.tsx` - adds ToolAbout with ConfigExample and the Config FAQ
- `app/tools/{subnet,dns,mac,hash}/page.tsx` - migrated to ToolAbout
- `tests/e2e/config-seo.spec.ts` - new Config SEO, FAQ parity and worked-example spec
- `tests/e2e/{subnet,dns,hash}-seo.spec.ts` - openAbout before visibility/layout assertions

## Decisions Made
- Config led as the tracer (only page gaining new content); automated `<verify>` was re-run end to end before expansion, no checkpoint was needed (end-of-phase mode, automated-only verify).
- The 320px Config check is scoped to the About section and its right edge, per the plan, not documentElement.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npm run lint` reports one pre-existing warning (`MacVendorRouteResponse` unused in `lib/mac/vendor.ts`), out of scope and untouched.

## Known Stubs

None.

## Threat Flags

None. FAQ data files, `package.json` and `package-lock.json` are unchanged since ede2221 (`git diff --quiet` exits 0); every page-local `dangerouslySetInnerHTML` is gone (grep gates print 0 for all five pages).

## Next Phase Readiness
- All six tool pages use ToolAbout; 10-05 can add the registry-wide structural guard and 10-06 the cross-tool 320px describe.

## Self-Check: PASSED

- FOUND: tests/e2e/config-seo.spec.ts and all five migrated page.tsx files
- FOUND commits: cbfb20e, ddb6c02, 5e28f18

---
*Phase: 10-shared-about-section-config-parity*
*Completed: 2026-11-11*
