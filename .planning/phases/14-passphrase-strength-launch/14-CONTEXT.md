# Phase 14: Passphrase, Strength & Launch - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Mode:** Autonomous smart discuss. Every Recommended answer was auto-accepted (user asked for minimal interaction). The full proposal tables are in the appendix at the end, so they can be reviewed later.

<domain>
## Phase Boundary

This phase finishes and launches `/tools/password`. It builds on the Phase 13 island, which already has Password mode, options, copy, batch, Regenerate, keyboard shortcuts and options-only URL state. It also builds on the Phase 12 `lib/password` library, which already provides passphrase generation, the lazy EFF loader, entropy, labels, crack time and the URL codec. This phase adds:

1. **Passphrase mode (PHR-01..04)**
   - A Password/Passphrase toggle.
   - Passphrase controls: words 3–20 (default 6), separator `-` `_` `.` or space, capitalize, and append number.
   - A bookmarked `?mode=passphrase` that is restored instead of dropped.
   - A lazy EFF wordlist load with an error panel and Retry, and no fallback list.
   - EFF CC BY attribution, plus an FAQ note on the list's 4 hyphenated words.
2. **Strength (STR-01..04)**, in both modes:
   - an entropy meter with a label
   - a pool-size · bits line
   - a crack-time estimate with its guess-rate assumption shown, switchable between fast-hash and slow-hash
3. **Launch (PREG-01..03)**
   - A registry entry with the `KeyRound` icon, so the tool appears in the nav, on the landing grid and in the sitemap. All seven nav links must fit at 640px. Every hard-coded tool count goes from 6 to 7.
   - Final metadata with `noindex` removed.
   - A `ToolAbout` area with a worked example, the attribution, the FAQ and FAQPage JSON-LD.
   - The final skeleton pin and a CLS gate.
   - Lighthouse 90+ on `/tools/password` and `/tools/subnet`.
   - The local release gate: typecheck, lint, unit tests, build, `test:e2e` and `test:e2e:prod`.

**Out of scope:**
- New password features (see Out of Scope in REQUIREMENTS.md).
- A "check my password" input or zxcvbn.
- Clipboard auto-clear.
- History, storage or export.
- The shared-hook WR-01/WR-02 fix.
- Any change to the strength math (Phase 12 owns it).

</domain>

<decisions>
## Implementation Decisions

### Passphrase mode, wordlist loading & URL state
- **D-01: Mode toggle.** A single-select `ToggleGroup` labelled "Mode", with the items "Password" and "Passphrase". It uses the installed `components/ui/toggle-group.tsx`, so nothing new is added.
  - It sits at the top of the tool, above the output zone, so the mode reads first.
  - Switching goes through the existing `commit(next)` path: normalize, `setOptions`, regenerate, write the URL, reset copy confirmations.
  - The fields of both modes are kept: the codec serializes everything regardless of mode, as Phase 12 D-20 specifies. Switching back restores the user's settings for that mode.
  - Toggle items are buttons or radios, so the existing global Enter guard already skips them.
- **D-02: Passphrase controls.** In Passphrase mode the options panel replaces the password-only controls (length, the four sets, symbol set, look-alikes) with:
  - **Word count:** a native range input plus a number input with a draft, using the same pattern and validation as Length (13 D-05). Bounds come from `WORDS_MIN` and `WORDS_MAX`.
  - **Separator:** a single-select `ToggleGroup` of the 4 tokens from `SEPARATORS`. The visible labels are `-` `_` `.` and "Space", and each item's accessible name is the separator's name ("Dash", "Underscore", "Dot", "Space").
  - **Capitalize words** and **Append a number:** two `Switch`es. Each hint is derived from constants, for example "adds about 3.3 bits" from `APPEND_NUMBER_BITS`.
  - **Batch:** shared by both modes and unchanged.

  The shortcuts work the same in both modes. In Passphrase mode `/` focuses the word-count number input. Enter regenerates. Ctrl/Cmd+C copies a single result. Esc resets every option to `DEFAULT_OPTIONS` but **keeps the current mode**, so pressing Esc in Passphrase mode gives the default 6-word passphrase, not a switch back to Password. This is our reading of "Esc resets to defaults" (POUT-04) for a two-mode tool.
- **D-03: URL restore.** The Phase 13 D-07 coercion of `mode` to `"password"` is removed, so `parseOptions` output is used as-is. A bookmarked `?mode=passphrase&words=8&sep=dot…` restores the mode and the passphrase options.
  - The mount-time URL rewrite keeps the mode.
  - The default URL is still bare `/tools/password`, because `serializeOptions` omits the default mode.
  - Nothing is added to the analytics allow-list. The Phase 12 D-23 redaction test already covers `mode`, `words`, `sep`, `cap` and `num`.
- **D-04: Lazy load and its state machine.** Passphrase results need the loaded list, so passphrase generation is asynchronous only on first use.
  - The island imports `loadWordlist` from `@/lib/password/wordlist`, never from the barrel. The barrel-only rule in `app/tools/password/page-guards.test.ts`, and the matching scope in `lib/password/boundaries.test.ts`, are relaxed to allow exactly this one module specifier from the island file(s). They keep banning:
    - a static or dynamic import of `wordlist/eff-large` from anywhere except `lib/password/wordlist.ts`
    - a barrel re-export of the loader
  - The island keeps the resolved list in a ref once it has loaded. After that, passphrase generation is synchronous and follows the same event-handler-only rule as password generation (13 D-02).
  - **Sequence token:** every load request takes `++seqRef.current`. A resolved or rejected load applies its result only if its token is still current, the mode is still `passphrase` and the options it was started for are the current options. Otherwise it is dropped. A slow load can therefore never overwrite a newer state.
  - **Load states in the output slot:**
    - **Loading:** a text-free pulse placeholder at the pinned hero height, plus the fixed live-region phrase "Loading word list".
    - **Error:** a `role="alert"` panel reading "Couldn't load the word list, so no passphrase was generated. Check your connection and try again." with a **Retry** button. Retry calls the memoized loader again; Phase 12 clears the memo on failure. No copy controls are rendered and no passphrase from any other source is shown.
    - **Ready:** generate and render.
  - The strength panel (D-06) renders from settings immediately, even while the list is loading or has failed, because passphrase entropy uses `EFF_WORD_COUNT`, not the loaded list (Phase 12 D-14).
- **D-05: Deliberate departure from 13 D-02, for one case only.** When the island mounts from a bookmarked `?mode=passphrase` URL, the lazy initializer cannot produce results synchronously. A mount effect starts the load (with a sequence token) and applies the first result when it resolves. This is the only effect that generates.
  - There is no prefetch on page load and no prefetch on hovering the toggle. The list loads only on first Passphrase use: either activating the toggle or mounting from a passphrase bookmark. This keeps the prod-build proof simple.

### Strength meter & crack-time display
- **D-06: The strength panel** sits directly under the output zone (hero or batch), above Options, in both modes. It describes the settings, so it covers every row in a batch. It contains:
  - **Meter:** a 4-segment bar (Weak, Fair, Strong, Very strong) with the segments `aria-hidden`. Next to it, visible text reads "{STRENGTH_LABELS[level]} · {formatBits(bits)}", for example "Very strong · 128 bits". Meaning never relies on color alone.
  - **Colors:** Weak uses the destructive token. Fair is `amber-700/amber-300`. Strong and Very strong are green, `emerald-700/emerald-300` (or the success/primary token if one exists). Contrast must hold in light and dark, under the 09-UI-SPEC accent-text rule.
  - **Level source:** `strengthLevel(bits)` on raw bits, `formatBits` for the display (Phase 12 D-16), using `passwordEntropyBits(opts)` or `passphraseEntropyBits(opts)`. It is never computed from an output string.
  - **Stability:** it is a pure derivation from `options`, so Regenerate cannot change it (STR-01). An RTL test asserts this, and so does an e2e test that regenerates 5 times.
  - **Announcements:** the panel is not a live region. Strength changes are visible but never announced, to avoid noise. The value never appears in it.
- **D-07: The pool-size · bits line (STR-02)** is rendered under the meter in muted 14px text. The format is:
  - **Password:** "{poolSize} chars · {bits}". The default shows "85 chars · 128 bits". `poolSize` comes from `resolveAlphabet(opts).poolSize`, and the 85 comes from constants, never from the stale "84" in REQUIREMENTS text.
  - **Passphrase:** "{EFF_WORD_COUNT.toLocaleString('en-US')} words × {n} · {bits}". With append number it becomes "7,776 words × 6 + 1 digit · 81 bits".

  Bits are floored (`formatBits`). Password bits use the exact inclusion–exclusion figure (Phase 12 D-15), so a short length with all sets enabled honestly shows fewer than L·log2(N) bits.
- **D-08: The crack-time line (STR-03)** reads "About {formatCrackTime(crackTimeLog10Seconds(bits, rate))} to crack, on average", followed on the same line or the next by the stated assumption taken verbatim from `GUESS_RATE_LABELS[scenario]`, for example "Fast hash, offline attack: 10 billion guesses per second".
- **D-09: The scenario switch (STR-04)** is a small single-select `ToggleGroup` labelled "Attack scenario", with the items "Fast hash" and "Slow hash (bcrypt)". The default is **fast**, the more conservative (worst-case) figure.
  - The scenario is a display preference held in local island state. It is **not** written to the URL, because the codec has no key for it and Phase 12's `PASSWORD_URL_KEYS` stays unchanged. Changing it does not regenerate.
  - Esc resets it to fast, together with the options.

### Registration, metadata & About/FAQ content
- **D-10: Registry entry**, appended to `tools/registry.ts`:
  ```
  slug "password", name "Password Generator", shortName "Password",
  category "generate", keywords ["password","passphrase","generator","diceware","eff","random"],
  icon "KeyRound", status "active", clientOnly true, featured false
  ```
  - Add `KeyRound` to `ICONS` in `components/ToolCard.tsx`; the explicit-entry unit test covers it.
  - The nav, landing grid and sitemap derive from the registry, so they need no edits.
  - Per the Phase 10 D-16 rule, the nav and the page heading stay text-only, and the icon renders only on the landing card.
  - The sort is featured first, then by name, so Password lands between MAC and Subnet among the non-featured tools.
- **D-11: Seven-link fit (PREG-01).** Extend `tests/e2e/navigation.spec.ts` so the desktop nav is asserted at both 640px and 700px wide: 7 links, no wrap (all links share one `offsetTop`), no horizontal overflow, and the logo and theme toggle still visible. The mobile drawer gets 7 links.
  - If "Password" doesn't fit at 640, the first fallback is tightening the nav link padding from `px-2.5` to `px-2` (on-scale 8px). The second is a shorter `shortName` ("Pass"). Record the measured widths in the SUMMARY.
  - Update every hard-coded count from 6 to 7: `tools/registry.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts`, `app/sitemap.test.ts`, and anything else a `grep` turns up. The navigation describe title "fits six tools" also changes.
- **D-12: Final metadata.** Remove `robots: noindex`. The page follows the Config pattern:
  - `title`: "Password & Passphrase Generator — Packetory"
  - `description`: "Generate strong random passwords and memorable EFF passphrases with a strength meter and crack-time estimate. Runs locally in your browser."
  - canonical `${SITE_URL}/tools/password`
  - `openGraph` with title, description, url and type website

  The h1 stays "Password Generator". A one-sentence muted intro under the h1 follows the Config/Hash precedent (wording at Claude's discretion; it makes no privacy claim beyond "runs locally in your browser"). The description's "Runs locally" phrase falls under the same human privacy-wording check as the FAQ (D-15).
  - Add `tests/e2e/password-seo.spec.ts`, mirroring `uuid-seo`/`config-seo`: unique title and description, canonical present, no `noindex`, the About area present, and FAQ JSON-LD parity, using `openAbout`, the about-parity helpers and the prod about parity.
- **D-13: About area.** `<ToolAbout slug="password" faqItems={faqItems}>` is rendered as the last child of `main`, as on the other tools. The page imports only server-safe barrel exports, and never the wordlist.
  - **The worked example contains no copyable password or passphrase string.** The Phase 13 prod spec asserts that the raw HTML holds no 20-character all-sets string, and a sample secret in static HTML would invite reuse.
  - Instead it walks through the math with numbers pulled from constants. Default password: 20 chars from an 85-char pool ≈ 128 bits, Very strong, plus the crack time under both scenarios. Default passphrase: 6 × log2(7,776) ≈ 77 bits, Strong, plus 3.3 bits with a digit. It uses a structural placeholder such as `word-word-word-word-word-word`.
  - The example lives in `app/tools/password/PasswordExample.tsx`, a server component.
  - **PHR-04 attribution.** It appears in two places:
    - **Full attribution** in the About area, as a "Word list" paragraph inside the worked-example disclosure. It names the EFF Large Wordlist for Passphrases (2016) by the Electronic Frontier Foundation, links the EFF article and the licence, states that the list is used unmodified with 7,776 words, and reuses the CC BY wording from the `eff-large.ts` header.
    - **A short visible credit line** in the passphrase options panel: "Words from the EFF Large Wordlist (CC BY)", with links. The About area is collapsed by default, so this keeps credit visible where the words are used.
- **D-14: FAQ data.** `app/tools/password/faq-data.ts` uses the `FaqItem` shape. Every number comes from `@/lib/password` constants or functions through template strings, and nothing is restated as a literal. A `faq-data.test.ts` asserts that the answers contain the formatted constant values: 85, 128 bits, 7,776, 77 bits, the 40/75/100 thresholds, both guess rates, `formatCrackTime` outputs and the 4 hyphenated words. Six items, in this order:
  1. **How strong is the default password?** 20 chars, 85-char pool, about 128 bits, Very strong, crack time at both rates.
  2. **How are passphrases generated?** Uniform picks with replacement from the 7,776-word EFF Large list via `crypto.getRandomValues`. Each word is about 12.9 bits. Capitalization and the separator add 0 bits; an appended digit adds about 3.3.
  3. **Why does the word list contain hyphenated words?** The 4 words drop-down, felt-tip, t-shirt and yo-yo. The list is kept unmodified. With the `-` separator a word boundary can look ambiguous; this has no practical effect on strength, and you can pick `_`, `.` or Space if you want boundaries to stay unambiguous. The wording must stay honest and must not claim the effect is exactly zero.
  4. **How are strength and crack time estimated?** Entropy is computed from your settings, not from the result. It assumes the attacker knows your settings. The 40/75/100-bit label thresholds. Average time to search half the keyspace at the stated guess rates.
  5. **Is my password sent anywhere or saved?** (privacy, human-gated, D-15)
  6. **Does Packetory clear my clipboard?** (clipboard history, human-gated, D-15)
- **D-15: Privacy and clipboard wording is drafted, then becomes a recorded human check (PREG-02).** It is **not** a blocking checkpoint. The plan ships the drafts below, built only from verifiable facts. It lists them under "Human Checks Queued" for the batched milestone UAT, together with the 12-04 `eff-large.ts` CC BY licence-wording check (the About attribution reuses that wording, so both get one review). Draft answers:
  - **Q5:** "No. Passwords and passphrases are generated in this browser tab with the Web Crypto API and are never sent to a server, written to the address bar, or saved. Only your options (length, character sets, word count and so on) appear in the URL, so you can bookmark them."
  - **Q6:** "No. A copied password sits in your system clipboard like anything else you copy, and your operating system or a clipboard-manager extension may keep it in a clipboard history that this page cannot see or clear. Paste it straight into your password manager, then copy something else or clear your clipboard history if that matters to you."

  The phrasing must not promise auto-clear, which was rejected in Phase 13. If the user later changes the wording, it is a copy-only edit to `faq-data.ts`, and the JSON-LD follows automatically.

### Launch gates: skeleton/CLS, bundle proof, Lighthouse & polish
- **D-16: Final skeleton pin.** Re-measure the settled island once the mode toggle, strength panel and passphrase controls exist. Measure at 320px and 1280px wide, in the default (password) state, with fonts loaded. Pin `PasswordToolSkeleton` to those heights, and record the "Measured (14-xx …)" line in the loader doc comment. Use the same throwaway-measurement method as 13-06.
  - The skeleton gains text-free blocks for the toggle, hero and strength panel at their measured heights.
  - Also measure passphrase mode. Keep the two modes' option panels close in height where it costs nothing, by sharing the grid rhythm. The default-load pin, however, is the gate.
- **D-17: CLS gate.** Add `tests/e2e/password-layout.spec.ts`, modelled on `hash-layout.spec.ts` (PerformanceObserver `layout-shift`, `__cls`):
  - **Default load:** skeleton height equals the settled island height within 1px, at 320px and 1280px, and cumulative CLS = 0 (≤ 0.001).
  - **`?mode=passphrase` bookmark load:** CLS < 0.1, which counts as Good. The loading placeholder reserves the hero height so the async list doesn't shift layout.
  - **Toggling modes:** may change the options panel height (user-initiated, so excluded from CLS), but must never shift the output zone above it.
- **D-18: Wordlist bundle proof (PHR-03 / SC-2).** Add `tests/e2e-prod/password-wordlist.spec.ts`, which runs against the prod build. A Playwright `page.route` on `**/_next/static/chunks/**` uses `route.fetch()` to record each JS response body.
  - **(a) After load, before any toggle:** no JS body contains a wordlist marker (a run of adjacent EFF words, e.g. `"abacus abdomen abdominal"`), and the output is a password.
  - **(b) After activating Passphrase:** exactly one new chunk contains the marker, and the output is 6 words joined by `-`.
  - **(c) Failure case:** a route aborts the first chunk containing the marker. The error panel and Retry show, no passphrase is rendered and no copy controls exist. Retry is then allowed through and a passphrase appears.

  Also extend the SSR spec: the raw HTML contains no wordlist marker and no `noindex`. A dev-mode RTL test covers the sequence-token race: resolving a stale load after a mode or option change applies nothing.
- **D-19: Lighthouse (PREG-03).** The 90+ capture on a Vercel preview for `/tools/password` and `/tools/subnet` (all four categories, mobile and desktop) is a **recorded human check for the batched milestone UAT**. It joins the deferred Phase 11 before/after capture. The agent cannot create the preview deploy. Automated proxies are planned in this phase:
  - the CLS gate (D-17)
  - the bundle proof (D-18)
  - a prod-build first-load JS figure for `/tools/password` recorded in the SUMMARY next to `/tools/uuid` and `/tools/hash`, with no regression gate beyond "the wordlist chunk is not in it"
  - unique metadata and SEO specs (D-12)
  - existing accessibility habits: labels, focus rings, 44px targets, contrast pairs
- **D-20: Phase 13 hand-offs closed here:**
  - **(a) Double-copy re-announcement gap.** Fix it locally in `PasswordTool`, without touching `lib/hooks`. Each successful copy bumps a copy sequence counter, and the live-region effect keys on that counter instead of the boolean `copied` flag, using the existing clear-then-set pattern. A same-target repeat copy within 2s is then announced again. If this turns out non-trivial, keep it as a documented accepted gap; it is not a requirement.
  - **(b) Live-region vocabulary and accessible names follow the mode.** The vocabulary gains these fixed phrases:
    - "New passphrase generated"
    - "{n} new passphrases generated"
    - "Copied all passphrases"
    - "Options reset. New passphrase generated"
    - "Loading word list"
    - "Word list loaded. New passphrase generated"

    The `StatusPhrase` union is extended, never widened to `string`. Accessible names become "Copy passphrase", "Copy passphrase 3" and "Copy all passphrases".
  - **(c) Privacy specs extend to passphrase mode.** `password-privacy.spec.ts` gains a passphrase session (toggle, Copy, Regenerate, Batch 3, Copy all, words 8, separator space). No passphrase may reach any exit surface. A passphrase is lowercase letters plus separators and is easier to match than a password, so the scan matches the full joined string.
  - **(d) Responsive specs extend to passphrase mode.** `password-responsive.spec.ts` adds a 20-word, space-separated, capitalized passphrase with a number, and a 20 × 20-word batch, at 320px in light and dark. Passphrases wrap at word boundaries (`[overflow-wrap:anywhere]`, with no `break-all` mid-word where avoidable).
  - **(e) Passphrase output coloring.** It reuses `ColoredPassword` (letters, digits, symbols), so `-` `_` `.` separators and the appended digit get the symbol and digit colors. A space separator renders as a real space. Copy writes the raw string.

### Claude's Discretion
- Component split for the new UI. Suggested files: `ModeToggle`, `PassphraseOptions`, `StrengthPanel`, `PasswordExample` and `faq-data.ts`, with helper names free.
- Exact meter segment styling, and whether the crack-time assumption sits inline or on its own line, within the 13-UI-SPEC spacing and type scale (4/8/16/24/32 only; 14/16px text; no 6/10/12px gaps).
- `formatCrackTime` phrasing around the estimate ("About …", "on average").
- Exact intro sentence under the h1, and how the worked example is laid out (table or prose).
- Whether to also fold in the open 13-UI-REVIEW Fix 4 (slider scale detached from the track) and Fix 5 (unbalanced right column) while reshaping the options panel. Both are encouraged if the shared range-input pattern is touched anyway.
- How e2e coverage is split across spec files.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/password` barrel: `generateBatch`, `generatePassphrase`/`generatePassphraseBatch(opts, words, …)`, `passwordEntropyBits`, `passphraseEntropyBits`, `strengthLevel`, `formatBits`, `crackTimeLog10Seconds`, `formatCrackTime`, `resolveAlphabet`, `parseOptions`/`serializeOptions`, `normalizeToolOptions`, `clampInt`, plus all constants:
  - bounds: `WORDS_MIN`/`WORDS_MAX`/`WORDS_DEFAULT`
  - options: `SEPARATORS`, `MODES`
  - strength: `STRENGTH_THRESHOLDS`, `STRENGTH_LABELS`, `GUESS_RATES`, `GUESS_RATE_LABELS`
  - wordlist and pool: `EFF_WORD_COUNT`, `BITS_PER_WORD`, `APPEND_NUMBER_BITS`, `EFF_HYPHENATED_WORDS`, `EFF_HYPHENATED_WORD_COUNT`, `DEFAULT_POOL_SIZE`
  - defaults: `DEFAULT_OPTIONS`
- `lib/password/wordlist.ts`: `loadWordlist()`, which is memoized, clears the memo on failure and has no fallback, and `createWordlistLoader(importer)`, a test seam for injecting a failing or slow importer in RTL tests.
- `app/tools/password/`:
  - `PasswordTool.tsx`: `commit()`, `generate()`, `writeUrl()`, `initialState()` (contains the D-07 coercion to remove), `StatusPhrase`, live region, shortcuts
  - `PasswordOptionsPanel.tsx`: the range+number draft pattern to reuse for word count
  - `PasswordOutput.tsx`, `PasswordRow.tsx` and `ColoredPassword.tsx`/`runs.ts`
  - `PasswordToolLoader.tsx`: skeleton, currently pinned `h-[980px] sm:h-[712px]`, hero `h-[124px]`
  - `password-test-utils.ts`: deterministic fill
- `components/ToolAbout.tsx` (`ToolAbout`, `FaqJsonLd`) and `lib/seo/jsonld` (`FaqItem`, `buildFaqJsonLd`). The Config page and `faq-data.ts` are the template; `ConfigExample.tsx` is the server worked-example template.
- `components/ui/toggle-group.tsx` (already used by UUID, Hash and DNS) for the mode, separator and scenario toggles. `components/ui/switch.tsx` and `input.tsx`.
- `tests/e2e/hash-layout.spec.ts` (CLS observer and skeleton-vs-island height pattern), `subnet-layout.spec.ts` (skeleton pin), `tests/e2e/helpers/about-parity.ts`, `uuid-seo.spec.ts`/`config-seo.spec.ts`, and `tests/e2e-prod/password-ssr.spec.ts`/`about-prod.spec.ts`.

### Established Patterns
- Server shell `page.tsx`, then a `"use client"` loader with `dynamic(..., { ssr: false, loading: Skeleton })`, then the island. The page never imports the island.
- Generation happens in the lazy initializer and in event handlers only. D-05 is the single passphrase-bookmark exception.
- URL is written via `history.replaceState(null, …)` with options only, never through the router and never as a fragment.
- Copy confirmation: "Copied!" for about 2s. One polite live region holds fixed phrases only, and the value never appears in it.
- The registry is the single source for nav, landing grid and sitemap (SHELL-04). Icons render only on landing cards (Phase 10 D-16). Unknown icons throw.
- Source-guard tests (`boundaries.test.ts`, `page-guards.test.ts`) use a pure `analyze()` plus in-memory mutants. Relaxing a rule needs a new mutant proving the narrowed rule still has teeth: a static import of `eff-large` from the island must still be caught, while `@/lib/password/wordlist` from the island is allowed.
- Spacing scale: 4/8/16/24/32. 44px targets. Contrast pairs `sky-700/300` and `amber-700/300`.

### Integration Points
- `tools/registry.ts` (new entry), `components/ToolCard.tsx` `ICONS` (`KeyRound`), `app/tools/password/page.tsx` (metadata, ToolAbout, intro)
- Count updates: `tools/registry.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts`, the sitemap test
- `lib/password/boundaries.test.ts` and `app/tools/password/page-guards.test.ts` (import-rule relaxation)
- The lint warning in `lib/mac/vendor.ts` and the Tailwind `.planning/` scan warning are pre-existing. Both are out of scope here, and neither should block the build.

</code_context>

<specifics>
## Specific Ideas

- Every displayed or FAQ number comes from `lib/password`: the pool is 85, not the "84" from the old requirement text (STATE blocker). STR-02's "85 chars · 128 bits" is the default-state target.
- The crack-time default is the fast-hash (worst-case) scenario. The assumption text is the constant `GUESS_RATE_LABELS` string, so the UI and the FAQ cannot drift.
- Recorded human checks for the batched milestone UAT. These are backstop truths, not blocking:
  1. Privacy and clipboard FAQ wording, plus the "Runs locally in your browser" description (PREG-02).
  2. EFF CC BY attribution wording (12-04 header + About + credit line; PHR-04).
  3. Lighthouse 90+ on a Vercel preview for `/tools/password` and `/tools/subnet`, together with the Phase 11 before/after capture (PREG-03).
  4. Password-manager, translation and VoiceOver passes in both modes. This carries over the 13-06 queue and adds the mode toggle, separator toggle and "Loading word list" announcement.
  5. The 7-link nav at 640px and 700px, checked visually in Safari.

</specifics>

<deferred>
## Deferred Ideas

- Prefetching the wordlist on hover or focus of the Passphrase toggle. Rejected for now to keep the "first use only" proof simple; revisit only if Lighthouse or UX shows a noticeable delay.
- Persisting the attack-scenario choice in the URL. It needs a codec key and a change to `PASSWORD_URL_KEYS`; not required by STR-04.
- The shared-hook WR-01/WR-02 fix (global Ctrl/Cmd+C and Esc inside About or selected text). It remains a separate quick task.
- Exact inclusion–exclusion entropy surfaced in the FAQ "only if challenged" (Future Requirements), related-tool links, a per-tool accessibility re-audit, and a build-time OUI dataset.
- A Tailwind `@source not` exclusion for `.planning/` to silence the optimizer warning.

</deferred>

---

## Auto-accepted proposals (review later)

The user asked for minimal interaction, so every ✅ Recommended answer below was accepted without asking. To change a decision, edit the matching D-xx above before planning, or tell the orchestrator.

### Grey Area 1/4: Passphrase mode, wordlist loading & URL state

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|-----------------|
| 1 | Toggle control and placement? | `ToggleGroup` "Password / Passphrase" above the output. It uses the installed component with no new dependency, and the mode reads first (D-01). | Tabs-style segmented control inside the Options section; a `Switch` "Passphrase mode" (weaker semantics for two named modes) |
| 2 | What does Esc do in Passphrase mode? | Resets all options to defaults but keeps the current mode. Less surprising, and it avoids flipping back to Password (D-02). | Reset to `DEFAULT_OPTIONS` including `mode: "password"` (literal POUT-04 reading); reset only the current mode's fields |
| 3 | How does a bookmarked `?mode=passphrase` produce its first result? | A mount effect with a sequence token loads the list, then generates. This is the single documented exception to "generate only in handlers" (D-05). | Show the Password result first, then swap (bad CLS, confusing); show "Load passphrase" until the user clicks (violates zero-effort default) |
| 4 | When does the wordlist load? | Only on first Passphrase use (toggle or bookmark). No prefetch (D-04/D-05). | Prefetch on hover/focus of the toggle; prefetch on idle after load (would weaken the PHR-03 "first use" proof) |

### Grey Area 2/4: Strength meter & crack-time display

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|-----------------|
| 1 | Where does strength appear? | One settings-level panel under the output, above Options, in both modes. It is stable across Regenerate and batch rows (D-06). | Per-row badges (redundant, since strength is settings-based); inside the Options panel (loses its link to the result) |
| 2 | Meter visual and semantics? | 4-segment bar (`aria-hidden`) + visible "Label · N bits" text. Color is never the only cue. Destructive/amber/emerald tokens (D-06). | Native `<meter>` (inconsistent cross-browser styling); continuous bar scaled to 128 bits |
| 3 | Pool line format? | "85 chars · 128 bits" / "7,776 words × 6 · 77 bits" (+ "+ 1 digit"). All values from constants (D-07). | "Pool 85 · Entropy 128 bits"; show unfloored decimals (conflicts with Phase 12 `formatBits`) |
| 4 | Scenario switch default and persistence? | `ToggleGroup` "Fast hash / Slow hash (bcrypt)". Default fast (worst case). Local state, not in the URL, Esc resets it (D-09). | Default slow (flattering numbers); persist in the URL via a new codec key (changes the Phase 12 contract); show both rows at once with no switch (doesn't match STR-04's "switch") |

### Grey Area 3/4: Registration, metadata & About/FAQ content

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|-----------------|
| 1 | Registry shape and nav label? | name "Password Generator", shortName "Password", category generate, featured false, icon `KeyRound`. Padding fallback, then "Pass" if 640px overflows (D-10/D-11). | shortName "Passwords"; featured true (would reorder the nav and landing grid) |
| 2 | Worked example content? | Math walkthrough with constants and a structural placeholder. **No sample password string in the HTML**, which keeps the 13 SSR leak spec valid (D-13). | A fixed sample password/passphrase (breaks the SSR no-password assertion and invites reuse); a live client-rendered example (adds JS to About) |
| 3 | Where does the EFF CC BY attribution live? | Full attribution in the About worked-example disclosure, plus a short visible credit line in the passphrase options (D-13). | About only (collapsed by default, so less visible); site footer (not tool-scoped) |
| 4 | How is the human-gated privacy/clipboard wording handled? | Ship honest, fact-only drafts and record a human check for the batched milestone UAT. Not a blocking checkpoint (D-15). | Blocking checkpoint mid-phase (against the user's batched-UAT run mode); omit the privacy and clipboard FAQ items until approved (fails PREG-02/SC-4 content) |

### Grey Area 4/4: Launch gates, skeleton/CLS, bundle proof & polish

| # | Question | ✅ Recommended | Alternative(s) |
|---|----------|---------------|-----------------|
| 1 | Skeleton pin target? | Default password state at 320/1280 after all new UI exists. Passphrase loading reserves the hero height. Bookmark CLS < 0.1 (D-16/D-17). | Pin to the taller of the two modes (gap below the content on default load); mode-aware skeleton reading the URL (needs client JS before the island, defeating the static skeleton) |
| 2 | How to prove the wordlist is absent from initial JS? | Prod e2e `page.route` + `route.fetch` body scan for an EFF word-run marker before and after the toggle, plus an abort-then-Retry case (D-18). | Parse `.next` build manifests in a unit test (brittle across Next versions); check chunk sizes only (doesn't prove content) |
| 3 | Lighthouse 90+ gate? | Recorded human check on a Vercel preview at the batched milestone UAT, plus automated proxies: CLS, bundle proof, first-load JS figure, SEO specs (D-19). | Run local `lighthouse` CLI (would need a new dev dependency; locked "no new deps"); block the phase until a preview exists |
| 4 | Phase 13 double-copy re-announce gap? | Fix it locally with a copy sequence counter driving the live region. `lib/hooks` unchanged; it falls back to an accepted gap if non-trivial (D-20a). | Leave it as an accepted gap; fix it in the shared `useCopyToClipboard` hook (affects all tools, outside scope) |

**Departures from requirement or roadmap text (flagged):**
- **D-02:** Esc keeps the current mode instead of resetting `mode` to the default. This is our reading of POUT-04 for a two-mode tool.
- **D-05:** One mount effect generates, for passphrase bookmarks only. This departs from 13 D-02 "results change only in event handlers".
- **D-07:** The STR-02 example uses 85 chars (from constants), not the "84" in the old requirement text, per the STATE blocker.
- **D-15/D-19:** PREG-02's human approval and PREG-03's Lighthouse capture are recorded human checks at the batched milestone UAT, not in-phase gates, per the user's run mode.

**New dependencies:** none. Everything uses installed components (`toggle-group`, `switch`, `input`), lucide's `KeyRound`, and existing Vitest and Playwright. This honours the v1.3 locked decision "no new runtime or dev dependencies".
