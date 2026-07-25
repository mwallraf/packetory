---
phase: 04-dns-lookup
fixed_at: 2026-07-25T11:27:10Z
review_path: .planning/phases/04-dns-lookup/04-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-07-25T11:27:10Z
**Source review:** .planning/phases/04-dns-lookup/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1 (fix_scope: critical_warning — this narrower
  gap-closure re-review found 0 critical and 1 warning; IN-01/IN-02 are
  Info-tier and out of scope for this pass)
- Fixed: 1
- Skipped: 0

## Fixed Issues

### WR-01: New race-safety test has tighter timing margins than its sibling test, raising CI flakiness risk

**Files modified:** `tests/e2e/dns-lookup.spec.ts`
**Commit:** b436fab
**Applied fix:** Replaced the blind `waitForTimeout(750)` — which assumed the
700ms production debounce (`DEBOUNCE_MS`) had already fired and dispatched
the mocked slow fetch, with only a 50ms (~7%) margin — with a deterministic
signal: a promise (`slowDispatched`) resolved from inside the mocked
`page.route` handler the instant the request for `SLOW_DEBOUNCE_DOMAIN` is
actually dispatched. The test now `await`s this promise instead of guessing
a wall-clock offset, eliminating the dominant source of CI flakiness the
reviewer identified (event-loop jitter on the debounce timer causing the
guessed 750ms window to land before/after the real dispatch). The subsequent
`waitForTimeout(500)` checkpoint window is now anchored to this confirmed
dispatch event rather than to the earlier guessed timing, so its existing
~100-200ms margins on each side (between the slow fetch's ~400ms artificial
resolution delay and the second domain's own 700ms debounce) are now
reliable rather than compounding on top of an already-uncertain first wait.
Updated the in-file comments to document the new anchor point. Verified via
Tier 1 re-read of the modified test block and Tier 2 `tsc --noEmit` (with
`node_modules` resolved) reporting zero errors referencing
`dns-lookup.spec.ts`.

Considered but not applied: the reviewer's alternative/complementary
suggestion to also add a named `TEST_DEBOUNCE_MS` constant mirroring
production `DEBOUNCE_MS` (tracked separately as IN-02, out of scope for this
`critical_warning` pass) — the deterministic-dispatch-signal approach fully
resolves WR-01's stated flakiness risk on its own, so widening margins via a
derived constant was not additionally required to close this finding.

## Skipped Issues

None — the single in-scope finding (WR-01) was fixed. IN-01 and IN-02 are
Info-tier and excluded by `fix_scope: critical_warning`; they were not
attempted in this pass.

---

_Fixed: 2026-07-25T11:27:10Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
