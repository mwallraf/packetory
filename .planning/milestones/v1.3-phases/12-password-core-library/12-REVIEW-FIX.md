---
phase: 12-password-core-library
fixed_at: 2026-11-11T22:20:00Z
review_path: .planning/phases/12-password-core-library/12-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 12: Code Review Fix Report

**Fixed at:** 2026-11-11T22:20:00Z
**Source review:** .planning/phases/12-password-core-library/12-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

Verification ran in the main checkout (no worktree): `npx vitest run lib/password lib/analytics` (12 files, 393 tests passed) and `npm run typecheck` (clean).

## Fixed Issues

### WR-01: `formatCrackTime` cap guard is redundant and disagrees with the cap it names

**Files modified:** `lib/password/crack-time.ts`
**Commit:** 8f4f6c8
**Applied fix:** Introduced a single `CAP_YEARS = 1e12` constant. The early overflow guard is now `Math.log10(CAP_YEARS * SECONDS_PER_YEAR)` (it previously encoded 10^13 years), and the later check is `y >= CAP_YEARS`. The "more than a trillion years" label and all crack-time test expectations are unchanged. The guard was kept, not deleted (the reviewer's alternative fix). This finding carries `**Category:** necessity`, which is normally out of scope under `critical_warning`. It was applied because the caller explicitly requested the derive-from-one-constant variant, which removes no behaviour. Marked as requiring human verification because it is a threshold-logic change.

### WR-02: `serializeOptions accepts only ToolOptions` runtime assertion is vacuous

**Files modified:** `lib/password/url-state.test.ts`
**Commit:** b3ae49a
**Applied fix:** Replaced the two `not.toThrow(/never/)` assertions with `expect(serializeOptions(...)).toBe("")`, so the test fails at runtime if a generated string or extra field leaks into the serialized output. The `@ts-expect-error` directives are kept for the compile-time half.

---

_Fixed: 2026-11-11T22:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
