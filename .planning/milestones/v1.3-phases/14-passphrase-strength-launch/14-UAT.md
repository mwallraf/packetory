---
status: complete
phase: 14-passphrase-strength-launch
source: [14-VERIFICATION.md]
started: 2026-11-12T00:18:58Z
updated: 2026-11-12T14:20:42.763Z
---

## Current Test

[testing complete]

## Tests

### 1. PREG-02 wording approval
expected: FAQ Q5 (privacy) and Q6 (clipboard), the Q2 'Web Crypto API' reword, and 'Runs locally in your browser' in the meta description and intro read correctly and do not promise clipboard clearing.
result: pass

### 2. PHR-04 EFF CC BY attribution
expected: The attribution in lib/password/wordlist/eff-large.ts header, the About worked-example block and the passphrase credit line is acceptable (names CC BY 4.0 and 3.0 US).
result: pass

### 3. PREG-03 Lighthouse 90+ on a Vercel preview
expected: On a Vercel preview, /tools/password and /tools/subnet score >=90 in Performance, Accessibility, Best Practices and SEO on mobile and desktop (local advisory: 100/96/96/100).
result: pass

### 4. Assistive tech and extensions in both modes
expected: Password managers, Chrome Translate and VoiceOver behave correctly in Password and Passphrase modes, incl. mode/separator toggles, 'Loading word list', Retry-by-reload; you accept the ?mode=passphrase&n>1 content shift.
result: pass

### 5. Safari 7-link nav
expected: In Safari at 640px and 700px all seven nav links fit on one line and the landing card with the key icon is last.
result: pass

### 6. Visual backstops
expected: At 320px in light and dark the page looks right, every control shows a focus ring, and Safari Copy shows 'Copied!'.
result: pass

### 7. WR-03 behaviour decision
expected: You accept that after a word-list ChunkLoadError, option changes keep the error panel and only Retry reloads the page.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
