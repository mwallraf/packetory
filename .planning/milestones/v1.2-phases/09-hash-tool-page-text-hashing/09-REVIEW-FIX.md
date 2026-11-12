---
phase: 09-hash-tool-page-text-hashing
fixed_at: 2026-10-15T20:30:00Z
review_path: .planning/phases/09-hash-tool-page-text-hashing/09-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-10-15
**Source review:** .planning/phases/09-hash-tool-page-text-hashing/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (WR-01..WR-05, IN-01, IN-02)
- Fixed: 7
- Skipped: 0
- Left unfixed by instruction: IN-03, IN-04, IN-05

Edits were made in the main checkout on branch `gsd/phase-08-hash-core-worker-runtime`
(no worktree, as instructed). Verification ran in the main checkout.

## Fixed Issues

### WR-01: Focus-time requestAnimationFrame select can select typed text
**Files modified:** `app/tools/hash/HashTool.tsx`, `app/tools/hash/HashTool.keyboard.test.tsx`
**Commit:** a8530e5
**Applied fix:** The deferred `el.select()` re-checks that the value is still the sample and the textarea is still focused. Two regression tests (typed text keeps its caret; untouched sample is still selected after the next frame). The first was confirmed to fail without the fix.

### WR-05: Global `/` fires for Ctrl/Cmd/Alt + `/`
**Files modified:** `lib/hooks/useKeyboardShortcut.ts`, `lib/hooks/useKeyboardShortcut.test.ts`
**Commit:** c90bd32
**Applied fix:** `/` is ignored (no preventDefault) when Ctrl, Meta or Alt is held; Shift stays allowed for EU layouts. Unit test covers both. Full `npm test` run afterwards.

### WR-02: Escape during IME composition resets the tool
**Files modified:** `lib/hooks/useKeyboardShortcut.ts`, `lib/hooks/useKeyboardShortcut.test.ts`
**Commit:** c316d1b
**Applied fix:** Escape is ignored when `event.isComposing` or `keyCode === 229`. Unit test added. Logic change: requires human confirmation on a real IME if desired. The reviewer's extra `defaultPrevented` remark was not applied (would change behaviour for every tool).

### WR-03: `?text=` with CR/CRLF hashed as-is
**Files modified:** `app/tools/hash/HashTool.tsx`, `app/tools/hash/HashTool.url.test.tsx`
**Commit:** 730c996
**Applied fix:** `readTextParam()` normalises `\r\n` and lone `\r` to `\n`. Test: `?text=a%0D%0Ab%0Dc` restores `a\nb\nc`, hashes that, and shows 5 bytes.

### WR-04: Stale / post-error digests stay copyable
**Files modified:** `app/tools/hash/HashTool.tsx`, `app/tools/hash/DigestRow.tsx`, `app/tools/hash/OutputToolbar.tsx`, `app/tools/hash/HashTool.output.test.tsx`, `app/tools/hash/HashTool.keyboard.test.tsx`
**Commit:** 89ee8e7
**Applied fix:** New `copyBlocked = stale || hashError`. Per-row Copy buttons (new `copyDisabled` prop) and "Copy all digests" (new `copyDisabled` prop) are disabled, and the Ctrl/Cmd+C shortcut returns early. Old digests stay visible (dimmed); no new copy strings or privacy wording. Tests cover stale, post-error and recovery for buttons and the shortcut. Logic change: requires human verification.

### IN-01: Esc on empty text offers a pointless "Restore your text"
**Files modified:** `app/tools/hash/HashTool.tsx`, `app/tools/hash/HashTool.keyboard.test.tsx`
**Commit:** daee116
**Applied fix:** Only non-empty, non-sample text is stashed for restore. The optional "also restore the verify box" idea was not applied.

### IN-02: Verify shows "Comparing..." forever when hashing failed
**Files modified:** `app/tools/hash/HashTool.tsx`, `app/tools/hash/HashTool.verify.test.tsx`
**Commit:** 7d69a04
**Applied fix:** `hashError` forces the verify state to idle (the error banner explains), so there is no permanent spinner and no match highlight against stale digests. Test added.

## Skipped Issues

None in scope. IN-03, IN-04 and IN-05 were intentionally left unfixed per the task.

## Verification

Run in the main checkout:
- `npm run typecheck`: clean (after removing iCloud duplicate " 2" files under `.next/types` and `.next/dev`).
- `npm run lint`: 0 errors, 1 pre-existing warning (`lib/mac/vendor.ts`, unrelated).
- `npm test`: 48 files, 686 tests passed.
- `npx playwright test tests/e2e/hash`: 30 passed. Dev server on :3000 stopped afterwards.

---

_Fixed: 2026-10-15_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
