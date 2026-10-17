# Pitfalls Research

**Domain:** In-browser multi-algorithm Hash Generator (text + file) added to an existing static-first Next.js 16 / React 19 tool site (Packetory v1.2, `/tools/hash`)
**Researched:** 2026-10-14
**Confidence:** HIGH on algorithm/encoding/streaming correctness (well-known, test-vector-verifiable) and on integration points (read directly from this repo: `lib/analytics/PacketoryAnalytics.tsx`, `lib/hooks/useKeyboardShortcut.ts`, `app/tools/*/…Loader.tsx`, `tsconfig.json`, `package.json`). MEDIUM on throughput/memory numbers (device-dependent, must be measured in-phase). LOW-flagged items are called out inline.

**Phase naming used below** (suggested; roadmapper may renumber — v1.1 ended at Phase 7):
- **Core** = `lib/hash/` framework-agnostic engine + Vitest vectors/property tests (algorithms, UTF-8 encoding, incremental/chunked file hashing, CRC32, formatting)
- **UI** = `/tools/hash` client island (text + file input, worker wiring, results grid, copy, keyboard, URL state, skeleton)
- **Ship** = registry entry, per-tool SEO/FAQ/JSON-LD, analytics/privacy hardening, Playwright e2e, Lighthouse/bundle check

---

## Critical Pitfalls

### Pitfall 1: Hashing the wrong bytes (encoding mismatch vs `sha256sum`)

**What goes wrong:**
User pastes `héllo 🚀` and gets a digest that differs from `printf 'héllo 🚀' | sha256sum`. Root causes: (a) feeding the library `str.charCodeAt()` values / Latin-1 / UTF-16 code units instead of UTF-8 bytes (classic with legacy npm md5/sha1 packages and `btoa`-style code); (b) Unicode normalization differences (NFC `é` U+00E9 vs NFD `e`+U+0301 hash differently; macOS filenames and some paste sources are NFD); (c) lone surrogates — `TextEncoder` silently replaces them with U+FFFD (`EF BF BD`), so the tool hashes different bytes than what the user "typed"; (d) the user's *other* tool used a different encoding (Windows PowerShell 5 `echo abc > f.txt` writes **UTF-16LE with BOM**; `certutil`, .NET `Encoding.Unicode`, Java `getBytes()` platform default).

**Why it happens:**
JS strings are UTF-16 internally. Hash libraries often accept `string` and each treats it differently. Developers test only with ASCII `"abc"` where every encoding agrees.

**How to avoid:**
- One single choke point in `lib/hash/`: `encodeText(s) => new TextEncoder().encode(s)`; every hasher accepts only `Uint8Array`. Never pass strings into hash libs (even where they "support" them) — keeps the contract explicit and testable.
- Never trim, normalize (NFC/NFD), or case-fold the input. Hash exactly what's in the textarea.
- Show a live **"N bytes (UTF-8)"** next to the input — makes encoding mismatches self-diagnosing (emoji = 4 bytes, `é` = 2).
- Mandatory non-ASCII vectors in Vitest: `"é"` (2 bytes), `"€"` (3), `"🚀"` (4), mixed ASCII+emoji, NFC vs NFD pair producing *different* digests (assert they differ — locks "no silent normalization"), lone surrogate `"\uD800"` → documented U+FFFD behavior. Generate expected values from Node `crypto`/`zlib` oracle, not from the implementation under test.
- FAQ entry: "Why doesn't my hash match?" listing UTF-8 assumption, trailing newline, CRLF, BOM, UTF-16 (PowerShell). Optional differentiator (defer unless cheap): encoding selector UTF-8 / UTF-16LE.

**Warning signs:**
Tests only use ASCII; implementation imports `utf8ToBytes`/`charCodeAt` loops ad hoc in multiple places; no byte-count displayed; hash of `"é"` differs from `printf 'é' | sha256sum`.

**Phase to address:** Core (encoding choke point + vectors), UI (byte-count display), Ship (FAQ copy).

---

### Pitfall 2: Newline/whitespace confusion (`echo` vs `echo -n`, CRLF, textarea behavior, BOM)

**What goes wrong:**
The #1 "your tool is wrong" complaint for every hash site. `echo "abc" | sha256sum` hashes `abc\n` (4 bytes); `echo -n` / `printf` hashes `abc`. Windows text files end in `\r\n`. Additionally: the HTML `<textarea>` **API value normalizes line breaks to LF** (spec: CRLF → LF, lone CR → LF), so text pasted from a Windows CRLF file will *not* hash the same as `sha256sum file.txt` — silently, with no way for the user to notice. Smart-punctuation/auto-correct (iOS, macOS "smart quotes/dashes") rewrites `"` → `"`, `--` → `—` before the value reaches JS. Spellcheck/autocapitalize can alter text on mobile.

**Why it happens:**
Developers assume the textarea value == the bytes the user "meant". Users assume the tool == their shell. The gap (LF vs CRLF, trailing newline, BOM, autocorrect) is invisible.

**How to avoid:**
- Don't trim, and don't strip the trailing newline — a typed trailing `\n` is part of the input. Show a small inline hint when the input ends with a newline: "Input ends with a newline (1 byte) — `echo -n` omits it."
- Explicitly document in UI help/FAQ: text mode hashes the *textarea content as UTF-8 with LF line endings*; **for exact bytes of an existing file, use File mode** (File mode reads raw bytes: BOM, CRLF, binary all preserved). This is the primary mitigation for CRLF — surface it in the CRLF hint rather than burying it.
- Optional cheap differentiator: a "Line endings: LF (default) / CRLF" toggle applying `\n → \r\n` before encoding, with the byte count updating live. Decide in planning; don't half-build it (a toggle that converts only some newline cases is worse than none).
- Textarea attributes: `spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"` and `data-gramm="false" data-1p-ignore data-lpignore="true"` (Grammarly / password-manager overlays). `autoCorrect="off"` is the only reliable defense against iOS smart-quote substitution. Also prevents Chrome enhanced-spellcheck sending typed secrets to a cloud service.
- Test: a Playwright test that pastes `"a\r\nb"` and asserts the displayed byte count matches the documented behavior (3 bytes, LF-normalized), so a future change cannot silently alter it.

**Warning signs:**
`.trim()` anywhere in the input path; no `autoCorrect`/`spellCheck` attrs; byte count not shown; FAQ says nothing about newlines; issue reports of "SHA-256 of my file doesn't match".

**Phase to address:** Core (never trim; optional CRLF transform in encoder), UI (attrs, hint, byte count, File-mode pointer), Ship (FAQ).

---

### Pitfall 3: SHA-3 vs Keccak confusion (Ethereum `keccak256`)

**What goes wrong:**
SHA3-256 (NIST FIPS 202) and Keccak-256 (original submission, used by Ethereum/Solidity `keccak256`) differ **only in the padding/domain-separation byte (`0x06` vs `0x01`)**, so they produce completely different digests for identical input. Developers (a) wire the wrong function from a library that exports both (`keccak_256` vs `sha3_256`), (b) label SHA3-256 as "Keccak" or vice versa, (c) copy a "SHA3-256" vector that was actually produced by an Ethereum tool, and (d) users compare against `web3.utils.keccak256` and think the tool is broken.

**Why it happens:**
Naming overlap and that many npm packages named `sha3` historically implemented Keccak. Empty-string vectors look similar in structure so the mismatch isn't spotted by eyeballing.

**How to avoid:**
- Pin vectors from FIPS 202 / NIST CAVP, and assert both directions in tests:
  - SHA3-256(`""`) = `a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a`
  - Keccak-256(`""`) = `c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470` (add as a **negative test**: SHA3-256 output must NOT equal this)
  - SHA3-256(`"abc"`) = `3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532`
- Label rows exactly "SHA3-256" / "SHA3-512" (FIPS 202). Do **not** add Keccak-256 in this milestone (scope is ~10 and Ethereum use is a different audience), but add a one-line FAQ: "SHA3-256 ≠ Ethereum's keccak256". If Keccak-256 is ever added it must be a separate, clearly-labelled row.
- Import by explicit named export from the library's `sha3` module; code-review checklist item: "no `keccak_*` import in `lib/hash`".

**Warning signs:**
Library import named `keccak*`; SHA3 test vector sourced from a blog/Etherscan rather than FIPS 202/CAVP; the empty-string SHA3-256 starts with `c5d2…` (that's Keccak).

**Phase to address:** Core.

---

### Pitfall 4: CRC32 is not one algorithm — variant, sign, byte order, padding, incremental state

**What goes wrong:**
(a) **Variant**: "CRC32" (IEEE 802.3 / zlib / gzip / PNG / `crc32` CLI; poly `0xEDB88320` reflected) vs **CRC-32C Castagnoli** (iSCSI, SCTP, ext4, Btrfs; poly `0x82F63B78`) vs POSIX `cksum` CRC (different algorithm, appends length) vs CRC-32/BZIP2 (MPEG-2 non-reflected) vs CRC-32/JAMCRC. (b) **Signed output**: JS bitwise ops return signed int32 — CRC of `"123456789"` prints `-216151002` instead of `3421780262` unless you `>>> 0`. (c) **Display**: no zero-padding → `0x1a2b3c` shown as 6 digits instead of `001a2b3c`; leading zeros dropped when using `.toString(16)`. (d) **Byte order**: gzip trailers store CRC32 little-endian; most tools print the 32-bit value as big-endian hex — don't reverse bytes. (e) **Incremental/chunked file hashing**: initial value `0xFFFFFFFF` and final `^ 0xFFFFFFFF` must be applied **once per file**, not per chunk — per-chunk init/xor makes small-file text hash right and large-file hash wrong (chunk boundary bug). (f) Typed-array views: passing `u8.buffer` instead of the `Uint8Array` view ignores `byteOffset`/`length` of sliced chunks.

**Why it happens:**
CRC "32-bit" has ~dozens of parameterizations; naive tests only check one string. Table-driven JS implementations are copy-pasted, many with the signed-int bug.

**How to avoid:**
- Implement/choose **CRC-32/ISO-HDLC (IEEE, zlib-compatible)** only, labelled "CRC32 (IEEE 802.3, zlib/gzip/PNG)". noble-hashes has no CRC32, so this is hand-rolled (~20 lines, table-driven, `Uint32Array` table) or a tiny dep; either way it's the highest-bug-density module in the milestone — test accordingly.
- Output: unsigned (`>>> 0`), `padStart(8, "0")`, lowercase hex to match other rows; offer decimal as secondary display only if cheap. Uppercase/lowercase toggle must apply to all rows uniformly.
- Vectors: CRC32(`""`) = `00000000`; CRC32(`"a"`) = `e8b7be43`; CRC32(`"123456789"`) = `cbf43926` (the CRC catalogue "check" value). **Caution:** the milestone's cited RFC 3720 vectors are **CRC-32C (Castagnoli)** (e.g. `"123456789"` → `e3069283`) — using them to "verify" IEEE CRC32 will fail and can push someone to implement the wrong variant. Either cite the right source (CRC catalogue / zlib / RFC 1952 gzip) or add CRC32C as a separate labelled row (scope decision; recommend not adding in v1.2).
- Include a vector with CRC value having leading zero byte(s) and one with high bit set (to catch signed/padding bugs).
- Property test: for any bytes and any split point(s), `crc.update(a).update(b)` == one-shot over `a||b`. Oracle: Node `zlib.crc32` (Node ≥ 20.15 / 22.2 — MEDIUM confidence on exact version; check `node -v` used by CI) or `python -c zlib.crc32`.
- Tooltip/FAQ on the CRC32 row: "IEEE/zlib variant. Differs from CRC32C and `cksum`."

**Warning signs:**
Negative number ever displayed; CRC row sometimes <8 chars; large-file CRC differs from small-file CRC of same content; test vector sourced from RFC 3720 for plain "CRC32".

**Phase to address:** Core (implementation + vectors + chunk property test); Ship (FAQ/label).

---

### Pitfall 5: Reading whole files into memory (ArrayBuffer OOM, iOS Safari kills the tab)

**What goes wrong:**
`await file.arrayBuffer()` or `FileReader.readAsArrayBuffer(file)` on a multi-hundred-MB / GB file throws `RangeError`/`NotReadableError`, or on mobile Safari the tab is reloaded/killed with no error (iOS Safari effective per-tab memory is a few hundred MB to ~1 GB depending on device — MEDIUM confidence, device-dependent; measure). Even if the read succeeds, a 10-algorithm run may hold multiple copies (buffer + typed-array view + worker transfer copy).

**Why it happens:**
The text path is whole-buffer and trivial; the file path is "the same code with `file.arrayBuffer()`". `crypto.subtle.digest()` (see Pitfall 8) also *requires* the whole buffer, nudging developers toward the unsafe path.

**How to avoid:**
- File path is **incremental only**: loop `for (offset; offset < file.size; offset += CHUNK) { const buf = await file.slice(offset, offset + CHUNK).arrayBuffer(); const u8 = new Uint8Array(buf); for (const h of hashers) h.update(u8); }`. `Blob.slice().arrayBuffer()` is universally supported (Safari 14+); `file.stream().getReader()` is also viable (Safari 14.1+) but `slice` is simpler to reason about and to cancel.
- **Read each chunk once and feed all ~10 hashers** from it (not 10 passes over the file — 10x the I/O and 10x the progress UI).
- CHUNK ≈ 1–8 MiB (start at 4 MiB; tune by measurement; smaller on mobile). Let each chunk go out of scope before the next read.
- Unit-test the chunked path with a synthetic `Blob` of generated bytes (jsdom/Node 20+ have `Blob.slice().arrayBuffer()`); property: chunked digest == one-shot digest for random sizes with chunk sizes that don't divide the length, including chunk sizes of 1, 63, 64, 65 (hash block boundaries).
- Playwright: set a large-ish generated file (e.g. 256 MB via `setInputFiles` with a buffer or a temp file) and assert correct digest + page stays responsive; do **not** assert on 1+ GB in CI.
- Ship a documented practical limit message rather than crashing: e.g. soft warning above N GB ("large file — this may take several minutes; keep tab open"), never a hard crash.

**Warning signs:**
Any `arrayBuffer()` / `readAsArrayBuffer` call on the full `File`; works on desktop with 50 MB but never tested above 500 MB; iOS manual test = page reload.

**Phase to address:** Core (chunked engine as the only file API), UI (progress/cancel/limit message), Ship (large-file e2e).

---

### Pitfall 6: Main-thread jank — live-as-you-type and file hashing blocking the UI

**What goes wrong:**
Pure-JS hashing is 10–50x slower than native; running ten algorithms (SHA-512/SHA3 in JS are the slowest) synchronously on every keystroke is fine for 100 bytes but freezes input for a 5 MB paste, and a file hash on the main thread freezes the entire tab (no progress repaint, no cancel, browsers show "page unresponsive"). Inversely, shipping *everything* via a Worker adds a post-load latency before the default result appears (CLS/flash) and complicates tests.

**Why it happens:**
"Live" is read as "synchronous on `onChange`". File hashing is written as an async loop, which *looks* non-blocking but each chunk's `update()` still runs on the main thread between awaits.

**How to avoid:**
- Split by size, measured not guessed: **small text (≤ ~64–256 KB, set the threshold from a benchmark of the slowest algorithm) → synchronous on the main thread with no debounce** (instant, preserves the "live" feel); **larger text and all files → Web Worker** with debounce (~150–250 ms) for large text only.
- Worker is a *thin shell* around `lib/hash` (messages: `{id, kind:'text'|'file', …}` → `{id, progress}` / `{id, digests}` / `{id, error}`). Keep all logic in `lib/hash` so Vitest tests it without a Worker (jsdom has none).
- Progress updates throttled (≤ ~10 Hz via time check, not per chunk) to avoid React re-render storms; render progress in a reserved-height slot (no CLS).
- Cancel = bump sequence id and `worker.terminate()` (+ lazily recreate); terminate is the only way to interrupt a synchronous hash loop inside the worker. Terminate worker on unmount (React 19 StrictMode double-mount in dev creates/terminates twice — verify no leaked workers).
- Worker construction `new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" })` works under Turbopack/webpack, but **dev-works/prod-breaks is a classic failure** — the Playwright suite must run against `next build && next start` (CI already builds; confirm e2e uses the production server, not `next dev`) with at least one file-hash test through the real worker.
- Do not use `requestIdleCallback`/chunked `setTimeout` main-thread hashing as a substitute — still janky, unsupported on Safari for rIC.

**Warning signs:**
INP regressions in Lighthouse, typing lag with big paste, progress bar never animating during file hash, worker errors only visible in production build, duplicate worker instances in DevTools.

**Phase to address:** UI (threshold, worker, cancel), Core (pure, Worker-agnostic API), Ship (prod-build worker e2e + Lighthouse INP/TBT).

---

### Pitfall 7: Stale / mixed results (race conditions across text edits, file swaps, mode switches)

**What goes wrong:**
Edit text during a large hash → older result arrives later and overwrites newer. Drop file B while file A is still hashing → A's digests labelled with B's filename. Switch from File to Text mode → old file digests flash under new text. Ten results set via ten `setState` calls → briefly rows from different inputs. Copy-all copies half-stale values. Playwright flakes because assertion races worker completion.

**Why it happens:**
The exact bug class this repo already hit twice (Phase 4 CR-01: race guard wired into only some paths; Phase 5 applied the lesson up front). Worker adds one more async hop.

**How to avoid:**
- Apply the existing Key Decision verbatim: **every path that supersedes in-flight work (text keystroke, file drop/pick, mode switch, clear/Esc, unmount, URL-load) must bump the sequence token *and* cancel (terminate worker / abort loop)**. List all entry points in the plan and test each one (the project already learned that testing only the "obvious" path is insufficient).
- Model input as one discriminated state: `source = {kind:'text', value} | {kind:'file', file} | {kind:'none'}` and results as one atomic object `{ id, digests }` set in a single state update; render only if `result.id === currentId`.
- Tag results with the input identity (file name + size + lastModified, or text length) and show it ("Hashed: report.pdf · 12.4 MB") so a user can see which input the visible digests belong to.
- Copy buttons read from the displayed result object at click time; disabled/placeholder while `computing` (never copy `—`).
- Worker messages carry `id`; main thread drops any message whose id ≠ current.
- e2e: slow-file-then-text, file-A-then-file-B, text-edit-during-large-text, Esc during hashing; use a deliberately slow large generated file to widen the race window deterministically.

**Warning signs:**
Results object built incrementally across multiple setStates; no `id` in worker messages; only one "stale" test written; bug reports of "wrong hash for the file I dropped second".

**Phase to address:** UI (state model + token), Ship (race e2e matrix).

---

### Pitfall 8: Web Crypto assumptions (secure context, async-only, no streaming, no MD5/SHA-3/RIPEMD/SHA-224)

**What goes wrong:**
(a) `crypto.subtle` is **undefined on non-secure origins** (plain `http://192.168.x.x:3000` when testing on a phone from the LAN, or any non-localhost http dev host) → `TypeError: Cannot read properties of undefined (reading 'digest')`. Production is HTTPS so it works in prod and breaks only in dev/device testing. (b) `subtle.digest` is async-only → can't compute inside synchronous render/derive paths; pushes you to effect+state and creates flash-of-empty. (c) `subtle.digest` takes a **whole** buffer (no `update()`), so it can't hash files incrementally. (d) Web Crypto covers only SHA-1/256/384/512 — no MD5, SHA-224, SHA3, RIPEMD-160 (MDN; browser native SHA-3 not available in the standard — treat as absent). (e) Mixing two implementations (native for SHA-2 on small text, JS for the rest/for files) means two code paths that must agree; a divergence (e.g. native given `u8.buffer` ignoring `byteOffset`) shows up only for sliced views.

**Why it happens:**
"Use the platform" is good advice that's wrong here: the algorithm set and the file streaming requirement force a JS library anyway.

**How to avoid:**
- **Single implementation: one zero-dependency JS library for all algorithms (project's chosen direction: noble-style, Uint8Array in/out, incremental `create().update().digest()`), used for both text and file.** Rationale: sync, no secure-context dependency, incremental, Worker-safe, one code path. Do not add `crypto.subtle` as a speed optimization in v1.2 (two paths, async, can't stream); revisit only if measured file-hash throughput is unacceptable, and then behind a cross-check property test (native vs JS on random bytes).
- If `subtle` is ever used: feature-detect `globalThis.crypto?.subtle`, pass an exact-length `Uint8Array` (copy the slice if `byteOffset ≠ 0`), and fall back to the JS path.
- If the chosen library is noble-hashes **v2** (verified latest 2.4.0, ESM-only, zero deps): import paths are `@noble/hashes/sha2.js`, `/sha3.js`, `/legacy.js` (MD5, SHA-1, RIPEMD-160 live in `legacy.js`) — the `.js` suffix is required and v1-era paths (`/sha256`, `/ripemd160`) from tutorials/LLM snippets **do not exist**. `tsconfig` uses `moduleResolution: "bundler"` (OK). Confirm in the Core phase's first task with a throwaway import test.
- Noble-specific gotchas: `digest()` **destroys** the hasher (calling twice throws) — create a fresh instance per run or use `clone()` for snapshots; `update()` rejects non-`Uint8Array` (convert ArrayBuffers: `new Uint8Array(buf)`); `legacy.js` exports are named "legacy" on purpose — good hook for the security messaging (Pitfall 12).

**Warning signs:**
`crypto.subtle` in code review; `import … from "@noble/hashes/sha256"` (v1 path); `Hash instance has been destroyed` errors on second render; app works on desktop https but throws on phone over LAN http.

**Phase to address:** Core (library choice + import verification + single-path rule), UI (never call digest twice on the same instance).

---

### Pitfall 9: Secrets in the URL — "bookmarkable text state" for a tool people paste passwords into

**What goes wrong:**
People paste passwords, API keys, tokens, and PII into hash tools to hash them. Writing the input into `?text=` (the Subnet/DNS `replaceState` pattern) leaks it to: browser history and **cross-device history sync**, bookmarks, shared screenshots/links, the `Referer` of any outbound link click (mitigated by `Referrer-Policy` default but verify), screen-share, and — critically — **Vercel request logs** (the query string reaches the CDN/edge on page load even for a static route). **Analytics redaction does not cover these**: `redactBeforeSend` only protects what `@vercel/analytics` sends. Specific integration bug in this repo: `redactBeforeSend` does `event.url.split("?")` and, if there is no `?`, **returns the event untouched** — so any state placed in the URL **fragment** (`/tools/hash#text=hunter2`) bypasses the redaction entirely if Vercel Analytics includes the hash in `event.url` (LOW confidence whether it does; treat as "must test" and fix defensively). Also a `?` inside the fragment or an `&` in the value can confuse the naive split.

**Why it happens:**
The brief/milestone lists "bookmarkable text state" as a feature; the pattern is already established and cheap; the risk is specific to hash tools (users hash secrets).

**How to avoid:**
- **Default: do NOT auto-write input to the URL.** Satisfy "bookmarkable" via an explicit, user-initiated **"Copy link to this input"** action (writes `?text=` or `#` only at that moment) or an opt-in "Remember in URL" toggle that defaults OFF. Flag this to the roadmapper/user as a requirement refinement — it deviates from the Subnet/DNS auto-sync pattern deliberately.
- Cap URL payload (e.g. ≤ ~1–2 KB encoded; above that, no link offered with a "too long to share" note). Never put *file* contents/names in the URL.
- Reading `?text=` on load is fine (static page reads `window.location.search`, not `searchParams`, per existing pattern) — but then immediately `replaceState` to strip it (so a later bookmark/copy of the address bar from a shared link doesn't re-share it)? Decide in planning; at minimum do not re-emit it.
- Do **not** add `text` (or `input`, `data`, `v`) to `DEFAULT_ALLOW_LIST` — keep the safe-by-default allow-list, and add a unit test to `redact.test.ts` asserting `?text=` is stripped. Extend `redactBeforeSend` to also drop the fragment (`event.url.split(/[?#]/)[0]` + allow-listed params) and unit-test URLs with `#…`, `?a=b#c`, and a `?` inside the fragment.
- Prefer a fragment over a query for share links if a link feature ships (fragment is never sent to the server → keeps it out of Vercel logs) — but only after the analytics fix + test above.
- Add the page to privacy disclosure language: "Nothing you type is sent anywhere" must be **true** — see Pitfall 11. (Legal/privacy text change requires human approval per project automation model.)

**Warning signs:**
`window.history.replaceState` on every keystroke in the hash tool; `text` appears in a Vercel Analytics URL; a grep of the allow-list shows a hash-tool param; fragment state with unmodified `redactBeforeSend`.

**Phase to address:** UI (share-link design), Ship (analytics fix, redact tests, privacy review). **Needs a user/roadmap decision before UI planning.**

---

### Pitfall 10: "Fully local" claim silently violated (input or filename leaks via telemetry, errors, logs)

**What goes wrong:**
The trust proposition of a hash tool is "nothing is uploaded". It gets broken accidentally by: custom analytics events carrying algorithm/inputs/filenames/sizes; an error boundary/reporter that attaches state; `console.log` of input during debugging committed to prod; a third-party font/CDN/script added for the new page (violates the "no third-party requests" NFR); `next/link` prefetch irrelevant but a library that lazy-fetches a WASM blob from a CDN; sample "Try it" links.

**How to avoid:**
- Hash island makes **zero network requests while hashing** — enforce with a Playwright test: `page.on('request')` collected after page load; type text, drop a file; assert no new requests (other than the already-known analytics pageview beacon) and none containing the input/filename.
- No custom analytics events from this tool (or only with a fixed, non-input enum such as "tool used").
- Lint/grep gate in CI or review checklist: no `console.log` in `lib/hash`/`app/tools/hash`; no `fetch`/`XMLHttpRequest`/`navigator.sendBeacon` in `lib/hash`.
- Self-contained bundle: no WASM/worker assets from a CDN (if a WASM lib is ever picked, it must be bundled and served same-origin).
- Pre-ship: manual DevTools Network tab check on a production preview.

**Warning signs:**
New dependency pulls `fetch`; analytics `track()` call in the tool; network panel shows requests on keystroke.

**Phase to address:** UI (no events), Ship (network-silence e2e + review).

---

### Pitfall 11: Misleading users into hashing passwords with MD5/SHA-1 (security messaging)

**What goes wrong:**
Putting MD5/SHA-1/CRC32 next to SHA-256 as equal-looking "hashes" with copy buttons implicitly endorses them, and the dominant misuse of hash sites is people generating unsalted fast hashes for passwords/signatures. Over-correcting is also a failure: modal warnings/interstitials (banned by project UX rules), scary red banners on every row, or claims like "secure" that overstate (SHA-256 of a password is *also* wrong for password storage).

**How to avoid:**
- Per-row subtle labels: MD5 / SHA-1 / RIPEMD-160 / CRC32 get a "legacy — not collision-resistant" or (CRC32) "checksum, not cryptographic" text badge (not color-only; accessible text), tooltip/`aria-describedby` detail.
- One persistent, low-key line under the results (not modal, not dismiss-required): "Fast hashes are for checksums and integrity — never store passwords with them. Use Argon2id, scrypt or bcrypt." Dedicated FAQ item with the same message (SEO + disclosure). Wording must avoid legal-style claims (legal text needs human approval).
- Don't sort/bold legacy algorithms to the top; keep one fixed, documented order (e.g., SHA-2 family first, then SHA-3, then legacy) — also avoids CLS from reordering.
- No "HMAC"/"salt"/"password" features in this milestone (anti-feature) — out of scope, and implies password use.

**Warning signs:**
Row list with identical styling for MD5 and SHA-256; a modal/toast warning; copy of "secure hashing" in meta description.

**Phase to address:** UI (badges + footer note), Ship (FAQ/meta copy review).

---

## Moderate Pitfalls

### Pitfall 12: Bundle size / Lighthouse regression

**What goes wrong:** Importing the whole library (`import * as noble`) or each algorithm from a barrel pulls unused code; importing the library in **both** the main island chunk and the Worker duplicates it; adding a polyfill or a heavy file-drop dependency (`react-dropzone` ~ unnecessary) bloats a tool whose pages target 90+ Lighthouse. Hash code leaking into the shared layout/landing bundle (e.g. by importing from `lib/hash` in `tools/registry.ts` for an example hash) penalizes every page.
**Prevention:**
- Per-module deep imports only; no `export *` barrel in `lib/hash/index.ts` that the island imports wholesale (or ensure it's tree-shake-clean — verify).
- Island loaded via the existing `next/dynamic(..., {ssr:false})` Loader pattern; registry and SEO page must not import hash algorithm code (the worked-example digests can be hard-coded constants or computed at build time in a Server Component, which adds zero client JS).
- Hand-roll drag-and-drop (≈30 lines + `<input type="file">`), no dropzone dependency.
- Record `next build` route JS size for `/tools/hash` vs `/tools/mac` baseline in the phase; budget it (suggest: island + libs ≲ 40–60 KB gzip, worker separate and not on the critical path — LOW confidence on numbers, set from measurement). Lighthouse run on the production preview for `/tools/hash` and for `/` (landing must not regress).
**Warning signs:** `/` first-load JS grew after the milestone; two copies of `sha512` in the build analyzer output.
**Phase to address:** Core (deep imports), UI (loader split), Ship (size/Lighthouse gate).

### Pitfall 13: Hydration mismatch and CLS when results appear

**What goes wrong:** Default result computed during SSR vs client (they'd match for a constant sample, but a `?text=`/localStorage-derived initial state wouldn't) → hydration error. Skeleton shorter than the real 10-row grid → layout shift when island mounts. Results rows of unequal wrapped height (SHA-512/SHA3-512 = 128 hex chars wrapping at 320px; CRC32 = 8) jump when switching placeholder → value. Drag-over overlay or progress bar inserted into flow pushes the grid down. Copy-confirmation text changing button width.
**Prevention:**
- Keep the established Server-shell + `ssr:false` client-island pattern; read `window.location.search` inside the island only (never `searchParams` in `page.tsx` — it opts the page out of static rendering).
- Skeleton with fixed `min-height` equal to the measured 10-row grid at both mobile (320px) and desktop; all 10 rows always rendered (placeholders when computing) in a fixed order; `font-mono break-all` for digests; reserved-height slots for the byte-count line, newline hint, progress bar, and error message; drag-over state as a border/ring/outline (no layout properties) and an absolutely-positioned overlay.
- Copy confirmation via fixed-width icon swap (reuse `useCopyToClipboard` as other tools do).
- "Default result on load" (UX non-negotiable): prefill a sample (e.g. `hello world`) so all rows show immediately after mount; consider server-rendering the *sample's* digests (constant, computed at build in a Server Component) inside the page's worked-example section for SEO — never inside the island.
- Verify with the existing 320px check and Lighthouse CLS = 0 on production preview.
**Warning signs:** React hydration warning in console; Lighthouse CLS > 0; rows jumping when typing the first character.
**Phase to address:** UI, Ship (Lighthouse verification).

### Pitfall 14: Keyboard model collisions with a multi-line `<textarea>` (first such tool)

**What goes wrong:** Subnet/DNS/MAC use single-line inputs; `useKeyboardShortcut` was designed around that. In a `<textarea>`: **`Enter` must insert a newline** (which changes the hash), but the hook's `enter` handler fires for any non-button target (textarea included, per `isInteractiveTarget`) — wiring `enter` to "recompute/blur" makes Enter blur the field or double-fire. `Esc` clearing the textarea can destroy a long pasted input with no undo. The `/` shortcut correctly ignores editable targets. `Ctrl/Cmd+C` copy-primary-result is ignored in editable targets (fine — native copy keeps working), but then the default state (focus in textarea) has no keyboard route to "copy SHA-256", and selecting digest text with the mouse then pressing Cmd+C must still copy the selection.
**Prevention:** Do **not** register `enter` for the hash tool (live hashing needs no execute action); make `Esc` clear only when it's cheap to reverse (store previous value for one-step restore, or clear only when text is empty → blur) — decide in planning; offer explicit shortcut/button for "copy primary hash" that works while the textarea is focused (e.g., `Ctrl/Cmd+Shift+C`, documented), and "copy all"; add unit tests to the tool for Enter-in-textarea inserting a newline and not copying/blurring; Playwright keyboard flow: `/` → type → Tab through rows → Enter on copy button copies once.
**Warning signs:** Enter in textarea blurs; double clipboard writes; Esc loses input without recovery.
**Phase to address:** UI.

### Pitfall 15: Drag-and-drop & file-input edge cases

**What goes wrong:** (a) Missing `preventDefault` on `dragover`/`drop` → the browser navigates away to open the dropped file, discarding state; (b) `dragenter/dragleave` flicker from child elements; (c) drag-only UI with no keyboard/mobile path (iOS has no drag-and-drop); (d) dropping a folder yields a zero-size/unreadable "file" and a confusing `NotFoundError`; (e) multiple files dropped — unspecified behavior; (f) 0-byte file (valid: SHA-256 `e3b0c442…b855`) treated as "no file"; (g) file modified/removed or cloud placeholder (iCloud/OneDrive) fails mid-read with `NotReadableError`; (h) `accept` attribute on input restricting types needlessly; (i) selecting the same file twice doesn't re-trigger `change` (input value not reset).
**Prevention:** Real `<input type="file">` + visible `<label>`/button (keyboard + mobile primary path), drop zone as enhancement; `preventDefault` on `dragover`+`drop` for the zone and (defensively) window-level to stop accidental navigation; use `dragenter/leave` counter or `pointer-events-none` on children; take first file only and state it; treat `size === 0 && type === ""` carefully (show "0 bytes" hashes for genuine empty files; show "folders aren't supported" on read error); catch read errors into a visible, non-modal error state with retry; reset `input.value=""` after selection; no `accept`. e2e via Playwright `setInputFiles` (works with hidden input) for picker path and a synthetic `DataTransfer` drop test.
**Phase to address:** UI, Ship (e2e).

### Pitfall 16: Test vectors incomplete or self-referential

**What goes wrong:** Vectors generated by running the implementation (tautology), only `"abc"`/`""` tested (misses padding-boundary bugs), no multi-block or long-input test, no chunked-equals-oneshot test, SHA3 sponge-rate boundaries untested, RIPEMD-160 variant confusion (RIPEMD-160 vs RIPEMD-128/256/320 vs Bitcoin double-hash), library upgrades silently change nothing because tests are tautological.
**Prevention (concrete vector set to require in Core):**
- **MD5 (RFC 1321 §A.5 7-vector suite)**: `""`→`d41d8cd98f00b204e9800998ecf8427e`, `"a"`, `"abc"`→`900150983cd24fb0d6963f7d28e17f72`, `"message digest"`, alphabet, alnum, 80-digit string.
- **SHA-1 / SHA-224 / SHA-256 / SHA-384 / SHA-512 (FIPS 180-4 examples / NIST CAVP)**: `""`, `"abc"` (SHA-1 `a9993e36…d89d`; SHA-256 `ba7816bf…15ad`), the 448-bit `"abcdbcdecdef…nopq"` two-block message, 896-bit message for SHA-384/512, and the **one-million `a`** vector (also the long-input/chunking test).
- **SHA3-256/512 (FIPS 202 examples / CAVP ShortMsg)**: `""`, `"abc"`, plus inputs of rate−1, rate, rate+1 bytes (rate 136 for SHA3-256, 72 for SHA3-512). Add the Keccak negative test (Pitfall 3).
- **RIPEMD-160 (Bosselaers reference vectors)**: `""`→`9c1185a5c5e9fc54612808977ee8f548b2258d31`, `"abc"`→`8eb208f7e05d987a9b044a8e98c6b087f15a0bfc`, `"message digest"`, alphabet, the 8×"1234567890" vector, million `a`.
- **CRC32** per Pitfall 4 (and *not* RFC 3720 unless CRC32C is a separate algorithm).
- **Padding-boundary lengths** 0,1,55,56,57,63,64,65,111,112,113,119,120,127,128,129 bytes for MD5/SHA-1/SHA-2/RIPEMD; compare against Node `crypto.createHash` as an independent oracle with `fast-check` random bytes (project already has `fast-check` + `@fast-check/vitest`). Caveat: Node/OpenSSL 3 may not expose `ripemd160` (it moved between OpenSSL providers) — guard with `try/catch` and fall back to the published vectors (MEDIUM confidence; check CI's Node version).
- **Chunk-split property:** for random data and random split points, incremental == one-shot, per algorithm.
- Mix of Uint8Array views with non-zero `byteOffset` (subarray) to catch buffer-vs-view bugs.
- Playwright smoke: type `abc`, assert the 10 rows equal the pinned vector table (one e2e, not 10).
**Phase to address:** Core (blocking acceptance criterion: "all vectors green before UI work starts"), Ship (e2e smoke).

### Pitfall 17: Output-format inconsistencies

**What goes wrong:** Mixed upper/lower case across rows; a case toggle that only re-cases some rows; copy-all format differing from what's displayed; CRLF/trailing-space inside copied values; no way to match `sha256sum`'s lowercase default; hex vs Base64 expectations (some APIs want Base64, e.g. SRI `sha384-…`).
**Prevention:** Single `formatDigest(bytes, {case})` in `lib/hash`; lowercase default (matches `sha256sum`, `openssl`); case toggle applied centrally and persisted nowhere sensitive; copy-all as `Algorithm: hex` lines (newline `\n`), unit-tested; Base64 display = optional differentiator, defer unless trivial (don't ship half-built).
**Phase to address:** Core (formatter), UI.

### Pitfall 18: SEO/registry integration slips

**What goes wrong:** Tool added to `registry.ts` with wrong `category` (union is `"network"|"dns"|"web"|"encode"|"generate"` — hash fits `generate` or `encode`; adding a new category forces shared-nav edits, violating the "register one entry only" architecture rule), `clientOnly:true` omitted, JSON-LD FAQ not content-matched to visible FAQ (Phase 2–5 established the rule), worked example hash values that don't match what the tool computes (hand-typed in FAQ; later drift), canonical/sitemap relying on registry (automatic — don't hand-edit), `status:"beta"` visually indistinguishable (known a11y debt), "related tools" still unbuilt.
**Prevention:** Single `faq-data.ts` consumed by both visible FAQ and JSON-LD; worked-example digests produced from the same `lib/hash` at build time or asserted by a unit test; reuse existing `tools/registry.test.ts` expectations; do not touch nav components.
**Phase to address:** Ship.

---

## Minor Pitfalls

### Pitfall 19: Number/size formatting and progress math
**What goes wrong:** Progress as `offset/size` with `size === 0` → NaN/Infinity; progress exceeding 100% on last chunk; throughput/ETA flicker; showing bytes with inconsistent units (MB vs MiB).
**Prevention:** Guard zero-size, clamp 0–1, pick one unit convention (MiB/GiB with 1 decimal), no ETA (it's noisy) or smoothed ETA only. **Phase:** UI.

### Pitfall 20: Clipboard in non-secure/permission contexts
**What goes wrong:** `navigator.clipboard.writeText` unavailable on insecure origins and can reject without user gesture; copy-all during computing copies placeholders.
**Prevention:** Reuse existing `useCopyToClipboard` (already shipped and tested across 4 tools) — don't reimplement; keep visible confirmation; disable copy while computing. **Phase:** UI.

### Pitfall 21: Large-text paste / textarea performance
**What goes wrong:** Pasting 10–50 MB of text into a controlled React `<textarea>` makes React/DOM sluggish independent of hashing; byte-count via `new TextEncoder().encode(s).length` on every keystroke duplicates encoding work.
**Prevention:** Set a text-mode soft cap (e.g. warn above ~1–5 MB: "use File mode for big inputs"); compute byte length once and reuse the encoded array for hashing; avoid re-rendering the digest grid unless digests changed (`React.memo` rows). **Phase:** UI.

### Pitfall 22: Timing/side-channel and "compare" expectations
**What goes wrong:** Users expect a "compare with expected hash" field (verifying downloads is the #2 use case); string `===` compare is fine for checksums (not secrets) but case/whitespace/`sha256:` prefix/ `  filename` suffix mismatches cause false "mismatch".
**Prevention:** If a compare field ships (strong differentiator, see FEATURES), normalize: trim, lowercase, strip `sha256:` prefix and trailing `  filename`, auto-detect algorithm by length; otherwise defer. **Phase:** UI (only if in scope).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `await file.arrayBuffer()` for files | 3 lines, matches text path | OOM / iOS tab kill on large files; later rewrite to chunked | Never (chunked engine is the only file API) |
| Everything on main thread (no Worker) | No worker wiring/test setup | Jank on large text, frozen tab on files, no cancel | Only for text under the measured threshold |
| Auto-writing text to URL on each keystroke (copy Subnet pattern) | Reuses existing code; "bookmarkable" | Secrets in history/sync/Vercel logs; analytics gap for fragment | Never by default; explicit user action only |
| Tests with outputs generated by the implementation | Fast to write | Zero regression value; encoding/variant bugs invisible | Never |
| Two code paths (native subtle for SHA-2 + JS for rest) | Faster SHA-2 on small text | Divergence bugs, secure-context failures, async plumbing | Only after measured need + native-vs-JS property test |
| Hand-copied CRC32 snippet | Quick | Signed output, per-chunk init bugs | Only with the full vector + chunk-split tests |
| Hard-coded worked-example digests in FAQ | Fast SEO copy | Drift from actual tool output | Only if a unit test asserts them against `lib/hash` |
| Skipping prod-build worker e2e | CI faster | Worker breaks in prod only | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `lib/analytics/PacketoryAnalytics.tsx` (`redactBeforeSend`) | Assuming query-only redaction covers all URL state; `split("?")` with no `?` returns event untouched (fragment bypass) | Strip fragment, keep allow-list empty for hash, add unit tests for `#`, `?a#b`, and `text=` |
| `lib/analytics/redact.ts` allow-list | Adding `text` so analytics "shows usage" | Never add input-bearing params; allow-list stays safe-by-default |
| `useKeyboardShortcut` | Registering `enter` (fires in textarea); expecting `copy` to work with textarea focus | Don't register `enter`; add a separate documented chord for primary copy; test Enter-newline |
| `tools/registry.ts` | New `category` value or hand-editing nav/landing/sitemap | One entry, existing category (`generate`/`encode`); registry test passes untouched |
| `next/dynamic(..., {ssr:false})` Loader pattern | Reading `searchParams` in `page.tsx` (breaks static rendering); skeleton height mismatch | Read `window.location.search` inside island; fixed-height skeleton matching 10 rows |
| Web Worker under Next 16 / Turbopack | Works in `next dev`, breaks in prod build; Vitest/jsdom has no Worker | Thin worker over `lib/hash`; e2e against production build; unit-test core directly |
| `@noble/hashes` v2 | v1 import paths; reusing destroyed hasher; passing ArrayBuffer | `.js`-suffixed module paths (`sha2.js`, `sha3.js`, `legacy.js`); fresh instance per run; `new Uint8Array(buf)` |
| `useCopyToClipboard` | Reimplementing clipboard code per tool | Reuse; disable while computing |
| Playwright | Asserting immediately after typing against async worker result | `expect.poll`/auto-waiting locators on a "ready" attribute; deterministic slow-file fixtures |
| TypeScript (target ES2020, per `tsconfig.json`) | Using BigInt/`Uint8Array.fromHex`/`toHex` (newer baselines) in `lib/hash` formatters | Hand-write hex conversion (`Array.from(u8, b => b.toString(16).padStart(2,"0")).join("")`) — LOW-cost, runs everywhere |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sync 10-hash recompute on every keystroke | Input lag, Lighthouse TBT/INP | Size threshold → worker + debounce above it | Pastes ≳ 0.5–2 MB (measure slowest algo) |
| One pass per algorithm over the file | 10x I/O time, 10 progress bars | One read, feed all hashers per chunk | Any file > ~100 MB |
| Per-chunk React state updates | Re-render storm, slower hashing | Throttle progress (~10 Hz), update a ref + occasional setState | Files > ~100 MB with 1 MiB chunks |
| Large chunk size on mobile | Memory spike, tab reload | 1–4 MiB chunks; tune on real iOS | Files > few hundred MB on iPhone |
| JS SHA-3/SHA-512 throughput | Slow file hash with all 10 on | Show progress + cancel; consider letting user deselect algorithms (defer) | ~1 GB+ files (minutes) — set expectation in UI copy |
| Duplicate library in main + worker chunks | Bundle +25–40 KB | One execution model per input class; analyzer check | Always (Lighthouse budget) |
| Re-encoding text for byte count and hashing separately | 2x work per keystroke | Encode once, reuse | Large pastes |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Input/file name in URL, analytics events, or logs | Secrets/PII exposure (history, sync, Vercel logs) — HIGH | Pitfalls 9, 10: opt-in share links, fragment-safe redaction, no custom events |
| Trusting `?text=` as safe HTML | XSS if ever rendered via `dangerouslySetInnerHTML` | Render only as text/`value`; never HTML; React default escaping |
| Presenting MD5/SHA-1 as suitable for security | Users hash passwords/signatures with broken algos — MEDIUM | Legacy badges + persistent calm note (Pitfall 11) |
| Third-party scripts/CDN for libs or fonts on this page | Breaks "fully local" claim and CSP-friendliness | Bundle everything same-origin |
| Browser spellcheck/autocorrect/extension overlays on the textarea | Secrets sent to cloud spellcheck; text silently altered | `spellCheck/autoCorrect/autoComplete` off, `data-gramm=false` |
| Persisting last input in `localStorage` | Secrets at rest in browser | Don't persist input; (brief allows local convenience storage for non-sensitive outputs only — hash inputs are sensitive) |
| Zip-bomb-like expectations / huge files DoS the user's own tab | Self-DoS only; no server risk | Progress, cancel, soft limit message |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Empty page on load until user types | Violates "zero-effort default result" | Prefilled sample text; all 10 rows populated immediately |
| No indication of what bytes were hashed | "Your tool is wrong" reports | Live "N bytes (UTF-8)" + newline hint |
| Text mode silently normalizes CRLF | Windows users can't match `sha256sum` | Hint pointing to File mode for exact bytes; optional LF/CRLF toggle |
| Results re-order or rows pop in/out | CLS, scanning difficulty | Fixed order, always 10 rows, reserved heights |
| 128-char digests overflow at 320px | Horizontal scroll | `break-all`, mono font, verified at 320px (existing check) |
| Copy with no visible feedback | Violates non-negotiable | Reuse `useCopyToClipboard` confirmation on each row + copy-all |
| Cancel not offered for file hashing | User stuck on huge file | Cancel button + Esc cancels in-flight file hash (before clearing) |
| Drag-and-drop as the only file path | Mobile/keyboard users blocked | Visible file button + labelled input |
| Modal warnings about MD5 | Banned UX; annoying | Inline badges + one calm note |
| Mixed case outputs | Copy/paste mismatches | One central case setting |

## "Looks Done But Isn't" Checklist

- [ ] **Encoding:** Often missing non-ASCII vectors — verify `"é"`, `"€"`, `"🚀"` match `printf … | sha256sum` for every algorithm
- [ ] **Newlines:** Often missing the trailing-newline/CRLF explanation — verify byte count shown, hint present, FAQ entry exists, textarea attrs (`autoCorrect=off`, `spellCheck=false`) set
- [ ] **SHA3:** Often missing Keccak negative test — verify SHA3-256("") starts `a7ffc6f8…`, not `c5d24601…`
- [ ] **CRC32:** Often missing high-bit/leading-zero cases — verify never negative, always 8 chars, chunked == one-shot, `"123456789"` = `cbf43926`, and RFC 3720 vectors not misapplied
- [ ] **Large files:** Often only tested at 10 MB — verify 256 MB+ file hashes correctly with responsive UI, progress, and cancel; manual iOS Safari check with a ≥500 MB file
- [ ] **Worker in prod:** Often only works in `next dev` — verify e2e on `next build && next start`
- [ ] **Stale results:** Often only text-edit path tested — verify file→file, file→text, text→file, Esc, mode switch, unmount all cancel in-flight work
- [ ] **No-network:** Often assumed — verify Playwright asserts zero new requests while hashing text and files
- [ ] **URL state:** Often auto-written — verify input is NOT in the URL unless user explicitly shares; `text` not in allow-list; fragment redacted in `redactBeforeSend` with unit tests
- [ ] **Keyboard:** Often copied from single-line tools — verify Enter inserts newline in textarea, Cmd/Ctrl+C on a selection copies the selection, `/` focus works, Tab order through rows/copy buttons is logical
- [ ] **Empty/zero-byte:** Often treated as "no input" — verify empty text and a 0-byte file both show correct empty-input digests (SHA-256 `e3b0c442…b855`, CRC32 `00000000`)
- [ ] **Drag-drop:** Often missing `preventDefault` — verify a drop outside the zone doesn't navigate away; file input resets so same file can be re-picked
- [ ] **CLS/Lighthouse:** Often passes on desktop only — verify CLS 0 and 90+ on production preview at 320px
- [ ] **Bundle:** Often unchecked — verify `/` and other tool routes' first-load JS unchanged; hash libs only in the hash island/worker chunks
- [ ] **SEO:** Often drifts — verify FAQ JSON-LD content-matches visible FAQ; worked-example digests asserted by test; registry-only change (no nav edits)
- [ ] **a11y:** Often skipped — verify labelled textarea/file input, `aria-live="polite"` for progress/completion (not per-keystroke), legacy badges are text not color-only, focus-visible rings
- [ ] **Security note:** Often missing — verify legacy-algorithm labels and the calm password note present, no modals

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong encoding path shipped | LOW | Fix single encoder choke point; add vectors; redeploy (stateless tool) |
| SHA3/Keccak mislabel | LOW | Swap import, add negative test, correct FAQ |
| CRC32 variant/sign bug | LOW–MEDIUM | Fix formatter/state handling; add chunk-split + vector tests; if users relied on wrong values, note in changelog |
| `arrayBuffer()` file path shipped | MEDIUM | Replace with chunked engine behind same function signature (hence: engine is the only API from day one) |
| Worker fails in prod | MEDIUM | Fix URL/bundler config; add prod-build e2e; temporary fallback to main-thread chunked hashing with `setTimeout(0)` yields |
| Secrets leaked via URL/analytics | HIGH | Remove auto URL-write; purge/ignore affected analytics URLs in Vercel dashboard; fix redaction; add tests; consider disclosure (needs human approval for legal text); cannot un-leak browser-history copies |
| Stale-result race | MEDIUM | Add sequence token + worker terminate to *all* entry paths (audit all, not just reported one — per Phase 4 retro) |
| Bundle regression | LOW–MEDIUM | Switch to deep imports, split worker/main, remove barrel |
| Hydration/CLS regressions | LOW | Fix skeleton height/reserved slots; re-run Lighthouse |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Encoding mismatch | Core (+UI byte count) | Non-ASCII vectors vs Node oracle; Playwright byte-count assertion |
| 2. Newline/CRLF/textarea | Core + UI + Ship (FAQ) | Playwright paste `a\r\nb`; hint visible; attrs asserted |
| 3. SHA3 vs Keccak | Core | Positive FIPS 202 + negative Keccak vector tests |
| 4. CRC32 variant/format | Core | Check value `cbf43926`, padding, unsigned, chunk-split property, zlib oracle |
| 5. Memory / whole-file reads | Core (engine) + UI (progress/cancel) | Chunk-equals-one-shot property; 256 MB e2e; iOS manual |
| 6. Main-thread jank | UI (+Core pure API) | Benchmark-derived threshold; worker e2e on prod build; Lighthouse TBT/INP |
| 7. Stale/mixed results | UI | Race e2e matrix covering every superseding path |
| 8. Web Crypto assumptions / lib import specifics | Core | Single-implementation rule; import smoke test; no `crypto.subtle` grep |
| 9. Secrets in URL / analytics fragment bypass | UI + Ship | `redact.test.ts` new cases; no auto-URL-write test; **decision needed pre-UI planning** |
| 10. "Fully local" violation | UI + Ship | Playwright network-silence test; grep gates |
| 11. Password/legacy-hash messaging | UI + Ship | Visual/a11y review; FAQ item present |
| 12. Bundle size | Core + UI + Ship | Build output compare vs baseline; analyzer; Lighthouse on `/` and `/tools/hash` |
| 13. Hydration / CLS | UI + Ship | Console clean; CLS 0 at 320px/desktop |
| 14. Textarea keyboard collisions | UI | Keyboard e2e + component tests |
| 15. Drag-drop/file input edges | UI + Ship | Picker + drop e2e, 0-byte, folder, reselect |
| 16. Test-vector completeness | Core | Vector table + oracle property tests as blocking gate |
| 17. Output formatting | Core + UI | Formatter unit tests; copy-all snapshot |
| 18. Registry/SEO integration | Ship | Registry test; FAQ JSON-LD content-match test |
| 19–22. Minor | UI | Component tests |

## Roadmap Implications (for synthesizer)

1. **Core first and gated on vectors.** The riskiest correctness items (1, 3, 4, 5, 8, 16) are all UI-independent and cheaply testable in Node. Make "vector table + chunk-split property tests green" an exit criterion before any UI work.
2. **One explicit pre-UI decision for the user/roadmapper:** how "bookmarkable text state" is delivered without leaking secrets (Pitfall 9) — recommended: explicit "Copy link" (or opt-in toggle), never auto-write; plus the `redactBeforeSend` fragment fix.
3. **UI phase needs the worker + sequence-token design up front** (Pitfalls 6, 7) and a decision on text-mode soft cap, `Esc` semantics, and optional LF/CRLF toggle.
4. **Ship phase includes** production-build worker e2e, network-silence test, Lighthouse/bundle check, FAQ with the "why doesn't my hash match" and "SHA3 ≠ keccak256" and password note.
5. **Phases likely needing deeper phase-level research:** Core (library selection/CRC32 sourcing — benchmark noble vs alternatives on the target algorithms and measure gzip size; confirm Node oracle availability for RIPEMD-160/zlib.crc32 in CI's Node version) and UI (Worker bundling under Next 16/Turbopack, iOS Safari memory limits — real-device test). Ship phase is standard patterns.

## Sources

- Repo (HIGH, direct reads): `lib/analytics/PacketoryAnalytics.tsx` (`redactBeforeSend` split-on-`?` behavior), `lib/analytics/redact.ts`, `lib/hooks/useKeyboardShortcut.ts` (Enter/copy guards), `app/tools/mac/MacToolLoader.tsx` (Loader/skeleton pattern), `tools/registry.ts` (category union), `tsconfig.json` (ES2020, bundler resolution), `package.json` (fast-check, vitest, no hash lib yet), `.planning/PROJECT.md` (Key Decisions: race-guard rule, `replaceState` URL pattern, Server-shell/Client-island)
- npm registry (HIGH): `@noble/hashes` 2.4.0 — zero dependencies; exports `./legacy.js`, `./sha2.js`, `./sha3.js`, `./sha3-addons.js` (no CRC32; v1-style paths absent); `hash-wasm` 4.12.0 (~1.8 MB unpacked — WASM alternative, not recommended for bundle/CSP reasons, MEDIUM)
- [MDN SubtleCrypto.digest()](https://developer.mozilla.org/docs/Web/API/SubtleCrypto/digest) — algorithm list (SHA-1/256/384/512 only), async, whole-buffer (MEDIUM-HIGH, via search result)
- [caniuse SubtleCrypto.digest](https://caniuse.com/mdn-api_subtlecrypto_digest) — broad SHA-2 support; no SHA-3 data found (MEDIUM)
- [mojoauth SHA3-256 in browser](https://mojoauth.com/security-guides/sha3-256-in-javascript-in-browser.md) — SHA-3 not in Web Crypto; use a library (LOW-MEDIUM, secondary)
- [WHATWG HTML textarea element (API value vs raw vs form-submission value)](https://www.w3.org/TR/2012/WD-html5-20121025/the-textarea-element.html), [zzz.buzz — Three Normalizations of textarea value](https://zzz.buzz/2017/12/21/javascript-traps-and-pitfalls-three-normalizations-of-textarea-elements-value/) — API value uses LF (MEDIUM; spec text from 2012 draft, re-check against current WHATWG standard in the UI phase with a real paste test)
- Domain knowledge, to be re-verified by test in Core (MEDIUM-HIGH): FIPS 180-4 / FIPS 202 / RFC 1321 / RIPEMD-160 reference vectors cited above; CRC catalogue check value `cbf43926` for CRC-32/ISO-HDLC; RFC 3720 Appendix B.4 vectors are CRC-32C; SHA-3 vs Keccak padding byte difference; PowerShell 5 redirect writes UTF-16LE+BOM
- Not verified in this research (LOW): exact iOS Safari per-tab memory ceilings; whether Vercel Analytics includes `location.hash` in `event.url`; exact Node version availability of `zlib.crc32` and OpenSSL `ripemd160` in CI — each flagged above for in-phase verification

---
*Pitfalls research for: in-browser multi-algorithm Hash Generator (Packetory v1.2)*
*Researched: 2026-10-14*
