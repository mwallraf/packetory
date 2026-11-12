# Feature Research

**Domain:** Online password / passphrase generator (fully local), plus tool-page "About" collapsibles, Config-tool SEO parity, and Subnet layout compaction — milestone v1.3
**Researched:** 2026-11-11
**Confidence:** MEDIUM-HIGH. Bitwarden (SDK + clients source), KeePassXC (source) and the EFF wordlist (downloaded and measured) are HIGH. LastPass is MEDIUM (page fetched, but length range/default not stated). 1Password and passwordsgenerator.net are LOW-MEDIUM: official pages were unreachable, so findings come from forum posts and recollection. Google FAQ/hidden-content stance is HIGH for the rich-result removal and MEDIUM (secondary reporting) for collapsed-content weighting.

Scope note: this file covers ONLY what v1.3 adds. The shell, registry, `useCopyToClipboard`, `useKeyboardShortcut`, the Server-shell + `next/dynamic(ssr:false)` client-island pattern, History-API URL state, the safe-by-default analytics allow-list, and the per-tool SEO/FAQ pattern are reused, not re-researched. The v1.2 hash research is in git history.

---

## Part 1 — Password Generator (`/tools/password`)

### How the domain works (survey summary)

| Product | Model | Verified behavior |
|---------|-------|-------------------|
| **Bitwarden** (web/ext/SDK) | Password and Passphrase as two modes. | Password defaults (clients repo): length 14, upper+lower+digits on, special OFF, min 1 per enabled set (min number 1, min special 0). Newer SDK default: length 16, special off, "avoid ambiguous" off. Boundaries: length 5–128, min digits/special 0–9, SDK rejects length < 4. **"Avoid ambiguous" removes exactly `I O l 0 1`.** Special set is only `!@#$%^&*` (8 chars; users complain). Each enabled set is guaranteed at least `max(min,1)` chars by sampling that many from the set, then filling the rest from the union and shuffling (Rust `SliceRandom::shuffle`). **No sets enabled returns an error** (`NoCharacterSetEnabled`). Passphrase defaults: **6 words, `-` separator, capitalize OFF, include number OFF**; "include number" adds a single digit. (HIGH) |
| **KeePassXC** | Basic/Advanced toggle for passwords, separate Passphrase tab; live entropy display and quality label. | Advanced has an "Exclude look-alike characters" checkbox and a "Pick characters from every group" checkbox. **Look-alike set: lower `l`; upper `B G I O`; digits `0 1 6 8`; pipe `\|`** (plus one EASCII char). Pick-from-every-group: one char per non-empty group, fill remainder from the union, then Fisher-Yates shuffle; minimum length = number of groups. Invalid settings (no group and no custom set, length ≤ 0, exclusions empty a group) make the generator "invalid", with no fallback. **Passphrase defaults: 7 words, space separator, EFF large wordlist**; entropy = `words * log2(listSize)`. **Quality bands (bits): Poor < 40, Weak 40–74, Good 75–99, Excellent ≥ 100.** (HIGH) |
| **LastPass** web generator | One panel: length, Uppercase/Lowercase/Numbers/Symbols toggles, Generate, Copy with "Copied" confirmation. | Strength label Weak/Average/Strong from **zxcvbn**; says "at least 15 characters". Length range/default not stated on the page. (MEDIUM) |
| **1Password** web/ext | Types: Random, Memorable (words), Smart, PIN. | Reported default ~19–20 chars with digits and symbols. Memorable separators: hyphens, spaces, periods, commas, underscores, numbers, numbers+symbols; Capitalize toggle. Community moderators say suggestions optimize entropy, not length. (LOW-MEDIUM, forum sources) |
| **passwordsgenerator.net** | Long single-page form. | Site unreachable during research; from prior knowledge it has include symbols/numbers/lower/upper, "exclude similar characters", "exclude ambiguous characters", "generate on your device", "no duplicate characters", auto-copy, print. (LOW — treat as design inspiration for the anti-feature list only) |

**Pattern across all of them:** the settings panel is the product. Output is one monospace string plus a copy button and a regenerate button. The sophisticated ones always guarantee that every enabled set appears, expose length as slider+number, and show strength as a derived number. The cluttered ones (passwordsgenerator.net family) accumulate checkbox options (no duplicates, no sequential, auto-copy, print) that either reduce entropy or surprise the user.

### Behavioral spec the roadmap should lock (derived from the survey)

| Question | What competitors do | Recommendation for Packetory |
|----------|--------------------|------------------------------|
| Guarantee at least one char from each enabled set? | Bitwarden: always (min 1). KeePassXC: opt-in checkbox. | **Always on, no toggle.** Sites reject passwords missing a class; cost is negligible (~0.17 bits at 20 chars / 4 sets, computed). Algorithm: pick 1 from each enabled set, fill the rest from the de-duplicated union, Fisher-Yates shuffle, all with rejection-sampled `crypto.getRandomValues` (no `% n` bias). |
| Per-set minimum counts (min digits/symbols)? | Bitwarden 0–9, 1Password counts. | **Defer** (see anti-features). The "≥1 per set" rule covers 95% of site policies. |
| Length bounds | Bitwarden 5–128 (SDK floor 4); KeePassXC wide. | **4–128**, hard-clamped; effective minimum = number of enabled sets. Default **20**. Slider + numeric input kept in sync; out-of-range typed values clamp on blur, never show an error. Short lengths are allowed but the meter shows them as Weak (honesty beats paternalism). |
| All sets disabled | Bitwarden/KeePassXC: error/invalid/disabled Generate. | **Make the state unreachable.** The last enabled set's toggle is disabled with an explanatory `title`/helper text ("At least one character set is required"). Same rule for an emptied or fully-filtered custom symbol set: revert to the default symbol set on blur and note it. A URL with zero sets falls back to defaults. This preserves "always a result on screen". |
| Look-alike set | Bitwarden `I O l 0 1`; KeePassXC `l B G I O 0 1 6 8 \|`. | **Remove `0 O o 1 l I \|`** (7 chars). Bitwarden's set plus lowercase `o` (the Bitwarden docs text itself names "0 and o") and pipe. Do NOT adopt KeePassXC's `B G 6 8` (too aggressive; shrinks digits to 6). Apply the filter to the final pool (after union and custom symbols), then recompute pool size for entropy. Label it "Avoid look-alikes" with a tooltip listing the removed chars. Default OFF (maximizes entropy; matches Bitwarden). |
| Default symbol set | Bitwarden 8 chars `!@#$%^&*`. KeePassXC many groups. | **`!@#$%^&*()-_=+[]{};:,.?`** (23): excludes quotes, backslash, backtick, `/`, `<>`, `~`, `\|` that sites and shells commonly mishandle. Editable field (printable ASCII 0x21–0x7E only, whitespace stripped, duplicates removed, length-capped ~40). |
| Strength tiers | KeePassXC bits bands; LastPass/Bitwarden zxcvbn score. | See Strength meter below. |
| Passphrase defaults | Bitwarden 6 / `-` / off / off. KeePassXC 7 / space. | **6 words, `-` separator, Capitalize OFF, Append number OFF**, EFF long list (7776 words, 12.92 bits/word → 77.5 bits). Word count 3–20. Separator is a short free-text field (max ~3 chars, may be empty) with preset chips (`-` space `.` `_` `,`). |
| Batch | Not offered by most managers; common on web generators. | 1–20, default 1. Batch list rows each have a Copy; one "Copy all" (newline-joined). |

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Random 20-char password visible on load | Core value; every generator shows one immediately | LOW | Client-only generation → follow Server-shell + `ssr:false` island; reserve a fixed-height output block to avoid CLS (the same pinned-skeleton lesson as hash). Never SSR a random value (hydration mismatch). |
| Length control (slider + number input), 4–128 | Universal | LOW | Slider must be keyboard-operable (arrow keys) and labeled; `/` focuses the number input. |
| Upper / lower / digits / symbols toggles | Universal | LOW | Use existing `Switch`/`Toggle`; last-enabled guard (see spec). |
| At least one char from each enabled set | Sites reject otherwise; Bitwarden/KeePassXC both implement | LOW-MEDIUM | The only subtle part of the generator; unit + property tests (every output contains each enabled set; every char ∈ pool; length exact). |
| Unbiased CSPRNG sampling | Trust; "Math.random()" generators are the classic red flag | LOW-MEDIUM | `crypto.getRandomValues` + rejection sampling (`Uint32Array`, reject ≥ largest multiple of n) and Fisher-Yates with the same unbiased `randInt`. Chi-square/bounds sanity test with a stubbed RNG. |
| Avoid look-alikes option | Bitwarden/KeePassXC/passwordsgenerator.net all have it | LOW | Definition above. Must also filter custom symbols. |
| Editable symbol set | Sites restrict allowed symbols; brief requires it | LOW-MEDIUM | Normalize on blur/change: strip whitespace, drop non-printable-ASCII, dedupe (entropy would be overcounted otherwise), cap length. Empty → revert to default. |
| Passphrase mode: word count, separator, capitalize, append number | Bitwarden/KeePassXC/1Password all have these | MEDIUM | EFF long list (62 KB raw words / ~24.5 KB gzip, measured). Lazy-load via dynamic `import()` only on Passphrase selection (or idle prefetch); show reserved-height placeholder if URL opens in passphrase mode. |
| Regenerate button + Enter shortcut | Universal | LOW | Reuse `useKeyboardShortcut` `enter` (existing native-button focus guard applies). |
| One-click copy with visible confirmation | Project non-negotiable | LOW | Reuse `useCopyToClipboard`; per-row copy in batch plus Copy all; `aria-live` confirmation like UUID/Subnet. |
| Strength meter (bits + label) | KeePassXC/LastPass/Bitwarden all show strength | LOW-MEDIUM | Entropy-based from settings (see below). Text label + bits, not color alone. |
| Crack-time estimate | Brief requirement; cheap trust signal | LOW | Single stated assumption (see below). |
| Batch 1–20 | Brief requirement | LOW | Reuse UUID batch patterns (count input, list, copy-all). Copy-all newline-joined. |
| Options-only bookmarkable URL state | Existing convention; brief requirement | LOW-MEDIUM | `replaceState` via History API (Key Decision). Params: mode, len, sets (u/l/d/s), symbols (custom), amb, count, words, sep, cap, num. **Never write the password.** Strict parse+clamp on load; invalid values fall back to defaults silently. Params are not on the analytics allow-list, so they are excluded automatically (verify with a redact test). |
| Keyboard-first | Project non-negotiable | LOW | `/` focus length, `Enter` regenerate, `Esc` reset options to defaults, Ctrl/Cmd+C copies single result when focus is not in an editable field. In batch mode follow the UUID precedent: the shortcut copy is disabled where there is no visible confirmation, or copy the first item with a confirmation. |
| 320px / light-dark / no CLS | Existing non-negotiable | LOW-MEDIUM | 128-char passwords must `break-all`; use `text-rendering: geometricPrecision` (hash lesson) so Linux/macOS wrap identically and pinned heights hold. |
| Registry entry + SEO + worked example + FAQ/JSON-LD | Architecture intent | LOW | One `tools/registry.ts` entry (`category: "generate"`, new icon, e.g. `KeyRound`) — **and add the icon to `ICONS` in `components/ToolCard.tsx`**, which silently falls back to `Fingerprint` (UUID's icon) when missing. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Settings-driven strength meter (no zxcvbn)** | For machine-generated secrets entropy is exact: `L*log2(N)` (passwords) or `W*log2(7776) (+3.32 if number)`. zxcvbn is both heavy and meaningless on truly random strings. The meter is also stable across Regenerate (depends on settings, not the specific output), so no flicker or repeated screen-reader chatter | LOW | Count capitalize as 0 bits; count separator as 0 bits; count the appended digit as `log2(10)`; count pool size after dedupe and look-alike filtering. Optional exact count with the ≥1-per-set rule (inclusion-exclusion over ≤4 sets, 16 terms) — difference < 0.5 bit at defaults, so plain `L*log2(N)` is acceptable. |
| Honest crack-time line with its assumption stated | Competitors show a label with no basis. State: "~X at 10 billion guesses/second (offline, fast hash)" | LOW | Use zxcvbn's published offline-fast-hash scenario (10^10 guesses/s) as the single assumption; expected time = `2^(H-1)/rate`. Humanize (seconds → minutes → hours → days → years → thousands/millions/billions; cap at "more than 1 trillion years"). Put the rate in the visible text, not only a tooltip; one FAQ item explains it. Optional later: a slow-hash (10^4/s) toggle. |
| Show pool size / bit count inline ("85 characters · 128 bits") | Lets engineers sanity-check policy requirements | LOW | Same numbers feed the meter; trivial once computed. |
| Colorized character classes in the output (digits/symbols tinted) | Bitwarden and 1Password do it; helps reading and typing manually | LOW | Redundant cue only (glyphs already distinguish), keep contrast AA in both themes; copy must copy the raw string (render spans, copy from state, not DOM). |
| Passphrase: 4 hyphenated-word pitfall handled | EFF long list contains `drop-down`, `felt-tip`, `t-shirt`, `yo-yo` (verified in the downloaded list). With a `-` separator these look like extra words; entropy still correct | LOW | Either filter those 4 (lose log2(7776/7772) ≈ 0.0007 bits — negligible, but then say "7,772 words" honestly) or keep and note. Recommend filter, and compute entropy from the actual list length. |
| Wordlist attribution in About | EFF lists are CC BY 3.0 (US) per third-party sources (MEDIUM) | LOW | Credit "EFF Large Wordlist" in the About area; confirm license text on eff.org before shipping. |
| "Reset to defaults" (Esc / link) | Settings-heavy pages need an escape hatch | LOW | Mirrors Subnet/Hash `Esc` behavior. |
| Passphrase mode keeps Password settings (and vice versa) | Toggling back and forth does not lose configuration | LOW | One state object, mode just selects which panel/generator is used. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Min-count per set (min digits / min symbols) | Bitwarden and 1Password have it | Adds 2–4 numeric inputs to a page whose brief is "very clean"; rare policy need; entropy math gets harder | Always ≥1 per set; revisit only if users ask |
| "No duplicate characters" / "no sequential/consecutive" options | passwordsgenerator.net style; Bitwarden has max-consecutive | Each constraint reduces entropy and the meter would then be wrong unless recomputed; clutter | Omit; if desired later, compute exact entropy |
| Auto-copy on generate | "Saves a click" | Silently overwrites the clipboard on every Regenerate/page load; surprising, and a clipboard-privacy smell | Explicit one-click copy with confirmation |
| zxcvbn / "check my password" input | Natural adjacent feature | Heavy bundle; encourages typing real passwords into a web page (privacy risk); contradicts "options only" privacy stance | Entropy from settings only |
| Haveibeenpwned breach check | Popular trust feature | Third-party request (violates no-third-party-requests rule); relevant only for user-chosen passwords | None |
| Saving/history of generated passwords (localStorage) | Convenience | Persisting secrets in the browser; out-of-scope per project (no PII) | Nothing stored; recommend a password manager in FAQ |
| Password in the URL / shareable link of the password | "Share it" | Credentials in history, referrers, logs | URL carries options only (already decided) |
| Pronounceable / "easy to say" mode | LastPass historical option | Weaker, harder to model entropy honestly | Passphrase mode covers memorability |
| Wordlist chooser (short list / Diceware / languages) | Power users | Extra bundles (lazy-load cost), entropy bookkeeping; English-only v1 | Ship EFF long list only |
| Username/email-alias generator, QR code, print, email | Bitwarden/others bundle these | Scope creep; none serve "get a password and leave" | Out of scope |
| Show/hide (mask) toggle on output | Password-manager habit | A generator's job is to show the secret; masking adds a click | Always visible |
| Per-item "strength bar" in batch | Looks informative | Every item has identical entropy; repeated bars are noise | One meter for the settings |

### Feature Dependencies

```
Password mode
    └──requires──> randInt (rejection sampling) ──requires──> crypto.getRandomValues
    └──requires──> char-set builder (dedupe + look-alike filter + custom symbols)
                       └──feeds──> pool size ──feeds──> entropy ──feeds──> meter + crack-time

Passphrase mode
    └──requires──> lazy-loaded EFF wordlist (dynamic import) + reserved-height placeholder
    └──requires──> randInt ; entropy = W*log2(listSize) (+log2(10) if number)

Batch (1–20) ──requires──> single-generate function  ──enhances──> Copy all
URL state ──requires──> strict parser/clamper (shared with the UI clamps)  ──conflicts──> writing the output
Keyboard shortcuts ──requires──> existing useKeyboardShortcut (+ Enter focus guard)
Registry entry ──requires──> ICONS map entry in ToolCard.tsx
```

### Dependency Notes

- **Entropy depends on the exact final pool:** compute after union + dedupe + look-alike filter; otherwise duplicates in a custom symbol set or the look-alike filter silently overstate strength.
- **Last-set guard and the URL parser must share one `normalizeOptions()`** so a hand-edited URL, Esc-reset, and UI toggles can never reach an "all disabled" or out-of-range state.
- **Passphrase from URL:** opening `?mode=passphrase` must not flash an empty state — keep the output block height pinned and generate once the wordlist import resolves.
- **No dependence on new npm packages:** `crypto.getRandomValues`, plain TypeScript, and a bundled word array are sufficient (matches "no new heavy dependencies").

### MVP Definition

#### Launch With (v1.3)

- [ ] Password mode: length 4–128 (default 20), four toggles with last-set guard, ≥1-per-set guarantee, editable symbol set, avoid look-alikes — the core
- [ ] Passphrase mode: 3–20 words (default 6), separator, capitalize, append number, lazy EFF list — brief-required
- [ ] Batch 1–20 + per-item copy + Copy all + Regenerate
- [ ] Entropy meter (4 tiers, bits shown) + crack-time line with stated assumption
- [ ] Options-only URL state with strict normalization
- [ ] Keyboard shortcuts (`/`, Enter, Esc, Ctrl/Cmd+C)
- [ ] Registry/icon/SEO/worked example/FAQ/JSON-LD, 320px/light/dark/CLS-free

#### Add After Validation (v1.3.x)

- [ ] Colorized character classes in output — if the plain output feels hard to read
- [ ] Exact entropy with the ≥1-per-set rule (inclusion-exclusion) — only if reviewers object to the ~0.2-bit approximation
- [ ] Slow-hash crack-time toggle

#### Future Consideration (v2+)

- [ ] Min-count per set; additional wordlists; PIN mode — only on demand

### Strength tiers (recommended)

KeePassXC's bands are the only fully-documented bit thresholds in the survey (source-verified); adopt them with friendlier labels:

| Bits | Label | Reference points |
|------|-------|------------------|
| < 40 | Weak | 4–6 char passwords; 3 EFF words (38.8 bits) |
| 40–74 | Fair | 8-char all-sets (~52 bits); 5 EFF words (64.6 bits) |
| 75–99 | Strong | 12-char all-sets (~77 bits); 6 EFF words (77.5 bits); 7 words (90.5 bits) |
| ≥ 100 | Very strong | 16+ char all-sets; 8+ EFF words (103 bits); default 20-char = ~128 bits |

Show the bits number always; the label is secondary. The default password (20 chars, all sets) must land in "Very strong" and the default passphrase (6 words) in "Strong" — both honest.

### Crack-time assumptions

zxcvbn's four published scenarios: online throttled 100/hour, online unthrottled 10/s, offline slow hash (bcrypt/scrypt/PBKDF2 class) 10^4/s, **offline fast hash (MD5/SHA-1/SHA-256 class) 10^10/s**. Use the last one as the single stated worst-case (HIGH for the scenario definitions via the zxcvbn docs; the 10^10 figure is a ballpark and stated as such). Note for the FAQ: assumes the attacker knows the generator settings (Kerckhoffs), and that crack time only matters if the site's hash storage is leaked — a password manager and uniqueness matter more than going from 100 to 128 bits.

---

## Part 2 — Collapsible "About this tool" sections (Worked Example + FAQ, all tools)

### Current structure (verified in repo)

Each tool `page.tsx` hand-renders `<section data-testid="…-worked-example">` and `<section>` + `<div data-testid="…-faq-item">` below the tool, with FAQPage JSON-LD built from the same `faq-data.ts`. E2E specs (`tests/e2e/{hash,subnet,uuid,…}-seo.spec.ts`) query these test IDs. Config page has neither section nor JSON-LD and uses a wider `max-w-6xl` container.

### Table stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Tool first, info below in a muted area | Brief: tool-first pages; every utility site does this | LOW | A muted heading ("About this tool"), top border, smaller type, `text-muted-foreground`; no new page-level width. |
| Closed by default, content in server HTML | Required to keep SEO and JSON-LD parity | LOW | Use **native `<details>/<summary>`** inside the server component: zero JS, keyboard (Enter/Space), implicit disclosure semantics, content stays in the HTML. |
| Descriptive summary labels with caret affordance | NN/g-reported: the caret is the clearest expandable cue; vague labels force clicks | LOW | "Worked example" and "Frequently asked questions"; rotate a chevron via `group-open:`; visible focus ring consistent with other controls; summary ≥ 44px tall. |
| One shared server component for all tool pages | Architecture intent: no hand-edited duplicates ×7 | MEDIUM | e.g. `ToolAbout({ workedExample, faqItems })` rendering both `<details>` and the JSON-LD script (keep the `<`→`<` escape). Preserve (or deliberately migrate) existing `data-testid`s. |
| JSON-LD stays identical to visible FAQ text | Existing content-match contract | LOW | Same `faqItems` array drives both. |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Find-in-page reveals closed content | Users Ctrl+F for a term in the FAQ | LOW (free with native `details`) | Chrome 97+ auto-expands closed `<details>` on find and fragment navigation; Firefox shipped later (reported fixed for 146, MEDIUM); Safari not confirmed. Acceptable degradation: content still in DOM/HTML. |
| `#faq` / `#worked-example` deep links open the section | Related-tool links and search sitelinks can target it | LOW-MEDIUM | Native fragment navigation handles Chrome; a ~10-line client effect (hash → set `open`) covers others. Optional. |
| No nested accordion per question | Fewer clicks | LOW | Inside the FAQ `<details>` render all Q&As expanded. Per-question accordions double the click cost for 4–6 short items. |

### Anti-features

| Feature | Why Avoid | Instead |
|---------|-----------|---------|
| Radix/shadcn Accordion client component for this | Needs hydration JS on every page for static text; content only mounts after hydration unless carefully configured | Native `<details>` in server components |
| `display:none`/JS-injected FAQ content (e.g. fetched on click) | Not in initial HTML → not reliably indexed | Content always in the server HTML |
| Auto-opening on desktop / "Expand all" chrome | Defeats "tool-first" | Closed by default; user decides |
| Exclusive-accordion (`name=` attribute) | Prevents comparing worked example with FAQ | Independent `<details>` |

### Google's stance (what it means here)

- **FAQ rich results are gone.** Google stated they stopped appearing May 7 2026 (already limited to gov/health sites since Aug 2023); FAQ report, Rich Results Test support and Search Console API support are being removed through Aug 2026 (HIGH — Search Engine Journal plus Google's own doc deprecation notice). Valid FAQPage schema remains harmless and removal does not affect visibility. **Consequence: do not invest further in FAQ JSON-LD for Google; keep the existing shared mechanism (cheap, already built) and keep the Config parity item low-effort.**
- **Collapsed content is indexed.** Google reps (Illyes 2016, Mueller 2020; MEDIUM — secondary reporting) say content hidden for UX in the HTML gets normal weight under mobile-first indexing; the one caveat is it won't be used for search snippets. Some SEO tests dispute ranking parity (contested, MEDIUM-LOW). Mitigation: keep the visible summary text keyword-descriptive and keep the primary tool description (h1 + intro line) outside the collapsible.
- **Hard rule:** content must be in the initial HTML, not loaded after a click.

### Dependency / risk notes for the migration

- Existing Playwright/Vitest assertions that expect `…-faq-item` or worked-example elements to be *visible* will fail while the `<details>` is closed. Update them to `toBeAttached()`/`toHaveText()` or open the `<details>` first. JSON-LD ↔ visible text equality tests should read text content (works while closed).
- Subnet and Config pages use wider containers; the About area should keep a readable `max-w-3xl` inside wider pages.

---

## Part 3 — Config Syntax Highlighter parity

| Feature | Why Needed | Complexity | Notes |
|---------|------------|------------|-------|
| Worked example (static, server-rendered) | Parity with the five other tools; SEO text | LOW | Sample 5–8-line IOS interface/ACL snippet shown as plain text with a short description of how colors map; avoid dependence on the client highlighter for server HTML (or reuse `lib/config/highlight` server-side if it is framework-free — check `lib/config/highlight.ts` has no browser APIs). |
| FAQ (4–6 items) + FAQPage JSON-LD via shared component | Parity | LOW | Candidate questions: which platforms are supported (IOS, IOS-XE, IOS-XR) and what is not (NX-OS, Junos — state only what is true after checking the highlighter); rich-text vs plain-text copy and where rich text pastes cleanly (email clients, Word, Confluence); does it change my config (copy-plain returns original bytes); does it mask secrets (it does not; type-7 is reversible) — **privacy/locality wording must reuse the approved statement ("runs in your browser") per the project rule that legal/privacy text needs human approval.** |
| Distinct icon | Currently reuses `Network` (same as Subnet) | LOW | Lucide `FileCode` (or `Terminal`/`ScrollText`) — all exist in the installed version. Update `registry.ts` **and** the `ICONS` map in `ToolCard.tsx` (otherwise silently falls back to the UUID Fingerprint). Check nav/MobileNav if they map icons separately. |
| Page container alignment | Config page is `max-w-6xl` with its own header copy | LOW | About area constrained to `max-w-3xl`; keep the tool's wide two-pane layout untouched. |

---

## Part 4 — Subnet Calculator compaction (1366×768, no scroll)

### Budget reality

A 1366×768 laptop leaves roughly 1366×600–650 CSS px of viewport after browser chrome/OS taskbar. The shared header (~56–64px) plus `py-12` page padding plus a 32px `h1` and `mt-8` already consumes ~170px before the tool. The current output is a stacked list of full-width bordered field cards (`gap-8`, `py-3`/`py-4` per card), so every field costs a full row.

### Table stakes

| Feature | Why | Complexity | Notes |
|---------|-----|------------|-------|
| Output grid: 2–3 columns at `lg`, 1 column below `sm` | Biggest lever; field values are short (IPv4) | MEDIUM | Use CSS grid with `auto-fit`/fixed 2–3 cols; keep copy buttons per field (44px hit target requirement already in code) — can drop to icon-only with visible confirmation. |
| Wider container for this tool only (e.g. `max-w-5xl`) | Columns need width; other tools unaffected | LOW | Page-level change in `subnet/page.tsx`; About area stays `max-w-3xl`. |
| Tighter vertical rhythm on tool-first pages | Cheap pixels | LOW | Reduce `py-12`→`py-6/8` on this page, `gap-8`→`gap-4`, card padding `py-3`→`py-2`; inline helper text; keep h1. |
| Verify IPv4 default AND an IPv6 `/64` result | IPv6 has longer fields (39-char expanded address) and a subdivision row | MEDIUM | IPv6 must wrap gracefully (`break-all`), may use 1–2 columns, and still fit; at 320px layout must stay unchanged-functional. |
| Automated check | Prevents regression | LOW-MEDIUM | Playwright at 1366×768: assert the bottom of the output region ≤ `window.innerHeight` for IPv4 default and IPv6 sample (About summary may sit below the fold). |

### Anti-features

| Feature | Why Avoid | Instead |
|---------|-----------|---------|
| Hiding fields behind an "Advanced"/"More" disclosure | Loses at-a-glance completeness (core value); every field is a table-stakes subnet output | Densify the layout; keep all fields visible |
| Shrinking font below the 14px floor used elsewhere | Readability/a11y; breaks design tokens | Reduce spacing, not type |
| Truncating addresses with ellipsis | Engineers need the full value to copy/verify | Wrap or widen columns |
| Pagination/tabs between IPv4 blocks | Extra clicks | Single dense view |

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Password mode core (length, sets, ≥1/set, unbiased RNG) | HIGH | MEDIUM | P1 |
| Last-set guard + normalizeOptions + URL parse | HIGH | LOW-MEDIUM | P1 |
| Passphrase mode (EFF list, lazy) | HIGH | MEDIUM | P1 |
| Entropy meter + crack-time (stated assumption) | HIGH | LOW | P1 |
| Batch + copy-all | MEDIUM | LOW | P1 |
| Shared collapsible `ToolAbout` for all tools | HIGH | MEDIUM | P1 |
| Subnet compaction | HIGH | MEDIUM | P1 |
| Config worked example/FAQ/icon | MEDIUM | LOW | P1 |
| Keyboard shortcuts | MEDIUM | LOW | P1 |
| Colorized output | LOW-MEDIUM | LOW | P2 |
| Hyphenated-word filtering for passphrase | LOW | LOW | P2 |
| Exact entropy with per-set guarantee | LOW | LOW-MEDIUM | P3 |
| Slow-hash crack-time toggle | LOW | LOW | P3 |
| Min-count per set / extra wordlists | LOW | MEDIUM | P3 (defer) |

**Priority key:** P1 = must have for the milestone; P2 = add if cheap; P3 = defer.

## Competitor Feature Analysis

| Feature | Bitwarden | KeePassXC | LastPass | 1Password | Our Approach |
|---------|-----------|-----------|----------|-----------|--------------|
| Default length | 14 (clients) / 16 (SDK) | configurable | not stated | ~19–20 | **20** |
| Sets | upper/lower/digits (special off by default) | many groups + custom | 4 toggles | digits/symbols | 4 toggles, **all on**, editable symbols |
| ≥1 per enabled set | always | opt-in checkbox | assumed | assumed | **always** |
| Look-alike removal | `I O l 0 1` | `l B G I O 0 1 6 8 \|` | none noted | none noted | **`0 O o 1 l I \|`** |
| All sets off | error | invalid | n/a | n/a | **unreachable** |
| Passphrase default | 6 words, `-` | 7 words, space | n/a | memorable w/ separators | **6 words, `-`**, EFF long |
| Strength | zxcvbn | bits bands (<40/75/100) | zxcvbn labels | n/a | **bits bands**, settings-driven |
| Crack time | no | no | no | no | **yes, assumption stated** |
| Batch | no | no | no | no | **1–20 + copy all** |
| Options-only shareable URL | no | n/a | no | no | **yes** |

## Sources

- Bitwarden SDK password generator source `sdk-api-docs.bitwarden.com/src/bitwarden_generators/password.rs.html` — ambiguous set, min counts, no-set error, defaults, shuffle (HIGH)
- Bitwarden clients repo `libs/tools/generator/core/src/data/default-password-generation-options.ts`, `default-passphrase-generation-options.ts`, `default-password-boundaries.ts` — defaults and 5–128 bounds (HIGH)
- `bitwarden.com/help/generator/` — option descriptions, special set `!@#$%^&*` (HIGH)
- KeePassXC source `src/core/PasswordGenerator.cpp`, `PassphraseGenerator.cpp`, `PasswordHealth.cpp`, `gui/PasswordGeneratorWidget.cpp` — groups, look-alike list, pick-from-every-group, 7-word/space/EFF defaults, 40/75/100 bands (HIGH)
- `lastpass.com/features/password-generator` — toggles, copy confirmation, zxcvbn labels (MEDIUM)
- 1Password Community threads and blog (memorable separators, ~20 default) — official docs unreachable (LOW-MEDIUM)
- EFF "New Wordlists for Random Passphrases" (eff.org/deeplinks/2016/07/new-wordlists-random-passphrases) — 7776/1296 lists, 12.9 and 10.3 bits/word, 6-word recommendation (HIGH); `eff_large_wordlist.txt` downloaded and measured: 7776 words, 62 KB words-only, ~24.5 KB gzip, 4 hyphenated words (HIGH)
- EFF list license CC BY 3.0 (US) per third-party packages bundling it (MEDIUM; confirm on eff.org)
- zxcvbn crack-time scenarios (docs.rs `zxcvbn::time_estimates`, Perl port docs) (MEDIUM-HIGH)
- NIST SP 800-63B-4 (pages.nist.gov/800-63-4/sp800-63b/passwords): no composition rules imposed on user-chosen passwords; length-first guidance (MEDIUM — applies to verifiers, used here only as FAQ background)
- Google: Search Engine Journal "Google drops FAQ rich results" and the FAQ doc deprecation notice (May 7 2026 stop, doc removed June 15 2026) (HIGH); Search Engine Journal on Mueller/hidden tab content, Search Engine Roundtable snippet and ranking-test coverage (MEDIUM, secondary)
- MDN `<details>` reference (semantics, `name`, `::details-content`) and Chrome 97 auto-expand details announcement, Mozilla bugs 1724299 / 1970909 (MEDIUM)
- NN/g-derived accordion guidance via secondary summaries (caret clarity, hidden content gets less attention) (MEDIUM-LOW)
- Repo inspection: `tools/registry.ts`, `components/ToolCard.tsx` (ICONS fallback), `app/tools/*/page.tsx`, `app/tools/config/page.tsx`, `lib/hooks/*`, `lib/analytics/redact.ts`, `tests/e2e/*-seo.spec.ts` (HIGH)

---
*Feature research for: password/passphrase generator and tool-page polish (v1.3)*
*Researched: 2026-11-11*
