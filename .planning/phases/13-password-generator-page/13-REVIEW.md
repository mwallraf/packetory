---
phase: 13-password-generator-page
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - app/tools/password/page.tsx
  - app/tools/password/PasswordToolLoader.tsx
  - app/tools/password/PasswordTool.tsx
  - app/tools/password/PasswordOptionsPanel.tsx
  - app/tools/password/PasswordOutput.tsx
  - app/tools/password/PasswordRow.tsx
  - app/tools/password/ColoredPassword.tsx
  - app/tools/password/runs.ts
  - app/tools/password/password-test-utils.ts
  - app/tools/password/PasswordTool.test.tsx
  - app/tools/password/PasswordTool.options.test.tsx
  - app/tools/password/PasswordTool.url.test.tsx
  - app/tools/password/PasswordTool.output.test.tsx
  - app/tools/password/PasswordTool.keyboard.test.tsx
  - app/tools/password/runs.test.ts
  - app/tools/password/page-guards.test.ts
  - lib/password/boundaries.test.ts
  - tests/e2e/password.spec.ts
  - tests/e2e/password-url.spec.ts
  - tests/e2e/password-options.spec.ts
  - tests/e2e/password-keyboard.spec.ts
  - tests/e2e/password-privacy.spec.ts
  - tests/e2e/password-responsive.spec.ts
  - tests/e2e-prod/password-ssr.spec.ts
findings:
  critical: 1
  warning: 3
  info: 6
  total: 10
  necessity: 0
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

The page is carefully built against the privacy contract. No generated value reaches the URL, storage, analytics, DOM attributes, the live region or server HTML. Generation happens only in the `ssr:false` island, `serializeOptions` accepts `ToolOptions` only, and the guard tests are non-vacuous (in-memory mutants). The hostile-URL rewrite, the draft/clamp logic and the Ctrl/Cmd+C guards trace correctly.

One real correctness defect was found. The URL writer is unguarded and runs mid-commit, so a throttled `history.replaceState` (Safari throws after 100 calls per 30 s, and a slider drag easily exceeds that) aborts the commit and leaves the displayed options and the displayed password out of sync. The other findings are test-soundness gaps (racy negative assertions, a leak detector that skips `<script>`), one error-handling mislabel, and minor accessibility and maintainability items.

No necessity findings. `necessity-review.md` was read.

## Critical Issues

### CR-01: Unguarded `replaceState` inside `commit` aborts regeneration (Safari throttle SecurityError)

**File:** `app/tools/password/PasswordTool.tsx:91-97` and `:187-194`
**Issue:** `commit()` runs `setOptions(normalized)`, then `writeUrl(normalized)`, and only then `generate(...)` and `applyGenerated(...)`. `writeUrl` calls `window.history.replaceState` with no `try/catch`. WebKit (Safari desktop and iOS) throws `SecurityError: Attempt to use history.replaceState() more than 100 times per 30 seconds`. `onSliderChange` calls `commit` on every slider step, and `onLengthDraftChange` and the symbol input call it on every keystroke. Dragging the slider across the 4-128 range is about 124 calls in one gesture.

Once the limit is hit, `writeUrl` throws out of the React event handler:
- `setOptions` has already been queued, so the controls move to the new options.
- `generate` and `applyGenerated` never run, so the password, the copy-confirmation reset and the generation counter keep their old values.
- The output no longer obeys the visible options (PWD-02) and no error is shown.
- Every later commit inside the throttle window fails the same way.

Chrome throttles with a console warning and a dropped call, so only the URL goes stale there. The mount-time `writeUrl` at `:162-165` has the same unguarded call. No unit or e2e test simulates a throwing `replaceState`.

**Fix:** Make the URL mirror best-effort and run it after state is applied. Optionally coalesce slider writes.
```tsx
function writeUrl(opts: ToolOptions) {
  try {
    const qs = serializeOptions(opts);
    const path = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", path);
  } catch {
    // Throttled (Safari) or unavailable: the URL is a convenience mirror only.
  }
}

function commit(next: ToolOptions): Generated {
  const normalized = normalizeToolOptions({ ...next, mode: "password" });
  setOptions(normalized);
  const applied = generate(normalized, gen.generation + 1);
  applyGenerated(applied);
  writeUrl(normalized);
  return applied;
}
```
Add a jsdom test that stubs `history.replaceState` to throw and asserts the output still matches the new length after `setLength("30")`.

## Warnings

### WR-01: `generate()` reports every thrown error as "Secure random generation isn't available"

**File:** `app/tools/password/PasswordTool.tsx:60-66`
**Issue:** The `catch` maps anything other than `GenerationExhaustedError` to `"crypto"`. That includes a `RangeError` from `randomInt` (non-uniform fill, 1000 redraws), a TypeError from a future regression in this file or the library, and a `QuotaExceededError`. The user is told their browser lacks Web Crypto, which is false and hides the cause. D-12 bans logging, so nothing is surfaced anywhere. Fail-closed is correct, but the diagnosis is wrong and the tests cannot distinguish the cases.
**Fix:** Narrow the mapping and give anything else a neutral fail-closed message.
```ts
} catch (e) {
  const error: GenError =
    e instanceof GenerationExhaustedError ? "exhausted"
    : e instanceof CryptoUnavailableError ? "crypto"
    : "unexpected";
  return { results: [], error, generation };
}
```
Add an `unexpected` entry to `ERROR_COPY`, for example "Something went wrong, so no password was generated. Press Enter to try again.", and a unit test with a fill that throws `Error`.

### WR-02: Negative e2e assertions can pass before the code under test has acted

**File:** `tests/e2e/password-keyboard.spec.ts:159-162` and `:181-183`
**Issue:** In "Ctrl/Cmd+C does nothing for a batch" and "leaves a user selection alone", the first assertion after the keypress is `expect(status).toHaveText("")`. Playwright evaluates it immediately and it passes at once. If the guard were broken, the status would only become "Copied" after `writeText` resolves, a state update and a `setTimeout(0)`. The clipboard read that follows is also racy, because the handler's `await navigator.clipboard.writeText` may not have landed yet. So these two tests can stay green with the batch or selection guard removed.
**Fix:** Settle before asserting absence, then assert.
```ts
await page.keyboard.press("ControlOrMeta+c");
await page.waitForTimeout(250); // or: await page.evaluate(() => new Promise(r => setTimeout(r, 250)))
await expect(page.getByTestId("password-status")).toHaveText("");
expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("sentinel-value");
```
In the selection test, also assert `getSelection().toString()` equals the heading text before pressing, so the precondition is proven.

### WR-03: Prod SSR leak detector ignores `<script>` content, where a server-generated prop would appear

**File:** `tests/e2e-prod/password-ssr.spec.ts:23-28` and `:101`
**Issue:** `visibleText()` replaces `<script>` blocks with spaces before `hasAllSetsRun` runs. The reason given is that class names and the build id false-positive. But if a password were ever generated on the server and passed as a prop, it would land in the RSC flight payload (`self.__next_f.push(...)`), which is inside a script, and this test would not see it. The remaining protection is the testid checks and `page-guards.test.ts`. Neither covers a server component that generates and passes a prop to a client component. So the headline PWD-01 proof has a blind spot in exactly the leak path that matters most.
**Fix:** Also scan script bodies, but only for runs that contain all four classes and are at least `LENGTH_DEFAULT` long. A 20-character run over `[A-Za-z0-9!@#$...]` containing all four classes is very unlikely in build ids or class names. Narrow it by checking the JSON-unescaped string literals of `__next_f` pushes rather than the raw script text. Keep the positive control and add one that embeds `Aa0!`x5 inside a `<script>`.

## Info

### IN-01: Symbol hint wording is wrong for non-empty unusable drafts and silent for the look-alike fallback

**File:** `app/tools/password/PasswordOptionsPanel.tsx:74-86`
**Issue:** For drafts like `abc 123` or `é€`, which are not empty, the hint says "Empty, so the default set is used". The tests lock this wording in (`options.test.tsx:400-409`). Separately, with Avoid look-alikes on and a draft of `|`, `hasUsableSymbol` is true and the hint shows the normal rule text, while `resolveAlphabet` silently substitutes the default symbols. The user sees `|` in the field but never gets it.
**Fix:** Reword to "No usable symbols, so the default set is used". When `avoidLookalikes` is on and every kept symbol is in `LOOK_ALIKES`, show a dedicated hint such as "Those are look-alikes, so the default set is used".

### IN-02: Duplicated button markup and a circular type import

**File:** `app/tools/password/PasswordOutput.tsx:82-115`, `:143-176`; `:6`
**Issue:** The copy and Regenerate buttons, with identical long class strings, appear in both `Hero` and `Batch`, and a third copy lives in `PasswordRow`. `PasswordOutput.tsx` imports `type Generated` from `PasswordTool.tsx`, which imports `PasswordOutput`. It is type-only so it is erased at runtime, but it is a latent cycle.
**Fix:** Extract `CopyButton` and `RegenerateButton` components. Move `Generated`, `GenError` and `StatusPhrase` to a small `types.ts` beside `runs.ts`.

### IN-03: Skeleton pinned at two widths only, with a redundant class and a one-line measurement comment

**File:** `app/tools/password/PasswordToolLoader.tsx:21-33`
**Issue:** The 980px and 712px heights are measured at 320px and 1280px, with a single `sm:` switch at 640px. Between about 360 and 639px the loaded island is shorter than 980px because the hints wrap less, so the footer shifts on load (no-CLS goal). Phase 14 owns the final pin (D-17), so this is a note, not a defect. `h-[124px] sm:h-[124px]` is redundant. The measurement comment is one 200-character line.
**Fix:** Drop `sm:h-[124px]`, wrap the comment, and make the Phase 14 pin cover 360-639px.

### IN-04: Accessibility gaps in the output and option feedback

**File:** `app/tools/password/PasswordOutput.tsx:73-80`; `PasswordOptionsPanel.tsx:128-162`; `PasswordTool.tsx:196-221`, `:253-272`
**Issue:**
- The output `div` has no label, role or heading, so a screen-reader user can reach it only by browsing the page.
- The length number input and the range slider both take the accessible name "Length", so they are indistinguishable by name.
- Slider, length, set switches, symbol and look-alike changes regenerate the password with no announcement. This is by design (D-11), but it leaves AT users with no signal that the output changed.
**Fix:** Give the output wrapper `role="group"` and `aria-label="Generated password"` (never the value). Use `aria-label="Length slider"` on the range, or `aria-valuetext`. Consider announcing "Password updated" on commits that regenerate, and revisit D-11 in Phase 14.

### IN-05: Live-region "clear then set" re-read and repeat-copy announcements are unreliable

**File:** `app/tools/password/PasswordTool.tsx:133-158`; `PasswordRow.tsx:30-34`
**Issue:** `announce` sets `""` and then the phrase one `setTimeout(0)` later. Two renders inside a few milliseconds are often coalesced by screen readers, so the identical repeated phrase may not be re-announced. The unit test only proves the DOM passes through `""`. A second copy within the 2 s revert window does not flip `copied` (it is already true), so it is not announced again. Copy announcements also depend on three separate effects.
**Fix:** Alternate between two live-region nodes, or append a zero-width counter to the text. Have `useCopyToClipboard` expose a monotonically increasing `copyCount` so announcements can follow successful copies deterministically.

### IN-06: Copy-announcement effects exist only to dodge a lint rule

**File:** `app/tools/password/PasswordTool.tsx:145-158`; `PasswordRow.tsx:28-34`
**Issue:** Each of three effects wraps `announce` in `setTimeout(..., 0)` "so no state is set synchronously in the effect body". This is ceremony driven by `react-hooks/set-state-in-effect`, and it adds an extra tick between copy and announcement. The `announce` timer is itself guarded separately in the mount cleanup.
**Fix:** Derive the announcement from the copy result (the `copyCount` suggestion in IN-05) in the click and shortcut handlers instead, which removes all three effects.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
