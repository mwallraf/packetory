---
status: complete
phase: 09-hash-tool-page-text-hashing
source: [09-VERIFICATION.md]
started: 2026-10-15T18:30:22Z
updated: 2026-10-17T07:27:06.603Z
---

## Current Test

[testing complete]

## Tests

### 1. Real IME Esc behaviour (WR-02)
expected: Esc during IME composition cancels the composition only; the tool is not reset to the sample. A second Esc outside composition resets.
result: pass

### 2. Visual polish at 320px and desktop, light and dark
expected: Open /tools/hash at 320px and desktop width in both themes, select Base64, paste a matching checksum. Row badges, Match badge, wrapped toggles, SHA-256 row emphasis, muted/no-match text contrast and the skeleton-to-island swap all look intentional.
result: pass

### 3. D-27 privacy/legal wording review
expected: Registry description, metadata, worked example and the 5 FAQ answers contain no privacy or legal claim beyond "Hashing runs in your browser" and "The link contains your text."
result: pass

### 4. OUT-04 match wording reads as equality only
expected: "Matches SHA-256." and the neutral no-match line imply nothing about authenticity or safety; no-match reads as informational, not an error.
result: pass

### 5. Real clipboard in Safari and Firefox
expected: Ctrl/Cmd+C with no selection copies the SHA-256 digest with "Copied!"; per-row copy works; Copy link pastes into a new tab and restores the text.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
