# Phase 14: Passphrase, Strength & Launch - Research

**Researched:** 2026-11-11
**Domain:** Next.js 16 (App Router, Turbopack prod build) client island state machine + lazy wordlist chunk, Radix ToggleGroup UI, shared About/FAQ/JSON-LD SEO, Playwright CLS and bundle-proof specs
**Confidence:** HIGH (most findings were verified empirically against a throwaway prod build of this repo in the scratchpad, and by reading the in-repo sources this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Copied verbatim in substance from `14-CONTEXT.md` `## Implementation Decisions` (D-01..D-20). The planner MUST read `14-CONTEXT.md` for the full text. Headline locks:

- **D-01** Mode is a single-select `ToggleGroup` labelled "Mode" (items "Password" / "Passphrase"), above the output zone, from the installed `components/ui/toggle-group.tsx`. Switching goes through `commit(next)`. Both modes' fields are kept (codec serializes everything).
- **D-02** Passphrase controls replace the password-only controls: word count (range + number draft, `WORDS_MIN`/`WORDS_MAX`), separator `ToggleGroup` from `SEPARATORS` (accessible names Dash/Underscore/Dot/Space), Capitalize and Append-number `Switch`es with hints from constants, shared Batch. `/` focuses word count; Esc resets to `DEFAULT_OPTIONS` but KEEPS the current mode.
- **D-03** The Phase 13 D-07 coercion of `mode` to `"password"` is removed; `?mode=passphrase` restores. Default URL stays bare. Nothing is added to the analytics allow-list.
- **D-04** Island imports `loadWordlist` from `@/lib/password/wordlist` (never the barrel). The barrel-only guard is relaxed for exactly that specifier from the island file(s). Sequence token on every load request; loading placeholder + "Loading word list"; error panel `role="alert"` with Retry; no fallback list; the strength panel renders from settings even while loading/failed.
- **D-05** One mount effect starts the load for a `?mode=passphrase` bookmark (the only effect that generates). No prefetch, no hover prefetch.
- **D-06..D-09** Strength panel under the output zone in both modes: 4-segment `aria-hidden` meter + visible "{label} · {bits}", pool line, crack-time sentence + `GUESS_RATE_LABELS` assumption, "Attack scenario" `ToggleGroup` (fast default, local state, not in URL, Esc resets). Strength math is never changed (Phase 12 owns it).
- **D-10/D-11** Registry entry (slug `password`, "Password Generator", shortName "Password", category generate, `KeyRound`, featured false, clientOnly true); `KeyRound` added to `ICONS`; seven nav links must fit at 640px; every hard-coded count 6 -> 7.
- **D-12** Final metadata (title "Password & Passphrase Generator — Packetory", description, canonical, openGraph), `noindex` removed, `password-seo.spec.ts`.
- **D-13/D-14/D-15** `ToolAbout` with a server-component worked example (NO copyable password/passphrase string), EFF CC BY attribution in two places, six FAQ items built from constants, privacy/clipboard wording drafted then queued as a recorded human check (not a blocking checkpoint).
- **D-16/D-17** Final skeleton pin measured at 320/1280 in the default password state; `password-layout.spec.ts` (default CLS <= 0.001 and skeleton height within 1px; `?mode=passphrase` bookmark CLS < 0.1; mode toggle never shifts the output zone).
- **D-18** `tests/e2e-prod/password-wordlist.spec.ts` (a)/(b)/(c) via `page.route` on `**/_next/static/chunks/**` + `route.fetch()`; SSR spec extended; dev RTL race test.
- **D-19** Lighthouse 90+ on a Vercel preview is a recorded human check; automated proxies (CLS gate, bundle proof, first-load JS figure, SEO specs, a11y habits) are planned in this phase.
- **D-20** Hand-offs closed here: (a) double-copy re-announce fix, local to `PasswordTool` (accepted-gap fallback allowed), (b) live-region vocabulary + accessible names follow the mode (`StatusPhrase` extended, never `string`), (c) privacy spec extended to passphrase mode, (d) responsive spec extended, (e) `ColoredPassword` reused for passphrases.

### Claude's Discretion
Component split (suggested `ModeToggle`, `PassphraseOptions`, `StrengthPanel`, `PasswordExample`, `faq-data.ts`); meter segment styling and assumption placement within the 13-UI-SPEC scale (4/8/16/24/32; 14/16px text); `formatCrackTime` phrasing around the estimate; intro sentence and worked-example layout; whether to fold in 13-UI-REVIEW Fix 4 and Fix 5 (UI-SPEC already folds both in); how e2e coverage is split across spec files.

### Deferred Ideas (OUT OF SCOPE)
Wordlist prefetch on hover/focus; persisting the attack scenario in the URL; the shared-hook WR-01/WR-02 fix (global Ctrl/Cmd+C and Esc inside About or selected text); exact inclusion-exclusion entropy in the FAQ; related-tool links; per-tool a11y re-audit; build-time OUI dataset; a Tailwind `@source not` exclusion for `.planning/`. Also out of scope: new password features, "check my password"/zxcvbn, clipboard auto-clear, history/storage/export, any change to the strength math.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHR-01 | Password/Passphrase toggle; default 6 EFF words joined by `-` | Island state machine (Pattern 1), ToggleGroup pattern (Pattern 3), `generatePassphraseBatch(opts, words, count)` |
| PHR-02 | Word count 3-20, separator, capitalize, append number | Range+draft pattern reused from Length; `SEPARATORS`, `WORDS_MIN/MAX`; UI-SPEC Passphrase options |
| PHR-03 | Wordlist lazy (not in initial JS), error + Retry, no fallback | Verified chunk split + marker scan (Pattern 2); **Retry must reload on ChunkLoadError (Pitfall 1)** |
| PHR-04 | EFF CC BY attribution in About + FAQ mention of 4 hyphenated words | `PasswordExample` server component, `faq-data.ts`, `EFF_HYPHENATED_WORDS`; header wording in `eff-large.ts` |
| STR-01 | Meter + bits + label from settings, stable across Regenerate | Pure `StrengthPanel` from `passwordEntropyBits`/`passphraseEntropyBits`/`strengthLevel`/`formatBits` |
| STR-02 | Pool-size · bits line | `resolveAlphabet(opts).poolSize` (85), `EFF_WORD_COUNT` |
| STR-03 | Crack time with visible assumption | `crackTimeLog10Seconds` + `formatCrackTime` + `GUESS_RATE_LABELS` |
| STR-04 | Fast/slow scenario switch | Local-state `ToggleGroup`, `GUESS_RATES` |
| PREG-01 | Nav/landing/sitemap with `KeyRound`; seven links fit at 640px | Registry entry; **measured 0px slack at 640 (Pitfall 3)**; order claim in CONTEXT is wrong (Pitfall 2) |
| PREG-02 | Unique metadata, worked example, FAQ in `ToolAbout`; FAQ numbers from constants; privacy wording human-approved | Config page + `faq-data.ts` pattern; `pages-about.test.ts` needs a `password` entry |
| PREG-03 | Lighthouse 90+ on password + subnet; no layout shift on load (pinned skeleton) | CLS e2e (Pattern 5), advisory local Lighthouse via `npx` (Open Question 5), human Vercel capture |
</phase_requirements>

## Summary

Phase 14 adds no new libraries. Almost every mechanism is already present in the repo: `lib/password` provides generation, entropy, labels, crack time and the lazy loader; the island already has `commit()`, the live region and the keyboard shortcuts; `ToolAbout`, `FaqItem` and `faq-data.ts` give the SEO/About pattern; `hash-layout.spec.ts` gives the CLS observer. The research therefore concentrated on four places where the locked decisions meet real tooling behaviour, and I verified them against a throwaway production build of this repo (copied to the scratchpad, never committed).

Findings that change the plan: (1) **Turbopack's production runtime caches a failed chunk load forever**, so D-04's "Retry calls the memoized loader again" cannot recover from a real network failure in a prod build; Retry must reload the page when the failure is a `ChunkLoadError` (the options live in the URL, so the reload path is the existing D-05 bookmark path). (2) The wordlist is correctly its own 62,303-byte chunk, absent from the initial 18 scripts, and the marker scan approach in D-18 works exactly as specified. (3) With the new entry the nav has **0px of slack at 640px** (it fits, but by exactly the available width), so the `px-2` fallback should be applied proactively. (4) CONTEXT/UI-SPEC say Password sorts "between MAC and Subnet"; the real sort puts it **last** (after MAC), because Subnet is featured. (5) `lib/password/boundaries.test.ts` already scopes the loader rule to `lib/` only, so it needs essentially no relaxation; only `page-guards.test.ts` does.

**Primary recommendation:** Build in this order: island passphrase state machine + strength panel + guards, then About/FAQ/metadata, then registry/nav/counts (advertise last), then skeleton pin + CLS/bundle specs, then the release gate. Make Retry reload on `ChunkLoadError`, apply `px-2` to nav links proactively, and keep the Lighthouse Vercel capture a recorded human check.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Password/passphrase generation (randomness, wordlist pick) | Browser / Client | — | Must never run on the server or it bakes a secret into static HTML (13 Pitfall 1); runs only in the `ssr:false` island |
| Wordlist delivery (lazy chunk) | CDN / Static | Browser / Client | The 62 KB chunk is a hashed static asset fetched on first Passphrase use; the browser owns the memo/retry |
| Strength meter, pool line, crack time | Browser / Client | — | Pure derivation from `options` + local `scenario`; never from output |
| URL options state (`?mode=…`) | Browser / Client | — | Raw `history.replaceState`, options only |
| Metadata, JSON-LD, About/FAQ/worked example | Frontend Server (SSR/static) | — | Server components rendered at build; no client JS; JSON-LD built from the same `faqItems` |
| Registry -> nav / landing grid / sitemap | Frontend Server (SSR/static) | Browser / Client (`SiteHeader` is `"use client"` for `usePathname`) | Single source `tools/registry.ts` |
| Skeleton (pinned heights) | CDN / Static (prerendered HTML) | — | Text-free server HTML that reserves the island height |
| Lighthouse capture | Human / Vercel preview | Local advisory proxy | Agent cannot create a preview deploy |

## Standard Stack

No new runtime or dev dependencies (v1.3 locked decision). Everything below is already installed. [VERIFIED: `package.json` read this session]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.11 | App Router, Turbopack prod build | Locked stack |
| `react` / `react-dom` | 19.2.8 | Island state machine | Locked stack |
| `radix-ui` | ^1.6.4 | `ToggleGroup` (Mode, Separator, Attack scenario), `Switch` | Already wrapped by `components/ui/toggle-group.tsx`, `switch.tsx` |
| `lucide-react` | ^1.25.0 | `KeyRound` (landing card), `TriangleAlert`, `RefreshCw` | `KeyRound`, `TriangleAlert`, `RefreshCw` all resolve as exports [VERIFIED: `node -e "require('lucide-react')"` -> object, object, object] |
| `lib/password` (in-repo) | — | Everything strength/generation/URL | Phase 12 |
| `lib/seo/jsonld` (in-repo) | — | `FaqItem`, `buildFaqJsonLd`, `serializeJsonLd` | Phase 10 |

### Supporting (tests)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` + jsdom + `@testing-library/react` | 4.1.10 / 16.3.2 | RTL race/state tests, source-guard tests | Unit gate `npm test` |
| `@playwright/test` | 1.61.1 | Dev e2e and prod e2e | `npm run test:e2e`, `npm run test:e2e:prod` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reload-on-ChunkLoadError Retry | Move the wordlist to a fetched static asset (`fetch()` + retry) | Retries natively, but reverses a Phase 12 lock ("no fetch, no `public/` asset"), adds a network call path the guards ban, and a second asset to cache. Not recommended |
| Local advisory Lighthouse via one-off `npx --yes lighthouse@latest` | Add `lighthouse` as a devDependency | Locked "no new deps"; one-off `npx` adds nothing to `package.json` (see Open Question 5) |

**Installation:** none.

**Version verification:** `npm view lighthouse version` -> 13.6.0 (used only as an advisory one-off, not installed). [VERIFIED: npm registry]

## Package Legitimacy Audit

No package is added to `package.json` in this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `lighthouse` (optional, `npx` one-off only) | npm | long-established (Google Chrome Labs) | very high | github.com/GoogleChrome/lighthouse | not run through the seam; well-known first-party tool | Optional advisory only; `[ASSUMED]` status for legitimacy, so the planner gates it behind the user's yes (Open Question 5) and never adds it to `package.json` |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none (the planner may add a `checkpoint:human-verify` before the optional `npx` run, since it downloads a package at run time)

## Architecture Patterns

### System Architecture Diagram

```
Browser URL ?mode=passphrase&words=8...            (bookmark)           user clicks "Passphrase"
        |                                                                   |
        v                                                                   v
 page.tsx (server, static) --> text-free skeleton (pinned height) --> PasswordToolLoader (dynamic, ssr:false)
                                                                            |
                                                                            v
                                          PasswordTool island (lazy initializer: parseOptions, NO coercion)
                                                    |                                   |
                       mode=password -> generateBatch (sync)          mode=passphrase, list not in ref
                                                    |                                   |
                                                    |                   gen.status = "loading"  (placeholder, live: "Loading word list")
                                                    |                                   |
                                                    |            requestLoad(): token = ++seqRef ; loadWordlist()  <-- 62 KB chunk (CDN)
                                                    |                                   |
                                                    |              +--------------------+---------------------+
                                                    |              | resolve                                  | reject
                                                    |      token still current?                       token still current?
                                                    |        yes -> wordsRef = list                     yes -> status "wordlist-error"
                                                    |           generatePassphraseBatch (sync)            (role=alert panel + Retry)
                                                    |        no  -> drop                                  Retry: ChunkLoadError -> reload page
                                                    v                                                           else -> requestLoad() again
                                   PasswordOutput (exactly one of hero | batch | crypto error | loading | wordlist error)
                                                    |
        StrengthPanel (pure: options + scenario) <--+   (renders in EVERY output state)
        Options panel (mode-specific)  |  live region (fixed phrases only)  |  writeUrl(options) via replaceState

Server-rendered, no JS:  ToolAbout( PasswordExample , faqItems )  -->  one FAQPage JSON-LD built from the same faqItems
Registry (tools/registry.ts) --> SiteHeader nav | landing grid (ToolCard ICONS) | sitemap
```

### Recommended Project Structure
```
app/tools/password/
├── page.tsx                  # server: metadata, h1, intro, loader, <ToolAbout>
├── faq-data.ts               # 6 FaqItems from lib/password constants (server-safe, barrel only)
├── PasswordExample.tsx       # server worked example, NO sample secret
├── PasswordToolLoader.tsx    # skeleton re-pinned in this phase
├── PasswordTool.tsx          # island: mode-aware generate(), load state machine, copy seq
├── reload.ts                 # tiny `reloadPage()` helper so tests can mock it (Pitfall 1)
├── ModeToggle.tsx  PassphraseOptionsPanel.tsx  StrengthPanel.tsx  toggle-classes.ts
├── PasswordOptionsPanel.tsx  # password options, reflowed (Fix 4/5)
├── PasswordOutput.tsx  PasswordRow.tsx  ColoredPassword.tsx  runs.ts
└── *.test.tsx / page-guards.test.ts / faq-data.test.ts
tests/e2e/  password-seo.spec.ts  password-layout.spec.ts  (+ extended privacy/responsive/keyboard/url specs)
tests/e2e-prod/  password-wordlist.spec.ts  (+ extended password-ssr.spec.ts)
```

### Pattern 1: Load state machine with a sequence token (D-04/D-05)

**What:** `commit()` is the single choke point for every option/mode change. Make it also the single place that invalidates any in-flight load: `const token = ++seqRef.current`. A load result is applied only if `token === seqRef.current`. Because every mode, option and Esc change goes through `commit()`, token equality already implies "mode still passphrase and options unchanged", so the explicit options comparison in D-04 is satisfied without comparing objects (keep a cheap `mode === "passphrase"` defensive check).

**Rules that avoid real bugs:**
- Read the current generation counter from a `generationRef`, not from `gen.generation` in the `.then` closure (a closure captured at request time is stale by resolve time). Do not generate inside a `setState` updater (StrictMode double-invokes updaters, and generation must stay in event handlers/callbacks).
- Put the "loading" status into the **lazy initializer** (`initialState()`), then let the mount effect only *start* the load. Then the effect never calls `setState` synchronously (`react-hooks/set-state-in-effect`), and the initializer stays side-effect-free under StrictMode.
- The mount effect's cleanup does `seqRef.current++`. Under StrictMode (dev) the effect runs, cleans up, runs again: the first request's token is invalidated and the second applies; the loader's memo returns the same in-flight promise, so there is no second chunk fetch.
- A commit while the list is still loading (user changes word count) calls `requestLoad(next)` again (new token, same memoized promise), so the *eventual* result uses the *new* options and the old continuation is dropped (UI-SPEC E3-loading).
- Announce "Loading word list" only on load *start* (toggle, bookmark mount, Retry), not on every option change during loading. During loading, Esc/batch commits must NOT announce "New passphrase generated" (nothing has been generated); the eventual "Word list loaded. New passphrase generated" covers it.
- Handle both settle paths: `.then(onOk, onErr)`; do not leave a rejection unhandled. Keep `lastLoadErrorRef` (no re-render needed) so Retry can choose its mechanism.
- Add `status: "ready" | "loading" | "wordlist-error"` to `Generated` (kept separate from `GenError`) so `PasswordOutput` renders exactly one of five states.

**Example (shape, not final code):**
```ts
// Source: derived from app/tools/password/PasswordTool.tsx lines 118-204 + lib/password/wordlist.ts lines 15-37
function requestLoad(opts: ToolOptions, announceStart: boolean) {
  const token = ++seqRef.current;
  if (announceStart) announce("Loading word list");
  loadWordlist().then(
    (list) => {
      if (token !== seqRef.current || opts.mode !== "passphrase") return; // stale: drop
      wordsRef.current = list;
      applyGenerated(generate(opts, ++generationRef.current, list));
      announce("Word list loaded. New passphrase generated");
    },
    (err) => {
      if (token !== seqRef.current) return;                               // stale failure: drop
      lastLoadErrorRef.current = err;
      applyGenerated({ results: [], error: null, status: "wordlist-error", generation: ++generationRef.current });
    },
  );
}
```
`generate(opts, generation, list)` branches on `opts.mode`: password -> `generateBatch`, passphrase -> `generatePassphraseBatch(opts, list, opts.batch)`; every throw maps as today (`WordlistIntegrityError` -> `"unexpected"`).

### Pattern 2: Proving the wordlist is out of initial JS (verified empirically)

**What I verified** (throwaway copy of the repo, `next build` with Turbopack, `next start`, Playwright chromium): [VERIFIED: scratchpad prototype, outputs below]
- The build emitted exactly one chunk containing the list: `.next/static/chunks/3cxtvbdyb3mnp.js`, 62,303 bytes. The 33 other chunks and `.next/server` do not contain it.
- The contiguous marker `abacus abdomen abdominal` exists verbatim in that chunk (output of `grep -o "abacus abdomen abdominal.\{0,40\}"`: `abacus abdomen abdominal abide abiding ability ablaze able abnor`). The header comments are stripped by the build, so the marker only matches the data string.
- With `page.route("**/_next/static/chunks/**", …)` + `route.fetch()` + `route.fulfill({ response, body })`, a default `/tools/password` load saw **18 JS chunk responses, 0 containing the marker**. After calling the loader, exactly **1 new** chunk response arrived and it contained the marker (62,303 bytes).
- JS chunks are plain `/_next/static/chunks/<hash>.js` (no query string), `assetPrefix` is empty. Filter to `.js` (CSS also lives under `chunks/`).

**Spec shape (D-18):**
```ts
// Source: verified probe in scratchpad (probe.mjs), same API as tests/e2e-prod
const MARKER = "abacus abdomen abdominal";
await page.route("**/_next/static/chunks/**", async (route) => {
  const url = route.request().url();
  if (!/\.js(\?|$)/.test(url)) return route.continue();
  const res = await route.fetch();
  const body = await res.text();
  seen.push({ url, hasMarker: body.includes(MARKER) });
  await route.fulfill({ response: res, body });
});
```
For (c), count marker-bearing fetches and `route.abort()` only the first (`blocked === 0`); route handlers survive `page.reload()`, so the allowed second request succeeds after Retry reloads (Pitfall 1).

`page.on("response")` + `response.text()` would also do for (a)/(b); keep `route` because (c) needs it.

### Pattern 3: ToggleGroup usage (single-select, never deselect)

Follow `app/tools/hash/OutputToolbar.tsx`: `type="single" variant="outline" value={…} onValueChange={…} aria-labelledby={labelId}` and ignore Radix's `""` deselect (`if (next !== "x" && next !== "y") return`). Items are Radix `role="radio"` buttons, so the global Enter guard `isInteractiveTarget` (`closest('button, [role="button"], [role="radio"], a[href], summary')`) already skips them [VERIFIED: `lib/hooks/useKeyboardShortcut.ts` line 66, quote: `target.closest('button, [role="button"], [role="radio"], a[href], summary') !== null`].

The base `toggleVariants` item is `h-8 min-w-8 px-2.5` and selected text from Hash is `text-primary`. Use one shared `TOGGLE_ITEM_CLASS` (UI-SPEC) so the three groups share the 44px target, `px-4`, and the contrast fix. I recomputed the contrast: selected `text-primary` on `bg-primary/10` is **3.27:1** (fails AA at 14px), `cyan-700` (#0e7490) is **4.76:1**, dark `primary` is **9.72:1**; meter fills on white: destructive 4.83, amber-700 5.02, emerald-700 5.48. [VERIFIED: computed with the WCAG formula this session]. `cn()` (tailwind-merge) resolves `px-4`/`h-11`/`min-w-11`/`data-[state=on]:bg-primary/10` over the base classes.

For a toggle group that must wrap at 320px add `flex-wrap` to the Root (it is `flex w-fit flex-row`; `w-fit` still shrinks to the parent so items wrap).

### Pattern 4: StrengthPanel is a pure derivation (STR-01)

```tsx
// Source: lib/password/entropy.ts, crack-time.ts, constants.ts (read this session)
const bits = options.mode === "password" ? passwordEntropyBits(options) : passphraseEntropyBits(options);
const level = strengthLevel(bits);                              // raw bits, never rounded
const label = `${STRENGTH_LABELS[level]} · ${formatBits(bits)}`; // "Very strong · 128 bits"
const t = formatCrackTime(crackTimeLog10Seconds(bits, GUESS_RATES[scenario]));
```
Do NOT wrap in `useMemo` (page-guards ban `useMemo` in every non-test file under the page folder; the cost is microseconds: at most 16 inclusion-exclusion terms). Rendered values verified this session via `jiti` against the real library: password 128.0598 bits -> "128 bits" `veryStrong`, pool 85; passphrase 77.5489 -> "77 bits" `strong`; with number 80.8708 -> **"80 bits"** (CONTEXT says 81; UI-SPEC's correction to 80 is right, `formatBits` floors) `strong`. Crack times: password fast and slow "more than a trillion years"; passphrase fast "350 thousand years", slow "350 billion years"; passphrase+number fast "3 million years", slow "more than a trillion years". `BITS_PER_WORD.toFixed(1)` = "12.9", `APPEND_NUMBER_BITS.toFixed(1)` = "3.3". The crack sentence builder needs the "about"/"less than"/"more than" rule from UI-SPEC and its own unit test.

### Pattern 5: CLS + skeleton gates (D-16/D-17)

Reuse the `hash-layout.spec.ts` observer verbatim (`addInitScript`, `PerformanceObserver({type:"layout-shift", buffered:true})`, accumulate `!hadRecentInput`, wait for 500 ms stability, `await page.evaluate(() => document.fonts.ready)`) [VERIFIED: `tests/e2e/hash-layout.spec.ts` read this session]. Differences for this phase:
- Read the pinned heights from `PasswordToolLoader.tsx` by regex **anchored on the `data-testid="password-skeleton"` element's className**: the new skeleton has several inner height classes (mode row, hero, strength panel) so Hash's un-anchored "first base-height plus sm-height class pair" regex would match the wrong element.
- D-17 asks for "within 1px"; Hash used 4px and a multiple-of-4 rule. The pin does not have to be a multiple of 4: pin `Math.round(measured)` (e.g. 977.9 -> 978). Measured heights are fractional because of 1.4 line-heights (19.6px lines), so 1px is achievable but unforgiving; run the gate with `--repeat-each=5` once before committing. If CLS flakes above 0.001 and the cause is font-swap in the (server-rendered) About text rather than skeleton mismatch, relax to the Hash bound (< 0.01) and record why.
- Passphrase bookmark: assert CLS < 0.1 after the hero is visible (the loading block reserves hero height; the skeleton is still pinned to the password default, so the delta is the options-panel height difference).
- Mode toggle: read `getBoundingClientRect().top` of `password-output-zone` before and after clicking the toggle (list already loaded, wait for the hero) and assert equality (the mode row above is a fixed 44px row).
- A passphrase hero at 320px wraps to 2-4 lines depending on the random words (Pitfall 9), so the loading block can only be a close estimate; the gate is correctly CLS < 0.1, not equality.

### Pattern 6: About/FAQ/JSON-LD parity (Phase 10)

Copy `app/tools/config/page.tsx`: `metadata` with `title`, `description`, `alternates.canonical`, `openGraph {title, description, url, type: "website"}`; `<ToolAbout slug="password" faqItems={faqItems}><PasswordExample /></ToolAbout>` as the LAST child of `main`. `FaqJsonLd` is the only JSON-LD emitter (a structural test in `app/tools/pages-about.test.ts` forbids page-local JSON-LD/`FAQPage`/`dangerouslySetInnerHTML`). Parity is checked by `expectServerAboutParity` (JS disabled): exactly one `<script type="application/ld+json"` in raw HTML, no `<details … open>`, example before faq, `main > about-tool:last-child`, >= 4 FAQ items, `parsed.mainEntity[i].name/text` equal to the rendered `<p>` `textContent().trim()` item for item, example text length > 20. Therefore: FAQ answers are plain strings (no JSX, no entities that differ between `textContent` and JSON); attribution **links live in `PasswordExample`**, not in FAQ answers. Both `tests/e2e/about.spec.ts` and `tests/e2e-prod/about-prod.spec.ts` iterate registry slugs, so registering the tool auto-enrolls it in both. [VERIFIED: files read this session]

### Anti-Patterns to Avoid
- **Calling Retry's loader again and expecting recovery in a prod build** (Pitfall 1).
- **Registering the tool before the island and About are finished.** The registry feeds `about.spec`/`about-prod`/`pages-about.test`, nav, grid and sitemap at once; ROADMAP says the tool should only be advertised once complete.
- **Computing `strengthLevel` from `formatBits`'s string or from the output.**
- **`typeof window` guard in the island, `useMemo`, `title=` attribute, `fetch(`, `console.`** (all banned by `page-guards.test.ts` for non-test files in the page folder).
- **A sample password/passphrase string in the server HTML** (breaks the prod SSR leak scan and invites reuse).
- **Splitting `-`-joined passphrases in tests naively** (Pitfall 5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Strength/entropy/crack-time/label math | Any new formula | `passwordEntropyBits`, `passphraseEntropyBits`, `strengthLevel`, `formatBits`, `crackTimeLog10Seconds`, `formatCrackTime`, `GUESS_RATE_LABELS` | Phase 12 owns it and tests it; FAQ and UI must not drift |
| Mode/separator/scenario selectors | Custom radio buttons | `components/ui/toggle-group.tsx` (Radix) | Roving focus, `role=radio`, already guard-compatible |
| Wordlist memo/dedupe/clear-on-fail | A second cache in the island | `loadWordlist()` + a sequence token | The loader already dedupes in-flight loads and clears the memo on failure |
| FAQPage JSON-LD | A page-local `<script>` | `ToolAbout` -> `FaqJsonLd` -> `buildFaqJsonLd` | Structural test forbids anything else; `<` is escaped |
| URL options codec | Manual query strings | `parseOptions`/`serializeOptions` + `history.replaceState(null, …)` | Hostile-URL clamping and key order are owned by Phase 12 |
| CLS measurement | Lighthouse in the gate | `PerformanceObserver` `layout-shift` as in `hash-layout.spec.ts` | Deterministic, no dependency |
| Chunk scanning | Parsing `.next` manifests | `page.route` + `route.fetch()` body scan | Verified to work on Next 16.2.11 Turbopack; manifest layout is version-fragile |
| Random words/digit | Any RNG | `generatePassphraseBatch(opts, words, count)` | Rejection-sampled `randomInt`; refuses a list that is not exactly 7,776 |

**Key insight:** the phase is integration work. Anything that re-implements a Phase 12 or Phase 10 primitive is a defect.

## Runtime State Inventory

Not a rename/refactor/migration phase. Omitted per the template.

## Common Pitfalls

### Pitfall 1: Retry cannot recover from a ChunkLoadError in a Turbopack prod build (VERIFIED, contradicts D-04's mechanism)
**What goes wrong:** The first import of the wordlist chunk fails (network drop, aborted request). `loadWordlist` clears its memo as designed, but the second `import("./wordlist/eff-large")` returns the **same rejected promise** from the Turbopack runtime without issuing any request.
**Why it happens:** The Turbopack prod runtime keeps module-chunk promises in module-level maps (`_`/`E`) and a per-promise `WeakMap`, and never evicts a rejection. Evidence: in `.next/static/chunks/turbopack-*.js` the loader code stores `_.set(n,r)` / `E.set(e,n)` and wraps the failure as `ChunkLoadError`. Empirical result (probe2.mjs, route allows the chunk after the first abort): call 0 `fail:ChunkLoadError`, call 1 `fail:ChunkLoadError`, call 2 `fail:ChunkLoadError`, **chunk requests so far: 1** (no retry request was ever made); after `page.reload()` the same call returned `ok:7776`.
**How to avoid:** Retry handler: if `lastLoadErrorRef.current?.name === "ChunkLoadError"` call `reloadPage()` (a one-line helper in its own file so RTL can `vi.mock` it; `location.reload` is not stubbable in jsdom and is not matched by the page-guard `location.assign`/`replace` rules), else call `requestLoad()` again (covers non-chunk failures and any other bundler). The reload is safe: `commit()` has already written `?mode=passphrase&…` to the URL, and the reload lands on the D-05 bookmark path, which starts the load. The user-visible contract in D-04 (error panel, Retry, then a passphrase) is unchanged; only the mechanism differs. Prod spec (c): abort the first marker chunk, assert the error panel and no copy controls, click Retry, assert the page reloaded and a 6-word passphrase appears. RTL (dev) covers the logic with a mocked loader: reject-then-resolve (non-chunk error -> loading -> ready) and a `ChunkLoadError`-named rejection -> `reloadPage` called.
**Warning signs:** Retry shows Loading then the error panel again immediately with no network request in DevTools.

### Pitfall 2: Sort order claim in CONTEXT/UI-SPEC is wrong
**What goes wrong:** CONTEXT D-10 and UI-SPEC say Password lands "between MAC and Subnet among the non-featured tools". Subnet is **featured**, so it sorts first. The real order is `subnet, uuid, config, dns, hash, mac, password` (Password is **last**). Verified in the built app: nav link names `["Subnet","UUID","Config","DNS","Hash","MAC","Password"]`. [VERIFIED: `getSortedTools` in `tools/registry.ts` read this session, and measured nav text order]
**How to avoid:** Update `tools/registry.test.ts` ordering to end with `"mac", "password"`; `tests/e2e/home.spec.ts` card-name list gains `"Password Generator"` at the end; the mobile drawer test adds `"Password"` to the shortName list and `toHaveCount(7)`.

### Pitfall 3: Seven nav links fit at 640px with ZERO slack
**What goes wrong:** With the real registry entry the nav fits, but only just. Measured at 640px (built app): one row (`top` 17 for all 7), link widths `[68,54,64,50,54,52,85]`, nav container 118 -> 569 (451px = content 427 + 6 x 4px gaps), theme toggle starts at 585, header and page do not overflow. At 700px the nav has 47px free; at 768px 114px. Because the nav container equals content width exactly at 640 (the minimum width at which the desktop nav shows), any extra pixel (OS text scaling, a wider fallback font) overflows.
**How to avoid:** Apply the D-11 first fallback **proactively**: nav links `px-2.5` -> `px-2` (7 x 4px = 28px of slack) in `components/SiteHeader.tsx` (the only allowed change to the shell). Extend `navigation.spec.ts` to assert at 640 and 700: 7 links, one shared `offsetTop`, `scrollWidth <= clientWidth` for page and header, logo and theme toggle visible, **and** a slack assertion (container width minus links total >= 8px). Record the measured widths in the SUMMARY. `shortName: "Pass"` stays the second fallback. [VERIFIED: probe4.mjs against a scratch prod build with the real registry entry]

### Pitfall 4: Stale closure for the generation counter and copy hooks in the async callback
**What goes wrong:** `.then` callbacks close over `gen.generation` and `options` from the render in which `requestLoad` ran; using them produces duplicate or regressing generation numbers (row keys are `${gen.generation}-${index}`), and generating inside a `setGen(prev => …)` updater double-generates under StrictMode.
**How to avoid:** `generationRef` incremented where results are applied; pass the options snapshot explicitly into `requestLoad`; `heroCopy.reset`/`allCopy.reset` are `useCallback`-stable and safe to call from the callback.

### Pitfall 5: Hyphenated EFF words make naive e2e/RTL assertions flaky (~0.3% per passphrase)
**What goes wrong:** The list has 4 hyphenated words (`drop-down`, `felt-tip`, `t-shirt`, `yo-yo`; [VERIFIED: `lib/password/constants.ts` lines 74-79]). With separator `-`, a passphrase containing one has more than 5 hyphens, so `output.split("-").length === 6` or `/^[a-z]+(-[a-z]+){5}$/` fails with probability about 6 x 4/7776 = 0.31% per passphrase (e2e only; RTL uses a deterministic fill).
**How to avoid:** In e2e helpers tokenize by first replacing the known hyphenated words (import `EFF_HYPHENATED_WORDS` from `../../lib/password`) with placeholders, or assert `word count >= 6 && tokens all in the list`; prefer `_` or space for e2e assertions where a count is needed. Specs may import `lib/password/wordlist/eff-large` (the boundary guards walk only `lib/password` and `app/tools/password`, not `tests/`).

### Pitfall 6: `StrictMode` + mount effect + `announce`
Dev StrictMode runs the D-05 mount effect twice. With the cleanup `seqRef.current++` only the second request applies; `announce("Loading word list")` is clear-then-set so the duplicate is harmless. Test with `<StrictMode>` (the existing RTL suites already wrap in it) and assert exactly one result applied and `loadWordlist` called for a single in-flight memo.

### Pitfall 7: Page-guard rules that the new code will trip
`app/tools/password/page-guards.test.ts` scans every non-test file in the folder for: `fetch(`, `console.`, `title=`, `<form|output|fieldset|textarea`, `useMemo`, `typeof window` (island only), router/`location.hash|assign(|replace(`, storage, `generateBatch|generatePassword(` outside the island, and any deep import `lib/password/<x>`. Required edits:
- `deepLibImports`: allow exactly `@/lib/password/wordlist` **from `PasswordTool.tsx` only** (resolve with `resolveSpecifier`, compare to `lib/password/wordlist`). Everything else under `lib/password/` stays banned (including `lib/password/wordlist/eff-large` from the island, and any other file importing the loader).
- `GENERATION_RE`: extend to `generatePassphrase|generatePassphraseBatch` so passphrase generation is also island-only. The literals are assembled from parts (self-hygiene), keep that.
- New mutants: (1) island importing `@/lib/password/wordlist` -> allowed; (2) `PasswordOutput.tsx` or `faq-data.ts` or `PasswordExample.tsx` importing it -> caught; (3) island static or dynamic import of `@/lib/password/wordlist/eff-large` -> caught; (4) `generatePassphraseBatch(` in `PasswordOutput.tsx` -> caught. Update the existing mutant "detects a deep import of the word-list loader" (it appends the loader import to the **island** and expects a hit; after relaxation it must target a non-island file).
- Non-vacuity: the island's specifiers must contain `@/lib/password/wordlist` exactly once.
- `lib/password/boundaries.test.ts`: `loaderImporters` is already computed on `lib/` files only, and an existing test ("scopes the framework, side-channel and loader rules to lib/password only", which already imports `loadWordlist` from `@/lib/password/wordlist` inside `app/tools/password/Tool.tsx`) proves app files importing the loader are not flagged. So **no relaxation is needed there**; add a mutant that an island **static import of `@/lib/password/wordlist/eff-large`** is still caught by `wordlistStaticImporters` (the existing page mutant uses `page.tsx`), and keep the "barrel re-export of the loader" mutant. [VERIFIED: files read this session]

### Pitfall 8: Existing tests that encode the old behavior
- `app/tools/password/PasswordTool.url.test.tsx` "mode=passphrase is rewritten without mode (RESEARCH Pitfall 7)" asserts the dropped bookmark; flip it to "restores the mode and keeps `?mode=passphrase`" (with a mocked loader).
- `tests/e2e-prod/password-ssr.spec.ts` asserts `robots noindex, nofollow`, the old `<title>` and the old description; update to the final metadata, assert **no** `noindex`/robots meta, and no wordlist marker in raw HTML.
- `app/tools/pages-about.test.ts` `FAQ_BY_SLUG` must gain `password: passwordFaq` or "every non-planned registry tool has a faq-data entry" fails the moment the registry changes.
- `components/ToolCard.test.tsx` "renders a distinct icon for every registered tool" hard-codes `toHaveLength(6)` / `Set(...).size toBe(6)`; `tools/registry.test.ts` (length 6, slug list, all-active map, ordering); `app/sitemap.test.ts` (explicit URL list); `tests/e2e/home.spec.ts` (two `toHaveCount(6)`, loop `i < 6`, names list); `tests/e2e/navigation.spec.ts` (`toHaveCount(6)` twice, loop, describe title "fits six tools"). [VERIFIED: grep this session]. `app/layout.tsx` root description lists tool names (already stale: no Config); optional copy tweak, no test pins it.
- `ColoredPassword` currently emits only spans; adding `<wbr />` after `_`/`.` separators (UI-SPEC) needs keyed fragments and an update to any test asserting the children are only spans. `wbr` adds no text, so `textContent` still equals the raw value.

### Pitfall 9: Passphrase hero height varies with the random words at 320px
6 words average ~44 characters at 20px mono on a 254px line wraps to 2-4 lines depending on word lengths, so the passphrase hero (and therefore the settled island) height is not a constant. The default password state is the pinned gate (constant 122px hero); the passphrase loading block should use the common height (measure ~200 samples at 320px and take the mode), and the passphrase bookmark gate is CLS < 0.1, not equality. Regenerate-induced jumps are user-initiated (`hadRecentInput`), so they do not count toward CLS.

### Pitfall 10: Dev and prod e2e collisions
Port 3000 is currently occupied by a running `node` process on this machine (`lsof` shows PID 57546 listening), and Playwright dev config uses `reuseExistingServer: !CI`. `playwright.prod.config.ts` builds into the same `.next` and serves on 3101, so dev e2e and prod e2e must run strictly sequentially, never in parallel (Phase 13 Pitfall 10). The release gate order in 13-06 is the template.

### Pitfall 11: Announce vocabulary and Esc during loading
Esc in Passphrase mode keeps the mode and resets the scenario to fast. While the list is loading it must not announce "Options reset. New passphrase generated". Extend `StatusPhrase` with exactly the six D-20(b) phrases (plus the existing ones); keep the numeric template type for `${n} new passphrases generated`.

### Pitfall 12: Tailwind scans `.planning/`
Class-like placeholder text in `.planning/` docs (for example a height class with a `{N}` placeholder) triggers the existing "Invalid media query" optimizer warning (build still exits 0). Write measured values and class names as prose in plan/summary docs, not as bracketed class placeholders. Pre-existing, out of scope, must not block.

### Pitfall 13: 13-RESEARCH pitfalls still in force
1 (`history.state` is never null in the running app; assert on `JSON.stringify(history.state)` not null-ness), 2 (prod leak scan false positives: visible text strips script/style/tags; flight payloads scanned separately), 3 (non-test helpers under `app/tools/password/` must not name the Web Crypto method), 4 (shortcut/focus interplay), 5 (stale "Copied!"), 6 (shadcn `Label` dims disabled-peer labels), 8 (Switch label semantics, no forms), 9 (guard self-hygiene: build forbidden snippets from parts), 11 (cycle-fill determinism depends on the pool: for passphrases the fill indices are word indices modulo 7776), 12 (Playwright `fill` on controlled range/number draft), 13 (writes on every keystroke). Pitfall 7 (mode=passphrase dropped) is **superseded** by D-03.

## Code Examples

### Relaxed page-guard rule (shape)
```ts
// Source: app/tools/password/page-guards.test.ts deepLibImports (lines ~290-300), adapted
const WORDLIST_LOADER = "lib/password/wordlist";
deepLibImports: nonTest.flatMap((f) =>
  allSpecifiers(codeFor(f))
    .filter((s) => {
      const r = resolveSpecifier(f, s);
      if (r === BARREL || !r.startsWith(`${BARREL}/`)) return false;
      return !(f === ISLAND && r === WORDLIST_LOADER); // the one allowed deep import
    })
    .map((s) => `${f}::${s}`),
),
```

### Copy re-announce without touching `lib/hooks` (D-20a)
```ts
// Source: app/tools/password/PasswordTool.tsx lines 158-168 (current boolean-keyed effects), adapted
const [heroSeq, setHeroSeq] = useState(0);
async function copyHero(value: string) {
  await heroCopy.copy(value);   // sets copied=true BEFORE resolving on success; copied=false/error on failure
  setHeroSeq((n) => n + 1);     // new copy event, even when `copied` is already true
}
useEffect(() => {
  if (!heroCopy.copied) return; // a rejected write stays silent
  const timer = setTimeout(() => announce(copyPhrase), 0);
  return () => clearTimeout(timer);
}, [heroCopy.copied, heroSeq, announce]);
```
This relies on `useCopyToClipboard.copy` calling `setCopied(true)` before it resolves (verified in `lib/hooks/useCopyToClipboard.ts`); a failed copy leaves `copied` false so the effect returns early. Do the same in `PasswordRow` for the row copy and for Copy all. At worst React renders the two updates separately and announces twice (clear-then-set makes that harmless). Add an RTL test: two copies within 2s re-announce. If it proves non-trivial, document an accepted gap (D-20a allows it).

### Wordlist integrity from the generator
`generatePassphrase` throws `WordlistIntegrityError` unless `words.length === EFF_WORD_COUNT` (7776). RTL tests that mock the loader must resolve a list of exactly 7,776 distinct strings (for example `Array.from({length: 7776}, (_, i) => "w" + i.toString(36).padStart(4, "a"))`).

### RTL loader seam
Use `vi.mock("@/lib/password/wordlist", () => ({ loadWordlist: vi.fn() }))` and drive deferred promises (resolve/reject on demand) to test: toggle -> loading -> ready; toggle then switch back to Password before resolve -> nothing applied; change words before resolve -> eventual result has the new count; stale rejection after a mode change shows no error; `ChunkLoadError` rejection -> Retry calls the mocked `reloadPage`; plain rejection then resolve -> Retry succeeds; StrictMode bookmark mount -> one applied result; unmount before resolve -> no state update. `createWordlistLoader(importer)` remains the seam for the library's own memo-clearing tests (already in `lib/password/wordlist.test.ts`).

### First-load JS figure (D-19, one-off, not a gate)
```ts
// Source: verified probe3.mjs; run against `next start`
page.on("requestfinished", (r) => { if (r.resourceType() === "script") scripts.push(r); });
await page.goto(url, { waitUntil: "networkidle" });
let total = 0; for (const r of scripts) total += (await r.sizes()).responseBodySize; // gzip bytes on the wire
```
Prototype build (before this phase's UI): `/tools/uuid` 17 scripts 215,939 B (210.9 KiB); `/tools/hash` 214,938 B; `/tools/password` 18 scripts 212,842 B (207.9 KiB); `/tools/subnet` 207,107 B (202.3 KiB). Next 16's build output no longer prints per-route "First Load JS", so this measurement is the way to get the figure for the SUMMARY.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| webpack `import()` failed chunk can be retried (installedChunks reset) | Turbopack prod runtime caches rejected chunk promises | Next 16 default bundler | Retry must reload (Pitfall 1) |
| `next build` prints "First Load JS" per route | Route table with no sizes | Next 16 | Measure first-load JS from the network (above) |
| `router.replace` for URL state | Raw `history.replaceState(null, …)` | Next 14.1 | `history.state` never null (13 Pitfall 1) |

**Deprecated/outdated:** the Phase 13 "coerce mode to password" (D-07) and the "dropped bookmark" test are superseded by D-03.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Reload-on-ChunkLoadError is acceptable to the user as the Retry mechanism (same visible contract as D-04) | Pitfall 1 | Low: the alternative (fetched asset) reverses a Phase 12 lock; confirm at UAT |
| A2 | React batches `setCopied(true)` and `setHeroSeq` into one render in practice; otherwise a harmless double announcement | Code Examples (D-20a) | Low: clear-then-set tolerates duplicates |
| A3 | `lighthouse` (npm, Google) is legitimate; it was not run through `package-legitimacy check` | Package Legitimacy | Low: one-off, never installed into the repo; gated behind the user's yes |
| A4 | 1px skeleton-vs-island tolerance is stable across runs/CI fonts (fractional 19.6px line heights) | Pattern 5 | Medium: may need the Hash 4px/0.01 bound; plan includes a repeat-each check and a documented relax rule |
| A5 | The ~44-character 6-word passphrase wraps to 2-4 lines at 320px | Pitfall 9 | Low: measure real samples at implementation time |

## Open Questions

1. **Does Retry's reload mechanism need user sign-off?** (RESOLVED)
   - What we know: D-04 says Retry calls the memoized loader again; this cannot work against the Turbopack prod runtime (verified, 3 consecutive calls, 1 request ever made, reload recovers).
   - Recommendation: implement `Retry = reload if ChunkLoadError else requestLoad()`; mark as an accepted mechanism change in the plan and list it under human check #4 (VoiceOver pass). The user-visible contract is unchanged; no extra checkpoint needed.

2. **Where should the Password nav entry's `px-2` change live?** (RESOLVED)
   - Recommendation: `components/SiteHeader.tsx` only, applied unconditionally (0px measured slack at 640px). Note that `MobileNav` is unaffected. The page-level 10px/12px spacing ban does not apply to `SiteHeader` (UI-SPEC decision 30).

3. **UI-SPEC's unresolved E2-bookmark-batch (a `?mode=passphrase&n=5+` bookmark shifts content when the batch resolves into the single-hero loading block)** (RESOLVED)
   - Recommendation: accept as planned (CLS gate covers only the plain bookmark); the user chose a batch view and it happens once. Confirm at UAT as already noted.

4. **Does the sort-order discrepancy need a decision?** (RESOLVED)
   - Recommendation: no. The behavior is registry-driven and correct; only the CONTEXT/UI-SPEC prose and the test expectations change (Pitfall 2). The plan documents Password as last in the nav and grid.

5. **Can the agent give an automated Lighthouse proxy?** (RESOLVED)
   - What I verified: a one-off `npx --yes lighthouse@latest <url> --chrome-path=<Playwright chromium> --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=<scratch>` against a local `next start` works without touching `package.json`. Result for `/tools/subnet` (local, mobile emulation, Lighthouse 13.6.0): performance 1.00, accessibility 0.96, best-practices 0.96, seo 1.00, CLS 0, LCP 0.8 s, TBT 0 ms.
   - Recommendation: include it as an **optional advisory task** (not a gate, not a dependency, outputs only to the scratchpad) run against `next start` for `/tools/password` and `/tools/subnet` after the final UI exists, recorded in the SUMMARY as "local advisory, not the PREG-03 capture"; the real Vercel preview capture stays human check #3. Because it downloads a package at run time, treat the first run as needing the user's OK (`checkpoint:human-verify`), or skip it if the user prefers.

6. **Pin multiple-of-4 vs within-1px?** (RESOLVED)
   - Recommendation: pin `Math.round(measured)` (D-17's 1px wins); the multiple-of-4 rule was Hash's own constraint, not a shared one.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | yes | v22.23.4 | — |
| npm / registry | `npx` one-off Lighthouse (optional) | yes | `npm view lighthouse version` -> 13.6.0 | skip the advisory task |
| Playwright Chromium | e2e, route scan, optional Lighthouse | yes | chromium-1228 under `~/Library/Caches/ms-playwright` | — |
| `jiti` | one-off value checks | yes | `node_modules/.bin/jiti` | `vitest` |
| Port 3000 free | dev e2e | **occupied** (node PID 57546 listening) | — | Playwright reuses it (`reuseExistingServer`); ensure it is a dev server of THIS checkout |
| Port 3101 free | prod e2e | yes | — | — |
| Vercel preview deploy | Lighthouse 90+ capture (PREG-03) | no (agent cannot create it) | — | recorded human check #3 |

**Missing dependencies with no fallback:** none blocking.
**Missing dependencies with fallback:** Vercel preview -> human check at milestone UAT.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (jsdom, globals) + Playwright 1.61.1 |
| Config file | `vitest.config.ts` (`include: ["**/*.test.{ts,tsx}"]`, excludes `tests/e2e/**`); `playwright.config.ts` (dev, :3000); `playwright.prod.config.ts` (build + start, :3101) |
| Quick run command | `npx vitest run app/tools/password lib/password components tools app/sitemap.test.ts app/tools/pages-about.test.ts` |
| Full suite command | `npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e && npm run test:e2e:prod` (strictly sequential) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PHR-01 | Toggle switches mode; default 6 words joined `-`; Radix `""` ignored | RTL + e2e | `npx vitest run app/tools/password/PasswordTool.passphrase.test.tsx` ; `npx playwright test tests/e2e/password-passphrase.spec.ts` | ❌ Wave 0 |
| PHR-02 | words 3-20 draft rules, 4 separators, capitalize, number, `/` focus, Esc keeps mode | RTL + e2e | same files + `password-keyboard.spec.ts` (extend) | ❌ / extend |
| PHR-03 | Wordlist out of initial JS; one chunk after toggle; abort -> error+Retry -> reload -> passphrase; no fallback, no copy controls | prod e2e + RTL | `npx playwright test -c playwright.prod.config.ts tests/e2e-prod/password-wordlist.spec.ts` ; RTL race file | ❌ Wave 0 |
| PHR-04 | Attribution in About + credit line; FAQ names the 4 hyphenated words | unit + e2e | `faq-data.test.ts`, `password-seo.spec.ts` | ❌ Wave 0 |
| STR-01 | Meter/label from settings; stable over 5 Regenerates; `data-level` at 39/40, 74/75, 99/100 | RTL + e2e | `StrengthPanel.test.tsx` ; passphrase/e2e spec | ❌ Wave 0 |
| STR-02 | "85 chars · 128 bits"; "7,776 words × 6 · 77 bits"; "+ 1 digit · 80 bits" | RTL | `StrengthPanel.test.tsx` | ❌ Wave 0 |
| STR-03 | Crack sentence + verbatim `GUESS_RATE_LABELS`; about/less/more-than rule | unit | `StrengthPanel.test.tsx` (sentence builder) | ❌ Wave 0 |
| STR-04 | Scenario toggle updates sentence, never regenerates, not in URL, Esc -> fast | RTL | `PasswordTool.passphrase.test.tsx`/`StrengthPanel.test.tsx` | ❌ Wave 0 |
| PREG-01 | 7 nav links at 640/700, one row, no overflow, slack >= 8px; drawer 7; grid 7; sitemap; `KeyRound` | unit + e2e | `tools/registry.test.ts`, `components/ToolCard.test.tsx`, `app/sitemap.test.ts`, `tests/e2e/navigation.spec.ts`, `home.spec.ts` | ✅ edit |
| PREG-02 | Unique title/description, canonical, no noindex, About parity, FAQ == constants, Q5/Q6 exact wording | unit + e2e + prod e2e | `faq-data.test.ts`, `pages-about.test.ts`, `password-seo.spec.ts`, `about.spec.ts`, `about-prod.spec.ts`, `password-ssr.spec.ts` | partly ❌ |
| PREG-03 | Skeleton == island within 1px (320/1280), CLS <= 0.001 default, < 0.1 bookmark, toggle never moves output; first-load JS recorded; Lighthouse human | e2e | `npx playwright test tests/e2e/password-layout.spec.ts` | ❌ Wave 0 |
| D-20 | Privacy sweep + 320px responsive extended to passphrase; copy re-announce | e2e + RTL | `password-privacy.spec.ts`, `password-responsive.spec.ts` (extend), RTL | ✅ edit |

### Sampling Rate
- **Per task commit:** the targeted `npx vitest run <changed folder>` (under 30 s) plus the matching Playwright spec for UI tasks.
- **Per wave merge:** `npm run typecheck && npm run lint && npm test`.
- **Phase gate:** the full sequential suite green, with the recorded human checks listed in the SUMMARY (privacy/clipboard wording, EFF CC BY wording, Lighthouse on Vercel preview, password-manager/translation/VoiceOver in both modes, 7-link nav in Safari).

### Wave 0 Gaps
- [ ] `app/tools/password/PasswordTool.passphrase.test.tsx` (state machine, race, Retry, StrictMode, copy re-announce, Esc, scenario)
- [ ] `app/tools/password/StrengthPanel.test.tsx` (derivation, stability, thresholds, sentence rule)
- [ ] `app/tools/password/faq-data.test.ts` (constants appear; Q5/Q6 pinned by exact equality like Hash)
- [ ] `tests/e2e/password-seo.spec.ts`, `tests/e2e/password-layout.spec.ts`, `tests/e2e/password-passphrase.spec.ts`
- [ ] `tests/e2e-prod/password-wordlist.spec.ts`
- [ ] Edits: `page-guards.test.ts`, `PasswordTool.url.test.tsx`, `pages-about.test.ts`, `registry.test.ts`, `ToolCard.test.tsx`, `app/sitemap.test.ts`, `home.spec.ts`, `navigation.spec.ts`, `password-ssr.spec.ts`, `password-privacy.spec.ts`, `password-responsive.spec.ts`, `password-keyboard.spec.ts`
- Framework install: none.

## Security Domain

### Applicable ASVS Categories (level 1, `security_block_on: high`)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No accounts |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Public static tool |
| V5 Input Validation | yes | `parseOptions` clamps hostile URLs; word-count draft validated by `parseIntInRange`; separator from a closed enum (`SEPARATORS`) |
| V6 Cryptography | yes | Only `crypto.getRandomValues` via `lib/password/random.ts` (guard-enforced; never hand-roll); `generatePassphrase` refuses a non-7,776 list |
| V8 Data Protection | yes | No storage, no network, no console, no URL of output; options-only URL; privacy e2e extended to passphrases |
| V14 Configuration | yes | No `noindex` leak either way; JSON-LD `<` escaping via `serializeJsonLd` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale async load overwriting newer state (race) | Tampering/Integrity | Sequence token incremented in `commit()`; RTL race matrix |
| Passphrase leaking to URL/analytics/storage/DOM attributes/live region | Information disclosure | Same exit-surface scan as passwords, matching the full joined string (D-20c); lowercase words are easier to match so match the whole string only |
| Wordlist corruption or substitution | Tampering | Vendored static file with recorded SHA-256 in `eff-large.ts` header; generator throws `WordlistIntegrityError` on a wrong count; no fallback list |
| Options URL leaking via outbound link Referer | Information disclosure | EFF links with `rel="noreferrer"` (also implies noopener) |
| JSON-LD script breakout | Tampering/XSS | `serializeJsonLd` escapes every `<`; only `ToolAbout` emits JSON-LD |
| Sample secret in static HTML | Information disclosure | Worked example uses a structural placeholder only; prod SSR spec still scans for all-sets runs and now for the wordlist marker |

## Sources

### Primary (HIGH confidence)
- In-repo files read this session: `14-CONTEXT.md`, `14-UI-SPEC.md`, `app/tools/password/*` (island, options, output, row, loader, page, runs, color, guards, url test), `lib/password/*` (index, constants, passphrase, entropy, crack-time, generate, url-state, wordlist, boundaries test), `lib/hooks/useKeyboardShortcut.ts`, `useCopyToClipboard.ts`, `components/ToolAbout.tsx`, `ToolCard.tsx`, `SiteHeader.tsx`, `components/ui/toggle-group.tsx`/`toggle.tsx`, `tools/registry.ts` + tests, `app/sitemap.ts`, `app/robots.ts`, `app/tools/config/{page,faq-data,ConfigExample}`, `app/tools/hash/{OutputToolbar,faq-data}`, `pages-about.test.ts`, `tests/e2e/{hash-layout,config-seo,navigation,home,about,password-privacy,password-responsive}.spec.ts`, `tests/e2e/helpers/*`, `tests/e2e-prod/*`, `playwright*.ts`, `vitest.config.ts`, `package.json`, `13-06-SUMMARY.md`, `13-REVIEW-DISPOSITION.md`, `13-RESEARCH.md` pitfall headings.
- Empirical scratchpad experiments (throwaway copy of the repo; nothing committed): production `next build`, chunk grep, Playwright route scan, failure/Retry probe (3 consecutive failures, 1 request, reload recovers), nav measurement with the real registry entry at 640/700/768, first-load JS sizes, local Lighthouse run, `jiti` value computation, WCAG contrast computation.

### Secondary (MEDIUM confidence)
- Turbopack runtime source in the built `turbopack-*.js` (minified; read for the cache maps).

### Tertiary (LOW confidence)
- None relied upon.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new dependencies, all versions read from `package.json`
- Architecture: HIGH for the load state machine, bundle proof and registry mechanics (empirically verified); MEDIUM for React batching of the copy-seq fix (A2)
- Pitfalls: HIGH for 1-3, 5, 7, 8 (verified/read); MEDIUM for 9 (measure at build time)

**Research date:** 2026-11-11
**Valid until:** 2026-12-11 (Next/Turbopack minor releases could change the failed-chunk caching; re-run the probe if Next is bumped)
