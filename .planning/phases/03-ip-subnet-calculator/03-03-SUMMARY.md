---
phase: 03-ip-subnet-calculator
plan: 03
subsystem: ui
tags: [bigint, ipv6, rfc5952, rfc3596, subnet, testing-library, fast-check, playwright]

requires:
  - phase: 03-ip-subnet-calculator plan 01
    provides: "lib/subnet/parse.ts (parseCidr/isParseError), app/tools/subnet/SubnetTool.tsx IPv4 grid + CopyableField pattern"
  - phase: 03-ip-subnet-calculator plan 02
    provides: "lib/subnet/format.ts (compressIpv6/expandIpv6), lib/subnet/reverse-dns.ts (ipv4ReverseZone/ipv6ReverseZone)"
provides:
  - "lib/subnet/ipv6.ts — computeIpv6() 128-bit BigInt mask arithmetic with /127 and /128 boundary-note branching"
  - "app/tools/subnet/SubnetTool.tsx — IPv6 6-field grid + reverse-DNS row, family-branched rendering, both IPv4/IPv6 accepted as valid input"
affects: [03-ip-subnet-calculator plan 04 (subdivision pills consume the same IPv6 grid + Separator placeholder)]

tech-stack:
  added: []
  patterns:
    - "IPv6's addressCount is the TOTAL block address count (2^(128-prefix)), not a 'usable host' count like IPv4's — the formula is exact and needs no -2/-1 adjustment at any prefix including /127 and /128; only the explanatory boundaryNote text differs at those two prefixes, not the numeric value or the first/last-address formula"
    - "SubnetTool now branches an entire grid (IPV4_FIELDS vs IPV6_FIELDS, each a static field-order array feeding CopyableField) on the parsed family, exactly one grid rendered per calculation, mirroring the IPv4 walking-skeleton's existing static-array + CopyableField shape"

key-files:
  created:
    - lib/subnet/ipv6.ts
    - lib/subnet/ipv6.test.ts
  modified:
    - app/tools/subnet/SubnetTool.tsx
    - app/tools/subnet/SubnetTool.test.tsx
    - tests/e2e/subnet.spec.ts

key-decisions:
  - "computeIpv6's boundary branch (hostBits >= 2n / == 1n / == 0n) only selects which boundaryNote string to attach — the network/last-address mask arithmetic and the 2^(128-prefix) addressCount formula are already exact and uniform at every prefix 0-128, so no special-cased VALUE formula was needed for /127 or /128, unlike IPv4's usableHostCount which genuinely changes formula shape at its boundaries"
  - "IPv6's 'compressed' and 'firstAddress' fields are numerically identical for any non-boundary prefix (both equal compressIpv6(network)) — this is intentional, not redundant: 'compressed'/'expanded' are notation-format fields for the network address, while 'firstAddress'/'lastAddress' are the block's usable-range boundaries, matching the plan's Ipv6Result field list verbatim"
  - "Reworded computeIpv6's doc-comments to avoid the literal grep-matched substrings ('Number(', 'React'/'next/') that 03-01/03-02-SUMMARY.md documented tripping their own literal acceptance-criteria gates — same pattern applied proactively here"

patterns-established:
  - "Family-branched grid rendering: SubnetTool derives isIpv6 once from the displayParsed family, then every downstream value (ipv4Result/ipv6Result, heroValue, reverseDns, boundaryNote) is computed conditionally from that single flag — no duplicated family-detection logic scattered through the component"

requirements-completed: [SUBNET-01, SUBNET-05, SUBNET-06]

coverage:
  - id: D1
    description: "computeIpv6 returns the normalized prefix, RFC-5952 compressed notation, expanded notation, first and last address, and total address count — all derived via 128-bit BigInt math, reusing compressIpv6/expandIpv6 from format.ts"
    requirement: "SUBNET-05"
    verification:
      - kind: unit
        ref: "lib/subnet/ipv6.test.ts#computeIpv6"
        status: pass
    human_judgment: false
  - id: D2
    description: "IPv6 address-count math is exact at every prefix 0-128 per the 2^(128-prefix) formula, including the /127 (count 2, both addresses usable) and /128 (count 1, single address, first==last) boundary cases, proven by explicit cases plus a fast-check property test over an arbitrary 128-bit address and prefix 0-128"
    requirement: "SUBNET-05"
    verification:
      - kind: unit
        ref: "lib/subnet/ipv6.test.ts#computeIpv6 property test"
        status: pass
    human_judgment: false
  - id: D3
    description: "parseCidr auto-detects an IPv6 CIDR by its colons and SubnetTool renders the IPv6 field grid (normalized prefix, compressed, expanded, first, last, address count, reverse-DNS) for it — exactly one of the IPv4/IPv6 grids shows per calculation, each field independently copyable"
    requirement: "SUBNET-01, SUBNET-06"
    verification:
      - kind: component
        ref: "app/tools/subnet/SubnetTool.test.tsx#renders the IPv6 grid and hides the IPv4-only fields for an IPv6 CIDR / #exposes an independent copy button and status region for every IPv6 field"
        status: pass
      - kind: e2e
        ref: "tests/e2e/subnet.spec.ts#loading an IPv6 ?cidr= URL renders the IPv6 grid and hides the IPv4-only rows"
        status: pass
    human_judgment: false
  - id: D4
    description: "A /128 renders first==last address, addressCount '1', and a real boundaryNote (never N/A); a non-nibble-aligned IPv6 prefix's reverse-DNS zone shows the truncated-nearest-boundary value plus an explanatory note"
    requirement: "SUBNET-05, SUBNET-06"
    verification:
      - kind: component
        ref: "app/tools/subnet/SubnetTool.test.tsx#renders the single-address boundary note for a /128 with first==last / #shows the reverse-DNS zone plus the truncation note for a non-nibble-aligned IPv6 prefix"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-24
status: complete
---

# Phase 3 Plan 03: IPv6 Subnet Breakdown Summary

**128-bit BigInt `lib/subnet/ipv6.ts` math module plus the IPv6 field grid in `SubnetTool.tsx`, so an IPv6 CIDR now yields the same full, copyable, boundary-correct breakdown the IPv4 walking skeleton already had.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-24T15:29:00Z
- **Completed:** 2026-07-24T15:45:00Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `lib/subnet/ipv6.ts`: `computeIpv6()` — 128-bit BigInt mask arithmetic (mirroring `ipv4.ts`'s shape), reusing `compressIpv6`/`expandIpv6` from `format.ts` for the RFC-5952 notation fields; a fast-check property test proves `addressCount` equals the exact `2^(128-prefix)` formula for every prefix 0-128, with the `/127`/`/128` boundaries falling out of the same uniform mask arithmetic (only the explanatory note differs)
- `SubnetTool.tsx` now accepts either family as valid input and renders exactly one grid per calculation — the new IPv6 6-field grid (normalized prefix, compressed, expanded, first/last address, address count) plus its reverse-DNS row, or the existing IPv4 8-field grid, chosen by `parseCidr`'s family auto-detect
- Removed the now-obsolete "IPv6 support is coming" fallback message from 03-01, since IPv6 is now fully computed and rendered
- Added a placeholder `Separator` ahead of the IPv6-only "Subdivide this block" section slot (ships in 03-04), per `03-UI-SPEC.md`'s page-structure contract

## Task Commits

Each task was committed atomically (TDD RED → GREEN → GREEN, per task-level `tdd="true"`):

1. **Task 1: Wave-0 test scaffolds (RED) for ipv6 math + IPv6 e2e** - `e64ee8d` (test)
2. **Task 2: lib/subnet/ipv6.ts (128-bit BigInt math, GREEN)** - `da8561f` (feat)
3. **Task 3: Render the IPv6 field grid in SubnetTool (GREEN)** - `c90f25b` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `lib/subnet/ipv6.ts` - `computeIpv6()`, 128-bit BigInt mask arithmetic, `/127`/`/128` boundary-note branching, no `Number()` coercion, no framework import
- `lib/subnet/ipv6.test.ts` - Core-field, `/127`/`/128` boundary, concurrency, and fast-check property test coverage (prefix 0-128, arbitrary 128-bit address)
- `app/tools/subnet/SubnetTool.tsx` - IPv6 grid + reverse-DNS row, family-branched rendering (`isIpv6`), both families now valid input, `Separator` placeholder
- `app/tools/subnet/SubnetTool.test.tsx` - IPv6 grid render/hide, per-field copy buttons, `/128` boundary note, non-nibble-aligned reverse-DNS note coverage
- `tests/e2e/subnet.spec.ts` - IPv6 `?cidr=` load case asserting the IPv6 grid renders and the IPv4 grid is absent

## Decisions Made

- `computeIpv6`'s boundary branch (`hostBits >= 2n` / `== 1n` / `== 0n`) only selects which `boundaryNote` string to attach. The network/last-address mask arithmetic and the `2^(128-prefix)` `addressCount` formula are already exact and uniform at every prefix 0-128 — no special-cased VALUE formula was needed for `/127` or `/128`, unlike IPv4's `usableHostCount` which genuinely changes formula shape (`-2`) at its boundaries. This was verified by hand before writing the implementation, then proven by the property test.
- IPv6's `compressed` and `firstAddress` fields are numerically identical for any non-boundary prefix (both equal `compressIpv6(network)`). This is intentional per the plan's `Ipv6Result` field list, not redundant: `compressed`/`expanded` are notation-format fields for the network address, while `firstAddress`/`lastAddress` are the block's usable-range boundaries — the same conceptual split IPv4's `network` vs. `firstHost` already has.
- Reworded `computeIpv6`'s doc-comments to avoid the literal substrings (`Number(`, `React`/`next/`) that 03-01-SUMMARY.md and 03-02-SUMMARY.md both documented tripping their own literal `grep` acceptance-criteria gates. Applied proactively this time rather than after hitting the gate.
- Left `app/tools/subnet/faq-data.ts`'s `sampleIpv6Fields` as the existing hand-verified literal constants (03-05's stopgap) rather than wiring it to the new `lib/subnet/ipv6.ts` import — that file is outside this plan's `files_modified` list, and the hand-verified values already match `computeIpv6`'s actual output exactly (cross-checked manually: `compressed: "2001:db8::"`, `expanded: "2001:db8:0:0:0:0:0:0"`, `addressCount: "79228162514264337593543950336"`), so there is no drift to fix. Wiring it to a live import is a scope decision for whichever future plan next touches `faq-data.ts`.

## Deviations from Plan

None — plan executed as written. The only judgment calls made (boundary-branch scope, compressed-vs-firstAddress field semantics, doc-comment phrasing) were resolving genuine ambiguity in the plan's `<behavior>` prose, not deviations from its stated requirements — all resolved values match the plan's literal test expectations (e.g. the `2001:db8::/32` worked example's exact strings).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/subnet/ipv6.ts` (`computeIpv6`) is fully built and tested — 03-04 (subdivision pills) can consume it directly, and the `Separator` placeholder ahead of the (still-empty) subdivision slot in `SubnetTool.tsx` is already in place so 03-04 only needs to fill that slot, not restructure the grid.
- The IPv6 breakdown is now complete for this plan's scope: all 6 SUBNET-05 grid fields plus the reverse-DNS row render, each independently copyable, with real boundary notes at `/127`/`/128` and a real truncation note for non-nibble-aligned reverse-DNS prefixes.
- `app/tools/subnet/faq-data.ts`'s `sampleIpv6Fields` remain hand-verified literal constants rather than a live `computeIpv6` import — flagged again here (as 03-05-SUMMARY.md already flagged) in case a future plan wants to wire it live; verified to match current output exactly, so no correctness risk today.
- No blockers.

---
*Phase: 03-ip-subnet-calculator*
*Completed: 2026-07-24*

## Self-Check: PASSED

All 5 created/modified source/test files verified present on disk; all 3 task commit hashes (`e64ee8d`, `da8561f`, `c90f25b`) verified present in `git log`. No missing items.
