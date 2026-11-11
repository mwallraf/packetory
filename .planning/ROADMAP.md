# Roadmap: Packetory

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-07-25)
- ✅ **v1.1 Production Domain & Landing Page Polish** — Phases 6-7 (shipped 2026-07-25)
- ✅ **v1.2 Hash Generator** — Phases 8-9 (shipped 2026-10-17)
- 🚧 **v1.3 Password Generator & Tool Page Polish** — Phases 10-14 (in progress)

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

<details>
<summary>✅ v1.2 Hash Generator (Phases 8-9) — SHIPPED 2026-10-17</summary>

- [x] Phase 8: Hash Core & Worker Runtime (5/5 plans) — completed 2026-10-15
- [x] Phase 9: Hash Tool Page & Text Hashing (9/9 plans) — completed 2026-10-17

Phase 10 (File Hashing & Release Hardening) was removed 2026-10-17 by user decision; text-only is the intended scope. Full phase details archived at `.planning/milestones/v1.2-ROADMAP.md`.

</details>

### 🚧 v1.3 Password Generator & Tool Page Polish (Phases 10-14)

**Milestone Goal:** Add a clean, complete, fully local password/passphrase generator at `/tools/password`, and make every tool page tool-first: the Worked Example and FAQ move below the tool into a muted, closed-by-default "About this tool" area that stays in the HTML for SEO and JSON-LD.

**Numbering:** v1.3 starts at Phase 10. v1.2's Phase 10 was removed before it was built, so the number is free.

**Locked decisions (do not reopen):** phase order About + Config → Subnet → password core → password UI (user decision); EFF Large Wordlist kept unmodified (7,776 words), with an FAQ note on its 4 hyphenated words; Config icon = `FileTerminal`; Subnet no-scroll gate = 1366×650 primary + 1280×600 stress; bounds: length 4–128 (default 20), words 3–20 (default 6), batch 1–20, one shared constant each for UI and URL parser; strength is entropy-based from settings (no zxcvbn); generated output never goes into the URL, analytics, `#fragment` or storage; no new runtime or dev dependencies; disclosures use native `<details>/<summary>` in a server component (no Radix Collapsible/Accordion).

**Release gate:** CI runs typecheck/lint/test/build only. The Playwright job was removed 2026-10-17. A phase that touches pages is only complete after `npm run test:e2e` **and** `npm run test:e2e:prod` both pass locally.

- [x] **Phase 10: Shared About Section & Config Parity** - Every tool page shows the tool first, with a closed, muted "About this tool" area below it built from one shared component and one JSON-LD builder; Config gets its worked example, FAQ and own icon; Enter on a `<summary>` no longer fires tool shortcuts (completed 2026-11-11)
- [ ] **Phase 11: Subnet Calculator Compaction** - The full default Subnet result fits a 1366×650 laptop viewport without scrolling, with no fields, copy controls or mobile layout lost
- [ ] **Phase 12: Password Core Library** - Framework-agnostic, fully tested `lib/password` (unbiased CSPRNG sampling, charsets, generator, passphrase + lazy EFF wordlist, entropy/crack time, URL options codec), no UI
- [ ] **Phase 13: Password Generator Page** - `/tools/password` shows a fresh random password on load, with every password option, copy, batch, Regenerate, keyboard shortcuts and options-only bookmarkable URL
- [ ] **Phase 14: Passphrase, Strength & Launch** - Passphrase mode, strength meter and crack-time estimate, registry/nav entry, SEO/About/FAQ and Lighthouse 90+

## Phase Details

### Phase 10: Shared About Section & Config Parity
**Goal**: On any of the six tool pages, a visitor gets the tool first. The Worked Example and FAQ are still there, but closed and visually secondary, in one shared "About this tool" area below the tool. The Config highlighter gets the same worked-example/FAQ/JSON-LD parity as the other tools, plus an icon of its own.
**Depends on**: Nothing (first v1.3 phase; builds on the shipped v1.2 codebase)
**Requirements**: INFO-01, INFO-02, INFO-03, INFO-04, INFO-05, CFG-01, CFG-02, CFG-03
**Success Criteria** (what must be TRUE):
  1. On all six tool pages (UUID, Subnet, DNS, MAC, Hash, Config), the tool renders first. Below it, a visually muted "About this tool" area holds the Worked Example and the FAQ, each a native `<details>` that is closed on load and opens/closes by mouse click and by Enter/Space on its focused `<summary>`. All six pages render this area through one shared component, and no page keeps its own JSON-LD builder.
  2. The raw server-rendered HTML of every tool page, before any JS runs, contains the full collapsed Worked Example and FAQ text and exactly one FAQPage JSON-LD `<script>`. Its questions and answers match the visible FAQ item for item.
  3. With keyboard focus on a `<summary>`, pressing Enter toggles only that section and fires no global Enter action on any tool page (UUID does not regenerate, DNS does not re-run its lookup). A `useKeyboardShortcut` unit test and an e2e check prove this.
  4. `/tools/config` shows a worked example and a 4–6 item FAQ with matching FAQPage JSON-LD. The worked example is a highlighted Cisco IOS snippet that uses only RFC 5737 documentation addresses and no realistic secrets. Config shows its own `FileTerminal` icon on its landing card (nav links and tool-page headings stay text-only for every tool, per Phase 10 decision D-16), and a unit test fails if any registered tool icon lacks an explicit `ICONS` entry (no silent fallback to another tool's icon).
  5. The existing SEO e2e specs open the disclosures before asserting visibility, and a Config SEO spec exists. Typecheck, lint, unit tests, the build, `npm run test:e2e` and `npm run test:e2e:prod` all pass locally.
**Plans**: 6/6 plans complete

Plans:
**Wave 1**
- [x] 10-01-PLAN.md — Tracer: shared ToolAbout + one JSON-LD builder wired end-to-end on /tools/uuid (openAbout e2e helper, unit contracts)
- [x] 10-02-PLAN.md — Enter-on-summary guard (INFO-04), explicit tool icons + Config FileTerminal (CFG-03), CFG-03/SC-4 wording amendment (D-16)
- [x] 10-03-PLAN.md — Config content: shared token-class module, RFC 5737 sample + 4-item FAQ data (D-15/D-17 copy), server-rendered ConfigExample

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 10-04-PLAN.md — Migrate Config, Subnet, DNS, MAC and Hash pages to ToolAbout; SEO specs via openAbout; new config-seo spec

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 10-05-PLAN.md — Registry-driven structural guard and cross-tool about.spec e2e (tool-first structure, native toggles, Tab order, JS-off JSON-LD parity)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 10-06-PLAN.md — about.spec e2e for Enter-on-summary (UUID, DNS) and the 320px light/dark layout, a production-build JS-off About parity spec (tests/e2e-prod), then the sequential release gate (CLS reported, not gated, per D-18)
**UI hint**: yes

**Research flags**: Check whether the Config highlighter can render its worked example at build time in a server component. If it can't, ship a static pre-highlighted sample. The `uuid-seo`, `subnet-seo`, `dns-seo` and `hash-seo` specs call `toBeVisible()` on content that will now be collapsed, so add a shared `openAbout` helper rather than patching each one. Keep the `<` escape in the shared JSON-LD builder. Find-in-page into closed `<details>` differs between browsers, so don't promise it.

### Phase 11: Subnet Calculator Compaction
**Goal**: An engineer on a typical 1366×768 laptop sees the whole Subnet Calculator result at a glance, without scrolling, and every field, copy control and the mobile layout still work.
**Depends on**: Phase 10 (both phases edit `app/tools/subnet/page.tsx`; compaction is measured against the final About layout)
**Requirements**: SUBNET-08, SUBNET-09, SUBNET-10
**Success Criteria** (what must be TRUE):
  1. Loading `/tools/subnet` with its default IPv4 /24 at 1366×650, and at the 1280×600 stress size, shows the full generated output with its bottom edge inside the viewport and the page unscrolled (`scrollY === 0`). A new subnet layout e2e spec enforces this.
  2. The plan states a no-scroll target for an IPv6 /64 result before implementation starts, and the layout spec measures and enforces it at 1366×650.
  3. Every IPv4 and IPv6 field shown before compaction is still shown, untruncated. Body text stays at 14px or larger, every per-field copy control still copies with visible confirmation, and all existing subnet testids and subnet e2e specs pass unchanged. `lib/subnet` is not modified.
  4. At 320px and 375px widths the page has no horizontal overflow (`scrollWidth <= innerWidth`) and the About area still renders below the tool. `npm run test:e2e` and `npm run test:e2e:prod` pass locally.
**Plans**: 1/1 plans executed

Plans:
- [x] 11-01-PLAN.md — Tracer: measure the 1366x650 budget, compact the Subnet island (lg-wide main, CIDR beside hero, one-row field cards, 3-column grid) under a new subnet-layout e2e; IPv6 /64 target, field/copy/font/order integrity, 320/375 overflow; skeleton re-pin and the release gate
**UI hint**: yes

**Research flags**: Before cutting anything, measure where the vertical pixels go at 1366×650 (header, hero, CIDR row, field grid). If the page pins a skeleton, re-measure its height. Capture a Lighthouse baseline for `/tools/subnet` on a Vercel preview now; the 90+ gate itself is PREG-03, enforced in Phase 14.

### Phase 12: Password Core Library
**Goal**: The password tool's correctness and privacy guarantees exist, and are proven, in a framework-agnostic `lib/password` before any UI is built. That means unbiased CSPRNG passwords and passphrases, entropy and crack-time figures derived from settings, and a URL options codec that is safe against hostile input. The UI phases then only wire and render.
**Depends on**: Phase 11 (execution order only; no code dependency on Phases 10–11)
**Requirements**: PWD-04
**Foundation for**: library guarantees behind PWD-07 and POUT-03 (delivered to users in Phase 13) and behind PHR-01, PHR-02, PHR-03, STR-01, STR-02, STR-03, STR-04 (delivered to users in Phase 14)
**Success Criteria** (what must be TRUE):
  1. Across the full option space (length 4–128, any non-empty set combination, custom symbol sets, look-alike filtering), fast-check properties prove that every generated password has the requested length, contains at least one character from each enabled set, and uses only characters from the resolved pool. The one-of-each rule is met by resampling the whole password with a bounded retry count, never by patching positions, so the distribution stays unbiased.
  2. All randomness goes through one audited `randomInt` built on `crypto.getRandomValues` with rejection sampling. Stubbed-RNG boundary tests prove there is no modulo bias, a guard test fails if `Math.random` appears anywhere in `lib/password`, and no single call requests more than 65,536 bytes. With Web Crypto absent, it throws a typed error instead of falling back to a weaker source.
  3. Symbol-set normalization dedupes, keeps printable ASCII only, and restores the default `!@#$%^&*()-_=+[]{};:,.?` when the set is emptied. Look-alike filtering removes `0 O o 1 l I |` before the pool size is computed. Passphrase generation (3–20 words; `-` `_` `.` or space separator; capitalize; append number) draws from the vendored, unmodified 7,776-word EFF Large list. An integrity test pins the list's count and content hash, the file carries a CC BY attribution header and has a committed generation script, and the list is reachable only through a memoized dynamic `import()`.
  4. Entropy comes only from options and the resolved alphabet, never from the output string. The default 20-character all-sets password reports its real pool size and about 128 bits. A 6-word passphrase reports 6 × log2(7776), about 77.5 bits, plus log2(10) when a number is appended. Strength labels switch exactly at 40, 75 and 100 bits. Crack time is computed in log space for both the fast-hash (10^10 guesses/s) and slow-hash scenarios and does not overflow at 128 characters.
  5. The URL options codec round-trips every valid option set. It clamps or drops hostile and malformed params (out-of-range numbers, unknown keys, oversized or non-ASCII symbol sets) to safe defaults and has no field that can carry generated output. A redaction regression test proves password option params never reach analytics events, with nothing added to the analytics allow-list.
**Plans**: 5/5 plans executed

Plans:
**Wave 1**
- [x] 12-01-PLAN.md — Tracer: contracts, randomInt, resolveAlphabet and whole-password resampling (PWD-04); alphabet rules, option normalizers, deterministic test fills, full-option-space property

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 12-02-PLAN.md — generateBatch through the byte-capped seam; randomInt rejection-boundary, 65,536-byte cap, fail-closed Web Crypto and import-time proofs (SC-2)
- [x] 12-03-PLAN.md — Exact BigInt entropy, passphrase entropy, analytic retry bound, 40/75/100 labels, log-space crack time and formatting (SC-4)
- [x] 12-04-PLAN.md — Generation script, vendored unmodified EFF Large list with CC BY header and SHA-256 pins, retry-safe lazy loader, generatePassphrase (SC-3)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 12-05-PLAN.md — URL options codec (hostile-input safe, round-trip), analytics redaction regression, public barrel, source guards with teeth, phase gate (SC-5, SC-2 guard)

**Research flags**: Check the EFF wordlist license version (CC BY 3.0 US or 4.0) on eff.org and attribute accordingly. Measure the wordlist chunk's gzip size in a production build (about 24.5 KB expected). Expose an injectable `fill` RNG seam so the Phase 13–14 UI tests can be deterministic. Settle the strength-label boundary maths and constants here so the FAQ in Phase 14 can import them instead of restating numbers.

### Phase 13: Password Generator Page
**Goal**: A visitor opening `/tools/password` immediately gets a strong random password. They can tune it, copy it, generate a batch, bookmark the options and drive everything from the keyboard. The password itself never leaks into the HTML, the URL, analytics, autofill or accessibility surfaces.
**Depends on**: Phase 12 (`lib/password`); also relies on the `<summary>`-safe Enter guard from Phase 10
**Requirements**: PWD-01, PWD-02, PWD-03, PWD-05, PWD-06, PWD-07, PWD-08, POUT-01, POUT-02, POUT-03, POUT-04, POUT-05
**Success Criteria** (what must be TRUE):
  1. Opening `/tools/password` shows a fresh 20-character password that uses all four character sets as soon as the client island mounts. The raw server HTML contains no password, and two consecutive loads show different passwords. With `crypto.getRandomValues` removed, the page shows an error and no password, with no weaker fallback.
  2. The user can change each option below, and every change produces new output that obeys the options. Digits and symbols are color-coded distinctly from letters, and copied text stays plain.
     - set length 4–128 with a slider or a number input, kept in sync
     - toggle uppercase, lowercase, digits and symbols, where the last enabled set cannot be switched off
     - edit the symbol set (deduped, printable ASCII; emptying it restores the default)
     - enable "avoid look-alikes"
  3. The user can click Regenerate, copy any result with one click and visible confirmation, and generate a batch of 1–20 with per-item copy and Copy all (one result per line). Keyboard shortcuts:
     - `/` focuses length
     - Enter regenerates, but not while focus is on a button, toggle or `<summary>`
     - Esc resets every option to its default
     - Ctrl/Cmd+C copies a single result and is disabled for batches
  4. Changing options updates the address bar, so a bookmark restores them, and the URL never contains generated output. A hand-crafted hostile URL (out-of-range length, unknown keys, junk symbols) loads with clamped/whitelisted options and no error. Password option params never appear in analytics events.
  5. The password renders in a non-form element marked `translate="no"` with spellcheck off. It never appears in a form field value, a `title` or `aria-*` attribute, or a live-region announcement; the copy confirmation announces only that something was copied. Functional e2e coverage for all of the above passes via `npm run test:e2e` and `npm run test:e2e:prod` locally.
**Plans**: 6/6 plans executed

Plans:
**Wave 1**
- [x] 13-01-PLAN.md — Tracer: static shell + noindex, ssr:false loader + skeleton, fail-closed island with hero Copy/Regenerate, color-coded output, prod raw-HTML leak spec, RTL + dev e2e smoke (PWD-01, PWD-07, PWD-08, POUT-01, POUT-05)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 13-02-PLAN.md — Options panel (length slider + number, set switches with last-set lock, symbol-set editor, look-alikes) through one commit() path, plus options-only URL state with canonical hostile-link rewrite (PWD-02, PWD-03, PWD-05, PWD-06, POUT-03)
- [x] 13-03-PLAN.md — Source guards: WALK_DIRS extended to the page, plus page bans (storage, router/fragment, analytics/console/network, form/title surfaces, generation location, barrel-only imports) with in-memory teeth (PWD-01, PWD-07, POUT-03, POUT-05)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 13-04-PLAN.md — Batch 1-20 with per-row copy and Copy all, batch-count input, one polite live region with fixed phrases only, RTL attribute scan (POUT-01, POUT-02, POUT-05)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 13-05-PLAN.md — Keyboard: / focus, Enter regenerate (no double fire, e2e call-count proof), Esc reset without focus loss, Ctrl/Cmd+C single-only with selection guard (POUT-04)

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 13-06-PLAN.md — End-to-end privacy sweep, 320px light/dark overflow, measured skeleton pin, full local release gate (test:e2e + test:e2e:prod), manual UAT items queued (PWD-01, POUT-03, POUT-05)
**UI hint**: yes

**Research flags**: Generate passwords in event handlers and store them in state, never in render or `useMemo`. Write URL state with `history.replaceState(null, ...)` using options only, never `router.replace` and never a `#fragment`. Manually check with a browser password manager (no save-password prompt or autofill) and with page translation turned on. The registry/nav entry is deliberately left to Phase 14 so the tool is only advertised once it is complete. The route is reachable directly for e2e in the meantime. Measure skeleton heights now, but do the final no-CLS pin in Phase 14, once the strength meter and passphrase controls exist.

### Phase 14: Passphrase, Strength & Launch
**Goal**: The Password Generator is complete and launched. Users can switch to memorable EFF passphrases, see how strong each result is and roughly how long it would take to crack, and find the tool from the nav, the landing page, the sitemap and search.
**Depends on**: Phase 13
**Requirements**: PHR-01, PHR-02, PHR-03, PHR-04, STR-01, STR-02, STR-03, STR-04, PREG-01, PREG-02, PREG-03
**Success Criteria** (what must be TRUE):
  1. The user can switch between Password and Passphrase with a toggle and immediately sees 6 EFF Large words joined by `-`. Word count 3–20, separator (`-` `_` `.` space), capitalize and append-number all take effect. The mode and passphrase options restore from a bookmarked URL, and Regenerate, batch, copy, Copy all and the keyboard shortcuts behave the same as in Password mode.
  2. In a production build, the wordlist is absent from initial page JS and loads only on first Passphrase use, proven by a `npm run test:e2e:prod` spec. When the load fails, the user sees an error with a working Retry and gets no passphrase from any other list or source.
  3. In both modes the user sees:
     - a strength meter with entropy bits and a label (Weak <40 / Fair 40–74 / Strong 75–99 / Very strong ≥100) that does not change on Regenerate
     - a pool-size · bits line (wordlist size × words for passphrases)
     - an estimated time to crack, with its guess-rate assumption stated, switchable between a fast-hash (10^10 guesses/s) and a slow-hash (bcrypt-style) scenario
  4. The Password tool appears in the nav, the landing grid and the sitemap with a `KeyRound` icon, and all seven nav links fit at 640px. `/tools/password` has unique metadata and the shared About area with a worked example, the EFF CC BY attribution, and an FAQ whose numbers come from `lib/password` constants. The FAQ includes a note on the list's 4 hyphenated words and privacy wording the user has explicitly approved.
  5. Lighthouse scores 90+ in every category on both `/tools/password` and `/tools/subnet`, and the password page shows no layout shift on load (pinned skeleton). Every hard-coded tool count is updated from 6 to 7, and `npm run test:e2e` and `npm run test:e2e:prod` pass locally.
**Plans**: 4/8 plans executed

Plans:
**Wave 1**
- [x] 14-01-PLAN.md — Tracer: Mode toggle -> lazy EFF word list (one allowed deep import) -> 6-word passphrase and ?mode=passphrase; relaxed and re-armed guards; prod chunk proof (a)/(b) (PHR-01, PHR-03)
- [x] 14-02-PLAN.md — Final metadata (noindex removed), intro, ToolAbout with constants-only worked example, EFF attribution and 6-item FAQ; SEO and prod SSR specs; privacy wording queued for UAT (PREG-02, PHR-04)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 14-03-PLAN.md — Bookmark restore via one mount load, sequence-token race matrix, error panel with Retry (reload on ChunkLoadError), prod abort-then-Retry proof (PHR-01, PHR-03)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 14-04-PLAN.md — Strength panel: meter + label, pool line, crack time with stated assumption, Fast/Slow scenario; stable across Regenerate (STR-01..04)

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 14-05-PLAN.md — Passphrase options (word count, separator, capitalize, append number, EFF credit), shared range rows (Fix 4/5), keyboard parity with Esc keeping the mode (PHR-02, PHR-01, PHR-04)

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 14-06-PLAN.md — Mode-aware output names and announcements, repeat-copy re-announce, word-boundary wrapping; passphrase privacy sweep and 320px proofs (PHR-01; D-20)

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 14-07-PLAN.md — Register the tool (KeyRound, Password sorts last), px-2 nav padding, every tool count 6 -> 7, seven links fit at 640/700px (PREG-01)

**Wave 7** *(blocked on Wave 6 completion)*
- [ ] 14-08-PLAN.md — Final skeleton and loading-block pin, CLS gates (default, bookmark, toggle), sequential release gate, first-load JS and local Lighthouse advisory, human-check queue (PREG-03)
**UI hint**: yes

**Research flags**: Measure the final skeleton heights in both modes, at 320px and at desktop width. Confirm seven-link nav fit at 640px and 700px, falling back to `shortName` if needed. Hard-coded counts of 6 live in `tools/registry.test.ts`, `home.spec.ts`, `navigation.spec.ts` and the sitemap test. Do a manual password-manager and VoiceOver pass. Run Lighthouse on a Vercel preview deploy. The privacy/clipboard FAQ text needs explicit human approval: legal and privacy text is a human gate under PROJECT.md's automation model, and clipboard-history wording must be honest. Use a memoized loader with a sequence token so a slow wordlist load can't apply its result after the user has changed mode or options.

## Progress

**Execution Order:**
Phases execute in numeric order: 10 → 11 → 12 → 13 → 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Shared Shell + Registry | v1.0 | 5/5 | Complete | 2026-07-23 |
| 2. UUID Generator | v1.0 | 4/4 | Complete | 2026-07-24 |
| 3. IP Subnet Calculator | v1.0 | 5/5 | Complete | 2026-07-24 |
| 4. DNS Lookup | v1.0 | 4/4 | Complete | 2026-07-25 |
| 5. MAC Address Inspector | v1.0 | 3/3 | Complete | 2026-07-25 |
| 6. Landing Page Card Navigation | v1.1 | 2/2 | Complete | 2026-07-25 |
| 7. Production Domain Cutover | v1.1 | 1/1 | Complete | 2026-07-25 |
| 8. Hash Core & Worker Runtime | v1.2 | 5/5 | Complete | 2026-10-15 |
| 9. Hash Tool Page & Text Hashing | v1.2 | 9/9 | Complete | 2026-10-17 |
| 10. Shared About Section & Config Parity | v1.3 | 6/6 | Complete    | 2026-11-11 |
| 11. Subnet Calculator Compaction | v1.3 | 1/1 | In Progress | - |
| 12. Password Core Library | v1.3 | 5/5 | In Progress | - |
| 13. Password Generator Page | v1.3 | 6/6 | In Progress | - |
| 14. Passphrase, Strength & Launch | v1.3 | 4/8 | In Progress | - |
