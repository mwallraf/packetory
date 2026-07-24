---
phase: 04-dns-lookup
fixed_at: 2026-07-24T17:10:09Z
review_path: .planning/phases/04-dns-lookup/04-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 3
skipped: 1
status: partial
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-07-24T17:10:09Z
**Source review:** .planning/phases/04-dns-lookup/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (fix_scope: critical_warning — CR-01, WR-01, WR-02, WR-03)
- Fixed: 3
- Skipped: 1

## Fixed Issues

### CR-01: Stale in-flight DNS lookup can silently overwrite a newer `invalid-input`/in-progress state

**Files modified:** `app/tools/dns/DnsTool.tsx`
**Commit:** a63c8aa
**Applied fix:** Added a `cancelInFlightLookup()` helper that aborts
`abortControllerRef.current`, increments `requestSeqRef.current` (orphaning
any in-flight `runLookup`'s sequence check), and clears the pending debounce
timer. Wired it into both invalid-input branches — `handleDomainChange`'s
`!valid` branch and `handleDomainPaste`'s `else` (invalid) branch — replacing
their previous bare `clearTimeout`-only logic. This closes the gap the
reviewer identified: previously only a new `runLookup` call bumped the
sequence token/aborted the controller, so a stale in-flight response could
silently overwrite a genuinely newer `invalid-input` state. Verified with
`npx tsc --noEmit` (no errors in the modified file) and a full read of the
surrounding orchestration code to confirm no double-declaration or ordering
issues (function hoisting makes the helper's later declaration safe to call
from the earlier-declared `handleDomainChange`).

### WR-01: Multi-segment TXT records may leave stray embedded quotes in the displayed value

**Files modified:** `lib/dns/parse.ts`, `lib/dns/parse.test.ts`
**Commit:** 0be5424
**Applied fix:** Replaced the single-strip `data.slice(1, -1)` logic in
`normalizeValue`'s TXT branch with a regex-based segment extractor
(`/"(?:[^"\\]|\\.)*"/g`) that matches every individually-quoted
`<character-string>` segment, strips each segment's own quotes, and joins
them — correctly handling both the common single-segment case and the
RFC-1035 multi-segment case (e.g. long SPF/DKIM values exceeding 255 bytes).
Added a regression test (`joins a multi-segment quoted TXT value without
leaving stray embedded quotes (WR-01)`) asserting
`'"first-255-bytes" "rest"'` normalizes to `"first-255-bytesrest"` with no
embedded quote characters. All 14 tests in `lib/dns/parse.test.ts` pass
(13 pre-existing + 1 new); `npx tsc --noEmit` reports no errors in either
modified file.

### WR-02: Resolver JSON-parse failures bypass the documented error-classification contract

**Files modified:** `lib/dns/resolve.ts`, `lib/dns/resolve.test.ts`
**Commit:** 84ff288
**Applied fix:** Wrapped the previously-unguarded `response.json()` call in
`queryAndClassify` in its own `try/catch`, re-throwing a
`ResolverFailureError(response.status)` on parse failure instead of letting
a raw `SyntaxError` propagate — restoring the module's documented "every
caller only ever handles the two typed error classes" contract for 2xx
responses with malformed/non-JSON bodies. Added two regression tests: one
confirming Cloudflare-malformed-body triggers a Google fallback
(`resolverUsed: "fallback"`), and one confirming both-resolvers-malformed
throws `ResolverFailureError`. All 10 tests in `lib/dns/resolve.test.ts`
pass (8 pre-existing + 2 new); `npx tsc --noEmit` reports no errors in
either modified file.

## Skipped Issues

### WR-03: `DnsTool()` / `runLookup()` have grown into high-complexity functions

**File:** `app/tools/dns/DnsTool.tsx:396-801`
**Reason:** The Fix section is explicitly advisory ("Consider extracting...")
rather than a concrete required change, and the concrete correctness bug it
was cited as a symptom of (the CR-01 race) has already been fixed directly
in this pass without needing the extraction. Restructuring the
lookup/debounce/abort orchestration into a new `useDnsLookup()` hook would
touch a large portion of an 816-line, heavily state-tested component (5
error states + loading/success + URL-sync + keyboard-shortcut wiring) —
a high-blast-radius architectural change that risks subtle behavioral
regressions if applied as an automated point-fix rather than a deliberately
planned and individually-reviewed refactor. Recommend tracking this as a
follow-up refactor phase/plan with full `DnsTool.test.tsx` and
`tests/e2e/dns-lookup.spec.ts` re-verification, rather than fixing it inline
here.
**Original issue:** `runLookup` is ~85 lines with 4 nested nulls/early-returns
and 3 separate `setState` branches; the `DnsTool` component itself is ~400
lines mixing state machine, debounce/abort orchestration, and rendering for
5 error states + loading + success.

---

_Fixed: 2026-07-24T17:10:09Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
