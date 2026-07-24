---
phase: 02-uuid-generator
plan: 03
subsystem: seo
tags: [nextjs, metadata, opengraph, json-ld, faq, playwright]

requires:
  - phase: 02-uuid-generator
    provides: "02-01: app/tools/uuid/page.tsx Server-shell (skeleton metadata, UuidToolLoader); lib/uuid/generate.ts (used to author real sample values)"
provides:
  - "app/tools/uuid/faq-data.ts: single-source faqItems array (3-4 entries) + real v4/v7 worked-example sample constants — shared by visible FAQ prose and FAQPage JSON-LD so they cannot drift"
  - "app/tools/uuid/page.tsx: full metadata export (description mentioning v4+v7, alternates.canonical via SITE_URL, text-only openGraph), a server-rendered worked-example section, a FAQ section, and a server-rendered FAQPage JSON-LD <script> block"
  - "tests/e2e/uuid-seo.spec.ts: dedicated SEO/FAQ/worked-example e2e spec, separate file from uuid.spec.ts"
affects: [02-04-uuid-export]

tech-stack:
  added: []
  patterns:
    - "Single-source FAQ data pattern: one faqItems array feeds both the visible FAQ prose and the FAQPage JSON-LD mainEntity, closing the drift risk between structured data and on-screen content — reusable by every later tool page's SEO plan."
    - "JSON-LD injection via dangerouslySetInnerHTML with the '<' -> '\\u003c' unicode escape (official Next.js JSON-LD guide XSS mitigation) — the only dangerouslySetInnerHTML in this file."

key-files:
  created:
    - app/tools/uuid/faq-data.ts
    - tests/e2e/uuid-seo.spec.ts
  modified:
    - app/tools/uuid/page.tsx

key-decisions:
  - "Uniqueness FAQ answer is hedged probabilistically ('collision probability is negligible', never 'guaranteed unique' as an absolute) per RESEARCH.md's judgment-tier prohibition."
  - "UUID v7 is described as time-ordered/sortable with an explicit caveat about clock skew and same-millisecond generation, never as a strict global monotonic sequence, per the second judgment-tier prohibition."
  - "Added a 4th FAQ item ('Do I need to store hyphens with a UUID?') beyond the plan's three named minimum questions, staying within the locked 3-4 range (D-11) and adding genuine dev-search-intent value without padding."

patterns-established:
  - "Any future tool page's SEO plan (Subnet/DNS/MAC) can copy this exact shape: a dedicated {slug}/faq-data.ts exporting faqItems + sample constants, consumed by both the visible section and the JSON-LD builder in page.tsx."

requirements-completed: [QUAL-01, QUAL-02]

coverage:
  - id: D1
    description: "The page head contains exactly one canonical link, one title, and one meta description, plus Open Graph tags, with no duplicate or conflicting entries (QUAL-01)."
    requirement: "QUAL-01"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid-seo.spec.ts#metadata is unique and complete"
        status: pass
      - kind: other
        ref: "npm run build && grep against .next/server/app/tools/uuid.html confirmed rel=canonical href=https://packetory.dev/tools/uuid and og:title present in the static prerendered HTML"
        status: pass
    human_judgment: false
  - id: D2
    description: "Metadata values are static build-time constants; title and description both mention UUID v4 and v7 (QUAL-01, D-12)."
    requirement: "QUAL-01"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid-seo.spec.ts#metadata is unique and complete (asserts title and meta[name=description] both contain 'v4' and 'v7')"
        status: pass
    human_judgment: false
  - id: D3
    description: "Each FAQ question appears exactly once with a distinct question/answer pair (QUAL-02, D-11)."
    requirement: "QUAL-02"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid-seo.spec.ts#faq content is present and JSON-LD matches"
        status: pass
    human_judgment: false
  - id: D4
    description: "The page always renders non-empty worked-example prose (real v4 + v7 side by side, one-line note) and 3-4 FAQ items (D-09/D-11)."
    requirement: "QUAL-02"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid-seo.spec.ts#worked example shows a real v4 and v7"
        status: pass
    human_judgment: false
  - id: D5
    description: "FAQ items render in a fixed authored order matching the FAQPage JSON-LD mainEntity order; visible FAQ and JSON-LD cannot drift (QUAL-02)."
    requirement: "QUAL-02"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid-seo.spec.ts#faq content is present and JSON-LD matches (parses ld+json, asserts @type=FAQPage and mainEntity.length equals the visible FAQ count)"
        status: pass
    human_judgment: false
  - id: D6
    description: "FAQPage JSON-LD is server-rendered in the initial HTML, not client-injected (T-02-04 threat boundary)."
    verification:
      - kind: other
        ref: "npm run build && grep against .next/server/app/tools/uuid.html confirmed application/ld+json and \"@type\":\"FAQPage\" present in the static prerendered HTML, with the u003c escape applied in page.tsx source"
        status: pass
    human_judgment: false
  - id: D7
    description: "Two judgment-tier prohibitions (uniqueness overclaim, v7 monotonicity overclaim) are honestly hedged in the FAQ copy."
    verification:
      - kind: other
        ref: "app/tools/uuid/faq-data.ts — uniqueness answer uses 'not... in an absolute mathematical sense'/'negligible'; v7 answer uses 'time-ordered and sortable, not a strict global sequence... clock skew and same-millisecond generation'"
        status: pass
    human_judgment: true

duration: 12min
completed: 2026-07-23
status: complete
---

# Phase 2 Plan 03: UUID SEO/Discovery Layer (Metadata, Worked Example, FAQ) Summary

**`/tools/uuid` now has a full SEO/discovery layer: unique title/description mentioning both v4 and v7, a canonical URL and Open Graph tags built from the shared `SITE_URL` constant, a worked example showing a real v4 and v7 side by side, and 4 practical FAQ items backed by a server-rendered, non-drifting FAQPage JSON-LD block.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-23T18:03:00+02:00
- **Completed:** 2026-07-23T18:15:00+02:00
- **Tasks:** 3 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Delivered QUAL-01: `/tools/uuid` now exports full metadata (description mentioning both versions, `alternates.canonical` reusing `SITE_URL` from `app/sitemap.ts` with no third hardcode of the origin literal, text-only Open Graph tags) — verified in the actual static-prerendered HTML output of `npm run build`, not just source code.
- Delivered QUAL-02: a worked-example section shows real, actually-generated v4 and v7 samples side by side with a one-line "when to use each" note, and 4 FAQ items (within the locked D-11 3-4 range) target genuine dev-search-intent questions.
- Established the single-source FAQ data pattern (`faq-data.ts`'s `faqItems` array feeding both the visible section and the JSON-LD `mainEntity`) that closes the structured-data-drift risk and is directly reusable by every later tool page's SEO plan.
- Closed both judgment-tier copywriting prohibitions: the uniqueness FAQ answer is hedged probabilistically, and the v7 answer describes time-ordering/sortability with an explicit clock-skew/same-millisecond caveat rather than claiming strict global monotonicity.
- Shipped `tests/e2e/uuid-seo.spec.ts` as a dedicated file (no conflict with `02-02`'s `uuid.spec.ts` in the same wave), asserting head metadata, FAQ content + JSON-LD parse/count match, and worked-example sample visibility.

## Task Commits

Each task was committed atomically:

1. **Task 1: faq-data.ts — single-source FAQ items + worked-example sample values** - `3ae2b9a` (feat)
2. **Task 2: page.tsx — metadata (canonical/OG), worked example, FAQ prose + FAQPage JSON-LD** - `bca21a4` (feat)
3. **Task 3: uuid-seo.spec.ts — metadata + FAQ content e2e** - `134fcd1` (test)

**Plan metadata:** (pending — final `docs(02-03)` commit, see below)

## Files Created/Modified

- `app/tools/uuid/faq-data.ts` - Exports `faqItems` (4 entries: v4-vs-v7, uniqueness, DB primary key, hyphen storage), `sampleV4`/`sampleV7` real generated constants, `whenToUseEachNote`
- `app/tools/uuid/page.tsx` - Extended `metadata` (description, `alternates.canonical`, `openGraph`), added worked-example section, FAQ section, and server-rendered FAQPage JSON-LD `<script>`
- `tests/e2e/uuid-seo.spec.ts` - New Playwright spec: metadata uniqueness/completeness, FAQ + JSON-LD drift check, worked-example sample structural assertions

## Decisions Made

- **Uniqueness copy hedged probabilistically:** "Not in an absolute mathematical sense — but the collision probability is negligible for practical purposes," with a concrete magnitude explanation (122 random bits), rather than any absolute "guaranteed unique" claim.
- **v7 copy avoids a global-monotonicity overclaim:** describes v7 as embedding a Unix millisecond timestamp making values "time-ordered and sortable," explicitly noting "clock skew and same-millisecond generation mean ordering is approximate, not absolute" — satisfying the second judgment-tier prohibition.
- **4th FAQ item added (hyphen storage):** the plan named three FAQ questions as a minimum; a 4th ("Do I need to store hyphens with a UUID?") was added because it's a genuine practical dev-search question directly relevant to the page's own case/hyphen controls (02-02), staying within the locked D-11 range of 3-4 and avoiding padding.

## Deviations from Plan

None - plan executed exactly as written. All three tasks' acceptance criteria were met without requiring auto-fixes, architectural changes, or scope adjustments.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `app/tools/uuid/page.tsx`'s metadata/worked-example/FAQ shape is now the complete tool-page SEO template; `02-04` (export) adds only export-format UI to `UuidTool.tsx` and does not need to touch `page.tsx`'s SEO sections.
- `faq-data.ts`'s single-source pattern (one array feeding both prose and JSON-LD) is documented above as directly reusable for Subnet/DNS/MAC's own SEO plans in later phases.
- No blockers identified for 02-04.

---
*Phase: 02-uuid-generator*
*Completed: 2026-07-23*

## Self-Check: PASSED

All created/modified files verified present on disk (`app/tools/uuid/faq-data.ts`, `tests/e2e/uuid-seo.spec.ts`, `app/tools/uuid/page.tsx`); all 3 task commit hashes (`3ae2b9a`, `bca21a4`, `134fcd1`) verified present in `git log`.
