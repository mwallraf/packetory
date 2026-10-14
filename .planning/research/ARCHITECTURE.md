# Architecture Research — v1.2 Hash Generator

**Domain:** Browser-side hashing tool added to an existing Next.js 16 App Router utility site
**Researched:** 2026-10-14
**Confidence:** HIGH (codebase inspected directly; worker pattern, bundle size, throughput, test vectors, and jsdom behavior all verified empirically in a throwaway copy of the repo — see "Verification Evidence")

Scope: only what the NEW `/tools/hash` feature needs. Existing shell, registry, hooks, analytics and test conventions are described only where the new tool touches them.

---

## TL;DR Decisions

| Question | Decision | Confidence |
|----------|----------|------------|
| Hash library | `@noble/hashes@2.4.0` (exact pin), zero deps, ESM, `sideEffects:false`, incremental `.create().update().digest()` for every algorithm needed except CRC32 | HIGH |
| CRC32 | Hand-rolled ~20 LOC table-based incremental implementation in `lib/hash/crc32.ts` (noble has none; `crc-32` package not worth a dependency) | HIGH |
| Where hashing runs | **Always in a dedicated Web Worker** (one code path for text and files). Main thread never imports a hash library | HIGH |
| Worker pattern | `new Worker(new URL("./hash.worker.ts", import.meta.url))` with the literal inside `lib/hash/client.ts` — **verified working on the repo's Next 16.2.11** in both `next build && next start` and `next dev` | HIGH |
| Lazy loading | Falls out of the worker boundary: noble lives in a separate worker chunk (18.9 KB raw / 7.8 KB gzip for 9 algorithms), never in the page's JS | HIGH |
| File reading | `blob.slice(a,b).arrayBuffer()` loop, 1 MiB chunks (NOT `file.stream()` — jsdom's `File` has no `.stream()`, so it is untestable; `arrayBuffer()` exists in jsdom) | HIGH |
| Cancellation | Three layers: client-side sequence token (UI correctness) + worker-side `AbortController` checked between chunks with an explicit event-loop yield (resource correctness) + `dispose()` terminates the worker on unmount | HIGH |
| URL state for text | Read `?text=` on load; **do NOT live-sync keystrokes into the URL**. Expose an explicit "Copy link" action. Never add `text` to the analytics allow-list | MEDIUM (conflicts with milestone wording "bookmarkable text state" — needs user confirmation; see below) |
| Registry category | `"encode"` (input-derived transform; groups with future base64/URL/JWT tools). No type change needed — already in the union | MEDIUM (low-cost to flip) |
| Default result | Precomputed sample digests as constants in `faq-data.ts` (same pattern as MAC's `sampleFormats`), used for BOTH the server-rendered worked example and the client's initial state → instant, CLS-free first paint, worker not needed until first edit | HIGH |
| Phases | 3 phases: core+worker runtime → tool page with text path → file input/progress/cancel/URL-share/e2e hardening | MEDIUM |

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ SERVER (static prerender)                                           │
│  app/tools/hash/page.tsx   metadata + FAQ JSON-LD + worked example  │
│        │ imports: faq-data.ts, lib/hash/algorithms.ts (metadata)    │
│        │ NEVER imports: engine.ts / @noble/hashes                   │
├────────┼────────────────────────────────────────────────────────────┤
│ MAIN THREAD (client island, next/dynamic ssr:false)                 │
│  HashToolLoader.tsx ──▶ HashTool.tsx ──▶ useHashJob.ts              │
│        UI state, textarea/dropzone, rows, copy, shortcuts           │
│                              │                                      │
│                              ▼                                      │
│  lib/hash/client.ts   createHashClient()                            │
│        seq token · cancel() · dispose() · result/progress callbacks │
│        (fallback: in-thread client using dynamic import("./engine"))│
├──────────────────────────────┼──────────────────────────────────────┤
│ WORKER THREAD (separate chunk, loaded when Worker is constructed)   │
│  lib/hash/hash.worker.ts  (thin: message ⇄ job runner)              │
│        │                                                            │
│        ▼                                                            │
│  lib/hash/job.ts  runHashJob(source, algos, {signal, onProgress})   │
│        │ iterates AsyncIterable<Uint8Array>, yields to event loop,  │
│        │ checks signal between chunks                               │
│        ▼                                                            │
│  lib/hash/engine.ts  FACTORIES: Record<AlgorithmId, () => Hasher>   │
│        ├─ @noble/hashes/{sha2,sha3,legacy}.js                       │
│        └─ lib/hash/crc32.ts                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Framework imports? |
|-----------|----------------|--------------------|
| `lib/hash/types.ts` | `AlgorithmId` union, `Digest` types, worker message discriminated unions | none |
| `lib/hash/algorithms.ts` | **Metadata only**: ordered `ALGORITHMS` array (id, label, digest bits, hex length, `notForSecurity` flag for MD5/SHA-1/CRC32). Safe to import from server `page.tsx` and main thread | none |
| `lib/hash/crc32.ts` | Incremental CRC-32 (IEEE 802.3, poly 0xEDB88320) with the same `{update, digest}` shape as noble hashers | none |
| `lib/hash/engine.ts` | The ONLY file importing `@noble/hashes`. `FACTORIES: Record<AlgorithmId, () => Hasher>` — `Record` typing makes "added an algorithm to metadata but forgot the factory" a compile error | none (only noble) |
| `lib/hash/format.ts` | `bytesToHex(bytes, {uppercase})`, `formatCopyAll(digests, opts)`; pure | none |
| `lib/hash/source.ts` | Adapters producing `AsyncIterable<Uint8Array>`: `textChunks(str)` (UTF-8 via `TextEncoder`, sliced), `fileChunks(blob, chunkSize)` (`slice().arrayBuffer()` loop) | none |
| `lib/hash/job.ts` | `runHashJob(...)`: create hashers, loop chunks, `await yieldToEventLoop()` each chunk, throw/return on `signal.aborted`, throttled `onProgress(bytes, total)`, return digests | none |
| `lib/hash/hash.worker.ts` | Thin message adapter: `start`/`cancel` in; `progress`/`result`/`error` out, all tagged with `jobId`. One `AbortController` per job | none (DOM worker globals) |
| `lib/hash/client.ts` | Owns the `Worker`; the single funnel `start(req)` which **always** cancels the predecessor first; seq-token stale discard; `cancel()`; `dispose()`. Contains the only `new Worker(new URL(...))` literal. Also exports `createInThreadClient()` (dynamic `import("./engine")`) used as unsupported-Worker fallback AND as the unit-test double | none (uses `Worker` global, injectable factory) |
| `app/tools/hash/useHashJob.ts` | React glue: creates the client in an effect, exposes `{state, hashText, hashFile, cancel, reset}`; guards `setState` with the seq token; `dispose()` on unmount | React |
| `app/tools/hash/HashTool.tsx` | UI: textarea, dropzone/picker, 10 `HashRow`s, copy-all, case toggle, progress + Cancel, shortcuts | React |
| `app/tools/hash/HashToolLoader.tsx` | `next/dynamic(..., {ssr:false})` + fixed-height skeleton (copy of `MacToolLoader.tsx`) | React |
| `app/tools/hash/page.tsx` | Server shell: metadata, JSON-LD, H1, loader, worked example, FAQ | Next |
| `app/tools/hash/faq-data.ts` | `faqItems`, `sampleText`, `sampleDigests` (precomputed, verified by unit test against `engine`) | none |

### Recommended File Layout

```
lib/hash/
├── types.ts            (new)
├── algorithms.ts       (new)  + algorithms.test.ts
├── crc32.ts            (new)  + crc32.test.ts
├── engine.ts           (new)  + engine.test.ts      (published test vectors)
├── format.ts           (new)  + format.test.ts
├── source.ts           (new)  + source.test.ts
├── job.ts              (new)  + job.test.ts         (abort, progress, chunk-invariance property tests)
├── client.ts           (new)  + client.test.ts      (fake worker: seq token, supersede, dispose)
└── hash.worker.ts      (new)                         (thin; covered by e2e, not unit tests)
app/tools/hash/
├── page.tsx            (new)
├── HashToolLoader.tsx  (new)
├── HashTool.tsx        (new)  + HashTool.test.tsx   (in-thread client injected)
├── useHashJob.ts       (new)
└── faq-data.ts         (new)  + faq-data.test.ts    (sampleDigests === engine output)
tests/e2e/
├── hash.spec.ts        (new)  walking skeleton, text, copy, case, keyboard, 320px
├── hash-file.spec.ts   (new)  picker, drop, progress, cancel, supersede matrix
└── hash-seo.spec.ts    (new)  metadata, canonical, FAQ + JSON-LD parity
```

Naming follows existing precedent (`lib/mac/{types,parse,format,classify,vendor}.ts`, `app/tools/mac/{page,MacTool,MacToolLoader,faq-data}.tsx`, `tests/e2e/{mac-lookup,*-seo}.spec.ts`).

---

## New vs Modified — Exact File Inventory

### New (create)

All files in the layout above, plus `@noble/hashes` in `package.json`/`package-lock.json` (see Modified).

### Modified (existing files that MUST change)

| File | Change | Why / what breaks if forgotten |
|------|--------|-------------------------------|
| `tools/registry.ts` | Add one `ToolDefinition`: `slug:"hash"`, `name:"Hash Generator"`, `shortName:"Hash"`, `category:"encode"`, `icon:"Hash"`, `status:"active"`, `clientOnly:true`, `featured:false`, keywords `["hash","md5","sha1","sha256","sha3","crc32","checksum","ripemd160"]` | Nav (`SiteHeader`, `MobileNav`), landing grid and sitemap derive from this automatically — **no edits to those files** |
| `components/ToolCard.tsx` | Add `Hash` to the lucide import and the `ICONS` map | `ICONS[tool.icon] ?? Fingerprint` **silently falls back** to the UUID icon — a missing entry produces no error. Add a unit assertion that every registry `icon` has an `ICONS` entry |
| `tools/registry.test.ts` | "exactly four" → five; slugs list; sorted order becomes `["subnet","uuid","dns","hash","mac"]` (alphabetical in the non-featured group: DNS Lookup, Hash Generator, MAC Address Inspector); status map | Hard-coded counts/order — will fail |
| `app/sitemap.test.ts` | Expected `/tools/*` URL list +`hash`; `registrySlugs` array in the "no hardcoded slug" test +`"hash"` | Hard-coded |
| `tests/e2e/home.spec.ts` | `toHaveCount(4)` ×2 and loop bound `4` → 5; order test "Subnet, UUID, DNS, MAC" → "Subnet, UUID, DNS, Hash, MAC" | Hard-coded |
| `tests/e2e/navigation.spec.ts` | Mobile drawer: `shortName` list +`"Hash"`, `drawer.locator("a")` `toHaveCount(4)` → 5, add `getByText("Hash")` assertion | Hard-coded |
| `package.json` / `package-lock.json` | `"@noble/hashes": "2.4.0"` (exact pin, matching how `uuid`, `next`, `react` are pinned) | — |
| `lib/analytics/redact.test.ts` | Add a regression test: `redactParams("?text=secret")` → `{}` with `DEFAULT_ALLOW_LIST` | Locks in the privacy decision; **`redact.ts` itself does not change** |
| `app/layout.tsx` | Site `<meta description>` lists the four tools by name — add "hash generator". Optional, SEO nicety | Not test-asserted (grep found no test) |
| `eslint.config.mjs` | Optional: `no-restricted-imports` for `@noble/hashes*` everywhere except `lib/hash/engine.ts` | Enforces the lazy-load boundary mechanically (alternative: a Vitest test that greps imports) |

### Explicitly NOT modified

- `components/SiteHeader.tsx`, `MobileNav.tsx`, `app/page.tsx`, `app/sitemap.ts`, `app/robots.ts` — registry-derived (SHELL-04); `sitemap.ts` has the guard test against hardcoding.
- `lib/analytics/redact.ts` / `PacketoryAnalytics.tsx` — `DEFAULT_ALLOW_LIST` is `[]`, so every query param incl. `?text=` is already stripped. Do **not** add `text`.
- `lib/hooks/*` — reuse `useCopyToClipboard` (one instance per row + one for copy-all, like `FormatRow`/`CopyAllButton` in `MacTool.tsx`) and `useKeyboardShortcut` unchanged.
- `app/privacy/page.tsx` — already states "Every tool runs entirely in your browser unless a result inherently requires an external lookup"; Hash is consistent with it. **Per PROJECT.md automation model, any legal/privacy text change needs human approval — do not edit it as part of this milestone.** The "files never leave your browser" promise lives in the tool's FAQ instead.
- `next.config.ts` — no config needed (verified; no `turbopack.rules`, no `serverExternalPackages`, no headers).
- `vercel.json`, `playwright.config.ts`, `vitest.config.ts` — unchanged.

---

## Design: `lib/hash/` Module Boundaries

### 1. Algorithm registry (metadata/implementation split)

Two files on purpose, so the server page and main thread can list algorithms without pulling in noble:

```ts
// lib/hash/types.ts
export type AlgorithmId =
  | "md5" | "sha1" | "sha224" | "sha256" | "sha384" | "sha512"
  | "sha3-256" | "sha3-512" | "ripemd160" | "crc32";

export type Hasher = { update(chunk: Uint8Array): void; digest(): Uint8Array };

// lib/hash/algorithms.ts  — NO noble import
export const ALGORITHMS = [
  { id: "md5",       label: "MD5",        bits: 128, notForSecurity: true  },
  { id: "sha1",      label: "SHA-1",      bits: 160, notForSecurity: true  },
  { id: "sha224",    label: "SHA-224",    bits: 224, notForSecurity: false },
  { id: "sha256",    label: "SHA-256",    bits: 256, notForSecurity: false },
  { id: "sha384",    label: "SHA-384",    bits: 384, notForSecurity: false },
  { id: "sha512",    label: "SHA-512",    bits: 512, notForSecurity: false },
  { id: "sha3-256",  label: "SHA3-256",   bits: 256, notForSecurity: false },
  { id: "sha3-512",  label: "SHA3-512",   bits: 512, notForSecurity: false },
  { id: "ripemd160", label: "RIPEMD-160", bits: 160, notForSecurity: false },
  { id: "crc32",     label: "CRC32",      bits: 32,  notForSecurity: true  },
] as const satisfies readonly { id: AlgorithmId; label: string; bits: number; notForSecurity: boolean }[];

// lib/hash/engine.ts — the only noble importer
import { sha224, sha256, sha384, sha512 } from "@noble/hashes/sha2.js";
import { sha3_256, sha3_512 } from "@noble/hashes/sha3.js";
import { md5, sha1, ripemd160 } from "@noble/hashes/legacy.js";
import { createCrc32 } from "./crc32";

export const FACTORIES: Record<AlgorithmId, () => Hasher> = {
  md5: () => md5.create(), /* … */ crc32: createCrc32,
};
```

Notes:
- noble v2 exposes **only** `.js`-suffixed subpath exports (`./sha2.js`, `./sha3.js`, `./legacy.js`); MD5, SHA-1 and RIPEMD-160 live in `legacy.js`. Resolves fine under `moduleResolution: "bundler"` (verified with tsc via `next build`, Turbopack, and Vitest).
- Order in `ALGORITHMS` is the display order; the UI iterates it (no hardcoded rows), mirroring the registry-derived philosophy. Adding an 11th algorithm = one metadata line + one factory line + one test vector.
- The job takes `algos: AlgorithmId[]` (default = all). The UI always passes all ten today, but the parameter keeps per-algorithm toggles and multi-worker parallelism (see Scalability) possible without a protocol change.
- `notForSecurity` drives a small non-color-alone "not for security" label (QUAL-05 precedent: carry meaning with text).

### 2. Text hashing

`textChunks(str)` → `TextEncoder().encode(str)` (UTF-8, the only sensible default; document it in the UI/FAQ), then yield 1 MiB subarrays. Small strings are a single chunk. Same `runHashJob` path as files — no special-cased "fast path" on the main thread.

Pitfall baked into the design: `textarea.value` normalizes line endings to `\n`, and `echo "x" | sha256sum` hashes a trailing newline. The FAQ and a hint line must say so; do not silently append/strip.

### 3. Incremental file hashing

```ts
// lib/hash/source.ts
export async function* fileChunks(blob: Blob, chunkSize = 1 << 20) {
  for (let off = 0; off < blob.size; off += chunkSize) {
    yield new Uint8Array(await blob.slice(off, off + chunkSize).arrayBuffer());
  }
}
```

Why `slice().arrayBuffer()` instead of `file.stream()`:
- **Verified**: jsdom (the repo's Vitest environment) has `Blob.arrayBuffer()` but `Blob.stream` is `undefined` → a stream-based source cannot be unit tested without polyfills. Browsers support both equally.
- Explicit, deterministic chunk size → predictable cancel latency and progress granularity; no reader/lock to release on abort.
- 1 MiB at the measured combined ~14 MB/s (all 10 algorithms) is ~70 ms of CPU per chunk — fine cancel latency.

```ts
// lib/hash/job.ts (shape)
export async function runHashJob(
  source: AsyncIterable<Uint8Array>, total: number, algos: AlgorithmId[],
  opts: { signal: AbortSignal; onProgress?: (done: number, total: number) => void },
): Promise<Record<AlgorithmId, Uint8Array>> {
  const hashers = algos.map((id) => [id, FACTORIES[id]()] as const);
  let done = 0, lastReport = 0;
  for await (const chunk of source) {
    if (opts.signal.aborted) throw new DOMException("aborted", "AbortError");
    for (const [, h] of hashers) h.update(chunk);
    done += chunk.length;
    // throttle progress (~10 Hz); always emit final
    await yieldToEventLoop();      // setTimeout(0) / MessageChannel / scheduler.yield?.()
  }
  if (opts.signal.aborted) throw new DOMException("aborted", "AbortError");
  return Object.fromEntries(hashers.map(([id, h]) => [id, h.digest()])) as Record<AlgorithmId, Uint8Array>;
}
```

**The explicit yield is required**, not decoration: a `cancel` message is a macrotask. A loop that only awaits already-resolved promises/microtasks can starve the worker's `onmessage`, so the abort flag would never be set while the job runs. Yielding each chunk guarantees the cancel message is delivered within one chunk's compute time.

### 4. Formatting (hex / case)

- Engines return `Uint8Array`; **state stores bytes (or lowercase hex)**, and `format.ts` renders. The uppercase toggle is a **pure display transform**: it must neither re-hash nor cancel an in-flight job nor reset the input. (Contrast with UUID's case toggle which reformats existing values — same idea.)
- CRC32: output the 4-byte big-endian value as 8 hex chars, zero-padded (`00000000`-style leading zeros are a classic bug — test with an input whose CRC starts with `0`).
- Optional differentiator (not required): Base64 output as a second format; the bytes-in-state design makes it a one-function addition.
- `formatCopyAll`: one `LABEL: value` per line in `ALGORITHMS` order (mirrors `CopyAllButton` in `MacTool.tsx`), honoring the current case.

### 5. Test strategy (Vitest + fast-check, per project convention)

- **Published vectors** per algorithm: empty string, `"abc"`, `"The quick brown fox jumps over the lazy dog"`, and `"123456789"` (CRC32 → `cbf43926`). Verified during research: `abc` → MD5 `900150983cd24fb0d6963f7d28e17f72`, SHA-1 `a9993e36…d89d`, SHA-256 `ba7816bf…15ad`, SHA3-256 `3a985da7…1532`, RIPEMD-160 `8eb208f7e05d987a9b044a8e98c6b087f15a0bfc`.
- **Property tests (fast-check)** — the high-value ones for this feature: (a) *chunk invariance*: for every algorithm and any byte array split at arbitrary boundaries, incremental `update` calls equal one-shot; (b) *source invariance*: `fileChunks(blob, n)` for random `n` equals one-shot; (c) hex length === `bits/4` for every algorithm.
- **Cross-check against Web Crypto** in a test only: `crypto.subtle.digest` for SHA-1/256/384/512 on random inputs must equal engine output (independent oracle).
- `job.test.ts`: abort before start, abort mid-stream (async-generator source that awaits a latch), progress monotonic and ends at `total`, empty input.
- `client.test.ts` with a **fake Worker** (class with `postMessage`/`onmessage`/`terminate`): superseded job never resolves as success; `cancel()` posts cancel; `dispose()` terminates; stale `result` for old `jobId` ignored.
- Env note (verified): noble works under Vitest jsdom with `TextEncoder` output; `jsdom` `File`/`Blob` lack `.stream()` (hence `arrayBuffer` design).

---

## Web Worker vs Main Thread

**Decision: Worker for everything, including small text.**

| Option | Verdict | Reason |
|--------|---------|--------|
| Main thread for small text, Worker for files | Reject | Two code paths, noble in the main bundle (defeats lazy loading), and a large *pasted* text blob blocks typing |
| Main thread only (async chunking) | Reject | ~14 MB/s combined throughput on 10 algorithms = a 200 MB file freezes the UI for ~15 s even with chunking jank |
| **Worker for all** | **Use** | One path, library isolated in its own chunk, main thread stays responsive, cancel semantics identical for text and file |
| `crypto.subtle.digest` for SHA-2 | Reject | One-shot only (no incremental API) → must buffer the whole file in memory; and it covers only 4 of 10 algorithms |

**Next 16 + Turbopack pattern — verified on this repo's exact version (16.2.11):**

```ts
// lib/hash/client.ts — the literal must be inline in this module
const worker = new Worker(new URL("./hash.worker.ts", import.meta.url));
```

- Spike result: `.ts` worker with noble imports built with `next build` (Turbopack), emitted a separate worker chunk plus `turbopack-worker-*.js` bootstrap, ran in real Chrome against `next start` **and** `next dev`, all 9 noble digests correct. Playwright's `webServer` uses `npm run dev`, so e2e exercises the dev path — also verified.
- Don't pass `{ type: "module" }` (untested; unnecessary because Turbopack bundles the worker). Don't wrap `new URL(...)` in a variable or helper — bundlers need the static `new Worker(new URL(literal, import.meta.url))` shape.
- Known regression to be aware of (not hit here): vercel/next.js#93427 — relative worker URLs failing in 16.2.4/16.3.0-canary were for **Node `worker_threads`**, fixed in #93432; browser Web Worker bootstrapping was reworked in 16.2 (blob URL → real origin, #88602). Re-run the worker smoke test on any Next version bump.
- Worker TypeScript typing: the repo's `tsconfig` has `lib: ["dom", ...]` and no `webworker` lib; plain `self.onmessage = …` / `self.postMessage(msg)` type-checks (verified in `next build`'s TS pass). Route outbound messages through one typed `post(msg: WorkerResponse)` helper.
- Instantiate lazily from a `useEffect` (never during render/module import) so SSR prerender and Vitest import never touch `Worker`. The client factory is injectable.
- Fallback: if `typeof Worker === "undefined"` (very old browsers, restricted contexts), `createInThreadClient()` runs the same `runHashJob` via `await import("./engine")` on the main thread, still chunked + yielding. It doubles as the component test double. It is a safety net, not a first-class path.

**Message protocol (discriminated unions in `types.ts`):**

```
main → worker:  { type:"start", jobId, input:{kind:"text", text} | {kind:"file", file:File}, algos }
                { type:"cancel", jobId }
worker → main:  { type:"progress", jobId, done, total }
                { type:"result",   jobId, digests: Record<AlgorithmId, Uint8Array> }  // transfer buffers
                { type:"error",    jobId, message, name }      // e.g. NotReadableError, NotFoundError
                { type:"cancelled",jobId }
```

Post the `File` itself (structured-clone, no copy). Post text as a string. Never transfer big buffers from main.

---

## Cancellation — Superseding-Path Audit (project lesson applied up front)

Project lesson (PROJECT.md Key Decisions, Phase 4 CR-01 / Phase 5): *every* path that can supersede an in-flight async job must cancel it — abort + bump the sequence token — and the audit must enumerate all paths up front, not just the first one tested.

**Single funnel.** `client.start(req)` begins with `cancelCurrent()` (post `cancel` for the active `jobId`, `++seq`, resolve the old promise as `superseded`). `client.cancel()` is the same `cancelCurrent()` with no follow-up job. The hook never calls `worker.postMessage` itself, so there is exactly one place where "supersede" is implemented and tested.

**Three layers:**
1. **Sequence token in `client`/`useHashJob`** — guarantees the UI never renders a stale result even if the worker is slow to stop (mirror of `requestSeqRef` in `DnsTool.tsx`). Every `setState` in the hook is guarded by `seq === current`.
2. **Worker-side `AbortController`** — stops CPU work: checked between 1 MiB chunks, with the yield described above.
3. **`dispose()` → `worker.terminate()`** on unmount / route change. Optional hardening: if a cancelled job has not acknowledged within ~1 s, `terminate()` and lazily respawn.

**Path matrix (each needs a Vitest case in `client.test.ts`/`HashTool.test.tsx` AND an e2e where user-visible):**

| # | Superseding path | Expected behavior |
|---|------------------|-------------------|
| 1 | Text edit while a **text** job in flight | New job replaces; only latest digests render |
| 2 | Text edit while a **file** job in flight | File job cancelled, UI leaves file mode (file chip cleared), text job runs |
| 3 | New file via picker while file job in flight | Old cancelled, progress resets to new file |
| 4 | New file via drag-drop while file job in flight | Same as 3 (separate handler — test it separately) |
| 5 | Same file re-selected | `input.value = ""` after each pick so `change` fires again |
| 6 | Esc / Reset while in flight | Cancel + restore sample text + sample digests |
| 7 | Cancel button on progress UI | Cancel; keep prior result dimmed or restore last-complete (decide in UI spec) |
| 8 | Switch file → text mode via explicit control | Cancel file job |
| 9 | Unmount / navigate to another tool | `dispose()`; no `setState` after unmount |
| 10 | Multi-file / directory / non-file drop | Take first `File`; reject directories (size 0, empty type) with message; never start a job for non-files |
| 11 | File becomes unreadable mid-read (deleted/permission) | `error` message → error state; no stuck spinner |
| 12 | Case toggle | **NOT** a superseder: no cancel, no re-hash, no seq bump (explicit negative test) |
| 13 | Initial `?text=` on load | Treated as an initial `start`; no predecessor |

Window-level safety: while the page is mounted, `preventDefault()` on `dragover`/`drop` outside the dropzone so a missed drop doesn't navigate the browser away from the tool to the file.

---

## Lazy-Loading the Hash Library

No `dynamic import()` choreography needed; the worker boundary provides it:

- `@noble/hashes` is imported only by `lib/hash/engine.ts`, which is imported only by `hash.worker.ts` (and by `client.ts` via *dynamic* `import("./engine")` for the in-thread fallback). The tool's page chunk and the `HashTool` island chunk contain **no hash code**.
- Measured: worker chunk = **18,948 B raw / 7,775 B gzip** for MD5, SHA-1/224/256/384/512, SHA3-256/512, RIPEMD-160 (CRC32 adds <1 KB). It downloads only when the `Worker` is constructed.
- Construct the worker in a mount effect (warm, off-main-thread, parallel to first paint). The initial render uses the precomputed sample digests so the user sees results instantly regardless of worker readiness.
- Guardrails: ESLint `no-restricted-imports` or a Vitest import-graph test so nobody imports `engine.ts`/noble from a component or `page.tsx`; `algorithms.ts` stays the only thing UI/server code imports.
- Because Lighthouse measures main-thread JS, this keeps the page's JS cost equivalent to other tool pages plus the island code.

---

## URL State Decision

**Recommendation:** read `?text=` on load; never write it automatically; provide an explicit "Copy link" button.

Reasoning:
- Hash input is disproportionately likely to be **secrets** (passwords, API tokens, license keys) — a different sensitivity class from a CIDR or a hostname. A live `replaceState` of every keystroke puts secrets in browser history and autocomplete, and into Vercel request logs whenever the user reloads or shares the URL (the server sees the full query on a navigation).
- Analytics is already safe: `redactBeforeSend` strips every param not in `DEFAULT_ALLOW_LIST` (currently `[]`). **Do not add `text`.** Add the regression test. Note `redactBeforeSend` splits only on `?` — do **not** use the `#fragment` for state, because it would bypass the redaction logic (and is untested against what Vercel includes in `event.url`).
- Explicit "Copy link" gives the stated milestone value (shareable/bookmarkable text state) with an informed user action; reload does not restore (acceptable — the default result on load is the sample).
- Mechanics if/when written: `new URL(location.pathname, origin)` + `URLSearchParams.set("text", text)`, cap at ~2,000 characters (disable the button with a hint beyond that), `encodeURIComponent` semantics via `URLSearchParams`. Read side: `new URLSearchParams(window.location.search).get("text")` in a lazy `useState` initializer (as `getInitialLookupFromUrl` in `DnsTool.tsx`); cap length on read; never `useSearchParams()` (keeps the page static); never `router.replace()` (established decision).
- Files are never representable in URL state.

**Open decision for the user/roadmap (flag in REQUIREMENTS):** the milestone brief says "bookmarkable text state". If the user wants live-synced URLs consistent with Subnet/DNS, the fallback is a debounced (500 ms) `replaceState` with a ≤1 KB cap and a visible "text is in the URL" indicator — still no allow-list entry. Recommended default is explicit-only.

---

## Registry Category

Use **`"encode"`**.

- `generate` means "produces a value with no required input" (UUID). `encode` means "deterministic transform of user input" — Hash belongs with future base64/URL-encode/JWT-style tools, which is where the landing page would eventually group.
- The union already includes `"encode"` and `ToolCard.CATEGORY_LABELS` already has `encode: "Encode"` → no type changes. The landing page is a flat grid with no category grouping, so the only visible effect today is the card's category label. Flipping later is a one-word change with no test fallout (ToolCard tests use synthetic tools).

---

## Data Flow

```
user types ─▶ HashTool(onChange) ─▶ useHashJob.hashText(text)
                                      │ client.start({kind:text}) ─ cancelCurrent(); ++seq
                                      ▼
                              Worker: job(textChunks) ─ update×10 ─ digests
                                      ▼ postMessage result{jobId}
                              client: jobId/seq current? ──no──▶ drop
                                      │ yes
                                      ▼
                              useHashJob.setState({digests}) ─▶ rows render hex(format.ts, case toggle)
                                                              ─▶ per-row copy / copy-all

file drop/pick ─▶ useHashJob.hashFile(file) ─ same funnel ─▶ progress msgs (~10 Hz) ─▶ progress bar
Esc / Cancel   ─▶ useHashJob.cancel() / reset() ─▶ same funnel
on mount       ─▶ state = sampleDigests (constants); client created in effect; ?text= → hashText
unmount        ─▶ client.dispose() (terminate)
```

UI state shape (local to `HashTool`, mirroring `MacToolState`): `{ mode: "text"|"file", rawText, file: {name,size}|null, digests: Record<AlgorithmId, Uint8Array|hex>, status: "idle"|"hashing"|"error", progress?: {done,total}, uppercase: boolean }`. Keep last-valid digests rendered (dimmed) while hashing, per the project's keep-last-result convention, to avoid CLS.

---

## Integration With Existing Patterns (checklist for the plan author)

| Existing pattern | How Hash follows it |
|------------------|---------------------|
| Server shell + `next/dynamic(ssr:false)` island | `page.tsx` + `HashToolLoader.tsx` (copy `MacToolLoader.tsx`, fixed-height skeleton sized to textarea + 10 rows to avoid CLS) |
| `faq-data.ts` feeds visible FAQ and FAQPage JSON-LD | Same; add `sampleText`/`sampleDigests` too; JSON-LD `<` → `<` escape as in `mac/page.tsx` |
| Per-tool SEO | Unique title/description/canonical/OG; worked example table of `sampleDigests` rendered server-side; `hash-seo.spec.ts` |
| `useCopyToClipboard` | One hook instance per `HashRow` (own confirmation state) + one for copy-all; `aria-live` "Copied!" status span; 44×44 hit area; `reset()` on value change (copy `FormatRow` verbatim) |
| `useKeyboardShortcut` | `slash` focuses textarea (select-all so paste replaces); `escape` resets + cancels; `copy` (Ctrl/Cmd+C outside editable) → copy-all. **Do NOT register `enter`** — in a textarea it must insert a newline, and this hook's Enter handler fires from editable targets |
| Zero-effort default | Sample text prefilled, sample digests shown at first paint |
| Local-first / no third-party requests | Entire tool offline-capable; e2e can assert no network request beyond static assets while hashing |
| `data-testid` conventions | `hash-input`, `hash-row-<id>`, `hash-row-<id>-value`, `hash-row-<id>-copy`, `hash-copy-all`, `hash-file-input`, `hash-dropzone`, `hash-progress`, `hash-cancel`, `hash-uppercase`, `hash-copy-link` |
| a11y | File picker button usable without drag-drop; `aria-live` on completion; progress via `role="progressbar"`; drop zone is a convenience, not the only path |

---

## Anti-Patterns to Avoid

### 1. Importing noble (or `engine.ts`) from a component, page, or `algorithms.ts`
**Why bad:** silently ships ~19 KB into the page bundle and destroys the lazy-load boundary.
**Instead:** UI imports only `algorithms.ts`/`format.ts`/`client.ts`; add the lint/test guard.

### 2. Hashing text on the main thread "because it's small"
**Why bad:** two code paths, library on main thread, and pasted multi-MB text freezes typing.
**Instead:** same worker funnel for text and files.

### 3. Using `file.stream()` or `crypto.subtle.digest` as the file path
**Why bad:** `.stream()` is undefined in jsdom (untestable); `subtle.digest` has no incremental API and covers 4 of 10 algorithms.
**Instead:** `slice().arrayBuffer()` loop feeding incremental hashers.

### 4. Cancel by "ignoring the result" only
**Why bad:** the worker keeps burning CPU hashing a superseded 2 GB file while the new job queues behind it.
**Instead:** seq token (UI) **and** abort signal (CPU) **and** event-loop yield between chunks.

### 5. Re-hashing on case toggle / storing formatted strings in state
**Why bad:** needless work, cancels in-flight jobs, and risks the Phase 2 desync class of bug (copy ≠ display).
**Instead:** store bytes, format at render and at copy time from the same function.

### 6. Binding global `Enter` for this tool
**Why bad:** the hook fires it from editable targets; Enter in the textarea would also trigger the handler.
**Instead:** no `enter` handler; hashing is live.

### 7. Putting text in `#fragment` or auto-syncing to `?text=`
**Why bad:** fragment bypasses the `?`-split redaction; auto-sync leaks secrets to history/logs.
**Instead:** explicit "Copy link" (see URL State).

---

## Scalability / Performance Considerations

Measured on Node 22 / V8 (same engine family as Chrome; MEDIUM confidence for browsers), noble 2.4.0, 64 MiB buffer, per algorithm: SHA-1 419, SHA-256 332, SHA-224 325, RIPEMD-160 304, SHA-512 157, SHA-384 155, MD5 116, SHA3-256 76, SHA3-512 41 MB/s. **All 10 together ≈ 14 MB/s** (sum of per-algorithm times, single thread).

| File size | Single worker, all 10 algos | Mitigation |
|-----------|----------------------------|------------|
| 1 MB (text/docs) | ~70 ms — imperceptible | none |
| 100 MB | ~7 s | progress bar + Cancel required |
| 1 GB | ~70 s | progress + ETA/throughput readout; size warning ≥ ~500 MB; Cancel |
| 4 GB+ | minutes | Same; `Blob` slices keep memory flat (1 MiB working set) — memory is NOT the limit, time is |

Escape hatches if this proves too slow (design supports, do not build now): (a) split algorithms across 2–3 workers (each worker reads the file independently; protocol already takes `algos`) — SHA3-512 + MD5 are the long poles; (b) swap the engine for `hash-wasm` (WASM, several × faster, but ~1.8 MB package/per-algorithm WASM modules and added worker-origin/WASM complexity); (c) offer an "only selected algorithms" toggle. SHA-3 (41–76 MB/s) dominates wall time — worth noting in perf docs/FAQ.

Progress messages: throttle to ~10 Hz; `Math.min(done/total,1)`; handle `total === 0` (empty file → instant result).

---

## Suggested Build Order / Phase Decomposition

Phase numbers continue from v1.1 (which ended at Phase 7); labels are suggestions for the roadmapper.

### Phase A — Hash core + worker runtime (no UI) — "foundation"
- Install `@noble/hashes@2.4.0`; create `types`, `algorithms`, `crc32`, `engine`, `format`, `source`, `job`, `client`, `hash.worker.ts`.
- **Walking skeleton gate**: a throwaway or permanent dev harness proving `next build` emits the worker chunk and a real browser round-trips a digest (the spike in this research already proves feasibility; re-prove inside the repo and keep as an e2e once the page exists).
- Tests: published vectors for all 10, fast-check chunk-invariance + Web Crypto oracle, job abort/progress, client supersede/dispose with fake Worker.
- Why first: everything else depends on it; it is pure and independently testable (project convention: `lib/` before UI); de-risks the only genuinely new technology (workers under Turbopack) before UI investment.
- Avoids: chunk-boundary bugs, CRC leading-zero bug, stale-result races.

### Phase B — Tool page, text path, registry integration — "shippable text-only slice"
- `tools/registry.ts` entry (category `encode`), `ToolCard` icon, all hard-coded-count test fallout (registry, sitemap, home, navigation e2e), `page.tsx`, `HashToolLoader`, `HashTool` (textarea, 10 rows, per-row copy, copy-all, uppercase toggle, not-for-security labels), `useHashJob`, `faq-data.ts` with precomputed `sampleDigests` + unit test pinning them to engine output, SEO + JSON-LD, shortcuts (`/`, `Esc`, copy), `hash.spec.ts` + `hash-seo.spec.ts`, 320px layout check, `?text=` read-on-load.
- Depends on: Phase A client + algorithms metadata.
- Avoids: nav/landing/sitemap regressions (explicit fallout list above), CLS (skeleton + sample constants), Enter-in-textarea conflict.

### Phase C — File input, progress, cancel, share link, hardening
- Dropzone + picker, file chip, progress + Cancel, size warning, error states (unreadable/directory/multi-file), window-level drop guard, "Copy link" action, supersede e2e matrix (rows 1–13), analytics-redaction regression test, 100 MB synthetic-file cancel e2e (build the `File` in-page via `DataTransfer`, don't ship 100 MB through Playwright's `setInputFiles`), Lighthouse check (no hash code in initial JS), final a11y pass for this tool.
- Depends on: Phase B UI and Phase A cancel plumbing.
- Avoids: the Phase 4/5 recurring "missed superseding path" defect (matrix up front), secrets in URL/analytics.

Why not collapse A into B: A has no UI to review and its exit criterion is crisp (vectors + worker smoke), which lets B be planned against a stable `client` interface. Why not merge B and C: text-only is independently shippable and gives an early prod-verifiable milestone; file handling is where nearly all the async/cancel risk lives and deserves its own security review (untrusted file input, DoS by huge file, error paths).

**Research flags:**
- Phase A: worker + Turbopack is the only novel area — already spiked; reconfirm in-repo; no further research.
- Phase B: standard patterns (copy MAC tool); no research.
- Phase C: UI-level decisions (progress/ETA copy, size-warning threshold, directory-drop UX) need `discuss-phase`; consider threat-model pass (huge file, exotic filenames in UI, `name` is untrusted display text — render as text, never HTML).

---

## Verification Evidence (how claims above were checked)

Done in a throwaway copy of the repo under the session scratchpad (no files in the real repo were touched):

1. Added `app/spike/hash.worker.ts` (noble sha2/sha3/legacy via `.create().update()`) + client page using `new Worker(new URL("./hash.worker.ts", import.meta.url))`.
2. `next build` (Next 16.2.11, Turbopack) → compiled, TS passed, static prerender passed.
3. `next start` and `next dev` + real Chrome via Playwright → worker ran, produced correct digests for `abc` (MD5/SHA-1/SHA-224/SHA-256/SHA-384/SHA-512/SHA3-256/SHA3-512/RIPEMD-160 all matched published values); worker chunk loaded as its own request.
4. Chunk size: 18,948 B raw / 7,775 B gzip.
5. Node benchmark of per-algorithm throughput (numbers above).
6. Vitest (jsdom, vitest 4.1.10): noble hashes `TextEncoder` output correctly; `File.arrayBuffer()` exists; `File.stream` is `undefined`.
7. `lucide-react` exports `Hash` (icon for registry/ToolCard).

Not verified (call out for implementers): browser (non-Node) throughput numbers; behavior of `{type:"module"}` worker option; Safari/Firefox worker behavior (standard API, expected fine; add to manual UAT); what exactly Vercel Analytics includes in `event.url` re: hash fragment (hence the "no fragment" rule).

---

## Sources

- Repo inspection (HIGH): `tools/registry.ts`, `components/ToolCard.tsx`, `app/tools/{mac,dns,subnet}/*`, `lib/hooks/*`, `lib/analytics/{redact,PacketoryAnalytics}.ts*`, `app/sitemap.ts`, `*.test.ts` hard-coded lists, `tests/e2e/{home,navigation,mac-lookup,uuid-seo}.spec.ts`, `.planning/PROJECT.md` Key Decisions.
- `@noble/hashes` 2.4.0: npm registry metadata (MIT, zero deps, `sideEffects:false`, exports `sha2.js`/`sha3.js`/`legacy.js`) and package type definitions inspected via `npm pack` — HIGH.
- [Turbopack: What's New in Next.js 16.2 — Web Worker Origin](https://nextjs.org/blog/next-16-2-turbopack) — HIGH (official).
- [Next.js commit — Fix Turbopack worker_threads URL resolution (#93432, issue #93427)](https://app.semanticdiff.com/gh/vercel/next.js/commit/cb96548418cb856cf91d2bdda2083f5bd1e9611b) and [commit d23af53 (browser worker bootstrap rework)](https://app.semanticdiff.com/gh/vercel/next.js/commit/d23af53268d062ff70b7c12322750b85ed3a76ba) — MEDIUM (secondary mirror; scope of regression = Node worker_threads, browser path confirmed independently by the local spike).
- Local spike results and benchmark (HIGH for this repo/version; MEDIUM for cross-browser throughput).
