---
phase: 09-hash-tool-page-text-hashing
reviewed: 2026-10-15T00:00:00Z
depth: standard
files_reviewed: 46
files_reviewed_list:
  - app/layout.tsx
  - app/tools/hash/DigestRow.tsx
  - app/tools/hash/faq-data.ts
  - app/tools/hash/HashTool.tsx
  - app/tools/hash/HashToolLoader.tsx
  - app/tools/hash/OutputToolbar.tsx
  - app/tools/hash/page.tsx
  - app/tools/hash/VerifyBox.tsx
  - components/ToolCard.tsx
  - components/ui/textarea.tsx
  - lib/hash/client.ts
  - lib/hash/export.ts
  - lib/hash/format.ts
  - lib/hash/sample.ts
  - lib/hash/share-link.ts
  - lib/hash/verify.ts
  - lib/hooks/useKeyboardShortcut.ts
  - tools/registry.ts
  - app/sitemap.test.ts
  - app/tools/hash/faq-data.test.ts
  - app/tools/hash/hash-test-utils.ts
  - app/tools/hash/HashTool.keyboard.test.tsx
  - app/tools/hash/HashTool.output.test.tsx
  - app/tools/hash/HashTool.test.tsx
  - app/tools/hash/HashTool.url.test.tsx
  - app/tools/hash/HashTool.verify.test.tsx
  - app/tools/subnet/SubnetTool.test.tsx
  - components/ToolCard.test.tsx
  - lib/analytics/redact.test.ts
  - lib/hash/client.test.ts
  - lib/hash/export.test.ts
  - lib/hash/format.test.ts
  - lib/hash/sample.test.ts
  - lib/hash/share-link.test.ts
  - lib/hash/verify.test.ts
  - lib/hooks/useKeyboardShortcut.test.ts
  - tests/e2e/hash-keyboard.spec.ts
  - tests/e2e/hash-layout.spec.ts
  - tests/e2e/hash-output.spec.ts
  - tests/e2e/hash-seo.spec.ts
  - tests/e2e/hash-url.spec.ts
  - tests/e2e/hash-verify.spec.ts
  - tests/e2e/hash.spec.ts
  - tests/e2e/home.spec.ts
  - tests/e2e/navigation.spec.ts
  - tools/registry.test.ts
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-10-15
**Depth:** standard
**Files Reviewed:** 46
**Status:** issues_found

## Summary

Source files were read in full. Test files were checked by pattern scan
(skipped/only tests, vacuous assertions, fixed sleeps) and spot-read; the
e2e layout and URL specs were read in full. The privacy posture holds. `?text=`
is read once and never written back, and `redactBeforeSend` strips every
non-allow-listed param, with `text` pinned out of `DEFAULT_ALLOW_LIST` by a
regression test. There are no third-party requests and no hardcoded secrets.
The JSON-LD escape is correct. Sample digests, `ECHO_HELLO_WORLD_SHA256` and
the Keccak/SHA3 prefixes in the FAQ match the published values. `verify.ts`
patterns are anchored or bounded, and the 4096-character cap keeps them linear.

No blockers. Five warnings are real behaviour defects, mostly around the
keyboard/focus layer and the stale-digest window.

## Warnings

### WR-01: Focus-time `requestAnimationFrame(() => el.select())` is unconditional and can select typed text

**File:** `app/tools/hash/HashTool.tsx:289-293`
**Issue:** `onFocus` checks `value === SAMPLE_TEXT` once, then schedules a rAF
that calls `el.select()` without re-checking. If the user (or `page.fill`, or a
paste right after `/`) changes the value in the same frame as focus, the rAF
fires afterwards and selects the NEW text. The next keystroke then replaces
what the user just typed. The comment says the rAF exists so a fast first
keystroke is not beaten by the selection. That is the exact case where the
unconditional re-select does damage. It is also the same pattern the mouse path
hits: a click-drag that begins within one frame of focus gets its selection
reset. It is a flaky-e2e and data-loss-of-input risk.
**Fix:**
```tsx
if (e.currentTarget.value === SAMPLE_TEXT) {
  const el = e.currentTarget;
  el.select();
  requestAnimationFrame(() => {
    if (el.value === SAMPLE_TEXT && document.activeElement === el) el.select();
  });
}
```

### WR-02: Escape during IME composition resets the tool

**File:** `lib/hooks/useKeyboardShortcut.ts:112-115` (consumed at `app/tools/hash/HashTool.tsx:205-209`)
**Issue:** The Escape branch fires for any `keydown` with `key === "Escape"`,
including the Esc that cancels an in-progress IME composition (CJK, some
Android keyboards, dead-key flows). The text the user is composing in the
textarea gets replaced by the sample, and the sample's digests replace the
real ones. The text is stashed under "Restore your text", but this is an
unintended destructive action. The hash tool is the first tool where Esc is
bound to a text-replacing reset. It should be guarded for `event.isComposing`
(and `keyCode === 229`). Also, `event.defaultPrevented` is not honoured, so an
open Radix popover/tooltip that already consumed the Esc is not respected;
only `role="dialog"` is special-cased in `HashTool`.
**Fix:**
```ts
if (event.key === "Escape") {
  if (event.isComposing || event.keyCode === 229) return;
  current.escape?.();
  return;
}
```

### WR-03: `?text=` with CR/CRLF is hashed as-is while the textarea shows LF

**File:** `app/tools/hash/HashTool.tsx:61-65` (and the `useState` initialiser at line 76)
**Issue:** `readTextParam()` returns the decoded value verbatim. A hand-built
or third-party link containing `%0D%0A` puts `"a\r\nb"` in state. The DOM
textarea normalises its `.value` to `"a\nb"`. So the hash, the byte count and
the share link are computed over CRLF text, while the user sees LF. This
contradicts the on-page promise "Pasted CRLF line endings become LF" and "The
byte count shows exactly what is hashed" (hint at line 364-368, FAQ
answer). React also re-assigns `node.value` on every render while state and
DOM differ, which moves the caret to the end until the first edit. The
generated share links never contain `\r`, so only foreign links hit this.
**Fix:**
```ts
return value === null || value === "" ? null : value.replace(/\r\n?/g, "\n");
```
Add a unit test for `?text=a%0D%0Ab` restoring `"a\nb"` with 3 bytes.

### WR-04: Digests of the previous text stay copyable while the displayed text has changed (and permanently after an engine error)

**File:** `app/tools/hash/HashTool.tsx:210-218, 462-481`; `app/tools/hash/OutputToolbar.tsx:51-59`; `app/tools/hash/DigestRow.tsx:110-113`
**Issue:** `stale` only dims the rows (`opacity-60`, `aria-busy`). Per-row Copy,
"Copy all digests" and the Ctrl/Cmd+C shortcut are all still enabled and copy
`result.digests`, which belong to older text. Verify is correctly gated on
`stale`; the copy paths are not. For text over the soft cap the stale window
is at least the 150 ms debounce plus hashing time. After an engine error
(`hashError`), `result` is never refreshed, so the stale digests stay copyable
indefinitely next to an error banner. A user can paste a digest into a
ticket that does not correspond to the text on screen. For a verification
tool that is a correctness problem.
**Fix:** Disable the copy affordances while `stale` (pass `disabled`/`pending`
to `DigestRow`'s copy button and to `OutputToolbar`), and make the `copy`
shortcut return early when `result.text !== text`. Do the same for the
verify "pending" state when `hashError` is true, so it does not show
"Comparing..." forever (see IN-02).

### WR-05: The global `/` shortcut fires for Ctrl/Cmd/Alt + `/`

**File:** `lib/hooks/useKeyboardShortcut.ts:92-99`
**Issue:** `event.key === "/"` is accepted regardless of `ctrlKey`, `metaKey`
or `altKey`, and `preventDefault()` is called. Ctrl+/ and Cmd+/ are used by
browser extensions, screen readers and OS-level/IDE-style shortcuts, and
Alt+/ is a Firefox quick-find variant on some layouts. The hook swallows
them and selects all text in the textarea. This phase touched the copy chord
to exclude Shift/Alt but left `/` unguarded. Shift must stay allowed, because
`/` is Shift+7 on several European layouts and the project targets a
Belgian/EU audience.
**Fix:**
```ts
if (event.key === "/") {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  ...
}
```

## Info

### IN-01: Esc on empty text offers a pointless "Restore your text"

**File:** `app/tools/hash/HashTool.tsx:185-188`
**Issue:** `if (text !== SAMPLE_TEXT) setRestorable(text)` also stashes `""`.
After the user clears the box and presses Esc, the notice offers to restore an
empty string. The restore button also does not restore the verify box
that Esc cleared (`setExpected("")`).
**Fix:** Stash only when `text !== "" && text !== SAMPLE_TEXT`. Optionally stash
`expected` alongside it.

### IN-02: Verify shows "Comparing..." forever when hashing failed

**File:** `app/tools/hash/HashTool.tsx:250-257`
**Issue:** With `hashError` true, `stale` stays true, so a non-empty expected
checksum shows the spinner "Comparing..." permanently beside the error banner.
**Fix:** Treat `hashError` as a terminal state: render idle (or a short
"Can't compare" line) instead of pending.

### IN-03: No-match hint talks about hex length for a Base64-shaped paste

**File:** `lib/hash/verify.ts:149-152`
**Issue:** When someone pastes a valid Base64 digest that does not match, the
hex candidate is not a valid hex digest, so the hint says "Expected 8, 32, 40,
... hex characters; got N." That is misleading for Base64 input.
**Fix:** Suppress the hint when `n.base64` has a plausible Base64 digest length
(for example 28, 44, 64 or 88 characters with a Base64 alphabet), or word it as
"hex digest or Base64".

### IN-04: Redundant per-keystroke work and stale doc comments

**File:** `app/tools/hash/HashTool.tsx:168, 231, 237`; `lib/hash/format.ts:3-4`
**Issue:** `encodeText(value)` runs in `handleTextChange` and again in the
`useMemo` on every keystroke. `buildShareLink` re-runs `encodeURIComponent`
over the full text on every render, including renders caused by unrelated
state such as copy toggles. `format.ts`'s header still says "Phase 9 adds the
uppercase case toggle and Base64", but that code is in the same file. This is
not a correctness issue (performance is out of v1 scope); it is noted for
maintainability.
**Fix:** `useMemo` the share link on `text`, and reuse one byte-length
computation. Update the stale comment.

### IN-05: Meta description is long and the layout e2e polls with a fixed sleep

**File:** `app/tools/hash/page.tsx:9-10`; `tests/e2e/hash-layout.spec.ts:85`
**Issue:** The page description is about 180 characters, so search snippets
will truncate it before the "No login." tail. The CLS test uses
`page.waitForTimeout(100)` inside a polling loop and pins skeleton heights to
the measured font metrics (a 4 px tolerance), which is likely to be flaky
across OS and font-rendering differences.
**Fix:** Trim the description to about 155 characters. Replace the sleep with
`expect.poll` or a rAF-based wait, and consider a looser tolerance with a
documented reason.

---

_Reviewed: 2026-10-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
