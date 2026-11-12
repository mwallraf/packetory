# Technology Stack — v1.3 Additions

**Project:** Packetory (packetory.dev)
**Milestone:** v1.3 Password Generator & Tool Page Polish
**Researched:** 2026-11-11
**Scope:** Only what the NEW v1.3 features need. The v1.0–v1.2 stack (Next 16.2.11, React 19.2.8, TS, Tailwind 4.3.3, `radix-ui` umbrella + shadcn-style `components/ui/*`, `uuid`, `@noble/hashes`, Vitest/fast-check/Playwright) is validated and unchanged.

## Bottom Line

**Add zero runtime dependencies. Add zero devDependencies.** Everything v1.3 needs is either already installed or is a small hand-rolled module plus one vendored data file.

| Question | Decision |
|----------|----------|
| Password library? | No. Hand-roll `lib/password/` (~100 LOC). Rejection sampling over `crypto.getRandomValues` is 15 lines; every candidate library adds bytes, an audit burden, or a weaker RNG story for no gain. |
| Passphrase wordlist | **EFF Large Wordlist (7,776 words, 12.925 bits/word)**, vendored as a generated TS module and loaded with a dynamic `import()` only when passphrase mode is used. |
| Collapsible primitive | **Native `<details>/<summary>`**, as a server component. NOT Radix Collapsible/Accordion (they unmount closed content, which breaks the "content stays in the HTML" requirement). |
| Config tool icon | **`FileTerminal`** from `lucide-react` (already installed). Password tool icon: **`KeyRound`**. |
| Strength meter / slider | Hand-rolled (`div role="meter"`, native `<input type="range">`). No new shadcn components required. |

## Recommended Stack Additions

### New Dependencies

None.

### Existing Dependencies Used For New Work

| Technology | Installed | Latest on npm (2026-11-11) | Used For | Action |
|------------|-----------|----------------------------|----------|--------|
| `lucide-react` | 1.25.0 (`^1.25.0`) | 1.72.0 | `FileTerminal`, `KeyRound` icons; `ChevronRight` for the details marker | No bump needed. Both icons verified present in the installed 1.25.0 (`dist/esm/icons/file-terminal.mjs`, `key-round.mjs`). |
| `radix-ui` | 1.6.4 | 1.8.1 | `Switch`, `ToggleGroup`, `Label`, `Tooltip` already wrapped in `components/ui/*` | Reuse for the password options UI (symbol/class toggles, Password/Passphrase mode). Do not bump for this milestone. |
| Web Crypto `crypto.getRandomValues` | Browser built-in | n/a | CSPRNG for password and passphrase | Same primitive the UUID tool already relies on. No polyfill needed. |
| Vitest 4.1.10 + `fast-check` 4.9.0 + `@fast-check/vitest` 0.4.1 | Installed | — | Unbiased-sampling, charset, entropy-math property tests | Reuse. |

## Decision 1: Passphrase Wordlist — EFF Large Wordlist

**Verdict: use `eff_large_wordlist.txt` (7,776 words). Do not ship the short lists in v1.3.**

Measured on 2026-11-11 by downloading the files from eff.org (HTTP 200, `cache-control: immutable`):

| List | Words | Bits/word | Words-only raw | Gzip -9 | Brotli | Notes |
|------|-------|-----------|----------------|---------|--------|-------|
| **EFF Large** (`2016/07/18/eff_large_wordlist.txt`) | 7,776 | 12.925 | 62.1 KB | **24.5 KB** | **~21 KB** | Dice-indexed (`11111<TAB>abacus`); the numeric dice column is dropped when vendoring. Word lengths 3–9. |
| EFF Short #1 (`2016/09/08/eff_short_wordlist_1.txt`) | 1,296 | 10.34 | 13.7 KB | 3.3 KB | — | Shorter words, but no unique-prefix guarantee. |
| EFF Short #2 (`2016/09/08/eff_short_wordlist_2_0.txt`) | 1,296 | 10.34 | 17.3 KB (words only 10.8 KB) | 5.7 KB | — | Unique 3-character prefixes. |

**Why Large:**
- Highest entropy per word means fewer words for the same strength: 6 words is about 77.5 bits, versus 8 words with the short lists for about 82.7 bits.
- Only about 24 KB gzip, and it never touches initial JS (see loading strategy below), so the size penalty versus the short list is irrelevant in practice.
- It is the canonical "diceware-style" list, so the entropy claim in the meter and FAQ is easy to explain and defend ("7,776 words, log2 = 12.925 bits each").
- One list means one chunk and one entropy constant. A second list would need a selector UI, a second chunk, and a second code path in the meter, for no stated requirement.

**Licensing (MEDIUM confidence — see sources):**
- The EFF wordlists are distributed under **Creative Commons Attribution (CC BY)**. The EFF's own `EFForg/eff_diceware` repo README says the list is under CC BY and links the 3.0 US deed. eff.org/copyright states CC BY 4.0 for original site material and links 3.0 US from its badge, so the exact version is inconsistent upstream. Either way the obligation is attribution only; commercial use and modification (e.g. stripping the dice column) are permitted.
- **Required action:** keep a header comment in the vendored module (source URL, "EFF Large Wordlist for Passphrases", CC BY, date fetched) AND one visible attribution line in the "About this tool" area, such as "Passphrase words from the EFF Large Wordlist (CC BY)".
- Avoid using the trademark "Diceware" as the product's feature name in UI copy; use "passphrase". ("Diceware" is a trademark of A. G. Reinhold; this is a naming concern, not a wordlist-license concern.)
- **Verify before shipping:** the license wording was confirmed via the EFF's own repo and secondary sources, not a license line on the list file itself (the file has no header). The roadmap should include a one-line "confirm license text on eff.org/dice" check in the password phase.

**Data quirks to handle (verified by inspecting the file):**
- The Large list contains 4 hyphenated entries: `drop-down`, `felt-tip`, `t-shirt`, `yo-yo`. The short lists contain `yo-yo`. With a `-` separator the output is slightly ambiguous to a human reader, but it does **not** change the entropy math or security. Recommendation: **keep the list intact** (removing words breaks the clean 7,776 = 6^5 count and the "it is the EFF list" claim) and document it. Do not "fix" by stripping.
- All other words are lowercase `[a-z]`; no duplicates. Add a unit test pinning: length is 7776, all unique, every word matches `/^[a-z]+(-[a-z]+)?$/`, and a SHA-256 of the joined list against the source file digest (guards against accidental edits).

### How to bundle and lazy-load (Next 16 / Turbopack)

1. **Vendor as a generated TS module, not a `.txt` import.** One-off script `scripts/gen-eff-wordlist.mjs` (committed; run manually, NOT on every build) downloads the EFF file, drops the dice column, and writes `lib/password/wordlist/eff-large.ts`:
   ```ts
   // Source: https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt
   // "EFF Large Wordlist for Passphrases", (c) Electronic Frontier Foundation, CC BY. Dice column removed.
   export const EFF_LARGE = "abacus abdomen abdominal ... zoom";   // single space-joined string
   ```
   A single string compresses better and parses faster than a 7,776-element array literal (no per-element quotes/commas, roughly 16 KB less raw), and `EFF_LARGE.split(" ")` is trivial. A `.txt` import would need extra loader/Turbopack config for no benefit.
2. **Lazy-load with a plain dynamic `import()` from the client island**, behind a cached loader in the framework-agnostic layer:
   ```ts
   // lib/password/wordlist.ts
   let cache: Promise<readonly string[]> | undefined;
   export function loadWordlist(): Promise<readonly string[]> {
     return (cache ??= import("./wordlist/eff-large").then((m) => m.EFF_LARGE.split(" ")));
   }
   ```
   Turbopack splits the module into its own async chunk automatically; it is fetched from same-origin as an immutable hashed asset (no third-party request, consistent with the "fully local" constraint). It is **not** in the initial JS of `/tools/password`, and the password-mode default-on-load never waits on it.
3. **Warm the chunk early.** Call `loadWordlist()` (fire-and-forget) on `pointerenter`/`focus` of the Passphrase toggle, and immediately on load if the URL restores `mode=passphrase`. This hides the one network hop for ~24 KB.
4. **State handling for passphrase mode:** render Passphrase controls immediately; generate once the promise resolves; keep a reserved-height output area (the repo already pins skeleton heights to avoid CLS, see `HashToolLoader`). If the dynamic import rejects (offline/stale chunk), show an inline error with a Retry; never fall back to a tiny built-in list (silent entropy downgrade).
5. **Verify with the same discipline as the hash worker:** after `next build`, grep `.next/static/chunks` to confirm a word such as `abacus` appears in exactly one chunk, and that chunk is not in the `/tools/password` initial chunk set.
6. Do **not** put the list in `public/` and `fetch()` it: that adds a manual loading/error path and cache semantics for no gain over a bundled async chunk.

## Decision 2: Password Library vs Hand-Rolled — Hand-Rolled

**Verdict: hand-roll `lib/password/*` (pure, framework-agnostic, no React imports), consistent with the `lib/uuid|subnet|hash` pattern.**

Why not a library (npm sizes via registry, 2026-11-11):

| Package | Version | Unpacked | Verdict |
|---------|---------|----------|---------|
| `generate-password` | 1.7.1 | 24.5 KB | No. Charset/exclusion API doesn't map to "editable symbol set + look-alike removal"; unbiased sampling and RNG source are not under our control. |
| `secure-random-password` | 0.2.3 | 40.7 KB | No. Stale (0.2.x), still wraps its own charset logic. |
| `niceware` | 4.0.0 | 1.7 MB | No. Different, larger wordlist; would bloat. |
| `passphrase-generator` | 1.0.0 | 57 KB | No. Opaque list, no entropy accounting. |
| `zxcvbn` / `@zxcvbn-ts/core` | 4.4.2 / 3.0.0 | — | Explicitly out of scope (PROJECT.md): it estimates human-chosen password strength and is far too heavy for random generated output where entropy is exactly computable. |

A security-sensitive tool's value proposition is auditable randomness. The entire correct implementation is small:

- **Unbiased sampling:** `randomInt(maxExclusive)` using rejection sampling on `Uint32` from `crypto.getRandomValues`: compute `limit = Math.floor(2**32 / n) * n`, redraw while `x >= limit`, return `x % n`. Never `x % n` directly (modulo bias), never `Math.random`.
- **Class guarantees:** to ensure at least one character from every enabled class, **rejection-resample the whole password** until it satisfies all classes (keeps the distribution uniform over the valid set; fast for length ≥ 8). Avoid "place one of each, then shuffle" unless the shuffle is Fisher-Yates driven by the same `randomInt`.
- **Look-alike removal:** filter the pool (`0O o 1lI|` and similar) before computing pool size, so the entropy figure reflects the actual pool.
- **Symbol set:** editable string, deduplicated by code point (`[...new Set(str)]`), with a sane cap and a "symbols enabled but empty" validation state.
- **Passphrase:** words via `randomInt(wordlist.length)`; capitalize deterministically (adds 0 bits; do not claim bits for it); optional appended number via `randomInt(10)` or `randomInt(100)` (adds `log2(10)` / `log2(100)` bits).
- **Injectable randomness for tests:** make the core take an RNG function `(buf: Uint32Array) => Uint32Array`, defaulting to `crypto.getRandomValues`. This lets Vitest + fast-check deterministically prove (a) no modulo bias at the rejection boundary (stub that yields values at/above `limit`), (b) every output char is in the pool, (c) class guarantees hold, (d) batch of N returns N independent results.
- **Entropy / crack-time math (pure functions, log-domain):** bits = `length * log2(poolSize)` for passwords; `words * log2(listSize) [+ log2(10|100)]` for passphrases. Compute crack time as `log10(seconds) = bits*log10(2) - log10(guessesPerSecond) - log10(2)` (average-case, half the space) and format from the log value; do **not** compute `2 ** bits` directly (overflows to `Infinity` above 1024 bits). State the assumed guess rate (e.g. 10^10 /s offline fast-hash GPU rig) next to the estimate; note it is an upper-bound illustration for a fast unsalted hash, not a promise. Use `Intl.NumberFormat` for formatting; no date/duration library.

## Decision 3: Collapsible Primitive — Native `<details>/<summary>`

**Verdict: native HTML `<details>`/`<summary>`, rendered by a server component. Do NOT use Radix Collapsible or Accordion.**

Findings (verified in the installed package):
- `radix-ui` 1.6.4 already exports `Collapsible` and `Accordion` (`node_modules/radix-ui/dist/index.d.ts`), so cost-of-adding is zero. But `@radix-ui/react-collapsible`'s `CollapsibleContent` renders `<Presence present={forceMount || context.open}>`, i.e. **closed content is not in the DOM** unless `forceMount` is used. That directly violates the v1.3 requirement "content stays in the HTML for SEO/JSON-LD", and the project already content-matches visible FAQ text against FAQPage JSON-LD. `forceMount` plus hand-managed `hidden` styling reintroduces what `<details>` gives for free.
- Radix primitives are client components; every tool page's `page.tsx` is a static Server Component and the Worked Example/FAQ are pure server-rendered markup today. Wrapping them in Radix would pull them into the client bundle (hydration + JS) for zero interaction benefit, against the "minimal JS per page" constraint.
- Native `<details>`: closed content is in the server HTML and DOM (crawlable; Google indexes content inside collapsed `<details>`), zero JS, built-in keyboard support (Enter/Space on the summary), correct implicit semantics for assistive tech, and find-in-page (Ctrl+F) in Chromium auto-expands it.

**Implementation recipe:**
- One shared server component: `components/AboutThisTool.tsx` renders `<section aria-labelledby=...>` with a muted `<h2>About this tool</h2>` and children; and `components/Collapsible.tsx` (name it `InfoDisclosure` to avoid confusion with Radix `Collapsible`) rendering:
  ```tsx
  <details className="group border-t border-border">
    <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
      <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
      {title}
    </summary>
    <div className="pb-4 text-muted-foreground">{children}</div>
  </details>
  ```
  Tailwind 4.3.3 supports the `group-open:` / `open:` variants out of the box. No `open` attribute = closed by default.
- Keep the visible `<h2>` outside the `<summary>`; headings inside `<summary>` are flattened/ignored by some screen readers. Use a plain text summary label.
- Do not animate height in v1.3 (`::details-content` animation support is recent and uneven); a chevron rotation is enough and CLS-safe because the area is below the tool.
- Do not use the `name=` exclusive-accordion attribute; Worked Example and FAQ should be independently openable.
- **Test impact (important):** existing Playwright/Testing Library assertions that treat Worked Example/FAQ as visible (`*-seo.spec.ts`, `data-testid="hash-worked-example"`, `hash-faq-item`, etc.) will fail `toBeVisible()` while closed. Update them to assert presence in the DOM (`toBeAttached()` / `toContainText`), and add one test per tool that clicking the summary opens it. JSON-LD/visible-FAQ content-match tests keep working because the text is still in the HTML.
- jsdom's `<details>` summary-click toggling support should be spot-checked in the first component test; if jsdom does not toggle, assert on the `open` attribute via `userEvent`/direct attribute, and cover real toggle behavior in Playwright.

## Decision 4: Lucide Icons

| Tool | Icon | Why |
|------|------|-----|
| Config Syntax Highlighter (replaces `Network`, currently shared with Subnet) | **`FileTerminal`** | A document with a terminal prompt reads as "CLI configuration file", which is precisely what the tool does (highlight Cisco IOS config text). Visually distinct from `Network`, `Globe`, `Cpu`, `Hash`, `Fingerprint`. Alternatives considered: `Highlighter` (reads as a marker pen, ambiguous at 20px), `SquareTerminal` (less "file/config", closer to a shell tool). |
| Password Generator | **`KeyRound`** | Immediately reads as "credentials". `Lock` is more generic and over-used for "security"; `Dices` suggests randomness but not passwords. |

Both exist in installed 1.25.0. **Integration trap (verified in `components/ToolCard.tsx`):** the `ICONS` lookup is a hand-maintained `Record<string, LucideIcon>` with a **silent `?? Fingerprint` fallback**. A registry entry with `icon: "KeyRound"` or `"FileTerminal"` without adding the import and map entry will silently render the UUID fingerprint, with no type or test error. Required changes:
1. `components/ToolCard.tsx`: add `FileTerminal`, `KeyRound` to the `lucide-react` import and the `ICONS` map.
2. `tools/registry.ts`: add `{ slug: "password", icon: "KeyRound", category: "generate", clientOnly: true, status: "active", featured: false, ... }`; change the config entry to `icon: "FileTerminal"`.
3. `components/ToolCard.test.tsx`: add tests mirroring the existing "renders the lucide Hash icon, not the Fingerprint fallback" test for both new icons. Consider also a registry-level test asserting every `tool.icon` exists in the `ICONS` map (export the map or the key list) to kill this trap permanently.

## Supporting Notes for the Other v1.3 Features (no stack change)

| Feature | Stack impact | Notes |
|---------|--------------|-------|
| Password options UI | None | Reuse `components/ui/{toggle-group,switch,label,input,button}`. Password/Passphrase mode = `ToggleGroup` (single, matches UUID's version toggle). Class toggles = `Switch` or `Toggle`. Length = native `<input type="range">` (`accent-primary`) paired with a number `Input`; both are keyboard-native. No `shadcn add slider` required. |
| Strength meter | None | `div` with `role="meter"`, `aria-valuenow/min/max`, `aria-valuetext` ("Strong, 129 bits"), color class by tier. Don't use native `<meter>` (inconsistent cross-browser styling) and don't add shadcn progress. |
| Copy / copy-all / shortcuts | None | Reuse `useCopyToClipboard` and `useKeyboardShortcut` including the native-button `Enter` guard already documented in PROJECT.md decisions. |
| URL state (options only) | None | Reuse the raw `history.replaceState` pattern. **Allow-list by serialization:** write only mode/length/class flags/word count/separator/capitalize/number options. Never serialize generated output; add a unit test that asserts the URL builder has no code path accepting a password. Leave new param names OFF the analytics redaction allow-list (it is safe-by-default allow-list in `lib/analytics/redact.ts`), so they are stripped from analytics automatically. |
| FAQ + worked example + JSON-LD | None | Follow the `faq-data.ts` + `faqJsonLd` pattern from `app/tools/hash/page.tsx`. Password FAQ must cover: what makes it secure (CSPRNG, nothing sent anywhere), entropy meaning, passphrase vs password, the CC BY wordlist attribution, and why look-alike removal reduces entropy slightly. |
| Server-shell + client-island | None | Use `PasswordToolLoader` with `next/dynamic(..., { ssr: false })` and a pinned skeleton, exactly like Hash (random values must not be baked into SSR HTML or cause hydration mismatch; the same reason UUID uses it). |
| Subnet compaction | None | Pure Tailwind layout work (denser grid/two-column field groups, smaller vertical rhythm). Verify with a Playwright check at **1366x768 viewport**; note a real 1366x768 laptop has roughly 650 px of visible page height after browser chrome, so target the fold with margin (e.g. assert full output within ~620 px of tool container bottom), not exactly 768. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Passphrase list | EFF Large (7,776) | EFF Short #1/#2 (1,296) | 10.3 bits/word vs 12.9; needs more words for equal strength; a second list adds a selector, chunk, and entropy branch. Revisit only if users ask for "shorter passphrases". |
| Passphrase list | EFF Large | BIP-39 English (2,048 words) | 11 bits/word; designed for seed phrases with a checksum; community association with crypto wallets is confusing for a password tool. |
| Passphrase list | EFF Large | Random 30K+ frequency lists | Larger payload, obscure words, no clear public license or provenance. |
| Wordlist loading | Dynamic `import()` of generated TS module | `fetch('/wordlists/eff-large.txt')` from `public/` | Extra loading/error/cache path, no benefit over a hashed immutable async chunk. |
| Wordlist loading | Dynamic `import()` | Static import in the island | Adds ~24 KB gzip to every password page load, even in default password mode that never uses it. |
| Collapsible | Native `<details>` | Radix `Collapsible` / `Accordion` (already installed via `radix-ui`) | Closed content is unmounted (breaks SEO/JSON-LD parity), forces client components, extra JS. `forceMount` would negate its value. |
| Collapsible | Native `<details>` | shadcn `accordion` | Same Radix constraints, plus a new generated component to maintain. |
| Password RNG | Hand-rolled `getRandomValues` + rejection sampling | `generate-password`, `secure-random-password` | Less auditable, charset model doesn't fit requirements, tiny code to own. |
| Strength | Pure entropy + stated guess rate | `zxcvbn` / `@zxcvbn-ts/core` | Pattern-matching estimator for human-chosen passwords; heavy dictionaries; wrong model for CSPRNG output. Already ruled out in PROJECT.md. |
| Config icon | `FileTerminal` | `Highlighter`, `SquareTerminal` | Marker-pen ambiguity at small size / reads as a shell rather than a config file. |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any npm password-generation or passphrase package | Auditability of randomness is the product; ~100 LOC to own | `lib/password/` hand-rolled |
| `Math.random()` anywhere in `lib/password/` | Not cryptographically secure | `crypto.getRandomValues` only; add an ESLint `no-restricted-properties` rule or a grep-based unit test for `Math.random` in `lib/password/` |
| `x % n` on random bytes without rejection | Modulo bias (this is the one explicit "unbiased sampling" requirement) | `randomInt` with rejection threshold |
| Radix `Collapsible`/`Accordion`/shadcn `accordion` for the info sections | Closed content not in HTML | Native `<details>` |
| `zxcvbn` or any dictionary-based strength library | Bundle size; wrong model | Entropy bits + crack-time estimate |
| Static/top-level import of the wordlist | Bloats initial JS | Dynamic `import()` in `loadWordlist()` |
| Stripping/rewriting EFF words (e.g. removing hyphenated entries) | Breaks 7,776 count and provenance for no security gain | Keep intact, document hyphen caveat |
| `2 ** bits` for crack-time | Overflows to Infinity > 1024 bits (reachable with 20-char × 12-word batches/long lengths) | Log-domain arithmetic |
| Serializing generated passwords into URL, localStorage, analytics events, or logs | Core privacy requirement | Options-only URL builder; no persistence of outputs |
| Bumping `lucide-react` / `radix-ui` in this milestone | Not needed (icons exist in 1.25.0); avoids unrelated lockfile churn and visual regressions | Leave as-is |
| New shadcn components (slider, progress, accordion, collapsible) | Unneeded; hand-rolled or native covers them | Native `<input type="range">`, `role="meter"`, `<details>` |

## Installation

```bash
# No new packages for v1.3.
# One-off data generation (manual, committed output; not part of build):
node scripts/gen-eff-wordlist.mjs   # writes lib/password/wordlist/eff-large.ts
```

## Version Compatibility / Currency Check (npm registry, 2026-11-11)

| Package | Installed | Latest | Status |
|---------|-----------|--------|--------|
| `lucide-react` | 1.25.0 | 1.72.0 | Behind but sufficient; `FileTerminal`, `KeyRound`, `ChevronRight` present. Pins are caret-ranged, so no action. |
| `radix-ui` | 1.6.4 | 1.8.1 | Behind; not used for any new primitive. |
| `@radix-ui/react-collapsible` | (via radix-ui) | 1.2.1 | Behavior (Presence-gated content) confirmed in installed source; not used. |
| `@noble/hashes` | 2.4.0 | 2.4.0 | Current; not relevant to password (uses Web Crypto). |
| `vitest` / `@fast-check/vitest` | 4.1.10 / 0.4.1 | 5.1.0 / 0.5.0 | Newer majors exist; do not bump mid-milestone. |

## Sources

- EFF Large Wordlist file, headers and content measured directly: https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt (HTTP 200; 7,776 lines) — HIGH (primary, empirical)
- EFF Short Wordlists #1 / #2 measured directly: https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt , https://www.eff.org/files/2016/09/08/eff_short_wordlist_2_0.txt — HIGH
- EFF announcement of wordlists (7,776 words ≈ 12.9 bits; short lists 1,296 ≈ 10.3 bits): https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases — HIGH for sizes/entropy
- EFF copyright page (CC BY 4.0 for site content, badge links 3.0 US): https://www.eff.org/copyright — MEDIUM (version mismatch upstream)
- `EFForg/eff_diceware` repo (wordlist distributed under CC BY, deed 3.0 US) via web search: https://github.com/EFForg/eff_diceware — MEDIUM (confirm before ship)
- npm registry queries (versions, unpacked sizes) for `lucide-react`, `radix-ui`, `@radix-ui/react-collapsible`, `@radix-ui/react-accordion`, `generate-password`, `secure-random-password`, `niceware`, `passphrase-generator`, `@zxcvbn-ts/core`, `vitest`, `@fast-check/vitest` — HIGH
- Local code inspection: `/Users/mwallraf/Developer/packetory.dev/node_modules/@radix-ui/react-collapsible/dist/index.mjs` (Presence gating), `node_modules/radix-ui/dist/index.d.ts`, `node_modules/lucide-react/dist/esm/icons/{file-terminal,key-round}.mjs`, `components/ToolCard.tsx` (ICONS map + fallback), `app/tools/hash/page.tsx` (FAQ/JSON-LD/section pattern), `tools/registry.ts` — HIGH
- MDN / HTML spec knowledge for `<details>`/`<summary>` semantics and find-in-page expansion — MEDIUM (not re-fetched this session)
