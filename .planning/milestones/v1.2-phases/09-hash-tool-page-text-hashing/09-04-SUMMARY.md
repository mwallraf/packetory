---
phase: 09-hash-tool-page-text-hashing
plan: 04
subsystem: ui
tags: [hash, output, clipboard, base64, toggle-group, badges, vitest, playwright, fast-check]
requires:
  - phase: 09-hash-tool-page-text-hashing
    provides: "09-01 HashTool island with inline digest rows, hash-test-utils, sample digests"
provides:
  - "formatDigest/toBase64/toHexUpper and DigestEncoding: display-only re-formatting of stored digest bytes (CRC32 stays hex under Base64)"
  - "lib/hash/export.ts: formatLabeledList and formatChecksumLines (sha256sum text-mode, always lowercase hex)"
  - "DigestRow: per-row copy with Copied! confirmation, inline security badges, primary SHA-256 emphasis, Always hex note"
  - "OutputToolbar: hex/HEX/Base64 toggle, Copy all as (Labeled list / Checksum lines) toggle and Copy all digests button"
affects: [09-05, 09-06, 09-07, 09-09]
actuals:
  tokens: 21000
  tasks: 3
  commits: 5
plan_head_before: 27bcb05b28006424873c4be773719c534bdf773d
plan_head_after: fa4036d5a95bb52451177fee1d36316e274aff9b
tech-stack:
  added: []
  patterns:
    - "Encoding is display-only state: rows format stored bytes at render time, the toggle never calls HashClient.start()"
    - "Copy-all payload is snapshotted at click time from pure formatters"
    - "Radix single-select empty deselect value is ignored so one item is always selected"
key-files:
  created:
    - lib/hash/export.ts
    - lib/hash/export.test.ts
    - app/tools/hash/DigestRow.tsx
    - app/tools/hash/OutputToolbar.tsx
    - app/tools/hash/HashTool.output.test.tsx
    - tests/e2e/hash-output.spec.ts
  modified:
    - lib/hash/format.ts
    - lib/hash/format.test.ts
    - app/tools/hash/HashTool.tsx
    - app/tools/hash/HashTool.test.tsx
key-decisions:
  - "Copy-all format state lives inside OutputToolbar; Esc handling elsewhere cannot reset it"
  - "Copy-all lines are joined with newline and carry no trailing newline (deterministic payloads)"
  - "Base64 uses btoa over a char-code loop; no dependency on Uint8Array.prototype.toBase64"
  - "Checksum lines are always lowercase hex regardless of the display encoding; the labeled list follows the display encoding (CRC32 stays hex)"
requirements-completed: [OUT-01, OUT-02, OUT-03, OUT-05]
coverage:
  - id: D1
    description: "Per-row one-click copy writes the digest exactly as displayed, with icon swap, aria-label and aria-live Copied! confirmation, reset on value change, neutral error line on failure"
    requirement: OUT-01
    verification:
      - kind: e2e
        ref: "tests/e2e/hash-output.spec.ts#copying a row writes the digest as displayed and confirms (OUT-01)"
        status: pass
      - kind: unit
        ref: "app/tools/hash/HashTool.output.test.tsx#OUT-01 per-row copy"
        status: pass
    human_judgment: false
  - id: D2
    description: "hex / HEX / Base64 toggle re-formats stored bytes only (no re-hash), CRC32 stays hex with an Always hex note, A->B->A restores the original, in-flight toggle formats the incoming result"
    requirement: OUT-03
    verification:
      - kind: e2e
        ref: "tests/e2e/hash-output.spec.ts#encoding toggle re-formats digests and restores hex exactly (OUT-03)"
        status: pass
      - kind: unit
        ref: "lib/hash/format.test.ts (fast-check Base64 property) and app/tools/hash/HashTool.output.test.tsx#OUT-03 encoding toggle"
        status: pass
    human_judgment: false
  - id: D3
    description: "Copy all as Labeled list or Checksum lines (two spaces before dash, # LABEL comments, lowercase hex, all 10 algorithms in ALGORITHMS order, also for empty input)"
    requirement: OUT-02
    verification:
      - kind: unit
        ref: "lib/hash/export.test.ts and app/tools/hash/HashTool.output.test.tsx#OUT-02 copy all"
        status: pass
    human_judgment: false
  - id: D4
    description: "MD5/SHA-1 inline Not for security and CRC32 Error detection only badges (text + icon, no tooltip), SHA-256 primary row emphasis"
    requirement: OUT-05
    verification:
      - kind: unit
        ref: "app/tools/hash/HashTool.output.test.tsx#OUT-05 row presentation"
        status: pass
    human_judgment: true
    rationale: "Visual layout of the row header and toolbar wrapping at 320px is covered by the 09-09 overflow check, not asserted here"
---

# Phase 9 Plan 04: Hash output surface Summary

**Hash digest rows now have per-row copy with visible confirmation, a display-only hex / HEX / Base64 toggle (CRC32 stays hex), copy-all as a labeled list or sha256sum checksum lines, inline not-for-security badges and a primary SHA-256 row.**

## Performance

- **Started:** 2026-10-15 (plan start); **Completed:** 2026-10-15T18:00Z
- **Tasks:** 3 (tracer + 2 TDD), **Commits:** 5, **Files:** 10 (6 created, 4 modified)

## Accomplishments

- Tracer (Task 1): switch encoding and copy one digest as displayed, proven in a real browser (Playwright: HEX uppercase, Base64 `uU0nuZNN...zek=` with CRC32 still `0d4a1185`, back to hex restores exactly, clipboard holds the uppercase digest and the button reads "Copied!").
- Copy all (Task 2): pure `formatLabeledList` / `formatChecksumLines` with fast-check Base64 property tests; toolbar format toggle and Copy all digests button snapshot the payload at click time.
- Row presentation (Task 3): inline security badges driven by `ALGORITHMS.notForSecurity`, SHA-256 `border-l-4 border-l-primary` plus semibold value, "Always hex" note for CRC32 under Base64; RTL suite locks OUT-01/02/03/05 including the no-re-hash and in-flight-toggle edges.

## Task Commits

1. Task 1 (tracer): `cda18a4` feat - encoding toggle and per-row copy as displayed
2. Task 2 RED: `ec9cbb7` test - failing export/encoding tests
3. Task 2 GREEN: `08538bb` feat - copy all labeled list / checksum lines
4. Task 3 RED: `69473a1` test - RTL output contract (4 of 21 failing at this commit)
5. Task 3 GREEN: `fa4036d` feat - badges, primary row, Always hex

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing row-order test broke on new row test ids**
- **Found during:** Task 1
- **Issue:** `HashTool.test.tsx` "renders exactly 10 rows in ALGORITHMS order" collected every `hash-row-*` test id except `-value`, so the new `-copy` / `-status` ids made it fail.
- **Fix:** filter collected ids down to real algorithm ids.
- **Files modified:** app/tools/hash/HashTool.test.tsx
- **Commit:** cda18a4

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** none on scope; test-only change.

## Notes

- Task 2's format tests for `toHexUpper`/`toBase64`/`formatDigest` passed at RED time because Task 1 (tracer) already implemented those functions; the RED signal for Task 2 is the missing `lib/hash/export` module.
- The Task 3 RED commit was made after the implementation was already in the working tree (a shell-chain error skipped the earlier commit); only the test file was staged, so the RED commit still genuinely fails 4 tests.
- `npm run lint` reports one pre-existing warning in `lib/mac/vendor.ts` (unused type), unrelated.
- `package.json` / `package-lock.json` untouched (T-09-SC).

## Verification

- `npx vitest run` (whole project): 549 passed.
- `npx playwright test tests/e2e/hash.spec.ts tests/e2e/hash-output.spec.ts`: 6 passed.
- `npm run typecheck`: clean. `npm run lint`: 0 errors.
- `lib/hash/boundaries.test.ts` green (export.ts imports no engine/job).

## Known Stubs

None.

## Threat Flags

None. No new network endpoints or trust boundaries; clipboard writes are of displayed/derived digest text only.

## Self-Check: PASSED

All created files exist; commits cda18a4, ec9cbb7, 08538bb, 69473a1, fa4036d are ancestors of HEAD.
