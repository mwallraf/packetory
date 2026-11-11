---
phase: 11-subnet-calculator-compaction
fixed_at: 2026-11-11T00:00:00Z
review_path: .planning/phases/11-subnet-calculator-compaction/11-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** .planning/phases/11-subnet-calculator-compaction/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Skeleton pins hold only at the three measured widths

**Files modified:** `app/tools/subnet/SubnetToolLoader.tsx`, `tests/e2e/subnet-layout.spec.ts`
**Commit:** 85bee5f
**Applied fix:** Swept every viewport width 320-1300px and found the default island height steps at 331, 446, 640, 658 and 1024px (868/844/820/566/542/317px). The reviewer's claim that the island grows between 1024 and 1151px did not reproduce: the `lg` band is a constant 317px. The skeleton now uses a `min-[Npx]` ladder (`h-[868px] min-[331px]:h-[844px] min-[446px]:h-[820px] min-[640px]:h-[566px] min-[658px]:h-[542px] min-[1024px]:h-[317px]`), so it matches the island at every width (verified by injecting the skeleton class at 12 widths including each step edge: skeleton equals island exactly). The pin test now parses the whole ladder from the loader source and compares the island at 15 widths (interior of each band plus both sides of the 640/1024 breakpoints) with a 4px tolerance, and the `pins === null` failure message says what to fix. The doc comment now also states the no-CLS claim covers the default URL only (reviewer's IN-01). Heights are unchanged at 1366x650 and 1280x600, so the no-scroll gates are untouched.

### WR-02: IPv6 1280x600 block only logged

**Files modified:** `tests/e2e/subnet-layout.spec.ts`
**Commit:** 19d739a
**Applied fix:** Replaced the informational comment with real assertions at 1280x600 (scrollY 0, 7 cards, tool bottom within the viewport). They pass: toolBottom is 528 of 600. The `console.log` is kept.

## Verification

Ran in the main checkout (not an isolated worktree), against the running `next dev` on :3000:
`npx playwright test tests/e2e/subnet-layout.spec.ts tests/e2e/subnet.spec.ts` gave 30 passed after each fix.

## Notes

- Worktree isolation was not used: the caller's environment requires verification against the dev server serving this checkout (a worktree has no `node_modules` and the server would not see its edits). Both fixes were committed directly on `gsd/phase-10-shared-about-section-config-parity`.
- Out of scope (fix_scope=critical_warning), left unfixed: IN-02 (debug `console.log` in the spec). IN-01 and the message part of IN-03 were incidentally addressed within the WR-01 rewrite.

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
