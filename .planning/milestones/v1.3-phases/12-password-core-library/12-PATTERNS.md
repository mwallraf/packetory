# Phase 12: Password Core Library - Pattern Map

**Mapped:** 2026-11-11
**Files analyzed:** 27 new, 1 modified
**Analogs found:** 8 strong / 28 (the rest are greenfield; RESEARCH.md sketches are the pattern source)

All analog paths below were listed by `git ls-files` (tracked source). No gitignored mirrors are referenced.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/password/constants.ts` | config | transform | `lib/hash/share-link.ts` (exported const style, L7-8) | partial |
| `lib/password/types.ts` | model | transform | `lib/uuid/generate.ts` (L3-8 types) | role-match |
| `lib/password/errors.ts` | utility | transform | none | no analog |
| `lib/password/random.ts` | utility | request-response (CSPRNG) | none; RESEARCH Pattern 1 | no analog |
| `lib/password/charset.ts` | utility | transform | none; D-07..D-09 | no analog |
| `lib/password/generate.ts` | service | batch | `lib/uuid/generate.ts` | exact (clamping and batch shape) |
| `lib/password/passphrase.ts` | service | batch | `lib/uuid/generate.ts` | role-match |
| `lib/password/entropy.ts` | utility | transform | none; RESEARCH Pattern 3 | no analog |
| `lib/password/crack-time.ts` | utility | transform | none | no analog |
| `lib/password/wordlist.ts` | service | file-I/O (lazy import) | none; RESEARCH Pattern 4 | no analog |
| `lib/password/wordlist/eff-large.ts` | config (generated) | static data | none | no analog |
| `lib/password/url-state.ts` | utility | request-response (URL codec) | `lib/hash/share-link.ts` (pure, total, never throws) | role-match |
| `lib/password/index.ts` | barrel | n/a | none in lib (check `lib/subnet` for any index) | no analog |
| `scripts/generate-eff-wordlist.mjs` | utility (script) | batch/file-I/O | none (no `scripts/` dir yet) | no analog |
| `lib/password/boundaries.test.ts` | test (source guard) | file-I/O | `lib/hash/boundaries.test.ts` | exact |
| `lib/password/*.test.ts` (random, charset, generate, passphrase, entropy, crack-time, url-state, wordlist, constants) | test | n/a | `lib/uuid/generate.test.ts` (fast-check `it.prop`) | exact |
| `lib/analytics/redact.test.ts` (MODIFIED) | test | request-response | itself (MAC-10, HASH-TEXT blocks L77-99) | exact |

## Pattern Assignments

### `lib/password/generate.ts` and `passphrase.ts` batch clamping (service, batch)

**Analog:** `lib/uuid/generate.ts` (lines 26-39)

Total, NaN-safe clamp. Copy this idiom, replacing 100 with `BATCH_MAX` and 1 with `BATCH_MIN`:
```typescript
const safeCount = Number.isFinite(count) ? count : 1;
const clampedCount = Math.min(100, Math.max(1, Math.trunc(safeCount)));
return Array.from({ length: clampedCount }, () => generate());
```
Also copy the doc-comment convention: state totality and "this module must not trust its caller" (lines 17-21). Options objects are re-normalized inside the library (D-04). The core `generatePassword` loop (whole-password resample with seen-mask) has no analog; use RESEARCH Pattern 2.

---

### `lib/password/boundaries.test.ts` (test, source guard)

**Analog:** `lib/hash/boundaries.test.ts`

**Header and walk** (lines 1-51), copy verbatim, changing `WALK_DIRS = ["lib/password"]` (Phase 13 adds `app/tools/password`) and `SELF = "lib/password/boundaries.test.ts"`:
```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
const ROOT = path.resolve(__dirname, "../..");
const SKIP_DIRS = new Set(["node_modules", ".next"]);
const isTest = (file: string) => /\.(test|spec)\.tsx?$/.test(file);
function walk(dir: string, out: string[]): void { /* readdirSync, recurse, push /\.tsx?$/ */ }
function collectSources(): Sources { /* skip SELF, Map<rel, text> */ }
```

**Specifier regex + resolver** (lines 53-73): reuse `SPECIFIER_RE`, `importSpecifiers`, `resolveSpecifier`. Note it already matches `import("x")`, so for the wordlist rule you need a separate dynamic-only regex (RESEARCH "Code Examples", `DYNAMIC_IMPORT_RE`) to tell static from dynamic imports.

**Pure analyze + real analysis** (lines 84-120): `analyze(sources: Map<string,string>)` never touches the filesystem; `const real = collectSources(); const realAnalysis = analyze(real);`. Add `stripComments` before the `Math.random` and `getRandomValues` checks (RESEARCH Pitfall 1: `eff-large.ts` header contains URLs in comments).

**Teeth + non-vacuous** (lines 150-190):
```typescript
const mutant = new Map(real);
mutant.set("lib/hash/client.ts", `${real.get("lib/hash/client.ts")}\nimport ...`);
const a = analyze(mutant);
expect(a.importersOf(...)).toContain(...);
expect(a.importersOf(...)).not.toEqual(realAnalysis.importersOf(...));
```
Non-vacuous floor: `expect(realAnalysis.lib.length).toBeGreaterThanOrEqual(8)` (RESEARCH suggests at least 10 files under `lib/password/`). Expectations: `mathRandom == []`, `getRandomValues` only in `random.ts`, no static importer of `wordlist/eff-large`, dynamic importer exactly `["lib/password/wordlist.ts"]`, barrel never mentions `eff-large`.

---

### `lib/password/*.test.ts` (fast-check + Vitest)

**Analog:** `lib/uuid/generate.test.ts` (lines 1-40)
```typescript
import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { generateBatch } from "./generate";
describe("generateBatch", () => {
  it("clamps count=0 up to a minimum of 1, never throwing (defensive totality)", () => {
    expect(generateBatch({ version: "v4", count: 0 })).toHaveLength(1);
  });
```
Use `fcIt.prop([...])` for properties. jsdom is the default environment and has Web Crypto, so only file-reading tests (`boundaries`, `wordlist`) need `// @vitest-environment node`. Provide a shared `queueFill(values): RandomFill` test helper that fills in place and throws when exhausted (RESEARCH Pitfall 2).

---

### `lib/password/url-state.ts` (utility, pure total codec)

**Analog:** `lib/hash/share-link.ts` (lines 1-31): pure, "Total: never throws", named exported cap constant (`SHARE_TEXT_MAX_ENCODED = 2000`), early-return guards before work. Mirror with `MAX_SEARCH_LENGTH = 2048` checked before parsing (`typeof search !== "string" || search.length > 2048` returns defaults). The rest (`URLSearchParams.get` only on whitelisted keys, a literal result object, `^\d{1,4}$` then clamp) comes from RESEARCH Pitfall 7 and the hostile-input table. `serializeOptions` returns `""` for defaults and `k=v&...` with no leading `?`.

---

### `lib/analytics/redact.test.ts` (MODIFIED: add one `it` before the closing `});` at line 100)

**Analog:** same file, lines 77-99
```typescript
it("HASH-TEXT regression: ?text= is stripped and 'text' is never allow-listed (TEXT-04, D-22)", () => {
  expect(DEFAULT_ALLOW_LIST).not.toContain("text");
  expect(redactParams("?text=hunter2%0Asecret", DEFAULT_ALLOW_LIST)).toEqual({});
});
```
Add `import { PASSWORD_URL_KEYS, serializeOptions } from "../password";` beside line 2's import. The new test loops `PASSWORD_URL_KEYS` against `DEFAULT_ALLOW_LIST`, asserts `serializeOptions(nonDefault)` is non-empty (the fixture really is non-default), then `redactParams(serializeOptions(nonDefault), DEFAULT_ALLOW_LIST)` equals `{}`. `redactParams` accepts a string with or without a leading `?`. Nothing in `redact.ts` changes.

---

## Shared Patterns

### Totality / do not trust the caller
**Source:** `lib/uuid/generate.ts` L17-21, L30-36. Apply to `generatePassword`, `generateBatch`, `generatePassphrase*`, `parseOptions`, `normalizeOptions`.

### Framework-agnostic `lib/<tool>/` layout
Sibling `*.test.ts` per module, no React/Next imports. Every `lib/*` directory follows this (hash, uuid, mac, subnet, dns). Import tests with relative `./module` paths; the cross-module import in `redact.test.ts` uses `../password`.

### Source-guard with in-memory mutations
**Source:** `lib/hash/boundaries.test.ts`. Never edit tracked files in tests; build a mutated `Map` and call the pure `analyze`.

### Analytics: allow-list stays empty
**Source:** `lib/analytics/redact.ts` (`DEFAULT_ALLOW_LIST = []`, `redactParams`). No password key is ever added.

## No Analog Found

Planner should use the RESEARCH.md sketches (and the verified fixtures there) for these:

| File | Role | Data Flow | Pattern source |
|---|---|---|---|
| `lib/password/random.ts` | utility | CSPRNG | RESEARCH Pattern 1 (`randomInt`, `resolveFill`, byte cap) |
| `lib/password/errors.ts` | utility | n/a | D-02, D-03 (`CryptoUnavailableError`, `GenerationExhaustedError`, stable `name`) |
| `lib/password/charset.ts` | utility | transform | D-07..D-09 |
| `lib/password/entropy.ts` | utility | transform | RESEARCH Pattern 3 (BigInt inclusion-exclusion, `log2Big`) and fixtures table |
| `lib/password/crack-time.ts` | utility | transform | D-17 plus crack-time fixtures in RESEARCH |
| `lib/password/wordlist.ts` | service | lazy import | RESEARCH Pattern 4 (`createWordlistLoader(importer)`, identity-checked memo clear; keep the literal `import("./wordlist/eff-large")`) |
| `lib/password/wordlist/eff-large.ts` | generated data | static | D-10/D-11 and RESEARCH wordlist section (joined SHA-256 `c523ba7b...3675`) |
| `scripts/generate-eff-wordlist.mjs` | script | file-I/O | RESEARCH "Generation script contract" (no `scripts/` dir exists; ESLint accepts `.mjs` with `fetch`/`process`) |
| `lib/password/index.ts` | barrel | n/a | Export everything except `./wordlist` and `./wordlist/eff-large`; consumers import `loadWordlist` from `@/lib/password/wordlist` |

## Metadata

**Analog search scope:** `lib/` (hash, uuid, analytics, mac, subnet, dns), tracked files only
**Files read:** lib/uuid/generate.ts, lib/uuid/generate.test.ts, lib/hash/boundaries.test.ts, lib/hash/share-link.ts, lib/analytics/redact.test.ts
**Note:** RESEARCH.md lines 468-575 (environment availability, validation architecture) were not read; the load-bearing sections were all in the first 467 lines.
**Pattern extraction date:** 2026-11-11
