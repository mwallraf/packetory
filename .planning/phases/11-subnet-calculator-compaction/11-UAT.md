---
status: testing
phase: 11-subnet-calculator-compaction
source: [11-VERIFICATION.md]
started: 2026-11-11T19:50:21Z
updated: 2026-11-11T19:50:21Z
---

## Current Test

number: 1
name: Lighthouse before/after capture for /tools/subnet
expected: |
  All four rows in the 11-01-SUMMARY.md Lighthouse table hold four integer scores plus a three-decimal CLS (production vs preview of commit 19d739a, mobile and desktop), and the record gate exits 0 in the filled state. Numbers are recorded, not gated (PREG-03 in Phase 14 owns the 90+ gate). Follow "Human capture steps" in 11-01-SUMMARY.md.
awaiting: user response

## Tests

### 1. Lighthouse before/after capture for /tools/subnet
expected: All four rows in the 11-01-SUMMARY.md Lighthouse table hold four integer scores plus a three-decimal CLS (production vs preview of commit 19d739a, mobile and desktop), and the record gate exits 0 in the filled state. Follow "Human capture steps" in 11-01-SUMMARY.md.
result: [pending]

### 2. CLS re-measure on the production build
expected: On `npm run build && npm run start`, /tools/subnet CLS at 375x800 and 1280x800 is recorded in 11-01-SUMMARY.md and compared against the Phase 10 baseline 0.167 / 0.029 (reported, not gated).
result: [pending]

### 3. Real-laptop look at 1366x768, light and dark
expected: The whole default /tools/subnet result is visible without scrolling, the CIDR input and hero sit side by side, the binary value wraps cleanly, and copy confirmations are visible, in both light and dark mode.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
