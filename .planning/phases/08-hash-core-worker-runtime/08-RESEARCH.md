# Phase 8: Hash Core & Worker Runtime - Research

**Researched:** 2026-10-14
**Domain:** In-browser incremental hashing (pure-JS `@noble/hashes` v2 + hand-rolled CRC32) inside a Turbopack-bundled Web Worker, Next.js 16.2.11 App Router, Vitest/fast-check/Playwright
**Confidence:** HIGH (every load-bearing claim below was reproduced this session in a throwaway copy of the repo: `tsc`, `eslint`, `vitest`, `next build`, `next start`, `next dev`, real Chrome; see "Verification Evidence")

<user_constraints>
## User Constraints (from CONTEXT.md)

No `08-CONTEXT.md` exists. The user chose to continue without `/gsd-discuss-phase`. The locked decisions below are copied verbatim from `.planning/ROADMAP.md` ("Locked decisions (do not reopen)") and `.planning/STATE.md` ("v1.2 locked decisions (user-confirmed before roadmap, do not reopen)").

### Locked Decisions
- hash engine = `@noble/hashes@2.4.0` (imported only from `lib/hash/engine.ts`) + hand-rolled IEEE CRC32
- URL state = read `?text=` on load; write only via an explicit "Copy link" action (never auto-written)  *(Phase 9 concern, listed for completeness)*
- extras included = paste-to-verify, `sha256sum` copy format, Base64 toggle; HMAC deferred  *(Phase 9 concern)*
- registry category = `encode`  *(Phase 9 concern)*
- Keep Next pinned at 16.2.11 (roadmap research flag: Turbopack worker regressions reported around 16.2.4 / 16.3 canaries)
- Phase 8 is "library + worker only, no tool route yet" (ROADMAP Phase 8 line)

### Claude's Discretion
- Everything not listed above: module decomposition inside `lib/hash/`, the exact client API shape, test layout, how the production-build worker smoke test is hosted (no tool route exists yet), and where the bundle-boundary guards live.

### Deferred Ideas (OUT OF SCOPE)
- HMAC, input-encoding toggles (hex/Base64 input), newline/CRLF toggles, SRI copy, multi-file batch (REQUIREMENTS.md "Future Requirements")
- Keccak-256 / CRC-32C rows, algorithm picker, server-side hashing, localStorage input (REQUIREMENTS.md "Out of Scope")
- Everything in Phases 9 and 10 (tool page, registry entry, UI, copy/verify/format options, file drop UI, progress UI, analytics-fragment fix)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HASH-01 | Correct MD5/SHA-1/SHA-224/SHA-256/SHA-384/SHA-512/SHA3-256/SHA3-512/RIPEMD-160/CRC32 digests vs published vectors, padding boundaries, SHA3-vs-Keccak negatives | Exact noble v2 subpaths + API (Standard Stack); 43 published vectors cross-checked against OpenSSL with 0 mismatches (Code Examples > Vector fixtures); boundary-length list incl. SHA3 rate +/-1 (136 and 72); keccak negative proven to fail when the engine is mutated to Keccak; CRC32 hand-roll verified |
| HASH-02 | Text hashed as exact UTF-8 bytes, no trim/normalize | Single `encodeText` choke point; NFC/NFD/emoji vectors verified against `printf '%s' ... \| shasum -a 256`; noble v2 `update()` throws on strings, so the choke point is enforced by the type system and at runtime |
| HASH-03 | Identical digests one-shot vs arbitrary chunks (property-tested) | `runHashJob` over `Iterable/AsyncIterable<Uint8Array>`; fast-check chunk-size property with `node:crypto` + `zlib.crc32` oracle verified green; `Blob.slice().arrayBuffer()` source verified (jsdom has no `Blob.stream`) |
| HASH-04 | All hashing in a Web Worker; engine not in initial page JS | `new Worker(new URL(...), { type: "module" })` verified in real Chrome on `next build && next start` AND `next dev` (Next 16.2.11); noble lands in one separate chunk (21,284 B raw / 8,635 B gzip) that never appears in the main thread's resource timeline; cooperative cancel verified (tiny job completes 68 ms after superseding a 96 MiB job); fake-Worker + loopback test patterns verified |
</phase_requirements>

## Summary

Phase 8 is a pure library-plus-runtime phase with exactly one genuinely new technology: a Web Worker bundled by Turbopack. That risk is now retired. In a scratch copy of this repo (outside the iCloud-synced folder, see Environment Availability), a worker created as `new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" })` built with `next build`, ran under `next start` and `next dev` in real Chrome, hashed text and a 3 MiB Blob through all 10 algorithms with every digest matching `node:crypto`/`zlib.crc32`, and cooperative cancellation stopped a 96 MiB job so that the superseding job finished in 68 ms. The `{ type: "module" }` research flag is therefore answered: it works on the pinned Next 16.2.11 (Chrome only; Firefox/Safari untested).

The recommended shape is a small set of framework-agnostic modules in `lib/hash/` (types, algorithms metadata, crc32, engine, format, source, job, worker-core, hash.worker, client) with exactly two import boundaries enforced mechanically: only `engine.ts` may import `@noble/hashes` (ESLint `no-restricted-imports`, verified) and only the worker chain (`worker-core -> job -> engine`) may reach `engine.ts` (a Vitest source-walk test, verified). The worker's message handler is factored into `worker-core.ts` so that the full client-to-worker protocol is unit-testable in Node with a loopback fake, and `hash.worker.ts` is a 3-line adapter.

Because Phase 8 has no tool route, the production-build criterion (success criterion 5) needs a host page. Recommendation: an env-gated harness route `app/hash-smoke/page.tsx` that calls `notFound()` unless the build was made with `HASH_SMOKE=1` (verified: 404 without the env var, 200 with it), plus a separate `playwright.prod.config.ts` that builds and starts the production server. This keeps the default build and the existing dev-server e2e suite untouched and gets replaced by `/tools/hash` in Phase 9.

**Primary recommendation:** Build `lib/hash/` exactly as the verified reference implementation in "Code Examples", gate it with the 43-vector table plus `node:crypto`/`zlib.crc32` differential tests, and prove HASH-04 with a `HASH_SMOKE=1` production-build Playwright spec that asserts (a) correct digests from the worker, (b) the noble-marker chunk is fetched by the worker but absent from `performance.getEntriesByType("resource")`, and (c) a superseding job finishes quickly.

## Project Constraints (from CLAUDE.md)

Source: `/Users/mwallraf/Documents/dev/packetory.dev/.claude/CLAUDE.md` (read this session).

- Tech stack fixed: Next.js App Router + TypeScript + Tailwind on Vercel. Not open for reconsideration.
- Static-first rendering; client components only where interaction requires them.
- Local-first: transformations run in-browser; **no third-party requests** for tools that can run locally (hashing must make zero network requests).
- Performance: 90+ Lighthouse in all categories; minimal JS per page; no avoidable CLS. (Phase 8 keeps hash code out of initial JS.)
- Privacy: no tracking, no PII; sensitive query params excluded from analytics. (Phase 8 adds no URL state; worker error messages must never echo user text.)
- UX non-negotiables (zero-effort default, one-click copy, keyboard-first, no modals) apply from Phase 9.
- "GSD Workflow Enforcement": do not make direct repo edits outside a GSD workflow. (This research only writes `.planning/...`; all experiments were in a scratch copy.)
- Conventions: "not yet established" in CLAUDE.md; real conventions were read from `lib/uuid`, `lib/mac`, `lib/dns` (see Architecture Patterns > Repo conventions).
- No project skills found (`.claude/skills/`, `.agents/skills/` not present).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Digest computation (10 algorithms, incremental) | Browser: dedicated Web Worker | — | Pure JS, ~14 MB/s for all 10 serially; must not block typing; cancel needs a thread that can be told to stop |
| UTF-8 encoding of text (`encodeText`) | Browser: Worker (inside `worker-core`) | Node test env (same function) | Single choke point; the string is posted to the worker, encoded there; tests call the same function |
| Supersede / cancel / stale-result discard | Browser main thread: `client.ts` | Worker: per-job `AbortController` | Main thread owns "what is the latest request"; worker owns "stop burning CPU" |
| Algorithm metadata (labels, bits, notForSecurity) | Build/SSR-safe module (`algorithms.ts`) | Browser | Must be importable by the server page and main thread without pulling in noble |
| Chunk source adapters (bytes / Blob slices) | Worker (runs where the Blob is read) | Node test env | `Blob.slice().arrayBuffer()` is available in workers and in Node/jsdom |
| Bundle-boundary enforcement | Lint + unit test (CI) | — | Mechanical guard so noble never reaches initial JS |
| Production-build worker proof | Playwright against `next start` | — | Dev-works/prod-breaks is the classic worker failure; only a prod build proves HASH-04 |
| Sample digests, copy/format/Base64, UI | Phase 9 (out of scope here) | — | Listed so the planner does not pull them forward |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@noble/hashes` | **2.4.0** (exact pin) | MD5, SHA-1, SHA-224/256/384/512, SHA3-256/512, RIPEMD-160 | Locked decision. Registry: latest = 2.4.0, MIT, zero dependencies, `sideEffects: false`, `engines.node >= 20.19.0`, published 2026-08-27, ~97M weekly downloads [VERIFIED: npm registry via `gsd_run query package-legitimacy check` -> `OK`, plus `npm view`]. Not currently in `package-lock.json` (grep of the real lockfile found no `node_modules/@noble` entry), so it is a fresh dependency. |
| hand-rolled `lib/hash/crc32.ts` | n/a | IEEE CRC-32 (poly 0xEDB88320), incremental | Locked decision (noble has no CRC32). ~20 lines, verified bit-exact against `zlib.crc32` by property test |

### Supporting (already installed, no new dev dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 4.1.10 | Unit tests | All `lib/hash/*.test.ts`; use `// @vitest-environment node` docblock per file (see Pitfalls) |
| `fast-check` + `@fast-check/vitest` | 4.9.0 / 0.4.1 | Chunk-split + differential properties | Same `import { fc, it as fcIt } from "@fast-check/vitest"` + `fcIt.prop([...])(name, fn)` style the repo already uses |
| `@playwright/test` | 1.61.1 | Production-build worker smoke | Separate `playwright.prod.config.ts` |
| `node:crypto`, `node:zlib` | Node >= 22.2 for `zlib.crc32` | Independent oracles | Differential tests only (never imported by app code) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| noble + hand-rolled CRC32 | `hash-wasm` | Rejected by user (locked). ~5x faster but async/WASM/CSP complexity. The `engine.ts` seam keeps a future swap to one file |
| `crc-32` npm package | hand-rolled | Rejected (locked): 20 lines, adds a dependency + Apache-2.0 license for nothing |
| cooperative abort (AbortController checked between chunks) | `worker.terminate()` per cancel | Cooperative verified fast (68 ms). Terminate is a viable *backstop* (hung `Blob.arrayBuffer()` on an unreadable file), not the primary path |
| in-thread fallback client (dynamic `import("./engine")`) | none | **Recommend NOT building** in Phase 8 (see Open Questions Q2): it would put a second noble-bearing chunk behind the main-thread bundle and weakens the "worker chunk only" boundary |

**Installation:**
```bash
npm install --save-exact @noble/hashes@2.4.0
```
Verified in the scratch copy with npm 11.10.1 (same as CI's `NPM_VERSION`): the resulting `package-lock.json` diff is only the root dependency line plus one `node_modules/@noble/hashes` block, no churn.

**Version verification:** `npm view @noble/hashes dist-tags` -> `{ "latest": "2.4.0" }`; `npm view @noble/hashes@2.4.0 license dependencies sideEffects` -> `MIT`, no dependencies, `false` [VERIFIED: npm registry, 2026-10-14].

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@noble/hashes` | npm | multi-year (2.4.0 published 2026-08-27) | ~97.1M/wk | github.com/paulmillr/noble-hashes | OK (`deprecated: false`, `postinstall: null`) | Approved (also a locked user decision) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
No other packages are added. `gsd_run query package-legitimacy check --ecosystem npm @noble/hashes` returned `verdict: "OK"`, `reasons: []`.

## Architecture Patterns

### System Architecture Diagram

```
                           (Phase 9/10 UI will sit here; Phase 8 uses a test harness)
   caller (harness / future useHashJob)
        |  client.start({kind:"text"|"file"}, {onProgress})   client.cancel()   client.dispose()
        v
+-------------------------------------------------------------------+
| MAIN THREAD   lib/hash/client.ts  (imports: types only)           |
|   seq counter + `current` job; start() = cancelCurrent() THEN post |
|   drops any message whose jobId != current.id (stale/superseded)   |
|   lazy: Worker created on first start(); dispose() terminates      |
+----------------------+--------------------------------------------+
                       | postMessage {type:"start"|"cancel", jobId, input}
                       v                       ^ {progress|result|cancelled|error, jobId}
+-------------------------------------------------------------------+
| WORKER THREAD   lib/hash/hash.worker.ts  (3-line adapter)         |
|   -> worker-core.ts  createWorkerHandler(post)                     |
|        Map<jobId, AbortController>; registers BEFORE first await   |
|        text -> encodeText() -> bytesChunks()   file -> blobChunks()|
|        -> job.ts runHashJob(source, {signal,onProgress,yieldFn})   |
|             for each 1 MiB chunk: check signal, update x10,        |
|             progress, await yieldToEventLoop()  (lets "cancel"     |
|             message be delivered)                                  |
|        -> engine.ts FACTORIES: Record<AlgorithmId, () => Hasher>  |
|             @noble/hashes/{sha2,sha3,legacy}.js + crc32.ts         |
+-------------------------------------------------------------------+
Import boundaries (mechanically enforced):
  @noble/hashes  <- engine.ts ONLY            (ESLint no-restricted-imports + source-walk test)
  engine.ts      <- job.ts ONLY (non-test)    (source-walk test)
  job.ts         <- worker-core.ts ONLY (non-test)
  client.ts imports types only; algorithms.ts / format.ts / types.ts / source.ts are noble-free
```

### Recommended Project Structure
```
lib/hash/
├── types.ts              # AlgorithmId, Hasher, Digests, HashInput, WorkerRequest/Response unions
├── algorithms.ts         # ALGORITHMS metadata + ALGORITHM_IDS (NO noble import; server-safe)
├── crc32.ts              # createCrc32(): Hasher  + crc32.test.ts
├── engine.ts             # FACTORIES (the ONLY @noble/hashes importer)
├── format.ts             # toHex(bytes), digestsToHex(digests)  (lowercase hex only in Phase 8)
├── source.ts             # CHUNK_SIZE, encodeText (sole TextEncoder), bytesChunks, blobChunks
├── job.ts                # runHashJob + yieldToEventLoop (+ test-only convenience hashText/hashBytes)
├── worker-core.ts        # createWorkerHandler(post) - protocol + abort bookkeeping
├── hash.worker.ts        # self.onmessage adapter (excluded from unit tests; covered by prod e2e)
├── client.ts             # createHashClient + the ONLY `new Worker(new URL(...))` literal
├── engine.test.ts        # vectors, boundaries, keccak negative, UTF-8, chunk-split + oracle properties
├── crc32.test.ts, source.test.ts, job.test.ts, worker-core.test.ts, client.test.ts
└── boundaries.test.ts    # import-graph guard (source walk)
app/hash-smoke/           # Phase-8-only, env-gated harness (replaced by /tools/hash in Phase 9)
├── page.tsx              # notFound() unless process.env.HASH_SMOKE === "1"; robots noindex
└── HashSmoke.tsx         # "use client": runs text + Blob jobs through createHashClient, exposes window.__c
tests/e2e-prod/hash-worker.spec.ts      # production-build spec (separate dir => default config never sees it)
playwright.prod.config.ts               # build + start + HASH_SMOKE=1
```
Naming follows precedent: flat `lib/<domain>/{types,parse,format,...}.ts` with co-located `*.test.ts`, no barrel `index.ts` files [VERIFIED: ls lib/uuid lib/mac lib/dns lib/subnet this session].

### Repo conventions (read this session)
- Tests: `import { describe, expect, it } from "vitest"` explicitly even though `globals: true`; property tests via `import { fc, it as fcIt } from "@fast-check/vitest"` then `fcIt.prop([...])("name", (...) => {...})` [VERIFIED: lib/uuid/generate.test.ts:1-3 and the `fcIt.prop(` usage].
- `vitest.config.ts` (verbatim): `environment: "jsdom"`, `globals: true`, `include: ["**/*.test.{ts,tsx}"]`, `exclude: ["node_modules", ".next", "tests/e2e/**"]`, plugins `[tsconfigPaths(), react()]`. [VERIFIED: vitest.config.ts:7-13]
- No test file in the repo currently uses a `@vitest-environment` docblock [VERIFIED: grep of lib/ app/ components/ tools/ returned nothing]. Introducing `// @vitest-environment node` for `lib/hash/*` is a new but zero-risk convention (verified working on vitest 4.1.10).
- `playwright.config.ts` (verbatim): `testDir: "./tests/e2e"`, `baseURL: "http://localhost:3000"`, single `chromium` project, `webServer.command: "npm run dev"`, `reuseExistingServer: !process.env.CI`. So **today every e2e runs against the dev server, never a production build.** [VERIFIED: playwright.config.ts:3-27]
- `tsconfig.json` (verbatim): `"target": "ES2020"`, `"lib": ["dom", "dom.iterable", "esnext"]`, `"moduleResolution": "bundler"`, `"strict": true`; `include` has `**/*.ts` so test files are type-checked by `next build`/`tsc`. No `webworker` lib. [VERIFIED: tsconfig.json]
- CI (`.github/workflows/ci.yml`): jobs `typecheck`, `lint`, `test`, `build`, `e2e`; `NODE_VERSION: "22"`, `NPM_VERSION: "11.10.1"`; e2e job runs `npx playwright install --with-deps` then `npm run test:e2e`. [VERIFIED: ci.yml]
- Exact pins are the norm for runtime deps (`"next": "16.2.11"`, `"react": "19.2.8"`, `"uuid": "14.0.1"`). [VERIFIED: package.json]
- Lint stack: `eslint` 9.39.5 + `eslint-config-next` 16.2.11, flat config `eslint.config.mjs` using `defineConfig`. TypeScript is 6.0.3 (not the 7.x CLAUDE.md quotes). [VERIFIED: package.json, eslint.config.mjs]

### Pattern 1: noble v2 engine seam (the only noble importer)
**What:** One file maps `AlgorithmId` to a fresh-hasher factory; `Record<AlgorithmId, ...>` makes "metadata added, factory forgotten" a compile error.
**Verified subpaths and exports** [VERIFIED: `package.json` exports list printed this session: `. ./_md.js ./argon2.js ./blake1.js ./blake2.js ./blake3.js ./eskdf.js ./hkdf.js ./hmac.js ./legacy.js ./pbkdf2.js ./scrypt.js ./sha2.js ./sha3-addons.js ./sha3.js ./webcrypto.js ./utils.js`]:
```
legacy.d.ts:41:  export declare const sha1: TRet<CHash>;
legacy.d.ts:73:  export declare const md5: TRet<CHash>;
legacy.d.ts:107: export declare const ripemd160: TRet<CHash>;
sha2.d.ts:113:   export declare const sha256: TRet<CHash<_SHA256>>;
sha2.d.ts:125:   export declare const sha224: TRet<CHash<_SHA224>>;
sha2.d.ts:137:   export declare const sha512: TRet<CHash<_SHA512>>;
sha2.d.ts:149:   export declare const sha384: TRet<CHash<_SHA384>>;
sha3.d.ts:83:    export declare const sha3_256: TRet<CHash>;
sha3.d.ts:107:   export declare const sha3_512: TRet<CHash>;
```
Imports must carry the `.js` suffix (`"@noble/hashes/sha2.js"`); there is no suffix-less export. MD5, SHA-1 and RIPEMD-160 live in `legacy.js`, **not** `sha2.js`/`sha1.js`. `sha3.js` also exports `keccak_256` (never import it in app code; the Keccak negative test uses a hard-coded constant).
**Instance API** [VERIFIED: node run this session]: `h = sha256.create(); h.update(Uint8Array) -> returns this; h.digest() -> fresh Uint8Array`. After `digest()` both `update()` and `digest()` throw `Error: hash was destroyed`. `update("abc")` throws `TypeError: expected Uint8Array, got type=string` (so a string can never silently bypass `encodeText`). A `subarray` view with non-zero `byteOffset` hashes correctly. Block sizes: SHA3-256 `blockLen` 136, SHA3-512 `blockLen` 72 (= the rate boundaries to test, +/-1).
**Cross-realm:** under jsdom `new TextEncoder().encode("x") instanceof Uint8Array` is `false`, yet noble accepts it (verified; digests correct). No special handling needed.

### Pattern 2: Supersede funnel in `client.ts`
**What:** `start()` always begins with `cancelCurrent()`: resolve the predecessor as `cancelled`, post `{type:"cancel", jobId: old}`, *then* post `{type:"start", jobId: new}`. Messages whose `jobId !== current.id` are dropped. `dispose()` = `cancelCurrent()` + `terminate()` + `disposed = true`, after which `start()` resolves `cancelled` without ever creating a worker. Worker is created lazily on first `start()`; `onerror` (e.g. chunk 404, CSP) resolves the current job as `error` and discards the worker so the next `start()` builds a fresh one; a factory that throws yields an `error` outcome, not an exception.
**Why promise-with-outcome:** `Promise<{status:"done"|"cancelled"|"error"}>` makes "a superseded or disposed job never delivers a result" a one-line assertion (`await` it, expect `cancelled`) and composes with the project's existing `requestSeqRef` guard pattern in the Phase 9 hook. Callback style is acceptable if the planner prefers; the invariants (single funnel, id-filter) are what matter.
**Message order is the cancel guarantee:** `postMessage` is FIFO, so the worker sees `cancel(old)` before `start(new)`; `worker-core` registers the job's `AbortController` synchronously (before its first `await`) so a `cancel` can never overtake its own `start`.

### Pattern 3: Cooperative cancel needs a real macrotask yield
A `cancel` message is a macrotask; a loop that only awaits resolved promises starves `onmessage`. `runHashJob` therefore `await`s `yieldToEventLoop()` after every 1 MiB chunk. Use a `MessageChannel` round-trip (no 4 ms `setTimeout` clamp). Tests inject `yieldFn: async () => {}`. Measured in Chrome: start a 96 MiB text job, supersede it after 300 ms with a tiny job, the tiny job completes in 68 ms (the old job would have needed ~7 s at 14 MB/s) [VERIFIED: playwright run this session].

### Pattern 4: Worker construction literal and the `{ type: "module" }` question
`client.ts` contains the only `new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" })`. Keep `new URL(...)` lexically inside the `new Worker(...)` call (a function body that is only invoked lazily is fine; Turbopack still emitted the worker). In the built page chunk Turbopack rewrote it to `t.r(38104)(Worker,{type:"module"})` and the worker bootstrap (`turbopack-worker-*.js`) loads the entry chunks with `importScripts` while *refusing foreign origins* ("Refusing to load script from foreign origin"). Despite the `importScripts`-based bootstrap, **`{ type: "module" }` runs correctly in Chrome on production (`next start`) and dev** [VERIFIED: built + ran; digests for all 10 algorithms and a 3 MiB+5 byte Blob matched `node:crypto`/`zlib.crc32`]. Firefox and Safari were not exercised (the repo's Playwright config only has Chromium) [ASSUMED: they behave the same].

### Anti-Patterns to Avoid
- **Importing `engine.ts`/noble from `client.ts`, a component, `page.tsx`, `algorithms.ts`, or `format.ts`:** silently ships ~19 KB into initial JS. Guarded by the two boundary checks.
- **Hashing text on the main thread "because it is small":** two code paths and noble in the main bundle (violates HASH-04).
- **Re-using a noble hasher after `digest()`:** it throws. Always build a fresh hasher set per job (`FACTORIES[id]()`).
- **Cancel by "ignoring the result" only:** the worker keeps burning CPU; always abort in the worker too.
- **`file.stream()` or `crypto.subtle.digest` as the file path:** `Blob.stream` is `undefined` in jsdom (verified) and `subtle.digest` is one-shot and covers 4 of 10 algorithms.
- **Putting the million-character input in a test title:** `it.each([[id, text, hex]])` with `%j` formatting produced a 64 KB failure report in the mutation run. Use short labels.
- **`structuredClone` of a `Blob` in a jsdom-environment loopback:** produced an *empty-input digest* (`00000000` CRC) silently. Keep loopback/worker-core tests in `// @vitest-environment node`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MD5, SHA-1/2, SHA-3, RIPEMD-160 | Any custom compression function | `@noble/hashes` v2 via `engine.ts` | Padding, endianness, sponge rate bugs; noble is audited and vector-tested |
| Independent test oracles | A second JS implementation | `node:crypto` `createHash(...)` and `node:zlib` `crc32` (Node >= 22.2, supports chaining `crc32(data, prev)`) | Native OpenSSL/zlib implementations are genuinely independent |
| Worker bundling | A hand-built Worker blob/URL, `next.config` tweaks, `experimental` flags | The static `new Worker(new URL(...))` literal | Turbopack emits the bootstrap + chunk graph; `next.config.ts` stays empty |
| Hex encoding | Per-digit `toString(16)` without padding | One `toHex` with a 256-entry padded table | `toString(16)` drops leading zeros (the classic CRC bug; `crc32("62")` = `0012d20a`) |
| Progress/cancel RPC | `comlink` or similar | ~60-line typed discriminated-union protocol | One-shot job + progress; a dependency buys nothing |

**Key insight:** The only code this phase owns that is not a thin adapter is CRC32 (non-cryptographic, ~20 lines) and the supersede funnel. Both are small enough to exhaustively test; everything cryptographic is delegated.

**CRC32 specifics** (hand-roll rules, all verified): reflected poly `0xEDB88320`, 256-entry `Uint32Array` table, init `0xFFFFFFFF`, final XOR once per *job* (not per chunk), output `(crc ^ 0xFFFFFFFF) >>> 0` as 4 big-endian bytes so `toHex` always yields 8 zero-padded lowercase hex digits (never signed, never short). Use the same single-use semantics as noble (throw after `digest()`).

## Runtime State Inventory

Not applicable. This is a greenfield addition (no rename/refactor/migration). No stored data, live service config, OS-registered state, secrets/env vars (the only new env var is the build-time test flag `HASH_SMOKE`, which holds no secret), or renamed build artifacts are involved. The only pre-existing artifact worth noting: a normal `next build` will emit an unreachable worker chunk plus a raw copy of `hash.worker.ts` under `.next/static/media/` (see Pitfall 6) until Phase 9 wires the real page.

## Common Pitfalls

### Pitfall 1: Real Chromium/Playwright and `node_modules` on this machine are not in a runnable state
**What goes wrong:** In the real repo at `/Users/mwallraf/Documents/dev/packetory.dev`, `npx vitest run` fails with `Could not resolve 'vitest/config'` and `npx playwright --version` fails with `Cannot find module 'playwright/lib/program'`. `node_modules` contains 183 directories with a literal ` 2` suffix (e.g. `node_modules/zod/v4 2`, `node_modules/playwright/lib 2`) and the repo carries the `com.apple.fileprovider.dir` extended attribute: the project lives under `~/Documents`, which iCloud File Provider syncs and conflict-duplicates.
**Why it happens:** iCloud sync conflict copies inside `node_modules`.
**How to avoid:** Wave 0 / first task: `rm -rf node_modules && npm ci` (CI uses `npm ci` with npm 11.10.1; local npm is also 11.10.1). Consider that this can recur; a durable fix (moving the repo out of iCloud, or a `node_modules.nosync` symlink) is a user decision, flagged in Open Questions. **All verification in this research was done in a scratch copy under `/private/tmp/...`, not in the repo.**
**Warning signs:** `UNRESOLVED_IMPORT` on `vitest/config`; directories named `* 2`.

### Pitfall 2: Default e2e runs against `next dev`, so the criterion-5 production proof does not exist yet
**What goes wrong:** `npm run test:e2e` starts `npm run dev`. A worker test there passes even when the production worker chunk is broken (the classic dev-works/prod-breaks failure).
**How to avoid:** Separate `playwright.prod.config.ts` + `tests/e2e-prod/` directory (the default config's `testDir: "./tests/e2e"` and vitest's `include: ["**/*.test.{ts,tsx}"]` never pick it up) + a `test:e2e:prod` npm script + one extra CI step in the existing `e2e` job (it already runs `npx playwright install --with-deps`). Use `reuseExistingServer: false` so a stray dev server can never satisfy it. Do not run it concurrently with `next dev` in the same checkout (shared `.next` output). Pick a free port; **3100 is occupied by an `ssh` tunnel on the developer machine** (a curl to it returned `X-Powered-By: Express`, not Next); 3101 or any other free port is fine.

### Pitfall 3: SHA3 vs Keccak, and a test that cannot fail
**What goes wrong:** `sha3.js` exports both `sha3_256` and `keccak_256`; an import typo yields Keccak and still "hashes".
**How to avoid:** Pin `SHA3-256("")` = `a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a` and assert it is *not* `c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470` (and likewise for SHA3-512). **Mutation-verified:** swapping the engine's `sha3_256` for `keccak_256` made 24 tests fail, so the negative test has teeth. Do not import `keccak_*` anywhere; keep the Keccak values as string constants.

### Pitfall 4: Test-environment mismatch (jsdom vs node)
**What goes wrong:** the repo default is jsdom. In jsdom `Blob.stream` is `undefined` (verified), `Worker` is `undefined` (verified), `TextEncoder().encode()` returns a cross-realm `Uint8Array` (works, but `instanceof` is false), and `structuredClone(Blob)` silently loses the Blob (empty digest).
**How to avoid:** put `// @vitest-environment node` as line 1 of every `lib/hash/*.test.ts`. Phase 9/10 *component* tests (jsdom) must inject a `FakeWorker` via `createHashClient({ createWorker })`, never rely on `Worker` or a structured-cloning loopback. `blobChunks` itself only needs `Blob.slice().arrayBuffer()` which jsdom has (verified `slice(1,3).arrayBuffer()` -> 2 bytes).

### Pitfall 5: Oracle availability (Node version and OpenSSL)
**What goes wrong:** `zlib.crc32` needs Node >= 22.2; `createHash("ripemd160")` can throw on OpenSSL builds without the algorithm.
**State:** local Node v22.13.1 / OpenSSL 3.0.15: both present [VERIFIED: ran]. CI sets `NODE_VERSION: "22"` which `actions/setup-node` resolves to the newest 22.x [ASSUMED: standard setup-node behavior, not re-fetched].
**How to avoid:** a hard test `expect(typeof zlib.crc32).toBe("function")` (fail loudly, never skip, on an old Node); wrap only the *RIPEMD-160* oracle in try/catch (skip that single comparison; the pinned published RIPEMD-160 vectors still run). Do not add an `engines` field (Vercel warns and nothing else enforces it).

### Pitfall 6: Unreferenced build artifacts are emitted even when the harness 404s
A normal build (no `HASH_SMOKE`) still emits the worker chunk (27 chunk files observed vs 22 without the harness) and a raw `.ts` copy at `.next/static/media/hash.worker.<hash>.ts` (1.4 KB). It is harmless (no secrets, source is public anyway) and disappears from consideration once Phase 9 makes the worker reachable. Do not "fix" it.

### Pitfall 7: Port/process hygiene when running `next start` in tests
`playwright.prod.config.ts` should set `webServer.env: { HASH_SMOKE: "1" }` (applies to both `next build` and `next start`), `timeout` >= 180 s (build + start), and `reuseExistingServer: false`.

### Pitfall 8: Worker errors must not echo user text
The `error` message carries `e.message` from noble/DOM (e.g. `expected Uint8Array`, `NotReadableError`), never user content. Keep it that way (Phase 9/10 may surface it in the UI; Vercel Analytics must never see text).

### Pitfall 9: Lone surrogates
`TextEncoder` encodes a lone surrogate (`"\ud83d"`) as `EF BF BD` (U+FFFD). `printf` can't produce a lone surrogate, so this is pinned as documented behavior: `sha256("\ud83d")` equals `sha256(bytes EF BF BD)` (`83d544ccc223c057...` prefix verified). Do not "fix" it; do not trim/normalize.

## Code Examples

All files below were typechecked (`tsc --noEmit`, TS 6.0.3), linted (`eslint` with the boundary rule), unit-tested (47 tests green, plus `boundaries.test.ts`), built with `next build` (Turbopack), and exercised in real Chrome on `next start` and `next dev`. They are a reference for the planner, not a mandate for exact code; the invariants called out in comments are the contract.

### `lib/hash/types.ts`
```ts
export type AlgorithmId =
  | "md5" | "sha1" | "sha224" | "sha256" | "sha384" | "sha512"
  | "sha3-256" | "sha3-512" | "ripemd160" | "crc32";

/** Structural subset shared by noble hashers and our CRC32 (noble's update() returns `this`). */
export type Hasher = { update(chunk: Uint8Array): unknown; digest(): Uint8Array };

export type Digests = Record<AlgorithmId, Uint8Array>;
export type HashInput = { kind: "text"; text: string } | { kind: "file"; file: Blob };

export type WorkerRequest =
  | { type: "start"; jobId: number; input: HashInput }
  | { type: "cancel"; jobId: number };
export type WorkerResponse =
  | { type: "progress"; jobId: number; done: number; total: number }
  | { type: "result"; jobId: number; digests: Digests }
  | { type: "cancelled"; jobId: number }
  | { type: "error"; jobId: number; name: string; message: string };
```

### `lib/hash/algorithms.ts` (metadata only; NO noble import)
```ts
import type { AlgorithmId } from "./types";
export const ALGORITHMS = [
  { id: "md5", label: "MD5", bits: 128, notForSecurity: true },
  { id: "sha1", label: "SHA-1", bits: 160, notForSecurity: true },
  { id: "sha224", label: "SHA-224", bits: 224, notForSecurity: false },
  { id: "sha256", label: "SHA-256", bits: 256, notForSecurity: false },
  { id: "sha384", label: "SHA-384", bits: 384, notForSecurity: false },
  { id: "sha512", label: "SHA-512", bits: 512, notForSecurity: false },
  { id: "sha3-256", label: "SHA3-256", bits: 256, notForSecurity: false },
  { id: "sha3-512", label: "SHA3-512", bits: 512, notForSecurity: false },
  { id: "ripemd160", label: "RIPEMD-160", bits: 160, notForSecurity: false },
  { id: "crc32", label: "CRC32", bits: 32, notForSecurity: true },
] as const satisfies readonly { id: AlgorithmId; label: string; bits: number; notForSecurity: boolean }[];
export const ALGORITHM_IDS: readonly AlgorithmId[] = ALGORITHMS.map((a) => a.id);
```
(Display order = this order. A unit test should assert `ALGORITHM_IDS` equals `Object.keys(FACTORIES)` as a set and that hex length === `bits / 4` for every algorithm.)

### `lib/hash/crc32.ts`
```ts
import type { Hasher } from "./types";
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function createCrc32(): Hasher {
  let crc = 0xffffffff; // init ONCE per job
  let done = false;
  return {
    update(chunk) {
      if (done) throw new Error("hash was destroyed");
      for (let i = 0; i < chunk.length; i++) crc = TABLE[(crc ^ chunk[i]!) & 0xff]! ^ (crc >>> 8);
      return this;
    },
    digest() {
      if (done) throw new Error("hash was destroyed");
      done = true;
      const v = (crc ^ 0xffffffff) >>> 0; // final XOR ONCE, unsigned
      return new Uint8Array([v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]); // big-endian
    },
  };
}
```

### `lib/hash/engine.ts` (the ONLY noble importer)
```ts
import { sha224, sha256, sha384, sha512 } from "@noble/hashes/sha2.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { md5, ripemd160, sha1 } from "@noble/hashes/legacy.js";
import { createCrc32 } from "./crc32";
import type { AlgorithmId, Hasher } from "./types";
export const FACTORIES: Record<AlgorithmId, () => Hasher> = {
  md5: () => md5.create(), sha1: () => sha1.create(), sha224: () => sha224.create(),
  sha256: () => sha256.create(), sha384: () => sha384.create(), sha512: () => sha512.create(),
  "sha3-256": () => sha3_256.create(), "sha3-512": () => sha3_512.create(),
  ripemd160: () => ripemd160.create(), crc32: createCrc32,
};
```

### `lib/hash/source.ts`
```ts
export const CHUNK_SIZE = 1 << 20; // 1 MiB
const encoder = new TextEncoder();
/** The ONE UTF-8 choke point: no trim, no normalize. Lone surrogates become U+FFFD (EF BF BD). */
export function encodeText(text: string): Uint8Array { return encoder.encode(text); }
export function* bytesChunks(bytes: Uint8Array, chunkSize = CHUNK_SIZE): Generator<Uint8Array> {
  if (!(chunkSize >= 1)) throw new RangeError("chunkSize must be >= 1");
  for (let off = 0; off < bytes.length; off += chunkSize) yield bytes.subarray(off, off + chunkSize);
}
export async function* blobChunks(blob: Blob, chunkSize = CHUNK_SIZE): AsyncGenerator<Uint8Array> {
  if (!(chunkSize >= 1)) throw new RangeError("chunkSize must be >= 1");
  for (let off = 0; off < blob.size; off += chunkSize) {
    yield new Uint8Array(await blob.slice(off, off + chunkSize).arrayBuffer()); // never the whole file
  }
}
```

### `lib/hash/job.ts`
```ts
import { ALGORITHM_IDS } from "./algorithms";
import { FACTORIES } from "./engine";
import type { Digests } from "./types";

const abortError = () => new DOMException("Hash job aborted", "AbortError");
/** MessageChannel macrotask yield: delivers a pending "cancel" message; no 4ms setTimeout clamp. */
export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => { port1.close(); resolve(); };
    port2.postMessage(null);
  });
}
export type JobOptions = {
  total?: number; signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
  yieldFn?: () => Promise<void>;           // tests inject `async () => {}`
};
export async function runHashJob(
  source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
  { total = 0, signal, onProgress, yieldFn = yieldToEventLoop }: JobOptions = {},
): Promise<Digests> {
  const hashers = ALGORITHM_IDS.map((id) => [id, FACTORIES[id]()] as const); // fresh per job: single-use
  let done = 0;
  for await (const chunk of source) {
    if (signal?.aborted) throw abortError();
    for (const [, h] of hashers) h.update(chunk);   // one read feeds all 10 hashers
    done += chunk.length;
    onProgress?.(done, total);
    await yieldFn();
  }
  if (signal?.aborted) throw abortError();
  return Object.fromEntries(hashers.map(([id, h]) => [id, h.digest()])) as Digests;
}
```
Design note: the `algos` subset parameter from earlier research was dropped (YAGNI; always all 10, `Digests` stays a total `Record`). Re-add only if Phase 10 profiling demands a multi-worker split.

### `lib/hash/worker-core.ts` and `hash.worker.ts`
```ts
// worker-core.ts
import { blobChunks, bytesChunks, encodeText } from "./source";
import { runHashJob, type JobOptions } from "./job";
import type { WorkerRequest, WorkerResponse } from "./types";

export function createWorkerHandler(
  post: (m: WorkerResponse) => void,
  jobDefaults: Pick<JobOptions, "yieldFn"> = {},
) {
  const jobs = new Map<number, AbortController>();
  return async function handle(msg: WorkerRequest): Promise<void> {
    if (msg.type === "cancel") { jobs.get(msg.jobId)?.abort(); return; }
    const { jobId } = msg;
    const ac = new AbortController();
    jobs.set(jobId, ac);                 // register synchronously, before the first await
    try {
      let source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>;
      let total: number;
      if (msg.input.kind === "text") { const b = encodeText(msg.input.text); source = bytesChunks(b); total = b.length; }
      else { source = blobChunks(msg.input.file); total = msg.input.file.size; }
      let last = 0;
      const digests = await runHashJob(source, {
        ...jobDefaults, total, signal: ac.signal,
        onProgress: (done, t) => {       // throttle ~10 Hz; always emit the final tick
          const now = Date.now();
          if (now - last >= 100 || done === t) { last = now; post({ type: "progress", jobId, done, total: t }); }
        },
      });
      post({ type: "result", jobId, digests });
    } catch (e) {
      if (ac.signal.aborted) post({ type: "cancelled", jobId });
      else post({ type: "error", jobId, name: (e as Error).name, message: (e as Error).message });
    } finally { jobs.delete(jobId); }
  };
}

// hash.worker.ts  (the whole file)
import { createWorkerHandler } from "./worker-core";
import type { WorkerRequest, WorkerResponse } from "./types";
const handle = createWorkerHandler((m: WorkerResponse) => self.postMessage(m));
self.onmessage = (ev: MessageEvent<WorkerRequest>) => { void handle(ev.data); };
```
(`self.postMessage(m)` typechecks under the repo's `lib: ["dom", ...]` with no `webworker` lib. Verified by `tsc` and `next build`'s TS pass.)

### `lib/hash/client.ts`
```ts
import type { Digests, HashInput, WorkerRequest, WorkerResponse } from "./types";

export type WorkerLike = {
  postMessage(msg: WorkerRequest): void;
  terminate(): void;
  onmessage: ((ev: { data: WorkerResponse }) => void) | null;
  onerror: ((ev: { message?: string }) => void) | null;
};
export type HashOutcome =
  | { status: "done"; digests: Digests }
  | { status: "cancelled" }
  | { status: "error"; name: string; message: string };
export type HashClient = {
  start(input: HashInput, opts?: { onProgress?: (done: number, total: number) => void }): Promise<HashOutcome>;
  cancel(): void;
  dispose(): void;
};

/** The ONLY `new Worker(new URL(...))` literal in the codebase (bundlers need the static shape). */
export function createDefaultWorker(): WorkerLike {
  return new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike;
}

export function createHashClient(opts: { createWorker?: () => WorkerLike } = {}): HashClient {
  const make = opts.createWorker ?? createDefaultWorker;
  let worker: WorkerLike | null = null;
  let disposed = false;
  let seq = 0;
  let current: { id: number; resolve: (o: HashOutcome) => void; onProgress?: (d: number, t: number) => void } | null = null;

  function settle(o: HashOutcome) { const c = current; current = null; c?.resolve(o); }
  function cancelCurrent() {
    if (!current) return;
    const { id } = current;
    settle({ status: "cancelled" });
    worker?.postMessage({ type: "cancel", jobId: id });
  }
  function ensureWorker(): WorkerLike {
    if (worker) return worker;
    const w = make();
    w.onmessage = (ev) => {
      const m = ev.data;
      if (!current || m.jobId !== current.id) return;          // stale: superseded/disposed/unknown
      if (m.type === "progress") current.onProgress?.(m.done, m.total);
      else if (m.type === "result") settle({ status: "done", digests: m.digests });
      else if (m.type === "cancelled") settle({ status: "cancelled" });
      else settle({ status: "error", name: m.name, message: m.message });
    };
    w.onerror = (ev) => {
      settle({ status: "error", name: "WorkerError", message: ev.message ?? "Worker failed" });
      w.terminate();
      if (worker === w) worker = null;                          // next start() builds a fresh worker
    };
    worker = w;
    return w;
  }
  return {
    start(input, o) {
      cancelCurrent();                                          // THE single supersede funnel
      if (disposed) return Promise.resolve({ status: "cancelled" });
      let w: WorkerLike;
      try { w = ensureWorker(); }
      catch (e) { return Promise.resolve({ status: "error", name: (e as Error).name, message: (e as Error).message }); }
      const id = ++seq;
      return new Promise<HashOutcome>((resolve) => {
        current = { id, resolve, onProgress: o?.onProgress };
        w.postMessage({ type: "start", jobId: id, input });
      });
    },
    cancel: cancelCurrent,
    dispose() { cancelCurrent(); disposed = true; worker?.terminate(); worker = null; },
  };
}
```

### Fake-Worker test pattern (`client.test.ts`, node env)
```ts
// @vitest-environment node
class FakeWorker implements WorkerLike {
  posted: WorkerRequest[] = []; terminated = false;
  onmessage: WorkerLike["onmessage"] = null; onerror: WorkerLike["onerror"] = null;
  postMessage(m: WorkerRequest) { this.posted.push(m); }
  terminate() { this.terminated = true; }
  emit(data: WorkerResponse) { this.onmessage?.({ data }); }
}
const setup = () => { const workers: FakeWorker[] = [];
  const createWorker = vi.fn(() => { const w = new FakeWorker(); workers.push(w); return w; });
  return { client: createHashClient({ createWorker }), workers, createWorker }; };

// start(A); start(B)  =>  posted order is exactly start:1, cancel:1, start:2
// late result for job 1 is dropped; A resolves { status: "cancelled" } and never "done"
// cancel() posts cancel, late result dropped; dispose() terminates, later start() => cancelled and
//   the factory is NOT called again; progress forwarded only for the current job;
// worker `error` msg => { status:"error" }; worker.onerror => error + fresh worker on next start;
// factory throwing => error outcome (not an exception); worker is created lazily and once.
```
Plus a **loopback** worker (`postMessage` -> `setTimeout` -> real `createWorkerHandler` -> `setTimeout` -> `onmessage`) for end-to-end protocol tests with real hashing: supersede an 8 MiB text job with `"abc"` (expect `cancelled` then SHA-256 `ba7816bf...15ad`) and a `Blob` job (CRC32 of `abc` = `352441c2`). All 10 client tests plus loopback passed.

### Boundary guards
```js
// eslint.config.mjs: add a block (verified: flags app/bad/x.ts, allows lib/hash/engine.ts)
{
  files: ["**/*.{ts,tsx}"],
  ignores: ["lib/hash/engine.ts"],
  rules: { "no-restricted-imports": ["error", { patterns: [
    { group: ["@noble/hashes", "@noble/hashes/*"], message: "Import @noble/hashes only from lib/hash/engine.ts" },
  ] }] },
},
```
```ts
// lib/hash/boundaries.test.ts (node env) - walk app/ components/ lib/ tools/ for .ts/.tsx, then assert:
//  1. files matching /from\s+["']@noble\/hashes/ === ["lib/hash/engine.ts"]
//  2. non-test importers of ./engine === ["lib/hash/job.ts"]   (recommend ALSO: non-test importers of ./job === ["lib/hash/worker-core.ts"])
//  3. client.ts source does not match /from\s+["']\.\/(engine|job|worker-core)["']/
// exclude the test file itself from the scan (it contains the pattern text).
```
(Variants 1-3 as written passed in the scratch repo; add the `./job` importer assertion when finalizing.)

### Production-build Playwright spec (`tests/e2e-prod/hash-worker.spec.ts`) - assertions to implement
```ts
// playwright.prod.config.ts (sketch)
export default defineConfig({
  testDir: "./tests/e2e-prod",
  use: { baseURL: "http://localhost:3101" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start -- -p 3101",
    url: "http://localhost:3101", reuseExistingServer: false, timeout: 180_000,
    env: { HASH_SMOKE: "1" },
  },
});
// package.json: "test:e2e:prod": "playwright test -c playwright.prod.config.ts"
```
Spec body (all three assertions were executed and passed in real Chrome against `next start`):
1. `goto("/hash-smoke")`, record every `*.js` response body via `page.on("response")`, click the harness button, wait for output. Assert text digests (e.g. SHA-256 of `abc` = `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`) and compare the Blob job's 10 digests against `createHash(...)`/`zlib.crc32` computed in the spec process.
2. **Not in initial JS:** `markerChunks = responses whose body includes "hash was destroyed"` must have length >= 1 (non-vacuous: fails loudly if a noble upgrade changes the string) and *none* of them may appear in `await page.evaluate(() => performance.getEntriesByType("resource").map(e => e.name))`. Verified behavior: main-thread resource timing excludes worker-fetched scripts (the worker bootstrap `turbopack-worker-*.js` appeared in network responses but not in resource timing; the 21,284-byte noble chunk likewise).
3. **Cancel really stops CPU:** via `window.__c` start a 96 MiB text job, wait 300 ms, `await start({kind:"text", text:"abc"})`; the first promise resolves `cancelled`, the second `done`, and the second completes in well under 1 s (measured 67-68 ms; assert e.g. `< 2000`, not the exact figure).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@noble/hashes` v1 imports (`@noble/hashes/sha256`, `/sha1`, `/md5`) | v2: `.js`-suffixed subpaths; MD5/SHA-1/RIPEMD-160 in `legacy.js`; `update()` accepts only `Uint8Array` | noble-hashes 2.x | Wrong import paths fail at resolve time; strings can no longer be hashed directly |
| Worker created by blob URL / manual bundler config | Turbopack-native `new Worker(new URL(...))`, bootstrap served from the real origin | Next 16.2 | No `next.config` changes; verified here |
| `file.stream()` readers | `blob.slice().arrayBuffer()` loop | n/a (project choice) | Testable in jsdom/Node, trivial cancel, bounded memory |

**Deprecated/outdated:** `crypto-js` (discontinued), RFC 3720 vectors as an *IEEE* CRC-32 check (they are CRC-32C: `123456789` -> `e3069283`; IEEE is `cbf43926`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `NODE_VERSION: "22"` in CI resolves to a 22.x >= 22.2 at run time (actions/setup-node behavior, not re-fetched) | Pitfall 5 | `zlib.crc32` missing in CI; the hard `typeof zlib.crc32` test would fail loudly (acceptable) |
| A2 | Firefox and Safari run the Turbopack worker bootstrap + `{ type: "module" }` identically to Chrome | Pattern 4 | A browser-specific worker failure would surface only in manual cross-browser UAT; the client's `onerror` -> `error` outcome degrades gracefully |
| A3 | Production on Vercel serves worker chunks the same way `next start` does (static `/_next/static/chunks`) | Pattern 4 | Low; same build output. Confirm once in a Preview deployment when Phase 9 ships |
| A4 | Published-vector hex strings in the fixture table are exactly what the RFC/FIPS/reference documents print | Vector fixtures | Verified equal to OpenSSL (independent implementation) with 0 mismatches over 43 vectors; the spec PDFs were not re-fetched this session. A wrong *spec transcription* is therefore not possible without OpenSSL also being wrong |
| A5 | The env-gated `HASH_SMOKE` harness route is acceptable to the user as an interim, Phase-9-deleted artifact (alternatives in Open Questions) | Summary / Structure | If rejected, the planner needs another host page for criterion 5 |
| A6 | Absolute browser throughput is similar to Node/V8 (~14 MB/s all-10) | Pattern 3 | Only affects progress-UI sizing in Phase 10, not Phase 8 correctness |

## Open Questions (RESOLVED)

1. **How should criterion 5 be hosted given there is no tool route?**
   - What we know: needs a real page to construct the worker in a production build; `app/_x` private folders are not routable; env-gated `app/hash-smoke` (404 unless `HASH_SMOKE=1`) verified working and leaves the default build, sitemap, and nav untouched.
   - What's unclear: whether the user prefers shipping a permanent `noindex` page, or building the real `/tools/hash` shell early.
   - Recommendation: env-gated `app/hash-smoke` + `playwright.prod.config.ts`; delete the route and retarget the spec at `/tools/hash` in Phase 9.
   - **RESOLVED (adopted):** the env-gated `app/hash-smoke` harness + `playwright.prod.config.ts` is the criterion-5 host. Built in 08-01 (harness, prod config, prod spec); its gate (404 without `HASH_SMOKE=1`, noindex, absent from registry/sitemap/nav) is proven in 08-04. Phase 9 deletes the route.
2. **In-thread fallback client (no `Worker`)?** Earlier research proposed a dynamic `import("./engine")` fallback. Recommendation: skip it in Phase 8 (every supported browser has Workers; it adds a second noble-bearing chunk and weakens the boundary). The loopback/`FakeWorker` test doubles cover Phase 9 component tests instead. Revisit only if the client's `error` outcome shows real-world worker-construction failures.
   - **RESOLVED (not built in Phase 8):** no in-thread fallback is planned. The client's `onerror` / throwing-factory paths resolve an `error` outcome instead (08-01 implements, 08-03 tests); 08-04's boundary guard keeps `engine.ts` reachable only through the worker chain.
3. **Should the repo leave iCloud-synced `~/Documents`?** `node_modules` corruption (Pitfall 1) will recur. Out of Phase 8 scope; needs a user decision.
   - **RESOLVED (DEFERRED to user, out of plan scope):** moving the repo is a user decision and no plan performs it. Mitigated inside the phase by the Wave-0 `rm -rf node_modules && npm ci` repair in 08-01 and a per-plan install check (re-run `npm ci` when vitest or `@noble/hashes` is unresolvable) at the start of 08-02..08-05.
4. **`hashText`/`hashBytes` convenience helpers** (needed by Phase 9's `sampleDigests` unit test and by the vector tests): keep them in `job.ts` (inside the engine boundary, importable only by tests and `worker-core`). The boundary test must then allow only `*.test.ts` plus the worker chain. Confirm during planning.
   - **RESOLVED (confirmed):** `hashText`/`hashBytes` live in `job.ts` (08-01 implements them); 08-02's vector and property tests use them; 08-04's `boundaries.test.ts` allows only test files plus `worker-core.ts` to import `job.ts`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | v22.13.1 (CI: `22.x`) | — |
| npm | install | ✓ | 11.10.1 (equals CI `NPM_VERSION`) | — |
| `zlib.crc32` | HASH-03/04 differential oracle | ✓ | present in 22.13.1 (needs >= 22.2) | none; hard-fail test |
| `node:crypto` ripemd160 | RIPEMD-160 oracle | ✓ | OpenSSL 3.0.15 | try/catch skip that one comparison; pinned vectors still run |
| Google Chrome (stable) | local prod worker smoke | ✓ | `/Applications/Google Chrome.app` (used via `channel: "chrome"` in research) | `npx playwright install chromium` (CI does `--with-deps`) |
| Playwright-managed Chromium | repo e2e locally | ✗ | `~/Library/Caches/ms-playwright` absent | `npx playwright install chromium` |
| **Healthy `node_modules` in the repo** | all vitest/playwright/lint runs locally | ✗ | `vitest/config` unresolvable; `node_modules/playwright` has no `package.json`; 183 ` 2`-suffixed dirs (iCloud) | `rm -rf node_modules && npm ci` (Wave 0) |
| Free local port | prod e2e | ✓ | use 3101; 3100 is an `ssh` listener; 3000 is the dev-server port | any free port |

**Missing dependencies with no fallback:** none beyond the repair step.
**Missing dependencies with fallback:** repo `node_modules` (reinstall), Playwright Chromium (install).

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` (read this session), so this section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (+ fast-check 4.9.0 / @fast-check/vitest 0.4.1) for lib/protocol; Playwright 1.61.1 for the production worker proof |
| Config file | `vitest.config.ts` (unchanged; per-file `// @vitest-environment node`); NEW `playwright.prod.config.ts` |
| Quick run command | `npx vitest run lib/hash` |
| Full suite command | `npm run typecheck && npm run lint && npm test && npm run test:e2e:prod` (CI additionally runs `npm run build` and `npm run test:e2e`) |

### Phase Requirements -> Test Map
| Req ID / Success criterion | Behavior | Test Type | Automated Command | File Exists? |
|----------------------------|----------|-----------|-------------------|-------------|
| HASH-01 / SC1 | Every published vector, padding-boundary lengths (0,1,55,56,57,63,64,65,71,72,73,111,112,113,127,128,129,135,136,137), million-`a`, 0-byte, CRC32 unsigned 8-digit | unit (vectors + `node:crypto`/`zlib.crc32` differential) | `npx vitest run lib/hash/engine.test.ts` | ❌ Wave 0 |
| HASH-01 / SC1 (CRC) | `cbf43926`; leading-zero CRC (`"62"` -> `0012d20a`) keeps 8 chars; high-bit value not negative | unit | `npx vitest run lib/hash/crc32.test.ts` | ❌ Wave 0 |
| HASH-01 / SC2 | SHA3-256("") is `a7ffc6f8...f8434a`, never Keccak `c5d24601...`; same negative for SHA3-512 | unit (negative) | `npx vitest run lib/hash/engine.test.ts -t "SHA3"` | ❌ Wave 0 |
| HASH-02 / SC3 | `é`, `€`, `🚀`, NFC vs NFD differ, lone surrogate -> EF BF BD; equals `printf '%s' ... \| shasum -a 256` values | unit | `npx vitest run lib/hash/engine.test.ts -t "UTF-8"` and `lib/hash/source.test.ts` | ❌ Wave 0 |
| HASH-03 / SC4 | Any chunk split == one-shot == oracle for all 10 algorithms (fast-check); `blobChunks` with chunk sizes 1/63/64/65 | property + differential | `npx vitest run lib/hash/engine.test.ts lib/hash/source.test.ts lib/hash/job.test.ts` | ❌ Wave 0 |
| HASH-04 / SC5 (supersede, fake Worker) | start cancels predecessor first; superseded/disposed job never `done`; stale messages dropped; lazy single worker | unit (FakeWorker) | `npx vitest run lib/hash/client.test.ts` | ❌ Wave 0 |
| HASH-04 / SC5 (protocol) | worker-core abort/progress/error with real hashing via loopback | unit | `npx vitest run lib/hash/worker-core.test.ts lib/hash/job.test.ts` | ❌ Wave 0 |
| HASH-04 / SC5 (boundary) | `@noble/hashes` only in `engine.ts`; engine only via job -> worker-core | lint + unit | `npm run lint && npx vitest run lib/hash/boundaries.test.ts` | ❌ Wave 0 |
| HASH-04 / SC5 (prod worker) | In `next build` + `next start`: worker returns correct digests (text + Blob), noble chunk fetched by worker but absent from main-thread resource timing, superseding job completes fast | e2e (production build) | `npm run test:e2e:prod` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/hash` (sub-second to ~1 s measured: 47 tests in ~0.8 s)
- **Per wave merge:** `npm run typecheck && npm run lint && npm test`
- **Phase gate:** full suite above plus `npm run build` and `npm run test:e2e:prod` green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Repair local install: `rm -rf node_modules && npm ci` (Pitfall 1)
- [ ] `npm install --save-exact @noble/hashes@2.4.0` (updates `package.json` + `package-lock.json`)
- [ ] `lib/hash/{types,algorithms,crc32,engine,format,source,job,worker-core,hash.worker,client}.ts` and tests listed above
- [ ] ESLint `no-restricted-imports` block in `eslint.config.mjs`
- [ ] `app/hash-smoke/{page,HashSmoke}.tsx` (env-gated harness)
- [ ] `playwright.prod.config.ts`, `tests/e2e-prod/hash-worker.spec.ts`, `"test:e2e:prod"` script, one CI step in the `e2e` job
- [ ] Local Chromium for Playwright: `npx playwright install chromium`

## Security Domain

> `security_enforcement` is `true` (ASVS level 1, block on `high`) in `.planning/config.json`.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | no accounts (project constraint) |
| V3 Session Management | no | none |
| V4 Access Control | no | none; harness route is build-flag gated (404 unless `HASH_SMOKE=1`) |
| V5 Input Validation | yes | `Uint8Array`-only engine API (noble throws on strings); `chunkSize >= 1` guard; the worker only accepts messages from its owning page; keep discriminated-union message handling exhaustive (unknown `type` ignored) |
| V6 Cryptography | yes (integrity, not secrecy) | never hand-roll cryptographic primitives (all delegated to audited `@noble/hashes`); the only hand-rolled algorithm is non-cryptographic CRC32; MD5/SHA-1/CRC32 flagged `notForSecurity` metadata for Phase 9 labels |
| V12 Files/Resources | yes (Phase 10 depth) | chunked `Blob.slice` reads (bounded 1 MiB working set), cooperative cancel, no upload; unreadable-file errors become `error` outcomes |
| V14 Config | yes | exact-pin `@noble/hashes`; no `postinstall`; no new network origin; Turbopack bootstrap refuses foreign-origin scripts |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Supply-chain / typosquat dependency | Tampering | Only `@noble/hashes`; legitimacy check `OK`, `postinstall: null`, locked by the user, exact version pin, lockfile committed |
| Silent algorithm substitution (Keccak instead of SHA-3) | Tampering (integrity of result) | Vector + negative tests; mutation-verified |
| DoS via huge input (multi-GB file / pasted text) | Denial of Service | Chunked reads, cooperative cancel, worker isolation; size warnings are Phase 9/10 UI |
| User text/secret leaking via errors or telemetry | Information Disclosure | Worker errors carry only library/DOM messages; no text in messages; no URL state in Phase 8; Phase 10 owns analytics redaction |
| Test-only harness exposed in production | Information Disclosure / Tampering | `notFound()` unless `HASH_SMOKE=1` at build; `robots: noindex`; not in registry/sitemap |
| Hung/zombie worker after unmount | Denial of Service | `dispose()` terminates; `onerror` discards the worker |

## Sources

### Primary (HIGH confidence)
- Reproduced this session (see Verification Evidence): `npm view @noble/hashes`, `gsd_run query package-legitimacy check`, the package's installed `package.json` exports and `.d.ts` files, Node runs against noble/`node:crypto`/`node:zlib`, `tsc`, `eslint`, `vitest`, `next build`/`next start`/`next dev` in a scratch copy of the repo, and Playwright driving Google Chrome.
- Repo files read in full or in part: `.planning/{ROADMAP,REQUIREMENTS,STATE,config.json}`, `.planning/research/{SUMMARY,ARCHITECTURE,STACK,PITFALLS}.md`, `.claude/CLAUDE.md`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `next.config.ts`, `.github/workflows/ci.yml`, `lib/uuid/generate{,.test}.ts`, `lib/mac/vendor{,.test}.ts`, `lib/dns/query{,.test}.ts`, `app/tools/mac/{page,MacToolLoader}.tsx`, `lib/hooks/useKeyboardShortcut.ts`, `tools/registry.test.ts`.

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` / `STACK.md` / `PITFALLS.md` prior-researcher measurements (throughput table; supersede-path matrix) - consistent with what was re-verified here.

### Tertiary (LOW confidence)
- Firefox/Safari worker behavior, iOS memory limits, Vercel fragment handling (not touched in Phase 8).

## Verification Evidence (this session, scratch copy at `.../scratchpad/repo`, real repo untouched)

| Claim | How verified | Result |
|-------|--------------|--------|
| 43 published vectors (MD5 x7, SHA-1 x4, SHA-224 x4, SHA-256 x4, SHA-384 x4, SHA-512 x4, SHA3-256 x4, SHA3-512 x3, RIPEMD-160 x9) | `node:crypto` oracle script | 0 mismatches; 5 CRC32 vectors also match `zlib.crc32` |
| noble API/reuse/string behavior | Node script | `hash was destroyed` on reuse; `expected Uint8Array, got type=string`; `update` returns `this`; subarray OK |
| Engine correct under Vitest | 47 tests (vectors, 20 boundary lengths, fast-check properties, client, loopback) | all green, ~0.8 s |
| Keccak negative has teeth | mutate `sha3_256` -> `keccak_256` | 24 tests fail |
| Types/lint/boundary | `tsc --noEmit` (TS 6.0.3), `eslint lib/hash app/hash-smoke`, ESLint rule on a deliberate bad import | clean / rule fires |
| Production build + worker `{type:"module"}` | `next build` (Turbopack) + `next start -p`, Chrome via Playwright `channel:"chrome"` | text + 3 MiB+5 Blob digests match oracle |
| Dev server worker | `next dev -p` same script | identical results |
| Noble in worker chunk only | grep markers in `.next/static`; HTML script list; `page.on("response")` vs `performance.getEntriesByType("resource")` | 1 marker chunk (21,284 B raw / 8,635 B gz), not in initial scripts, not in main-thread resource timing |
| Cooperative cancel | 96 MiB text job superseded after 300 ms | tiny job done in 67-68 ms; first outcome `cancelled` |
| Env-gated harness | build with/without `HASH_SMOKE=1` | 404 vs 200 |
| Install churn | `npm i --save-exact @noble/hashes@2.4.0` with npm 11.10.1 | lockfile diff = one root line + one package block |
| Repo `node_modules` broken | `npx vitest run`, `npx playwright --version`, `find node_modules -name "* 2"` | unresolvable imports; 183 duplicate dirs; `com.apple.fileprovider.dir` xattr |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - single locked dependency, registry + legitimacy verified, API read from installed `.d.ts` and exercised.
- Architecture: HIGH - full reference implementation built, typechecked, linted, tested, bundled, and run in Chrome (prod and dev).
- Pitfalls: HIGH - each pitfall was either reproduced (jsdom Blob clone, huge test titles, Keccak mutation, broken `node_modules`) or measured; Firefox/Safari and Vercel-production items are ASSUMED and listed.

**Research date:** 2026-10-14
**Valid until:** 2026-11-13 for the stack (30 days); re-run the worker smoke test on ANY Next.js version bump (Turbopack worker handling has regressed before), and re-check the noble marker string after any `@noble/hashes` bump.

### Appendix: Vector fixtures (all verified equal to OpenSSL/zlib output)

Shared inputs: `A448 = "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"`; `A896 = "abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu"`; `ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"`; `D80 = "1234567890" x 8`; `M = "a" x 1,000,000`.

```ts
// MD5 (RFC 1321 A.5)
["", "d41d8cd98f00b204e9800998ecf8427e"], ["a", "0cc175b9c0f1b6a831c399e269772661"],
["abc", "900150983cd24fb0d6963f7d28e17f72"], ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
[ALNUM, "d174ab98d277d9f5a5611c2c9f419d9f"], [D80, "57edf4a22be3c955ac49da2e2107b67a"],
// SHA-1 (FIPS 180-4)
["", "da39a3ee5e6b4b0d3255bfef95601890afd80709"], ["abc", "a9993e364706816aba3e25717850c26c9cd0d89d"],
[A448, "84983e441c3bd26ebaae4aa1f95129e5e54670f1"], [M, "34aa973cd4c4daa4f61eeb2bdbad27316534016f"],
// SHA-224
["", "d14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f"],
["abc", "23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7"],
[A448, "75388b16512776cc5dba5da1fd890150b0c6455cb4f58b1952522525"],
[M, "20794655980c91d8bbb4c1ea97618a4bf03f42581948b2ee4ee7ad67"],
// SHA-256
["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
[A448, "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"],
[M, "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0"],
// SHA-384
["", "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b"],
["abc", "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7"],
[A896, "09330c33f71147e83d192fc782cd1b4753111b173b3b05d22fa08086e3b0f712fcc7c71a557e2db966c3e9fa91746039"],
[M, "9d0e1809716474cb086e834e310a4a1ced149e9c00f248527972cec5704c2a5b07b8b3dc38ecc4ebae97ddd87f3d8985"],
// SHA-512
["", "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e"],
["abc", "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f"],
[A896, "8e959b75dae313da8cf4f72814fc143f8f7779c6eb9f7fa17299aeadb6889018501d289e4900f7e4331b99dec4b5433ac7d329eeb6dd26545e96e55b874be909"],
[M, "e718483d0ce769644e2e42c7bc15b4638e1f98b13b2044285632a803afa973ebde0ff244877ea60a4cb0432ce577c31beb009c5c2c49aa2e4eadb217ad8cc09b"],
// SHA3-256 (FIPS 202)   NEVER Keccak c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
["", "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a"],
["abc", "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532"],
[A448, "41c0dba2a9d6240849100376a8235e2c82e1b9998a999e21db32dd97496d3376"],
[M, "5c8875ae474a3634ba4fd55ec85bffd661f32aca75c6d699d0cdcb6c115891c1"],
// SHA3-512
["", "a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26"],
["abc", "b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0"],
[M, "3c3a876da14034ab60627c077bb98f7e120a2a5370212dffb3385a18d4f38859ed311d0a9d5141ce9cc5c66ee689b266a8aa18ace8282a0e0db596c90b0a7b87"],
// RIPEMD-160 (Bosselaers reference set)
["", "9c1185a5c5e9fc54612808977ee8f548b2258d31"], ["a", "0bdc9d2d256b3ee9daae347be6f4dc835a467ffe"],
["abc", "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc"], ["message digest", "5d0689ef49d2fae572b881b123a85ffa21595f36"],
["abcdefghijklmnopqrstuvwxyz", "f71c27109c692c1b56bbdceb5b9d2865b3708dbc"],
[A448, "12a053384a9c0c88e405a06c27dcf49ada62eb2b"], [ALNUM, "b0e20b6e3116640286ed3a87a5713079b21f5189"],
[D80, "9b752e45573d4b39f4dbd3323cab82bf63326bfb"], [M, "52783243c1697bdbe16d37f97f68f08325dc1528"],
// CRC32 (IEEE; catalogue check value cbf43926)
["", "00000000"], ["a", "e8b7be43"], ["abc", "352441c2"], ["123456789", "cbf43926"],
["The quick brown fox jumps over the lazy dog", "414fa339"],
["62", "0012d20a"],               // CRC with a leading zero byte: must stay 8 chars
// UTF-8 (equal to `printf '%s' "..." | shasum -a 256`)
["é€🚀", sha256 "a35e1b37e8a63f0d00821d46edab7e38a4bd3ac0e749ad52b5cce7715edf2211"],
["é" (NFC), sha256 "4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c"],
["é" (NFD), sha256 "bf12767b0f2a56b2190075bae8169f656e3ce8d6357d4aff184bc6c7ea48f9f6"],  // must differ from NFC
["\ud83d" (lone surrogate -> EF BF BD), sha256 prefix "83d544ccc223c057"],
```
Padding/rate boundary lengths for the differential test: `[0,1,55,56,57,63,64,65,71,72,73,111,112,113,127,128,129,135,136,137]` (covers MD5/SHA-1/SHA-224/256 block 64, SHA-384/512 block 128, SHA3-512 rate 72 +/-1, SHA3-256 rate 136 +/-1). Use short `it.each` labels (not the input text) for the million-`a` cases.
