---
status: testing
phase: 02-uuid-generator
source: [02-VERIFICATION.md]
started: 2026-07-23T16:58:03Z
updated: 2026-07-23T16:58:03Z
---

## Current Test

number: 1
name: Uniqueness FAQ copy is a probabilistic hedge, not an absolute guarantee
expected: |
  Copy reads as probabilistic ("collision probability is negligible... not in an absolute
  mathematical sense"), never "guaranteed unique".
awaiting: user response

## Tests

### 1. Uniqueness FAQ copy is a probabilistic hedge, not an absolute guarantee
expected: Copy reads as probabilistic ("collision probability is negligible... not in an absolute mathematical sense"), never "guaranteed unique".
result: [pending]

### 2. UUID v7 copy does not overstate strict global monotonicity
expected: Copy describes v7 as "time-ordered and sortable... not a strict global sequence... clock skew and same-millisecond generation mean ordering is approximate, not absolute."
result: [pending]

### 3. No generated UUID value is ever transmitted to analytics or any third party
expected: lib/uuid/*, app/tools/uuid/UuidTool.tsx contain no analytics/telemetry call sites; all generation/formatting/export stays client-local.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
