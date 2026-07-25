---
phase: 04-dns-lookup
reviewed: 2026-07-25T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - app/tools/dns/DnsTool.tsx
  - tests/e2e/dns-lookup.spec.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 04: Code Review Report (gap-closure follow-up, plan 04-04)

**Reviewed:** 2026-07-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found (no blockers — findings are quality/robustness only)

## Summary

This is a narrow, targeted re-review of the plan 04-04 gap-closure diff
(commits `c245f34` + `c3be14b`) that closes the previously-flagged incomplete
CR-01 fix. Prior history: the original CR-01 (found in the full-file review,
superseded by this document) identified that `handleDomainChange`'s and
`handleDomainPaste`'s **invalid**-input branches didn't abort an in-flight
lookup before transitioning state; that was fixed in commits
a63c8aa/0be5424/84ff288. The verifier for that fix then found it incomplete:
the **valid**-input branch of `handleDomainChange` also needed to call
`cancelInFlightLookup()` before scheduling a new debounce, since
`scheduleDebouncedLookup` only arms a *future* `runLookup` call and does
nothing to the currently in-flight one. Plan 04-04 adds exactly that call
plus a new E2E regression test. This review verifies the fix is complete and
correctly placed, that the new test genuinely proves it, and that nothing new
was broken.

**1. Is the fix correctly placed and complete?** Yes. `git show c245f34`
confirms a 6-line, single-purpose diff: a comment plus
`cancelInFlightLookup();` inserted at `DnsTool.tsx:595-599`, immediately
before the pre-existing `setState(...)` / `scheduleDebouncedLookup(value,
state.recordType)` call (now at line 601-609). Tracing every path in the
file that can either transition `lookup` state or schedule a lookup:

- `handleDomainChange`'s invalid branch (line 582) — already called
  `cancelInFlightLookup()`, unchanged.
- `handleDomainChange`'s valid branch (line 599) — **now** calls
  `cancelInFlightLookup()` before `scheduleDebouncedLookup`. This was the
  missing branch; it is now covered.
- `handleDomainPaste`'s invalid branch (line 623) — already called
  `cancelInFlightLookup()`, unchanged.
- `handleDomainPaste`'s valid branch, `handleTypeChange`, `handleRefresh`,
  `handleTryAgain`, the Enter keyboard shortcut, and the mount effect — all
  call `runLookupImmediate` → `runLookup` directly, and `runLookup`'s own
  preamble (`abortControllerRef.current?.abort(); … const seq =
  ++requestSeqRef.current;`) already self-guards these paths; they never
  needed an external `cancelInFlightLookup()` call.

`scheduleDebouncedLookup` has exactly one call site in the whole file (line
609, grep-verified), and it is the one now correctly guarded. No other
branch is missing the fix — this closes the gap completely.

**2. Does the new test genuinely exercise the typed/debounce path, and would
it fail without the fix?** Yes, confirmed by hand-tracing the timeline
against both pre-fix and post-fix code. The test drives the input via
`fill()` only — no `press("Enter")` anywhere — so it exercises
`handleDomainChange`'s valid branch and the real 700ms `DEBOUNCE_MS` timer,
not the immediate/keyboard path already covered by the sibling test above
it. On **pre-fix** code: `fill(SLOW_DEBOUNCE_DOMAIN)` at t=0 arms the
debounce, which fires at t=700 and starts a fetch the mock delays until
~t=1100; `fill(SECOND_DEBOUNCE_DOMAIN)` at t=750 lands while that fetch is
still in flight, and since the pre-fix valid branch never touches the
abort controller or sequence counter, neither of `runLookup`'s guards
(`controller.signal.aborted`, `seq !== requestSeqRef.current`) fires when
the stale response arrives at ~t=1100 — it renders `9.9.9.9`, which is still
on screen at the test's t=1250 checkpoint (the second domain's own debounce
doesn't fire until t=1450). The test's checkpoint uses a single, non-
retrying `.count()` sample rather than an auto-retrying `toHaveCount(0)`
assertion specifically to catch this transient stale render before the
second domain's later, faster success would silently paper over it — a
correct and deliberate test-design choice that the in-file comment explains
accurately. On **post-fix** code, the abort fires synchronously at t=750 and
the delayed fetch never gets to render. This confirms the test is a
genuine, correctly-targeted regression test for exactly this sub-case.

**3. No new issues introduced.** The production change is minimal and
side-effect-free beyond its intended purpose: aborting a null/already-
settled controller is a safe no-op, the redundant `clearTimeout` alongside
`scheduleDebouncedLookup`'s own guard is harmless, and bumping
`requestSeqRef.current` on every valid keystroke (even when nothing is in
flight) has no observable effect since only relative comparisons against
this counter are ever made anywhere in the file. No dead code, no new
unused imports/exports, no altered public behavior outside the intended
race-safety guarantee.

The findings below are quality observations on the *new test's* timing
design, not defects in the production fix.

## Warnings

### WR-01: New race-safety test has tighter timing margins than its sibling test, raising CI flakiness risk

**File:** `tests/e2e/dns-lookup.spec.ts:377, 389`
**Issue:** The test waits only 750ms for the 700ms `DEBOUNCE_MS` debounce to
fire — a 50ms margin (~7%) — and then only 500ms between typing the second
domain and sampling the stale-record checkpoint, a window that must land
after the first fetch's ~400ms artificial delay resolves (t≈1100 absolute)
but before the second domain's own debounce fires (t=1450 absolute), leaving
only ~150-200ms of slack on each side. All of these are real-time
`waitForTimeout` calls with no synchronization on an actual observable
signal (e.g. waiting for the mocked request to actually be dispatched).
Under CI load or a slower runner, event-loop scheduling jitter on either the
debounce timer or the mocked route's own `setTimeout` could shift these
windows enough to make the checkpoint sample land in the wrong place,
producing an intermittent false pass or false fail unrelated to the fix's
correctness. The sibling test immediately above it (`the final-typed
domain's result always wins…`) uses comparatively looser margins (a 100ms
settle gap, an 800ms final confirmation wait) since it doesn't need to align
with a specific debounce-firing instant.
**Fix:** Widen the buffer around `DEBOUNCE_MS` (e.g. wait `DEBOUNCE_MS +
300` instead of a bare `750`, derived from the constant rather than a magic
number — see IN-02), and/or replace the blind `waitForTimeout(750)` with a
deterministic wait on the mocked route actually being hit for
`SLOW_DEBOUNCE_DOMAIN` (e.g. resolve a promise from inside that `page.route`
handler and await it) so the test doesn't depend on wall-clock margins alone
to prove the fetch is genuinely in flight before the second edit lands.

## Info

### IN-01: Redundant abort/clear when `cancelInFlightLookup` and `scheduleDebouncedLookup` run back-to-back

**File:** `app/tools/dns/DnsTool.tsx:535-542, 517-523`
**Issue:** `cancelInFlightLookup()` clears `debounceTimerRef.current` and
nulls it; `scheduleDebouncedLookup` immediately re-checks the same ref and
no-ops its own `clearTimeout` since it's already null. This isn't a bug
(both functions are individually correct and idempotent), but the duplicated
guard could read as unclear ownership to a future maintainer trying to
determine which function is "responsible" for clearing the debounce timer.
**Fix:** Optional — a one-line comment noting the overlap is intentional
belt-and-suspenders would remove the ambiguity. Not required before
shipping.

### IN-02: New test's timing constants are magic numbers disconnected from `DEBOUNCE_MS`

**File:** `tests/e2e/dns-lookup.spec.ts:377, 389`
**Issue:** The waits of `750` and `500` are hand-derived from the production
`DEBOUNCE_MS = 700` constant (`DnsTool.tsx:44`) but hardcoded as plain
numbers, tied together only by a comment explaining the derivation. The
file's own comment on `DEBOUNCE_MS` calls it a "locked 600-800ms window,"
implying it may be retuned within that range; if it moves, these test
constants will silently stop matching the intended timing relationship with
no compile-time or lint signal, reintroducing the WR-01 flakiness risk
without an obvious trigger to revisit them.
**Fix:** Duplicate the constant as a named `const TEST_DEBOUNCE_MS = 700` at
the top of the spec file (mirroring the production value) and derive the
waits from it (`TEST_DEBOUNCE_MS + 300`, etc.) so a future change to the
production constant is at least visually obvious as needing a corresponding
test update.

---

_Reviewed: 2026-07-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
