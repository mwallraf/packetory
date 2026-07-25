---
phase: 03-ip-subnet-calculator
plan: 01
subsystem: ui
tags: [bigint, cidr, subnet, url-state, nextjs-app-router, next-dynamic, testing-library, fast-check]

requires:
  - phase: 02-uuid-generator
    provides: "lib/{lib-module} + app/tools/{tool} server-shell/client-island pattern, lib/hooks/useCopyToClipboard, lib/hooks/useKeyboardShortcut, tools/registry.ts flip pattern"
provides:
  - "lib/subnet/parse.ts — parseCidr()/isParseError() BigInt CIDR parser, IPv4+IPv6 auto-detect, never throws"
  - "lib/subnet/ipv4.ts — computeIpv4() BigInt mask arithmetic with /31 and /32 boundary branching"
  - "app/tools/subnet/{page,SubnetToolLoader,SubnetTool}.tsx — the project's first client-only URL-state tool (?cidr=)"
  - "tools/registry.ts subnet entry flipped to status:active"
affects: [03-ip-subnet-calculator plans 02-05, 04-dns-lookup (URL-state precedent), 05-mac-inspector]

tech-stack:
  added: []
  patterns:
    - "Client-only URL-state boundary: page.tsx never destructures searchParams; SubnetTool reads window.location.search via URLSearchParams and writes via window.history.replaceState, never useSearchParams()/router.replace() — keeps the route statically prerendered (verified live: next build shows /tools/subnet as ○ static)"
    - "Lazy useState initializer for mount-only external-state reads (not a mount effect + setState) — avoids react-hooks/set-state-in-effect and an extra render pass; safe because the ssr:false client-only boundary guarantees window is always defined the first time the function body runs"
    - "Fixed static field-order array (IPV4_FIELDS) driving the copy-grid render, so equal field values never reorder the grid"

key-files:
  created:
    - lib/subnet/parse.ts
    - lib/subnet/parse.test.ts
    - lib/subnet/ipv4.ts
    - lib/subnet/ipv4.test.ts
    - app/tools/subnet/page.tsx
    - app/tools/subnet/SubnetToolLoader.tsx
    - app/tools/subnet/SubnetTool.tsx
    - app/tools/subnet/SubnetTool.test.tsx
    - tests/e2e/subnet.spec.ts
  modified:
    - tools/registry.ts
    - tsconfig.json
    - tools/registry.test.ts
    - app/sitemap.test.ts
    - tests/e2e/home.spec.ts
    - tests/e2e/navigation.spec.ts

key-decisions:
  - "Bumped tsconfig.json target ES2017 -> ES2020 to allow BigInt literal syntax (D-03 requires BigInt end-to-end); tsc here is type-check-only (noEmit), so this has no effect on the actual Next.js/SWC build output"
  - "A syntactically valid IPv6 CIDR typed into SubnetTool (this plan is IPv4-only) shows an explanatory inline note and keeps the last valid IPv4 grid, rather than crashing or silently ignoring the input — IPv6 math/rendering ship in plans 03-03/03-04"
  - "Binary field renders the network address's binary form (not the raw input address), consistent with the tool's 'subnet breakdown' framing"

patterns-established:
  - "Framework-agnostic lib/subnet/ module: total functions, never throw, BigInt end-to-end, no React/Next import — parse.ts and ipv4.ts mirror lib/uuid/generate.ts's contract"
  - "CopyableField: one useCopyToClipboard() instance per output field, so per-field 'Copied!' confirmation never bleeds across fields even when two fields share a value"

requirements-completed: [SUBNET-01, SUBNET-02, SUBNET-03, SUBNET-04, SUBNET-06, SUBNET-07]

coverage:
  - id: D1
    description: "parseCidr auto-detects IPv4 vs IPv6 from address shape, requires an explicit /prefix, and returns a typed ParsedCidr/ParseError, never throwing"
    requirement: "SUBNET-01"
    verification:
      - kind: unit
        ref: "lib/subnet/parse.test.ts#parseCidr"
        status: pass
    human_judgment: false
  - id: D2
    description: "computeIpv4 returns the full IPv4 field set (network, broadcast, first/last host, usable count, mask, wildcard, binary) with explicit /31 and /32 boundary branching, BigInt end-to-end, verified by a property test over every prefix 0-32"
    requirement: "SUBNET-04"
    verification:
      - kind: unit
        ref: "lib/subnet/ipv4.test.ts#computeIpv4"
        status: pass
    human_judgment: false
  - id: D3
    description: "Loading /tools/subnet with no query param computes and renders the D-02 default (192.168.1.0/24) on client mount with zero required input"
    requirement: "SUBNET-02"
    verification:
      - kind: component
        ref: "app/tools/subnet/SubnetTool.test.tsx#computes and renders the D-02 default on mount"
        status: pass
      - kind: e2e
        ref: "tests/e2e/subnet.spec.ts#loads the D-02 default IPv4 breakdown immediately with zero input"
        status: pass
    human_judgment: false
  - id: D4
    description: "Invalid typed CIDR and invalid ?cidr= URL params render an inline validation message (no popup/reload), keeping the last valid grid visible"
    requirement: "SUBNET-03"
    verification:
      - kind: component
        ref: "app/tools/subnet/SubnetTool.test.tsx#shows the inline validation message and keeps the last valid grid visible on invalid typed input"
        status: pass
      - kind: component
        ref: "app/tools/subnet/SubnetTool.test.tsx#falls back to the D-02 default and shows the shared-link-invalid note for a malformed ?cidr= URL param"
        status: pass
      - kind: e2e
        ref: "tests/e2e/subnet.spec.ts#typing an invalid CIDR shows inline validation with no reload/popup, keeping the last valid grid"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every IPv4 output field has its own independent copy button with icon-swap + aria-live confirmation, in a fixed deterministic field order"
    requirement: "SUBNET-06"
    verification:
      - kind: component
        ref: "app/tools/subnet/SubnetTool.test.tsx#exposes an independent copy button and status region for every IPv4 field"
        status: pass
      - kind: e2e
        ref: "tests/e2e/subnet.spec.ts#copying a field shows a visible + announced confirmation"
        status: pass
    human_judgment: false
  - id: D6
    description: "Editing the CIDR writes ?cidr= via window.history.replaceState; loading a ?cidr= URL (including a duplicated param) in a fresh tab reproduces the exact result"
    requirement: "SUBNET-07"
    verification:
      - kind: component
        ref: "app/tools/subnet/SubnetTool.test.tsx#calls window.history.replaceState with an encoded ?cidr= URL on a valid edit"
        status: pass
      - kind: component
        ref: "app/tools/subnet/SubnetTool.test.tsx#takes the first cidr occurrence when the URL param appears more than once"
        status: pass
      - kind: e2e
        ref: "tests/e2e/subnet.spec.ts#loading a ?cidr= URL in a fresh context reproduces the exact result (bookmark round-trip)"
        status: pass
    human_judgment: false
  - id: D7
    description: "/tools/subnet stays statically prerendered (page.tsx never destructures searchParams) — verified live against the production build output"
    verification:
      - kind: other
        ref: "npm run build — Route (app) table shows '○ /tools/subnet' (Static)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-24
status: complete
---

# Phase 3 Plan 01: IPv4 Subnet Calculator Walking Skeleton Summary

**IPv4 CIDR breakdown (network/broadcast/host range/mask/wildcard/binary) via a hand-rolled BigInt `lib/subnet/` module, rendered through the project's first client-only bookmarkable-URL tool (`?cidr=`) at `/tools/subnet`.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-24T14:48:08Z
- **Completed:** 2026-07-24T14:55:08Z
- **Tasks:** 3
- **Files modified:** 15 (9 created, 6 modified)

## Accomplishments

- `lib/subnet/parse.ts`: total, never-throwing `parseCidr()` — auto-detects IPv4 vs IPv6 by address shape, rejects a bare address with no `/prefix`, converts to BigInt end-to-end (32-bit IPv4 / 128-bit IPv6), reuses the `parseForwardedIp.ts` octet/bracket-wrap validation idioms
- `lib/subnet/ipv4.ts`: `computeIpv4()` — BigInt mask arithmetic (Pattern 3) with explicit `32 - prefixLength` boundary branching for `/31` (RFC 3021, both addresses usable) and `/32` (single address); a fast-check property test proves the usable-host-count formula across every prefix 0-32
- `/tools/subnet` ships as a working IPv4 tool: static `page.tsx` shell + `ssr:false` `SubnetToolLoader` + `SubnetTool` client island — default `192.168.1.0/24` computes on mount, every field is independently copyable, invalid input validates inline, and the CIDR round-trips through a bookmarkable `?cidr=` URL (verified live: `next build` shows `/tools/subnet` as `○` static, matching RESEARCH.md Pattern 1's goal)
- `tools/registry.ts` subnet entry flipped `planned` → `active`

## Task Commits

Each task was committed atomically (TDD RED → GREEN → GREEN, per task-level `tdd="true"`):

1. **Task 1: Wave-0 test scaffolds (RED)** - `3a5f6b3` (test)
2. **Task 2: lib/subnet/parse.ts + ipv4.ts (GREEN)** - `9f0f499` (feat)
3. **Task 3: app/tools/subnet page + client island + registry flip (GREEN)** - `c731f14` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `lib/subnet/parse.ts` - Total CIDR string parser, IPv4/IPv6 auto-detect, BigInt address conversion, never throws
- `lib/subnet/parse.test.ts` - Parse boundary/malformed-input/concurrency test coverage
- `lib/subnet/ipv4.ts` - BigInt mask arithmetic, `/31`/`/32` boundary branching, all 8 IPv4 output fields
- `lib/subnet/ipv4.test.ts` - Core-field, boundary, and fast-check property tests (prefix 0-32)
- `app/tools/subnet/page.tsx` - Static Server Component shell (verified statically prerendered)
- `app/tools/subnet/SubnetToolLoader.tsx` - `next/dynamic(ssr:false)` client boundary + fixed-height skeleton
- `app/tools/subnet/SubnetTool.tsx` - Client island: URL read/write, parse+compute pipeline, 8-field copy grid, keyboard shortcuts
- `app/tools/subnet/SubnetTool.test.tsx` - Component tests for default load, inline validation, per-field copy, URL read/write/dedupe
- `tests/e2e/subnet.spec.ts` - Default load, copy confirmation, bookmark round-trip e2e coverage
- `tools/registry.ts` - subnet `status: "planned"` → `"active"`
- `tsconfig.json` - `target: "ES2017"` → `"ES2020"` (BigInt literal support; type-check-only, no runtime effect)
- `tools/registry.test.ts` - Updated hard-coded status expectations for the subnet flip
- `app/sitemap.test.ts` - Updated hard-coded "only uuid is active" sitemap expectation
- `tests/e2e/home.spec.ts` - Updated "Coming soon" badge assertions for the subnet flip
- `tests/e2e/navigation.spec.ts` - Updated mobile-nav link-count assertions for the subnet flip

## Decisions Made

- Bumped `tsconfig.json`'s `target` from `ES2017` to `ES2020` to unblock BigInt literal syntax (`TS2737`), required by D-03's "BigInt end-to-end" mandate. `tsc` runs with `noEmit: true` (type-checking only) — Next.js's own SWC/Turbopack pipeline performs actual transpilation, so this has zero effect on the shipped bundle's target.
- A syntactically valid IPv6 CIDR typed into `SubnetTool` shows an inline "IPv6 support is coming in a future update" note and keeps the last valid IPv4 grid, rather than crashing (no `ipv6.ts` compute module exists until plans 03-03/03-04) or silently discarding the input.
- The `binary` field renders the *network* address's binary form (not the raw parsed address), matching the tool's "subnet breakdown" framing; RESEARCH.md's Assumption A3 didn't specify which address, so this was a judgment call.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bumped tsconfig.json target to unblock BigInt literal syntax**
- **Found during:** Task 2 (`lib/subnet/ipv4.ts` implementation)
- **Issue:** `npx tsc --noEmit` reported `TS2737: BigInt literals are not available when targeting lower than ES2020` across every `0n`/`1n`-style literal in the new BigInt math modules — the project's `tsconfig.json` targeted `ES2017`, and D-03 mandates BigInt end-to-end for this phase's math.
- **Fix:** Changed `compilerOptions.target` from `"ES2017"` to `"ES2020"` in `tsconfig.json`.
- **Files modified:** `tsconfig.json`
- **Verification:** `npx tsc --noEmit` clean (0 errors) after the change; confirmed no other file in the repo relied on the ES2017 target (only this new BigInt code was affected).
- **Committed in:** `9f0f499` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed 4 pre-existing tests hard-coding an "only uuid is active" assumption**
- **Found during:** Task 3 (registry flip)
- **Issue:** Flipping `tools/registry.ts`'s `subnet` entry to `status: "active"` broke `tools/registry.test.ts` (exact status map), `app/sitemap.test.ts` (exact `/tools/*` URL list), `tests/e2e/home.spec.ts` ("Coming soon" badge per-card assertion), and `tests/e2e/navigation.spec.ts` (mobile-drawer link count) — all four had hard-coded the "uuid is the only active tool" assumption from Phase 2 (same pattern STATE.md documents Phase 2 hitting when uuid itself flipped).
- **Fix:** Updated each test's expectations to include subnet alongside uuid as active, dns/mac remaining planned.
- **Files modified:** `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts`
- **Verification:** `npx vitest run` (97/97 passed) and `npx playwright test` (32/32 passed) after the fix.
- **Committed in:** `c731f14` (Task 3 commit)

**3. [Rule 1 - Bug] Refactored URL-read from a mount effect to a lazy useState initializer**
- **Found during:** Task 3 (`SubnetTool.tsx` implementation)
- **Issue:** `npx eslint` flagged `react-hooks/set-state-in-effect` on the original mount-effect implementation that called `setState` synchronously inside a `useEffect` to read `?cidr=` from the URL — this pattern triggers a cascading second render and is explicitly discouraged by the React team.
- **Fix:** Moved the URL-read logic into `useState`'s lazy initializer function instead. Safe because `SubnetTool` only ever mounts inside the `ssr:false` client boundary, so `window` is always defined the first time the component function body runs — no effect (and no extra render) is needed.
- **Files modified:** `app/tools/subnet/SubnetTool.tsx`
- **Verification:** `npx eslint app/tools/subnet/SubnetTool.tsx` clean; all SubnetTool component tests still pass (URL-read behavior unchanged).
- **Committed in:** `c731f14` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking/Rule 3, 2 bug/Rule 1)
**Impact on plan:** All three fixes were necessary for correctness (BigInt support required by D-03), test-suite integrity (registry-flip fallout, same pattern as Phase 2), and code-quality gates (eslint's set-state-in-effect rule). No scope creep — no new features were added beyond the plan's scope.

## Issues Encountered

- Two doc-comment strings (in `lib/subnet/ipv4.ts` and `app/tools/subnet/page.tsx`) happened to contain the literal substrings `Number(` and `searchParams` inside prose explaining *why the code avoids* those patterns — this tripped the plan's own literal `grep -c` acceptance-criteria gates. Reworded both comments to describe the same constraint without using the literal grep-matched substring, with no change to actual code behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/subnet/parse.ts` and `lib/subnet/ipv4.ts` are ready for plan 03-02 to extend with `format.ts`/`reverse-dns.ts` and add the reverse-DNS field to the existing grid.
- The client-only URL-state pattern (`getInitialCidrFromUrl`/`syncCidrToUrl`) is now a proven, tested precedent — plan 03-03/03-04 (IPv6) reuse it as-is; Phase 4 (DNS Lookup, `?name=&type=`) can follow the same shape.
- No blockers. IPv6 CIDR input is gracefully handled (inline "coming soon" note) rather than left undefined, so the walking skeleton is safe to ship/demo before IPv6 support lands.

---
*Phase: 03-ip-subnet-calculator*
*Completed: 2026-07-24*

## Self-Check: PASSED

All 9 created source/test files verified present on disk; all 4 task/summary commit hashes (`3a5f6b3`, `9f0f499`, `c731f14`, `530df63`) verified present in `git log`. No missing items.
