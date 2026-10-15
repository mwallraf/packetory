---
status: testing
phase: 09-hash-tool-page-text-hashing
source: [09-VERIFICATION.md]
started: 2026-10-15T18:30:22Z
updated: 2026-10-15T18:30:22Z
---

## Current Test

number: 1
name: Real IME Esc behaviour (WR-02)
expected: |
  Type with a real IME (Japanese/Chinese/Korean) in the Text box, compose a candidate, then press Esc.
  The composition is cancelled and the tool is NOT reset to the sample; a second Esc outside composition resets.
awaiting: user response

## Tests

### 1. Real IME Esc behaviour (WR-02)
expected: Esc during IME composition cancels the composition only; the tool is not reset to the sample. A second Esc outside composition resets.
result: [pending]

### 2. Visual polish at 320px and desktop, light and dark
expected: Open /tools/hash at 320px and desktop width in both themes, select Base64, paste a matching checksum. Row badges, Match badge, wrapped toggles, SHA-256 row emphasis, muted/no-match text contrast and the skeleton-to-island swap all look intentional.
result: [pending]

### 3. D-27 privacy/legal wording review
expected: Registry description, metadata, worked example and the 5 FAQ answers contain no privacy or legal claim beyond "Hashing runs in your browser" and "The link contains your text."
result: [pending]

### 4. OUT-04 match wording reads as equality only
expected: "Matches SHA-256." and the neutral no-match line imply nothing about authenticity or safety; no-match reads as informational, not an error.
result: [pending]

### 5. Real clipboard in Safari and Firefox
expected: Ctrl/Cmd+C with no selection copies the SHA-256 digest with "Copied!"; per-row copy works; Copy link pastes into a new tab and restores the text.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
