---
phase: 14-passphrase-strength-launch
reviewed: 2026-11-12T00:00:00Z
depth: standard
files_reviewed: 44
files_reviewed_list:
  - app/sitemap.test.ts
  - app/tools/pages-about.test.ts
  - app/tools/password/ColoredPassword.tsx
  - app/tools/password/ModeToggle.tsx
  - app/tools/password/PassphraseOptionsPanel.tsx
  - app/tools/password/PasswordExample.tsx
  - app/tools/password/PasswordOptionsPanel.tsx
  - app/tools/password/PasswordOutput.tsx
  - app/tools/password/PasswordRow.tsx
  - app/tools/password/PasswordTool.keyboard.test.tsx
  - app/tools/password/PasswordTool.output.test.tsx
  - app/tools/password/PasswordTool.passphrase-options.test.tsx
  - app/tools/password/PasswordTool.passphrase.test.tsx
  - app/tools/password/PasswordTool.strength.test.tsx
  - app/tools/password/PasswordTool.tsx
  - app/tools/password/PasswordTool.url.test.tsx
  - app/tools/password/PasswordToolLoader.tsx
  - app/tools/password/StrengthPanel.test.tsx
  - app/tools/password/StrengthPanel.tsx
  - app/tools/password/eff-links.ts
  - app/tools/password/faq-data.test.ts
  - app/tools/password/faq-data.ts
  - app/tools/password/option-controls.tsx
  - app/tools/password/page-guards.test.ts
  - app/tools/password/page.tsx
  - app/tools/password/reload.ts
  - app/tools/password/toggle-classes.ts
  - components/SiteHeader.tsx
  - components/ToolCard.test.tsx
  - components/ToolCard.tsx
  - lib/password/boundaries.test.ts
  - tests/e2e-prod/password-ssr.spec.ts
  - tests/e2e-prod/password-wordlist.spec.ts
  - tests/e2e/helpers/passphrase.ts
  - tests/e2e/home.spec.ts
  - tests/e2e/navigation.spec.ts
  - tests/e2e/password-keyboard.spec.ts
  - tests/e2e/password-layout.spec.ts
  - tests/e2e/password-passphrase.spec.ts
  - tests/e2e/password-privacy.spec.ts
  - tests/e2e/password-responsive.spec.ts
  - tests/e2e/password-seo.spec.ts
  - tests/e2e/password-strength.spec.ts
  - tests/e2e/password-url.spec.ts
  - tools/registry.test.ts
  - tools/registry.ts
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-11-12
**Depth:** standard
**Files Reviewed:** 44 (lib/password/wordlist/eff-large.ts body skipped as instructed; lib/password sources, lib/hooks and the other plan summaries were read as context)
**Status:** issues_found

## Summary

The word-list load state machine in `PasswordTool.tsx` holds up under tracing. I checked these paths and found no correctness defect:

- A stale continuation never applies, because every `commit()` bumps `seqRef` and `requestLoad` re-reads the token.
- A valid list is cached even when its continuation is stale.
- The StrictMode double mount starts exactly one load, since the timer is cleared in the discarded first run.
- Password to Passphrase to Password and the stale-rejection paths behave correctly.
- Retry takes the reload path for a `ChunkLoadError` and a fresh load otherwise.

The strength panel is a pure function of the options, with no generated value passed in. Entropy, label, floor-formatting and crack-time hedging are consistent with `lib/password`. `LENGTH_MIN` (4) is never below the number of sets (at most 4), so `log2Big(0n)` is unreachable.

Privacy is sound. `writeUrl` only ever takes `ToolOptions`, no generated value reaches an attribute, key, live region, server HTML or flight payload, and the page and loader keep `ssr:false`. Registry, sitemap, nav, `ToolCard` icon mapping and metadata are registry-derived and consistent. There are no blockers. The findings below are one robustness gap in unmount and error handling, one misleading Retry path, and test-soundness and coverage gaps (two assertions that cannot fail, a layout gate measured at only two widths).

## Warnings

### WR-01: Unmount invalidation of an in-flight load is only installed for passphrase-seeded sessions

**File:** `app/tools/password/PasswordTool.tsx:263-271`
**Issue:** The only cleanup that bumps `seqRef` on unmount lives inside the mount effect. That effect returns `undefined` when `seed.options.mode !== "passphrase"`. In the common case (a plain `/tools/password` visit, then the user clicks Passphrase, then navigates away before the chunk settles) there is no cleanup, so the token is never invalidated. The late settle then runs `applyGenerated` and `announce` on an unmounted island. `announce` creates a new `setTimeout` into `statusTimer` after the unmount-cleanup effect (lines 209-213) has already run, so that timer is never cleared. React 18+ no longer warns about this, so it is silent, but the code comment ("The cleanup also bumps the sequence token so an unmounted island ignores a late settle") is only true for one of the two entry paths. It also leaves a state machine that behaves differently for a bookmark than for a click.
**Fix:** Bump the token in an unconditional unmount effect and use it from the status-timer cleanup:
```tsx
useEffect(() => {
  return () => {
    seqRef.current += 1;
    if (statusTimer.current) clearTimeout(statusTimer.current);
  };
}, []);
```
Keep the mount-load effect's own cleanup (it also has to clear its 0 ms timer for StrictMode).

### WR-02: Test "unmounting before the load settles causes no state update" cannot fail

**File:** `app/tools/password/PasswordTool.passphrase.test.tsx:196-204`
**Issue:** The test asserts `console.error` was not called after unmounting. React 18 and 19 removed the "state update on an unmounted component" warning, so that assertion holds whether or not the continuation applies a result. The test also mounts in Password mode and unmounts after a click-initiated load, so it is exactly the path WR-01 shows is not guarded: the late settle really does call `setGen` and `announce`, and the test still passes. A regression (or the current gap) can never turn it red.
**Fix:** Assert an observable instead. For example, spy on `window.history.replaceState` and the status region after the settle, or export a test seam, and check that the late settle caused no `applyGenerated`/`announce` (status stays `""`, `loadWordlist` result is not rendered). Also add the mount-in-passphrase-bookmark unmount case.

### WR-03: Any option change or Esc in the word-list error state restarts a load that cannot succeed after a ChunkLoadError

**File:** `app/tools/password/PasswordTool.tsx:349-358`, `app/tools/password/PasswordTool.tsx:318-330`
**Issue:** `retryLoad` correctly reloads the page for a `ChunkLoadError` because, per its own comment, the Turbopack production runtime caches a rejected chunk import. `commit()` has no such branch: toggling Password then Passphrase, moving the word slider, pressing Esc, and so on, all call `requestLoad(normalized, gen.status !== "loading")` against the same cached rejection. The user sees "Loading word list" announced, a pulse block, and then the same error panel again, with no recovery until they press Retry. `lastLoadErrorRef` already knows the failure kind but `commit` never consults it. The e2e check (c) only exercises the Retry button, so this path is unverified.
**Fix:** When `normalized.mode === "passphrase"`, the list is absent and the last load error is a `ChunkLoadError`, apply the `wordlist-error` state directly (still no value, no fallback) instead of starting a doomed load. Extract `isChunkLoadError(lastLoadErrorRef.current)` and use it in both `retryLoad` and `commit`.

### WR-04: Layout-shift gate pins a font-dependent pixel height but is measured at only 320 px and 1280 px

**File:** `tests/e2e/password-layout.spec.ts:73-102`, `app/tools/password/PasswordToolLoader.tsx:33`
**Issue:** The skeleton is hard-pinned to `h-[1374px] sm:h-[960px]`, measured once on one Chromium and one font stack, and the gate then asserts the settled island is within 1 px of it, at exactly two widths (320 and 1280). The island's height is wrap-dependent (strength-panel heading and the 14 px guess-rate label wrap, options grid switches at `sm`), so at 412 px (the Lighthouse mobile default), 360 to 639 px, 640 to 1279 px, or any machine with a different fallback font, the real island height can differ from the pinned value by hundreds of pixels. The bookmark case allows `< 0.1`, which is the entire "good" CLS budget (Lighthouse CLS is rated good at or below 0.1), so a passphrase bookmark can consume all of it and still pass. The project's stated target is Lighthouse 90+ with no avoidable CLS.
**Fix:** Run the settled-height and CLS assertions at a width matrix (for example 320, 412, 640, 768, 1024, 1280). Tighten the bookmark assertion to a budget well under 0.1, or document why a bookmark may spend it. Consider `min-h` pins instead of exact `h-` pins so a shorter-than-pinned island cannot collapse the layout.

## Info

### IN-01: Redundant assertion in the passphrase privacy sweep

**File:** `tests/e2e/password-privacy.spec.ts:441-448` (the added `sweep`)
**Issue:** `page.getByTestId("password-options").ariaSnapshot()` is checked for the passphrase values, but the values live in `password-output-zone`, never inside the options panel, so that assertion cannot fail. The other checks in the same `sweep` (button names, `getByLabel`/`getByRole`, live region) do carry the weight, so this is noise rather than a gap.
**Fix:** Snapshot `password-tool` (or the whole `main`) instead of `password-options`, or drop the assertion.

### IN-02: Debug `console.log` left in a committed e2e spec

**File:** `tests/e2e/navigation.spec.ts:140-143`
**Issue:** The nav-fit test logs `[nav-fit ...] link widths=... slack=...` on every run. It is test-only diagnostic output, but it is a debug artifact and noise in CI logs.
**Fix:** Move the numbers into the assertion message (`expect(..., \`slack ${slack}\`)`) or `test.info().annotations`, as `password-wordlist.spec.ts` already does.

### IN-03: A cached invalid list is never discarded, and the error copy then misleads

**File:** `app/tools/password/PasswordTool.tsx:292`, `app/tools/password/PasswordOutput.tsx:56-62`
**Issue:** `wordsRef.current` is assigned the loaded list before any validation. If the list is not exactly 7,776 entries, `generatePassphraseBatch` throws `WordlistIntegrityError`, which is mapped to the `unexpected` panel ("Press Enter to try again, or change an option"). Because the invalid list stays cached, every Enter or option change hits the same error until a full page reload. The test "a list that is not 7,776 words fails closed" confirms the panel but not that it is recoverable. This state is unreachable with the vendored, build-time-fixed list (necessity: impossible-state guard is already covered by the integrity check), so it is informational only.
**Fix:** If this is worth handling, clear `wordsRef.current` when `generate` returns `error === "unexpected"` in passphrase mode, so the next action re-fetches.
**Category:** necessity

### IN-04: Esc while the list is loading or failed gives screen-reader users no reset feedback

**File:** `app/tools/password/PasswordTool.tsx:503-510`, `app/tools/password/PasswordTool.keyboard.test.tsx` ("Esc while the list is still loading ...")
**Issue:** `resetAll()` announces only when `commit` returned a ready result. While loading, the options are reset visibly (and drafts/scenario change) but nothing is announced until "Word list loaded. New passphrase generated", which does not mention the reset. This is a deliberate, tested choice (the test asserts the absence of the reset phrase), so it is a judgment call rather than a defect.
**Fix:** Optionally append the reset context to the post-load announcement when the load was started by a reset.

---

_Reviewed: 2026-11-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
