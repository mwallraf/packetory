---
phase: 12-password-core-library
verified: 2026-11-12T14:20:00Z
status: passed
score: 5/5 roadmap success criteria verified
covered_files:
  - ".planning/phases/12-password-core-library/12-01-PLAN.md"
  - ".planning/phases/12-password-core-library/12-01-SUMMARY.md"
  - ".planning/phases/12-password-core-library/12-02-PLAN.md"
  - ".planning/phases/12-password-core-library/12-02-SUMMARY.md"
  - ".planning/phases/12-password-core-library/12-03-PLAN.md"
  - ".planning/phases/12-password-core-library/12-03-SUMMARY.md"
  - ".planning/phases/12-password-core-library/12-04-PLAN.md"
  - ".planning/phases/12-password-core-library/12-04-SUMMARY.md"
  - ".planning/phases/12-password-core-library/12-05-PLAN.md"
  - ".planning/phases/12-password-core-library/12-05-SUMMARY.md"
  - "lib/analytics/redact.test.ts"
  - "lib/password/boundaries.test.ts"
  - "lib/password/charset.ts"
  - "lib/password/constants.ts"
  - "lib/password/crack-time.ts"
  - "lib/password/entropy.ts"
  - "lib/password/generate.ts"
  - "lib/password/index.ts"
  - "lib/password/passphrase.ts"
  - "lib/password/random.ts"
  - "lib/password/url-state.ts"
  - "lib/password/wordlist.ts"
  - "lib/password/wordlist/eff-large.ts"
  - "scripts/generate-eff-wordlist.mjs"
covered_digest: "v4:sha256:29ee6abd0e7bb3b0e355d1015d852c75dc16b6bca38209ec7e3c6a2d64bf6342"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 12: Password Core Library Verification Report

**Phase Goal:** The password tool's correctness and privacy guarantees exist, and are proven, in a framework-agnostic `lib/password` before any UI is built (unbiased CSPRNG passwords and passphrases, entropy and crack-time figures derived from settings, a URL options codec safe against hostile input).
**Verified:** 2026-11-12T14:20:00Z
**Status:** passed
**Re-verification:** Yes. The prior report (2026-11-11) was `human_needed` solely for the 12-04 licence-wording backstop. That item is now resolved by 12-UAT.md (status: complete, 1 passed, 0 issues). The fingerprint is recomputed because `lib/password/boundaries.test.ts` was later extended by phases 13-03 and 14-01.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Across the full option space, every password has the requested length, at least one char from each enabled set, and only pool chars; one-of-each is met by bounded whole-password resampling, never patching | VERIFIED | `generate.ts`: each candidate is `pool[randomInt(pool.length, fill)]` x length; accepted only when `seen === fullMask`, otherwise the whole candidate is discarded. The loop is bounded by `MAX_GENERATION_ATTEMPTS`, then throws `GenerationExhaustedError`. No shuffle or position patching. `generate.test.ts` carries the fast-check PWD-04 property plus resampling, no-patch and exhaustion tests; passing on re-run. |
| 2 | One audited `randomInt` over `crypto.getRandomValues` with rejection sampling; stubbed-RNG boundary tests; no `Math.random` in `lib/password`; no call over 65,536 bytes; typed error with no Web Crypto | VERIFIED | `random.ts`: `limit = TWO_32 - (TWO_32 % maxExclusive)`, redraw unless `r < limit`; `MAX_FILL_BYTES` cap throws `RangeError`; absent Web Crypto throws `CryptoUnavailableError`, with no fallback. My grep for `Math.random` in non-test `lib/password` sources returned no matches. `boundaries.test.ts` (extended later by 13-03 and 14-01) and `random.test.ts` pass. |
| 3 | Symbol normalization, look-alike removal before pool size; passphrase 3-20 words, 4 separators, capitalize, number, drawn from the vendored unmodified 7,776-word EFF Large; integrity test pins count and hash; CC BY header and generation script; reachable only via memoized dynamic `import()` | VERIFIED | `charset.ts` normalizers and `LOOK_ALIKES`. I independently parsed `eff-large.ts` today: 7776 words, 7776 unique, first `abacus`, last `zoom`, SHA-256 `c523ba7b...3675`, matching the pin in the header. `scripts/generate-eff-wordlist.mjs` exists. The only non-test reference to the list in the app/lib code is the literal `import("./wordlist/eff-large")` in `wordlist.ts`; the barrel `index.ts` has no wordlist export. Licence wording: accepted by the user in UAT (12-UAT.md, pass). |
| 4 | Entropy from options only; default about 128 bits; 6 words = 77.5 bits (+ log2(10) with number); labels at 40/75/100; crack time in log space, no overflow at 128 chars | VERIFIED | `entropy.ts` exact BigInt inclusion-exclusion with no function taking a generated string; `crack-time.ts` pure log10 arithmetic with `GUESS_RATES` fast 1e10 / slow 1e4. `entropy.test.ts` and `crack-time.test.ts` hold the fixtures and properties; passing. |
| 5 | URL codec round-trips valid sets, clamps/drops hostile params, cannot carry generated output; redaction regression proves password params never reach analytics, allow-list unchanged | VERIFIED | `url-state.ts` whitelist, length caps and normalization through `normalizeToolOptions`; `url-state.test.ts` has fast-check round-trip/idempotence/totality properties. `lib/analytics/redact.test.ts:102` is the PASSWORD regression over `PASSWORD_URL_KEYS`; `lib/analytics/redact.ts` untouched since phase 01 (last commit 6ad6df2). |

**Score:** 5/5 roadmap criteria verified; 0 behavior-unverified.

### Plan-level Backstop Truth (12-04)

| Truth | Status | Evidence |
|-------|--------|----------|
| EFF CC BY licence-header wording is confirmed by the user | VERIFIED (human) | Header present (EFF credited, CC BY 4.0 International and 3.0 US named with URLs, "Changes: none to the words"). The user passed this in 12-UAT.md on 2026-11-12 (status: complete, 1/1 passed). |

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `lib/password/{random,charset,generate,entropy,crack-time,passphrase,wordlist,url-state,constants,errors,types,index}.ts` | VERIFIED | Present, substantive, wired through the barrel. |
| `lib/password/wordlist/eff-large.ts` | VERIFIED | 7,776 words, hash matches pin, header present. |
| `scripts/generate-eff-wordlist.mjs` | VERIFIED | Present; render-equality test in `wordlist.test.ts`. |
| `lib/password/boundaries.test.ts`, `nyquist.test.ts`, `index.test.ts` | VERIFIED | Present and passing. |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `generate.ts` / `passphrase.ts` | `random.ts` `randomInt` | WIRED | All sampling goes through `randomInt`. |
| `entropy.ts` / `generate.ts` / `url-state.ts` | `charset.ts` normalizers | WIRED | One alphabet pipeline. |
| `wordlist.ts` | `wordlist/eff-large.ts` | WIRED | Literal dynamic import only; not in the barrel. |
| `lib/password` | analytics redaction | WIRED | Regression test over `PASSWORD_URL_KEYS`; allow-list unchanged. |

### Data-Flow Trace (Level 4)

Not applicable: library only; no UI renders data in this phase. (Later phases 13/14 consume the library.)

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Library + analytics tests | `npx vitest run lib/password lib/analytics` | 12 files, 399 tests passed | PASS |
| Full unit suite (orchestrator-reported, not re-run by me) | `npx vitest run` | 79 files, 1449 tests passed | accepted as reported |
| No `Math.random` in non-test sources | grep over `lib/password` | no matches | PASS |
| Wordlist integrity | node parse of `eff-large.ts` | 7776 / 7776 unique / abacus..zoom / hash matches pin | PASS |

### Probe Execution

No probes declared by this phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PWD-04 | 12-01, 12-02, 12-03, 12-04, 12-05 (all declare `requirements: [PWD-04]`) | Every generated password contains at least one char from each enabled set without biasing the distribution (whole-password rejection resampling) | SATISFIED | `generate.ts` resampling, fast-check property, no-patch test. REQUIREMENTS.md line 34 `[x]`, traceability row "PWD-04 | Phase 12 | Complete". |

Orphaned requirements: none. REQUIREMENTS.md maps only PWD-04 to Phase 12 (the note at line 134 confirms the other password IDs belong to Phases 13/14).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| lib/password/* and scripts/generate-eff-wordlist.mjs | - | TBD/FIXME/XXX | none found | - |

### Coincidental Reliance (advisory)

None flagged.

### Human Verification Required

None. The only human item (EFF licence wording) was passed in 12-UAT.md.

### Gaps Summary

No gaps. All five roadmap success criteria are verified against current code and tests, PWD-04 is satisfied, and the former human item is resolved. The 13-03 and 14-01 extensions to `boundaries.test.ts` are green and do not weaken the guard.

---

_Verified: 2026-11-12T14:20:00Z_
_Verifier: Claude (gsd-verifier)_
