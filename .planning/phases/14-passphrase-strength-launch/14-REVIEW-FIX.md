---
phase: 14-passphrase-strength-launch
fixed_at: 2026-11-12T00:00:00Z
review_path: .planning/phases/14-passphrase-strength-launch/14-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 14: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** .planning/phases/14-passphrase-strength-launch/14-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (WR-01..WR-04; `fix_scope` = critical_warning, no CR findings)
- Fixed: 4
- Skipped: 0
- Orchestrator additions handled outside the finding count: UI-1 (fixed), UI-2 (fixed), URL-1 (no change, intentional)
- IN-01..IN-04 are out of scope for `critical_warning` and remain open in REVIEW.md.

**Where verification ran:** the main checkout (`/Users/mwallraf/Developer/packetory.dev`, branch `gsd/phase-10-shared-about-section-config-parity`), not an isolated worktree, as instructed (the `next dev` server on :3000 had to stay up and Playwright reuses it). Commits were made directly on the current branch; no worktree, temp branch or recovery sentinel was created.

## Fixed Issues

### WR-01: Unmount invalidation of an in-flight load is only installed for passphrase-seeded sessions

**Files modified:** `app/tools/password/PasswordTool.tsx`
**Commit:** 03361db
**Applied fix:** The existing unmount effect (which already cleared the status timer) now also bumps `seqRef`, so every entry path (click-started or bookmark) invalidates an in-flight load on unmount. The mount-load effect keeps its own cleanup for the StrictMode 0 ms timer.
**Status:** fixed (state-handling change; semantics covered by the WR-02 tests)

### WR-02: Test "unmounting before the load settles causes no state update" cannot fail

**Files modified:** `app/tools/password/PasswordTool.passphrase.test.tsx`
**Commit:** 75eb7af
**Applied fix:** Replaced the `console.error` assertion with observable effects: after unmount and a late settle, `crypto.getRandomValues` is not called (no result was drawn) and no `setTimeout(..., 0)` announcement timer is armed. Added both the click-started case (Password, then Passphrase, then unmount) and the passphrase-bookmark case. Verified the click-started test fails against the pre-WR-01 `PasswordTool.tsx` and passes with the fix. A late-rejection variant was dropped because it could not fail either (the rejection path only calls `setGen`, which has no observable effect after unmount).
**Status:** fixed

### WR-03: Any option change or Esc in the word-list error state restarts a load that cannot succeed after a ChunkLoadError

**Files modified:** `app/tools/password/PasswordTool.tsx`, `app/tools/password/PasswordTool.passphrase.test.tsx`
**Commit:** a3c7cf6
**Applied fix:** Extracted `isChunkLoadError()` and used it in both `retryLoad` and `commit()`. In `commit()`, when the target mode is Passphrase, the list is absent and the last load error is a `ChunkLoadError`, the `wordlist-error` state is applied directly (no value, no fallback, no "Loading word list" announcement, no loader call) and the options are still mirrored to the URL. Retry still reloads the page. A non-chunk failure still restarts the load. This covers the option-change, mode-toggle and Esc paths because all go through `commit()`. Five new tests (slider, Esc, mode round trip, Retry afterwards, plain failure unchanged); four fail against the old code.
**Status:** fixed: requires human verification (state-machine logic). One design call to confirm: option changes in this state keep the error panel instead of reloading the page, which avoids a reload on every slider move; Retry is the single reload entry point. The "no fake Loading word list" part is asserted by the loader call count and the absence of the loading block (the live region keeps the earlier "Loading word list" text from the original failed attempt, so its text cannot distinguish a re-announcement).

### WR-04: Layout-shift gate pins a font-dependent pixel height but is measured at only 320 px and 1280 px

**Files modified:** `app/tools/password/PasswordToolLoader.tsx`, `tests/e2e/password-layout.spec.ts`
**Commits:** 25a4842, f550f97 (follow-up: reworded example class tokens in comments so the Tailwind scanner stops emitting an invalid media query)
**Applied fix:** Re-measured the settled Password-mode island at 1 px viewport steps (320 to 1500). Heights differ within the old 320 to 639 band, so the two-value pin was replaced with a `min-width` ladder like the subnet loader: 1374 (below 332), 1322 (332), 1303 (378), 1283 (387), 1259 (398), 1240 (413), 1212 (453), 980 (640), 960 (708). `password-layout.spec.ts` now reads the whole ladder from the loader and checks the settled height at 320, 375, 412, 640, 768, 1024 and 1280 px within 1.5 px, with the existing CLS <= 0.001 for the default load. The passphrase-bookmark CLS gate runs at the same seven widths and its budget was tightened from 0.1 to 0.05 (all widths measured well under 0.02). Skipped the `min-h` suggestion: the skeleton is a text-free placeholder, so an exact pin per band is the established pattern (subnet).
**Status:** fixed. Caveat: the ladder is font-metric dependent (Chromium, fonts loaded); re-measure if the font stack changes.

## Orchestrator additions

### UI-1: Wrapped passphrase lines must not end in a bare `-`

**Files modified:** `app/tools/password/ColoredPassword.tsx`, `app/tools/password/PasswordOutput.tsx`, `app/tools/password/PasswordRow.tsx`, `app/tools/password/PasswordTool.output.test.tsx`, `tests/e2e/password-responsive.spec.ts`
**Commit:** f34e2d6
**Applied fix:** `ColoredPassword`'s `breakAfter` prop became `breakBefore` (`-`, `_` or `.` in Passphrase mode). It splits runs at the separator, emits a `wbr` before each separator and keeps the separator together with the text up to the next separator in a `whitespace-nowrap` group, so the browser can only break before a separator and a line never ends in one. `textContent` is unchanged and Space keeps its natural break. The 13-06/14-06 wrap and no-mid-word e2e tests still pass. Unit tests were updated: the old "`-` renders no wbr" assertion now expects one wbr per separator for `-` (an intentional behavior change), and new tests check the group structure. A new e2e test at 320 px with 20 words checks, for `-`, `_` and `.`, that no separator is the last character on its line (it fails against the old rendering).
**Status:** fixed

### UI-2: Passphrase Options grid at 640 px and up

**Files modified:** `app/tools/password/PassphraseOptionsPanel.tsx`, `tests/e2e/password-responsive.spec.ts`
**Commit:** 34572ea
**Applied fix:** Separator is `sm:col-span-2` (own full-width row). Capitalize and Append are now two grid cells (a small local `SwitchRow`) sitting side by side. Each hint sits directly under its label text (label and hint share a column next to the switch, hint pulled up with `-mt-2`). DOM and tab order are unchanged and the 4 px spacing scale is kept (`gap-4`, `gap-6`, `-mt-2`, `h-11`; no 6/10/12 px values); below 640 px the cells stack as before. New e2e geometry tests at 320, 640 and 1280 px (separator row, side-by-side switches, hint within 8 px under its label and aligned with it).
**Status:** fixed

### URL-1: Should `?sep=_` be honored?

**Files modified:** none
**Outcome:** No change. `lib/password/url-state.ts` intentionally uses named separator tokens (`dash`, `underscore`, `dot`, `space`, via `SEPARATOR_TOKENS`), and `parseSeparator` falls back to the default for anything else. `url-state.test.ts` explicitly asserts that `sep=-` and `sep=%20` fall back to the dash default and that `sep=underscore` and `sep=space` parse, so a raw `?sep=_` falling back to dash is current, tested, intentional behavior and not a page-side bug. If raw-character aliases are ever wanted, that is a codec decision (with new tests), not a page fix.

## Verification

All run in the main checkout:

- `npx vitest run`: 79 files, 1449 tests passed (includes `page-guards.test.ts` and `lib/password/boundaries.test.ts`).
- `npm run typecheck`: clean.
- `npm run lint`: 0 errors, 1 pre-existing warning (`lib/mac/vendor.ts` unused `MacVendorRouteResponse`, untouched).
- `npx playwright test tests/e2e/password*.spec.ts tests/e2e/navigation.spec.ts tests/e2e/home.spec.ts` (dev server on :3000, reused): 105 passed.
- `npx playwright test -c playwright.prod.config.ts password`: 8 passed. The prod build still logs an "Invalid media query" CSS warning from pre-existing `SubnetToolLoader.tsx` / `subnet-layout.spec.ts` comments (`min-[Npx]` example tokens); the warning for the password files introduced mid-run was fixed in f550f97. Not changed here (out of scope).

No dependency changes; `lib/hooks`, `lib/analytics` and `lib/password` untouched.

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
