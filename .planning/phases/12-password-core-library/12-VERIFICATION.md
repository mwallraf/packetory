---
phase: 12-password-core-library
verified: 2026-11-11T22:40:00Z
status: human_needed
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
covered_digest: "v4:sha256:31ac3690ba7d3873a7079bb5d6837bdb92a86b0bd3886c4b36874abbc7355124"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Read the licence header at the top of lib/password/wordlist/eff-large.ts and the EFF pages it links (https://www.eff.org/copyright, https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases)"
    expected: "The attribution wording is acceptable: EFF credited under CC BY, both EFF pages linked, 'Changes: none to the words' stated, and both CC BY 4.0 International and CC BY 3.0 US named (eff.org/copyright is internally inconsistent about the version)"
    why_human: "12-04 must_haves truth with verification: backstop. Licence wording is a legal/judgment call that tests cannot decide. Deferred by the user to the batched UAT after Phase 14. human_needed, not passed."
---

# Phase 12: Password Core Library Verification Report

**Phase Goal:** The password tool's correctness and privacy guarantees exist, and are proven, in a framework-agnostic `lib/password` before any UI is built (unbiased CSPRNG passwords and passphrases, entropy and crack-time figures derived from settings, a URL options codec safe against hostile input).
**Verified:** 2026-11-11T22:40:00Z
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Over the full option space, every password has the requested length, at least one char of every enabled set, and only pool chars; one-of-each by whole-password resampling with a bounded retry count, never patching | VERIFIED | `generate.ts`: each candidate is `pool[randomInt(pool.length)]` x length, accepted only if `seen === fullMask`, else the whole candidate is discarded; loop bounded by `MAX_GENERATION_ATTEMPTS` (10,000) then throws `GenerationExhaustedError`. No shuffle or position patching exists. `generate.test.ts:76` is a fast-check `test.prop` "PWD-04 property" plus resampling, no-patch and exhaustion tests. All pass (393/393 in `lib/password` + `lib/analytics`, re-run by me). |
| 2 | One audited `randomInt` on `crypto.getRandomValues` with rejection sampling; stubbed-RNG boundary tests; no `Math.random` in `lib/password`; no call over 65,536 bytes; typed error with no Web Crypto | VERIFIED | `random.ts`: `limit = 2^32 - (2^32 % n)`, redraw if `r >= limit`; `resolveFill` throws `CryptoUnavailableError` when crypto is absent (no fallback) and `RangeError` if `buf.byteLength > MAX_FILL_BYTES`; each draw is a 4-byte Uint32Array(1). My grep for the Math random member in non-test `lib/password` sources found nothing. `boundaries.test.ts` is the guard (node env, mutant "teeth" tests); `random.test.ts` holds boundary and cap tests. |
| 3 | Symbol normalization (dedupe, printable ASCII, empty restores default); look-alikes `0 O o 1 l I \|` removed before pool size; passphrase 3-20 words, 4 separators, capitalize, append number from vendored unmodified 7,776-word EFF Large; integrity test pins count and hash; CC BY header and generation script; only reachable via memoized dynamic `import()` | VERIFIED (licence wording is human_needed, see below) | `charset.ts` `normalizeSymbols`/`resolveAlphabet`, `LOOK_ALIKES = "0Oo1lI\|"`. I independently parsed `eff-large.ts`: 7776 words, 7776 unique, first `abacus`, last `zoom`, SHA-256 of the word string equals the pinned `c523ba7b...3675`. `scripts/generate-eff-wordlist.mjs` exists; the CC BY header is present. `passphrase.ts` clamps via `normalizePassphraseOptions`, rejects non-7776 lists before any draw. The only reference to `eff-large` outside tests/the file itself is the literal `import("./wordlist/eff-large")` in `wordlist.ts` (memoized, retry-on-failure); the barrel does not export `loadWordlist`. |
| 4 | Entropy from options only; default = pool 85, about 128 bits; 6 words = 6 x log2(7776) = 77.5, plus log2(10) with number; labels switch at 40/75/100; crack time in log space for 1e10 and slow scenarios, no overflow at 128 chars | VERIFIED | `entropy.ts`: exact BigInt inclusion-exclusion, `log2Big` avoids double overflow, no function takes a generated string. `passphraseEntropyBits` = `words * BITS_PER_WORD + log2(10)`. `strengthLevel` uses `>=` against `STRENGTH_THRESHOLDS` (40/75/100) on raw bits. `crack-time.ts` is pure log10 arithmetic; `GUESS_RATES = {fast: 1e10, slow: 1e4}`. `entropy.test.ts` contains the 128.0598 / 77.5489 / 80.8708 fixtures plus fast-check properties; passing. |
| 5 | URL codec round-trips valid option sets; clamps/drops hostile params; no field can carry generated output; redaction regression proves password params never reach analytics, allow-list unchanged | VERIFIED | `url-state.ts`: whitelisted `PASSWORD_URL_KEYS`, `MAX_SEARCH_LENGTH` 2048, `sym` capped at 64 decoded chars, fresh candidate literal (no `__proto__` copy), result always passes through `normalizeToolOptions`; `serializeOptions` accepts only `ToolOptions`. `url-state.test.ts` has fast-check round-trip/idempotence/totality properties (8 `fc.assert`). `lib/analytics/redact.test.ts:102` is the PASSWORD regression; `lib/analytics/redact.ts` unchanged. |

**Score:** 5/5 roadmap criteria verified; 0 behavior-unverified. One PLAN-level backstop truth (12-04 licence wording) is human_needed.

### Plan-level Backstop Truth (12-04, `verification: backstop`)

| Truth | Status | Evidence |
|-------|--------|----------|
| EFF CC BY licence-header wording is confirmed by the user | HUMAN_NEEDED | Header text exists and names EFF, CC BY 4.0 and 3.0 US with URLs, "Changes: none to the words". Acceptability of the wording is a legal judgment; no automated evidence qualifies. The user chose to batch this to the UAT after Phase 14. |

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `lib/password/{random,charset,generate,entropy,crack-time,passphrase,wordlist,url-state,constants,errors,types,index}.ts` | VERIFIED | All exist, substantive, wired together via the barrel. |
| `lib/password/wordlist/eff-large.ts` | VERIFIED | 7,776 words, hash matches pin, header present. |
| `scripts/generate-eff-wordlist.mjs` | VERIFIED | Present; the render-equality test is in `wordlist.test.ts`. |
| `lib/password/boundaries.test.ts`, `nyquist.test.ts`, `index.test.ts` | VERIFIED | Present and passing. |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `generate.ts` / `passphrase.ts` | `random.ts` `randomInt` | WIRED | All sampling goes through `randomInt`. |
| `entropy.ts` / `generate.ts` / `url-state.ts` | `charset.ts` `resolveAlphabet` / normalizers | WIRED | One alphabet pipeline. |
| `wordlist.ts` | `wordlist/eff-large.ts` | WIRED | Literal dynamic import only; not in barrel. |
| `lib/password` | analytics redaction | WIRED | Regression test; allow-list `[]`. |

### Data-Flow Trace (Level 4)

Not applicable: no UI renders data in this phase (library only, UI is Phase 13/14).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Library + analytics unit tests | `npx vitest run lib/password lib/analytics` | 12 files, 393 tests passed | PASS |
| No `Math.random` in non-test sources | grep over `lib/password` | no matches | PASS |
| Wordlist integrity | node parse of `eff-large.ts` | 7776 / 7776 unique / abacus..zoom / hash matches pin | PASS |
| Full gate (orchestrator-reported, not re-run by me) | typecheck, lint, vitest 1122, e2e 163, e2e:prod 13 | reported clean | accepted as reported |

### Probe Execution

No probes declared by this phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PWD-04 | 12-01 (and plans 02-05 reference its guarantees) | Every generated password contains at least one char from each enabled set without biasing the distribution (whole-password rejection resampling) | SATISFIED | `generate.ts` resampling, SC-1 property test, entropy tied to uniform-over-valid distribution. REQUIREMENTS.md marks PWD-04 Complete / Phase 12. |

No orphaned requirements: REQUIREMENTS.md maps only PWD-04 to Phase 12 (traceability note confirms the other IDs belong to Phases 13/14).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| lib/password/* (non-test) | - | TBD/FIXME/XXX debt markers | none found | - |

Code review (12-REVIEW.md) had 2 warnings, both fixed (8f4f6c8 CAP_YEARS constant, b3ae49a vacuous assertion); the fixed code is in place and the tests pass. The WR-01 threshold-logic change is covered by the existing crack-time tests (passing); no behavior-dependent truth depends on it beyond those.

### Coincidental Reliance (advisory)

None flagged.

### Human Verification Required

#### 1. EFF CC BY licence wording

**Test:** Read the header of `lib/password/wordlist/eff-large.ts` and the two linked EFF pages.
**Expected:** The attribution (EFF credited, CC BY, both 4.0 International and 3.0 US named, both EFF pages linked, "unmodified" stated) is acceptable to the project owner.
**Why human:** Licence wording is a legal/judgment backstop truth (12-04); tests cannot decide it. Deferred to the batched UAT after Phase 14 at the user's request.

### Gaps Summary

No gaps. All five roadmap success criteria are verified against the code and tests. The overall status is `human_needed` solely because of the 12-04 licence-wording backstop, which is reported as unconfirmed rather than passed.

---

_Verified: 2026-11-11T22:40:00Z_
_Verifier: Claude (gsd-verifier)_
