---
phase: 14-passphrase-strength-launch
plan: 02
subsystem: ui
tags: [nextjs, seo, faq-jsonld, about-area, eff-wordlist, attribution, playwright, vitest]

requires:
  - phase: 10-shared-about-section
    provides: "ToolAbout, FAQPage JSON-LD builder, openAbout and expectServerAboutParity helpers"
  - phase: 12-password-library
    provides: "lib/password barrel constants and entropy / crack-time functions"
  - phase: 13-password-generator
    provides: "Password page shell, page-guards.test.ts, production SSR leak spec"
provides:
  - "Final /tools/password metadata (title, D-12 description, canonical, Open Graph) with noindex removed"
  - "Six-item FAQ and server worked example whose every number is a template over lib/password"
  - "Full EFF CC BY attribution block with shared eff-links.ts hrefs (reused by the 14-05 credit line)"
  - "password-seo dev e2e spec and updated production SSR spec (no noindex, no EFF marker, no sample secret)"
affects: [14-05, 14-07, 14-08, registry, sitemap]

actuals:
  tokens: 7900
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "FAQ answers are template strings over library constants; the test recomputes each expected value from the same library"
    - "Worked example shows a structural placeholder (word-word-...), never a sample secret"

key-files:
  created:
    - app/tools/password/faq-data.ts
    - app/tools/password/faq-data.test.ts
    - app/tools/password/PasswordExample.tsx
    - app/tools/password/eff-links.ts
    - tests/e2e/password-seo.spec.ts
  modified:
    - app/tools/password/page.tsx
    - tests/e2e-prod/password-ssr.spec.ts

key-decisions:
  - "faq-data.ts also exports defaultFigures, aboutTime and joinList so PasswordExample and the FAQ share one set of computed default figures and one crack-time phrasing rule (no 'about more than')"
  - "The production flight-payload leak scan now exempts RSC element references of the form $hex:props:children:...: the About chevron icons emit one, and it is a structural token, not a password"

patterns-established:
  - "eff-links.ts is the single home of the two EFF hrefs for every credit surface"

requirements-completed: [PREG-02, PHR-04]

coverage:
  - id: D1
    description: "Launch metadata: title, D-12 description, canonical, Open Graph, no robots meta and no noindex in the served HTML"
    requirement: PREG-02
    verification:
      - kind: e2e
        ref: "tests/e2e/password-seo.spec.ts#metadata is unique, complete and indexable"
        status: pass
      - kind: e2e
        ref: "tests/e2e-prod/password-ssr.spec.ts#/tools/password: serves a text-free skeleton and no password"
        status: pass
    human_judgment: false
  - id: D2
    description: "ToolAbout is the last child of main with the worked example and six FAQ items; one FAQPage JSON-LD matches them item for item, with and without JavaScript"
    requirement: PREG-02
    verification:
      - kind: e2e
        ref: "tests/e2e/password-seo.spec.ts#About is the last child of main, with the worked example and six FAQ items matching the JSON-LD"
        status: pass
      - kind: e2e
        ref: "tests/e2e/password-seo.spec.ts#server HTML holds the closed About area and one matching FAQPage JSON-LD"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every FAQ number comes from lib/password: 85, 128 bits, 7,776, 77 bits, 12.9, 3.3, thresholds, both guess-rate labels, crack times, the 4 hyphenated words in order"
    requirement: PREG-02
    verification:
      - kind: unit
        ref: "app/tools/password/faq-data.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "EFF CC BY attribution (list name, 2016, EFF, CC BY, unmodified, 7,776 words incl. 4 hyphenated) with two eff.org links carrying rel=noreferrer; worked example holds only the structural word shape"
    requirement: PHR-04
    verification:
      - kind: e2e
        ref: "tests/e2e/password-seo.spec.ts#worked example shows the structural shape and the full EFF attribution"
        status: pass
    human_judgment: false
  - id: D5
    description: "Production HTML and flight payloads hold no EFF marker, no 20-character all-sets string and no noindex"
    requirement: PHR-04
    verification:
      - kind: e2e
        ref: "tests/e2e-prod/password-ssr.spec.ts#/tools/password: serves a text-free skeleton and no password"
        status: pass
    human_judgment: false
  - id: D6
    description: "Wording approval: FAQ Q5 (privacy) and Q6 (clipboard), the page description and intro 'Runs locally in your browser', and the EFF CC BY attribution wording"
    requirement: PREG-02
    verification: []
    human_judgment: true
    rationale: "D-15 and PHR-04: recorded human checks for the batched milestone UAT, never blocking checkpoints in run mode. Q5 and Q6 ship as the D-15 drafts, pinned by exact equality."
  - id: D7
    description: "At 320px the opened worked example and FAQ wrap without horizontal page overflow"
    requirement: PREG-02
    verification:
      - kind: e2e
        ref: "tests/e2e/password-seo.spec.ts#opened About does not overflow the page at 320px"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-11
plan_head_before: 2d0a631655eae90a96bda5b825a118310cee86ec
plan_head_after: b90a2c7597966b58b02bf6e8a7de2e74aab8cc88
commits: 2
status: complete
---

# Phase 14 Plan 02: Launch Metadata and About Area Summary

**/tools/password now ships its indexable launch shell: final title, description and canonical with noindex removed, an intro, and a server-rendered About area (constants-only worked example, full EFF CC BY attribution, six FAQ items with a matching FAQPage JSON-LD) in which every number is read from lib/password.**

## Performance

- **Duration:** about 5 min (23:29Z to 23:34Z)
- **Tasks:** 2
- **Files:** 7 (5 created, 2 modified)

## Accomplishments

- `faq-data.ts`: six `FaqItem`s in the D-14 order. Q1 to Q4 are template strings over the barrel (85-character pool, about 128 bits Very strong, 7,776 words, 12.9 and 3.3 bits, about 77 bits Strong, thresholds "Below 40 / 40 to 74 / 75 to 99 / 100 or more", both guess-rate labels verbatim, `drop-down, felt-tip, t-shirt and yo-yo`, "no practical effect"). Q5 and Q6 are the D-15 drafts verbatim. A repo-wide grep confirms no number literal is restated outside comments.
- `PasswordExample.tsx` (server component): default-password prose, a `password-worked-example-shape` pre holding `word-word-word-word-word-word` built from `WORDS_DEFAULT`, default-passphrase prose, and the `password-attribution` block naming the EFF Large Wordlist for Passphrases (2016), the EFF, CC BY, unmodified, all 7,776 words including the 4 hyphenated ones, with two `rel="noreferrer"` links. No generator is called.
- `eff-links.ts` exports `EFF_WORDLIST_URL` and `EFF_LICENCE_URL` for this block and the 14-05 credit line.
- `page.tsx`: D-12 title and description, canonical, Open Graph, robots entry deleted, `password-intro` paragraph, `ToolAbout slug="password"` as last child of `main`. The page imports neither the island nor the word list.
- `password-seo.spec.ts` (6 tests incl. the JS-disabled `expectServerAboutParity` run) and the updated `password-ssr.spec.ts` (final metadata, no noindex or robots meta, attribution and all six FAQ questions in the raw HTML, no EFF marker in HTML or flight payloads).

## Task Commits

1. **Task 1: FAQ data and worked example from lib/password constants, EFF attribution** - `e5bab08` (feat)
2. **Task 2: Final metadata, intro and ToolAbout, SEO and production SSR specs** - `b90a2c7` (feat)

## Decisions Made

- Share computed default figures between the FAQ and the worked example through an exported `defaultFigures`, and the "about"-prefix rule through `aboutTime` (UI-SPEC: no "about more than").
- Exempt RSC element references (`$hex:props:children:...`) from the production flight-payload leak scan (see deviation 1), with positive and negative controls in the spec.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Production flight leak scan false-positived on the About chevron's RSC reference**
- **Found during:** Task 2 (first production SSR run)
- **Issue:** Adding `ToolAbout` puts `$14:props:children:0:props:children:0:props:children:0:props:iconNode` (an RSC element reference from the lucide chevron) into the flight data. At more than 20 characters over pool characters with all four classes, the Phase 13 detector reported it as a leaked password.
- **Fix:** `isBuildArtifact` also ignores values matching `^\$[0-9a-f]+(?::[A-Za-z]+|:\d+)+$`. Controls added: the reference is not flagged, while `$Aa0!Aa0!Aa0!Aa0!Aa0!` still is.
- **Files modified:** `tests/e2e-prod/password-ssr.spec.ts`
- **Verification:** production SSR spec 5/5 pass.
- **Committed in:** `b90a2c7`

**2. [Process] TDD order for Task 1**
- Implementation and test were written in the same step and the test passed on first run, so no separate failing RED run was recorded for Task 1. The test is a recompute-from-library assertion set and was run green before commit.

---

**Total deviations:** 1 auto-fixed (1 test-detector bug), 1 process note. **Impact:** none on shipped behavior.

## Issues Encountered

- The production webServer build prints the same pre-existing Tailwind `Invalid media query` warning noted in 14-01; it does not fail the build.
- The prod build shares `.next` with the running dev server; the dev server kept serving 200 and the full dev password e2e set (41 tests) passed afterwards.

## Human Checks Queued (batched milestone UAT)

1. D-15 / PREG-02: approve FAQ Q5 "Is my password sent anywhere or saved?" and Q6 "Does Packetory clear my clipboard?" (About, FAQ), the page description and intro wording "Runs locally in your browser". Copy-only edit in `faq-data.ts` or `page.tsx` if changed.
2. PHR-04: approve the EFF CC BY attribution wording (About, Worked example, "Word list"); both links must open eff.org.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register: the two outbound eff.org links carry `rel="noreferrer"` (T-14-07), FAQ answers are plain strings emitted only through the escaping JSON-LD builder (T-14-06), and the production scans cover T-14-05.

## Verification

- `npx vitest run app/tools/password app/tools/pages-about.test.ts`: 9 files, 227 tests passed (faq-data: 8 tests).
- `npx playwright test tests/e2e/password`: 41 passed (includes password-seo, 6 tests).
- `npx playwright test -c playwright.prod.config.ts password-ssr`: 5 passed.
- `npm run typecheck` and eslint on the touched files: clean. `package.json` and `package-lock.json` unchanged.
- Acceptance greps: `index: false` 0, `ToolAbout slug="password"` 1, new title 1, `noindex, nofollow` in prod spec 0, `expectServerAboutParity` 2, `use client` in PasswordExample 0, restated literals in faq-data 0.

## Next Phase Readiness

Ready for 14-05 (credit line imports `eff-links.ts`) and 14-07 (registry registration; `about.spec`, `about-prod` and `pages-about` will then iterate password). The tool is not yet in the registry or sitemap, so it is still reachable only by direct URL even though noindex is gone.

---
*Phase: 14-passphrase-strength-launch*
*Completed: 2026-11-11*

## Self-Check: PASSED

All created files exist and both task commits (`e5bab08`, `b90a2c7`) are ancestors of HEAD.
