# Requirements: Packetory

**Defined:** 2026-10-14
**Milestone:** v1.2 Hash Generator
**Core Value:** Zero-effort, instant results: every tool shows a useful output immediately with no login, no required input, and one-click copy — engineers should be able to get their answer and leave in seconds.

## v1.2 Requirements

### Hash Core (`lib/hash/`)

- [x] **HASH-01**: User gets correct MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512, RIPEMD-160, and CRC32 (IEEE, unsigned, 8-digit zero-padded hex) digests, verified against published test vectors (RFC 1321, FIPS 180-4, FIPS 202, RIPEMD-160 reference, CRC catalogue `123456789` → `cbf43926`) including padding-boundary lengths and SHA3-vs-Keccak negative cases
- [x] **HASH-02**: User's text is hashed as exact UTF-8 bytes (no trimming or Unicode normalization), so results match `printf '%s' "…" | sha256sum` for non-ASCII and emoji input
- [x] **HASH-03**: User gets identical digests whether input is hashed in one shot or in arbitrary chunks (property-tested chunk-split invariance)
- [x] **HASH-04**: All hashing runs in a Web Worker off the main thread, so typing and scrolling never jank, and the hash engine (`@noble/hashes`, imported only from `lib/hash/engine.ts`) is not part of the initial page JS

### Text Input

- [ ] **TEXT-01**: User sees all 10 digests for a sample input immediately on page load (precomputed, no input required, no CLS)
- [x] **TEXT-02**: User sees all 10 digests update live as they type or paste text, with no stale result ever replacing a newer one
- [x] **TEXT-03**: User sees the input's UTF-8 byte count and a hint explaining trailing-newline / CRLF differences versus command-line tools
- [ ] **TEXT-04**: User can restore a shared input via `?text=` on load, and can create such a link only through an explicit "Copy link" action (length-capped); typed text is never auto-written to the URL and never reaches analytics

### File Input

- [ ] **FILE-01**: User can hash a file by drag-and-drop or a file picker; the file is processed locally and never uploaded
- [ ] **FILE-02**: User can hash large files (hundreds of MB) via chunked streaming without loading the whole file into memory
- [ ] **FILE-03**: User sees hashing progress for large files and can cancel it (Cancel button or `Esc`)
- [ ] **FILE-04**: User sees a clear inline message for unreadable files, directory drops, or multi-file drops (single file only; a new drop replaces the current one), and a stray drop elsewhere on the page never navigates away

### Output

- [ ] **OUT-01**: User can copy any single digest with one click and visible confirmation
- [ ] **OUT-02**: User can copy all digests at once, as a labeled list or in `sha256sum`-compatible `<hash>  <filename>` format (`-` for text input)
- [ ] **OUT-03**: User can toggle hex case (lower/UPPER) and switch digests to Base64, without re-hashing (CRC32 stays hex)
- [ ] **OUT-04**: User can paste an expected checksum (tolerant of case, whitespace, colons, `sha256:` prefix, or a full `sha256sum` line) and every matching row is highlighted; a non-match is shown clearly
- [ ] **OUT-05**: User sees MD5 and SHA-1 (and CRC32) labeled as not suitable for security purposes, inline (no modal)

### Interaction

- [ ] **INT-01**: User can press `/` to focus the input, `Esc` to cancel in-flight work and reset to the sample, and a copy shortcut for the primary (SHA-256) digest; `Enter` is never bound (it inserts newlines in the textarea)
- [ ] **INT-02**: Every path that supersedes in-flight hashing (typing, paste, new file via picker or drop, mode switch, `Esc`, clear, unmount, `?text=` load) cancels its predecessor before starting
- [ ] **INT-03**: User can use the tool at 320px width (long digests wrap, no horizontal scroll) in light and dark mode

### Integration & SEO

- [ ] **INTG-01**: Hash Generator appears in the nav, landing grid, and sitemap via a single `tools/registry.ts` entry (category `encode`, `Hash` icon), with hard-coded 4-tool tests updated to 5
- [ ] **INTG-02**: `/tools/hash` has unique title/meta/canonical/OG tags, a worked example, and FAQ content with matching FAQPage JSON-LD (covering SHA3 vs Keccak, `echo` vs `echo -n`, MD5/SHA-1 security, match ≠ authenticity)
- [ ] **INTG-03**: The page makes zero third-party network requests (e2e-verified), and analytics redaction covers query strings and URL fragments (regression-tested)
- [ ] **INTG-04**: Production-build e2e tests cover text hashing, file hashing, cancel, and copy flows; Lighthouse stays 90+

## Future Requirements

Deferred; tracked but not in this roadmap.

- **HMAC-01**: User can compute keyed HMAC digests (key never in URL/analytics)
- **ENC-01**: User can enter input as hex or Base64 bytes instead of UTF-8 text
- **ENC-02**: User can toggle "append trailing newline" / CRLF line endings
- **OUT-06**: User can copy an SRI-format (`sha384-…`) integrity string
- **FILE-05**: User can hash multiple files in one batch

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-side hashing / file upload fallback | Violates local-first and privacy constraints |
| Hashing a URL's remote contents | SSRF surface; third-party requests |
| Exotic algorithm tail (40+ like sha1-online.com), algorithm picker | User capped at ~10 common; all shown at once instead |
| Reverse-hash / cracking lookups, password KDFs (bcrypt/argon2), NTLM | Abuse risk and wrong tool for password storage |
| Live auto-sync of text into URL | Leaks secrets into history, sync, and logs |
| localStorage "remember input" | Persists potential secrets |
| CSV export | Free-text filenames enable formula injection; sha256sum format covers the need |
| Keccak-256 / CRC-32C rows | Not in the ~10 common set; avoided to prevent confusion |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HASH-01 | Phase 8 | Complete |
| HASH-02 | Phase 8 | Complete |
| HASH-03 | Phase 8 | Complete |
| HASH-04 | Phase 8 | Complete |
| TEXT-01 | Phase 9 | Pending |
| TEXT-02 | Phase 9 | Complete |
| TEXT-03 | Phase 9 | Complete |
| TEXT-04 | Phase 9 | Pending |
| OUT-01 | Phase 9 | Pending |
| OUT-02 | Phase 9 | Pending |
| OUT-03 | Phase 9 | Pending |
| OUT-04 | Phase 9 | Pending |
| OUT-05 | Phase 9 | Pending |
| INT-01 | Phase 9 | Pending |
| INT-03 | Phase 9 | Pending |
| INTG-01 | Phase 9 | Pending |
| INTG-02 | Phase 9 | Pending |
| FILE-01 | Phase 10 | Pending |
| FILE-02 | Phase 10 | Pending |
| FILE-03 | Phase 10 | Pending |
| FILE-04 | Phase 10 | Pending |
| INT-02 | Phase 10 | Pending |
| INTG-03 | Phase 10 | Pending |
| INTG-04 | Phase 10 | Pending |

**Coverage:**

- v1.2 requirements: 24 total (corrected from an earlier miscount of 23 — the list above has 4 HASH + 4 TEXT + 4 FILE + 5 OUT + 3 INT + 4 INTG)
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-14*
*Last updated: 2026-10-14 after ROADMAP.md creation — 100% v1.2 coverage across Phase 8 (HASH-01..04), Phase 9 (TEXT-01..04, OUT-01..05, INT-01, INT-03, INTG-01, INTG-02), and Phase 10 (FILE-01..04, INT-02, INTG-03, INTG-04)*
