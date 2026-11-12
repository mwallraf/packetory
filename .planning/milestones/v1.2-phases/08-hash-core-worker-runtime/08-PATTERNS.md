# Phase 8: Hash Core & Worker Runtime - Pattern Map

**Mapped:** 2026-10-14
**Files analyzed:** 27 (new) + 4 (modified)
**Analogs found:** 24 / 31 (the worker, harness-gating, and prod-e2e pieces are genuinely new)

All analog paths below are git-tracked (verified via `git ls-files`).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `lib/hash/types.ts` | model (types) | transform | `lib/mac/types.ts`, `lib/dns/types.ts` | exact |
| `lib/hash/algorithms.ts` | utility (metadata) | transform | `lib/mac/types.ts` / `lib/uuid/format.ts` | role-match |
| `lib/hash/crc32.ts` | utility | transform (incremental) | `lib/mac/format.ts` (pure, framework-agnostic) | role-match |
| `lib/hash/engine.ts` | service (adapter seam) | transform | `lib/uuid/generate.ts` (sole `uuid` importer) | role-match |
| `lib/hash/format.ts` | utility | transform | `lib/mac/format.ts` | exact |
| `lib/hash/source.ts` | utility | file-I/O / streaming | none close | no analog |
| `lib/hash/job.ts` | service | batch + abort | `lib/dns/query.ts` (AbortSignal handling) | partial |
| `lib/hash/worker-core.ts` | service | event-driven | none (nearest: `lib/dns/resolve.ts` orchestration) | partial |
| `lib/hash/hash.worker.ts` | worker adapter | event-driven | none | no analog |
| `lib/hash/client.ts` | service | request-response + supersede | `lib/dns/resolve.ts` + `requestSeqRef` guard in `app/tools/dns/DnsTool.tsx` | partial |
| `lib/hash/*.test.ts` | test | - | `lib/uuid/generate.test.ts`, `lib/mac/format.test.ts` | exact |
| `lib/hash/boundaries.test.ts` | test (source walk) | file-I/O | `app/sitemap.test.ts` / `tools/registry.test.ts` | partial |
| `eslint.config.mjs` (modify) | config | - | itself | exact |
| `package.json` / `package-lock.json` (modify) | config | - | itself (exact-pin deps; add `test:e2e:prod`) | exact |
| `app/hash-smoke/page.tsx` | route (server) | request-response | `app/tools/mac/page.tsx` (metadata) + `app/tools/uuid/UuidToolLoader.tsx` | role-match |
| `app/hash-smoke/HashSmoke.tsx` | component (client) | event-driven | `app/tools/uuid/UuidTool.tsx` | role-match |
| `playwright.prod.config.ts` | config | - | `playwright.config.ts` | exact |
| `tests/e2e-prod/hash-worker.spec.ts` | test (e2e) | request-response | `tests/e2e/uuid.spec.ts` | role-match |
| `.github/workflows/ci.yml` (modify) | config | - | `e2e` job, lines 76-88 | exact |

## Pattern Assignments

### `lib/hash/types.ts`, `algorithms.ts`, `format.ts` (pure, framework-agnostic)

**Analog:** `lib/mac/format.ts` + `lib/mac/types.ts`. Convention: flat `lib/<domain>/*.ts`, no barrel `index.ts`, a docblock header stating "pure, framework-agnostic, no React/Next import", `import type` for types.

Excerpt (`lib/mac/format.ts` lines 1-14):
```ts
/**
 * Pure, framework-agnostic MAC address formatter ... Imports no UI framework code.
 */
import type { MacFormats } from "./types";

function toHexPairs(bytes: readonly number[]): string[] {
  return bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0"));
}
```
Apply to `toHex` in `format.ts` (padStart(2,"0"), lowercase here; RESEARCH recommends a 256-entry padded table). Types and `ALGORITHMS` content: copy verbatim from RESEARCH "Code Examples" (`types.ts`, `algorithms.ts`).

### `lib/hash/engine.ts` (sole third-party importer seam)

**Analog:** `lib/uuid/generate.ts` (only place `uuid` is imported). Same idea: one module owns the dependency. Use the RESEARCH `FACTORIES: Record<AlgorithmId, () => Hasher>` code verbatim (RESEARCH lines 358-371). Imports must use `.js` suffix subpaths: `@noble/hashes/sha2.js`, `sha3.js`, `legacy.js` (MD5/SHA-1/RIPEMD-160 live in `legacy.js`).

### `lib/hash/crc32.ts`
No codebase analog (hand-rolled algorithm). Copy RESEARCH lines 327-355 verbatim. Style: header docblock as in `lib/mac/format.ts`; `TABLE` built via IIFE; throw `"hash was destroyed"` after `digest()` to match noble semantics (the e2e marker test also relies on this string being in noble's chunk, not crc32).

### `lib/hash/job.ts` (abort handling)

**Analog:** `lib/dns/query.ts` lines 26-42 (AbortSignal + `AbortError`-named `DOMException`):
```ts
const controller = new AbortController();
...
if (signal.aborted) { ... }
signal.addEventListener("abort", onExternalAbort);
```
Follow the same convention: `new DOMException("...", "AbortError")` and check `signal?.aborted` explicitly. Core loop: RESEARCH lines 391-426 verbatim (`yieldToEventLoop` via MessageChannel; fresh hashers per job).

### `lib/hash/source.ts`, `worker-core.ts`, `hash.worker.ts`
No analog in repo (first worker, first chunked I/O). Use RESEARCH lines 373-389 (source) and 430-474 (worker-core + 3-line adapter). `hash.worker.ts` uses `self.postMessage` and `self.onmessage`; compiles under the repo's `lib: ["dom", ...]` with no `webworker` lib.

### `lib/hash/client.ts`
Closest analog for the stale-result guard: the `requestSeqRef` pattern in `app/tools/dns/DnsTool.tsx` (grep `requestSeqRef`), and the orchestration/outcome-union style of `lib/dns/resolve.ts`. Copy the full client from RESEARCH lines 476-551. Constraint: `client.ts` imports types only (never `./engine`, `./job`, `./worker-core`); contains the single `new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" })` literal.

### Tests (`lib/hash/*.test.ts`)

**Analog:** `lib/uuid/generate.test.ts` lines 1-3:
```ts
import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
```
Explicit vitest imports even though `globals: true`; property tests via `fcIt.prop([...])("name", (...) => {...})`; test titles carry requirement IDs (e.g. `(UUID-01)`; use `(HASH-01)` etc.). New convention (no precedent in repo): line 1 `// @vitest-environment node` in every `lib/hash/*.test.ts` (vitest config default is jsdom; see RESEARCH Pitfall 4). Vectors: RESEARCH Appendix. Use short `it.each` labels, never the million-`a` input as a title. `FakeWorker`/loopback: RESEARCH lines 553-574.

### `lib/hash/boundaries.test.ts`
Analog for repo-introspection tests: `app/sitemap.test.ts` and `tools/registry.test.ts` (read-only checks over project structure). Implement the source-walk per RESEARCH lines 587-593, excluding itself, and add the "importers of ./job === worker-core.ts" assertion (plus allow `*.test.ts`).

### `eslint.config.mjs` (modify)
Current file (flat config, `defineConfig([...nextVitals, ...nextTs, globalIgnores([...])])`). Insert the RESEARCH lines 578-585 `no-restricted-imports` object into the array, after `...nextTs` and before/after `globalIgnores`, with `ignores: ["lib/hash/engine.ts"]`.

### `package.json` (modify)
Scripts block lines 5-13: add `"test:e2e:prod": "playwright test -c playwright.prod.config.ts"` after `"test:e2e"`. Dependency: `npm install --save-exact @noble/hashes@2.4.0` (repo pins runtime deps exactly, e.g. `next 16.2.11`, `uuid 14.0.1`; note some others use caret).

### `playwright.prod.config.ts`
**Analog:** `playwright.config.ts` (fullyParallel, forbidOnly, retries CI, `reporter: "list"`, chromium project via `devices["Desktop Chrome"]`, webServer block). Differences: `testDir: "./tests/e2e-prod"`, baseURL `http://localhost:3101`, `command: "npm run build && npm run start -- -p 3101"`, `reuseExistingServer: false`, `timeout: 180_000`, `env: { HASH_SMOKE: "1" }`. Do not use 3100 (occupied locally).

### `tests/e2e-prod/hash-worker.spec.ts`
Analog: `tests/e2e/uuid.spec.ts` (Playwright spec style: `import { test, expect } from "@playwright/test"`, `page.goto`, locators). Assertions: RESEARCH lines 611-614.

### `app/hash-smoke/page.tsx` and `HashSmoke.tsx`
**Analog (page):** `app/tools/mac/page.tsx` for `Metadata` export shape; here use `robots: { index: false }` and `notFound()` from `next/navigation` when `process.env.HASH_SMOKE !== "1"`. **Analog (client boundary):** `app/tools/uuid/UuidToolLoader.tsx` (`"use client"` file; `dynamic(..., { ssr: false })` is only legal inside a client file). The harness can import `createHashClient` directly in a `"use client"` component (no dynamic needed, since client.ts holds no noble code), and exposes `window.__c`. Not added to the tool registry or `app/sitemap.ts`.

### `.github/workflows/ci.yml` (modify)
Add a step after line 88 (`- run: npm run test:e2e`) in the `e2e` job: `- run: npm run test:e2e:prod`.

## Shared Patterns

- **Framework-agnostic lib modules:** docblock header, no React/Next imports, co-located `*.test.ts`, no barrels (`lib/mac`, `lib/dns`, `lib/uuid`).
- **Dependency seam:** one file imports the third-party lib (`lib/uuid/generate.ts` precedent; here enforced by ESLint + `boundaries.test.ts`).
- **Abort/cancel:** `AbortController` plus `DOMException("...", "AbortError")` (`lib/dns/query.ts`).
- **Stale-result guard:** sequence id compare (`requestSeqRef` in `DnsTool.tsx`, mirrored by `jobId !== current.id` in `client.ts`).
- **Errors never echo user text** (worker `error` messages carry only library/DOM `name`/`message`).
- **Tests:** explicit vitest imports, fast-check via `@fast-check/vitest`, requirement IDs in titles, `// @vitest-environment node` for hash tests.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `lib/hash/source.ts` | utility | chunked Blob I/O | no file/Blob handling exists |
| `lib/hash/hash.worker.ts`, `worker-core.ts` | worker | event-driven messaging | no Web Worker in repo |
| `playwright.prod.config.ts` flow | e2e | production build | all e2e currently runs against `next dev` |
| `app/hash-smoke` env gating | route | build-flag gate | no env-gated routes exist |

Planner should use RESEARCH.md "Code Examples" (verified reference implementation) for these.

## Metadata

**Analog search scope:** `lib/`, `app/`, `tests/`, `components/`, root configs, `.github/workflows/ci.yml`
**Notes:** `node_modules` is known-broken locally (iCloud duplicates); Wave 0 must run `rm -rf node_modules && npm ci` before any test or lint command.
**Pattern extraction date:** 2026-10-14
