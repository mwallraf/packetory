# Feature Research

**Domain:** Online hash generator / checksum tool (text + file, fully in-browser) — new tool `/tools/hash`, milestone v1.2
**Researched:** 2026-10-14
**Confidence:** MEDIUM-HIGH (competitor surveys partly from live fetches of sha1-online.com and emn178 online-tools, partly from domain knowledge of CyberChef / it-tools / browserling / md5hashgenerator-style tools whose pages could not be fully fetched; behaviors of Web APIs and hash conventions are HIGH)

Scope note: this file covers ONLY what the Hash Generator adds. Existing shell, registry, copy hook (`useCopyToClipboard`), keyboard hook (`useKeyboardShortcut`), SEO/FAQ pattern, URL-state-via-History-API pattern and analytics allow-list are reused, not re-researched.

## How the Domain Works (survey summary)

| Site | Model | Notable behavior |
|------|-------|------------------|
| sha1-online.com (user's reference) | One text box, huge algorithm list (SHA-1/256/384/512, MD2/4/5, RIPEMD-128..320, Tiger, HAVAL, Whirlpool, Snefru, GOST, Adler-32, CRC32/32b), hash shown after submit | Dated, ad-laden, long exotic-algorithm tail. The "all algorithms on one page" idea is what to copy; the look and the submit-button friction are what not to. (HIGH, live fetch; interactive controls did not render in the fetch, so file/compare/HMAC absence is unverified) |
| emn178 online-tools | One page per algorithm + separate "File Checksum" page per algorithm | Input encoding selector (UTF-8, UTF-16LE/BE, Hex, Hex-ignore-non-hex, Base64, many legacy code pages), output encoding (hex lower, hex UPPER, Base64), Auto Update toggle, Remember Input, Enable HMAC + key field with own encoding, Share Link button, text and file split across separate pages. (HIGH, live fetch) |
| CyberChef | Recipe pipeline | "Generate all hashes" op lists ~50 hashes at once; HMAC op; input/output encoding via separate From/To Hex/Base64 ops; powerful but not zero-effort. (MEDIUM, domain knowledge) |
| it-tools.tech "Hash text" | Single text box, shows MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA-3, RIPEMD-160 simultaneously, digest-encoding dropdown (Hex/Base64/Base64url/Bin), each row has a copy button | Closest to Packetory's "all at once, live" target. Text only; no file mode. (MEDIUM, from memory; fetch returned only the title) |
| md5hashgenerator-style / browserling | Single algorithm per page, submit button, often server-side | Reason users distrust them for sensitive data; "runs in your browser" is a selling point. (MEDIUM) |
| Checksum verifiers (sgalinski SHA-512 Verifier, abacktools Integrity Checker, octoclip File Integrity, elysiatools) | File (+ text) in, paste expected hash, big MATCH/MISMATCH | Algorithm often inferred from hash length; strips spaces/colons/dashes; some accept `sha256:` prefix; side-by-side display; no site found highlighting differing characters. (MEDIUM, web search) |

The dominant user jobs, in order: (1) "give me the MD5/SHA-1/SHA-256 of this string" (2) "what is the checksum of this downloaded file, and does it match what the vendor published" (3) "debug why my hash differs from the other system's" (newline / encoding / case / HMAC). Packetory's all-at-once, live, zero-submit model serves (1) by default; (2) and (3) are where the differentiators live.

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| All ~10 algorithms computed at once, shown as labeled rows | sha1-online.com and it-tools both do this; users hate re-picking an algorithm | LOW (UI) / MEDIUM (lib) | Proposed set MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, RIPEMD-160, CRC32. See "Algorithm list sanity check" below |
| Live hashing as you type, no submit button | Packetory core value; it-tools and emn178 "Auto Update" do this | LOW | Text hashing is microseconds. Use synchronous compute (or `useDeferredValue`) below a byte threshold (suggest ~256 KB), debounce/worker above it, so pasting a large blob never janks typing |
| Non-empty default result on load | Brief non-negotiable (zero-effort default) | LOW | Pre-fill a recognizable sample (e.g. `hello world`) with the textarea text pre-selected on focus so first keystroke replaces it. Same demo-on-load pattern as the other 4 tools. Do NOT default to empty (empty-string hashes are valid but read as "broken" to a first-time visitor); mention the empty-string hashes in the FAQ/worked example instead |
| Per-hash copy button with visible confirmation | Brief non-negotiable | LOW | Reuse `useCopyToClipboard`; one button per row |
| Copy all | Existing convention across all 4 tools | LOW | See export-format discussion below; default is labeled lines |
| Lowercase/UPPERCASE hex toggle | emn178 has it; vendors publish either case; sha1-online users expect to match a published upper-case digest | LOW | Reuse the UUID tool's case toggle (`toggle-group`). Default lowercase (what `sha256sum` prints). Toggle only affects display/copy, never recomputes |
| Text input is UTF-8 and says so | Every serious tool states encoding; most "hash differs" support questions are encoding | LOW | Show "N bytes (UTF-8)" under the textarea. Cheap, high trust |
| File input: drag-and-drop + picker, never uploaded | User-locked scope; privacy is the core reason to use a local tool | MEDIUM | Visible "processed in your browser, never uploaded" copy. Picker must be keyboard-operable (a real `<button>` triggering a hidden `<input type=file>`); drop zone is a bonus, not the only path |
| Streaming/incremental file hashing (never `file.arrayBuffer()` of the whole file) | Multi-GB ISOs are the canonical use case; whole-file buffering crashes tabs | MEDIUM-HIGH | Web Crypto `digest()` is one-shot only (no incremental API) and lacks MD5/SHA-3/RIPEMD/CRC32 anyway, so a library with `update()`/`digest()` streaming is mandatory. Read via `Blob.stream()` or `slice()` chunks (e.g. 1-4 MB). One pass over the file feeds all 10 hashers |
| File progress indicator + cancel | Hashing 1 GB x 10 algorithms can take tens of seconds; no feedback looks hung | MEDIUM | Determinate progress bar (bytes read / size), filename and size shown, Cancel button and `Esc` cancel. Must be CLS-free (reserve space) |
| Main thread stays responsive during file hashing | Page hang is unacceptable for "keep it open as a bookmark" tool | MEDIUM-HIGH | Web Worker strongly recommended (library choice affects this: pure-JS SHA-3 is slow, WASM much faster per hash-wasm's own benchmarks; directional only, re-benchmark in STACK). Worker bundling under Next 16 (`new Worker(new URL(...))`) is a phase-planning risk |
| Clear/reset | Existing convention (`Esc` resets) | LOW | `Esc` clears text, drops file, cancels in-flight hashing, restores sample |
| Correctness verified against published test vectors | Wrong hash = total loss of trust; brief demands boundary testing | MEDIUM | NIST/RFC vectors (empty string, `abc`, million-`a`), plus multi-chunk file test proving chunked == one-shot at chunk boundaries (0, 1, chunk-1, chunk, chunk+1 bytes) |
| Per-tool SEO: title/meta/OG, worked example, FAQ + FAQPage JSON-LD | Existing convention on every tool | LOW | FAQ gold mines: "Why is my hash different from `sha256sum`?" (trailing newline), MD5/SHA-1 not for security, SHA3-256 vs Keccak-256, is my data uploaded, how to verify a download |
| Mobile 320px, light/dark, CLS-free | Existing non-negotiable | LOW-MEDIUM | 10 rows of 64-128 hex chars: must wrap (`break-all`) at 320px; SHA-512/SHA3-512 are 128 chars |
| Registry entry (nav, landing card, sitemap automatic) | Architecture intent | LOW | One `tools/registry.ts` entry. Note `category` union has no "crypto/hash" member (`"network" \| "dns" \| "web" \| "encode" \| "generate"`); use `"encode"` or add a member if the landing page groups by category (small touch to a shared type, check `registry.test.ts`) |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Paste-to-verify: expected-hash box that highlights the matching row** | The single most common reason people hash a file is to compare with a published checksum. Competitors make you eyeball 64 hex chars. Because we compute ALL algorithms, no algorithm picker is needed: paste any digest, and whichever row equals it lights up with a clear MATCH badge; none equal = clear "no match" state | LOW-MEDIUM | Normalize pasted value: trim, lowercase, strip whitespace/colons/dashes, strip `sha256:`-style prefix, and accept a whole `sha256sum` line (`<hash>  <filename>`: take first token). Also accept Base64 form of a digest (compare both encodings). Ambiguities to handle explicitly: 40 hex = SHA-1 or RIPEMD-160, 64 hex = SHA-256 or SHA3-256, 128 hex = SHA-512 or SHA3-512 — match against every row, highlight all that equal (collisions are impossible in practice). Non-hex/wrong-length input shows a hint ("looks like 12 chars, expected 8/32/40/56/64/96/128"), not a red error. Comparison need not be constant-time (local, nothing secret). Accessibility: match result must be conveyed by text + icon + `aria-live`, not color alone. Differing-character highlighting (diff) is a nice-to-have, not required |
| Byte-exact trailing-newline guidance (the `echo` vs `echo -n` gotcha) | #1 "my hash doesn't match the CLI" cause. A textarea never adds a trailing newline; `echo foo \| sha256sum` hashes `foo\n` | LOW | Cheapest valuable option: a one-line hint near the input + FAQ entry. Optional upgrade: "Append trailing newline" toggle (hashes `text + "\n"`), default OFF, shown in byte count. Related hidden trap: `textarea.value` normalizes CRLF to LF, so pasting Windows-line-ending text silently changes the bytes; file mode is the exact path. State this in FAQ. A "line ending: keep LF / convert to CRLF" control is an anti-feature at this scope |
| `sha256sum`-compatible copy format | Engineers paste straight into a `SHA256SUMS` file or a README | LOW-MEDIUM | Export formats via the same toggle pattern as UUID (text / CSV / JSON): (1) **Labeled list** default: `SHA-256: <hex>` per line, (2) **Checksum format** `<hash>  <filename>` (two spaces, GNU coreutils; filename `-` for text input, matching `sha256sum` stdin), emitted per algorithm that has a coreutils equivalent (`md5sum`, `sha1sum`, `sha224sum`, `sha256sum`, `sha384sum`, `sha512sum`; others get a `# ALGO` comment or are omitted), (3) JSON. Do NOT offer CSV (filenames are free text: CSV/spreadsheet formula-injection risk, see UUID decision T-02-06 which only accepted it because the alphabet was hex+hyphen). Uses the file's real name; GNU escapes backslash/newline in filenames with a leading `\`, handle or strip |
| Base64 output (plus hex) | Needed for SRI (`integrity="sha384-..."`), HTTP `Digest`/`Content-MD5` headers, JWT/JWS-ish debugging; emn178 and it-tools offer it | LOW | Output-encoding toggle: Hex lower / Hex UPPER / Base64 (one control subsumes the case toggle, mirrors emn178). Bonus within scope: a "SRI" copy format for SHA-256/384/512 (`sha384-<base64>`), very developer-relevant and tiny |
| HMAC mode | Devs debug webhook signatures (GitHub/Stripe style HMAC-SHA256) here; emn178 and CyberChef have it; sha1-online does not | MEDIUM | Key field + "Enable HMAC" toggle; applies to the 8 cryptographic hashes (not CRC32, shown as "n/a" and greyed). Web Crypto HMAC handles SHA-1/256/384/512 only, so MD5/SHA-224/SHA-3/RIPEMD need library HMAC. **Privacy: key must never be written to the URL, never in analytics.** Text-only vs also files: allow both only if lib supports streaming HMAC (it does via `update()`), else text-only. Recommended as P2 / "add after validation" given the ~10-algorithm lock and zero-effort ethos; it also adds a second input and error states to a currently single-input tool |
| Input encoding selector (UTF-8 / Hex / Base64) | Lets users hash raw bytes (a pasted hex blob, a Base64 binary) without a file; emn178's headline feature | LOW-MEDIUM | Limit to 3 options (UTF-8 default, Hex, Base64). Skip UTF-16 and legacy code pages (emn178's long tail). Needs inline validation (odd-length hex, invalid Base64) with the same inline-error style as other tools. P2 |
| Algorithm-aware hints per row | Security-literate users appreciate honesty | LOW | Small badge on MD5/SHA-1 ("not collision-resistant, fine for checksums, not for security") and CRC32 ("error-detection only"), plus a note that the page is not for password storage (use bcrypt/Argon2). Pure copy/FAQ, no logic. Also doubles as SEO content |
| Hash both file *and* text in one page without mode switching | emn178 splits text and file across separate pages; one page is simpler | LOW-MEDIUM | Drop a file onto the page → the input area shows filename/size/progress and results rows update; "Clear" returns to text mode. Single state machine `idle(text) \| hashing(file) \| done(file)` |
| Explicit "Copy share link" (instead of live URL sync) | Bookmarkable state requirement without leaking secrets | LOW | See privacy discussion below |
| Hashing shortcuts consistent with other tools | Keyboard-first parity | LOW | See keyboard section below |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-writing the input text into the URL on every keystroke (as DNS/Subnet do for `?name=` / `?cidr=`) | "Bookmarkable text state" is in the milestone brief; consistent with other tools | People hash secrets: passwords, API keys, tokens, PII. A live-updating URL leaks them into browser history, tab-sync/session-restore, bookmarks, shared screenshots, copied links, and any referrer/uptime/log tooling. Unlike a CIDR it is arbitrary free text of unbounded size (URL length limits too). The existing analytics allow-list is safe by default (a `text` param would not be reported) but history/sharing exposure remains | Read `?text=` on load (so shared links work and can be demonstrated in docs/FAQ), but only **write** it from an explicit "Copy link" action, capped (e.g. <= 1-2 KB, button disabled/hint beyond that), with a one-line "link contains your text" notice. Never write file data, HMAC key, or file names. Do NOT add `text`/`key`/`hmac` to the analytics allow-list. Needs a conscious decision against the milestone's "bookmarkable text state" wording; flag in requirements |
| Hashing the textarea contents server-side / API route | "Consistency with MAC/DNS routes" | Defeats local-first promise and privacy claim ("files never leave the browser"); adds third-party/network surface | Pure client; no `/api/hash` |
| Uploading files for hashing (even as a fallback) | Some browsers/old devices | Breaks the one thing users trust the tool for | Streaming in-browser only; clear error for unsupported browsers |
| Exotic algorithm tail (Tiger, HAVAL, Snefru, GOST, Whirlpool, MD2/MD4, RIPEMD-128/256/320, CRC32b ...) | sha1-online.com lists ~40 | Bloats JS/UI, 10+ rows push the answer off-screen, nobody on the target audience needs them; user locked ~10 max | Keep the 10. Mention in FAQ that Packetory deliberately shows the common set |
| "Algorithm picker" dropdown with one result | Matches emn178's per-algorithm pages | Contradicts "all at once"; adds a click | All rows visible; verify box matches any row; page-level SEO via one strong page rather than 10 thin pages |
| Password hashing / "bcrypt generator" / hash cracking / rainbow-table lookups / "reverse this hash" | High-traffic adjacent searches (md5 decrypt) | Reverse lookup requires server DB (third-party, privacy), cracking tools are liability; bcrypt/Argon2 are slow KDFs with salts, different UX and risk | State plainly in FAQ that hashes are one-way; link to nothing. Defer any KDF tool to a separate future tool, if ever |
| Hashing "URL contents" (fetch a URL and hash it) | emn178 offers it | Requires CORS or a proxy, i.e. server-side fetching = SSRF/abuse surface; explicitly against "no arbitrary server-side network probing" | Not offered. Users download then drop the file |
| Multi-file batch hashing table in v1.2 | "Verify a whole folder" | N files x 10 algos is a large UI (table, per-file progress, overall queue, memory), error and cancel states; plus ambiguity with the single-file mental model | Single file at a time (a second drop replaces the first, with the in-flight hash cancelled). Revisit later as "batch mode with ONE selected algorithm + `SHA256SUMS` export/verify" if demand appears |
| Per-keystroke recompute of a large file or huge pasted text on the main thread | "Live everywhere" | Freezes the tab | Threshold + debounce/worker for large text; file hashing runs once per file, never per keystroke |
| Remember input in localStorage by default | emn178 "Remember Input" | Persists potentially secret text on disk with no user awareness; contradicts the privacy-first positioning | Do not persist. If ever added, opt-in and clearly labeled |
| Stuffing the whole result UI with ads/modals/signup | Common on competitors | Violates brief (no modal ads/popups/interstitials ever) | n/a |
| Constant-time comparison / "secure compare" badge | Sounds rigorous | Nothing secret is compared in a local verify box; adds fake assurance | Plain normalized string equality |
| Treating a MATCH as proof of authenticity | Verify box UX temptation | A matching hash only proves the file equals what was published at that location; if the same page is compromised the hash is too | Neutral wording in UI/FAQ: "Matches the expected SHA-256", with a short FAQ note recommending signatures (GPG/minisign/cosign) where available |

## Algorithm List Sanity Check

The proposed set (MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, RIPEMD-160, CRC32) is a defensible "most common" set. Verdicts:

| Candidate | Verdict | Reason |
|-----------|---------|--------|
| MD5, SHA-1, SHA-256, SHA-512 | Keep (must) | The overwhelming majority of searches and published checksums |
| SHA-384 | Keep | Used for SRI (`integrity="sha384-..."`), TLS, JWT HS384 |
| SHA-224 | Keep (lowest-value in set) | Cheap, completes the SHA-2 family users expect, shown by it-tools and emn178; first to cut if a slot is needed |
| SHA3-256, SHA3-512 | Keep | Modern NIST standard; no Web Crypto support. Tie to a clear FAQ: **SHA3-256 is not Keccak-256** (Ethereum/Solidity use legacy Keccak with different padding). This is the biggest source of confusion and a good SEO/FAQ item. Do not add Keccak-256 as an 11th row unless the user wants the Ethereum audience |
| RIPEMD-160 | Keep | Bitcoin/crypto addresses, GPG legacy, appears on it-tools and sha1-online |
| CRC32 | Keep | The only non-cryptographic one; ubiquitous for ZIP/PNG/Ethernet-adjacent checks (a network audience fit). Format as 8-hex, zero-padded, unsigned; test that value does not go negative (JS bitwise ops yield signed ints) |
| SHA3-224 / SHA3-384 | Skip | Rare; adds rows without demand |
| SHA-512/256, SHA-512/224 | Skip | Rare; and not in Web Crypto. Niche (some Go/OpenBSD ecosystems) |
| BLAKE2b / BLAKE3 | Skip in the 10; best "swap-in" candidate if the user wants to trade out RIPEMD-160 or SHA-224 | Growing developer popularity (b2sum, b3sum, package managers). Note BLAKE3 is not in most small JS libs; WASM libs have it. If the user later wants a "more algorithms" expander, BLAKE2b/BLAKE3 + xxHash are the first adds. Keeping to the user's "~10 max" lock, do not add |
| xxHash (XXH32/XXH64/XXH3) | Skip | Non-crypto, mostly developers hashing for caches/dedup; low search demand relative to CRC32 |
| NTLM | Skip, deliberately | It is MD4 over UTF-16LE password text: it exists to attack/audit Windows passwords. Aligned with the anti-password-hashing stance; also needs MD4 and UTF-16LE handling |
| Adler-32 | Skip | Very rare outside zlib internals |
| MD4 / MD2 / Whirlpool | Skip | Historical |
| SHAKE128/256 | Skip | Variable-length output needs extra UI (output length) |

Row order recommendation: group by family with SHA-256 first or visually emphasized as the "headline" result (most-requested modern digest and the natural target for the global `Ctrl/Cmd+C` shortcut): SHA-256, SHA-1, MD5, then SHA-224, SHA-384, SHA-512, SHA3-256, SHA3-512, RIPEMD-160, CRC32. Alternatively keep a classical family ordering; either is fine, but pick the primary row deliberately and document it.

## Edge Cases and Gotchas That Drive Requirements

| Gotcha | Behavior to specify |
|--------|--------------------|
| `echo foo \| sha256sum` includes `\n`; `echo -n` / `printf` does not | Hint text + FAQ; optional "append newline" toggle (P2). Textarea default hashes exactly the typed text |
| `textarea.value` normalizes CRLF to LF | Byte count reflects the normalized value; FAQ says use file mode for exact bytes of a CRLF file |
| Unicode: emoji / combining characters / NFC vs NFD | Hash UTF-8 bytes of the JS string as-is (via `TextEncoder`); do not normalize. Lone surrogates become U+FFFD under `TextEncoder`: mention in byte count tests |
| Empty input | Valid; yields the well-known empty digests (SHA-256 `e3b0c442...b855`). Do not error; if the input is cleared, show empty-string hashes with an "empty input" note, not blank rows |
| Zero-byte file | Valid, same as empty; test explicitly |
| Case of pasted expected hash | Normalize case-insensitively |
| Same digest length across algorithms (40, 64, 128) | Verify matches against all rows (see above) |
| CRC32 presentation | 8 hex digits, zero-padded, big-endian display as `crc32`/`cksum -o3`-style tools do (zip/PNG convention); document that it is NOT the POSIX `cksum` value |
| Very large files | Progress, cancel, worker; surface a friendly message on read errors (file removed mid-read, permission, `NotReadableError`) and on cancelled/aborted runs |
| File dropped while another is hashing, or text edited while a file is selected | Must cancel the in-flight run (abort + sequence token) before starting/mutating state. This is the project's recorded lesson from Phase 4 / Phase 5 (every path that supersedes an async job must cancel it, audited across ALL paths: new drop, picker select, text typing, Esc, Clear, unmount) |
| Directory or multiple files dropped | v1.2: take the first file only if a single regular file; show a short hint for folders or multi-drop ("one file at a time") |
| Unsupported `Blob.stream()` / Worker / Web Crypto (very old browsers) | Graceful fallback: `slice()` + `FileReader`/`arrayBuffer()` per chunk; avoid hard feature failure |
| Drag-over page-wide vs only inside drop zone | Prevent browsers from navigating to the dropped file when the user misses the zone (page-level `dragover`/`drop` guard) |
| Hex output in copy-all for CRC32 and others when "Base64" selected | Define behavior: CRC32 Base64 is meaningless/odd; keep CRC32 always hex (or Base64 of 4 bytes, document). Simplest: CRC32 row ignores Base64 |

## Keyboard / Interaction Fit With Existing Conventions

| Existing convention | Fit for Hash tool |
|---------------------|-------------------|
| `/` focuses primary input | Focus the textarea (and select-all so the sample is replaced on type) |
| `Enter` executes | **Conflict**: the primary input is a multi-line textarea where `Enter` must insert a newline. Live hashing has nothing to "execute". Do not bind global `Enter` for this tool (hook handlers are optional and unbound = no-op). Consider `Ctrl/Cmd+Enter` = no-op or "copy SHA-256" only if wanted; default: leave unbound |
| `Esc` reset | Clear text → restore sample, cancel running hash, drop file, clear verify box |
| `Ctrl/Cmd+C` copies primary result | Existing hook only fires when focus is NOT in an editable field (so selection-copy in the textarea/verify box keeps working). Bind to the primary (SHA-256) hash with the same visible confirmation. Pick the primary row deliberately; the README for the page should state it |
| Enter guard for native interactive targets | Not needed if Enter is unbound; keep for any buttons |
| One-click copy with visible confirmation and announcement | Per row, copy-all, share link, and any "copy as sha256sum line" |

## Feature Dependencies

```
Streaming hash core (lib/hash incremental API: new/update/digest for all 10)
    ├──requires──> Library choice with update()/digest() for MD5, SHA-1/2, SHA-3, RIPEMD-160 (+ CRC32 small hand-written/dep)
    ├──enables──> Text hashing (same API, one update call)
    └──enables──> File hashing (chunked update loop)
                       ├──requires──> Progress + cancel + sequence-token (race-safe) state machine
                       └──strongly benefits from──> Web Worker (keeps UI live; SHA-3 JS is slow)

Output formatting (hex lower/UPPER/Base64)
    └──enhances──> Per-row copy, Copy-all, Verify-match normalization

Copy-all export formats (labeled / sha256sum / JSON)
    ├──requires──> Output formatting + filename knowledge (file name or "-" for text)
    └──reuses──> UUID export toggle pattern (NOT its CSV format)

Paste-to-verify box
    ├──requires──> All hashes computed simultaneously (so no algorithm picker)
    └──requires──> Normalization (trim / case / separators / prefix / sha256sum line)

Input encoding selector (Hex/Base64 in)  ──enhances──> Text hashing (also needed by HMAC key encoding)
HMAC mode  ──requires──> Library HMAC (Web Crypto lacks MD5/SHA-3/RIPEMD) + key input; ──conflicts──> URL state (key never in URL)

Share-link button ──requires──> existing History API/URL-state helper pattern (read ?text= on load); ──conflicts──> live URL sync (privacy)

Registry entry ──requires──> nothing new (existing pattern); category type check
Per-tool SEO/FAQ ──reuses──> existing faq-data.ts + FAQPage JSON-LD pattern
Keyboard shortcuts ──reuses──> useKeyboardShortcut (slash / escape / copy; leave enter unbound)
Copy confirmation ──reuses──> useCopyToClipboard
Analytics privacy ──reuses──> lib/analytics/redact.ts allow-list (add NO hash params)
```

### Dependency Notes

- **Streaming core requires a library with incremental API:** Web Crypto `subtle.digest` is one-shot, so it cannot do large files; it also lacks MD5/SHA-224/SHA-3/RIPEMD-160/CRC32. This forces the library decision (STACK researcher): a zero-dep library with chunked `update()` for all 10. Candidates per hash-wasm's published numbers: WASM is several times faster, especially for SHA-3 (benchmarks are from the maintainers and for older noble versions, so re-measure); pure-JS (noble-style) has smaller/simpler bundling but SHA-3 on multi-GB files is slow, making a worker non-optional. Check CRC32 availability separately; it's ~20 lines to hand-roll against the standard test vector (`123456789` -> `cbf43926`).
- **Web Worker is not strictly required for correctness but is for UX on large files**; text hashing can stay on the main thread under the threshold.
- **Verify box requires all-at-once hashing:** this is why verify is cheap here and a strong differentiator; competitors that compute one algorithm at a time must infer or ask.
- **Share link conflicts with live URL sync:** pick one. Recommendation above: explicit button.
- **HMAC key conflicts with URL state:** key excluded from every URL and analytics path unconditionally.
- **Enter conflicts with textarea:** do not bind.

## MVP Definition

### Launch With (v1.2)

- [ ] `lib/hash/` framework-agnostic core: incremental hasher for all 10 algorithms, hex/Base64/UPPER formatting, verify-normalization, sum-format export; Vitest against published vectors incl. chunk-boundary file tests — foundation, and where the correctness risk lives
- [ ] Text input (UTF-8), live all-at-once hashing, sample on load, byte count, trailing-newline hint — core value
- [ ] File input (picker + drag-drop), streamed hashing, progress, cancel, race-safe superseding — user-locked scope
- [ ] Per-row copy + copy-all with visible confirmation; hex case toggle (plus Base64 output toggle, near-free) — brief non-negotiable
- [ ] Paste-to-verify with matching-row highlight — highest-value differentiator, low cost given all-at-once design
- [ ] `sha256sum`-style copy-all format (plus labeled default) — cheap, high developer value
- [ ] Reading `?text=` on load plus an explicit "Copy link" (no live URL writes) — satisfies bookmarkable intent without leaking secrets (decision needed)
- [ ] Registry entry, per-tool SEO (title/meta/OG, worked example, FAQ + JSON-LD), 320px, light/dark, `/` focus, `Esc` reset, `Ctrl/Cmd+C`
- [ ] Playwright e2e: default hashes on load, typing updates, file drop of a known fixture yields known digests, verify-match highlight, copy confirmation, Esc cancel mid-hash, no network requests during hashing

### Add After Validation (v1.2.x / v1.3)

- [ ] HMAC mode (key field, 8 algorithms) — trigger: user feedback / webhook-debugging searches
- [ ] Input encoding selector (Hex/Base64 in) — trigger: users asking to hash binary blobs
- [ ] "Append trailing newline" toggle — trigger: repeated "doesn't match CLI" feedback despite hint
- [ ] SRI copy format (`sha384-<base64>`) — trigger: developer demand; trivial after Base64 output exists
- [ ] Character-level diff highlighting in verify box — trigger: users with near-miss mismatches
- [ ] Related-tool links (existing tech-debt item): UUID, Base64/URL encoders (roadmap) ↔ Hash

### Future Consideration (v2+)

- [ ] Batch/multi-file mode with one chosen algorithm and `SHA256SUMS` verify — needs a different UI model
- [ ] Extra algorithms behind a "more" expander (BLAKE2b/BLAKE3, xxHash, SHA-512/256) — only if the user lifts the ~10 lock
- [ ] Public API exposure of `lib/hash` via the future `@packetory/core` package (the framework-agnostic lib design already supports this)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| All 10 hashes at once, live, sample on load | HIGH | MEDIUM | P1 |
| Per-row copy / copy-all / case toggle | HIGH | LOW | P1 |
| Streaming file hashing + progress + cancel | HIGH | HIGH | P1 |
| Race-safe superseding (new file/typing/Esc) | HIGH (trust) | MEDIUM | P1 |
| Paste-to-verify with row highlight | HIGH | LOW-MEDIUM | P1 |
| Test-vector + chunk-boundary correctness suite | HIGH | MEDIUM | P1 |
| SEO/FAQ (newline, SHA3 vs Keccak, privacy) | MEDIUM-HIGH | LOW | P1 |
| `sha256sum`-format copy-all | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Base64 output | MEDIUM | LOW | P1 (near-free) |
| Explicit share-link (no live URL writes) | MEDIUM | LOW | P1 |
| Web Worker for file hashing | HIGH (UX) | MEDIUM-HIGH | P1 if library is pure JS; P2 if WASM is fast enough |
| HMAC mode | MEDIUM | MEDIUM | P2 |
| Hex/Base64 input encoding | MEDIUM | LOW-MEDIUM | P2 |
| Append-newline toggle | MEDIUM | LOW | P2 |
| SRI copy format | LOW-MEDIUM | LOW | P2 |
| Verify char-diff | LOW | MEDIUM | P3 |
| Multi-file batch | MEDIUM | HIGH | P3 |
| Extra algorithms | LOW | LOW-MEDIUM | P3 |

**Priority key:** P1 must-have for v1.2; P2 add when possible; P3 future.

## Competitor Feature Analysis

| Feature | sha1-online.com | emn178 online-tools | it-tools (recalled) | CyberChef | Packetory approach |
|---------|-----------------|---------------------|---------------------|-----------|--------------------|
| Algorithms at once | ~40, listed | One per page | ~8 at once | Many via "Generate all hashes" | 10 curated, all at once |
| Live as you type | No (submit) | Auto Update toggle | Yes | Yes (auto-bake) | Always on, no toggle |
| Default result on load | No | No | Sample text | Empty/recipe | Sample text, pre-selected |
| File hashing | Unverified | Separate File page per algo | No | Yes (drag-drop input) | Same page, streamed, progress, cancel |
| Verify against expected | No | No | No | Via compare ops (manual) | Paste-to-verify, auto-highlight any match |
| Output encodings | Hex | Hex lower/UPPER, Base64 | Hex/Base64/Base64url/Bin | Many | Hex lower/UPPER, Base64 |
| Input encodings | UTF-8 | UTF-8, UTF-16, Hex, Base64, legacy pages | UTF-8 | Many | UTF-8 v1.2; Hex/Base64 later |
| HMAC | No | Yes | No | Yes | Later (P2) |
| Share/bookmark | No | Share Link button (explicit) | Local persistence | URL hash of recipe+input | Explicit "Copy link" only, capped |
| Copy per hash | No | Yes | Yes | Yes | Yes, with confirmation |
| Ads/clutter | Heavy | Ads | None | None | None |
| sha*sum export | No | No | No | No | Yes |

## Sources

- sha1-online.com (live fetch 2026-10-14): algorithm list; interactive controls did not render in fetch (MEDIUM)
- emn178.github.io/online-tools/sha256.html (live fetch 2026-10-14): input/output encodings, HMAC, Auto Update, Remember Input, Share Link, separate File Checksum tool (HIGH)
- it-tools.tech/hash-text: fetch returned title only; feature description from prior knowledge (MEDIUM/LOW)
- CyberChef: from domain knowledge, not fetched (MEDIUM)
- Web search results on checksum verifiers (sgalinski SHA-512 Verifier, abacktools File Integrity Checker, octoclip File Integrity, elysiatools File Hash Verifier, 0x56erify): paste-expected-hash flow, length-based algorithm inference, separator stripping, `sha256:` prefix, MATCH/MISMATCH; no char-diff found (MEDIUM)
- hash-wasm package listing / README benchmarks via web search (socket.dev, npmjs.com/package/hash-wasm): per-algorithm gzipped sizes (MD5 ~4 kB, SHA-3 ~4 kB, CRC32 ~3 kB) and maintainer benchmarks vs noble-hashes 1.3.2; directional only (MEDIUM)
- GNU coreutils `*sum` output format (`hash`, two spaces, filename; `-` for stdin; leading `\` for escaped names): domain knowledge (HIGH)
- HTML spec behavior of `textarea.value` newline normalization to LF; Web Crypto `subtle.digest` one-shot and algorithm support limited to SHA-1/256/384/512: domain knowledge (HIGH)
- Project context: `.planning/PROJECT.md`, `project-brief.md`, `lib/analytics/redact.ts` (allow-list safe by default), `lib/hooks/useKeyboardShortcut.ts` (Ctrl/Cmd+C ignored in editable fields; handlers optional), `lib/uuid/export.ts` (CSV accepted only because alphabet is hex+hyphen), `tools/registry.ts` (category union)

---
*Feature research for: online hash generator (Packetory v1.2 `/tools/hash`)*
*Researched: 2026-10-14*
