---
phase: 05-mac-address-inspector
plan: 02
subsystem: ui
tags: [nextjs, react, typescript, tailwind, mac-address, bit-classification, vitest, playwright]

# Dependency graph
requires:
  - phase: 05-mac-address-inspector plan 01
    provides: lib/mac/{types,parse,format}.ts (bytes tuple + total-function parsing), the live /tools/mac page with labeled Classification/Vendor stub sections to extend in place
provides:
  - lib/mac/classify.ts — pure, network-free classifyMac(bytes) deriving OUI, U/L, I/G, and randomization-likely from bytes[0..2] alone (MAC-04..MAC-08)
  - lib/mac/types.ts extended with MacClassification, MacSuccessResult, and MacLookupState (dim-and-keep discriminated union, D-07)
  - app/tools/mac/MacTool.tsx's Classification section now live — OUI prefix field + U/L/I/G/randomization-hedge badges with locked D-08/D-09 copy
affects: [05-mac-address-inspector plan 03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure, synchronous, network-free bit classification computed immediately after a successful parse, structurally before any future vendor-lookup scheduling (MAC-08 ordering guarantee)"
    - "ClassificationBadge component: neutral/outline Badge + one-line plain-language explanation as visible text, never color alone (QUAL-05)"

key-files:
  created:
    - lib/mac/classify.ts
    - lib/mac/classify.test.ts
  modified:
    - lib/mac/types.ts
    - app/tools/mac/MacTool.tsx
    - app/tools/mac/MacTool.test.tsx
    - tests/e2e/mac-lookup.spec.ts

key-decisions:
  - "MacLookupState kept minimal (idle | incomplete-input | success) rather than pre-building vendor-lookup variants — mirrors DnsLookupState's dim-and-keep shape but leaves 05-03 free to add vendor states without this plan guessing their exact shape"
  - "OUI prefix field reuses the existing FormatRow component (label='OUI prefix', testId='mac-oui') rather than a new component — gives it the same Geist Mono value + per-field copy button pattern as the 4 format rows for free (MAC-09)"
  - "classifyMac is called before formatMac in handleInputChange (not just 'somewhere in the same block') to make the MAC-08 ordering requirement literally visible in the diff, even though the two pure calls have no real ordering dependency on each other"

patterns-established:
  - "ClassificationBadge (icon + label pill + explanation text): neutral/outline Badge variant only, reused for all 3 classification badge types (U/L, I/G, randomization-hedge) — establishes the badge-with-explanation shape for any future non-destructive, non-accent informational badge in this codebase"

requirements-completed: [MAC-04, MAC-05, MAC-06, MAC-07, MAC-08]

coverage:
  - id: D1
    description: "For a valid MAC, the OUI prefix (first 3 bytes, uppercase) is displayed as its own field (MAC-04)"
    requirement: "MAC-04"
    verification:
      - kind: unit
        ref: "lib/mac/classify.test.ts#classifies a universally-administered unicast address (byte0=0x00)"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#renders the OUI prefix field for the demo MAC (MAC-04)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#classification (OUI, U/L, I/G) renders on load with zero vendor network dependency (MAC-04, MAC-05, MAC-06, MAC-08)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A U/L badge shows 'Universally Administered.'/'Locally Administered.' with the exact D-08 explanation, never color alone (QUAL-05, MAC-05)"
    requirement: "MAC-05"
    verification:
      - kind: unit
        ref: "lib/mac/classify.test.ts#classifies the canonical locally-administered address (byte0=0x02)"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#renders the U/L and I/G badges with their explanation text for the universally-administered, unicast demo MAC (MAC-05, MAC-06, no randomization badge)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#a locally-administered MAC shows the exact D-09 randomization-hedge badge (MAC-07)"
        status: pass
    human_judgment: false
  - id: D3
    description: "An I/G badge shows 'Unicast.'/'Multicast.' with the exact D-08 explanation (MAC-06)"
    requirement: "MAC-06"
    verification:
      - kind: unit
        ref: "lib/mac/classify.test.ts#classifies the IPv4-multicast MAC as universally-administered, NOT randomized (I/G=1 but U/L=0, byte0=0x01)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#a multicast MAC (01:00:5E) shows a Multicast badge and NO randomization badge — the flag tracks U/L, not I/G (D-10)"
        status: pass
    human_judgment: false
  - id: D4
    description: "When the U/L bit is set, the exact locked 'Likely randomized (privacy MAC).' badge + explanation renders, driven by U/L alone, never I/G (MAC-07, D-09, D-10)"
    requirement: "MAC-07"
    verification:
      - kind: unit
        ref: "lib/mac/classify.test.ts#classifies the broadcast address as locally-administered multicast (byte0=0xFF)"
        status: pass
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#shows the exact D-09 randomization-hedge badge for a locally-administered input (MAC-07)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#a locally-administered MAC shows the exact D-09 randomization-hedge badge (MAC-07)"
        status: pass
    human_judgment: false
  - id: D5
    description: "All classification is computed synchronously the instant a MAC parses valid, zero network dependency (MAC-08, Pitfall 2 ordering)"
    requirement: "MAC-08"
    verification:
      - kind: unit
        ref: "grep -n classifyMac( app/tools/mac/MacTool.tsx — no vendor/fetch reference anywhere in the file"
        status: pass
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#classification (OUI, U/L, I/G) renders on load with zero vendor network dependency (MAC-04, MAC-05, MAC-06, MAC-08)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A valid MAC always renders exactly 4 format rows and exactly 2 or 3 classification badges — fixed cardinality"
    verification:
      - kind: e2e
        ref: "tests/e2e/mac-lookup.spec.ts#a valid MAC always renders exactly 4 format rows and 2-3 classification badges (fixed cardinality)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Badges use the neutral/outline variant, never destructive/accent (UI-SPEC Color section prohibition)"
    verification:
      - kind: integration
        ref: "app/tools/mac/MacTool.test.tsx#uses the neutral/outline Badge variant for U/L, I/G, and randomization badges — never destructive/accent (Color section)"
        status: pass
    human_judgment: false

# Metrics
duration: 10min
completed: 2026-07-25
status: complete
---

# Phase 5 Plan 2: MAC Address Inspector Bit-Level Classification Summary

**Pure, offline `classifyMac(bytes)` (`lib/mac/classify.ts`) deriving OUI/U-L/I-G/randomization from a MAC's first octet, wired synchronously into `MacTool.tsx` as a live OUI field + Lock/Unlock, User/Radio, and conditional ShieldAlert badge row with the locked D-08/D-09 copy — proven independent of any vendor network via a no-mock e2e (MAC-08).**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-25T15:25:55+02:00
- **Completed:** 2026-07-25T15:31:00+02:00
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- `lib/mac/classify.ts`: pure, network-free `classifyMac(bytes)` — OUI prefix, I/G (unicast/multicast), U/L (universal/local), and the randomization-likely hedge flag, all derived from `bytes[0..2]` alone; live-cross-checked D-10 test vectors including the `01:00:5E` multicast-but-not-randomized case that proves the flag tracks U/L, never I/G
- `lib/mac/types.ts` extended with `MacClassification`, `MacSuccessResult`, and `MacLookupState` (mirrors `DnsLookupState`'s dim-and-keep discriminated-union convention, D-07)
- `MacTool.tsx`'s Classification stub section is now live: OUI prefix field (own copy button, MAC-09), U/L badge (Lock/Unlock), I/G badge (User/Radio), and — only when locally-administered — the exact locked "Likely randomized (privacy MAC)." hedge badge (ShieldAlert), each with its D-08 explanation as visible text (QUAL-05, never color alone)
- `classifyMac` is called synchronously immediately after a successful `parseMacInput`, structurally before any vendor-lookup scheduling could ever be reached — the MAC-08 ordering guarantee, proven by a no-`page.route`-mock e2e test asserting classification renders with zero vendor network involvement
- e2e coverage extended: classification-on-load, exact D-09 hedge wording, D-10 multicast-not-randomized proof, fixed 4-format/2-3-badge cardinality, and 320px badge-row wrap-without-scroll

## Task Commits

Each task was committed atomically (TDD RED → GREEN pairs):

1. **Task 1: Pure bit classification (`lib/mac/classify.ts`) + type extensions**
   - `234f1f8` (test) — failing test for `classifyMac`, 4 D-10 vectors
   - `d0c4c43` (feat) — implementation + `lib/mac/types.ts` extension, all tests green
2. **Task 2: Wire classification into MacTool — OUI field + U/L, I/G, randomization-hedge badges**
   - `c5dec97` (test) — failing test for OUI field + badges
   - `7679d70` (feat) — `MacTool.tsx` wiring, all tests green
3. **Task 3: e2e — classification visible on load, no vendor network**
   - `1081fbe` (test) — e2e spec extension, all 10 scenarios in the file green

_Both TDD tasks each produced a RED commit followed by a GREEN commit, per the plan's `tdd="true"` gate. Task 3 is not TDD-gated (no `tdd="true"` attribute) — tests were written and verified green directly._

## Files Created/Modified
- `lib/mac/classify.ts` - pure, network-free bit-level classification (OUI, U/L, I/G, randomization-likely)
- `lib/mac/classify.test.ts` - 4 D-10-verified test vectors, incl. the multicast-not-randomized proof
- `lib/mac/types.ts` - added `MacClassification`, `MacSuccessResult`, `MacLookupState`
- `app/tools/mac/MacTool.tsx` - OUI field + U/L/I/G/randomization badge row wired into the Classification section; `classifyMac` called synchronously right after parse
- `app/tools/mac/MacTool.test.tsx` - 5 new tests for OUI field, badge content/absence, exact D-09 wording, and neutral Badge variant
- `tests/e2e/mac-lookup.spec.ts` - 6 new e2e tests (classification-on-load, D-09 hedge, D-10 multicast, fixed cardinality, 320px badge-row wrap)

## Decisions Made
- `MacLookupState` deliberately kept minimal (`idle | incomplete-input | success`) rather than pre-guessing 05-03's vendor-state shape — the plan only required it to exist and mirror `DnsLookupState`'s dim-and-keep convention, not to anticipate every future variant.
- The OUI prefix field reuses the existing `FormatRow` component verbatim (same Geist Mono value + per-field copy button pattern), avoiding a new one-off component for a single field.
- `classifyMac(parsed.bytes)` is called and stored in a local `classification` variable before `formatMac(parsed.bytes)` in `handleInputChange`, making the MAC-08 ordering requirement literally visible in the code even though the two pure functions have no real interdependency.

## Deviations from Plan
None — plan executed exactly as written. All 5 must_haves.truths, all 5 requirements (MAC-04..MAC-08), and the single `must_haves.prohibitions` entry (never presenting randomization as certain fact — the hedge copy is used verbatim, unedited) were satisfied without any auto-fix, architectural change, or scope adjustment.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. This plan is fully client-side and offline (no `/api/mac-vendor` route yet; that ships in 05-03).

## Known Stubs
The result panel's "Vendor" section (`app/tools/mac/MacTool.tsx`, `data-testid="mac-vendor-section"`) still renders only a heading and a static "ships in a later update" line — unchanged from 05-01, by explicit plan design (this plan's scope is Classification only; Vendor is 05-03's deliverable). Not a gap in this plan's own goal (MAC-04..MAC-08, classification only).

## Next Phase Readiness
- `lib/mac/classify.ts`'s `MacClassification` (specifically `ouiHex`) is ready for 05-03 to build `lib/mac/vendor.ts`'s OUI-only `/api/mac-vendor?oui=` fetch on top of, per 05-RESEARCH.md's Pattern 3 (D-12: 05-03 will skip the vendor call entirely when `classification.randomizationLikely` is true).
- `MacTool.tsx`'s Classification section is fully live; only the "Vendor" stub section remains for 05-03 to extend in place — no restructuring required.
- `npm run test`, `npm run test:e2e`, `npm run typecheck`, and `npm run lint` are all green (224 unit tests, 61 e2e tests) — no blockers for 05-03.

---
*Phase: 05-mac-address-inspector*
*Completed: 2026-07-25*

## Self-Check: PASSED

All 2 created files verified present on disk; all 5 task commit hashes (`234f1f8`, `d0c4c43`, `c5dec97`, `7679d70`, `1081fbe`) verified present in `git log --oneline --all`.
