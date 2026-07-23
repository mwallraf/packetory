---
status: testing
phase: 01-shared-shell-registry
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md]
started: 2026-07-23T15:15:00Z
updated: 2026-07-23T15:15:00Z
---

## Current Test

number: 1
name: Cumulative Layout Shift at 320px
expected: |
  Load the homepage on a real 320px-wide device (or emulated) on a throttled
  connection. Watch the initial paint, theme-script application, and
  IP-badge resolution/hide. CLS should be 0 — no visible content jump when
  the theme class applies or when the IP badge appears/disappears.
awaiting: user response

## Tests

### 1. Cumulative Layout Shift at 320px
expected: CLS = 0 across the whole load sequence; no visible content jump when the theme class applies or the IP badge resolves/hides.
result: [pending]

### 2. Keyboard Focus Order and Ring Visibility
expected: Tabbing through the homepage from a fresh load, in both light and dark themes, visits logo -> nav/hamburger -> theme toggle -> main content with no traps or skips, and every stop shows a visible accent focus ring.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
