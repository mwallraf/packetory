---
phase: "12"
slug: "password-core-library"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-11"
---

# Phase 12 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (five `<threat_model>` blocks, plans 12-01..12-05); verified against implemented code at ASVS level 1, `block_on: high`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| caller options -> lib/password | Phase 13-14 UI state and URL-derived options are untrusted shapes; `charset.ts` re-normalizes every field (12-01) | Option objects (length, set flags, symbol set, batch, separator) |
| Web Crypto -> randomInt | The only entropy source; absence or a stub must never yield a weaker result (12-01, 12-02) | Uint32 random draws (4 bytes each) |
| runtime environment -> randomInt | Web Crypto may be missing, replaced or broken; the library must fail closed (12-02) | Presence/shape of `globalThis.crypto` |
| caller -> generateBatch | Batch count arrives from UI state or the URL codec; untrusted number (12-02) | Integer count |
| lib/password maths -> user | Strength meter, pool line and crack time are security claims the user acts on; an overstated figure is a user-deception risk (12-03) | Entropy bits, strength label, crack-time text |
| eff.org -> repo (one-time, manual) | `scripts/generate-eff-wordlist.mjs` downloads a third-party file whose content becomes a committed module (12-04) | EFF Large Wordlist (public, 7,776 words) |
| deployment -> browser (wordlist chunk) | The list is a separate hashed chunk that can 404 under deployment skew (12-04) | Wordlist chunk, lazy dynamic import |
| caller -> generatePassphrase | Word list and options arrive from the UI; an incorrect list must be refused (12-04) | Word array + options |
| URL query -> parseOptions | Shared or bookmarked links are attacker-controllable input (Phase 13 reads `location.search`) (12-05) | Query string (options only) |
| options -> URL / analytics | The serialized query is visible in history, referrers and (redacted) analytics; generated secrets must never cross it (12-05) | Serialized option query; never generated output |
| source tree -> CI | Guards must catch regressions introduced by later phases (12-05) | Source text of `lib/password` (and later `app/tools/password`) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation (verified evidence) | Status |
|-----------|----------|-----------|----------|-------------|--------------------------------|--------|
| T-12-01 | Tampering | random.ts modulo bias / weak source | high | mitigate | `randomInt` computes `limit = TWO_32 - (TWO_32 % maxExclusive)` and accepts only `r < limit` (`lib/password/random.ts:58,63-64`); the only reduction of a random value is `r % maxExclusive` (`random.ts:64`); `getRandomValues` appears in no non-test file except `random.ts` (grep over `lib/password` returns only `random.ts`, plus enforced by `boundaries.test.ts:267-269`); no Math-random member in any form anywhere in `lib/password` (grep exit 1; `boundaries.test.ts:263-265`). generate.ts:43 and passphrase.ts:31,37 draw only through `randomInt`. | closed |
| T-12-02 | Tampering | generate.ts one-of-each enforcement | high | mitigate | Whole-password resampling only: `generate.ts:39-50` builds a candidate, returns it only if `seen === fullMask`, else discards it entirely; no patch, no shuffle. Tests: `generate.test.ts:97-101` (queue `[0,26,52,0,62,52,26,0]` returns `!0aA`, 8 fill calls), `:103-107` (`Aa0!`), `:109-113`, property `:67-95` over the full option space. | closed |
| T-12-03 | Denial of Service | generate.ts resample loop | medium | mitigate | Loop bounded by `MAX_GENERATION_ATTEMPTS = 10_000` (`constants.ts:43`, `generate.ts:39`) then `throw new GenerationExhaustedError(MAX_GENERATION_ATTEMPTS)` (`generate.ts:51`). Test `generate.test.ts:127-147` (constant fill: throws, `attempts === 10000`, exactly 40000 fill calls, never returns a password). Analytic bound `entropy.test.ts:238-268`: worst-case acceptance 0.010299 >= 0.005 and failure probability < 1e-40. | closed |
| T-12-04 | Information Disclosure | errors.ts / generate.ts | medium | mitigate | `GenerationExhaustedError` message and properties hold only the attempt count (`errors.ts:16-26`); `CryptoUnavailableError` and `WordlistIntegrityError` hold fixed prose / counts (`errors.ts:6-14,28-38`); no console/network/storage in non-test source (grep clean). Test `generate.test.ts:142-146` asserts the candidate (`AAAA`) is absent from `message`, `JSON.stringify(error)` and every error property. | closed |
| T-12-05 | Denial of Service | charset.ts hostile caller options | medium | mitigate | `clampInt` clamps length to 4-128 and returns fallback for NaN/non-numbers (`charset.ts:51-61,109`); `normalizeSymbols` breaks after `SYMBOL_SET_MAX` (32) kept characters (`charset.ts:93`). Test `generate.test.ts:149-182` (length 1e9 gives 128, NaN gives 20, all-off, symbolSet `abc`); `charset.test.ts:93-100` (cap at 32), `:109-135` properties. Observation (non-blocking): no test feeds a multi-megabyte symbol string; the early break is verified in source only, and a non-matching megabyte string is a bounded linear scan. | closed |
| T-12-SC | Tampering | npm installs (all five plans) | low | mitigate | `git diff --quiet f1b330c -- package.json package-lock.json` exits 0; `git diff --stat f1b330c` over `package.json`, `package-lock.json`, `.github`, `app`, `components` is empty. No package installed in Phase 12; `scripts/generate-eff-wordlist.mjs` uses only Node built-ins; EFF list is vendored data. | closed |
| T-12-06 | Information Disclosure | random.ts when Web Crypto is absent | high | mitigate | `resolveFill` resolves `globalThis.crypto?.getRandomValues?.bind(globalThis.crypto)` at call time and throws `new CryptoUnavailableError()` when undefined; there is no fallback source (`random.ts:17-27`). Tests `random.test.ts:168-188` (randomInt(85), randomInt(1), generatePassword, generateBatch with crypto undefined: typed error, Math-random spy 0 calls), `:190-197` (method-less `{}` crypto), `:215-235` (restore + call-time binding). | closed |
| T-12-07 | Denial of Service | fill request size | medium | mitigate | `resolveFill` wrapper throws `RangeError` for `buf.byteLength > MAX_FILL_BYTES` (65,536) without calling the source (`random.ts:28-35`, `constants.ts:44`); draws are 4 bytes each (`random.ts:59`). Tests `random.test.ts:93-107` (16,385 rejected with 0 source calls; 16,384 passes), `:122-127`, `generate.test.ts:219-240`, `nyquist.test.ts` (passphrase and rejection-heavy paths stay under the cap). | closed |
| T-12-08 | Information Disclosure | generation at import / SSR | medium | mitigate | No module-level call to `randomInt`/`generate*` in any non-test file (grep clean); default fill resolved inside `resolveFill`, never at import. Test `generate.test.ts:282-291` (fresh module graph importing random, charset, generate: zero `getRandomValues` and zero Math-random calls). | closed |
| T-12-09 | Denial of Service | generateBatch hostile count | medium | mitigate | `generateBatch` calls `clampBatchCount(count)` (`generate.ts:67`; `charset.ts:136-138`, 1..20, NaN/Infinity/strings give 1); `generatePassphraseBatch` does the same (`passphrase.ts:49`). Test `generate.test.ts:242-254` (NaN, -5, 0, Infinity, "5", 3.9, 20, 21), `passphrase.test.ts:209-221`. | closed |
| T-12-25 | Tampering | randomInt rejection boundaries (proof for T-12-01) | high | mitigate | `random.test.ts:14-39` pins accept at `limit - 1`, redraw at `limit` and `2^32 - 1` for n = 85, 94, 7776 and `limit % n === 0`; `:41-51` (n = 1, n = 2^32); `:62-68` (value read from the array the fill returns); `:70-74` (1,000-draw ceiling); `:76-89` property over n in [1, 2^32]. All pass in this run. | closed |
| T-12-10 | Repudiation | entropy.ts overstated bits (user deception) | high | mitigate | Exact inclusion-exclusion in BigInt over the resolved alphabet (`entropy.ts:49-70`), `passwordEntropyBits` consumes `resolveAlphabet` output only (`entropy.ts:72-84`). Tests `entropy.test.ts:96-103` (L=4 default sets pinned at 21.8313, not naive 25.6376), `:166-188` property (bits <= L*log2(pool) + 1e-9 over the option space, equals log2 of the exact count), `:100-122` brute-force-checked counts, `:190` single-string pool gives exactly 0 bits. | closed |
| T-12-11 | Tampering | crack-time.ts overflow / NaN producing a misleading text | medium | mitigate | Log-space formula (`crack-time.ts:9-14`), overflow shortcut `CAP_LOG10_SECONDS` (`:29,35-37`), NaN/negative maps to "less than a second" (`:32-34`), 12-significant-digit rounding for exact bucket edges (`:20-22`). Tests `crack-time.test.ts:58-81` (finite at 820.402 bits, both rates), `:83-109` (NaN, -1, -Infinity, every bucket edge), `:136-160` monotonic-rank property (500 runs). | closed |
| T-12-12 | Repudiation | label vs displayed bits inconsistency | medium | mitigate | Label computed from raw bits (`entropy.ts:105-110`), display floored (`entropy.ts:113-115`). Tests `entropy.test.ts:78-94` (exact 2^75 and 2^100 pools: "75 bits" is Strong, 100 is Very strong), `:328-354` boundary tables, `:356-366` property (floor >= 75 implies Strong+, floor >= 100 implies Very strong, floor >= 40 implies not Weak). | closed |
| T-12-26 | Denial of Service | resample retry bound, analytic proof (for T-12-03) | medium | mitigate | `entropy.test.ts:238-268` scans lookalikes x symbol-set sizes 1..32 x 15 masks x lengths {4,5,6,8,12,20,128}; minimum acceptance 0.010299 at `{L:4, mask:15, k:1}`, asserts >= 0.005 and `(1 - min)^10000 < 1e-40`. `acceptanceProbability` is exact BigInt (`entropy.ts:97-102`). | closed |
| T-12-13 | Tampering | lib/password/wordlist/eff-large.ts (supply chain) | high | mitigate | Two SHA-256 pins plus count/charset/hyphen pins in `wordlist.test.ts:24-71,73-79` (joined `c523ba7b...3675`, rebuilt original `addd3553...b903e`); byte-for-byte determinism test `wordlist.test.ts:102-113`; script rejects bad input (`generate-eff-wordlist.mjs:48-79`; tests `wordlist.test.ts:115-179`). Independently recomputed by the auditor from the committed module: 7,776 words, 7,776 unique, joined SHA-256 and rebuilt-original SHA-256 equal the pins, charset `[a-z-]`, hyphenated words exactly drop-down, felt-tip, t-shirt, yo-yo. Observation (non-blocking): "stops if upstream hashes differ" is realized by the pin test (CI-gated: typecheck, lint, test jobs in `.github/workflows/ci.yml`) and the plan's manual STOP instruction; the script itself prints the hashes but does not compare them. | closed |
| T-12-14 | Denial of Service | wordlist in initial JS (performance) | medium | mitigate | Only reference to `./wordlist/eff-large` among non-test files is the literal dynamic import `wordlist.ts:16` (grep across `lib`, `app`, `components`); `index.ts` does not re-export the loader or the list; `boundaries.test.ts:271-277,279-282` (no static importer, `wordlist.ts` sole dynamic importer, loader not imported by library files) with mutants `:367-401`; `index.test.ts:111-120` (loader absent from barrel, no 7,776-element array or string over 10,000 chars). Chunk size recorded in `12-04-SUMMARY.md` (D-24). | closed |
| T-12-15 | Tampering | loader fallback or stuck failure | medium | mitigate | `wordlist.ts:20-36`: memo cleared on failure only when `memo === p` (identity check), rejection is the importer's own error, no alternative list anywhere. Tests `wordlist.test.ts:253-268` (failure rejects with its own error, next call retries), `:270-285` (stale failure does not clear a newer promise), `:287-290` (rejection never yields another list). | closed |
| T-12-16 | Tampering | scripts/generate-eff-wordlist.mjs network download | low | mitigate | HTTPS `SOURCE_URL` (`generate-eff-wordlist.mjs:23-24`); strict format/order/uniqueness/CRLF validation (`:48-79`); prints raw and joined hashes for comparison with the pins (`:135-140`); not referenced by `package.json` scripts or `.github/workflows` (grep clean), so it never runs in CI or the build. | closed |
| T-12-17 | Tampering | passphrase word bias | medium | mitigate | `passphrase.ts:31` `randomInt(EFF_WORD_COUNT, ...)` and `:37` `randomInt(10, ...)`; no other reduction of randomness. Tests `passphrase.test.ts:150-166` (redraw at limits 4294964736 and 4294967290 with exact call counts). | closed |
| T-12-18 | Information Disclosure | WordlistIntegrityError content | low | mitigate | `errors.ts:28-38` message holds only the two counts; guard `passphrase.ts:22-27` runs before any draw. Tests `passphrase.test.ts:168-207` (message and `JSON.stringify` contain neither "abacus" nor "zoom"; 0 fill calls). | closed |
| T-12-19 | Denial of Service | parseOptions hostile link | high | mitigate | `url-state.ts:78-80` returns defaults for non-strings or `search.length > MAX_SEARCH_LENGTH` (2,048) before any parsing; counts require `/^\d{1,4}$/` then clamp via `normalizeToolOptions` (`:50-53,95-114`); decoded `sym` > 64 gives `DEFAULT_SYMBOLS` (`:102-105`); `URLSearchParams` construction wrapped in try/catch (`:82-89`). Tests `url-state.test.ts:101-119` (hostile grid incl. `len=999`, full-width digits, 65-char `sym`, exact 2,048 boundary), `:195-220` never-throws property over `fc.string({unit:"binary"})`, `fc.webQueryParameters()` and structured hostile pairs (500 runs). | closed |
| T-12-20 | Tampering | prototype pollution via `__proto__` / `constructor` keys | medium | mitigate | Only `params.get` of whitelisted literal keys; result built from a fresh object literal then re-normalized (`url-state.ts:91-114`; `charset.ts:37-41` `asRecord`, no key copying). Test `url-state.test.ts:141-148` (`__proto__`, `constructor`, `toString` keys: `Object.prototype` untouched, result prototype is `Object.prototype`, exactly 13 keys). | closed |
| T-12-21 | Information Disclosure | generated output in the URL | high | mitigate | `serializeOptions(opts: ToolOptions)` accepts options only and re-normalizes (`url-state.ts:117-144`); every emitted field is a bounded enum/number or a normalized symbol set of at most 32 non-alphanumeric ASCII characters (`charset.ts:79-96`); no `#` or browser global in `url-state.ts` (grep clean). Tests `url-state.test.ts:284-307` (two `@ts-expect-error` checks; `tsc --noEmit` exits 0 and `tsconfig.json` includes `**/*.ts`, so a stale directive would fail CI), extra `password` field never reaches the string, `:243-281` key-subset and size properties. | closed |
| T-12-22 | Information Disclosure | password params reaching analytics | high | mitigate | `lib/analytics/redact.ts:25` `DEFAULT_ALLOW_LIST = []`; `redact.ts` and `lib/analytics/PacketoryAnalytics.tsx` unchanged since `f1b330c` (git diff empty). Regression `lib/analytics/redact.test.ts:102-120`: no `PASSWORD_URL_KEYS` entry in the allow-list, `redactParams` of a non-default serialized query (with and without `?`) returns `{}`, allow-list still `[]`. | closed |
| T-12-23 | Tampering | regressions: Math random, Web Crypto outside randomInt, static/second wordlist importer | high | mitigate | `boundaries.test.ts:262-311` real-tree rules (Math-random member in any of 4 forms, `getRandomValues` only in `random.ts`, wordlist static/dynamic importers, loader/test-helper importers, crypto/framework imports, non-vacuity), pure `analyze()` with 23 in-memory mutants `:313-455` (>= the 15 required), `WALK_DIRS` array extensible by Phase 13 (`:23`). All pass in this run. | closed |
| T-12-24 | Information Disclosure | lib/password as a data exit (network, storage, console) | medium | mitigate | `SIDE_CHANNEL_RES` over non-test `lib/password` files (`boundaries.test.ts:173-184,289-291`) with mutants for fetch, console, localStorage (`:408-421`); independent grep of non-test sources for fetch/XHR/sendBeacon/WebSocket/EventSource/localStorage/sessionStorage/indexedDB/console/document.cookie finds only a prose comment in `wordlist.ts:5`. | closed |
| T-12-27 | Information Disclosure | generation at import via the barrel | medium | mitigate | `index.ts` is re-exports only. Test `index.test.ts:140-153` (fresh module graph import of `./index`: zero `getRandomValues` and zero Math-random calls). | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `block_on` (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Totals:** 28 threats (T-12-01..T-12-27 plus T-12-SC, which recurs in all five plans), 28 closed, 0 open-blocking, 0 open below threshold. Severity mix: 10 high, 15 medium, 3 low.

**Verification run (auditor, 2026-11-11):** `npx vitest run lib/password lib/analytics` gave 12 files, 393 tests, all passing; `npm run typecheck` exit 0; `npx eslint lib/password lib/analytics scripts` clean.

### Unregistered Flags

None. All five SUMMARY `## Threat Flags` sections state "None" (the only new network surface, the manual script download, is registered as T-12-16). The diff since `f1b330c` outside `lib/password` and `scripts/` is one file (`lib/analytics/redact.test.ts`, +21 lines).

---

## Accepted Risks Log

No accepted risks. Every threat has disposition `mitigate`.

Non-threat note for the milestone UAT (not a register item): the licence wording of the `eff-large.ts` header (CC BY 3.0 US vs 4.0 ambiguity on eff.org/copyright) is queued as a human check in `12-04-SUMMARY.md`.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 28 | 28 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
