# Technology Stack — v1.2 Hash Generator (additions only)

**Project:** Packetory
**Milestone:** v1.2 Hash Generator (`/tools/hash`)
**Researched:** 2026-10-14
**Overall confidence:** HIGH (versions from npm registry; sizes and throughput measured locally; Worker bundling verified by a real Next 16.2.11 production build driven in Chrome)

Scope: only what is NEW. Next 16.2.11 / React 19.2.8 / Tailwind 4 / Vitest / fast-check / Playwright / the shared shell, `useCopyToClipboard`, `useKeyboardShortcut` and `history.replaceState` URL state are already validated and not re-researched.

## Recommendation (one line)

**Add exactly one runtime dependency: `hash-wasm@4.12.0` (exact pin).** It implements all ten target algorithms, including CRC32, behind one streaming API, with no other packages. Run it in a lazily created Web Worker for files and on the main thread for text. Use **no** other hashing library. Test with `node:crypto` and `node:zlib` as oracles, so there are no new dev dependencies.

## Recommended Stack

### New runtime dependency

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `hash-wasm` | **4.12.0** (pin exact, no caret) | MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, RIPEMD-160, CRC32 for text and files | The only candidate that covers all 10 algorithms (CRC32 included) in one zero-dependency package. It has an incremental `createX()` / `update()` / `digest()` API for chunked file hashing. It is MIT, ships its own `.d.ts`, has `"sideEffects": false` and per-algorithm ESM exports that tree-shake. WASM is embedded as base64 in the JS, so there is no separate `.wasm` request and no third-party request. It is about 5x faster than pure-JS noble on large files (table below), which matters for the ISO/image-checksum use case. |

Installation:

```bash
npm install --save-exact hash-wasm@4.12.0
```

No dev dependencies are added. Test oracles come from Node itself:

- `node:crypto` `createHash('md5' | 'sha1' | 'sha224' | 'sha256' | 'sha384' | 'sha512' | 'sha3-256' | 'sha3-512' | 'ripemd160')`
- `node:zlib` `crc32()` (Node >= 22.2; CI pins Node 22)

### Verified facts about hash-wasm 4.12.0

- **Maintenance:** last published 2024-11-19. About 1.9M weekly downloads. GitHub: 1,160 stars, 13 open issues, not archived. It is quiet but stable. The hash algorithms are frozen standards and the WASM blobs are static, so staleness is a low risk. Mitigation: exact pin, and wrap it behind `lib/hash` so swapping to `@noble/hashes` is a one-file change (see Alternatives).
- **License:** MIT. The LICENSE notes "embedded C implementations might use other, similarly permissive licenses". This is acceptable, but it belongs in a NOTICE/credits line if the project keeps one.
- **Correctness (verified locally):** across 5 inputs (empty, `abc`, `123456789`, a multi-byte UTF-8 string with emoji and CJK, and 1000 x `a`), all 9 digests matched `node:crypto` and CRC32 matched `zlib.crc32`, with 0 mismatches. `crc32("123456789")` is `cbf43926`, the standard IEEE check value. Streaming 1,000,003 random bytes in odd 65,537-byte chunks matched one-shot results for SHA3-512 and CRC32.
- **Input handling:** strings are UTF-8 encoded internally. Typed arrays are detected with `ArrayBuffer.isView`, which is cross-realm safe, so it behaves under Vitest/jsdom. Output is lowercase hex. CRC32 output is 8-char hex, big-endian presentation of the standard value.
- **Statefulness gotchas:**
  - `digest()` flips the instance to uninitialized. Call `init()` before reuse, or create a fresh set per file.
  - `createX()` instances are stateful and must not be shared across concurrent files.
  - The one-shot functions (`md5(str)`, `sha3(str, 256)`, …) are fine to call concurrently from the main thread: after their one `await`, the work is synchronous.

### Bundle size (measured with esbuild `--minify`, tree-shaken, WASM base64 included)

| Algorithm set | Raw | gzip |
|---|---|---|
| hash-wasm, all 10 (`createMD5 … createCRC32`) | 67.1 KB | **24.5 KB** (br 19.9 KB) |
| hash-wasm per algorithm: MD5 / SHA-1 / SHA-256 (= SHA-224) / SHA-512 (= SHA-384) / RIPEMD-160 / SHA3 / CRC32 | 10.2 / 13.0 / 18.5 / 23.6 / 14.6 / 11.1 / 7.4 KB | 4.7 / 5.6 / 7.1 / 8.3 / 6.1 / 4.9 / 3.3 KB |
| @noble/hashes, 9 algorithms (no CRC32) | 18.8 KB | 7.9 KB (br 6.8 KB) |
| crypto-js, whole library (not tree-shakeable in practice) | 72.8 KB | 27.0 KB |
| spark-md5 / js-md5 (MD5 only) | 9.1 / 10.1 KB | 3.0 / 3.5 KB |
| crc-32 | 2.6 KB | 1.2 KB |

Sizes are per tree-shaken algorithm, so adding or removing a row in the algorithm registry changes the chunk size predictably. All of it sits in a lazily loaded client chunk behind the existing `next/dynamic(..., { ssr: false })` island, or in the worker chunk. The roughly 16 KB gzip premium over noble does not touch the server-rendered shell, and the Lighthouse impact is expected to be negligible. **Re-measure with `next build` and Lighthouse in the phase.**

### Throughput (measured: Node 22.13, macOS, V8, 128 MiB, 1 MiB chunks, single thread)

| Algorithm | @noble/hashes 2.4.0 (pure JS) | hash-wasm 4.12.0 (WASM) | node:crypto (native reference) |
|---|---|---|---|
| MD5 | 116 MB/s | 644 | 750 |
| SHA-1 | 431 | 971 | 3369 |
| SHA-224 / SHA-256 | 335 / 326 | 568 / 560 | n/a / 3375 |
| SHA-384 / SHA-512 | 156 / 156 | 877 / 931 | n/a / 1911 |
| SHA3-256 | 75 | 784 | 1120 |
| SHA3-512 | **39** | 423 | n/a |
| RIPEMD-160 | 311 | 628 | 597 |
| CRC32 | n/a (crc-32 pkg: 2452) | 2596 | n/a |
| **All 10 serially (what the tool needs)** | **about 14 MB/s** | **about 72 MB/s** | n/a |
| **Time for 100 MB / 1 GiB** | about 7 s / **about 74 s** | about 1.4 s / **about 14 s** | n/a |

- hash-wasm throughput is insensitive to chunk size: 578 / 595 / 596 MB/s for SHA-256 at 64 KiB / 1 MiB / 4 MiB. Browser-chosen `File.stream()` chunk sizes are therefore fine.
- Confidence: MEDIUM for absolute numbers in browsers. Node/V8 results transfer well to Chrome/Edge. Safari (JSC) and Firefox will differ, so treat the 5x ratio as the planning figure, not the absolute MB/s.
- Native `node:crypto` is not available in the browser. It is shown only as a ceiling.

### Integration (new files only)

| Piece | Recommendation |
|-------|----------------|
| `lib/hash/` core (framework-agnostic, matches the `lib/uuid`, `lib/subnet`, `lib/mac` pattern) | An `algorithms.ts` registry (id, label, bit length, one-shot fn, `create` fn), a text API (`hashText(str)` returning all 10 hex digests via `Promise.all` of the one-shot functions), and a streaming API `hashStream(chunks: AsyncIterable<Uint8Array>, { signal, onProgress })`. Taking an `AsyncIterable` rather than a `File` keeps it unit-testable in Vitest without a browser. It creates fresh `createX()` instances per call, feeds every chunk to all 10, and returns the digests. |
| Worker | A thin `hash.worker.ts` wraps `hashStream` and posts throttled progress (about 10 Hz) and the final result. Use a plain `postMessage` protocol of about 40 lines. **Cancel = `worker.terminate()`**, which also satisfies `Esc` and starting a new file. Create the worker lazily on first file drop, and terminate it after completion or cancel. |
| Reading files | `file.stream().getReader()`, with `file.slice(i, i + 4 MiB).arrayBuffer()` as a simple alternative. Both stream with bounded memory and have no 2 GB ArrayBuffer ceiling. |
| Text path | Main thread, async, debounced as DNS/MAC are. Reuse the sequence-token and cancel-on-supersede discipline from the Key Decisions table, because one-shot hashing is `async`. Above a threshold of about 1 MiB of pasted text, route to the worker instead of blocking the main thread. |
| Default result on load | The default sample's ten digests are build-time constants. Consider rendering them in the server shell (no JS needed) and hydrating the live input afterwards. This is an optimization the phase can decide on. |
| Vitest | Put `// @vitest-environment node` at the top of `lib/hash/*.test.ts` (the repo default is jsdom). This is zero-risk, since hash-wasm is realm-safe anyway. Add published vectors (NIST/RFC 1321/RIPEMD-160 paper, CRC `123456789 -> cbf43926`) as the primary assertions, and `fast-check` properties against `node:crypto`/`zlib.crc32` as differential tests. Include a chunk-boundary property: hashing a buffer split at arbitrary points must equal the one-shot hash. Guard the RIPEMD-160 oracle (`try { createHash('ripemd160') }`), because some OpenSSL 3 builds disable it. The hard-coded vectors still cover it. |
| Playwright | Cover typing, drop/picker of a small fixture file, `Esc` cancel of a large generated file, and URL-state restore. The worker path needs a real browser, so it belongs here. |
| Worker bundling (verified) | `new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" })` works on **Next 16.2.11 with Turbopack production build**. A scratch app with this exact Next/React/TS pin produced a bundled `turbopack-worker-*.js` entry plus chunk, and Chrome ran it: `sha256("x")` and `@noble` MD5 worked inside the worker, with no `.wasm` fetch. See Pitfalls below. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Engine | `hash-wasm` | `@noble/hashes@2.4.0` (MIT, audited, actively maintained: last push 2026-09-08, about 97M weekly downloads, zero deps, `sideEffects:false`, sync API, `legacy.js` has MD5/SHA-1/RIPEMD-160, `sha2.js`, `sha3.js`) | **The strongest runner-up and the documented fallback.** Smaller (7.9 KB gz for 9 algorithms), sync (no async races for live typing), audited. But it is about 5x slower: all-10 on 1 GiB takes about 74 s (SHA3-512 at 39 MB/s is the bottleneck), 4 GiB ISOs take about 5 min, and it has **no CRC32**, so you would still need a CRC32 source. Choose it if hash-wasm turns out to have a browser compat or maintenance problem, or if you decide file speed does not matter. It is the same `Hash` shape (`create().update().digest()`), so the swap stays inside `lib/hash`. |
| Engine | `hash-wasm` | **Hybrid:** noble for text on the main thread plus hash-wasm in the file worker | Rejected for v1.2. Two engines means two APIs, two bundles and a bigger test matrix, for about 16 KB gz saved on a lazily loaded island. Do it later only if Lighthouse shows a real problem. |
| Engine | `hash-wasm` | Native Web Crypto `SubtleCrypto.digest` | Only SHA-1/256/384/512. It is **one-shot with no streaming**: it needs the entire file as one `ArrayBuffer` (RAM equal to file size, hard failure around 2 GB) and has no MD5, SHA-224, SHA-3, RIPEMD-160 or CRC32. Its speed advantage is moot when the other six algorithms need a library anyway and every hash must be computed in the same pass. Not worth a second code path. |
| CRC32 | `hash-wasm` `crc32` (2.6 GB/s measured) | `crc-32@1.2.2` (Apache-2.0, zero deps, 1.2 KB gz, 53M weekly downloads, last published 2022) | Equivalent speed (2.45 GB/s) and correct, but redundant once hash-wasm is present. It adds a dependency and a second license for nothing. Use it only if you pick the noble path. |
| CRC32 | `hash-wasm` | Hand-rolled 256-entry table (about 12 lines) | Measured at about 580 MB/s and bit-exact against `zlib.crc32`. A fine zero-dependency fallback on the noble path, but 4x slower than slice-by-N, and there is no reason to hand-roll when it comes free. |
| MD5 | `hash-wasm` | `js-md5@0.9.2` (MIT, maintained, 3.5 KB gz), `spark-md5@3.0.2` (WTFPL-or-MIT, 3 KB gz, last push 2023) | Single-algorithm libraries. They would mean adding up to 3 more packages with inconsistent APIs to match one that already does everything. spark-md5 has a nice incremental `ArrayBuffer` API but no other algorithm. |
| Everything | `hash-wasm` | `crypto-js@4.2.0` | **Discontinued by its own README** ("no longer maintained"). Not tree-shakeable (27 KB gz for everything), `WordArray`-based so it is slow and awkward for `Uint8Array` streaming, and has no CRC32. |
| Everything | `hash-wasm` | `sha.js`, `ripemd160`, `hash.js`, `md5` (npm) | Node/browserify polyfill lineage with transitive deps (`inherits`, `safe-buffer`, `to-buffer`, `hash-base`, `is-buffer`, `crypt`, `charenc`). They need `Buffer` shims, are slow, and give no unified streaming API. |
| Worker RPC | Hand-written `postMessage` protocol | `comlink` | Not needed for a one-shot job-and-progress protocol. Skip the dependency. |
| File input UI | Native drag/drop events plus hidden `<input type="file">` | `react-dropzone` | A drop zone needs about 40 lines of React. Do not add a dependency. |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `crypto-js` | Discontinued, large, no CRC32, not tree-shakeable | `hash-wasm` |
| `crc-32`, `spark-md5`, `js-md5` alongside hash-wasm | Redundant, extra deps and licenses (Apache-2.0 for crc-32) | hash-wasm's own `crc32` / `md5` |
| Both `@noble/hashes` and `hash-wasm` in production | Two engines, two APIs, double the test surface | Pick one. `hash-wasm` now, noble as the contingency swap. |
| `file.arrayBuffer()` / `FileReader.readAsArrayBuffer()` on the whole file | Memory equal to file size; fails or OOMs in the GB range | Chunked `file.stream()` reader or `slice().arrayBuffer()` |
| Whole-file hashing on the main thread | Freezes UI for seconds to a minute (about 14 s/GiB even with WASM) and breaks `Esc` | Worker plus `terminate()` |
| `Buffer` / Node `crypto` polyfills (`crypto-browserify`, `stream-browserify`, webpack/Turbopack fallbacks) | Pull in huge shims. Not needed, since hash-wasm uses `TextEncoder`/typed arrays. | Nothing |
| Any CDN-hosted hash lib or WASM file | Violates "no third-party requests" | hash-wasm embeds its WASM in the JS bundle |
| A server API route for hashing | Violates local-first and privacy (files must never leave the browser) | In-browser only |
| `next.config` `experimental` worker or WASM flags, or `output: export` changes | Unnecessary, since the default Turbopack build bundles the worker | Leave `next.config.ts` untouched |

## Pitfalls specific to this stack choice (feed PITFALLS.md and phase planning)

1. **Turbopack worker regression risk (MEDIUM, verify in CI).** Public reports say `new Worker(new URL(...))` regressed in Next 16.2.4 and 16.3.0-canary.8, with a fix landing in the 16.3 canaries (about 2026-07-28). I verified the pattern works on the **pinned 16.2.11** production build (worker chunk emitted, executed in Chrome). Mitigations:
   - Keep Next pinned.
   - Add the Playwright worker e2e as the guard against a future bump.
   - Keep `hashStream` worker-agnostic, so a fallback to a main-thread loop that yields via `setTimeout` between chunks is trivial.
   - Cosmetic: the build also emits an unreferenced copy of the worker `.ts` source under `.next/static/media/`. It is harmless but publicly fetchable (no secrets in it).
2. **CSP (LOW, future).** There is no CSP today (`next.config.ts` is empty). Instantiating WASM requires `'wasm-unsafe-eval'` in `script-src` (and `worker-src 'self'`) if a CSP is ever added. Note this in the analytics/privacy hardening backlog.
3. **Async text path means race conditions.** `hash-wasm` one-shots return Promises. Apply the project's "every superseding path cancels its predecessor" rule (sequence token) to typing, paste, example load, and `Esc` reset.
4. **Stateful hasher reuse.** `digest()` invalidates a hasher, and instances are not shareable across concurrent files. Always create a fresh set per file and per cancel/restart.
5. **Absolute speeds are browser-dependent.** Plan the progress UI (bytes/total, throttled, cancel) for all files above about 50 MB regardless. At about 72 MB/s, 500 MB takes about 7 s.
6. **CRC32 display.** The tool shows the standard IEEE CRC-32 (zip/PNG) as 8 hex chars. Offer the decimal form only if the Features research asks for it.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `hash-wasm@4.12.0` | Next 16.2.11 (Turbopack and webpack), React 19.2.8, TS 6.0.3 | Own types at `dist/lib/index.d.ts`. ESM with `sideEffects:false`. Zero dependencies. Runs in Node 22 (Vitest) and modern browsers with WebAssembly. |
| Web Worker (`type: "module"`) | Chromium, Firefox, Safari 15+ | Module workers are baseline-supported. Verified end-to-end in Chrome only. Add Firefox/WebKit to the e2e matrix if the project's Playwright config includes them. |

## Sources

- npm registry (`npm view`), 2026-10-14. HIGH.
  - `@noble/hashes` 2.4.0 (MIT, 691 KB unpacked, engines node >=20.19, modified 2026-08-27)
  - `hash-wasm` 4.12.0 (MIT, 1.8 MB unpacked, modified 2024-11-19)
  - `crc-32` 1.2.2 (Apache-2.0, 31 KB, 2022-06-14)
  - `js-md5` 0.9.2, `spark-md5` 3.0.2, `crypto-js` 4.2.0, `ripemd160` 2.0.3, `sha.js` 2.4.12, `hash.js` 1.1.7, `md5` 2.3.0, `js-sha3` 0.13.0
  - `@aws-crypto/crc32` 5.2.0
- npm downloads API (weekly): hash-wasm 1.94M, @noble/hashes 97.1M, crc-32 53.1M. HIGH.
- GitHub API: Daninet/hash-wasm (last push 2024-11-19, 1,160 stars, 13 open issues); paulmillr/noble-hashes (last push 2026-09-08, 930 stars, 4 open issues). HIGH.
- Local measurements (esbuild bundles; Node 22.13 throughput; correctness vs `node:crypto` and `zlib.crc32`; real Next 16.2.11 production build with Worker driven in Chrome). HIGH for the relative comparisons, MEDIUM for absolute browser throughput.
- crypto-js README ("Discontinued" notice), read from the installed package. HIGH.
- Next.js/Turbopack worker-URL regression and fix: [Next.js 16.2 Turbopack blog](https://nextjs.org/blog/next-16-2-turbopack), [Next.js 16.3 Turbopack blog](https://nextjs.org/blog/next-16-3-turbopack), plus commit and release-note aggregators surfaced by web search (PR #93432 / #96307). MEDIUM, secondary sources, corroborated by the local build test on 16.2.11.
