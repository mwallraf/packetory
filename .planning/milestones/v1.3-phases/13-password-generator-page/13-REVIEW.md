---
phase: 13-password-generator-page
reviewed: 2026-11-11T23:50:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - app/tools/password/PasswordTool.tsx
  - app/tools/password/PasswordOutput.tsx
  - app/tools/password/PasswordRow.tsx
  - app/tools/password/PasswordOptionsPanel.tsx
  - app/tools/password/PasswordToolLoader.tsx
  - app/tools/password/page.tsx
  - app/tools/password/ColoredPassword.tsx
  - app/tools/password/runs.ts
  - app/tools/password/PasswordTool.test.tsx
  - app/tools/password/PasswordTool.url.test.tsx
  - app/tools/password/PasswordTool.output.test.tsx
  - app/tools/password/PasswordTool.keyboard.test.tsx
  - app/tools/password/PasswordTool.options.test.tsx
  - app/tools/password/page-guards.test.ts
  - tests/e2e/password-keyboard.spec.ts
  - tests/e2e-prod/password-ssr.spec.ts
  - tests/e2e/password.spec.ts
findings:
  critical: 0
  warning: 0
  info: 10
  total: 10
  necessity: 0
status: issues_found
---

# Phase 13: Code Review Report (iteration 2)

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found (Info only)

## Summary

Re-review after the fix commits 4b742a9, 2008e09, 548c8e1, 5014e61, 417e522 and e2b2feb.

**Resolution of the iteration-1 blocking findings**

- **CR-01 resolved.** `writeUrl` (`PasswordTool.tsx:95-107`) wraps `serializeOptions` and `replaceState` in `try/catch`, which also covers the mount-time call at `:172-175`. `commit` (`:197-204`) now runs `setOptions`, then `generate`, then `applyGenerated`, and only then `writeUrl`. A throwing URL write can no longer abort regeneration. The new jsdom test (`PasswordTool.url.test.tsx:204-217`) installs a throwing spy after mount, with `afterEach` calling `vi.restoreAllMocks()`, so it does not leak into other tests. It covers the slider/length path and the toggle path.
- **WR-01 resolved.** `generate()` (`:55-71`) maps only `GenerationExhaustedError` to `exhausted` and only `CryptoUnavailableError` to `crypto`. Everything else becomes `unexpected`, with its own `ERROR_COPY` entry (`PasswordOutput.tsx:34-37`). The new test (`PasswordTool.test.tsx:245-256`) forces `getRandomValues` to throw `Error("boom")` and asserts both the neutral copy and the absence of the Web Crypto wording. Enter (`regenerate`) still recovers from the `unexpected` panel.
- **WR-02 resolved.** The `settle()` helper makes the absence assertions run after the async copy path would have completed. The selection test now proves its precondition (`getSelection()` equals the heading text). Both tests additionally assert that the button accessible names did not change. This is a sound strengthening.
- **WR-03 resolved.** I decoded the real prod HTML at `.next/server/app/tools/password.html` with the same per-script regex and `JSON.parse` logic. It yields 5 flight payloads and the parser handles Next's current format (a script body with no trailing `;`, matched by `$`). The positive control (a leak hidden in a `<script>`) and the negative control (build id) exercise the new scan.

I found no regression from the fix commits. `vitest run app/tools/password lib/password` passes (18 files, 591 tests) and `tsc --noEmit` is clean.

**UI-1..UI-3 markup changes.** No functional regression. Row copy is now a fixed `h-11 w-11` button with no `flex-wrap`, so the confirmation cannot reflow it. The copy-failure `<p>` sits outside the flex row, and the accessible names and test ids are unchanged. Two disclosed spec deviations remain for UAT sign-off (IN-07 and IN-08 below). There are no Critical or Warning findings. The iteration-1 Info items IN-01..IN-06 are untouched by the fixes and carry forward unchanged.

No necessity findings. `necessity-review.md` was not required for this pass because no reachable-but-impossible guard was found.

## Info

### IN-01: Symbol hint wording is wrong for non-empty unusable drafts and silent for the look-alike fallback (carried)

**File:** `app/tools/password/PasswordOptionsPanel.tsx:74-86`
**Issue:** Drafts like `abc 123` or `é€` are not empty, yet the hint says "Empty, so the default set is used". With Avoid look-alikes on and a draft of `|`, the hint shows the normal rule text while `resolveAlphabet` silently substitutes the default symbols.
**Fix:** Reword to "No usable symbols, so the default set is used", and add a dedicated look-alike hint.

### IN-02: Duplicated button markup (now larger) and a circular type import (carried)

**File:** `app/tools/password/PasswordOutput.tsx:89-123`, `:151-185`; `:6`
**Issue:** UI-2 made the long filled-accent class string appear twice (hero Copy, Copy all), alongside the duplicated Regenerate string and a third copy in `PasswordRow`. `PasswordOutput.tsx` imports `type Generated` from `PasswordTool.tsx`, which imports `PasswordOutput`. It is type-only, so it is erased at runtime, but it is a latent cycle.
**Fix:** Extract `CopyButton` and `RegenerateButton`. Move `Generated`, `GenError` and `StatusPhrase` to a `types.ts`.

### IN-03: Skeleton pinned at two widths only (carried)

**File:** `app/tools/password/PasswordToolLoader.tsx:21-33`
**Issue:** The 980px and 712px heights are measured at 320px and 1280px with one `sm:` switch, so between about 360 and 639px the footer can shift on load. `h-[124px] sm:h-[124px]` is redundant. Phase 14 owns the final pin (D-17).
**Fix:** Drop `sm:h-[124px]` and make the Phase 14 pin cover 360-639px.

### IN-04: Accessibility gaps in the output and option feedback (carried)

**File:** `app/tools/password/PasswordOutput.tsx:81-88`; `PasswordOptionsPanel.tsx:128-162`; `PasswordTool.tsx:206-231`
**Issue:** The output `div` has no role or label. The length number input and the range slider share the accessible name "Length". Option commits regenerate the password with no announcement (D-11 by design).
**Fix:** Add `role="group"` with `aria-label="Generated password"`. Name the slider "Length slider". Revisit D-11 in Phase 14.

### IN-05: Live-region "clear then set" and repeat-copy announcements are unreliable (carried)

**File:** `app/tools/password/PasswordTool.tsx:143-147`; `PasswordRow.tsx:28-34`
**Issue:** `announce` clears and sets one `setTimeout(0)` apart, which screen readers often coalesce. A second copy inside the 2 s revert window does not flip `copied`, so it is not announced.
**Fix:** Alternate two live-region nodes, or expose a monotonic `copyCount` from the hook.

### IN-06: Copy-announcement effects exist only to dodge a lint rule (carried)

**File:** `app/tools/password/PasswordTool.tsx:158-168`; `PasswordRow.tsx:30-34`
**Issue:** Three effects wrap `announce` in `setTimeout(..., 0)` to satisfy `react-hooks/set-state-in-effect`.
**Fix:** Derive the announcement from the copy result in the click and shortcut handlers.

### IN-07: UI-2 filled accent puts 14px semibold text at 3.68:1 (new, disclosed deviation)

**File:** `app/tools/password/PasswordOutput.tsx:95`, `:156`
**Issue:** `bg-primary text-primary-foreground` is white on `#0891b2`, 3.68:1 in light mode, for 14px/600 text. That is below WCAG AA 4.5:1 for normal text, and `hover:bg-primary/90` lowers it slightly further. The UI-SPEC (Color, lines 118-127) specifies `text-primary` on a transparent background for copy controls. The fix report discloses this deviation. It is consistent with the existing `ConfigTool.tsx:214` filled button and the spec's own "accepted site-wide precedent" of 3.68:1, so it is not a new class of defect. It does widen that precedent to two more buttons. Dark mode is fine (`#020617` on `#22d3ee`).
**Fix:** Get UAT sign-off, and update UI-SPEC to record the filled accent. If the contrast is later tightened site-wide, use a darker `--primary` (for example `#0e7490`, about 5.4:1 with white) for filled buttons.

### IN-08: UI-3 drops the visible "Copied!" caption from the row confirmation (new, disclosed deviation)

**File:** `app/tools/password/PasswordRow.tsx:52-63`
**Issue:** The confirmed state is now a `Check` icon only. "Copied!" survives only in the `aria-label` and a redundant `sr-only` span (the `aria-label` already overrides the content for the accessible name, so the span exists only so `getByText("Copied!")` tests keep passing). UI-SPEC line 221 and the "visible confirmation everywhere" constraint call for a visible "Copied!" caption. A 20px icon swap in the accent colour is a weak visible signal for the confirmation. The Copy all and hero buttons still show the caption.
**Fix:** Get UAT sign-off. If the visible caption is wanted back without reflow, show it as a short-lived absolutely positioned label or a `title`-free tooltip rather than inline.

### IN-09: The WR-03 flight scan has no non-vacuity assertion on real HTML (new)

**File:** `tests/e2e-prod/password-ssr.spec.ts:46-66`, `:170`
**Issue:** `flightPayloads` swallows every `JSON.parse` failure (`catch {}`), and `expect(flightHasAllSetsRun(html)).toBe(false)` passes when zero payloads were decoded. I verified it decodes 5 payloads against the current build, but a future Next change to the push format (a wrapper such as `(self.__next_f=...).push(` already exists for the bootstrap push, which is correctly skipped) would silently turn the scan into a no-op. The synthetic positive control uses a hand-written string, not the real page.
**Fix:** In the real-HTML test, add `expect(flightPayloads(html).length).toBeGreaterThan(0)`.

### IN-10: `PasswordOutput`'s empty-result fallback still says "crypto" (new)

**File:** `app/tools/password/PasswordOutput.tsx:225-227`
**Issue:** `gen.results[0] === undefined` with `gen.error === null` renders the Web Crypto error. That is the same mislabelling WR-01 removed from `generate()`. The state is effectively unreachable, because `generateBatch(opts, batch >= 1)` either returns at least one value or throws, so it is defensive code with the wrong label.
**Fix:** Render `<ErrorPanel error="unexpected" />`, or drop the branch and narrow the type.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
