---
phase: 12-password-core-library
plan: 05
subsystem: password-core-library
tags: [url-state, barrel, source-guards, analytics-redaction, fast-check, vitest]
status: complete

requires: ["12-01", "12-02", "12-03", "12-04"]
provides:
  - "parseOptions / serializeOptions: pure, total URL options codec with a fixed 13-key whitelist, 2048-character search cap and 64-character decoded symbol cap"
  - "lib/password/index.ts: public barrel (every constant, function and error class; never the loader, vendored list or test helpers; silent at import)"
  - "lib/password/boundaries.test.ts: D-05 source guards with 23 in-memory mutants and a Phase 13-extensible WALK_DIRS"
  - "PASSWORD regression in lib/analytics/redact.test.ts"
affects: [13-password-tool-ui, 14-password-faq]

actuals:
  tokens: 28000
  tasks: 3
  commits: 3
plan_head_before: 8330c6488a3375ab23225fcbdf7576364a79318a
plan_head_after: a28425e4dba2bc9332f87a8f2776d2d5e655a52d

tech-stack:
  added: []
  patterns:
    - "Codec builds its result from a fresh literal over params.get of whitelisted keys, then re-normalizes (no key copying, no prototype pollution)"
    - "Guard analysis is a pure function over a source map, so mutants are in-memory and no tracked file is ever edited"
    - "Forbidden snippets in the guard are assembled from string parts so the earlier plans' shell gates stay green"

key-files:
  created:
    - lib/password/url-state.ts
    - lib/password/url-state.test.ts
    - lib/password/index.ts
    - lib/password/index.test.ts
    - lib/password/boundaries.test.ts
  modified:
    - lib/analytics/redact.test.ts

key-decisions:
  - "parseOptions hands URLSearchParams a string that always starts with '?': the constructor drops exactly one leading '?', so '??len=64' keeps a '?len' key (ignored) and gives the default, as the plan's table requires (stripping one '?' ourselves and then passing the rest let the constructor strip a second)"
  - "serializeOptions returns '' for defaults and no leading '?'; parseOptions accepts both forms"
  - "Guard strips comments with a short state machine; unterminated single/double-quoted strings end at the newline so a stray quote in a regex literal cannot swallow the rest of a file"

requirements-completed: [PWD-04]

coverage:
  - id: D1
    description: "URL codec round-trips every valid option set (with and without '?'), is idempotent, emits unique whitelisted keys in order, and the maximal serialization stays under 2048 characters"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/password/url-state.test.ts#properties (D-22)"
        status: pass
    human_judgment: false
  - id: D2
    description: "parseOptions is total and clamps or drops hostile input (out-of-range, malformed, full-width digits, unknown and prototype keys, oversized or non-ASCII symbols, over-cap search)"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/password/url-state.test.ts#hostile input (D-21)"
        status: pass
    human_judgment: false
  - id: D3
    description: "serializeOptions accepts only ToolOptions (two @ts-expect-error directives are used by typecheck) and an extra field never reaches the string"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/password/url-state.test.ts#no field can carry generated output (D-22)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No password option key is allow-listed and redactParams reports {} for a non-default serialized query; redact.ts and PacketoryAnalytics.tsx unchanged"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/analytics/redact.test.ts#PASSWORD regression"
        status: pass
    human_judgment: false
  - id: D5
    description: "Guards forbid the Math random member in four forms, Web Crypto outside random.ts, a static or second dynamic importer of the vendored list, loader or test-utils imports, crypto/framework imports and network/storage/console in lib/password, with every rule proven by an in-memory mutant"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/password/boundaries.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Barrel exports every FAQ constant with its exact value, every function and error class, none of the excluded names, no large array or string, frozen tables, and draws nothing at import"
    requirement: PWD-04
    verification:
      - kind: unit
        ref: "lib/password/index.test.ts"
        status: pass
    human_judgment: false
---

# Phase 12 Plan 05: URL codec, public barrel and source guards Summary

A pure, total URL options codec (13 whitelisted keys, defaults serialize to an empty query), the analytics redaction regression, the public barrel that never exports the word-list loader or draws at import, and source guards with 23 in-memory mutants that fail the suite if Math random, Web Crypto outside `randomInt`, a second or static word-list importer, or a network/storage/console dependency ever appears in `lib/password`.

**Duration:** about 8 min. **Tasks:** 3. **Files:** 5 created, 1 modified.

## Accomplishments

- `url-state.ts`: `serializeOptions(DEFAULT_OPTIONS)` is `""`; the non-default fixture serializes to exactly `mode=passphrase&len=32&sym=%21%3F&amb=1&words=8` and parses back (with and without `?`). The codec checks the 2048-character cap before any parsing and applies the 64-character limit to the decoded symbol set.
- `url-state.test.ts` (58 tests): the full D-21 hostile table, cap adjacency at 2048/2049, prototype-key safety, and fast-check properties (500 runs each for totality over binary / web-query / structured strings, round trip, idempotence; 300 for key whitelist and order).
- `redact.test.ts`: one new regression; `redact.ts` and `PacketoryAnalytics.tsx` are byte-identical to f1b330c.
- `index.ts` / `index.test.ts`: every FAQ constant pinned to its exact value, `loadWordlist`, `createWordlistLoader`, `queueFill`, `constantFill`, `recordingFill` and `default` absent, fresh-graph import makes zero Web Crypto and zero Math random calls.
- `boundaries.test.ts` (node environment): real-tree rules all empty except wordlist.ts as the sole dynamic importer; walk non-vacuous (14 non-test files, eff-large.ts walked with more than 60,000 code characters and no match). Rule scoping lets Phase 13 append `app/tools/password` to `WALK_DIRS`.

## Task Commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Tracer: codec, barrel, analytics redaction regression | ccf1027 |
| 2 | Hostile input, round trip, idempotence, output exclusion | f485826 |
| 3 | Barrel surface and source guards with teeth | a28425e |

## Phase gate (run in sequence on the final tree)

- `npx vitest run lib/password lib/analytics`: `Test Files 11 passed (11)`, `Tests 391 passed (391)`.
- `npm run typecheck`: clean (both `@ts-expect-error` directives in url-state.test.ts are used, so typecheck proves serializeOptions rejects non-options).
- `npm run lint`: 0 errors; 1 pre-existing warning in `lib/mac/vendor.ts` (`MacVendorRouteResponse` unused), out of scope.
- `npm test`: `Test Files 66 passed (66)`, `Tests 1120 passed (1120)`.
- `npm run build`: succeeded; all routes prerendered static.
- `git diff --quiet f1b330c -- package.json package-lock.json lib/analytics/redact.ts lib/analytics/PacketoryAnalytics.tsx`: exit 0 (no dependency or analytics module change).
- R2 / R9 shell gates (no Math-random reference in any lib/password file, `getRandomValues` only in random.ts among non-test files, the vendored list path only in wordlist.ts among non-test files): pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Leading-question-mark handling in parseOptions**
- **Found during:** Task 2 (the `??len=64` hostile row)
- **Issue:** Stripping one `?` ourselves and passing the remainder to `URLSearchParams` let the constructor strip a second `?`, so `??len=64` parsed as `len=64` instead of the default.
- **Fix:** Always pass `URLSearchParams` a string that starts with exactly one `?` (it drops that one itself).
- **Files modified:** lib/password/url-state.ts
- **Commit:** f485826

The `mutate` helper in the guard takes the base map as a parameter so each mutant test builds its own `new Map(real)` (23 occurrences), matching the plan's acceptance criterion literally.

## Known Stubs

None.

## Threat Flags

None. No new network, auth, file or storage surface.

## Human check

None new for this plan. The queued 12-04 licence-wording check for `eff-large.ts` remains for the batched milestone UAT.

## Next Phase Readiness

Phase 13 imports the whole library from `@/lib/password`, and the loader from `@/lib/password/wordlist`. It composes the URL as `/tools/password` + (qs ? "?" + qs : "") and appends `"app/tools/password"` to `WALK_DIRS` in the boundaries guard.

## Self-Check: PASSED

- Files exist: lib/password/url-state.ts, url-state.test.ts, index.ts, index.test.ts, boundaries.test.ts, and the modified lib/analytics/redact.test.ts (all FOUND).
- Commits ccf1027, f485826, a28425e are ancestors of HEAD.
