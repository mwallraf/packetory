---
phase: 08-hash-core-worker-runtime
reviewed: 2026-10-14T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - .github/workflows/ci.yml
  - app/hash-smoke/HashSmoke.tsx
  - app/hash-smoke/page.test.tsx
  - app/hash-smoke/page.tsx
  - eslint.config.mjs
  - lib/hash/algorithms.test.ts
  - lib/hash/algorithms.ts
  - lib/hash/boundaries.test.ts
  - lib/hash/client.test.ts
  - lib/hash/client.ts
  - lib/hash/crc32.test.ts
  - lib/hash/crc32.ts
  - lib/hash/engine.test.ts
  - lib/hash/engine.ts
  - lib/hash/format.test.ts
  - lib/hash/format.ts
  - lib/hash/hash.worker.ts
  - lib/hash/job.test.ts
  - lib/hash/job.ts
  - lib/hash/source.test.ts
  - lib/hash/source.ts
  - lib/hash/types.ts
  - lib/hash/worker-core.test.ts
  - lib/hash/worker-core.ts
  - package.json
  - playwright.prod.config.ts
  - tests/e2e-prod/hash-worker.spec.ts
  - tests/e2e/hash-smoke-gate.spec.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-10-14
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

I reviewed the hash runtime (engine, CRC32, job runner, worker protocol, main-thread client), the smoke harness page, the import-boundary guards, the CI wiring, and the e2e suites. `npm run typecheck` is clean. `npm run lint` reports no errors in the reviewed files. The 203 unit tests under `lib/hash` and `app/hash-smoke` pass.

I found no security vulnerabilities and no incorrect digest output on the production path. These behaved correctly in the code I traced:

- The CRC32 init and final XOR, and the zero-padded hex.
- Fresh single-use hashers per job.
- The supersede funnel and the stale-message drop.
- Synchronous job registration before the first await.
- The `HASH_SMOKE` gate.

The concerns are robustness gaps in the client contract, one latent chunking bug in an exported helper, and some CI and environment hygiene.

## Warnings

### WR-01: `start()` can reject and leaves a dangling `current` job when `postMessage` throws

**File:** `lib/hash/client.ts:119-122`
**Issue:** `HashClient.start` is documented and tested as never rejecting. The test at `client.test.ts:241` only covers a factory throw. If `w.postMessage` throws, the throw rejects the Promise instead of returning a `HashOutcome`. Reachable causes are a `DataCloneError`, for example an input that is not cloneable (a detached or revoked Blob), or a worker already torn down. `current` has already been assigned at that point, so it stays set to a job the worker never received. Callers that only handle the `HashOutcome` union get an unhandled rejection. Phase 9 UI code will hit this path.
**Fix:**
```ts
return new Promise<HashOutcome>((resolve) => {
  current = { id, resolve, onProgress: o?.onProgress };
  try {
    w.postMessage({ type: "start", jobId: id, input });
  } catch (e) {
    const err = e instanceof Error ? e : null;
    settle({
      status: "error",
      name: err?.name ?? "Error",
      message: err?.message ?? "Worker failed",
    });
  }
});
```
Add a client test where `postMessage` throws.

### WR-02: Worker `messageerror` is not handled, so a job promise can hang forever

**File:** `lib/hash/client.ts:79-98`
**Issue:** Only `onmessage` and `onerror` are wired. If a worker response cannot be deserialized, the browser fires `messageerror` rather than `error`. The pending `start()` promise then never settles, and `current` stays occupied until the next `start()` or `cancel()`. `WorkerLike` does not model `onmessageerror` either.
**Fix:** Add `onmessageerror: (() => void) | null` to `WorkerLike`. In `ensureWorker`, settle with `{ status: "error", name: "WorkerError", message: "Unreadable worker message" }`, using the same teardown as `onerror`.

### WR-03: `bytesChunks` and `blobChunks` hash duplicated bytes for a non-integer `chunkSize`

**File:** `lib/hash/source.ts:25-28, 39-41`
**Issue:** The guard `!(chunkSize >= 1)` accepts fractional sizes such as 1.5. `off` then advances by 1.5, but `subarray(off, off + chunkSize)` truncates its arguments. For a 4-byte input, the second slice becomes `subarray(1, 3)`, so byte 1 is yielded twice and every hasher silently produces a wrong digest. `Blob.slice` truncates the same way. `chunkSize` is currently only called with integers (`CHUNK_SIZE`, `1`), so this is latent. Both helpers are exported and the boundary tests call them with custom sizes, so a future caller can trigger it.
**Fix:**
```ts
if (!Number.isInteger(chunkSize) || chunkSize < 1) {
  throw new RangeError("chunkSize must be a positive integer");
}
```
Apply this in both helpers and add a test that fractional sizes are rejected.

## Info

### IN-01: Node >= 22.2 is required by tests, but no `engines` or `.nvmrc` pins it

**File:** `package.json` (no `engines` field), `lib/hash/job.test.ts:40`, `tests/e2e-prod/hash-worker.spec.ts:2,132`
**Issue:** The tests rely on `node:zlib` `crc32`, which exists only from Node 22.2. CI pins Node 22. Neither `package.json` nor a `.nvmrc` declares the requirement, and `@types/node` is `^20`. A developer on Node 20 gets a confusing failure instead of a clear message. The tests do assert availability, which helps.
**Fix:** Add `"engines": { "node": ">=22.2" }` and an `.nvmrc`. Consider aligning `@types/node` with the Node 22 target.

### IN-02: The harness ships in every production build, and the 404 gate is only asserted against `next dev`

**File:** `app/hash-smoke/page.tsx:17-19`, `tests/e2e/hash-smoke-gate.spec.ts`
**Issue:** `HashSmoke` and its worker chunk are statically imported by the page. They are therefore compiled and emitted into `.next/static` for the real deploy even when `HASH_SMOKE` is unset. Only the route response is gated. The gate test (`hash-smoke-gate.spec.ts`) runs against the dev server, and the prod suite always builds with `HASH_SMOKE=1`. Nothing verifies that an unflagged production build (the Vercel configuration) returns 404 for `/hash-smoke`. Prerender-time `notFound()` behavior can differ from dev. The extra chunks are harmless, since they are static and exposed no secrets.
**Fix:** Add a prod-build check that a build without the flag returns 404. Optionally load `HashSmoke` through a dynamic `import()` after the gate check so the chunk is not emitted into unflagged builds.

### IN-03: CI retries can mask flakiness in the timing-sensitive prod suite

**File:** `playwright.prod.config.ts:13`
**Issue:** The config sets `retries: process.env.CI ? 2 : 0`. The suite contains a wall-clock assertion (`elapsed < 2000`) and a single worker to avoid CPU contention. Two silent retries can turn a real latency regression in cancellation into a green run. The 96 MiB structured-clone and encode cost also scales with runner speed.
**Fix:** Use `retries: 0` for this config, or report retried passes as flaky and fail on them. Alternatively assert on worker-side observable behavior, such as hashing stopping after N progress ticks, instead of a wall-clock bound.

---

_Reviewed: 2026-10-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
