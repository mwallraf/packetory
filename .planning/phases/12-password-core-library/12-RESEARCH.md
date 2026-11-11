# Phase 12: Password Core Library - Research

**Researched:** 2026-11-11
**Domain:** Framework-agnostic TypeScript library: Web Crypto CSPRNG sampling, BigInt entropy maths, vendored wordlist + lazy `import()`, hostile-input-safe URL codec, Vitest/fast-check proof
**Confidence:** HIGH (every load-bearing number and platform behaviour was reproduced in this session; one licence-version ambiguity is flagged for a human)

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions
D-01..D-23 and D-25 are locked (auto-accepted smart-discuss decisions). Verbatim headline text is in `.planning/phases/12-password-core-library/12-CONTEXT.md` lines 31-103; the planner MUST read it in full. Summary of the locks that constrain this research:

- **D-01** All randomness flows through `randomInt(maxExclusive, fill?)` in `lib/password/random.ts`: Uint32 draws, `limit = 2^32 - (2^32 % n)`, redraw while `r >= limit`. Only file allowed to reference `getRandomValues`, only place a random value is reduced with `%`. No shuffle anywhere.
- **D-02** `type RandomFill = (buf: Uint32Array) => Uint32Array`; default resolved at call time as `globalThis.crypto?.getRandomValues?.bind(globalThis.crypto)`; absent -> typed `CryptoUnavailableError` (exported class, stable `name`), never a fallback; every generator takes optional `{ fill }`; a wrapper asserts each `fill` call requests at most 65,536 bytes; a test proves the wrapper throws on an oversized request.
- **D-03** One-of-each-enabled-set rule = whole-password rejection resampling, `MAX_GENERATION_ATTEMPTS = 10_000`, exhaustion throws typed `GenerationExhaustedError`; a test computes the worst-case acceptance rate analytically and asserts >= 0.5%.
- **D-04** `generatePassword(opts, { fill }?) -> string`, `generateBatch(opts, count, { fill }?) -> string[]`; count clamped to `BATCH_MIN..BATCH_MAX` total/NaN-safe like `lib/uuid/generate.ts`; options re-normalized inside the library; nothing generates at import time.
- **D-05** Source-guard tests in the `lib/hash/boundaries.test.ts` style (`// @vitest-environment node`, pure `analyze(sources)`, in-memory mutation cases): fail on `Math.random` anywhere under `lib/password/`, on `getRandomValues` outside `random.ts`, on `wordlist/eff-large` imported anywhere except by dynamic `import()` in `wordlist.ts`; walk extensible to `app/tools/password/`.
- **D-06..D-09** `DEFAULT_SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?"` (23), sets A-Z (26) a-z (26) 0-9 (10), `DEFAULT_POOL_SIZE = 85`; `normalizeSymbols` keeps 0x21-0x7E minus `[A-Za-z0-9]`, dedupes first-seen order, caps at 32, empty -> default; `resolveAlphabet(opts) -> { sets, pool, poolSize }` is the single pipeline; `LOOK_ALIKES = "0Oo1lI|"` removed before pool size (85 -> 79); all-sets-off re-enables all four; look-alike-emptied symbol set falls back to `DEFAULT_SYMBOLS` minus look-alikes.
- **D-10..D-13** Vendored unmodified 7,776-word EFF Large list as `lib/password/wordlist/eff-large.ts` (default export: one space-joined string); header has source URL, retrieval date, SHA-256, CC BY attribution; generation script `scripts/generate-eff-wordlist.mjs` (plain Node, no deps, manual); `wordlist.test.ts` (node env) pins count (`EFF_WORD_COUNT = 7776`), uniqueness, `[a-z-]+`, exactly 4 hyphenated words listed explicitly, SHA-256 of the joined string via `node:crypto`; `loadWordlist()` = memoized module-level promise of `import("./wordlist/eff-large")`, memo cleared on failure, never a fallback list; `generatePassphrase(opts, words, { fill }?)` synchronous, asserts `words.length === EFF_WORD_COUNT`, samples with replacement via `randomInt(7776)`, separators `-` `_` `.` space, capitalize = first letter of every word (+0 bits), append number = one random digit 0-9 on the end of the last word (+log2(10)).
- **D-14..D-18** Entropy from options + resolved alphabet only (`passwordEntropyBits(opts)`, `passphraseEntropyBits(opts)`, neither takes an output string); password entropy exact by inclusion-exclusion in BigInt, log2 from bit length + top 53 bits, ~128.06 at default, never NaN/Infinity at L=128; `STRENGTH_THRESHOLDS = { fair: 40, strong: 75, veryStrong: 100 }`, `strengthLevel` raw value with `>=`, `formatBits` floors; `GUESS_RATES = { fast: 1e10, slow: 1e4 }`, `crackTimeLog10Seconds(bits, rate) = (bits - 1)*log10(2) - log10(rate)`, `formatCrackTime(log10s)` buckets ("less than a second", seconds..years, thousand/million/billion/trillion suffix, "more than a trillion years"); every FAQ/worked-example number exported as a constant.
- **D-19..D-23** `parseOptions(search: string): ToolOptions` (total, never throws) / `serializeOptions(opts: ToolOptions): string` (typed options only, omits defaults, fixed key order); `PASSWORD_URL_KEYS = mode,len,u,l,d,s,sym,amb,words,sep,cap,num,n`; booleans `1`/`0`; `sep` tokens `dash|underscore|dot|space`; unknown keys ignored, duplicate key first wins; numbers `^\d{1,4}$` then clamp, else default; `sym` > 64 raw chars -> default, else `normalizeSymbols`; all set flags off -> all on; search string > 2,048 chars ignored entirely; fast-check round-trip + never-throws properties; type-level `@ts-expect-error` check + serialized-key-subset test; analytics regression (`PASSWORD_URL_KEYS` not in `DEFAULT_ALLOW_LIST`; `redactParams(serializeOptions(nonDefault))` returns `{}`), nothing added to the allow-list, `redactBeforeSend` untouched.
- **D-25** No new runtime or dev dependencies.
- Milestone locks: EFF Large unmodified (7,776 words, FAQ note on 4 hyphenated words); bounds length 4-128 (default 20), words 3-20 (default 6), batch 1-20, each one shared constant; entropy-based strength, no zxcvbn; generated output never in URL/analytics/`#fragment`/storage.

### Claude's Discretion
- Exact file split inside `lib/password/` (suggested: `types.ts`, `constants.ts`, `random.ts`, `charset.ts`, `generate.ts`, `passphrase.ts`, `entropy.ts`, `crack-time.ts`, `url-state.ts`, `wordlist.ts`, `wordlist/eff-large.ts`, `errors.ts`, sibling `*.test.ts`, and an `index.ts` barrel that does not re-export the wordlist module).
- Internal BigInt-to-log2 helper details, test naming, how fast-check arbitraries are composed.
- Wording of `formatCrackTime` output within the D-17 buckets.
- D-24 (measurement): measure the wordlist chunk's gzip size (~24.5 KB expected) in a production build and record it in the SUMMARY; informational, does not gate the phase.

### Deferred Ideas (OUT OF SCOPE)
- Extracting `redactBeforeSend` into `lib/analytics/redact.ts` for event-level tests, and redacting `#fragment`s (accepted tech debt).
- EFF short wordlists, pronounceable passwords, "no repeated characters" / "exclude sequences" options.
- Random position for the appended digit or a multi-digit number (would change the locked log2(10) figure).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWD-04 | Every generated password contains at least one char from each enabled set, without biasing the distribution (whole-password rejection resampling) | Sampling shape (Code Examples 1-2); worst-case acceptance 1.03% verified numerically (Pitfall 4); deterministic "second attempt wins" test (Validation) |
| PWD-05 (library half) | Symbol set deduped, printable ASCII, empty restores default | `normalizeSymbols` rules D-07; idempotence property |
| PWD-06 (library half) | Look-alike filter removes `0 O o 1 l I \|` before pool size | `resolveAlphabet`; fixtures 85 -> 79 |
| PWD-07 / POUT-03 (guarantees) | Web Crypto only, typed error; options-only URL, hostile params clamped, nothing reaches analytics | `randomInt`/`CryptoUnavailableError` verified behaviour; codec hostile-input table; redaction regression |
| PHR-01..03 (guarantees) | EFF Large passphrase, 3-20 words, separators, capitalize, number; lazy list, retry-safe, no fallback | Wordlist acquisition + integrity pins; `createWordlistLoader` with injectable importer; measured chunk split |
| STR-01..04 (guarantees) | Entropy stable across Regenerate, pool-size line, crack time with stated rate, fast/slow scenarios | Exact BigInt entropy fixtures; threshold/formatting maths; log-space crack time fixtures |

</phase_requirements>

## Summary

This phase is pure TypeScript with no new dependencies; everything it needs (Web Crypto, BigInt, `URLSearchParams`, dynamic `import()`, `node:crypto` in tests, Vitest 4.1.10, fast-check 4.9.0 + `@fast-check/vitest` 0.4.1) is already present in the repo [VERIFIED: /Users/mwallraf/Developer/packetory.dev/package.json]. The design in CONTEXT.md is sound and every number it quotes reproduced in this session: the default 20-char all-sets password is exactly 128.0598 bits over a pool of 85 (valid-string count by inclusion-exclusion), the worst-case acceptance rate of the whole-password resampler over the *entire* option space is 1.0299% (L=4, all four sets, 1-char symbol set, look-alikes off), so `MAX_GENERATION_ATTEMPTS = 10_000` fails with probability about e^-103, and a 6-word passphrase is 77.5489 bits (80.8708 with a number).

Platform facts were verified empirically rather than recalled: `crypto.getRandomValues` throws `QuotaExceededError` ("The requested length exceeds 65,536 bytes") at 16,385 Uint32 values but accepts 16,384; the method must be called with `this === crypto` (unbound call throws `TypeError`, hence `.bind`/a closure); Vitest's default jsdom environment exposes the same Web Crypto as Node (so sampler tests do not need the node environment), and overriding `globalThis.crypto` to `undefined` after import works and restores cleanly. A throwaway Next 16.2.11 production build (Turbopack) confirmed the vendored wordlist, loaded through `import("./wordlist/eff-large")` from a lazily-called loader, becomes its own chunk that is not referenced by the page's initial HTML: 62,303 bytes raw, 24,702 bytes gzip -9, 21,159 bytes Brotli. This satisfies the D-24 measurement without waiting for Phase 13.

The EFF list was downloaded from `https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt` and checked: 7,776 lines of `NNNNN<TAB>word` (dice indices 11111-66666), 7,776 unique words, all `[a-z-]+`, lengths 3-9, exactly 4 hyphenated words (`drop-down`, `felt-tip`, `t-shirt`, `yo-yo`), SHA-256 of the joined string `c523ba7b...3675`. **One item needs human confirmation:** eff.org states the licence inconsistently (text: CC BY 4.0 International; badge: CC BY 3.0 US). See Open Question 1; the header can credit both and satisfies either.

**Primary recommendation:** Build the modules in dependency order (constants/types/errors -> random -> charset -> generate/passphrase/entropy/crack-time -> wordlist + script -> url-state -> barrel + guards + redaction test), write every test against the verified numeric fixtures in this document, use a single-value `randomInt` with an injectable importer for the wordlist loader, and keep every guard test non-vacuous with in-memory mutation cases.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSPRNG sampling, password/passphrase generation | Browser / Client (library, runs only when called) | — | Local-first NFR; generation must never run at SSR/import time (SSR-leak guard) |
| Entropy / strength / crack-time maths | Browser / Client (pure functions) | Server render (Phase 14 FAQ imports constants at build time) | Pure, deterministic; same functions feed UI and static FAQ |
| EFF wordlist storage | CDN / Static (hashed immutable JS chunk) | Browser (lazy `import()` on first Passphrase use) | No `public/` asset, no `fetch`, no third-party request |
| URL options codec | Browser / Client (pure functions; `replaceState` stays in Phase 13) | — | Options-only URL; parse is total so a hostile link can never throw |
| Analytics redaction regression | Test tier only | — | Allow-list is empty by default; test proves it stays that way |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Crypto `crypto.getRandomValues` | built in | Only entropy source | Mandated by PWD-07; works in insecure contexts too |
| ES2020 `BigInt` | built in | Exact valid-string count | `tsconfig.json` has `"target": "ES2020"` [VERIFIED: tsconfig.json] |
| `URLSearchParams` | built in | Codec parse/serialize | Verified lenient: never throws on malformed percent-encoding or lone surrogates (Pitfall 7) |
| Vitest | 4.1.10 | Test runner | Already installed [VERIFIED: package.json] |
| fast-check + `@fast-check/vitest` | 4.9.0 / 0.4.1 | Property tests | Already installed [VERIFIED: package.json; `fc.string({unit:"binary"})`, `fc.webQueryParameters`, `fc.constantFrom`, `fc.uniqueArray`, `fc.record` all present in 4.9.0, probed in this session] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:crypto` | Node 22.23.4 | SHA-256 in `wordlist.test.ts` | Test-only, `// @vitest-environment node` |
| `node:fs`, `node:path` | built in | Source-guard walk | Copy `lib/hash/boundaries.test.ts` structure |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `randomInt` | `crypto.randomInt` (Node only) | Not available in browsers; rejected |
| Exact BigInt entropy | `L*log2(N)` | Overstates ~3.8 bits at L=4 (25.64 vs exact 21.83 in the all-sets default); locked D-15 |
| zxcvbn | — | Locked out at milestone level |

**Installation:** none. `npm install` is not part of this phase.

**Version verification:** versions above read from `package.json` this session. No package is added, so no registry lookup is required.

## Package Legitimacy Audit

No external packages are installed by this phase. Audit not applicable. Packages removed (SLOP): none. Packages flagged (SUS): none.

## Architecture Patterns

### System Architecture Diagram

```
                      caller (Phase 13/14 UI, or tests)
                                  |
        opts (untrusted shape)    |    search string (untrusted)
              |                   |            |
              v                   |            v
      normalizeOptions  <---------+--- parseOptions  (total: never throws, clamps, whitelists)
              |                                |
              v                                v
      resolveAlphabet  --> {sets, pool, poolSize}      ToolOptions ---> serializeOptions --> "k=v&..." (options only, defaults omitted)
        |     |                |
        |     |                +--------------------------+
        |     v                                           v
        |  generatePassword                       passwordEntropyBits  (BigInt inclusion-exclusion -> log2)
        |   loop attempt<=10_000:                          |
        |     L x randomInt(poolSize, fill) -> chars       v
        |     accept iff every enabled set seen      strengthLevel / formatBits
        |     else redraw WHOLE password                   |
        |     exhausted -> GenerationExhaustedError        v
        |                                          crackTimeLog10Seconds -> formatCrackTime
        v
   randomInt(n, fill?)  <--- the ONLY file touching getRandomValues
     fill resolved at call time; absent -> CryptoUnavailableError
     cap wrapper: buf.byteLength > 65_536 -> throw
     limit = 2^32 - (2^32 % n); redraw while r >= limit; return r % n

   passphrase path:  loadWordlist() --(memoized dynamic import, memo cleared on failure)--> readonly string[7776]
                     generatePassphrase(opts, words, {fill}) -> W x randomInt(7776) [+ randomInt(10)]
```

### Recommended Project Structure
```
lib/password/
├── constants.ts        # bounds, defaults, set sizes, DEFAULT_SYMBOLS, LOOK_ALIKES, thresholds, rates, EFF_WORD_COUNT, BITS_PER_WORD, PASSWORD_URL_KEYS
├── types.ts            # PasswordOptions, PassphraseOptions, ToolOptions, Separator, StrengthLevel, RandomFill
├── errors.ts           # CryptoUnavailableError, GenerationExhaustedError
├── random.ts           # randomInt + resolveFill + byte-cap wrapper (ONLY getRandomValues)
├── charset.ts          # normalizeSymbols, resolveAlphabet, normalizeOptions
├── generate.ts         # generatePassword, generateBatch
├── passphrase.ts       # generatePassphrase, generatePassphraseBatch
├── entropy.ts          # validCount (BigInt), log2Big, passwordEntropyBits, passphraseEntropyBits, acceptanceProbability, strengthLevel, formatBits
├── crack-time.ts       # crackTimeLog10Seconds, formatCrackTime
├── url-state.ts        # parseOptions, serializeOptions
├── wordlist.ts         # createWordlistLoader(importer?), loadWordlist
├── wordlist/eff-large.ts  # generated; default export one space-joined string
├── index.ts            # barrel: everything EXCEPT ./wordlist and ./wordlist/eff-large
├── boundaries.test.ts  # D-05 guards (node env)
└── *.test.ts           # one per module
scripts/generate-eff-wordlist.mjs   # new directory
```
Consumers import `loadWordlist` from `@/lib/password/wordlist` (not the barrel), which keeps the literal D-discretion wording ("barrel does not re-export the wordlist module") true and lets the boundary test assert the barrel never mentions `eff-large`.

### Pattern 1: Single-value `randomInt` with a call-time, byte-capped `fill`
**What:** One Uint32 per draw, rejection sampling, the only `%` on a random value. **Why single-value:** the stub `fill` in tests then only ever has to serve one value per call, so "limit-1 accepted, limit rejected -> redraw" is trivial to script; real cost is negligible (128 chars x 20 batch = 2,560 `getRandomValues` calls). Draw size is 4 bytes per call, so D-02's "at most 512 bytes" holds with a 128x margin and the 65,536-byte cap is untouchable.
```ts
// lib/password/random.ts  (sketch - verified behaviour: see Platform Facts)
import { CryptoUnavailableError } from "./errors";
import type { RandomFill } from "./types";

export const MAX_FILL_BYTES = 65_536;
const TWO_32 = 4_294_967_296;
const MAX_REJECTIONS = 1_000; // defensive only: real acceptance >= 1/2 per draw, so 2^-1000

function resolveFill(fill?: RandomFill): RandomFill {
  const draw: RandomFill = fill ?? defaultFill(); // resolved per call, not at import
  return (buf) => {
    if (buf.byteLength > MAX_FILL_BYTES) {
      throw new RangeError(`fill request of ${buf.byteLength} bytes exceeds ${MAX_FILL_BYTES}`);
    }
    return draw(buf);
  };
}

function defaultFill(): RandomFill {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== "function") throw new CryptoUnavailableError();
  return (buf) => c.getRandomValues(buf); // closure keeps `this === crypto` (unbound call throws TypeError)
}

export function randomInt(maxExclusive: number, fill?: RandomFill): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > TWO_32) {
    throw new RangeError(`randomInt: maxExclusive must be an integer in [1, 2^32], got ${maxExclusive}`);
  }
  const draw = resolveFill(fill);
  const limit = TWO_32 - (TWO_32 % maxExclusive); // constant % n, not a random value
  const buf = new Uint32Array(1);
  for (let i = 0; i < MAX_REJECTIONS; i++) {
    const r = draw(buf)[0]!;
    if (r < limit) return r % maxExclusive; // the single reduction of a random value
  }
  throw new GenerationExhaustedError(); // or a dedicated RangeError; stub-only path
}
```
Notes the executor must keep: `TWO_32 % maxExclusive` is exact in doubles; `n = 2^32` gives `limit = 2^32` and every r is accepted; `n = 1` returns 0 after one draw. `CryptoUnavailableError` must surface even for `randomInt(1)`. Typecheck `RandomFill` against TS 6.0.3's `Uint32Array<ArrayBuffer>` typing with `npm run typecheck` (assigning `c.getRandomValues(buf)` to a `Uint32Array` return should be fine; fix generics if tsc objects).

### Pattern 2: Whole-password rejection resampling with a seen-mask
```ts
// lib/password/generate.ts (sketch)
export function generatePassword(opts: PasswordOptions, o: { fill?: RandomFill } = {}): string {
  const norm = normalizeOptions(opts);                  // total: clamps length, repairs sets
  const { sets, pool } = resolveAlphabet(norm);
  const setIndex = new Map<string, number>();           // char -> which enabled set (sets are disjoint)
  sets.forEach((s, i) => { for (const ch of s) setIndex.set(ch, i); });
  const fullMask = (1 << sets.length) - 1;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    let out = "";
    let seen = 0;
    for (let i = 0; i < norm.length; i++) {
      const ch = pool[randomInt(pool.length, o.fill)]!; // pool is pure ASCII: indexing == code points
      out += ch;
      seen |= 1 << setIndex.get(ch)!;
    }
    if (seen === fullMask) return out;                  // else: discard the WHOLE password, redraw
  }
  throw new GenerationExhaustedError();
}
```
Never patch a position, never shuffle. `generateBatch` clamps `count` with the NaN-safe idiom from `lib/uuid/generate.ts` (`Number.isFinite(count) ? count : 1`, `Math.trunc`, `min/max`) [VERIFIED: lib/uuid/generate.ts lines 36-39 pattern read this session].

### Pattern 3: Exact entropy by inclusion-exclusion in BigInt
Valid-string count over disjoint enabled sets of sizes `s_i` (pool `N = Σ s_i`) and length `L` is `Σ_{S⊆sets} (-1)^|S| (N - Σ_{i∈S} s_i)^L`. At most 2^4 = 16 terms; each term at most `94^128` (~2^839, well inside what BigInt handles). Convert with the bit-length-plus-top-53-bits helper (exact for power-of-two counts):
```ts
function log2Big(n: bigint): number {            // n >= 1n
  const bl = n.toString(2).length;
  if (bl <= 53) return Math.log2(Number(n));
  const shift = bl - 53;
  return shift + Math.log2(Number(n >> BigInt(shift)));
}
```
Note: `Number(count)` would not actually overflow for the current bounds (max ~10^252.6 < 1.79e308); the helper stays because it is exact for powers of two and survives future bound increases. For an all-disabled/one-set case the formula degenerates correctly (one set: `N^L`).

### Pattern 4: Loader with an injectable importer (no module mocking needed)
```ts
// lib/password/wordlist.ts
type Importer = () => Promise<{ default: string }>;
export function createWordlistLoader(importer: Importer = () => import("./wordlist/eff-large")) {
  let memo: Promise<readonly string[]> | null = null;
  return function load(): Promise<readonly string[]> {
    if (!memo) {
      const p = importer().then((m) => m.default.split(" "));
      memo = p.catch((e) => { if (memo === p) memo = null; throw e; }) as typeof memo; // retry-safe
    }
    return memo;
  };
}
export const loadWordlist = createWordlistLoader();
```
Subtle: the memo must hold the promise callers receive so concurrent callers share one import and a failure clears the memo exactly once (compare identity before clearing). Keep the `import("./wordlist/eff-large")` **literal path** inside `wordlist.ts`; Next requires a statically written path (not a template or variable) [CITED: node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md line 239]. The `importer` default parameter lets `wordlist.test.ts` prove "memoized", "failure clears memo", "retry succeeds" and "never falls back" with plain stubs.

### Anti-Patterns to Avoid
- **Pick-required-then-shuffle / patch positions:** non-uniform over valid strings and makes the exact entropy formula false (D-03).
- **`Math.random` anywhere, even as a "fallback" or in a comment the guard greps:** see Pitfall 1.
- **Reading `opts.symbols` after `resolveAlphabet`:** the only way pool size and generation can disagree.
- **Static `import` of `wordlist/eff-large` anywhere:** puts ~24.7 KB gzip into initial JS.
- **Computing passphrase entropy from `words.length` of the loaded list:** the meter must render before the list loads (D-14); the integrity test guarantees equality with `EFF_WORD_COUNT`.
- **Regex on unbounded input before the length cap:** check `search.length > 2048` first (Pitfall 7).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Percent-decoding / encoding | custom splitter/decoder | `URLSearchParams` | Verified never throws on `%ZZ`, truncated UTF-8, lone surrogates, `__proto__` keys, repeated keys; `.get` returns the first |
| SHA-256 of the list | custom hash | `node:crypto` `createHash("sha256")` in the node-env test | Existing precedent (`tests/e2e-prod/hash-worker.spec.ts` uses `node:crypto`) |
| Big-number maths | manual limb arithmetic | native `BigInt` (`**`, `>>`, `toString(2)`) | ES2020 target already set |
| Property-based generation | ad-hoc random loops in tests | `@fast-check/vitest` `it.prop` / `fc.*` | Shrinking; reproducible seeds |
| Dice-index parsing in the script | npm CSV/TSV parser | `split("\n")` + `split("\t")` + two regexes | File is 7,776 trivially regular lines |

**Key insight:** every deceptively hard part (unbiased integer in range, exact count of valid strings, lenient URL decoding) is a ~10-line pure function once the invariant is stated; the risk is not complexity but silently different behaviour at boundaries, which is why each is pinned by a deterministic test below.

## Verified Platform Facts and Fixtures

Everything in this table was produced by running code in this session (Node v22.23.4, Vitest 4.1.10 jsdom, Next 16.2.11).

| Fact | Evidence |
|------|----------|
| `getRandomValues(new Uint32Array(16384))` (65,536 B) succeeds; `new Uint32Array(16385)` throws `QuotaExceededError` ("The requested length exceeds 65,536 bytes", `code` 22) | [VERIFIED: probe run in Vitest jsdom and in plain Node] |
| Unbound `const f = c.getRandomValues; f(buf)` throws `TypeError` (`ERR_INVALID_THIS`, `Value of "this" must be of type Crypto`) | [VERIFIED: same probes] -> bind or wrap in a closure |
| Vitest default jsdom env: `typeof crypto === "object"`, `getRandomValues` is a function, constructor `Crypto` | [VERIFIED: vitest probe] -> sampler/entropy/codec tests need not opt into node env |
| `Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true, writable: true })` makes `globalThis.crypto?.getRandomValues?.bind(globalThis.crypto)` evaluate to `undefined`, and re-defining the saved value restores it | [VERIFIED: vitest probe] -> use try/finally around it in the `CryptoUnavailableError` test |
| `new URLSearchParams(...)` never threw for `%ZZ=%E0%A4%A`, `a=%ED%A0%80`, `__proto__=x&constructor=y`, `sym=%00%01`, `=&&&==`, a lone surrogate; invalid UTF-8 decodes to U+FFFD; `len=20&len=30` -> `get("len")` is `"20"` | [VERIFIED: node probe] |
| `/^\d{1,4}$/` rejects full-width digits (`２０`), Arabic-Indic digits and `"20\n"`; accepts `"20"` | [VERIFIED: node probe] |
| `URLSearchParams.toString()` for the default symbol set yields `sym=%21%40%23%24%25%5E%26*%28%29-_%3D%2B%5B%5D%7B%7D%3B%3A%2C.%3F`; a 32-char set encodes to <= ~96 chars | [VERIFIED: node probe] |
| ESLint (`npm run lint` config) accepts a `.mjs` using `fetch`, `process`, `Buffer`, top-level `await` | [VERIFIED: probe file linted, exit 0, then removed] |
| Turbopack production build: `import("./wordlist/eff-large")` called from a lazily invoked loader on a `"use client"` page -> separate chunk, **62,303 B raw, 24,702 B gzip -9, 21,159 B Brotli**, and the chunk file name is **absent** from the page's prerendered HTML | [VERIFIED: throwaway Next 16.2.11 build in the scratchpad (since deleted); repo untouched] |

### Numeric fixtures (reproduced by a BigInt prototype this session; use `toBeCloseTo`, never `toBe`, except where stated exact)

| Case (sizes u,l,d,sym; L) | Pool N | Exact bits `log2(valid)` | Naive `L*log2(N)` | Acceptance `valid/N^L` |
|---|---|---|---|---|
| 26,26,10,23; L=20 (default) | 85 | **128.0598** | 128.1878 | 0.9151 |
| 26,26,10,23; L=4 | 85 | 21.8313 | 25.6376 | 0.0715 |
| 26,26,10,23; L=128 | 85 | 820.4020 (finite, not NaN/Infinity) | 820.4020 | 0.99999989 |
| 24,24,8,23; L=20 (look-alikes on, default symbols) | 79 | 124.7884 | — | — |
| 26,26,10,1; L=4 (worst case, look-alikes off) | 63 | 17.3078 | 23.9091 | **0.010299 (1.03%)** |
| 24,24,8,1; L=4 (look-alikes on, 1-char symbol) | 57 | — | — | 0.010477 |
| 26 only; L=20 | 26 | 94.0088 | 94.0088 | 1 |
| 1,1,1,1; L=4 | 4 | log2(24) | — | `24n` exact valid count |

- **Worst case over the whole option space** (scanned: look-alikes on/off x symbol size 1..32 x all 15 non-empty set masks x L in {4,5,6,8,12,20,128}): minimum acceptance is **0.010299** at L=4, all four sets, symbol size 1, look-alikes off. `(1 - 0.010299)^10000 = e^-103.5`. The D-03 floor of 0.5% holds with ~2x margin.
- Passphrase: `BITS_PER_WORD = log2(7776) = 12.9248125`; 6 words = **77.5489**; +digit = **80.8708** (`log2(10)` = 3.3219). 3 words 38.77 (Weak), 4 = 51.70, 5 = 64.62 (Fair), 6 = 77.55, 7 = 90.47 (Strong), 8 = 103.40 (Very strong).
- Exact power-of-two pools make the thresholds hit *exactly*: symbols-only with all 32 symbols, L=15 -> 2^75 -> **75.000** bits exactly -> "Strong"; L=20 -> **100.000** -> "Very strong". Use these as end-to-end boundary tests (they exercise the `log2Big` helper's exactness; do not use a lower-bound tolerance).
- Crack time (average case = half keyspace), `Y = 31,557,600 s`: 6 words fast = 350,270 years ("350 thousand years" bucket); 6 words slow = 350.27 billion years; 6 words + digit fast = 3.50 million years; default 128.06 bits fast = log10(years) 20.75 -> "more than a trillion years"; **exactly 100 bits fast = 2.0e12 years -> already "more than a trillion years"** (so a "Very strong" result can show the capped message on the fast scenario - expected, not a bug); 40 bits fast = 55 s; 75 bits fast = 59,857 years. The fast scenario crosses 1e12 years at ~98.99 bits.

## Wordlist Acquisition, Licence and Integrity

**Source:** `https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt`, HTTP 200, `last-modified: Mon, 18 Jul 2016 22:41:51 GMT`, `content-length: 108800`, `cache-control: max-age=31536000, public, immutable` [VERIFIED: curl -D this session]. Announcement page: `https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases`.

**Verified properties of the file (script run this session):**
- 7,776 lines, each `^[1-6]{5}\t[a-z-]+$` (indices 11111..66666, sorted); two columns on every line; no CR characters.
- 7,776 unique words; every word matches `[a-z-]+`; length min 3, max 9.
- Exactly 4 hyphenated words: `drop-down`, `felt-tip`, `t-shirt`, `yo-yo`.
- SHA-256 of the **raw downloaded file**: `addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e`
- SHA-256 of the **space-joined words string** (the exact value `eff-large.ts` default-exports and `wordlist.test.ts` must pin): `c523ba7b5e0d3f77cc6cf0d83bed3f250143c0c90c255d6a646dd992f8453675` (62,143 characters). Both hashes belong in the file header; only the joined hash is asserted in the test (the raw file is not in the repo).
- gzip -9 of the joined string alone: 24,761 B; as a Turbopack chunk 24,702 B (matches the ~24.5 KB estimate).

**Generation script contract (`scripts/generate-eff-wordlist.mjs`, plain Node >=18, no dependencies, manual):**
1. Input: optional path argument, else `fetch` the source URL (Node 22 global `fetch`; the ESLint config accepts this, verified).
2. Validate: every non-empty line matches `^[1-6]{5}\t([a-z-]+)$`; exactly 7,776 lines; indices unique and equal to the sorted 6^5 enumeration (cheap extra check that the dice table is intact); words unique.
3. Strip indices, `join(" ")`, emit `eff-large.ts` as header comment + `const EFF_LARGE_WORDLIST = <JSON.stringify(joined)>;` + `export default EFF_LARGE_WORDLIST;` (one long line is fine; the throwaway build compiled exactly this shape).
4. Print raw-file SHA-256, joined-string SHA-256 and word count so a human can paste them into the test constants; exit non-zero on any validation failure. Never run in CI or the build.
5. Header content: source URL, retrieval date (2026-11-11), both SHA-256 values, "unmodified, 7,776 words", the attribution line below, and "do not edit; regenerate with scripts/generate-eff-wordlist.mjs".

**Licence (verify-on-eff.org flag - result):** The EFF page `https://www.eff.org/copyright` currently reads: "Any and all original material on the EFF website may be freely distributed at will under the Creative Commons Attribution 4.0 International License (CC-BY), unless otherwise noted. ... If you redistribute something you got from the EFF site, it is appreciated if you make it known where the file originated." The licence badge on the same page links to `https://creativecommons.org/licenses/by/3.0/us/`, while its text link points at `https://creativecommons.org/licenses/by/4.0/` [VERIFIED: curl of eff.org/copyright this session]. The wordlist announcement page and the passphrase-wordlists document page state no version of their own (footer only says "Copyright (CC BY)") [VERIFIED: fetched this session]. Third-party packagers (Debian xkcdpass copyright record, a Go package) cite CC BY 3.0 US [CITED: web search result summaries, secondary]. The list file itself carries no licence header. **Recommendation:** the header and the Phase 14 About attribution credit "Electronic Frontier Foundation, EFF Large Wordlist for Passphrases (2016), licensed under Creative Commons Attribution (CC BY)", link `https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases` and `https://www.eff.org/copyright`, state "unmodified", and name both versions as stated by EFF (see Open Question 1). Attribution + link + "unmodified" satisfies both 3.0 US and 4.0 CC BY terms.

## Common Pitfalls

### Pitfall 1: The `Math.random` guard trips on its own comments or tests (or is blind to variants)
**What goes wrong:** A comment such as "never `Math.random`" in `random.ts`, or a test that spies on it, makes the grep fail; conversely `Math["random"]`, `Math?.random`, `globalThis.Math.random`, and `import { randomInt } from "node:crypto"` slip past a naive string match.
**How to avoid:** Run the guard on comment-stripped source (strip `/* */` and `//` comments with a small scanner that does not eat `://` inside strings - the header of `eff-large.ts` contains URLs in comments, so strip comments *before* matching, and skip the generated wordlist file's string payload by only matching code tokens). Patterns: `/\bMath\s*(?:\?\.|\.)\s*random\b/`, `/\bMath\s*\[\s*["']random["']\s*\]/`, and forbid importing `node:crypto`/`crypto` from any non-test file under `lib/password/`. Exempt `boundaries.test.ts` itself (like `SELF` in the hash guard). Keep a runtime complement: a test that `vi.spyOn(Math, "random").mockImplementation(() => { throw ... })` and then generates, which passes the grep (`Math, "random"` does not match the patterns) and fails if anything calls it.
**Warning signs:** guard passes with zero files walked - assert a non-vacuous floor (>= 10 files under `lib/password/`).

### Pitfall 2: Stub `fill` that ignores buffer length or returns a different array
**What goes wrong:** A stub that returns a fixed one-element array breaks as soon as a helper draws more than one value; a stub that returns a *new* array while `randomInt` reads `buf[0]` silently reads zeros.
**How to avoid:** Stubs fill the passed buffer in place from a queue and return that same buffer (the real `getRandomValues` contract); `randomInt` reads the value from the returned array, matching the `RandomFill` type. Provide one shared test helper `queueFill(values: number[]): RandomFill` that throws when the queue is exhausted, so a test cannot loop forever.

### Pitfall 3: Float comparisons at strength boundaries
**What goes wrong:** `strengthLevel(74.99999999999999)` and display flooring disagree if bits is computed with accumulated float error; formatted "75 bits" next to a "Fair" label violates D-16.
**How to avoid:** test labels directly on literals 39.999/40/74.999/75/99.999/100 and end-to-end on the exact power-of-two pools (75.000 / 100.000, `log2Big` exact). Property: for any finite `bits >= 0`, `Math.floor(bits) >= 75` implies label in {Strong, Very strong} and `Math.floor(bits) >= 100` implies Very strong. `strengthLevel` must return Weak for NaN/negative/Infinity-safe inputs (decide and test: NaN -> Weak).

### Pitfall 4: Non-disjoint or duplicate characters in the pool
**What goes wrong:** Duplicate characters in the pool skew the distribution and break the exact entropy formula.
**How to avoid:** `normalizeSymbols` dedupes and excludes alphanumerics (D-07), look-alike filtering only removes. Property tests: `pool` has no duplicate characters; `poolSize === pool.length`; sets pairwise disjoint; `normalizeSymbols` is idempotent and its result is a subsequence of the input's first-seen order.

### Pitfall 5: `RandomFill` type / TS 6 typed-array generics
**What goes wrong:** `tsc` (TypeScript 6.0.3 here; CLAUDE.md's 7.0.2 note is stale relative to `package.json`) may complain about `Uint32Array<ArrayBufferLike>` vs `Uint32Array<ArrayBuffer>`.
**How to avoid:** `new Uint32Array(1)` is `Uint32Array<ArrayBuffer>`; keep the type alias as D-02 states and fix generics only if `npm run typecheck` flags it. Run typecheck in the first task, not at the end.

### Pitfall 6: Memo pointing at a rejected promise
**What goes wrong:** Naive `memo = import(...)` caches the rejection forever, so Phase 14's Retry can never succeed; or the `.catch` that clears the memo races with a newer retry and clears the *new* promise.
**How to avoid:** Pattern 4 (identity-checked clear); tests: reject-then-resolve via a stub importer returns a resolved list on the second call; concurrent callers receive the same promise; after success, the importer is called exactly once.

### Pitfall 7: Codec "total" claim breaks on edge inputs
**What goes wrong:** Non-string `search` (undefined from a JS caller), a leading `?`, a 2,048+ character string, `__proto__`/`constructor` keys, repeated keys, and Unicode digits each break a different naive implementation.
**How to avoid:** `typeof search !== "string" || search.length > 2048` -> defaults *before* any parsing; strip one leading `?`; only `URLSearchParams.get` of whitelisted keys; build the result from a literal (never copy parsed keys into an object, so `__proto__` cannot pollute); `^\d{1,4}$` rejects Unicode digits (verified); `sym` length check happens on the *decoded* value (> 64 -> default).
**Warning signs:** a fast-check run that finds a counterexample with `__proto__` or `\u0000`.

### Pitfall 8: Round-trip property that generates invalid options
**What goes wrong:** `parseOptions(serializeOptions(o))` fails for `o` with an unnormalized `symbolSet`, all-sets-off, or out-of-range numbers because those are *not* valid option sets.
**How to avoid:** build the arbitrary from valid pieces: `len`/`words`/`batch` via `fc.integer({min,max})` using the exported bounds, booleans with at least one set on (filter or `fc.constantFrom` over the 15 masks), `symbolSet` via `normalizeSymbols(fc.string({unit: fc.constantFrom(...printable ASCII)}))` (non-empty after normalization), `separator` from the 4 tokens, `mode` from 2. Also assert the maximal serialization is under 2,048 characters (all options non-default with a 32-char symbol set) so a valid URL can never be rejected by the size cap.

### Pitfall 9: Dev/prod divergence for the wordlist chunk
**What goes wrong:** Chunk-splitting cannot be proven by unit tests; dev mode does not reproduce it.
**How to avoid:** Phase 12 proves the *import boundary* (guard) and records the measured chunk size; the "not requested until Passphrase" network assertion belongs to Phase 14's `test:e2e:prod` spec. Do not add an e2e spec here (no page exists).

## Code Examples

### Source-guard walk (reuse the hash template; extend later to `app/tools/password/`)
```ts
// lib/password/boundaries.test.ts  (sketch; first line: // @vitest-environment node)
const WALK_DIRS = ["lib/password"];                       // Phase 13 adds "app/tools/password"
const SELF = "lib/password/boundaries.test.ts";
// reuse walk()/collectSources()/isTest() verbatim from lib/hash/boundaries.test.ts

const STATIC_IMPORT_RE = /(?:^|[\n;])\s*(?:import|export)\b[^;"'`]*?\bfrom\s*(["'])([^"'\n]+)\1|(?:^|[\n;])\s*import\s*(["'])([^"'\n]+)\3|\brequire\s*\(\s*(["'])([^"'\n]+)\5\s*\)/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*(["'])([^"'\n]+)\1\s*\)/g;

function analyze(sources: Map<string, string>) {
  const code = new Map([...sources].map(([f, t]) => [f, stripComments(t)]));
  return {
    mathRandom: [...code].filter(([, t]) => MATH_RANDOM_RE.test(t)).map(([f]) => f),
    grvOutsideRandom: [...code].filter(([f, t]) => !isTest(f) && f !== "lib/password/random.ts" && /getRandomValues/.test(t)).map(([f]) => f),
    wordlistStaticImporters: [...code].filter(([f, t]) => !isTest(f) && staticSpecs(t).some((s) => /wordlist\/eff-large$/.test(s))).map(([f]) => f),
    wordlistDynamicImporters: [...code].filter(([f, t]) => !isTest(f) && dynamicSpecs(t).some((s) => /wordlist\/eff-large$/.test(s))).map(([f]) => f),
  };
}
// expectations: mathRandom == [], grvOutsideRandom == [], wordlistStaticImporters == [], wordlistDynamicImporters == ["lib/password/wordlist.ts"]
// teeth (in memory, never edit tracked files): append `Math.random()` to generate.ts; append `crypto.getRandomValues(x)` to charset.ts;
// append `import w from "./wordlist/eff-large"` to passphrase.ts and `export * from "./wordlist/eff-large"` to index.ts; add `await import("./wordlist/eff-large")` to a second file.
```
The `eff-large.ts` file's multi-kilobyte string payload must not confuse the walk: the guard only runs `stripComments` + token regexes, and the payload is a single double-quoted string of letters/spaces/hyphens, so no false `Math`/`import` matches (assert this as part of the non-vacuous check).

### Hostile-input table for the codec (drive both example-based tests and fast-check seeds)
| Input (`search`) | Expected `parseOptions` result |
|---|---|
| `""`, `"?"`, `undefined as never`, `null as never`, `123 as never` | all defaults |
| `?len=999` / `?len=1` / `?len=0` | len 128 / 4 / 4 (matches `^\d{1,4}$` -> clamp) |
| `?len=20abc`, `?len=-5`, `?len=1e3`, `?len=`, `?len=%EF%BC%92%EF%BC%90`, `?len=20%0A`, `?len=12345` | default length 20 (malformed; 5 digits fails `{1,4}`) |
| `?words=2` / `?words=99` | 3 / 20 |
| `?n=0` / `?n=21` | 1 / 20 |
| `?u=0&l=0&d=0&s=0` | all four sets on |
| `?u=2`, `?u=true`, `?u=` | default for that flag |
| `?sym=` + 65 chars | default symbols |
| `?sym=%C3%A9%F0%9F%98%80abc!!` | `"!"` (non-ASCII and alphanumerics dropped, deduped) |
| `?sym=abc123` | default symbols (empty after normalize) |
| `?sym=%ED%A0%80` (invalid UTF-8) | default symbols (U+FFFD dropped) |
| `?mode=hax`, `?sep=%20`, `?sep=comma`, `?sep=dash&sep=dot` | defaults / first wins (`dash`) |
| `?__proto__=x&constructor=y&toString=z` | defaults; `({}).polluted` and `Object.prototype` unchanged |
| 2,049-char string whose valid prefix is `?len=64` | defaults (size cap ignores everything) |
| `"?"+ "a=b&".repeat(1000)` | defaults (length > 2,048) |

Property tests (fast-check, default 100 runs is enough; raise `numRuns` to 500 for the never-throws property if cheap): (1) arbitrary `fc.string({unit:"binary"})` and `fc.webQueryParameters()` and a structured generator mixing whitelisted keys with values from the hostile-value list above -> never throws, result satisfies every bound, `symbolSet` equals `normalizeSymbols(symbolSet)`, at least one set on; (2) round-trip on valid options (Pitfall 8); (3) `serializeOptions(parseOptions(s))` is idempotent (`serialize(parse(serialize(parse(s)))) === serialize(parse(s))`); (4) every key in a serialized string is in `PASSWORD_URL_KEYS`, keys appear in the fixed order, and serialized length < 2,048. Type-level: `// @ts-expect-error` calling `serializeOptions("hunter2")` and `serializeOptions({ ...valid, password: "x" })` (excess property) - fails `npm run typecheck` if the signature ever accepts generated output.

### Analytics regression (beside the MAC-10 / HASH-TEXT tests in `lib/analytics/redact.test.ts`)
```ts
import { PASSWORD_URL_KEYS, serializeOptions } from "../password";
it("PASSWORD regression: no password option param is ever allow-listed or reported (POUT-03, D-23)", () => {
  for (const key of PASSWORD_URL_KEYS) expect(DEFAULT_ALLOW_LIST).not.toContain(key);
  const nonDefault = { ...DEFAULT_OPTIONS, length: 32, avoidLookalikes: true, symbolSet: "!?", mode: "passphrase" as const, words: 8 };
  expect(serializeOptions(nonDefault)).not.toBe("");                      // proves the fixture really is non-default
  expect(redactParams(serializeOptions(nonDefault), DEFAULT_ALLOW_LIST)).toEqual({});
});
```
The existing file's pattern is `expect(DEFAULT_ALLOW_LIST).not.toContain("mac")` then `redactParams("?mac=...")` -> `{}` [VERIFIED: lib/analytics/redact.test.ts lines 77-99]. `redactParams` accepts a string with or without a leading `?` [VERIFIED: lib/analytics/redact.ts `toValueMap`], so `serializeOptions` may return a bare `k=v&...` string.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `crypto.getRandomValues(Uint8Array) % n` | Rejection sampling over Uint32 | long-standing guidance | Removes modulo bias |
| `L*log2(N)` entropy for "guarantee one of each" generators | Exact `log2(#valid strings)` when the generator is uniform over valid strings | this phase (D-15) | Honest at short lengths (21.83 vs 25.64 bits at L=4) |
| Static import of a word array | Lazy dynamic `import()` of one joined string | Next/Turbopack code-splitting | 24.7 KB gzip off the initial bundle (measured) |

**Deprecated/outdated:** zxcvbn-style pattern scoring is out of scope (locked); `Math.random`/`sort(() => random - 0.5)` are forbidden by the guard tests.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Defaults for options not named in CONTEXT.md are: `symbols` on, `avoidLookalikes` false, `capitalize` false, `appendNumber` false, `batch` 1, `mode` "password", `separator` "dash" (needed so default pool = 85 and 128.06 bits, and "6 words joined by `-`" per PHR-01) | Open Questions / Code Examples | Low: three of these are forced by existing requirement text (pool 85, PHR-01 `-` separator, PWD-06 "User can enable"); `capitalize`/`appendNumber` defaults off is a convention not stated anywhere - the Phase 14 success criterion ("sees 6 EFF Large words joined by `-`") is consistent with it |
| A2 | Licence attribution wording that credits "CC BY" and names both 3.0 US and 4.0 satisfies EFF's terms for the list | Wordlist section | Medium: legal text; needs human confirmation (Open Question 1). CC BY 3.0 US and 4.0 both require credit + licence link + indication of changes; no changes are made |
| A3 | `vi.stubGlobal("crypto", undefined)` also works for the `CryptoUnavailableError` test; only the `Object.defineProperty` override was probed | Platform facts | Low: use the verified `defineProperty` + try/finally form |
| A4 | The comment-stripping scanner in the guard can be a short regex/state machine rather than a full parser | Pitfall 1 | Low: mutation cases catch regressions; fall back to forbidding the literal tokens in comments |
| A5 | No two distinct equal-length word tuples collide as joined strings when the separator is `-` (the 4 hyphenated words could in principle blur boundaries) | Not asserted anywhere in the plan | Negligible effect on the stated bits (FAQ already notes the 4 words); not verified, so do not add a claim to the FAQ |

## Open Questions

1. **Which CC BY version does the header/About credit name?**
   - What we know: eff.org/copyright text says CC BY 4.0 International; its badge links the 3.0 US licence; secondary packagers cite 3.0 US; the list file has no header.
   - What's unclear: which the EFF intends for this 2016 file.
   - Recommendation: header says "licensed by EFF under Creative Commons Attribution (CC BY); eff.org/copyright (retrieved 2026-11-11) names version 4.0 International while its licence badge links version 3.0 US", with both links. Flag for the human approver of the Phase 14 PHR-04 attribution copy. Not a Phase 12 blocker.
2. **D-24 measurement location.** The wordlist chunk cannot appear in the repo's own `next build` output until a route imports `lib/password/wordlist` (Phase 13/14). Researcher measurement (24,702 B gzip) is already recorded above; the SUMMARY should cite it as "measured in a throwaway Turbopack build", and Phase 14 re-measures in its prod e2e. No probe task is needed in this phase.
3. **`strengthLevel` on non-finite input.** CONTEXT does not specify NaN. Recommend NaN/negative -> "weak" (total function) and a test.
4. **Return value of `serializeOptions` for default options.** CONTEXT says the default URL stays `/tools/password`; recommended contract: returns `""` for defaults, otherwise `k=v&k=v` without a leading `?` (Phase 13 composes `?` + qs). `parseOptions` accepts both forms.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tests, generation script (`fetch`) | yes | v22.23.4 | — |
| npm / npx | `npm test`, `npm run typecheck`, `npm run lint` | yes | (used this session) | — |
| Vitest | all tests | yes | 4.1.10 | — |
| fast-check, `@fast-check/vitest` | property tests | yes | 4.9.0 / 0.4.1 | — |
| Network to eff.org | running the script once (already done for research; the script also accepts a local file argument) | yes | HTTP 200 | pass a local copy |

**Missing dependencies:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (+ `@fast-check/vitest` 0.4.1, fast-check 4.9.0); default env jsdom, `globals: true` [VERIFIED: vitest.config.ts] |
| Config file | `/Users/mwallraf/Developer/packetory.dev/vitest.config.ts` (include `**/*.test.{ts,tsx}`; no change needed) |
| Quick run command | `npx vitest run lib/password lib/analytics` |
| Full suite command | `npm test` (and `npm run typecheck && npm run lint`) |

Files reading the filesystem or hashing (`wordlist.test.ts`, `boundaries.test.ts`) start with `// @vitest-environment node`, matching the hash precedent [VERIFIED: lib/hash/boundaries.test.ts line 1]. All other `lib/password` tests run in the default jsdom env (Web Crypto verified available).

### Phase Requirements -> Test Map
| Req / Success criterion | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| SC1 / PWD-04 | `fc` over full option space: exact length, every enabled set present, only pool chars, pool has no duplicates | property | `npx vitest run lib/password/generate.test.ts` | ❌ Wave 0 |
| SC1 / PWD-04 | Whole-password resampling (not patching): queue stub whose 1st password lacks a set and 2nd is valid returns exactly the 2nd; exhaustion after exactly 10,000 attempts throws `GenerationExhaustedError` (L=4, stub always index 0) | unit (deterministic) | same file | ❌ Wave 0 |
| SC1 | Worst-case acceptance over scanned option grid >= 0.5% (min 1.0299%) via exported `acceptanceProbability` | unit | `npx vitest run lib/password/entropy.test.ts` | ❌ Wave 0 |
| SC2 / PWD-07 | `randomInt` boundaries for n = 85, 94, 7776: `limit-1` accepted -> `(limit-1) % n`; `limit` and `2^32-1` rejected -> redraw consumes next queued value; n = 1 and n = 2^32 edge; invalid n throws `RangeError`; results always in `[0,n)` (property) | unit + property | `npx vitest run lib/password/random.test.ts` | ❌ Wave 0 |
| SC2 | Byte cap: wrapper throws on a >65,536-byte request; real `getRandomValues` throws `QuotaExceededError` at 16,385 Uint32 (documents why); max batch x max length x worst-case rejection never issues a call > 65,536 B (spy on `fill` lengths) | unit | same file + `generate.test.ts` | ❌ Wave 0 |
| SC2 / PWD-07 | Web Crypto absent -> `CryptoUnavailableError` (`name` stable, `instanceof`), no output, `Math.random` spy never called; crypto restored in `finally` | unit | same file | ❌ Wave 0 |
| SC2 | No `Math.random`/`getRandomValues` misuse/static wordlist import (+ in-memory mutation teeth, non-vacuous walk) | source guard (node env) | `npx vitest run lib/password/boundaries.test.ts` | ❌ Wave 0 |
| SC3 / PWD-05, PWD-06 | `normalizeSymbols`: dedupe first-seen, non-ASCII/space/alnum dropped, cap 32, empty -> `DEFAULT_SYMBOLS`, idempotent; `resolveAlphabet` 85 -> 79; all-off -> all on; `|`-only symbol with look-alikes -> default minus look-alikes; constants asserted (26/26/10/23/85, look-alike string) | unit + property | `npx vitest run lib/password/charset.test.ts lib/password/constants.test.ts` | ❌ Wave 0 |
| SC3 / PHR-02 | Passphrase: word count, each separator, capitalize (`t-shirt` -> `T-shirt`, uses `toUpperCase` not locale), appended digit position (end of last word, 0-9), clamps words 3-20, asserts `words.length === 7776`; stubbed fill gives exact output; indices from `randomInt(7776)` | unit + property | `npx vitest run lib/password/passphrase.test.ts` | ❌ Wave 0 |
| SC3 / PHR-03 | Integrity: count == `EFF_WORD_COUNT`, unique, `[a-z-]+`, exactly the 4 hyphenated words, SHA-256 `c523ba7b5e0d3f77cc6cf0d83bed3f250143c0c90c255d6a646dd992f8453675`; header contains URL/SHA/attribution strings; `loadWordlist` memoized, failure clears memo, retry works, no fallback (stub importer) | unit (node env) | `npx vitest run lib/password/wordlist.test.ts` | ❌ Wave 0 |
| SC4 / STR-01, STR-02 | Entropy fixtures (table above: 128.0598, 21.8313, 820.4020 finite, 124.7884, 77.5489, 80.8708); never NaN/Infinity for the whole grid; entropy ignores output (signature takes options only); monotone in L | unit + property | `npx vitest run lib/password/entropy.test.ts` | ❌ Wave 0 |
| SC4 / STR-01 | Thresholds exactly at 40, 75, 100 (39.999/40/74.999/75/99.999/100; exact 2^75 and 2^100-ish pools); `formatBits` floors; floor>=75 implies Strong+ | unit + property | same file | ❌ Wave 0 |
| SC4 / STR-03, STR-04 | `crackTimeLog10Seconds` fixtures (40 bits fast = 55 s; 6 words fast ~3.5e5 y; slow ~3.5e11 y); finite at L=128 for both rates; `formatCrackTime` every bucket and bucket boundaries, ">= 1e12 years" -> "more than a trillion years" | unit + property | `npx vitest run lib/password/crack-time.test.ts` | ❌ Wave 0 |
| SC5 / POUT-03 | Codec: hostile table, never-throws, bounds property, round-trip, idempotence, key whitelist/order, max length < 2,048; `@ts-expect-error` type checks | unit + property + typecheck | `npx vitest run lib/password/url-state.test.ts` and `npm run typecheck` | ❌ Wave 0 |
| SC5 / POUT-03 | Analytics: `PASSWORD_URL_KEYS` not in `DEFAULT_ALLOW_LIST`; `redactParams(serialize(nonDefault))` -> `{}`; allow-list still `[]` | unit | `npx vitest run lib/analytics/redact.test.ts` | exists, extend |
| D-04 | Nothing generates at import (spy `fill`/`getRandomValues` while importing the barrel: zero calls); `generateBatch` NaN/negative/101/3.9 counts clamp | unit | `generate.test.ts` | ❌ Wave 0 |
| D-18 | Every FAQ-facing constant exported from the barrel (assert presence and values) | unit | `constants.test.ts` | ❌ Wave 0 |
| D-24 | Chunk size measured and recorded (24,702 B gzip, researcher probe) | manual note in SUMMARY | — | n/a |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/password` (expected well under 10 s: BigInt maths and 100-run properties are cheap; keep per-test `numRuns` default unless profiling says otherwise)
- **Per wave merge:** `npm test && npm run typecheck && npm run lint`
- **Phase gate:** full suite green plus `npm run build` still succeeds (library is unused by routes, so the build is a no-regression check) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/password/*.test.ts` (all files listed in the map above) - none exist; `lib/password/` does not exist yet [VERIFIED: `ls lib` this session]
- [ ] Shared test helper `lib/password/test-utils.ts` (or colocated): `queueFill(values)` stub that fills in place, returns the same buffer, throws on exhaustion, records requested byte lengths
- [ ] `scripts/` directory does not exist; created by the generation-script task
- [ ] Framework install: none required

## Security Domain

`security_enforcement` is enabled (absent/true in `.planning/config.json`, ASVS level 1, block on high) [VERIFIED: .planning/config.json].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (tool has no accounts) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Strict anchored regex + clamp + whitelist in `parseOptions`; length cap before parsing; `normalizeSymbols` on every symbol path; library re-normalizes caller options |
| V6 Cryptography | yes | `crypto.getRandomValues` only; rejection sampling; fail closed with `CryptoUnavailableError`; no hand-rolled PRNG, no `Math.random` (guard-tested) |
| V8 Data Protection | yes | Generated output never serialized (`serializeOptions` takes options only; type-level + key-subset tests); no storage/URL/analytics; nothing generated at import |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Modulo bias / weak RNG fallback | Tampering / Info disclosure | Single audited `randomInt`; guard tests; no fallback |
| Entropy overstated in the UI | Repudiation / user deception | Exact BigInt count; options-only computation; fixtures |
| Hostile share link (`?len=1e9`, huge `sym`, 10 KB query) causing freeze/OOM | Denial of service | `^\d{1,4}$` then clamp; `sym` cap; 2,048-char search cap; bounded rejection loops |
| Prototype pollution via `__proto__`/`constructor` keys | Tampering | `URLSearchParams.get` of whitelisted keys only; result built from a literal |
| Generated secret leaking into URL/analytics/history | Information disclosure | Options-only codec; `PASSWORD_URL_KEYS` absent from allow-list; no `#fragment` use |
| Supply-chain tampering of the wordlist | Tampering | Vendored, SHA-256 pinned (joined string) and header-documented; manual script; integrity test |
| Infinite resample loop on a pathological config | Denial of service | Bounded attempts (10,000) + typed error; worst-case acceptance proven >= 0.5% |
| Wordlist chunk 404 / deployment skew | Availability | Memo cleared on failure so Retry works; never a fallback list or RNG |

## Sources

### Primary (HIGH confidence)
- Repo files read this session: `12-CONTEXT.md`, `.planning/ROADMAP.md` Phase 12, `.planning/REQUIREMENTS.md` PWD/PHR/STR/POUT/PREG, `.planning/research/ARCHITECTURE.md` (sections 4, 6, 8) and `PITFALLS.md` (2, 3, 7, 20), `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `lib/hash/boundaries.test.ts`, `lib/uuid/generate.ts`, `lib/analytics/redact.ts` and `redact.test.ts`, `.planning/config.json`, `.claude/CLAUDE.md`.
- `https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt` - downloaded and analysed (hashes, counts, format).
- `https://www.eff.org/copyright` - licence text and badge fetched with curl.
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` - dynamic `import()` guidance, static-path requirement (line 239), external-library lazy import (line 99).
- In-session probes: Vitest jsdom crypto, Node `getRandomValues` limit and `this` binding, `URLSearchParams` hostile inputs, BigInt entropy/acceptance prototype, ESLint on `.mjs`, throwaway Next 16.2.11 production build.

### Secondary (MEDIUM confidence)
- `https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases` and `https://www.eff.org/document/passphrase-wordlists` - fetched; state no licence version of their own.
- Web search summaries: Debian xkcdpass copyright record and a Go package citing CC BY 3.0 US for the EFF lists (secondary, not read in full).

### Tertiary (LOW confidence)
- None relied upon.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages; all versions read from `package.json`.
- Architecture / sampling / entropy: HIGH - code shapes and every fixture number reproduced by running them.
- Wordlist facts and chunk split: HIGH - downloaded, hashed, and measured in a real production build.
- Licence version: MEDIUM - EFF's own site is internally inconsistent; flagged for a human.
- Pitfalls: HIGH for platform-behaviour ones (verified), MEDIUM for guard-scanner implementation details (A4).

**Research date:** 2026-11-11
**Valid until:** 2026-12-11 (stable domain; re-check only if Next/Turbopack or Vitest majors change)
