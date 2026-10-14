---
status: testing
phase: 08-hash-core-worker-runtime
source: [08-VERIFICATION.md]
started: 2026-10-14T00:00:00Z
updated: 2026-10-14T00:00:00Z
---

## Current Test

number: 1
name: Firefox and Safari worker smoke check
expected: |
  After `HASH_SMOKE=1 npm run build && HASH_SMOKE=1 npm run start -- -p 3101`, open
  http://localhost:3101/hash-smoke in Firefox and in Safari. In devtools run
  `await window.__hashSmoke.start({kind:"text",text:"abc"})`. In both browsers the result
  has status "done" and sha256 `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`.
awaiting: user response

## Tests

### 1. Firefox and Safari worker smoke check
expected: Production module Worker hashes "abc" in Firefox and Safari; status "done", sha256 ba7816bf…15ad in both browsers (HASH-04; only Chromium is automated in Phase 8)
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
