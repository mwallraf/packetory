# Project Research Summary

**Project:** Packetory v1.3 — Password Generator & Tool Page Polish
**Domain:** Fully local password/passphrase generator, plus tool-page "About" disclosures, Config-tool SEO parity, and Subnet layout compaction (additions to the shipped v1.2 Next.js 16 App Router app)
**Researched:** 2026-11-11
**Confidence:** MEDIUM-HIGH (codebase facts HIGH; competitor behaviour and SEO claims MEDIUM)

## Executive Summary

v1.3 is four features on one shipped static-first app. The password generator is the new tool (`/tools/password`); the other three are polish: a shared, closed-by-default "About this tool" block (Worked example + FAQ) for every tool page, parity for the Config highlighter (worked example, FAQ, JSON-LD, distinct icon), and denser Subnet layout so the output fits a 1366x768 laptop without scrolling. All four researchers agree on the core approach, and they agree that **no new runtime or dev dependencies are needed**.

The password generator is a hand-rolled, framework-agnostic `lib/password/` core on `crypto.getRandomValues` with rejection sampling (no `Math.random`, no `%` on random values). Entropy is computed from options and the final filtered alphabet, never from the output string. Passphrase mode uses the 7,776-word EFF Large list, vendored as one joined string and loaded through a memoized dynamic `import()` so it stays out of initial JS. The UI is a server shell plus an `ssr:false` client island, following the Hash and UUID pattern. The URL carries options only, never output. The About block is a server component built on native `<details>/<summary>`: content stays in the HTML (SEO and JSON-LD parity), there is zero client JS, and the rendering is shared across all pages.

The main risks are: (1) a password baked into static HTML or the URL, analytics, or the DOM; (2) modulo bias or a silent non-CSPRNG fallback; (3) entropy overstated by the guarantee rule, look-alike filtering, or duplicate symbols; (4) disclosure rollout breaking the existing `toBeVisible()` e2e specs and hard-coded counts of 6; (5) Enter on a focused `<summary>` double-firing the tool's global Enter handler (a real, existing bug path in `useKeyboardShortcut`); and (6) Subnet "fits 1366x768" measured on the wrong viewport. Each has a concrete prevention and test in the pitfall mapping below.

## Open Decisions (researchers disagree; user must choose before requirements)

**(a) EFF hyphenated words: keep or filter?** The list contains 4 hyphenated entries: `drop-down`, `felt-tip`, `t-shirt`, `yo-yo`. With a `-` separator these look like extra word boundaries.
- STACK.md: keep the list intact (preserves 7,776 = 6^5 count and provenance); document the caveat. No security or entropy change.
- FEATURES.md: filter the 4 (7,772 words, log2 difference about 0.0007 bits) and state the count honestly.
- ARCHITECTURE.md and PITFALLS.md: do not silently alter the list. Keep it; derive entropy from the real `.length`; surface the caveat in FAQ.
- **Synthesizer recommendation:** keep intact plus a visible FAQ note. If filtering is chosen, the attribution must say "modified" and the integrity test must pin the new count.

**(b) Config icon: `FileCode` or `FileTerminal`?**
- STACK.md: `FileTerminal` (reads as a CLI config file; visually distinct from `Network`/`Globe`/`Cpu`).
- FEATURES.md and ARCHITECTURE.md: `FileCode` (`SquareTerminal` as alternative).
- Both are present in installed `lucide-react` 1.25.0. Whichever is chosen must be added to the `ICONS` map in `components/ToolCard.tsx`, or it silently renders the UUID `Fingerprint` fallback.
- **Synthesizer recommendation:** `FileTerminal`. Low stakes; either works.

**(c) Phase order: Subnet compaction before or after the password phases?**
- ARCHITECTURE.md: Subnet is independent and can run in parallel with the `lib/password` core; it only needs to come after the About phase because both edit `subnet/page.tsx`.
- PITFALLS.md: Subnet is last, so its layout spec is measured against the final About layout and the final nav.
- **Synthesizer recommendation:** Subnet immediately after the About phase, before the Password UI phase.

**(d) Subnet viewport target.** A real 1366x768 laptop has about 600–680 px after browser chrome. ARCHITECTURE.md and PITFALLS.md recommend gating on 1366x650 (primary) and 1280x600 (stress). **Recommendation:** gate on 1366x650.

**(e) Password defaults and bounds.** Length 4–128 (default 20), words 3–20 (default 6), batch 1–20. Recommend 3–20 words for both UI and parser, from one constant.

## Key Findings

### Recommended Stack (STACK.md)

**Zero new packages.** Everything is existing code or a vendored file.

| Area | Decision | Why |
|------|----------|-----|
| Password RNG | Hand-rolled `lib/password/random.ts`: rejection-sampled `Uint32` from `crypto.getRandomValues` | Auditable; no npm package fits the charset model; `generate-password` and `secure-random-password` rejected |
| Strength | Entropy bits from options; crack time in log space at a stated 10^10 guesses/s (offline fast hash) | `zxcvbn` is heavy and wrong for CSPRNG output; `2 ** bits` overflows above 1024 bits |
| Passphrase list | EFF Large (7,776 words, 12.925 bits/word), vendored as `lib/password/wordlist/eff-large.ts`, dynamic `import()` | About 24.5 KB gzip; loaded only in Passphrase mode; not a `public/` fetch |
| Collapsible | Native `<details>/<summary>` in a server component | Radix `Collapsible`/`Accordion` unmount closed content (breaks SEO/JSON-LD parity) and force client JS |
| Icons | `KeyRound` (password); Config icon per decision (b) | Both exist in installed `lucide-react` 1.25.0 |
| Controls | Existing `components/ui` (`toggle-group`, `switch`, `input`, `label`, `button`); native `<input type="range">`; `div role="meter"` | No new shadcn components |
| Tests | Existing Vitest + fast-check + Playwright | No version bumps mid-milestone |

### Expected Features (FEATURES.md)

**Must have (table stakes):**
- Password output visible on load (random 20-char, all sets, generated client-side with a pinned skeleton)
- Length slider + number input (4–128); upper/lower/digits/symbols toggles with a last-set guard so "all off" is unreachable
- At least one character from every enabled set (rejection-resample the whole string)
- Unbiased sampling; editable symbol set (normalize, dedupe, printable ASCII, cap, empty reverts to default)
- Avoid look-alikes option (`0 O o 1 l I |`, filtered before pool size is computed)
- Passphrase mode: 6 words default, separator, capitalize, append number (capitalize and separator add 0 bits)
- Strength meter (bits + text label: Weak <40, Fair 40–74, Strong 75–99, Very strong ≥100) and crack-time line with the assumption stated
- Batch 1–20 with per-item copy and Copy all; Regenerate and Enter
- One-click copy with visible confirmation; options-only bookmarkable URL with strict parsing
- Keyboard: `/` focus length, Enter regenerate, Esc reset to defaults, Ctrl/Cmd+C copy (single result only)
- Registry, SEO, worked example, FAQ, JSON-LD; 320px, light/dark, CLS-free

**Should have (differentiators):**
- Settings-driven entropy (no zxcvbn): stable across Regenerate, no flicker
- Crack-time with a visible stated assumption; "pool size · bits" inline
- Attribution line for EFF list in the About area

**Defer (v2+ / v1.3.x):**
- Colorized character classes in output
- Exact inclusion-exclusion entropy
- Slow-hash crack-time toggle
- Min-count per set, additional wordlists, PIN mode, username generator, HIBP check, history, export, auto-copy, show/hide masking

**Shared About + Config parity:** tool first, muted "About this tool" area, closed `<details>`, descriptive summary labels with a caret, one shared server component and one JSON-LD script built from the same `faqItems`. Config gets a worked example (sample IOS snippet, RFC 5737 addresses only), 4–6 FAQ items, and `max-w-3xl` About inside its `max-w-6xl` page.

**Subnet compaction:** 3-column output grid at `lg`, wider container for this tool only, tighter vertical rhythm, IPv6 subdivision as an inline row. No fields hidden, no font below the 14px floor, no truncation.

### Architecture Approach (ARCHITECTURE.md)

Each feature plugs into an existing seam. The registry (`tools/registry.ts`) drives nav, landing, and sitemap, so the password tool is one registry entry plus one `ICONS` entry. Pages are server shells with `ssr:false` loaders and pinned skeletons; this is reused unchanged.

**Major components:**
1. `components/ToolAbout.tsx` (new, server) — muted section, two `<details>` (Worked example, FAQ), `data-testid`s `{slug}-worked-example`, `{slug}-faq`, `{slug}-faq-item`
2. `components/FaqJsonLd.tsx` + `lib/seo/jsonld.ts` (new) — the single place that builds and escapes FAQPage JSON-LD (keep the `<` escape)
3. `components/ExampleFields.tsx` (new, server) — shared `<dl>` grid for Subnet/DNS/MAC worked examples
4. `lib/password/*` (new, pure) — `random.ts`, `charset.ts`, `generate.ts`, `passphrase.ts`, `entropy.ts`, `url-state.ts`, `wordlist.ts`, `wordlist/eff-large.ts`
5. `app/tools/password/*` (new) — `page.tsx` shell, `PasswordToolLoader`, `PasswordTool` (owns all state), options panel, output, `StrengthMeter`, `faq-data.ts`
6. `lib/hooks/useKeyboardShortcut.ts` (modified, one line + one test) — add `summary` to the Enter guard selector

**Key patterns:** server-shell + client-island; native disclosure for secondary content; injectable `fill` for randomness in tests; memoized dynamic import for the wordlist with a sequence token against stale resolution; generate in handlers and store in state, never in render or `useMemo`; `history.replaceState(null, ...)` with options only.

**Privacy by construction:** `DEFAULT_ALLOW_LIST` is empty, so password URL params are stripped automatically. Add a regression test; do not allow-list anything. Do not use `#fragment` for state (not redacted).

### Critical Pitfalls (PITFALLS.md)

1. **Password baked into static HTML** — initialize only inside the `ssr:false` island. Test: raw HTML contains no output; two loads differ.
2. **Modulo bias, `Math.random`, silent fallback** — one audited `randomInt`; fail closed if `crypto` is missing. Chunk draws so one call never exceeds 65,536 bytes. Guard forbidding `Math.random` in password code.
3. **Entropy overstated** — single pipeline `options -> resolveAlphabets -> pool`; entropy and generation both read only that output. Validate `length >= enabled sets` and non-empty pool. Bound rejection loops. Passphrase entropy = `words * log2(list.length)` (+ `log2(10)` if a random digit is appended).
4. **Disclosure rollout breaks e2e and counts** — `uuid-seo`, `subnet-seo`, `dns-seo`, `hash-seo` use `toBeVisible()` on closed content. Add an `openAbout` helper. Update hard-coded 6s to 7 in `registry.test.ts`, `home.spec.ts`, `navigation.spec.ts`, `sitemap.test.ts`. The Playwright CI job was removed (2026-10-17); run `npm run test:e2e` and `npm run test:e2e:prod` locally before merge.
5. **Enter on focused `<summary>`** — the existing guard does not match `summary`, so Enter toggles the FAQ and fires the tool's Enter handler. Fix in Phase A with a hook unit test.
6. **Password managers, clipboard, translation** — render output in a non-form element with `translate="no"`, `spellCheck={false}`, `user-select: all`; `autoComplete="off"` on text inputs. Honest FAQ wording about clipboard history.

Also: the 640px nav with seven links is tight (verify, `shortName` fallback); the wordlist must never fall back to another list or RNG on load failure; the Config worked example must use RFC 5737 addresses and no realistic secrets.

## Implications for Roadmap

Dependency order: About first (password and Config are consumers), password core before password UI. Subnet placement is decision (c).

### Phase A: Shared About + Config parity + keyboard fix
**Delivers:** `lib/seo/jsonld.ts`, `FaqJsonLd`, `ToolAbout`, `ExampleFields`; `useKeyboardShortcut` `summary` fix + test; migration of UUID, Hash, DNS, MAC, Subnet pages; updated `*-seo.spec.ts`; Config worked example, FAQ, JSON-LD, icon, `ICONS` entry, `config-seo.spec.ts`.

### Phase B: Subnet compaction
**Delivers:** Dense `lg` field grid, `max-w-5xl` for this page only, hero folded into the CIDR row at `lg`, tighter spacing, inline IPv6 subdivision row, copy controls retained; re-measured skeleton; new `subnet-layout.spec.ts`.
**Acceptance:** at 1366x650 and 1280x600, IPv4 `/24` default output bottom ≤ `innerHeight` with `scrollY === 0`; IPv6 target stated and measured; no horizontal overflow at 320/375; testids unchanged; `lib/subnet` untouched.

### Phase C: Password core (`lib/password`, no UI)
**Delivers:** `random.ts`, `charset.ts`, `generate.ts`, `passphrase.ts`, `entropy.ts`, `url-state.ts`, `wordlist.ts` + vendored `eff-large.ts` (committed generation script; CC BY attribution header); integrity test; redaction regression test.
**Exit gate:** stubbed-RNG boundary tests; fast-check properties; no `Math.random`; no call over 65,536 bytes.

### Phase D: Password UI, registration, SEO, e2e
**Delivers:** `app/tools/password/*`; registry entry (`KeyRound`); `ICONS` entry; URL sync; keyboard wiring; FAQ derived from `lib/password` constants; human-approved privacy wording; metadata; layout/functional/SEO e2e; e2e-prod wordlist lazy-load spec; 7-tool counts; 640/700px nav check; Lighthouse 90+.

### Research Flags
- Phase B: measure where pixels go at 1366x650 before cutting.
- Phase C: confirm EFF license text on eff.org; measure gzip chunk size at build.
- Phase D: measure skeleton heights; seven-link nav fit; manual password-manager and VoiceOver check.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new deps; versions and icon/API presence verified in installed packages |
| Features | MEDIUM-HIGH | Bitwarden and KeePassXC source-verified; LastPass and 1Password MEDIUM/LOW |
| Architecture | HIGH | Every integration point read from the repo |
| Pitfalls | HIGH (codebase/crypto); MEDIUM (SEO/browser) | Safari marker, find-in-page, font ligatures LOW-MEDIUM |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address
- EFF license version: CC BY 3.0 US vs 4.0 — attribution either way; confirm on eff.org in Phase C.
- Google FAQ rich-result status: keep shared JSON-LD, invest nothing further.
- Config highlighter server rendering at build time — check in Phase A; fall back to static sample.
- Safari/Firefox `<details>` find-in-page — do not promise it.
- Lighthouse baselines missing for hash/password/subnet — run on preview in Phases B and D.

## Sources

### Primary (HIGH confidence)
- Repo inspection (2026-11-11): `tools/registry.ts`, `components/ToolCard.tsx`, `lib/hooks/useKeyboardShortcut.ts`, `lib/analytics/redact.ts`, `app/tools/*/page.tsx`, `tests/e2e/*-seo.spec.ts`, `home.spec.ts`, `navigation.spec.ts`, `tools/registry.test.ts`
- `node_modules` inspection: `@radix-ui/react-collapsible`, `lucide-react` 1.25.0
- EFF Large Wordlist measured (7,776 words, ~24.5 KB gzip, 4 hyphenated entries)
- Bitwarden SDK and clients source; KeePassXC source
- `crypto.getRandomValues` 65,536-byte limit

### Secondary (MEDIUM confidence)
- LastPass generator page; zxcvbn crack-time scenarios; NIST SP 800-63B-4
- EFF wordlist announcement and copyright page; `EFForg/eff_diceware` repo
- Google FAQ documentation and deprecation notice; Mueller/Illyes statements on hidden content
- MDN `<details>`; Chrome 97 auto-expand announcement

### Tertiary (LOW confidence)
- 1Password community threads; passwordsgenerator.net
- Full removal of FAQ rich results in 2026 (third-party reports)

---
*Research completed: 2026-11-11*
*Ready for roadmap: yes, after decisions (a)–(e) are answered*
