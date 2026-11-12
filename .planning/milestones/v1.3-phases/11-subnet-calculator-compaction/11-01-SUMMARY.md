---
phase: 11-subnet-calculator-compaction
plan: 01
subsystem: ui
tags: [subnet, layout, tailwind, playwright, cls]

requires:
  - phase: 10-shared-about-section-config-parity
    provides: ToolAbout shared section, max-w-6xl precedent for lg-widened main
provides:
  - Compacted Subnet Calculator island that fits 1366x650 and 1280x600 unscrolled (IPv4 /24 default and IPv6 /64)
  - subnet-layout.spec.ts layout gate (21 tests) for SUBNET-08/09/10 and the skeleton pin
  - Skeleton re-pinned per breakpoint (844 / 542 / 317px)
affects: [phase-14-preflight-lighthouse, milestone-uat]

tech-stack:
  added: []
  patterns:
    - "One-row field cards (text column plus 44px copy button), 3-column grid at lg"
    - "Layout gate spec that reads skeleton pins from source and fails on >4px drift"

key-files:
  created:
    - tests/e2e/subnet-layout.spec.ts
  modified:
    - app/tools/subnet/SubnetTool.tsx
    - app/tools/subnet/page.tsx
    - app/tools/subnet/SubnetToolLoader.tsx
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Widen subnet main to max-w-6xl at lg only; ToolAbout keeps its own max-w-3xl (P-1)"
  - "CIDR block and hero share one row as equal halves at lg (P-3)"
  - "12px family badge chip stays 12px and is exempt; SUBNET-10 reworded to body text (U-1)"
  - "Lighthouse capture deferred to the batched milestone UAT; PENDING section written (U-2)"

patterns-established:
  - "Compaction by layout only: no field hidden, no transform/scale/clipping, text sizes unchanged"

requirements-completed: [SUBNET-08, SUBNET-09, SUBNET-10]

duration: 20min
completed: 2026-11-11
status: complete
actuals:
  tokens: 30000
  tasks: 3
  commits: 3
plan_head_before: c254f833ba09fa0fdf6143e0e37f3004e339acd6
plan_head_after: 5f8369fb7b552f0992d00a4ec9ce7d31ff8fcaac
---

# Phase 11 Plan 01: Subnet Calculator Compaction Summary

**The whole default Subnet result (CIDR row, hero and all nine IPv4 cards) now ends at 504px at both laptop sizes, down from 975px, using one-row field cards, a 3-column grid at lg and the CIDR block beside the hero.**

## Performance

- **Duration:** about 20 min
- **Completed:** 2026-11-11
- **Tasks:** 3 (3 code commits: 9f5d96b, 8170a06, 5f8369f)
- **Files modified:** 5 (plus the new spec)

## Accomplishments

- IPv4 /24 default fits 1366x650 and 1280x600 unscrolled (toolBottom 504px, 146px and 96px of headroom).
- IPv6 /64 (documentation prefix and a long-valued prefix) fits 1366x650 unscrolled (toolBottom 528px, 122px headroom).
- All 21 layout tests pass; field order, untruncated values, 14px body text, 44px copy controls, copy confirmation, clearing the input, the /32 four-card case and 320/375px overflow are enforced.
- Skeleton pinned `h-[844px] sm:h-[542px] lg:h-[317px]`, gated within 4px.

## Task Commits

1. **Task 1: tracer, compact and prove SUBNET-08** - `9f5d96b` (feat)
2. **Task 2: IPv6 /64, integrity, /32, narrow-width gates and SUBNET-10 rewording** - `8170a06` (test)
3. **Task 3: re-pin skeleton, release gate** - `5f8369f` (feat). Superseded as the Phase 11 code commit by review fixes 85bee5f and 19d739a (see Lighthouse section).

## Baseline vertical budget

Red run of the new spec against the uncompacted layout (both tests failed, as required). Identical at both sizes since both are wider than max-w-3xl:

| Size | header | main top pad (h1Top - headerBottom) | h1 | CIDR row | hero | field grid | toolBottom |
|------|--------|-----|----|----------|------|------------|------------|
| 1366x650 | 0-69 (69) | 48 | 38 | 187-245 (58) | 277-355 (78) | 387-975 (588) | 975 |
| 1280x600 | 0-69 (69) | 48 | 38 | 187-245 (58) | 277-355 (78) | 387-975 (588) | 975 |

Matches the planning-time numbers (toolBottom 975). Over the viewport by 325px at 1366x650 and 375px at 1280x600.

After compaction (green run, no lever from the fallback list needed):

| Size | CIDR row | hero | field grid | toolBottom | headroom |
|------|----------|------|------------|------------|----------|
| 1366x650 | 187-245 | 187-249 | 265-504 | 504 | 146 |
| 1280x600 | 187-245 | 187-249 | 265-504 | 504 | 96 |

## IPv6 /64 target

SUBNET-09 target: full output unscrolled at 1366x650. `[subnet-layout]` lines (cardBottoms omitted here):

- `2001:db8::/64` at 1366x650: `{"viewport":"1366x650","scrollY":0,"innerHeight":650,"gridTop":265,"gridBottom":528,"toolBottom":528}`
- `fd12:3456:789a:bcde::/64` at 1366x650: `{"viewport":"1366x650","scrollY":0,"innerHeight":650,"gridTop":265,"gridBottom":528,"toolBottom":528}`
- `2001:db8::/64` at 1280x600 (logged, not gated): toolBottom 528, innerHeight 600
- `fd12:3456:789a:bcde::/64` at 1280x600 (logged, not gated): toolBottom 528, innerHeight 600

## Release gate (run one after another)

1. `npm run typecheck`: exit 0, no errors.
2. `npm run lint`: 0 errors, 1 warning (`MacVendorRouteResponse` unused, pre-existing and out of scope).
3. `npm run test`: `Test Files 56 passed (56)`, `Tests 743 passed (743)`.
4. `npm run build`: compiled, all `/tools/*` routes `○ (Static)`.
5. `npm run test:e2e`: `163 passed (15.1s)`.
6. `npm run test:e2e:prod`: `13 passed (9.5s)`.

Invariants: `git diff --quiet 8a94a0f -- lib/subnet tests/e2e/subnet.spec.ts tests/e2e/subnet-seo.spec.ts app/tools/subnet/SubnetTool.test.tsx package.json package-lock.json` exits 0; all 18 pre-phase `data-testid` literals present in SubnetTool.tsx; `dangerouslySetInnerHTML` count 0.

## Deviations from Plan

None - plan executed exactly as written. The optional fallback levers (`mt-6`, `gap-2`) were not needed.

## Auth gates

None.

## Known Stubs

None.

## Threat Flags

None. The change touches classNames, one wrapper div and one column div only.

## Lighthouse baseline (/tools/subnet)

- Runner: PENDING — captured at milestone UAT
- Phase 11 code commit: 19d739aed31a42bda83785fb4db04a6b0d2e8960
- Production: https://packetory.dev/tools/subnet (deployment of 34995af9fad5c33a31d6b076f99678ebb588f610)
- Preview: PENDING — captured at milestone UAT

| Run | Performance | Accessibility | Best Practices | SEO | CLS |
|-----|-------------|---------------|----------------|-----|-----|
| production mobile | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT |
| production desktop | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT |
| preview mobile | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT |
| preview desktop | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT | PENDING — captured at milestone UAT |

### Human capture steps (milestone UAT, after Phase 14)

1. Re-run the production lookup `gh api "repos/mwallraf/packetory/deployments?environment=Production&per_page=1" --jq '.[0].sha'`. If production moved, update the Production line's sha.
2. Get a Vercel preview of exactly the Phase 11 code commit. Push it to a throwaway branch with `git push origin 19d739aed31a42bda83785fb4db04a6b0d2e8960:refs/heads/lighthouse/phase-11-subnet`, then wait until its Preview deployment is Ready. Take the preview origin and deployment sha from the GitHub deployments API (`deployments?sha=19d739aed31a42bda83785fb4db04a6b0d2e8960&environment=Preview`, then that deployment's successful status `environment_url`), never from the browser address bar.
3. Confirm the preview runs the Phase 11 code: `git diff --quiet {preview deployment sha} 19d739aed31a42bda83785fb4db04a6b0d2e8960 -- app components lib tools next.config.ts vercel.json package.json` must exit 0.
4. In Google Chrome, open DevTools > Lighthouse with mode Navigation and the categories Performance, Accessibility, Best Practices and SEO. An incognito window is best, since extensions skew scores; log in to Vercel there when the preview asks. Run four reports in one sitting on one machine: `https://packetory.dev/tools/subnet` on device Mobile, then on Desktop; then `{preview origin}/tools/subnet` on Mobile, then on Desktop.
5. Replace every PENDING value. The Runner line becomes `- Runner: Chrome DevTools Lighthouse {version}, Navigation mode, one machine, {YYYY-MM-DD}`. The Preview line becomes `- Preview: {preview origin}/tools/subnet (deployment of {preview deployment sha})`, holding only the origin plus the path, with no query string and no share token. Each row gets four integer scores (0-100) plus CLS with three decimals, so 0 becomes 0.000.
6. Re-run the Lighthouse record gate from 11-01-PLAN.md Task 3; it must exit 0. Then delete the throwaway branch with `git push origin --delete lighthouse/phase-11-subnet`.

The numbers are recorded, not gated (PREG-03, Phase 14 owns the 90+ gate). Production is the pre-phase reference that does not yet include Phases 10 and 11.

## Queued for milestone UAT (human_needed)

- Lighthouse capture above (backstop truth; human_needed until the numbers are in).
- CLS re-measure on `npm run build && npm run start` at 375x800 and 1280x800 against the Phase 10 baseline 0.167 / 0.029 (reported, not gated).
- Real-laptop look at 1366x768, light and dark.

## Self-Check: PASSED

- FOUND: tests/e2e/subnet-layout.spec.ts, app/tools/subnet/SubnetTool.tsx, page.tsx, SubnetToolLoader.tsx
- FOUND commits: 9f5d96b, 8170a06, 5f8369f
