---
phase: 12-password-core-library
reviewed: 2026-11-11T22:10:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - lib/password/types.ts
  - lib/password/constants.ts
  - lib/password/errors.ts
  - lib/password/random.ts
  - lib/password/charset.ts
  - lib/password/generate.ts
  - lib/password/entropy.ts
  - lib/password/crack-time.ts
  - lib/password/wordlist.ts
  - lib/password/passphrase.ts
  - lib/password/url-state.ts
  - lib/password/index.ts
  - lib/password/test-utils.ts
  - lib/password/boundaries.test.ts
  - lib/password/generate.test.ts
  - lib/password/random.test.ts
  - lib/password/charset.test.ts
  - lib/password/entropy.test.ts
  - lib/password/crack-time.test.ts
  - lib/password/wordlist.test.ts
  - lib/password/passphrase.test.ts
  - lib/password/url-state.test.ts
  - lib/password/index.test.ts
  - lib/analytics/redact.test.ts
  - scripts/generate-eff-wordlist.mjs
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
  necessity: 2
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-11-11T22:10:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Reviewed the whole `lib/password/` library, its tests, the analytics regression and the wordlist generation script. The generated `lib/password/wordlist/eff-large.ts` was checked only for its header and export shape (a documented header, a single default-exported string, no other exports).

Verification run: `vitest run lib/password lib/analytics` passes (12 files, 393 tests). `tsc --noEmit` and `eslint` on the reviewed paths report nothing. `npm run typecheck` is a CI job, so the `@ts-expect-error` directives in `url-state.test.ts` and `entropy.test.ts` are enforced there.

The areas named in the brief were traced by hand and are sound:

- **CSPRNG sampling (`random.ts`).** `limit = 2^32 - (2^32 % n)` is computed in exact double arithmetic (every operand is at most 2^32). The accept test is strict `r < limit`. `n = 2^32` gives `limit = 2^32`, which accepts everything and is correct. `n = 1` is correct. The 1,000-redraw ceiling is unreachable for a uniform source (worst case is a 50% per-draw rejection rate, so 2^-1000). Web Crypto is resolved at call time and bound. The caller-supplied `fill` is wrapped by the byte cap, and the result is read from the array the fill returns. Nothing falls back to a weaker source.
- **Password generation (`generate.ts`).** Whole-password resampling with a disjoint-set bitmask is uniform over valid strings. The four character sets are provably disjoint, because `normalizeSymbols` excludes alphanumerics and look-alike stripping only removes characters. A `1 << sets.length` mask is safe at 4 sets. The worst-case acceptance rate (L=4, four sets, a one-character symbol set) is 1.03%, so exhausting 10,000 attempts is about e^-100. The invariant `LENGTH_MIN (4) >= max enabled sets (4)` is what keeps `validPasswordCount` from returning 0n and `log2Big` from throwing. It currently holds.
- **Entropy (`entropy.ts`).** Inclusion-exclusion in BigInt is correct, including the `0n ** L` terms. `log2Big` truncates low bits, so it can only understate, never overstate. Powers of two are exact. L=128 stays finite. The label uses the raw value and the display floors, so they cannot disagree.
- **URL codec (`url-state.ts`).** It is total: nothing throws (`URLSearchParams` never throws on a string), the output is built from a fresh literal (no prototype pollution), numbers are ASCII-only `\d{1,4}` then clamped, flags and enums are whitelisted, and `sym` goes through `normalizeSymbols`. `serializeOptions` re-normalizes its input. Round trip and idempotence hold: a custom symbol set is encoded with percent-escapes for `&`, `#`, `+` and `%`, and the maximal serialization stays under 2,048 characters.
- **Error paths.** No error carries generated or candidate characters. `GenerationExhaustedError` carries only a count. `CryptoUnavailableError` is thrown with no fallback.

No security vulnerabilities and no incorrect behavior were found. The findings below are one necessity warning, one test-soundness warning, and minor quality or robustness items.

## Warnings

### WR-01: `formatCrackTime` cap guard is redundant and disagrees with the cap it names

**Category:** necessity
**File:** `lib/password/crack-time.ts:28-37`
**Issue:** `CAP_LOG10_SECONDS = 13 + log10(SECONDS_PER_YEAR)` encodes a 10^13 year threshold, but the string is "more than a trillion years" (10^12) and the real cut-off is the later `if (y >= 1e12) return CAP` at line 44. The early `if (log10Seconds >= CAP_LOG10_SECONDS)` branch is subsumed by it.

Evidence that the early branch is unnecessary: with it removed, `Infinity` flows through `10 ** Infinity = Infinity`, then `roundSig12(Infinity)` is `Number("Infinity")` (still `Infinity`), none of the `< 60 / 3600 / 86400 / SECONDS_PER_YEAR` comparisons hold, `y = Infinity`, and `y >= 1e12` returns `CAP`. The same path handles every finite value in `[1e12, 1e13)` years. `10 ** x` only overflows past about 308, which also becomes `Infinity` and takes the same path. So the guard guards against an impossible state, and its "13" is a second, conflicting statement of the cap (a maintainer changing one threshold will not change the other). The test `["1e6", 1e6, ...]` and `["log10(1e12 years)", ...]` pass either way.
**Fix:** Delete `CAP_LOG10_SECONDS` and the early branch, and keep the single `y >= 1e12` check. Or derive both from one `CAP_YEARS = 1e12` constant.
```ts
// remove lines 29 and 35-37; keep:
const s = roundSig12(10 ** log10Seconds);
// ...
if (y >= CAP_YEARS) return CAP;
```

### WR-02: `serializeOptions accepts only ToolOptions` runtime assertion is vacuous

**Category:** test soundness
**File:** `lib/password/url-state.test.ts:285-294`
**Issue:** Both `expect(() => {...}).not.toThrow(/never/)` assertions pass whatever the function does. `not.toThrow(/regex/)` only fails if a thrown error message matches `/never/`, and `serializeOptions("hunter2")` and the extra-field call do not throw at all, so the test has nothing to fail on at runtime. The type-level half is real only because of the `@ts-expect-error` directives, which are enforced by `npm run typecheck` (a CI job) and not by Vitest, so a developer running only `npm test` gets a green test that asserts nothing. The surrounding test name claims the property is proven.
**Fix:** Assert something observable. `serializeOptions("hunter2" as never)` should return `""` (as the next test already does for an extra field), so make this test assert the return value and keep the `@ts-expect-error` lines for the compile-time half.
```ts
it("serializeOptions accepts only ToolOptions", () => {
  // @ts-expect-error serializeOptions takes ToolOptions only, never a generated string
  expect(serializeOptions("hunter2")).toBe("");
  // @ts-expect-error excess property: a password field is not part of ToolOptions
  expect(serializeOptions({ ...DEFAULT_OPTIONS, password: "hunter2" })).toBe("");
});
```

## Info

### IN-01: `createWordlistLoader` throws synchronously if a custom importer throws synchronously

**File:** `lib/password/wordlist.ts:20-25`
**Issue:** The header documents "if the import fails, the returned promise rejects ... and the memo is cleared". That holds for the default `import()` (always returns a promise) and for promise-returning importers, but if an injected `importer` throws before returning a promise, `load()` throws synchronously. `memo` stays `null` so a retry works, but a caller using `.catch()` or `await` inside a `try` without a surrounding sync handler would see a different failure mode from the documented one.
**Fix:** Wrap the call so the contract holds for any importer: `const p = Promise.resolve().then(importer).then((m) => Object.freeze(m.default.split(" ")));`. This also costs one microtask.

### IN-02: Wordlist loader returns the list without checking its shape; integrity is only enforced later

**File:** `lib/password/wordlist.ts:24-26`, `lib/password/passphrase.ts:22-27`
**Issue:** `load()` freezes whatever the chunk exports (`m.default.split(" ")`), and `generatePassphrase` only checks `words.length === EFF_WORD_COUNT`. Uniqueness and entry type are not checked at runtime. This is acceptable because the SHA-256 test pins the vendored file, but the entropy figure (`words * log2(7776)`, D-14) depends on 7,776 distinct entries and on the loader being used only with the vendored module. The injectable `importer` and the `words` parameter make that assumption part of the public surface.
**Fix:** No change required for v1. If the loader is ever given a non-vendored importer, validate the count in `load()` and throw `WordlistIntegrityError` so a bad chunk fails at load time (when Phase 14's Retry is shown) rather than on the first Generate.

### IN-03: Barrel exports internal helpers and pins them as public API

**Category:** necessity
**File:** `lib/password/index.ts:11-15`, `lib/password/index.test.ts:51-79`
**Issue:** `export *` publishes `resolveFill`, `clampInt`, `log2Big`, `validPasswordCount` and `acceptanceProbability`, and `index.test.ts` asserts they exist. Within the repo's non-test code none of these has a consumer outside `lib/password/` (`acceptanceProbability` is used only by tests; `resolveFill` only by `random.ts` and tests). CONTEXT.md D-18 asks the barrel to export constants and the Phase 13-14 entry points, not the test-only proof helpers. Evidence: `grep` finds no importer of these names outside `lib/password/*`. The cost is a wider contract that the barrel test will now defend, but there is no runtime defect. This rests on judgment, hence Info.
**Fix:** Either export only the Phase 13-14 surface from the barrel and let the tests import the helpers from their modules, or accept the wider surface and note it in the barrel header.

### IN-04: Duplicated "derived" constants can drift

**File:** `lib/password/constants.ts:32-38, 80`
**Issue:** `UPPERCASE_SIZE`, `LOWERCASE_SIZE`, `DIGITS_SIZE`, `DEFAULT_SYMBOLS_SIZE`, `DEFAULT_POOL_SIZE` and `EFF_HYPHENATED_WORD_COUNT` are hand-typed numbers that restate `.length` of strings and arrays defined a few lines away. They are pinned by `charset.test.ts` and `index.test.ts`, so drift is caught in CI, but each is a second source of truth the tests exist only to police.
**Fix:** Derive them (`export const UPPERCASE_SIZE = UPPERCASE.length;`, `DEFAULT_POOL_SIZE = UPPERCASE_SIZE + LOWERCASE_SIZE + DIGITS_SIZE + DEFAULT_SYMBOLS_SIZE`, `EFF_HYPHENATED_WORD_COUNT = EFF_HYPHENATED_WORDS.length`). The existing literal-value tests can stay as the regression pins.

### IN-05: Source guard in `boundaries.test.ts` cannot see non-literal imports

**File:** `lib/password/boundaries.test.ts:136-138`
**Issue:** `DYNAMIC_SPEC_RE` and `STATIC_SPEC_RE` match only quoted string specifiers. `import(spec)`, `import(\`./wordlist/${x}\`)` and `require(variable)` would reach the vendored list (or `node:crypto`) without being flagged, and `stripComments` does not parse regex literals or nested template expressions. The mutation tests prove the guard works for literal forms, which is the realistic accident, so this is a limitation rather than a defect.
**Fix:** Optionally add a rule that fails on any non-literal `import(` in `lib/password/` so the guard cannot be bypassed accidentally, and mention the limitation in the test's header comment.

### IN-06: Minor test hygiene

**File:** `lib/password/url-state.test.ts:1`, `lib/password/random.test.ts:109-120`, `lib/password/entropy.test.ts:226`
**Issue:**
- `url-state.test.ts` imports `fc` from `"fast-check"` while every other test file in the phase imports it from `"@fast-check/vitest"`.
- The "real Web Crypto refuses requests above 65,536 bytes" test asserts the runtime's exception `name` is `"QuotaExceededError"`, which is Node and jsdom behaviour, not part of this library. A future Node or jsdom change would fail a library test for a reason unrelated to the library.
- `expect(passwordEntropyBits.length).toBe(1)` (`entropy.test.ts:226`) asserts function arity, which proves nothing about the D-14 guarantee that the function takes no output string (the `@ts-expect-error` line below it carries that).

**Fix:** Use the same `fc` import everywhere; loosen the quota test to `.toThrow()` (the point is that the cap exists); drop the arity assertion.

---

_Reviewed: 2026-11-11T22:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
