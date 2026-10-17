# Project Research Summary

**Project:** Packetory v1.2 — Hash Generator (`/tools/hash`)
**Domain:** In-browser hash/checksum utility
**Researched:** 2026-10-14
**Confidence:** MEDIUM-HIGH

## Executive Summary

A single zero-effort `/tools/hash` page computing 10 digests at once (MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, RIPEMD-160, CRC32) for typed text and dropped/picked files, entirely in-browser. Web Crypto alone cannot do it (one-shot only; no MD5/SHA-224/SHA-3/RIPEMD-160/CRC32), so a JS or WASM library is required.

Recommended shape: a framework-agnostic `lib/hash/` core with the hash engine isolated in `lib/hash/engine.ts`; text and files share one path through a Web Worker using a 1 MiB `blob.slice().arrayBuffer()` loop and incremental hashers; races handled by one funnel (sequence token + abort + terminate); default result is precomputed sample digests rendered by the server shell. Main risks: correctness (UTF-8, CRC32 variant, SHA3 vs Keccak), secrets leaking into URL/analytics, and missed superseding paths.

## Decisions Requiring User Input

### 1. Hash engine (BLOCKING for the core phase) — researchers disagree

| | Option A: `hash-wasm@4.12.0` (STACK.md) | Option B: `@noble/hashes@2.4.0` + hand-rolled CRC32 (ARCHITECTURE.md) |
|---|---|---|
| Coverage | All 10 incl. CRC32 | 9 from noble; CRC32 ~20 lines hand-rolled |
| Throughput (all 10, serial, Node) | ~72 MB/s (1 GiB ≈ 14 s) | ~14 MB/s (1 GiB ≈ 74 s; SHA3-512 bottleneck) |
| Size | ~24.5 KB gzip (all 10) | ~7.8–7.9 KB gzip |
| Maintenance | Last publish 2024-11-19; stable/quiet | Pushed 2026-09-08; audited; very active |
| API | Async (WASM init); WASM embedded, no extra request | Synchronous, pure JS |
| Future CSP | needs `'wasm-unsafe-eval'` | none |

Either is a one-file swap behind `engine.ts`. Synthesizer lean: B for an audited correctness/privacy tool; A if large-file speed matters. Sub-question: Worker `{type:"module"}` option — settle with in-repo smoke test.

### 2. URL state for text

- **Option A (recommended by FEATURES, ARCHITECTURE, PITFALLS):** read `?text=` on load; write only via an explicit "Copy link" action, capped ~1–2 KB.
- **Option B:** debounced live `replaceState` sync, capped ~1 KB, with a visible "text is in the URL" indicator.

Hash input is often a secret; live URL writes leak it into history, sync, and Vercel logs. Either way: never allow-list `text` in analytics; never put files, filenames, or HMAC keys in URL; don't use `#fragment`.

### 3. Registry category

Recommend `"encode"` (already in union and `ToolCard.CATEGORY_LABELS`; no type change).

### Settled in planning (non-blocking)

- Esc: clear + cancel + restore sample.
- Text soft cap: warn ~1–5 MB (benchmark in core phase).
- Base64 output: include (CRC32 row always hex).
- Paste-to-verify: P1 differentiator.
- Defer: HMAC, input encodings, newline/CRLF toggles, SRI copy, char diff, batch mode, extra algorithms, Keccak-256 row.
- **Correction:** RFC 3720 vectors are CRC-32C (`"123456789"` → `e3069283`), not IEEE CRC-32 (`cbf43926`). Requirements must cite the IEEE check value.

## Key Findings

### Recommended Stack

One runtime dependency, imported only by `lib/hash/engine.ts`. Worker via `new Worker(new URL("./hash.worker.ts", import.meta.url))` inside `lib/hash/client.ts` — verified on pinned Next 16.2.11 (build, start, dev) by two researchers. Keep Next pinned (Turbopack worker regressions reported in 16.2.4 / 16.3 canaries). File reading via `blob.slice().arrayBuffer()` (jsdom lacks `Blob.stream`).

**Testing:** Vitest with published vectors as primary assertions; fast-check differential vs `node:crypto` / `zlib.crc32`; chunk-split property; Playwright for worker/file/cancel paths against production build. Guard RIPEMD-160 oracle availability with try/catch.

### Expected Features

**Must have (table stakes):**
- All 10 digests at once, live, sample result on load
- Per-row copy with confirmation, copy-all, hex case toggle
- UTF-8 byte count + trailing-newline hint
- File picker + drag-drop, streamed with progress + cancel
- Race-safe superseding; vector gate; registry + SEO/FAQ; 320px; network-silence e2e

**Should have (differentiators):**
- Paste-to-verify (normalize case/whitespace/separators/`sha256:` prefix/whole `sha256sum` line; highlight all matching rows)
- `sha256sum`-format copy-all (no CSV — filenames are free text)
- Not-for-security labels on MD5/SHA-1 (text, not modal)
- Explicit "Copy link"

**Anti-features:** auto URL write, server hashing, URL fetching, password/KDF features, algorithm picker, localStorage input, modals, Enter bound to execute.

### Architecture Approach

Server shell + `ssr:false` client island (copy `MacToolLoader` pattern).

**Major components:**
1. `lib/hash/{types,algorithms,engine,crc32?,format,source,job,client}.ts` + `hash.worker.ts` — `algorithms.ts` is metadata only (safe for server import); `client.start()` is the single cancel-predecessor funnel; `job.ts` yields per chunk so cancel can arrive
2. `app/tools/hash/{page,HashToolLoader,HashTool,useHashJob,faq-data}.tsx/ts` — `sampleDigests` pinned by unit test
3. Registry entry + `Hash` icon in `ToolCard` `ICONS` (missing entry silently falls back to UUID icon)

**Hard-coded test fallout (4 → 5 tools):** `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts`. Add `?text=`-stripped regression test to `redact.test.ts`. Do not modify nav, sitemap, redact.ts, or privacy page.

### Critical Pitfalls

1. **Encoding** — single `TextEncoder` choke point; never trim/normalize; test é, €, 🚀, NFC vs NFD, lone surrogate.
2. **Textarea newlines** — CRLF normalizes to LF; `spellCheck=false`, `autoCorrect/autoCapitalize=off`, password-manager-ignore attributes; Enter must not be bound (hook fires on editable targets).
3. **SHA3-256 vs Keccak** — `SHA3-256("")` = `a7ffc6f8…f8434a`; Keccak `c5d24601…` as negative test.
4. **CRC32** — IEEE only, unsigned, 8-char zero-padded, init/final-XOR once per file; `cbf43926`; chunk-split property.
5. **Whole-file reads & races** — chunk only; every superseding path (typing, drop, picker, mode switch, Esc, Clear, unmount, `?text=` load) bumps token and cancels. `redactBeforeSend` returns events untouched when there's no `?`, so fragment state would bypass redaction — strip fragment and test.

Also: noble v2 needs `.js` subpaths; hashers are single-use after `digest()`; window-level dragover/drop `preventDefault`; 0-byte file test (`e3b0c442…b855`); test on production build.

## Implications for Roadmap

### Phase A: Hash core & worker runtime (no UI)
**Rationale:** correctness gate before any UI.
**Delivers:** all `lib/hash/*` modules, worker, in-repo production-build worker smoke test.
**Avoids:** encoding, SHA3/Keccak, CRC, chunk-boundary, client-race bugs.
**Exit gate:** FIPS 180-4/202, RFC 1321, RIPEMD-160 reference, CRC catalogue vectors; padding boundaries (0,1,55,56,63,64,65,111,112,127,128,129); million-`a`; SHA3 rate±1; Keccak negatives; fast-check chunk-split + oracle; fake-Worker supersede/dispose tests.

### Phase B: Tool page & text path
**Delivers:** registry entry + test fallout, ToolCard icon, page/loader/HashTool (textarea, byte count, hint, 10 rows, copy, copy-all, case + Base64 toggles, legacy labels), `useHashJob`, faq-data/SEO/JSON-LD, `/` + Esc + copy shortcut (no Enter), `?text=` read-on-load, paste-to-verify, e2e + SEO specs, 320px. Shippable text-only.

### Phase C: File input & hardening
**Delivers:** picker + drop zone, file chip, progress + Cancel, ~500 MB size warning, error states (unreadable, directory, multi-file), window drop guard, Copy link, full 13-path supersede matrix, analytics fragment redaction fix + tests, network-silence e2e, large-file e2e via DataTransfer, Lighthouse/bundle check (no hash code in initial JS), a11y pass.

### Research Flags

- **Phase A:** needs Decision 1 + Worker `type` check first.
- **Phase C:** `discuss-phase` for progress copy, size threshold, directory-drop UX; short threat pass; real iOS Safari check with 500 MB file (LOW confidence).
- **Phase B:** standard patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Engine unresolved; browser throughput MEDIUM |
| Features | MEDIUM-HIGH | Competitor behavior partly from memory |
| Architecture | HIGH | Repo inspected; worker verified in Chrome on 16.2.11 |
| Pitfalls | HIGH | iOS memory limits LOW |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- Decisions 1–2; Worker `type` option
- CI Node ≥22.2 for `zlib.crc32`; OpenSSL `ripemd160` availability
- Whether Vercel Analytics includes `location.hash` (assume yes, fix defensively)
- Future CSP needs (`wasm-unsafe-eval`, `worker-src 'self'`)
- Any privacy/legal wording change requires human approval

## Sources

### Primary (HIGH confidence)
- npm registry + download API (2026-10-14): hash-wasm, @noble/hashes, crc-32, alternatives; GitHub metadata
- Researchers' local measurements: esbuild sizes, Node 22.13 throughput, correctness vs `node:crypto`/`zlib.crc32`, real Next 16.2.11 production build in Chrome
- Repo inspection: registry, ToolCard, hooks, analytics redact/PacketoryAnalytics, sitemap, tsconfig, tests

### Secondary (MEDIUM confidence)
- Live fetch of emn178 online-tools; sha1-online.com (partial)
- Next.js 16.2 Turbopack blog; vercel/next.js #93427, #93432
- Reference vectors: RFC 1321, FIPS 180-4/202, RIPEMD-160 reference, CRC catalogue (re-verified by tests)

### Tertiary (LOW confidence)
- iOS Safari memory limits; Vercel fragment behavior; Safari/Firefox worker behavior

---
*Research completed: 2026-10-14*
*Ready for roadmap: yes (after Decisions 1–3)*
