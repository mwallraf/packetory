---
phase: 05-mac-address-inspector
plan: 01
subsystem: ui
tags: [nextjs, react, typescript, tailwind, mac-address, vitest, playwright]

# Dependency graph
requires:
  - phase: 04-dns-lookup
    provides: Server-shell + client-island page pattern, per-field copy button pattern, keyboard-shortcut hookup, FAQ/JSON-LD page shape
provides:
  - lib/mac/{types,parse,format}.ts — pure, framework-agnostic, total-function MAC parsing and 4-format normalization (no network, no throws)
  - app/tools/mac/{page,MacToolLoader,MacTool,faq-data}.tsx — the live MAC Address Inspector page, registered active in tools/registry.ts
  - Result-panel structure with labeled Classification/Vendor stub sections for 05-02/05-03 to extend in place
affects: [05-mac-address-inspector plan 02, 05-mac-address-inspector plan 03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Strip-then-length-check total-function parsing (no bounded/backtracking regex needed for fixed-length input classes)"
    - "Per-field useCopyToClipboard() instance + Copy-all aggregate action, reused verbatim from DnsRecordRow's pattern"
    - "Labeled stub sections within an already-shipped result panel so a later vertical slice extends in place rather than restructuring"

key-files:
  created:
    - lib/mac/types.ts
    - lib/mac/parse.ts
    - lib/mac/parse.test.ts
    - lib/mac/format.ts
    - lib/mac/format.test.ts
    - app/tools/mac/page.tsx
    - app/tools/mac/MacToolLoader.tsx
    - app/tools/mac/MacTool.tsx
    - app/tools/mac/MacTool.test.tsx
    - app/tools/mac/faq-data.ts
    - tests/e2e/mac-lookup.spec.ts
  modified:
    - tools/registry.ts
    - tools/registry.test.ts
    - app/sitemap.test.ts
    - tests/e2e/navigation.spec.ts
    - tests/e2e/home.spec.ts

key-decisions:
  - "DEFAULT_MAC = 3C:22:FB:AA:BB:CC (Apple-range OUI, first octet 0x3C, U/L bit clear) — matches the address used in 05-RESEARCH.md's worked examples and confirmed universally-administered so 05-02 will never flag it as randomized"
  - "Result panel ships labeled but inert 'Classification' and 'Vendor' stub sections below the 4 format rows, per the plan's explicit instruction, so 05-02/05-03 extend the panel in place"
  - "Flipping tools/registry.ts mac.status to active broke 4 pre-existing tests hardcoding a 'mac stays planned' assumption — fixed in place (same class of break as the Phase 2 uuid flip and Phase 4 dns flip)"

patterns-established:
  - "MAC input class needs no bounded/backtracking-safe regex — a single global hex-only strip plus an exact-length check is already ReDoS-safe (05-RESEARCH.md Pitfall 4), documented explicitly in lib/mac/parse.ts's doc comment as a deliberate departure from lib/dns/validate.ts's bounded-regex defensiveness"

requirements-completed: [MAC-01, MAC-02, MAC-09]

coverage:
  - id: D1
    description: "parseMacInput accepts all 4 separator formats (colon/dash/Cisco-dot/no-separator) plus messy noise, rejects partial/over-length/garbage input, and never throws for any string input"
    requirement: "MAC-01"
    verification:
      - kind: unit
        ref: "lib/mac/parse.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "formatMac produces all 4 uppercase, zero-padded simultaneous variants (colon/dash/Cisco-dot/no-separator) from a parsed byte tuple"
    requirement: "MAC-02"
    verification:
      - kind: unit
        ref: "lib/mac/format.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Loading /tools/mac shows the demo MAC already normalized into all 4 format variants on first paint, with no typing required (D-06)"
    requirement: "MAC-01"
    verification:
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#auto-normalizes the demo MAC into all 4 formats on load, no typing required"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#renders the demo MAC normalized into all 4 formats on mount"
        status: pass
    human_judgment: false
  - id: D4
    description: "Retyping in any of the 4 accepted separator formats updates all 4 normalized variants live"
    requirement: "MAC-01"
    verification:
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#retyping in a different separator style updates all 4 variants live (MAC-01, MAC-02)"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#updates all 4 variants live when retyping in a different separator style"
        status: pass
    human_judgment: false
  - id: D5
    description: "Each format row has its own copy button with a visible + aria-live 'Copied!' confirmation; a 'Copy all' action copies the complete result"
    requirement: "MAC-09"
    verification:
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#copying a format row shows a visible confirmation (MAC-09)"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#a per-format copy button reaches the 'Copied!' state with an accessible announcement (MAC-09)"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#the Copy all button copies a combined block of all 4 formats (MAC-09)"
        status: pass
    human_judgment: false
  - id: D6
    description: "An incomplete/invalid in-progress edit shows a neutral inline note and keeps the last valid result visible at reduced opacity — never blanks the panel (D-07)"
    verification:
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#an incomplete MAC shows the D-07 neutral note while the last valid result stays visible"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#shows the D-07 neutral incomplete-input note and keeps the last valid result visible"
        status: pass
    human_judgment: false
  - id: D7
    description: "tools/registry.ts mac entry is status:active (page reachable, card no longer 'Coming soon'); clientOnly stays false"
    verification:
      - kind: unit
        ref: "tools/registry.test.ts#uuid, subnet, dns, and mac are all 'active'"
        status: pass
      - kind: e2e
        ref: "tests/e2e/home.spec.ts#no card shows a 'Coming soon' badge now that all four registry tools are 'active'"
        status: pass
    human_judgment: false
  - id: D8
    description: "A fixed-height skeleton renders only for the pre-hydration first paint, then is replaced by the client island (no CLS at 320px)"
    verification:
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#format rows wrap without forcing horizontal page scroll"
        status: pass
    human_judgment: false
  - id: D9
    description: "A messy pasted MAC-like string with stray whitespace or a trailing interface name does not break parsing — extracts or rejects the 12 hex digits regardless of surrounding noise (backstop)"
    verification:
      - kind: unit
        ref: "lib/mac/parse.test.ts#extracts hex digits despite surrounding whitespace/punctuation noise carrying no extra hex characters"
        status: pass
      - kind: unit
        ref: "lib/mac/parse.test.ts#rejects (never crashes on) messy input whose trailing noise itself contains extra hex-valid characters"
        status: pass
    human_judgment: true
    rationale: "The 320px input-row layout half of this backstop truth (visual, not just parse-correctness) was not independently screenshot-verified — flagging for human UAT per the plan's backstop verification tier."
  - id: D10
    description: "MUST NOT auto-insert or auto-reformat separators into the live MAC input field as the user types (prohibition MAC-01)"
    verification:
      - kind: unit
        ref: "app/tools/mac/MacTool.test.tsx#never auto-reformats the live input field as the user types (prohibition MAC-01)"
        status: pass
    human_judgment: true
    rationale: "Plan's own must_haves.prohibitions entry is flagged verification:judgment — a passing regression test exists, but the plan explicitly reserves final sign-off for human/judgment review, not automation alone."

# Metrics
duration: 15min
completed: 2026-07-25
status: complete
---

# Phase 5 Plan 1: MAC Address Inspector Walking Skeleton Summary

**Pure client-side MAC parse/format core (`lib/mac/`) plus the live `/tools/mac` page: demo MAC normalized into colon/dash/Cisco-dot/no-separator formats on load, live-updates on retype, per-field + copy-all clipboard confirmation, and a neutral dim-and-keep note on incomplete input — registry flipped to active.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-25T15:07:27+02:00
- **Completed:** 2026-07-25T15:21:40+02:00
- **Tasks:** 3
- **Files modified:** 16 (11 created, 5 modified)

## Accomplishments
- `lib/mac/parse.ts`/`format.ts`/`types.ts`: total-function, never-throws MAC parsing (all 4 separator formats + messy-noise handling) and 4-simultaneous-variant formatting, with no bounded/backtracking regex needed
- `/tools/mac` live page: demo MAC (`3C:22:FB:AA:BB:CC`) auto-normalized into all 4 formats on first paint, live retype in any separator style, per-field + "Copy all" clipboard confirmation, D-07 dim-and-keep on incomplete input, `/`-focus and Esc-reset keyboard shortcuts
- `tools/registry.ts` `mac` entry flipped from `"planned"` to `"active"`, with all downstream registry-derived surfaces (sitemap, nav, mobile drawer, landing-page cards) verified consistent
- Result panel carries labeled "Classification"/"Vendor" stub sections so 05-02 (bit classification) and 05-03 (vendor lookup) extend the shipped panel in place rather than restructuring it

## Task Commits

Each task was committed atomically (TDD RED → GREEN pairs):

1. **Task 1: Pure parse + format core logic**
   - `aea3ef9` (test) — failing tests for `parseMacInput`/`formatMac`
   - `d42d1c2` (feat) — implementation, all tests green
2. **Task 2: Live MAC page — demo on load, 4 format rows, copy, keep-last-valid, registry flip**
   - `b3e7cfd` (test) — failing test for `MacTool`
   - `af67e1f` (feat) — page/loader/tool/faq-data + registry flip + 4 pre-existing test fixes
3. **Task 3: Happy-path e2e**
   - `3867d30` (test) — e2e spec, all 5 scenarios green

_TDD tasks each produced a RED commit followed by a GREEN commit, per the plan's `tdd="true"` gate._

## Files Created/Modified
- `lib/mac/types.ts` - `ParsedMac`/`MacFormats` discriminated types
- `lib/mac/parse.ts` - total-function MAC input parser (strip-then-length-check)
- `lib/mac/parse.test.ts` - parse behavior + total-function regression tests
- `lib/mac/format.ts` - 4-simultaneous-variant formatter
- `lib/mac/format.test.ts` - format behavior tests
- `app/tools/mac/page.tsx` - Server Component shell, metadata, worked example, FAQ, JSON-LD
- `app/tools/mac/MacToolLoader.tsx` - `ssr:false` client boundary + fixed-height skeleton
- `app/tools/mac/MacTool.tsx` - the client island: input, 4 format rows, copy buttons, D-07 dim-and-keep, classification/vendor stubs
- `app/tools/mac/MacTool.test.tsx` - component tests
- `app/tools/mac/faq-data.ts` - FAQ items + worked-example constants
- `tests/e2e/mac-lookup.spec.ts` - happy-path e2e
- `tools/registry.ts` - `mac.status` `"planned"` → `"active"`
- `tools/registry.test.ts` - updated expected statuses (mac now active)
- `app/sitemap.test.ts` - updated expected sitemap tool URLs (mac now included)
- `tests/e2e/navigation.spec.ts` - mobile drawer now expects 4 links, incl. a visible MAC link
- `tests/e2e/home.spec.ts` - no card shows "Coming soon" now that all four tools are active

## Decisions Made
- `DEFAULT_MAC = "3C:22:FB:AA:BB:CC"` chosen as the D-06 demo address: a real Apple-range OUI (matching 05-RESEARCH.md's worked examples), with first octet `0x3C` confirmed to have the U/L bit clear (universally administered) so 05-02's future randomization flag will never misclassify it.
- This plan's synchronous parse/format core needed none of DNS's debounce/AbortController/sequence-token machinery — `MacTool.tsx` is a plain controlled-input component, simpler than `DnsTool.tsx`, since 05-01 explicitly excludes the async vendor lookup (05-03).
- Result panel's "Classification"/"Vendor" sections are intentionally inert stubs (labeled headings + one line of muted prose), not yet wired to real data — see Known Stubs below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/3 - Registry flip regression, same class as prior-phase precedent] Fixed 4 pre-existing tests hardcoding a "mac stays planned" assumption**
- **Found during:** Task 2 (registry status flip)
- **Issue:** Flipping `tools/registry.ts` `mac.status` to `"active"` broke `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/navigation.spec.ts`, and `tests/e2e/home.spec.ts`, each of which asserted MAC stayed `"planned"` (identical to the break documented for the Phase 2 uuid flip and Phase 4 dns flip in STATE.md).
- **Fix:** Updated all 4 tests in place to expect MAC as the 4th active tool: registry/sitemap tests now list mac alongside uuid/subnet/dns; the mobile-drawer e2e test now expects 4 links (was 3) with a visible MAC link; the home-page e2e test now expects zero "Coming soon" badges across all 4 cards (was 1).
- **Files modified:** `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/navigation.spec.ts`, `tests/e2e/home.spec.ts`
- **Verification:** Full unit suite (215/215) and full e2e suite (56/56) pass.
- **Committed in:** `af67e1f` (Task 2 commit)

**2. [Rule 1 - Bug] Corrected the messy-input backstop test's own faulty assumption**
- **Found during:** Task 1 RED→GREEN cycle
- **Issue:** The originally-drafted parse test asserted a trailing interface-name suffix ("interface0") would be stripped away with zero effect on the result — but "interface0" itself contains hex-valid characters (e, f, a, c, e, 0), so the strip-then-count algorithm correctly counts 18 hex characters total and rejects it, not the 12 the test assumed.
- **Fix:** Replaced the single test with two: one demonstrating correct extraction when trailing noise contains zero hex-valid characters, and one demonstrating correct rejection (never a crash, never a silent mis-parse) when noise itself contributes extra hex-valid characters — matching the plan's own backstop language ("correctly extracts OR REJECTS the 12 hex digits regardless of surrounding noise").
- **Files modified:** `lib/mac/parse.test.ts`
- **Verification:** `npm run test -- lib/mac/parse.test.ts` passes (19/19).
- **Committed in:** `d42d1c2` (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 registry-flip regression fix spanning 4 test files, 1 test-authoring correction)
**Impact on plan:** Both fixes necessary for correctness of the test suite; no scope creep — no new product behavior was added beyond what the plan specified.

## Issues Encountered
None beyond the deviations documented above.

## Known Stubs

The result panel's "Classification" and "Vendor" sections (`app/tools/mac/MacTool.tsx`, `data-testid="mac-classification-section"` / `"mac-vendor-section"`) render only a heading and a static "ships in a later update" line — no real data, by explicit plan design (Task 2's action text: "leave a labeled 'Classification' / 'Vendor' section stub so later slices extend, not restructure"). This is intentional and does not block this plan's goal (MAC-01/MAC-02/MAC-09, format normalization only) — MAC-04..MAC-08 (OUI/U-L/I-G/randomization/vendor) are explicitly owned by 05-02 and 05-03, which extend this same panel in place.

## User Setup Required

None — no external service configuration required. This plan is fully client-side (no `/api/mac-vendor` route yet; that ships in 05-03).

## Next Phase Readiness
- `lib/mac/{types,parse,format}.ts` is ready for 05-02 to build `classify.ts` on top of the same `bytes` tuple `parseMacInput` already produces.
- `MacTool.tsx`'s result panel has labeled stub sections at the exact insertion points 05-02 (Classification) and 05-03 (Vendor) need — no restructuring required.
- `/tools/mac` is live, statically prerendered (`next build` confirms `○ /tools/mac`), and registered active across sitemap/nav/landing-page card — no blockers for 05-02/05-03.

---
*Phase: 05-mac-address-inspector*
*Completed: 2026-07-25*

## Self-Check: PASSED

All 11 created files verified present on disk; all 5 task commit hashes (`aea3ef9`, `d42d1c2`, `b3e7cfd`, `af67e1f`, `3867d30`) verified present in `git log --oneline --all`.
