---
phase: 09-hash-tool-page-text-hashing
plan: 05
subsystem: ui
tags: [hash, verify, checksum, normalization, fast-check, vitest, playwright]
status: complete
requires:
  - phase: 09-hash-tool-page-text-hashing
    provides: "09-04 DigestRow, formatDigest/toBase64, HashTool Digests block; 09-01 sample digests and hash-test-utils"
provides:
  - "lib/hash/verify.ts: normalizeExpected, matchExpected, describeMatch, VALID_HEX_LENGTHS (pure, total, linear-time)"
  - "VerifyBox: Expected checksum field plus aria-live polite result line (match / neutral no-match / pending / idle)"
  - "DigestRow matched variant: border-primary bg-primary/10 plus a Match badge (CircleCheck)"
  - "HashTool wiring: matchExpected derived at render, pending while digests are stale (D-19)"
affects: [09-06, 09-07, 09-08, 09-09]
actuals:
  tokens: 11400
  tasks: 2
  commits: 3
plan_head_before: 9ee71058778074edc21164368026b5850a8b0880
plan_head_after: 8263cafa79a9f099fb9d5973bc72517c216d7b91
tech-stack:
  added: []
  patterns:
    - "Verify result is derived at render from (expected, settled digests); never stored, so it re-evaluates on every digest change"
    - "BSD tag lines are parsed around the last closing paren with a tail-only regex instead of a backtracking pattern"
    - "Hex and Base64 candidates are derived separately so the 0x strip cannot corrupt a Base64 digest that begins with 0x"
key-files:
  created:
    - lib/hash/verify.ts
    - lib/hash/verify.test.ts
    - app/tools/hash/VerifyBox.tsx
    - app/tools/hash/HashTool.verify.test.tsx
    - tests/e2e/hash-verify.spec.ts
  modified:
    - app/tools/hash/DigestRow.tsx
    - app/tools/hash/HashTool.tsx
key-decisions:
  - "base64url input (- and _) is normalized to standard Base64 and trailing = is ignored on both sides before the case-sensitive compare"
  - "BSD tag rule 2 uses lastIndexOf(')') plus an anchored tail regex rather than the RESEARCH one-liner, which backtracks quadratically on inputs full of ')'"
  - "The leading 0x strip applies to the hex candidate only; the Base64 candidate keeps it (a Base64 digest may start with 0x)"
  - "describeMatch: one label 'Matches X.', two 'Matches X and Y.', three or more 'Matches X, Y and Z.'; equality wording only, never authenticity"
  - "No SRI (sha384-...) parsing: OUT-06 stays deferred"
requirements-completed: [OUT-04]
coverage:
  - id: D1
    description: "Pasting a checksum in any supported shape (case, spaces, colons, alias prefix, 0x, BSD tag, sha256sum line, Base64 standard/url, padded or not) highlights exactly the equal rows with a Match badge and 'Matches {labels}.'"
    requirement: OUT-04
    verification:
      - kind: unit
        ref: "lib/hash/verify.test.ts#matchExpected hex shapes, matchExpected Base64, round-trip property"
        status: pass
      - kind: unit
        ref: "app/tools/hash/HashTool.verify.test.tsx#OUT-04 pasting the sample SHA-256 highlights that row"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-verify.spec.ts#a prefixed upper-case checksum highlights the matching row (OUT-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A non-matching value shows a neutral 'No match.' line (CircleX, muted, never destructive); a non-hex or wrong-length value adds the length hint with N; empty or whitespace-only input is idle"
    requirement: OUT-04
    verification:
      - kind: unit
        ref: "lib/hash/verify.test.ts#matchExpected non-matches and hints"
        status: pass
      - kind: unit
        ref: "app/tools/hash/HashTool.verify.test.tsx#a value matching nothing shows a neutral no-match, never destructive"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-verify.spec.ts#a value equal to no digest says so neutrally; clearing the field returns to idle"
        status: pass
    human_judgment: false
  - id: D3
    description: "Verify re-evaluates when settled digests change and shows 'Comparing...' (never a match) while digests are stale"
    requirement: OUT-04
    verification:
      - kind: unit
        ref: "app/tools/hash/HashTool.verify.test.tsx#while digests are stale it shows Comparing... and asserts no match, then re-evaluates"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-verify.spec.ts#verification follows the text once the worker result lands (OUT-04, D-19)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Several algorithms sharing a digest are all highlighted in ALGORITHMS order; matchExpected on 4096-character adversarial input stays far below 50 ms"
    requirement: OUT-04
    verification:
      - kind: unit
        ref: "lib/hash/verify.test.ts#identical SHA-256 and SHA3-256 bytes highlight both; performance and ReDoS guard"
        status: pass
    human_judgment: false
  - id: D5
    description: "Match copy states byte equality only and never claims authenticity, safety or trust (prohibition OUT-04 transparency)"
    requirement: OUT-04
    verification:
      - kind: unit
        ref: "lib/hash/verify.test.ts#never uses authenticity wording; HashTool.verify.test.tsx#match copy states equality only"
        status: pass
    human_judgment: true
    rationale: "The prohibition is judgment-verified: tests assert the exact strings but whether the wording reads as equality-only to users is a copy review"
---

# Phase 9 Plan 05: Paste-to-verify Summary

**Paste-to-verify for the Hash Generator: a tolerant checksum normalizer (case, spaces, colons, alias prefixes, 0x, BSD tags, sha256sum lines, Base64/base64url) that highlights every equal digest row, hints neutrally on malformed input, and never asserts a match against stale digests.**

## Performance

- **Duration:** 3 min (18:02:03Z to 18:05:23Z)
- **Tasks:** 2 (1 tracer, 1 TDD)
- **Files:** 7 (5 created, 2 modified)
- **Commits:** 3 (feat tracer, test RED, feat GREEN)

## Accomplishments

- **Tracer (Task 1):** `lib/hash/verify.ts` core (rules 1, 3, 4, 5, 7), `VerifyBox`, the `DigestRow` matched variant and `HashTool` wiring, proven end to end in a real browser (4 Playwright tests).
- **Full rule set (Task 2):** BSD tag lines, `0x`, Base64 (standard and url-safe, padded or not, case-sensitive, CRC32 excluded), and the neutral `Expected 8, 32, 40, 56, 64, 96 or 128 hex characters; got N.` hint. Locked by 62 table/property/timing tests plus 12 RTL tests.
- Verify result is derived at render from `(expected, result.digests)` and swapped for `Comparing...` whenever `result.text !== text`, so it follows the settled digests (D-19).
- Threat mitigations: 4096 cap plus linear patterns with an under-50 ms adversarial timing test (T-09-14), equality-only copy (T-09-15), pasted value rendered only as React text and never echoed in the hint (T-09-16), no packages installed (T-09-SC; package.json and lockfile untouched).

## Task Commits

1. **Task 1: tracer** - `4f04a4c` (feat) - verify core, VerifyBox, DigestRow match variant, HashTool wiring, e2e
2. **Task 2 RED** - `bcd71de` (test) - table, property, timing contract (24 failing as expected)
3. **Task 2 GREEN** - `8263caf` (feat) - complete rule set and RTL suite

Tracer gate: `⚡ Tracer verified end-to-end — expanding` (Playwright 4/4, vitest and typecheck green before Task 2 started).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] ReDoS-safe BSD tag parsing**
- **Found during:** Task 2 (design of rule 2)
- **Issue:** The RESEARCH pattern `^[A-Za-z0-9_-]+\s*\(.*\)\s*=\s*(\S+)$` backtracks quadratically on inputs containing many `)` followed by `=` tokens, at odds with the T-09-14 mitigation.
- **Fix:** Check the `NAME (` head with an anchored regex, split at `lastIndexOf(")")`, and match only the tail `^\s*=\s*(\S+)$`. Same result for every real BSD line (a hash cannot contain `)`), linear on adversarial input; covered by timing tests.
- **Files modified:** lib/hash/verify.ts
- **Commit:** 8263caf

**2. [Rule 1 - Bug] 0x strip must not corrupt Base64 digests**
- **Found during:** Task 2 (rule 3 and rule 6 interaction)
- **Issue:** Applying the leading `0x` strip before building the Base64 candidate would mangle a valid Base64 digest that begins with `0x` (about 1 in 4096 digests).
- **Fix:** Derive the hex candidate from the `0x`-stripped text and the Base64 candidate from the unstripped text; regression test added.
- **Files modified:** lib/hash/verify.ts, lib/hash/verify.test.ts
- **Commit:** 8263caf

**Minor presentation choice:** the verify `Input` carries `h-11` (44 px) to match the project's 44 px touch-target rule used by the adjacent buttons; the plan listed only font/size classes.

**Total deviations:** 2 auto-fixed (1 missing-critical, 1 bug). **Impact:** none on scope; both strengthen the planned behavior.

## Authentication Gates

None.

## Issues Encountered

- The file-writing tool turned the backslash-u escapes in the zero-width regex and in test strings into literal invisible characters. Caught by the plan's own `node -e` acceptance check; both files were rewritten with escapes (verified: no U+200B-U+200D, U+2060 or U+FEFF literal in lib/hash/verify.ts, and no non-ASCII in the test file).

## Known Stubs

None.

## Threat Flags

None. No new endpoints, storage or network surface; the pasted value stays in component state and is compared locally.

## Next Phase Readiness

Ready for 09-06. Test ids `hash-verify`, `hash-verify-result` and `hash-row-{id}-match` are in place. Esc-to-clear for the verify field (UI-SPEC, "Esc clears the field") is not part of this plan's tasks and is left to the keyboard-shortcut plan; the field is controlled by `expected` state in HashTool, so it can be cleared from there.

## Self-Check: PASSED

- Files exist: lib/hash/verify.ts, lib/hash/verify.test.ts, app/tools/hash/VerifyBox.tsx, app/tools/hash/HashTool.verify.test.tsx, tests/e2e/hash-verify.spec.ts (all FOUND).
- Commits 4f04a4c, bcd71de, 8263caf are ancestors of HEAD.
- `npx vitest run` 44 files / 623 tests pass; `npx playwright test tests/e2e/hash-verify.spec.ts tests/e2e/hash.spec.ts tests/e2e/hash-output.spec.ts` 10/10 pass; `npm run typecheck` clean; `npm run lint` 0 errors (1 pre-existing unrelated warning in lib/mac/vendor.ts); `git diff --quiet -- package.json package-lock.json` exits 0.
