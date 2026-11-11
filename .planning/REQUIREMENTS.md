# Requirements: Packetory

**Defined:** 2026-11-11
**Milestone:** v1.3 Password Generator & Tool Page Polish
**Core Value:** Zero-effort, instant results — every tool shows a useful output immediately with no login, no required input, and one-click copy.

## v1.3 Requirements

### Tool-page info sections (INFO)

- [x] **INFO-01**: On every tool page, the Worked Example and FAQ render *below* the tool inside a visually muted "About this tool" area
- [x] **INFO-02**: Worked Example and FAQ are each a native `<details>` disclosure, closed by default, operable by mouse and keyboard (Enter/Space)
- [x] **INFO-03**: Collapsed content remains in the server-rendered HTML; each page emits exactly one FAQPage JSON-LD block built from the same data as the visible FAQ
- [x] **INFO-04**: Pressing Enter on a focused `<summary>` toggles only that section — it never fires the tool's global Enter shortcut (regenerate/lookup/…)
- [x] **INFO-05**: All six existing tools (UUID, Subnet, DNS, MAC, Hash, Config) use one shared About component (no per-page duplicated JSON-LD builder)

### Config Highlighter parity (CFG)

- [x] **CFG-01**: User sees a worked example on `/tools/config` — a sample Cisco IOS snippet rendered highlighted, using only RFC 5737 addresses and no realistic secrets
- [x] **CFG-02**: User sees a 4–6 item FAQ on `/tools/config` with matching FAQPage JSON-LD
- [x] **CFG-03**: The Config tool shows its own `FileTerminal` icon on its landing card, the only surface that renders registry icons (nav links and tool-page headings stay text-only for every tool, per Phase 10 decision D-16); every registered icon resolves explicitly (no silent fallback to another tool's icon), and a unit test fails if a registered icon lacks an explicit `ICONS` entry.

### Subnet compaction (SUBNET)

- [x] **SUBNET-08**: With the default IPv4 /24 result, the full generated output is visible without scrolling at a 1366×650 viewport (also checked at 1280×600)
- [x] **SUBNET-09**: An IPv6 /64 result has a stated and measured no-scroll target at 1366×650
- [x] **SUBNET-10**: Compaction removes no fields, keeps body text ≥14px (the 12px IPv4/IPv6 family badge chip is not body text), keeps all copy controls and existing testids, and introduces no horizontal overflow at 320/375px

### Password generator — random password (PWD)

- [x] **PWD-01**: Opening `/tools/password` immediately shows a fresh random 20-character password using all four character sets, generated client-side only (never present in the static HTML; different on every load)
- [x] **PWD-02**: User can set length 4–128 via slider and number input
- [x] **PWD-03**: User can toggle uppercase, lowercase, digits, and symbols; the last enabled set cannot be turned off
- [x] **PWD-04**: Every generated password contains at least one character from each enabled set, without biasing the distribution (whole-password rejection resampling)
- [x] **PWD-05**: User can edit the symbol set (deduplicated, printable ASCII only; emptying it restores the default `!@#$%^&*()-_=+[]{};:,.?`)
- [x] **PWD-06**: User can enable "avoid look-alikes", which removes `0 O o 1 l I |` from the pool
- [x] **PWD-07**: All randomness comes from `crypto.getRandomValues` with unbiased rejection sampling; if Web Crypto is unavailable the tool shows an error instead of falling back to a weaker source
- [x] **PWD-08**: Digits and symbols in the output are color-coded distinctly from letters; copied text is plain

### Passphrase mode (PHR)

- [ ] **PHR-01**: User can switch Password / Passphrase via a toggle; Passphrase defaults to 6 words from the EFF Large Wordlist joined by `-`
- [ ] **PHR-02**: User can set word count 3–20, separator (`-` `_` `.` space), capitalize words, and append a random number
- [ ] **PHR-03**: The wordlist is loaded lazily (not in initial page JS) on first Passphrase use; a load failure shows an error with Retry and never falls back to another list
- [ ] **PHR-04**: The EFF list (unmodified, 7,776 words) is attributed (CC BY) in the About area, and the FAQ mentions its 4 hyphenated words

### Strength (STR)

- [ ] **STR-01**: User sees a strength meter with entropy bits and a label (Weak <40 / Fair 40–74 / Strong 75–99 / Very strong ≥100), computed from settings so it is stable across Regenerate
- [ ] **STR-02**: User sees a pool-size · bits line (e.g. "85 chars · 128 bits"; for passphrases, wordlist size × words)
- [ ] **STR-03**: User sees an estimated time to crack with its guess-rate assumption stated visibly
- [ ] **STR-04**: User can switch the crack-time estimate between a fast-hash (10^10 guesses/s) and a slow-hash (bcrypt-style) scenario

### Output, state & keyboard (POUT)

- [x] **POUT-01**: User can click Regenerate, and copy each result with one click and visible confirmation
- [x] **POUT-02**: User can generate a batch of 1–20 results and Copy all (one per line)
- [x] **POUT-03**: Options — never the generated output — persist in the URL so a bookmark restores them; the URL parser clamps/whitelists hostile values; password option params are never sent to analytics
- [x] **POUT-04**: Keyboard: `/` focuses length, Enter regenerates, Esc resets to defaults, Ctrl/Cmd+C copies the result when there is a single result (disabled for batches)
- [x] **POUT-05**: The generated password never appears in a form field, `title`, `aria-*` attribute, or live-region announcement, and its element is marked `translate="no"` with spellcheck off

### Registration & SEO (PREG)

- [ ] **PREG-01**: The Password tool appears in nav, landing page, and sitemap with a `KeyRound` icon; all seven nav links fit at 640px width
- [x] **PREG-02**: `/tools/password` has unique metadata, a worked example, and an FAQ in the shared About component; FAQ numbers derive from `lib/password` constants and privacy wording is human-approved
- [ ] **PREG-03**: `/tools/password` and `/tools/subnet` score Lighthouse 90+ and the password page has no layout shift on load (pinned skeleton)

## Future Requirements

- Exact inclusion-exclusion entropy for the one-of-each-set rule (only if the approximation is challenged)
- Related-tool links on every tool page
- Per-tool accessibility re-audit
- Build-time OUI dataset replacing `/api/mac-vendor`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Minimum count per character set | Complexity without meaningful security gain; anti-feature per research |
| No-duplicate / no-sequential options | Reduces entropy; anti-feature |
| Auto-copy on generate | Surprising clipboard writes |
| "Check my password" input / zxcvbn | Different tool; heavy dependency; invites users to type real passwords |
| HIBP breach check | Third-party request; not needed for freshly generated passwords |
| History, export/download, localStorage of outputs | Privacy — generated secrets must not persist |
| Password in the URL | Leaks via history/analytics/shared links |
| Additional wordlists / PIN mode / username generator | Scope; may revisit later |
| Show/hide masking | Output is meant to be seen and copied |
| Clipboard auto-clear | Browsers can't reliably clear clipboard history; would be a false promise |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFO-01 | Phase 10 | Complete |
| INFO-02 | Phase 10 | Complete |
| INFO-03 | Phase 10 | Complete |
| INFO-04 | Phase 10 | Complete |
| INFO-05 | Phase 10 | Complete |
| CFG-01 | Phase 10 | Complete |
| CFG-02 | Phase 10 | Complete |
| CFG-03 | Phase 10 | Complete |
| SUBNET-08 | Phase 11 | Complete |
| SUBNET-09 | Phase 11 | Complete |
| SUBNET-10 | Phase 11 | Complete |
| PWD-01 | Phase 13 | Complete |
| PWD-02 | Phase 13 | Complete |
| PWD-03 | Phase 13 | Complete |
| PWD-04 | Phase 12 | Complete |
| PWD-05 | Phase 13 | Complete |
| PWD-06 | Phase 13 | Complete |
| PWD-07 | Phase 13 | Complete |
| PWD-08 | Phase 13 | Complete |
| PHR-01 | Phase 14 | Pending |
| PHR-02 | Phase 14 | Pending |
| PHR-03 | Phase 14 | Pending |
| PHR-04 | Phase 14 | Pending |
| STR-01 | Phase 14 | Pending |
| STR-02 | Phase 14 | Pending |
| STR-03 | Phase 14 | Pending |
| STR-04 | Phase 14 | Pending |
| POUT-01 | Phase 13 | Complete |
| POUT-02 | Phase 13 | Complete |
| POUT-03 | Phase 13 | Complete |
| POUT-04 | Phase 13 | Complete |
| POUT-05 | Phase 13 | Complete |
| PREG-01 | Phase 14 | Pending |
| PREG-02 | Phase 14 | Complete |
| PREG-03 | Phase 14 | Pending |

**Coverage:**
- v1.3 requirements: 35 total
- Mapped to phases: 35 ✓
- Unmapped: 0
- Phase 12 owns PWD-04 only; its success criteria also cover the library guarantees behind PWD-07/POUT-03 (shown to users in Phase 13) and PHR-01..03/STR-01..04 (shown to users in Phase 14)

---
*Requirements defined: 2026-11-11*
*Last updated: 2026-11-11 after Phase 10 planning (CFG-03 icon surface aligned with decision D-16)*
