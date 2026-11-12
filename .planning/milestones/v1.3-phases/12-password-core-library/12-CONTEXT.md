# Phase 12: Password Core Library - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a framework-agnostic `lib/password/` module (no React or Next imports), proven by Vitest and fast-check, that the Phase 13–14 UI only wires up and renders. No page, route, registry entry, nav entry or UI ships in this phase. It contains:

- one audited CSPRNG primitive (`randomInt` on `crypto.getRandomValues` with rejection sampling and an injectable `fill` seam)
- the alphabet model: character sets, symbol-set normalization, look-alike filtering
- unbiased password generation: whole-password rejection resampling for the one-of-each-set rule
- passphrase generation over the vendored, unmodified 7,776-word EFF Large list, loaded through a memoized dynamic `import()`
- entropy, strength label and crack-time maths computed from options and the resolved alphabet only
- exported constants that the Phase 14 FAQ and worked example import instead of restating numbers
- a total, hostile-input-safe URL options codec, plus an analytics redaction regression test

Requirement owned: PWD-04. Library guarantees behind PWD-07 and POUT-03 (shown to users in Phase 13) and behind PHR-01..03 and STR-01..04 (shown to users in Phase 14). Success criteria are in `.planning/ROADMAP.md` (Phase 12).

**Already locked at milestone level (do not reopen):**
- EFF Large Wordlist kept unmodified (7,776 words), with an FAQ note on its 4 hyphenated words.
- Bounds: length 4–128 (default 20), words 3–20 (default 6), batch 1–20. Each has one shared constant used by both the UI and the URL parser.
- Strength is entropy-based and computed from settings (no zxcvbn).
- Generated output never goes into the URL, analytics, a `#fragment` or storage.
- No Radix for disclosures (not relevant to this phase).
- No new runtime or dev dependencies. The user later relaxed this to "pick what's optimal". This phase still needs none; see D-25.

</domain>

<decisions>
## Implementation Decisions

### Randomness engine & password generation
- **D-01:** All randomness flows through one function, `randomInt(maxExclusive, fill?)` in `lib/password/random.ts`. It draws Uint32 values and uses rejection sampling: `limit = 2^32 - (2^32 % n)`, and it redraws while `r >= limit`. It is the only file allowed to reference `getRandomValues`, and the only place a random value is reduced with `%`. Password characters, word picks and the appended digit all go through it. There is no shuffle anywhere, because the design never needs one (D-03).
- **D-02:** The RNG seam is `type RandomFill = (buf: Uint32Array) => Uint32Array`. The default is resolved at call time, not at import time, as `globalThis.crypto?.getRandomValues?.bind(globalThis.crypto)`, so tests can delete Web Crypto after import. If it is absent, the call throws a typed `CryptoUnavailableError` (an exported class with a stable `name`). There is never a fallback. Every generator takes an optional `{ fill }` so Phase 13–14 UI tests can be deterministic. A wrapper asserts that each `fill` call requests at most 65,536 bytes. Draws are sized per attempt (at most 128 values = 512 bytes) plus refills on rejection, so the cap is never close, and a test proves the wrapper throws on an oversized request.
- **D-03:** The one-of-each-enabled-set rule uses whole-password rejection resampling. The library draws L characters uniformly from the resolved pool and accepts the result only if every enabled set is present; otherwise it redraws the whole password. It never patches positions or uses pick-required-then-shuffle. The retry bound is `MAX_GENERATION_ATTEMPTS = 10_000`. The worst-case acceptance rate (L=4, all four sets, a 1-character custom symbol set) is about 1%, so the failure probability at 10,000 attempts is about e^-100. A test computes that worst-case acceptance rate analytically and asserts it stays at or above 0.5%. Exhaustion throws a typed `GenerationExhaustedError`; it never returns a non-compliant password.
- **D-04:** Public API: `generatePassword(opts, { fill }?) → string` and `generateBatch(opts, count, { fill }?) → string[]`. `count` is clamped to `BATCH_MIN..BATCH_MAX` in the total, NaN-safe style of `lib/uuid/generate.ts`. Option objects are re-normalized inside the library (it does not trust its caller). Generation runs only when called: nothing self-seeds or generates at import time (this is the SSR-leak guard that the Phase 13 page relies on).
- **D-05:** Source-guard tests follow the pattern of `lib/hash/boundaries.test.ts` (`// @vitest-environment node`, pure `analyze(sources)` checks plus in-memory mutation cases that prove the guard has teeth). They fail if `Math.random` appears anywhere under `lib/password/`, if `getRandomValues` appears outside `random.ts`, or if `wordlist/eff-large` is imported anywhere except by dynamic `import()` in `wordlist.ts`. The walk is written so that Phase 13 can extend it to `app/tools/password/` without restructuring.

### Alphabet & symbol rules
- **D-06:** Fixed sets are `A–Z` (26), `a–z` (26) and `0–9` (10). `DEFAULT_SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?"` (23), so the default pool is 85. Both counts are exported as constants, together with `DEFAULT_POOL_SIZE = 85`, and the counts are asserted in tests so the FAQ and the STR-02 line can never drift. The requirement text already says 85; the STATE.md concern is resolved by sourcing every displayed number from these constants.
- **D-07:** `normalizeSymbols(input)` keeps only printable, non-alphanumeric ASCII (0x21–0x7E minus `[A-Za-z0-9]`, so no space), dedupes while keeping first-seen order, and caps the result at the 32 such characters that exist. An empty result restores `DEFAULT_SYMBOLS`. **Narrower than PWD-05's literal "printable ASCII only":** letters and digits are excluded from the symbol set so that the four sets stay disjoint. Disjoint sets keep the one-of-each check, pool size and exact entropy (D-15) correct without cross-set dedupe rules. The UI editor and the URL parser both call this one function.
- **D-08:** `resolveAlphabet(opts) → { sets: string[] (enabled, filtered, non-empty), pool: string, poolSize }` is the single pipeline. Generation and entropy both consume only its output, and nothing reads `opts.symbols` after this step. Look-alike filtering removes `LOOK_ALIKES = "0Oo1lI|"` (exported) before the pool size is computed. With the defaults that gives 85 → 79.
- **D-09:** Edge cases:
  - All four sets disabled: the library defensively re-enables all four, matching the UI rule that the last set can't be turned off.
  - Look-alike filtering empties a custom symbol set (for example, the set `|`): the set falls back to `DEFAULT_SYMBOLS` minus look-alikes, the same "empty restores default" rule as D-07.
  - The upper, lower and digit sets can never become empty, so the pool is never empty.

### Passphrase & wordlist
- **D-10:** The wordlist is vendored as `lib/password/wordlist/eff-large.ts`: a default export of one space-joined string of the 7,776 words, split once on load. It is unmodified, including its 4 hyphenated words. The header comment gives the source URL, retrieval date, SHA-256 and the CC BY attribution. Research flag: verify on eff.org whether the licence is CC BY 3.0 US (expected) or 4.0, and attribute exactly as stated there. There is no `public/` asset and no `fetch`.
- **D-11:** A committed generation script, `scripts/generate-eff-wordlist.mjs`, uses plain Node with no dependencies. It downloads `eff_large_wordlist.txt`, or reads a local copy passed as an argument. It then checks the dice-index format and that there are exactly 7,776 unique entries, strips the indices, and writes `eff-large.ts` with the header. It is run manually, never in CI or the build.
- **D-12:** `wordlist.test.ts` (node environment) pins:
  - the word count, which must equal `EFF_WORD_COUNT = 7776`
  - uniqueness
  - the `[a-z-]+` charset
  - exactly 4 hyphenated words, listed explicitly
  - the SHA-256 of the joined string, computed with `node:crypto` and asserted against a pinned constant

  `loadWordlist()` returns a memoized module-level promise of `import("./wordlist/eff-large")`. A failed import clears the memo so a later retry can succeed, which PHR-03's Retry depends on. It never falls back to another list.
- **D-13:** `generatePassphrase(opts, words, { fill }?)` is synchronous and takes the loaded list as a parameter. It asserts `words.length === EFF_WORD_COUNT` and throws otherwise. It samples words uniformly with replacement via `randomInt(7776)`. The separator is one of the tokens `-` `_` `.` and space. Capitalize uppercases the first letter of every word, which is deterministic and adds 0 bits (`t-shirt` becomes `T-shirt`). Append number adds one random digit 0–9 to the end of the last word (`…-Battery7`). This adds exactly log2(10), matching the success criterion. The digit's position is fixed so it adds no positional entropy. A batch variant clamps its count like D-04.

### Entropy, strength & crack time
- **D-14:** Entropy is computed from options and the resolved alphabet only. The functions are `passwordEntropyBits(opts)` and `passphraseEntropyBits(opts)`, and neither accepts an output string. Passphrase entropy is `words × log2(EFF_WORD_COUNT)`, plus `log2(10)` when a number is appended. Capitalization and the separator add 0. The constant is used instead of the loaded list's length so the meter can render before the list loads; the integrity test (D-12) guarantees the two are equal.
- **D-15:** Password entropy is exact for the uniform-over-valid-strings distribution that D-03 produces: `log2(Σ_{S⊆enabled} (-1)^|S| · (N − |∪S|)^L)` by inclusion–exclusion. It is computed in BigInt (target ES2020 supports BigInt), with log2 taken from the bit length plus the top 53 bits. At the default it is about 128.06 bits. At L=4 it is honestly lower than `L·log2(N)`, and it never yields `NaN` or `Infinity` at L=128. `poolSize` is reported separately for the STR-02 line.
- **D-16:** `STRENGTH_THRESHOLDS = { fair: 40, strong: 75, veryStrong: 100 }` are exported. `strengthLevel(bits)` uses the raw value with `>=` comparisons, so 39.999 is Weak and 40 is Fair. `formatBits(bits)` floors to a whole number ("128 bits", "77 bits"). Because the label uses the raw value and the display floors it, a floored display of 75 or more always means a label of Strong or higher. Tests cover the exact boundaries and this display/label consistency.
- **D-17:** `GUESS_RATES = { fast: 1e10, slow: 1e4 }` are guesses per second, exported with their labels. Fast is an offline fast hash at 10 billion guesses per second. Slow is bcrypt-style: about cost 10 on a single modern GPU, 10 thousand guesses per second. `crackTimeLog10Seconds(bits, rate) = (bits − 1)·log10(2) − log10(rate)` is the average case, half the keyspace, computed in log space so 128 characters never overflow. `formatCrackTime(log10s)` returns:
  - "less than a second"
  - whole seconds, minutes, hours, days or years
  - years with thousand, million, billion or trillion suffixes
  - "more than a trillion years" above that

  It is a pure function, so the FAQ and the UI share it.
- **D-18:** Every number the FAQ or worked example needs is exported, so Phase 14 imports them instead of restating them: bounds, defaults, set sizes, the default pool, look-alikes, thresholds, guess rates, `EFF_WORD_COUNT`, `BITS_PER_WORD` and the hyphenated-word count.

### URL options codec & privacy guards
- **D-19:** `lib/password/url-state.ts` exports `parseOptions(search: string): ToolOptions` and `serializeOptions(opts: ToolOptions): string`.
  - `parseOptions` is total: it never throws, and it returns defaults for anything malformed.
  - `serializeOptions` takes only the typed options object, omits default-valued params (the default URL stays `/tools/password`), and emits keys in a fixed order.
  - Both are pure. Writing `history.replaceState` stays in Phase 13.
- **D-20:** The whitelisted short keys are `mode`, `len`, `u`, `l`, `d`, `s`, `sym`, `amb`, `words`, `sep`, `cap`, `num` and `n`, exported as `PASSWORD_URL_KEYS`. Their values:
  - `mode` is `password` or `passphrase`.
  - Booleans are `1` or `0`.
  - `sep` uses the named tokens `dash`, `underscore`, `dot` and `space`, so a space is never encoded as `+` or `%20`.

  All options are serialized regardless of mode, so toggling modes keeps them. Unknown keys are ignored, and for duplicate keys the first one wins (`URLSearchParams.get`).
- **D-21:** Hostile-input rules:
  - Numbers must match `^\d{1,4}$` and are then clamped to the shared bounds (`len=999` → 128, `len=1` → 4). Malformed values (`20abc`, `-5`, `1e3`, empty) fall back to the default.
  - `sym` longer than 64 raw characters is dropped to the default; otherwise it goes through `normalizeSymbols`, which drops non-ASCII and alphanumeric characters and restores the default when empty.
  - All set flags off → all sets on.
  - A search string over 2,048 characters is ignored entirely and defaults are returned.
- **D-22:** Tests:
  - A fast-check round-trip property: `parseOptions(serializeOptions(o))` deep-equals `o` for every valid option set.
  - An arbitrary-string property: `parseOptions` never throws, and its result always sits within the bounds.
  - A type-level `@ts-expect-error` check plus a test that serialized keys are a subset of `PASSWORD_URL_KEYS`. Together these show that no field can carry generated output; `sym` holds only normalized user-chosen symbols of 32 characters or fewer.
- **D-23:** The analytics regression follows the MAC-10 and HASH-TEXT precedent in `lib/analytics/redact.test.ts`. It asserts that no entry of `PASSWORD_URL_KEYS` is in `DEFAULT_ALLOW_LIST`, and that `redactParams(serializeOptions(nonDefaultOptions))` returns `{}`. Nothing is added to the allow-list. `redactBeforeSend` stays private in `PacketoryAnalytics.tsx`; there is no refactor.

### Claude's Discretion
- Exact file split inside `lib/password/`. The suggested layout is `types.ts`, `constants.ts`, `random.ts`, `charset.ts`, `generate.ts`, `passphrase.ts`, `entropy.ts`, `crack-time.ts`, `url-state.ts`, `wordlist.ts`, `wordlist/eff-large.ts` and `errors.ts`, with sibling `*.test.ts` files and an `index.ts` barrel that does not re-export the wordlist module.
- Internal BigInt-to-log2 helper details, test naming, and how fast-check arbitraries are composed.
- Wording of the `formatCrackTime` output, within the buckets in D-17.
- **D-24 (measurement):** Measure the wordlist chunk's gzip size (about 24.5 KB expected) in a production build and record it in the SUMMARY. It is informational and does not gate the phase.
- **D-25 (dependencies):** The library stays dependency-free. Web Crypto, BigInt, `node:crypto` in tests, and the existing Vitest and fast-check cover everything; no library is clearly better here.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@fast-check/vitest` `it.prop` / `fc` usage, as in `lib/uuid/generate.test.ts` and the `lib/subnet/*.test.ts` files: the pattern for the generation, alphabet and codec properties.
- `lib/hash/boundaries.test.ts`: a pure `analyze(sources)` source-guard with in-memory mutation cases, run in the node environment. This is the template for the `Math.random`, `getRandomValues` and wordlist-import guards (D-05).
- `lib/analytics/redact.ts` (`DEFAULT_ALLOW_LIST = []`, `redactParams`) and `redact.test.ts`, which already has the MAC-10 and HASH-TEXT regressions. The password regression (D-23) goes beside them.
- `lib/uuid/generate.ts`: the total, NaN-safe clamping style for batch counts.

### Established Patterns
- `lib/<tool>/` modules are framework-agnostic with a sibling `*.test.ts` per module. Vitest's default environment is jsdom (`vitest.config.ts`); file-reading tests opt into `// @vitest-environment node`.
- URL state is written with raw `window.history.replaceState`, never `router.replace` (see `app/tools/subnet/SubnetTool.tsx`). The codec here stays pure; the Phase 13 island does the writing.
- Analytics strips every query param by default (`PacketoryAnalytics.tsx` → `redactBeforeSend`). URL fragments are not redacted, so password state must never use `#`.
- `tsconfig.json` targets ES2020, so BigInt is available. There is no `scripts/` directory yet; D-11 creates it.

### Integration Points
- Phase 13 `PasswordTool.tsx` imports `generatePassword`, `generateBatch`, `parseOptions`, `serializeOptions`, the bounds constants and the error classes, and catches `CryptoUnavailableError` to show the PWD-07 error.
- Phase 14 imports `loadWordlist`, `generatePassphrase`, the entropy and strength functions, `formatCrackTime` and the FAQ constants, and adds a sequence-token guard around `loadWordlist`.
- `lib/analytics/redact.test.ts` imports `PASSWORD_URL_KEYS` and `serializeOptions` from `lib/password`.

</code_context>

<specifics>
## Specific Ideas

- Planner inputs: `.planning/research/ARCHITECTURE.md` §4 (module layout, wordlist loading) and `.planning/research/PITFALLS.md` Pitfalls 2, 3, 5 and 7 (modulo bias, overstated entropy, leaks, wordlist).
- Stubbed-RNG boundary tests for `randomInt(n)` with n = 85, 94 and 7776: `limit − 1` is accepted, while `limit` and `2^32 − 1` are rejected and trigger a redraw. These are deterministic, with no statistical chi-square that could make CI flaky.
- Success-criterion numbers the tests must hit on raw (unrounded) values:
  - default password: pool 85, about 128 bits
  - 6-word passphrase: ≈ 77.55 bits, or ≈ 80.87 bits with a number appended
  - label boundaries exactly at 40, 75 and 100

</specifics>

<deferred>
## Deferred Ideas

- Extracting `redactBeforeSend` into `lib/analytics/redact.ts` so it can be tested at event level, and redacting `#fragment`s. This is existing accepted tech debt and stays out of this phase.
- EFF short wordlists, pronounceable passwords, "no repeated characters" and "exclude sequences" options. These are not in v1.3 scope.
- A random position for the appended digit or a multi-digit number, which would change the locked log2(10) entropy figure.

</deferred>

## Auto-accepted proposals (review later)

The user asked for minimal interaction, so every Recommended answer was accepted automatically. Alternatives are recorded so they can be revisited.

### Grey Area 1/4: Randomness engine & password generation

| # | Question | Recommended (accepted) | Alternative(s) |
|---|----------|------------------------|-----------------|
| 1 | What sampling primitive should be used? | Uint32 rejection sampling, `limit = 2^32 − (2^32 % n)`, in one `randomInt`. It is simple, provably unbiased and easy to audit (Pitfall 2). | Bitmask-and-reject (draw `ceil(log2 n)` bits); Uint8 rejection (more redraws for n > 128, so it doesn't suit 7776) |
| 2 | What shape should the RNG seam and fallback take? | Injectable `fill(Uint32Array)`, resolved at call time; a typed `CryptoUnavailableError`; no fallback; each call asserted to stay at or below 65,536 bytes. This satisfies SC-2 and the research flag. | A module-level RNG set once at import (can't be stubbed after import); a buffered pre-drawn pool (keeps random bytes in memory longer) |
| 3 | How is the one-of-each rule enforced, and with what retry bound? | Whole-password resampling, 10,000 attempts, then `GenerationExhaustedError`. The worst case of about 1% acceptance gives a failure chance of about e^-100. | A 1,000-attempt bound (about 4e-5 failure in the worst case, which is too high); computing the acceptance probability and refusing configurations |
| 4 | What API shape should generation have? | Synchronous `generatePassword` / `generateBatch(opts, count, { fill })`, with total clamping and no import-time generation. | Async API (no benefit, since Web Crypto is synchronous); a generator/iterator for batches |
| 5 | How is `Math.random` guarded? | A Vitest source-grep guard in the `lib/hash/boundaries.test.ts` style, also covering `getRandomValues` placement and the wordlist import. | An ESLint `no-restricted-properties` rule (lint config change; Phase 13 may add it as a second layer) |

### Grey Area 2/4: Alphabet & symbol rules

| # | Question | Recommended (accepted) | Alternative(s) |
|---|----------|------------------------|-----------------|
| 1 | Which characters may a custom symbol set contain? | Printable non-alphanumeric ASCII 0x21–0x7E only (no space or letters). This keeps the sets disjoint. **Narrower than PWD-05's literal "printable ASCII".** | Any printable ASCII with cross-set dedupe (complicates the one-of-each check and exact entropy); also allowing space (trailing-space copy hazards) |
| 2 | What is the order and cap for normalization? | Filter, then dedupe (first-seen order), then cap at 32 (all such characters), with an empty result restoring the default. One function serves the UI and the URL parser. | Sort the set canonically (changes what the user typed); a lower cap such as 24 |
| 3 | What happens when look-alike filtering empties the symbol set? | Fall back to the default symbols minus look-alikes, the same "empty restores default" rule. | Treat symbols as disabled (could leave zero enabled sets); surface an error state |
| 4 | Where are pool constants sourced from? | Exported `DEFAULT_SYMBOLS`, set sizes and `DEFAULT_POOL_SIZE = 85`, asserted in tests. Resolves the STATE.md STR-02 concern. | Compute only at runtime (the FAQ couldn't import a static number) |

### Grey Area 3/4: Passphrase & wordlist

| # | Question | Recommended (accepted) | Alternative(s) |
|---|----------|------------------------|-----------------|
| 1 | What format should the vendored list use? | One space-joined string as the default export of a TS module, split once. It is smaller and parses faster than an array literal (ARCHITECTURE §4.3). | A JSON array module; a newline-joined `.txt` with a raw loader (needs bundler config) |
| 2 | How is integrity pinned? | Count, uniqueness, `[a-z-]+`, the exact 4 hyphenated words, and a pinned SHA-256 via `node:crypto`. Generation script: `scripts/generate-eff-wordlist.mjs`, plain Node, run manually. | Count-only test (fails to catch silent edits); running the script in CI (network flake, unnecessary since the list is static) |
| 3 | How is the wordlist loaded and retried? | A memoized dynamic `import()` promise, with the memo cleared on failure so Retry works. There is never a fallback list. | Permanent memo, failures included (Retry would never recover); prefetch on idle (rejected by research for Password-mode visitors) |
| 4 | What exactly does append number do? | One random digit 0–9 appended to the end of the last word (+log2(10), matching SC-4). Capitalize = first letter of every word (+0). | A digit as its own separated token; a digit in a random word (adds positional entropy and breaks the stated figure); 2 digits |
| 5 | Is the passphrase generator synchronous or asynchronous? | Synchronous, taking the loaded list as a parameter and asserting the length is 7776. Loading stays separate in `loadWordlist`. | An async generator that loads internally (harder to test and to guard against stale results) |

### Grey Area 4/4: Entropy, strength, crack time & URL codec

| # | Question | Recommended (accepted) | Alternative(s) |
|---|----------|------------------------|-----------------|
| 1 | How is password entropy computed? | Exact inclusion–exclusion in BigInt, because it matches the uniform-over-valid distribution: about 128.06 at the default, and honest at L=4. **Departs from the research suggestion of `L·log2(N)`, not from any requirement.** | `L·log2(N)` labelled "up to" (overstates by about 3.8 bits at L=4 with all sets) |
| 2 | How are bits rounded against the labels? | Label from raw bits (`>=` 40/75/100); display floored to whole bits ("77 bits"). The two are provably consistent. **SC-4's "about 77.5" holds for the raw value; the UI shows 77.** | Display with one decimal floored ("77.5 bits"); round to nearest (could show "75 bits · Fair") |
| 3 | What is the slow-hash rate, and is crack time average or worst case? | 1e4 guesses/s ("bcrypt-style, cost about 10, one GPU"); average case = half the keyspace; log space; capped at "more than a trillion years". | 1e5 guesses/s; the worst case (full keyspace); scientific notation for huge values |
| 4 | Which URL keys and encoding? | The short whitelisted keys `mode,len,u,l,d,s,sym,amb,words,sep,cap,num,n`; booleans `1`/`0`; named `sep` tokens; defaults omitted; all options serialized regardless of mode. | Long readable keys (`length`, `symbols`…); raw separator characters (space encoding issues); serializing only the active mode's options |
| 5 | How does the codec handle hostile input? | Strict `^\d{1,4}$` then clamp; malformed values fall back to the default; `sym` over 64 characters falls back to the default, otherwise it is normalized; search strings over 2,048 characters are ignored; all sets off means all sets on. | Truncate oversized `sym` instead of dropping it; `parseInt` leniency (`20abc` → 20) |
| 6 | Where does the analytics regression live? | A `redactParams`-level test in `redact.test.ts` (MAC-10 / HASH-TEXT precedent) using `PASSWORD_URL_KEYS`; the allow-list is unchanged. | Extract `redactBeforeSend` into `redact.ts` and test at event level (a refactor outside this phase's scope) |
