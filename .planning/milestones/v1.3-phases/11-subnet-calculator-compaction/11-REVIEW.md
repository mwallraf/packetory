---
phase: 11-subnet-calculator-compaction
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - app/tools/subnet/SubnetTool.tsx
  - app/tools/subnet/SubnetToolLoader.tsx
  - app/tools/subnet/page.tsx
  - tests/e2e/subnet-layout.spec.ts
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
  necessity: 0
status: issues_found
---

# Phase 11: Code Review Report (iteration 2)

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found (info only)

## Summary

Re-review after fix commits 85bee5f (WR-01) and 19d739a (WR-02).

**WR-01 (skeleton pins at three widths only): resolved.** `SubnetToolLoader.tsx:52` now carries a `min-[Npx]` ladder (868/844/820/566/542/317 at 0/331/446/640/658/1024). I fetched the compiled CSS from the running dev server and confirmed that all six rules are generated and emitted in ascending breakpoint order, so the cascade resolves as intended. `readPinnedHeights` parses the whole ladder from the loader source, and the pin test samples 15 widths, including both sides of the 640 and 1024 breakpoints and the interior of every band. The previous review's claim of growth between 1024 and 1151px is not reproduced by the test. Its stated 4px tolerance holds at every sampled width.

**WR-02 (IPv6 1280x600 only logged): resolved.** `subnet-layout.spec.ts:148-152` now asserts scrollY 0, 7 cards and tool bottom within the viewport.

I ran `npx playwright test tests/e2e/subnet-layout.spec.ts` against the live dev server: 21 passed.

No regressions were found in the fix commits. `SubnetTool.tsx` and `page.tsx` are unchanged by them. I found no correctness or security defects in the component logic: copy state is isolated per field, the aria-live and error semantics are intact, and the URL is read only client-side. Two minor test-quality items remain.

## Info

### IN-01: Debug `console.log` still committed in the spec (carry-over, previously IN-02)

**File:** `tests/e2e/subnet-layout.spec.ts:114, 133, 147`
**Issue:** Three `[subnet-layout]` `console.log` calls print on every run, including CI. The fix report intentionally left this out of scope. The 1280x600 log at line 147 is now redundant, since the same data is asserted and any failure message already embeds `JSON.stringify(small)`.
**Fix:** Remove the logs, or gate them with `if (process.env.DEBUG_LAYOUT)`. Alternatively, use `test.info().attach("layout", { body: JSON.stringify(m) })`.

### IN-02: Pin test checks the parsed source text, not the rendered skeleton, and its parser is loosely anchored

**File:** `tests/e2e/subnet-layout.spec.ts:443-453`, `tests/e2e/subnet-layout.spec.ts:460-463`
**Issue:**
- The test compares the island height with numbers regex-parsed from the loader file. It never measures the skeleton as rendered. If Tailwind stopped emitting a rule or reordered the ladder, or a non-ladder class such as `sm:h-[...]` or `max-h-[...]` were added, the test would still pass or silently mis-parse. The regex `(?:min-\[(\d+)px\]:)?h-\[(\d+)px\]` also matches the `h-[` inside `min-h-[` or `max-h-[`, and gives any other variant prefix `minWidth` 0.
- The loader doc comment says to keep the pins in ascending order. The test sorts them, so it cannot enforce that.
- The sampled widths sit 8-16px from the 331, 446 and 658 steps. If font metrics shift a step by a few pixels, the 24px mismatch inside that window goes undetected. This is low risk while the font is self-hosted.

**Fix:** In the test, inject the real skeleton (or read `getComputedStyle(...).height` on a rendered `subnet-tool-skeleton`, for example via a route-delayed chunk) and compare it with the settled island at each width. At minimum, anchor the regex with `(?<![\w-])` before `h-` and, as a quick stopgap, add samples at 331, 446 and 658 and at each value minus 1.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
