---
phase: 14-passphrase-strength-launch
reviewed: 2026-11-12T00:00:00Z
depth: standard
iteration: 2
files_reviewed: 12
files_reviewed_list:
  - app/tools/password/PasswordTool.tsx
  - app/tools/password/PasswordTool.passphrase.test.tsx
  - app/tools/password/ColoredPassword.tsx
  - app/tools/password/PasswordOutput.tsx
  - app/tools/password/PasswordRow.tsx
  - app/tools/password/PasswordToolLoader.tsx
  - app/tools/password/PassphraseOptionsPanel.tsx
  - app/tools/password/PasswordTool.output.test.tsx
  - tests/e2e/password-layout.spec.ts
  - tests/e2e/password-responsive.spec.ts
  - tests/e2e/password-privacy.spec.ts
  - tests/e2e/navigation.spec.ts
findings:
  critical: 0
  warning: 0
  info: 6
  total: 6
  necessity: 1
status: issues_found
---

# Phase 14: Code Review Report (iteration 2)

**Reviewed:** 2026-11-12
**Depth:** standard
**Files Reviewed:** 12 (the files touched by fix commits 03361db, 75eb7af, a3c7cf6, 25a4842, f550f97, f34e2d6 and 34572ea, plus the unchanged context files they depend on)
**Status:** issues_found (info only; no blockers, no warnings)

## Summary

WR-01 to WR-04 are resolved, and I found no regression in the state machine, the unmount token, the separator grouping, the skeleton ladder or the options grid.

- **WR-01 resolved.** The unconditional unmount effect (`PasswordTool.tsx:225-230`) bumps `seqRef` and clears `statusTimer` for every entry path. `requestLoad` re-reads `++seqRef.current` at call time. Under StrictMode's simulated unmount the extra bump happens before any load exists (the bookmark load is still behind a cleared 0 ms timer), so it is harmless. A late settle after a real unmount fails the `token !== seqRef.current` check and applies nothing. It still stores the valid list in `wordsRef`, which is a harmless cache on a dead island.
- **WR-02 resolved.** The test now observes `crypto.getRandomValues` and zero-delay `setTimeout` calls instead of `console.error`. Both the click-started and bookmark paths are covered, and the fixer confirmed the click-started case fails against the pre-fix source.
- **WR-03 resolved, state machine traced.**
  - After a `ChunkLoadError`, `commit()` keeps `wordlist-error`. It does not bump a load, announce, or call the loader, but it does still advance `seqRef`, the generation and the URL.
  - Password mode from the error state generates normally. Going back to Passphrase re-enters the error branch.
  - A stale rejection is not recorded (token mismatch), so a stale `ChunkLoadError` cannot poison `lastLoadErrorRef`.
  - A non-chunk failure still restarts the load. Retry reloads only for a chunk error.
  - `lastLoadErrorRef` is never cleared on success, but it is only consulted while `wordsRef` is null, so a stale value is unreachable.
  - No new defect.
- **WR-04 resolved** as a set of pins plus a seven-width gate. See IN-05 and IN-06 for residual fragility only.
- **UI-1 traced.**
  - `pieces()` splits at every separator, so `textContent` is the raw value (`wbr` adds no text, and the spans are adjacent).
  - React keys are unique (index keys versus `g${i}` fragment keys).
  - The break is only allowed at a `wbr`, never after a separator, and Space is untouched.
  - See IN-05 for the one behavioral trade-off.
- **UI-2 traced.** DOM and tab order are unchanged, the `aria-describedby` linkage is intact, and `SwitchRow` is a clean extraction. The geometry e2e assertions are sound (`password-capitalize` is the Switch element, and the label is located by exact text).

The privacy posture is unchanged: nothing generated reaches the URL, an attribute, a key or the live region.

## Info

### IN-01: Redundant assertion in the passphrase privacy sweep (carried forward)

**File:** `tests/e2e/password-privacy.spec.ts:439-442`
**Issue:** `getByTestId("password-options").ariaSnapshot()` is checked for the passphrase values, but the values live in `password-output-zone`, never inside the options panel, so that assertion cannot fail. The other checks in the sweep do carry the weight.
**Fix:** Snapshot `password-tool` (or `main`) instead, or drop it.

### IN-02: Debug `console.log` in a committed e2e spec (carried forward)

**File:** `tests/e2e/navigation.spec.ts:147`
**Issue:** The nav-fit test logs link widths and slack on every run (CI log noise).
**Fix:** Move the numbers into the assertion message or `test.info().annotations`.

### IN-03: A cached invalid list is never discarded (carried forward)

**File:** `app/tools/password/PasswordTool.tsx:309`
**Issue:** `wordsRef.current = list` is assigned before validation, so a wrong-sized list keeps producing the `unexpected` panel until a full reload. It is unreachable with the vendored, build-time-fixed list, and `generatePassphraseBatch` already enforces the integrity check.
**Fix:** If handled at all, clear `wordsRef` when `generate` returns `error === "unexpected"` in passphrase mode.
**Category:** necessity

### IN-04: Esc during loading or error gives screen-reader users no reset feedback (carried forward)

**File:** `app/tools/password/PasswordTool.tsx:531-537`
**Issue:** `resetAll()` announces only when `commit` returns a ready result. That is deliberate and tested (and WR-03 now makes the error-state case silent on purpose), so this is a judgment call.
**Fix:** Optionally fold the reset context into the post-load announcement.

### IN-05: The no-wrap separator group removes the `overflow-wrap:anywhere` safety net for passphrase output

**File:** `app/tools/password/ColoredPassword.tsx:83`, `app/tools/password/PasswordRow.tsx:66`
**Issue:** The rows use `[overflow-wrap:anywhere]` as a last-resort break for long unbroken text. The new `whitespace-nowrap` groups (separator + word + optional appended digit) cannot wrap at all, so `overflow-wrap` no longer applies inside them. Today a group is at most about 11 characters (the EFF word maximum is 9), which fits at 320 px, and the 20-word e2e gate covers that. If the list, font size or the appended-number format ever grows, a group wider than the row will overflow horizontally instead of breaking mid-word. This is a latent maintainability trade-off, not a current bug.
**Fix:** Acceptable as is. Optionally add a unit or e2e assertion on the longest word plus separator and digit at 320 px (or at 200% font size) so a future change is caught.

### IN-06: Skeleton ladder is tuned to overlay-scrollbar, font-exact measurements

**File:** `app/tools/password/PasswordToolLoader.tsx:42`
**Issue:** The nine pins have thresholds at 1 px precision (332, 378, 387, 398, 413, 453, 708). They were measured in headless Chromium, which hides scrollbars. Desktop browsers with classic 15 px scrollbars lay out 15 px narrower than the `min-[Npx]` media-query width. For desktop windows within about 15 px above a threshold, the real island can sit in the neighboring band, giving a shift of roughly 20 to 40 px (for example a viewport of 708 to 722 px). The fixer already notes the font-metric dependency. Mobile and Lighthouse emulation use overlay scrollbars, so the 90+ target is not at risk, and the effect is bounded and small.
**Fix:** Optional. Run the layout gate once with a non-hidden-scrollbar context, or add a comment that the ladder assumes overlay scrollbars. Re-measure if the font stack changes.

---

_Reviewed: 2026-11-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
