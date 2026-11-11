---
status: testing
phase: 13-password-generator-page
source: [13-VERIFICATION.md]
started: 2026-11-11T22:39:22Z
updated: 2026-11-11T22:39:22Z
---

## Current Test

number: 1
name: Password managers do not offer to save/autofill
expected: |
  On /tools/password in Chrome, Safari (iCloud Keychain) and 1Password or Bitwarden: no save-password or autofill prompt appears for the generated value or the option inputs.
awaiting: user response

## Tests

### 1. Password managers do not offer to save/autofill
expected: On /tools/password in Chrome, Safari (iCloud Keychain) and 1Password or Bitwarden: no save-password or autofill prompt appears for the generated value or the option inputs.
result: [pending]

### 2. Chrome Translate leaves the password untouched
expected: Using Chrome 'Translate this page' on /tools/password does not alter the displayed password characters.
result: [pending]

### 3. VoiceOver reading and E1-a11y-snapshot interpretation
expected: VoiceOver reads controls, the output and live-region phrases sensibly; you accept that the password is exposed as plain text content while names, descriptions, attributes and the live region never contain it.
result: [pending]

### 4. 320px visuals, light and dark
expected: At 320px in light and dark mode the page has no overflow, controls are usable and nothing looks broken.
result: [pending]

### 5. Focus ring on every control
expected: Tabbing through the page shows a visible focus ring on every interactive control.
result: [pending]

### 6. Safari copy
expected: In Safari, Copy, Copy all and per-row copy place the exact password text on the clipboard and show confirmation.
result: [pending]

### 7. UI-2 sign-off: filled accent Copy buttons
expected: You accept the hero Copy / Copy all as filled accent buttons (light #0e7490, dark primary token) instead of the UI-SPEC ghost text-primary style.
result: [pending]

### 8. IN-08 / UI-3 sign-off: icon-only row confirmation
expected: You accept that batch row copy confirmation shows a check icon only ("Copied!" kept for screen readers) instead of a visible caption.
result: [pending]

### 9. WR-01 error copy approval
expected: You approve the new error text "Something went wrong, so no password was generated." / "Press Enter to try again, or change an option."
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
