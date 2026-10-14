# Roadmap: Packetory

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-07-25)
- ✅ **v1.1 Production Domain & Landing Page Polish** — Phases 6-7 (shipped 2026-07-25)
- 🚧 **v1.2 Hash Generator** — Phases 8-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-07-25</summary>

- [x] Phase 1: Shared Shell + Registry (5/5 plans) — completed 2026-07-23
- [x] Phase 2: UUID Generator (4/4 plans) — completed 2026-07-24
- [x] Phase 3: IP Subnet Calculator (5/5 plans) — completed 2026-07-24
- [x] Phase 4: DNS Lookup (4/4 plans) — completed 2026-07-25
- [x] Phase 5: MAC Address Inspector (3/3 plans) — completed 2026-07-25

Full phase details archived at `.planning/milestones/v1.0-ROADMAP.md`.

</details>

<details>
<summary>✅ v1.1 Production Domain & Landing Page Polish (Phases 6-7) — SHIPPED 2026-07-25</summary>

- [x] Phase 6: Landing Page Card Navigation (2/2 plans) — completed 2026-07-25
- [x] Phase 7: Production Domain Cutover (packetory.dev) (1/1 plans) — completed 2026-07-25

Full phase details archived at `.planning/milestones/v1.1-ROADMAP.md`.

</details>

### v1.2 Hash Generator (Phases 8-10)

**Milestone Goal:** Add a fifth tool, `/tools/hash`, that computes 10 common hashes (MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, RIPEMD-160, CRC32) of typed text or a dropped file entirely in the browser — with Packetory's zero-effort, one-click-copy, keyboard-first UX.

**Locked decisions (do not reopen):** hash engine = `@noble/hashes@2.4.0` (imported only from `lib/hash/engine.ts`) + hand-rolled IEEE CRC32; URL state = read `?text=` on load, write only via an explicit "Copy link" action (never auto-written); extras included = paste-to-verify, `sha256sum` copy format, Base64 toggle; HMAC deferred; registry category = `encode`.

- [ ] **Phase 8: Hash Core & Worker Runtime** - Correct, vector-verified digests for all 10 algorithms, computed incrementally inside a Web Worker (library + worker only, no tool route yet)
- [ ] **Phase 9: Hash Tool Page & Text Hashing** - `/tools/hash` ships text-only: sample digests on load, live typing, copy/verify/format options, keyboard shortcuts, registry entry, SEO
- [ ] **Phase 10: File Hashing & Release Hardening** - Local file hashing with progress, cancel, and clear errors; full supersede matrix; network-silence and analytics-redaction proof; production e2e and Lighthouse

## Phase Details

### Phase 8: Hash Core & Worker Runtime

**Goal**: Any byte input — a string or a stream of chunks — yields the correct digest for all 10 algorithms, computed off the main thread. This is the correctness gate the tool route is built on; nothing user-facing ships until every published vector passes.
**Depends on**: Nothing (first v1.2 phase; builds on the shipped v1.0/v1.1 codebase)
**Requirements**: HASH-01, HASH-02, HASH-03, HASH-04
**Success Criteria** (what must be TRUE):

  1. `lib/hash` returns the published digest for every reference vector — RFC 1321 (MD5), FIPS 180-4 (SHA-1/224/256/384/512), FIPS 202 (SHA3-256/512), the RIPEMD-160 reference set, and the CRC catalogue check `"123456789"` → `cbf43926` — including padding-boundary lengths (0, 1, 55, 56, 63, 64, 65, 111, 112, 127, 128, 129 bytes), SHA3 rate±1 lengths, the million-`a` input, and a 0-byte input (SHA-256 `e3b0c442…b855`); CRC32 is always unsigned, 8-digit zero-padded hex
  2. SHA3-256 of the empty string is `a7ffc6f8…f8434a`, never the Keccak-256 value `c5d24601…` — a negative test for both SHA3 variants proves the engine is FIPS 202 SHA-3, not legacy Keccak
  3. Text containing `é`, `€`, `🚀`, and NFC-vs-NFD variants hashes to exactly what `printf '%s' "…" | sha256sum` produces — one `TextEncoder` UTF-8 choke point, no trimming, no Unicode normalization (NFC and NFD forms yield different digests)
  4. Hashing the same bytes in one shot or split into arbitrary chunks gives identical digests for all 10 algorithms — proven by a fast-check chunk-split property and a differential check against `node:crypto` / `zlib.crc32`
  5. In a production build (`next build` + `next start`), a hash job runs inside a Web Worker and returns correct digests; `@noble/hashes` is imported only by `lib/hash/engine.ts` and lands in the worker chunk, never in initial client JS; starting a new job through the hash client always cancels the in-flight one first, and a superseded or disposed job never delivers a result (fake-Worker tests)

**Plans**: TBD
**Research flags**: Confirm the Worker `{ type: "module" }` option with an in-repo production-build smoke test on the pinned Next 16.2.11 (keep Next pinned — Turbopack worker regressions were reported around 16.2.4 / 16.3 canaries). CI needs Node ≥22.2 for the `zlib.crc32` oracle; guard the RIPEMD-160 `node:crypto` oracle with try/catch (OpenSSL 3 may not expose `ripemd160`). noble v2 requires `.js` subpath imports and its hashers are single-use after `digest()`. File reads use `blob.slice().arrayBuffer()` in 1 MiB chunks (jsdom lacks `Blob.stream`).

### Phase 9: Hash Tool Page & Text Hashing

**Goal**: A visitor finds the Hash Generator from the nav, landing grid, sitemap, or search, sees all 10 digests of a sample immediately, and can type or paste text to get live, copyable, verifiable digests — a complete, shippable text-only tool.
**Depends on**: Phase 8
**Requirements**: TEXT-01, TEXT-02, TEXT-03, TEXT-04, OUT-01, OUT-02, OUT-03, OUT-04, OUT-05, INT-01, INT-03, INTG-01, INTG-02
**Success Criteria** (what must be TRUE):

  1. Hash Generator appears in the nav, the landing grid (with its own `Hash` icon), and `sitemap.xml`; opening `/tools/hash` shows all 10 digests for a sample input immediately with no layout shift, and typing or pasting updates every digest live — an earlier, slower result never overwrites a newer one — next to the input's UTF-8 byte count and a trailing-newline/CRLF hint
  2. User can copy any single digest with one click and visible confirmation, copy all digests as a labeled list or as `sha256sum` lines (`<hash>  -` for text), switch hex lower/UPPER or Base64 instantly without re-hashing (CRC32 stays hex), and sees MD5, SHA-1, and CRC32 labeled inline as not suitable for security (no modal)
  3. Pasting an expected checksum — any case, with spaces or colons, a `sha256:` prefix, or a whole `sha256sum` line — highlights every matching row, and a non-match is clearly shown as a non-match
  4. Opening `/tools/hash?text=…` restores that input on load, and the explicit, length-capped "Copy link" action is the only way text gets into a URL — the address bar never changes while typing and `text` never reaches analytics; `/` focuses the input, `Esc` cancels in-flight work and restores the sample, a copy shortcut copies the SHA-256 digest, and `Enter` inserts a newline (never bound)
  5. The page has a unique title, meta description, canonical URL, and OG tags, a worked example, and an FAQ (SHA3 vs Keccak, `echo` vs `echo -n`, MD5/SHA-1 security, a match ≠ authenticity) with content-matched FAQPage JSON-LD — and it is fully usable at 320px in light and dark mode, with long digests wrapping and no horizontal scroll

**Plans**: TBD
**UI hint**: yes
**Research flags**: Standard patterns — copy the `MacToolLoader` server-shell + `next/dynamic(..., { ssr: false })` island; `sampleDigests` precomputed and pinned by a unit test. Registry fallout: hard-coded 4-tool tests (`tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts`) move to 5, and `ToolCard` `ICONS` needs a `Hash` entry (a missing entry silently falls back to the UUID icon). Add a `?text=`-stripped regression test to `redact.test.ts`; never allow-list `text`. Textarea needs `spellCheck=false`, autocorrect/autocapitalize off, and password-manager-ignore attributes; the `useKeyboardShortcut` Enter handler fires on editable targets, so Enter must stay unbound. Decide the text-mode soft-cap warning (~1–5 MB) here. Do not modify nav, sitemap, `redact.ts`, or the privacy page; any new privacy/legal wording needs human approval.

### Phase 10: File Hashing & Release Hardening

**Goal**: Users can hash a local file of any practical size — with progress, cancel, and clear errors — without it ever leaving the browser, and the finished tool is proven race-free, network-silent, leak-free, and fast against a production build.
**Depends on**: Phase 9
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04, INT-02, INTG-03, INTG-04
**Success Criteria** (what must be TRUE):

  1. User can drop a file onto the tool or choose one via the picker and see all 10 digests for it, computed locally with nothing uploaded; a file of hundreds of MB hashes via chunked streaming without being read into memory whole, and copy-all in `sha256sum` format uses the file's name
  2. While a large file hashes, the user sees progress and can stop it with a Cancel button or `Esc`; after cancelling, no partial or stale digest is ever presented as that file's result
  3. Unreadable files, directory drops, and multi-file drops each show a clear inline message (single file only; a new drop replaces the current file), and a drop anywhere else on the page never navigates the browser away from the tool
  4. Every path that supersedes in-flight hashing — typing, paste, new file via picker, new file via drop, switching between text and file input, `Esc`, clear, leaving the page, and `?text=` load — cancels its predecessor before starting, so the digests on screen always belong to the latest input (each path has its own test; toggling hex case is verified not to re-hash)
  5. Against a production build: hashing text and files makes zero third-party network requests (e2e-verified), analytics events have both query strings and URL fragments stripped (regression-tested), e2e covers text hashing, file hashing, cancel, and copy flows, and Lighthouse stays 90+ in every category with no hash code in the initial JS

**Plans**: TBD
**UI hint**: yes
**Research flags**: Run `/gsd-discuss-phase` for progress copy, the large-file size-warning threshold (~500 MB suggested), and directory-drop UX. Do a short threat pass — `redactBeforeSend` currently returns events untouched when the URL has no `?`, so fragment state would bypass redaction (fix defensively; assume Vercel Analytics includes `location.hash`). Use the 13-row supersede matrix in `research/ARCHITECTURE.md` as the test checklist. Build large test files in-page via `DataTransfer` rather than pushing them through `setInputFiles`. Manual iOS Safari check with a ≥500 MB file (memory limits are LOW confidence).

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Shared Shell + Registry | v1.0 | 5/5 | Complete | 2026-07-23 |
| 2. UUID Generator | v1.0 | 4/4 | Complete | 2026-07-24 |
| 3. IP Subnet Calculator | v1.0 | 5/5 | Complete | 2026-07-24 |
| 4. DNS Lookup | v1.0 | 4/4 | Complete | 2026-07-25 |
| 5. MAC Address Inspector | v1.0 | 3/3 | Complete | 2026-07-25 |
| 6. Landing Page Card Navigation | v1.1 | 2/2 | Complete | 2026-07-25 |
| 7. Production Domain Cutover | v1.1 | 1/1 | Complete | 2026-07-25 |
| 8. Hash Core & Worker Runtime | v1.2 | 0/TBD | Not started | - |
| 9. Hash Tool Page & Text Hashing | v1.2 | 0/TBD | Not started | - |
| 10. File Hashing & Release Hardening | v1.2 | 0/TBD | Not started | - |
