# Pitfalls Research

**Domain:** Adding a password/passphrase generator and a "tool-first" page restructure (collapsible info sections, config-highlighter SEO parity, subnet compaction) to the existing static-first Packetory app (Next.js 16 App Router, Vitest + fast-check + Playwright, Vercel Analytics with an empty query-param allow-list)
**Milestone:** v1.3 Password Generator & Tool Page Polish
**Researched:** 2026-11-11
**Confidence:** HIGH for codebase-specific findings (read directly from the repo) and for crypto/sampling pitfalls (well-established); MEDIUM for SEO/browser-behaviour claims (flagged inline); LOW items are labeled LOW.

> Scope note: this file covers pitfalls of ADDING v1.3 features to the existing system. Generic web advice is omitted. Every "codebase fact" below was verified by reading the repo on 2026-11-11 (file paths given).

---

## Suggested phase vocabulary used in the "Phase to address" fields

Phase numbering continues from 10. The roadmapper may reshape this, but the pitfall mapping assumes this dependency order:

| Label | Suggested phase | Why this order |
|-------|-----------------|----------------|
| **P10** | Shared "About this tool" disclosure component + migrate all 6 tools + Config parity (worked example, FAQ, JSON-LD, distinct icon) + fix shared keyboard hook + rewrite the e2e SEO specs | Touches every existing tool and 4 e2e spec files; must land before the password page so the new page is built on the final component, not retrofitted |
| **P11** | `lib/password/` core: unbiased sampler, charset/look-alike model, entropy, wordlist chunk, URL-options (de)serializer | Correctness gate first (v1.2 lesson: build the trusted engine, then pure UI over it) |
| **P12** | `/tools/password` UI + registry/nav/landing/sitemap + SEO + e2e (dev + prod) | Pure UI over P11 and P10 |
| **P13** | Subnet compaction | Independent; last because it re-pins the skeleton and must be measured against the final About-section layout from P10 |

---

## Critical Pitfalls

### Pitfall 1: A generated password baked into static HTML (SSR leak / CDN-cached secret)

**What goes wrong:**
`/tools/password` is statically prerendered. If any code that produces a random password runs during the build/server render (a Server Component, a client component rendered on the server, `generateMetadata`, a module-level `const initial = generate()`), the SAME password is written into the prerendered HTML, served from Vercel's CDN to every visitor, and indexed by crawlers. Variant: it hydrates "fine" by accident if the client render happens to match, then the password is shared by everyone until the next deploy.

**Why it happens:**
Someone removes `dynamic(..., { ssr: false })` "to improve LCP/CLS" or "because the skeleton flashes", or initialises state via a module-level constant. Next 16 does not warn: the page just works, and every visitor sees an identical "random" password.

**How to avoid:**
- Reuse the locked Server-shell + Client-island split exactly (`page.tsx` server shell -> `PasswordToolLoader.tsx` with `"use client"` + `dynamic(() => import("./PasswordTool"), { ssr: false, loading: <pinned skeleton/> })`). Never import the tool component into `page.tsx` directly.
- Initialise the password in `useState(() => generate(...))` or an effect INSIDE the `ssr:false` island only. Never in module scope, never in props passed from the server.
- The worked example on the page uses a FIXED, clearly-labelled sample constant (like `sampleV4` in `app/tools/uuid/faq-data.ts`), never a build-time random.
- Add a regression test that fetches the raw HTML (`request.get("/tools/password")` in Playwright, or reads `.next/server/app/tools/password.html` in a prod-build test) and asserts (a) the skeleton testid is present, (b) the tool's output testid is NOT present, (c) no string matching the default 20-char all-sets shape appears outside the labelled sample.
- Add a test that two fresh page loads show different passwords.

**Warning signs:**
`ssr:false` missing in the loader; hydration warnings (React #418/#423) in the console; the same password on two devices; the prod HTML containing a `data-testid="password-output"` element.

**Phase to address:** P12 (guard test in P12; the rule is restated in P11's lib docs: "lib/password never self-seeds at import time").

---

### Pitfall 2: Modulo bias, `Math.random`, and silent fallbacks in the sampler

**What goes wrong:**
`crypto.getRandomValues(new Uint32Array(1))[0] % pool.length` (or `Uint8 % 62`) makes low indices slightly more probable. `Math.random()` is not a CSPRNG. A "fallback" to `Math.random` when `crypto` is missing silently produces weak passwords. `array.sort(() => random - 0.5)` for shuffling is both biased and engine-dependent.

**Why it happens:**
The modulo one-liner is the top search result; the skew with a 32-bit draw is tiny (about 1 part in 45 million for n=94) so tests never notice. Some sources even recommend skipping rejection sampling; do not copy that for a tool whose entire purpose is trustworthy randomness (and whose reviewers will grep for `%`).

**How to avoid:**
- One audited primitive in `lib/password/random.ts`: `randomInt(maxExclusive)` using rejection sampling (`limit = floor(2^32 / n) * n`; redraw while `r >= limit`). All pool picks, word picks, shuffles and the appended-number digits go through it. No other file touches `crypto` or `%`.
- Fisher-Yates shuffle built on `randomInt`; never `sort`-with-random-comparator.
- Fail closed: if `globalThis.crypto?.getRandomValues` is absent, throw and show an inline "your browser can't generate secure randomness" error. NEVER fall back to `Math.random`. (`getRandomValues` works in insecure contexts too, unlike `randomUUID`/`subtle`, so this is a never-happens path that must still be fail-closed.)
- `getRandomValues` throws `QuotaExceededError` above 65,536 BYTES per call (HIGH, per spec/browser behaviour). Draw in bounded chunks (for example <= 16 KiB) so a 20-item batch of long passwords plus rejection overdraw can never exceed it.
- Add an ESLint `no-restricted-properties`/`no-restricted-syntax` rule (or a Vitest "source grep" test, in the style of the existing import-boundary guards in `lib/hash`) forbidding `Math.random` anywhere under `lib/password/` and `app/tools/password/`.
- Test the sampler with a DETERMINISTIC stubbed `getRandomValues` that returns the exact boundary values (`limit - 1` accepted, `limit` rejected, `2^32 - 1` rejected for n=94) so bias handling is proven without flaky statistics. If a statistical check is also wanted, use a fixed large sample with a very loose tolerance (a chi-square at a normal significance level fails randomly ~5% of runs and will make CI flaky).

**Warning signs:**
`%` applied to a random value; `Math.random` in the diff; a `try { crypto... } catch { Math.random }`; a `.sort(` near the shuffle.

**Phase to address:** P11.

---

### Pitfall 3: Entropy overstated by "guarantee one of each set", look-alike removal, duplicates and empty pools

**What goes wrong:**
The strength meter and crack-time estimate show a number that is higher than the real entropy:
- "Guarantee at least one of each enabled set" implemented as "pick one from each set first, fill the rest, shuffle" is NOT uniform over valid strings and has less entropy than `L * log2(N)`. The effect matters at short lengths (for example L = 6-8 with four sets) and is invisible at L = 20.
- Look-alike removal shrinks the pool; if the formula still uses the unfiltered pool size, entropy is overstated.
- The editable symbol set can contain duplicates (`!!@@`), multi-code-unit characters (emoji, `String.length` counts UTF-16 units), whitespace/invisible characters, or characters that are all look-alikes (`|`), so the effective set can become empty after filtering.
- Everything disabled / empty symbol set with Symbols ON -> empty pool -> `log2(0)` = `-Infinity`/`NaN`, or an infinite rejection loop.
- Required-set count greater than length (length 2, four sets) -> an unsatisfiable guarantee -> infinite loop in a rejection-based implementation.

**Why it happens:**
Each rule is added independently (sets, then look-alikes, then custom symbols, then guarantee) and the entropy function is written against the raw option object rather than against the final, filtered, deduplicated alphabet actually sampled.

**How to avoid:**
- Single pipeline: `options -> resolveAlphabets(options) -> {sets: string[][] (deduped by code point via Array.from, look-alike-filtered, empty sets dropped), pool}`. Generation AND entropy both consume ONLY `resolveAlphabets` output; nothing reads `options.symbols` directly afterwards.
- Prefer ONE uniform scheme for the guarantee: rejection-sample the whole password from the pool and accept only if every enabled set is represented. This is uniform over the valid strings, so the exact entropy is `log2(#valid strings)`, computable with inclusion-exclusion over sets in BigInt (or simply report the conservative `L*log2(N)` rounded DOWN and say "up to"). If instead you use "pick-required-then-shuffle", document that entropy is reported as the conservative upper bound minus the guarantee loss, never as `L*log2(N)`.
- Hard-validate before generating: pool size >= 1, `length >= number of enabled non-empty sets`, symbol set length capped (for example 64 code points) and stripped of whitespace/control characters. Show an inline message (not a crash) and keep the last valid result, like `parseCountInput` in `UuidTool.tsx`.
- Bound the rejection loop (for example 1,000 attempts) and throw rather than spin if the acceptance probability is pathologically low.
- Passphrase entropy rules (the common over-claims): `W * log2(listSize)` only. Deterministic capitalisation (capitalise every word / first letter) adds 0 bits. A FIXED separator adds 0 bits. An appended number adds `log2(range)` only if it is drawn randomly, and only that. `listSize` must be read from the loaded array's actual `.length` (never hard-coded 7776), because any word removed or filtered changes it. Sample words WITH replacement and say so.
- fast-check properties: every output char is in the pool; length is exact; every enabled set is present; no look-alike character appears when the option is on; entropy is monotone in length and never `NaN`/`Infinity`; `resolveAlphabets` is idempotent.

**Warning signs:**
Entropy shown for L=4/all sets that equals exactly `4*log2(94)`; `NaN bits` in the UI when toggling everything off; the page freezing when the length is set below the number of sets; entropy that doesn't change when look-alikes are toggled.

**Phase to address:** P11 (pure functions + property tests); P12 only renders the validation messages.

---

### Pitfall 4: Password regenerates under the user (or on the wrong triggers)

**What goes wrong:**
The password changes right after the user clicks Copy, or when an unrelated piece of state changes (copy confirmation toggling, a show/hide toggle, a resize). The user copies one string and sees a different one on screen. Equally bad: the confirmation says "Copied!" next to a value that no longer matches (the exact WR-02 bug already fixed in the UUID tool).

**Why it happens:**
Deriving the password during render (`useMemo(() => generate(options), [options, copied])`) or generating in an effect whose deps include a flag that changes on copy. React 19 StrictMode double-invokes initialisers/effects in dev, which can mask or amplify the problem.

**How to avoid:**
- Mirror the UUID pattern: the generated strings live in `useState`; they are replaced ONLY by (a) an options change, (b) Regenerate/Enter, (c) mount. Display formatting is a pure derivation; copy/show-hide/status state never touches generation.
- Call `useCopyToClipboard().reset()` in an effect keyed on the generated array (same as `UuidTool.tsx`), so the "Copied!" never lingers next to a changed value.
- Unit test: click Copy, then assert the displayed value is unchanged and the clipboard mock received exactly the displayed value.

**Warning signs:**
Value differs between "what I saw" and "what I pasted"; two generations per interaction in the console log; "Copied!" visible after Regenerate.

**Phase to address:** P12.

---

### Pitfall 5: Password leaks into the URL, history, analytics, DOM attributes or the accessibility tree

**What goes wrong:**
- The password (or the Hash-style "share link") ends up in `?pw=`, in `history.state`, in `document.title`, in a `key=`/`id=`/`title=`/`aria-label=`/`data-*` attribute, or in an `aria-live` region that screen readers read aloud on every regenerate.
- Vercel Analytics reports the URL. The allow-list in `lib/analytics/redact.ts` is EMPTY, so `redactBeforeSend` strips every query param today; this is the safety net, but only if nobody "helpfully" adds option params to `DEFAULT_ALLOW_LIST`.
- Options in the URL are attacker-controlled input: `?length=99999999`, `?count=1e9`, `?symbols=<huge string>`, unknown keys.

**Why it happens:**
Copy-by-analogy from the Hash tool (which has a capped Copy link carrying user text) or from the UUID tool (which has download/CSV export). For passwords both are anti-patterns. URL parsing is written against the happy path.

**How to avoid:**
- URL carries OPTIONS ONLY: `mode, len, upper, lower, digits, symbols, symset, nolook, words, sep, cap, num, count`. Avoid generic names that a later author might reuse for content (`pw`, `p`, `q`, `text`, `value`).
- Write with `window.history.replaceState(null, "", url)` (state argument `null`, per the project's raw-History-API decision); read with `new URLSearchParams(window.location.search)` inside the `ssr:false` island. Do NOT use `useSearchParams()` (forces a Suspense/CSR bailout in a static build).
- Do NOT add any password option to `DEFAULT_ALLOW_LIST`. Add a unit test that `redactBeforeSend` strips `?len=20&symbols=1&symset=%21%40` to the bare path. (Keeping the options out of analytics is the privacy-consistent default.)
- Parser is hostile-input-safe: clamp every number (`len` 4-128, `count` 1-20, `words` 3-12), whitelist `mode`/`sep` values, cap and sanitise `symset`, ignore unknown keys, never throw. Round-trip property test with fast-check: `parse(serialize(o)) == o` over all options including a symbol set containing `# & % + = ? / \ " ' < >` and non-ASCII.
- Serializer test + e2e test: after generating and copying, `page.url()` contains no substring of the visible password and `history.state === null`.
- No `download`/CSV/JSON export, no local-history ("last 5 passwords") and no `localStorage` of generated values. Batch offers per-item copy and Copy-all only.
- Rows use index+generation-counter keys, never the password as the React `key`. Per-row accessible names are "Copy password 3", never the value. The shared live region announces "Copied" / "New password generated", not the password.
- Never `console.log` the value; never pass it to Vercel `track()`.

**Warning signs:**
Any `replaceState` call whose URL builder receives the output array; `title={password}`; the 20-char string appearing in the accessibility snapshot; `?len=` appearing in Analytics dashboards.

**Phase to address:** P11 (parser/serializer + clamping + tests), P12 (DOM/a11y/e2e assertions). The analytics test can land in P11.

---

### Pitfall 6: Browser password managers, autofill, translate and clipboard history

**What goes wrong:**
- A generated password inside an `<input>` (especially `type="password"`) makes Chrome/Safari/1Password/Bitwarden offer to "save this password" or autofill it into other fields; options inputs (symbol set, separator) get autofill suggestions or are saved to autofill history.
- Google Translate / browser translation rewrites a passphrase (translating words).
- Spellcheck underlines passphrase words; Grammarly-style extensions read the field.
- The clipboard retains the password: Windows clipboard history (Win+V), macOS Universal Clipboard to a nearby iPhone, third-party clipboard managers. A web page cannot mark clipboard content sensitive, and it cannot reliably clear it (writing is only allowed with document focus; reading to verify requires a permission prompt).
- "Copy all" puts up to 20 passwords on the clipboard in one string.

**How to avoid:**
- Render the password in a non-form element (`<output>`/`<code>`/`<div>`), `translate="no"`, `spellCheck={false}`, and `user-select: all` on the value element so a single click selects the whole string (double-click stops at symbols otherwise). No `<form>` wrapper (avoids "save password" submit heuristics). On any text inputs the tool does have: `autoComplete="off"`, `spellCheck={false}`, plus the vendor opt-outs (`data-1p-ignore`, `data-lpignore="true"`, `data-bwignore`). The project already sets `autoComplete="off"` on every other tool's inputs; add a unit test per input as `HashTool.test.tsx` does.
- Do not build "auto-clear clipboard after N seconds": it can clobber something the user copied afterwards and is unreliable when the tab loses focus. Instead, state the limitation honestly in the FAQ (clipboard history can keep a copy).
- Keep the project's established honest-wording convention: the Hash e2e spec forbids absolute claims (`never leaves`, `never stored`, `never sent`, `private`, `100%`, `tracking`). Apply the same banned-phrase test to the password FAQ/worked example: say "generated in your browser with `crypto.getRandomValues`", not "nobody can see it".
- Reuse the existing copy hook; a Ctrl/Cmd+C shortcut is disabled in batch view (the UUID WR-03 lesson) because there is no visible confirmation target.

**Warning signs:**
A password manager "save" prompt in manual testing (1Password + Bitwarden + Chrome built-in); translated words in the output; double-click selecting only part of the password.

**Phase to address:** P12.

---

### Pitfall 7: Wordlist bloats the initial bundle, loads wrongly, or is silently replaced

**What goes wrong:**
- A static `import wordlist from ...` puts roughly 50-60 KB of raw word data (about 25-30 KB gzip; estimate, MEDIUM, measure it) into the initial tool chunk although most visitors only see Password mode, hurting the Lighthouse 90+ / minimal-JS budget.
- Lazy loading introduced, but: passphrase mode on a bookmarked URL (`?mode=passphrase`) has no list yet and shows an empty/collapsed area (CLS) or throws on Regenerate; the chunk 404s after a deployment (deployment skew with an open tab); the code silently falls back to a tiny built-in list or `Math.random` (entropy now wrong and the meter lies).
- Entropy computed before the list loads, or from a hard-coded 7776.
- Licensing: the EFF wordlists are CC BY 3.0 US, which requires attribution (MEDIUM: multiple secondary sources agree; the EFF page itself could not be fetched). Shipping the list without credit is a compliance miss. Modified lists (removing words) are derivatives and should say so.
- The EFF large list contains a few hyphenated entries (for example `drop-down`, `felt-tip`, `t-shirt`, `yo-yo`; from memory, verify) which look like extra separators when the separator is `-`. Removing them changes the list size; the entropy formula must therefore read the real length.

**How to avoid:**
- Choose the EFF large list (7,776 words, about 12.9 bits/word; HIGH) and keep it as ONE joined string in its own module (`lib/password/wordlist.ts`), split once at load, loaded with `await import("@/lib/password/wordlist")` only when passphrase mode is first needed (or idle-prefetched after the first paint). A joined string parses faster than an array literal of 7,776 strings.
- Skeleton: the passphrase panel has the same pinned height as the loaded state (see Pitfall 13). Loading state disables Regenerate/Copy rather than producing output. Load failure -> inline error with Retry; NEVER fall back to another list or another RNG.
- Integrity test (Vitest): exactly the expected count, no duplicates, all entries `^[a-z-]+$`, and a pinned SHA-256 of the canonical text (the repo already has `lib/hash`) so an accidental edit fails CI. Entropy reads `words.length`.
- Add the attribution (list name, EFF, CC BY 3.0 US, link, "unmodified"/"modified") to the About section or the footer of the page.
- Prod-build e2e (`playwright.prod.config.ts`, the same mechanism as `tests/e2e-prod/hash-worker.spec.ts`): on `/tools/password` in Password mode the wordlist chunk is NOT requested; switching to Passphrase requests it exactly once; no third-party host is contacted. Record the chunk's gzip size in the PR and set a budget.

**Warning signs:**
`next build` output showing `/tools/password` first-load JS jumping by 25 KB or more; an `import` of the wordlist at the top of `PasswordTool.tsx`; an entropy readout that shows 51.7 bits while the list is still loading.

**Phase to address:** P11 (module, integrity test, entropy from real length), P12 (lazy-load behaviour, error state, prod e2e, attribution).

---

### Pitfall 8: The new disclosure component breaks the existing SEO e2e specs (and CI will not tell you)

**What goes wrong:**
Moving Worked example and FAQ into closed-by-default sections makes their content non-visible. Existing specs assert VISIBILITY and a specific DOM shape:
- `tests/e2e/uuid-seo.spec.ts` (lines ~45-51, 73-80), `subnet-seo.spec.ts` (lines ~40-45, 67-79), `dns-seo.spec.ts` (lines ~42-53, 85-91) call `toBeVisible()` on FAQ questions and worked-example children. Playwright treats content in a closed `<details>` as hidden, so these fail.
- `hash-seo.spec.ts` reads `faqItems.nth(i).locator("p")` and expects paragraph 0 = question, paragraph 1 = answer; `dns-seo.spec.ts` uses `node.querySelector("p")?.textContent`. If the question becomes a `<summary>` (or `<h3>`), these index/selector assumptions break.
- `hash-seo.spec.ts` "does not overflow at 320px" calls `toBeVisible()` then measures `scrollWidth`; a closed section has no layout box.
- `toHaveCount(1)` on `script[type="application/ld+json"]` (hash/uuid specs): adding a second JSON-LD block (for example `WebApplication`) for any tool breaks it.
- The Playwright CI job was REMOVED on 2026-10-17 (see PROJECT.md Key Decisions), so none of this turns a PR red. It surfaces only if someone runs `npm run test:e2e` locally.

**How to avoid:**
- Decide the DOM contract once, in the shared component, and keep it stable: `<details data-testid="{slug}-worked-example">` / `<details data-testid="{slug}-faq">`; one `data-testid="{slug}-faq-item"` per Q/A; question in a fixed element, answer in a `<p>`. Update the four spec files in the SAME phase and give them a shared helper `openAbout(page, "faq" | "worked-example")` that clicks the summary and asserts `[open]`.
- Content/JSON-LD equality tests must NOT depend on open state: use `textContent()`/`toBeAttached()`/`toHaveText()` (these work on closed `<details>`); use `toBeVisible()` only after the helper opens it.
- Add NEW assertions: both sections exist, are closed by default (`details` has no `open` attribute), and their content is still in the server HTML (fetch via `request.get()` and check the text is present, which is the actual SEO guarantee).
- Make the guarantee run in CI without Playwright: a Vitest + Testing Library test of the shared component (renders N items into DOM, no `open`, JSON-LD built from the same items). Vitest IS in the CI gate.
- Make "run `npm run test:e2e` and `npm run test:e2e:prod` locally" an explicit pre-merge checklist item for P10, P12 and P13 verification (the v1.2 retrospective already flags this).
- Also update the hard-coded counts: `tools/registry.test.ts` (length 6, slug list, sorted order, status map), `tests/e2e/home.spec.ts` (6 cards), `tests/e2e/navigation.spec.ts` (6 drawer links, "six nav links at 640px"), `app/sitemap.test.ts`.

**Warning signs:**
Green PR, red local e2e; `toBeVisible` timeouts on FAQ text; a test that "passes" only because it was loosened to `toBeAttached` everywhere (then add the opened-state assertion back).

**Phase to address:** P10 (component + spec rewrite); P12 (new-tool count updates).

---

### Pitfall 9: Wrong disclosure implementation (Radix/JS accordion) removes content from the HTML

**What goes wrong:**
Using a client accordion (shadcn/Radix `Accordion`/`Collapsible`) unmounts closed content (Radix `Presence`), so the Worked example/FAQ text is NOT in the server HTML, undermining the whole "content stays in the HTML for SEO/JSON-LD" requirement and the JSON-LD/visible-content match. It also turns six server-rendered pages into client islands (extra JS on pages where the milestone goal is less JS). Controlled `open={false}` on a native `<details>` in a re-rendering client component force-closes a section the user opened.

**How to avoid:**
- Use native `<details>/<summary>` in a SERVER component (`components/ToolAbout.tsx`), no `open` prop, no client state, zero JS. (`components/ui` currently contains no accordion/collapsible; do not add one for this.)
- One shared component takes `{ slug, workedExample: ReactNode, faqItems }` and renders BOTH the FAQ and its `<script type="application/ld+json">` from the same `faqItems` (no per-page copy of the JSON-LD builder; today UUID/Subnet/DNS/MAC/Hash each duplicate it). This makes drift structurally impossible (see Pitfall 10).
- Two top-level disclosures (Worked example, FAQ); do not nest a `<details>` per question (more clicks, harder to test, no benefit).
- Do not animate height with JS; no `max-height` transitions.

**Warning signs:**
`"use client"` at the top of the About component; closed content missing from `curl` output; the `open` prop appearing in JSX.

**Phase to address:** P10.

---

### Pitfall 10: JSON-LD / visible FAQ drift and over-promising SEO

**What goes wrong:**
- Visible FAQ gains markup (links, `<code>`, entities, line breaks) while JSON-LD stays plain text, or vice versa; the existing equality e2e tests compare `textContent` to the JSON-LD `text` exactly.
- Hard-coded numbers in prose go stale: "20 characters is about 131 bits" in a password FAQ, or "7,776 words", when the defaults/list change.
- Config page gets a FAQ but no JSON-LD (it has neither today: `app/tools/config/page.tsx` has no `faq-data.ts`, no worked example).
- Expecting a rich-result payoff: Google's FAQ rich-result documentation limits it to well-known government/health sites (HIGH, official docs), and some third-party reports claim FAQ rich results were removed for all sites in May 2026 (LOW, could not be confirmed against Google's own docs). Either way the JSON-LD gives packetory.dev no SERP accordion. Keep it for consistency and machine readability, but do not spend extra effort or write FAQ copy for rich results.
- Collapsed content and ranking: Google's stated position (2016, reiterated 2020; MEDIUM, nothing newer found) is that content hidden for UX in accordions/tabs is indexed with full weight under mobile-first indexing, provided it is in the DOM. Native `<details>` content is in the DOM, so this is fine; no workaround needed. Do not hide content deceptively.

**How to avoid:**
- FAQ answers stay PLAIN STRINGS in `faq-data.ts` (rendered as text, no inline markup) so the equality contract holds. If rich answers are wanted later, add a separate plain-text field for JSON-LD.
- Derive numbers from code, not prose: `faq-data.ts` for the password tool imports `DEFAULT_OPTIONS`, `entropyBits()`, and `WORDLIST_SIZE` and interpolates them; a Vitest test pins the rendered strings.
- Keep exactly ONE JSON-LD `<script>` per page (existing tests count 1). Escape `<` as `<` as the existing pages do (keep it in the shared component).
- Add `app/tools/config/faq-data.ts` + a `config-seo.spec.ts` mirroring `hash-seo.spec.ts`.
- Config's worked example must use obviously fake data (RFC 5737 documentation addresses such as `192.0.2.0/24`, placeholder hostnames, no realistic `enable secret`/`snmp-server community` values), because it is a tool people paste real device configs into and repo/secret scanners flag realistic secrets.

**Warning signs:**
`textContent` mismatch in the equality test; JSON-LD count of 2; numbers in FAQ prose that no code produces.

**Phase to address:** P10 (shared component, Config parity), P12 (password FAQ derived from constants).

---

### Pitfall 11: The global `Enter` shortcut fires when a `<summary>` is activated

**What goes wrong:**
`lib/hooks/useKeyboardShortcut.ts` guards the global Enter handler with `target.closest('button, [role="button"], [role="radio"], a[href]')`. A focused `<summary>` is none of these. Pressing Enter on a focused "FAQ" summary toggles the disclosure AND triggers the tool's global `enter` handler: UUID regenerates, the password regenerates, Subnet/DNS blur or re-run. For a password tool, the value changes while the user is reading the FAQ.

**How to avoid:**
- Add `summary` (and `details`) to the interactive-target selector in `isInteractiveTarget`, with a unit test in `useKeyboardShortcut.test.ts`. Fix it in P10 (it affects all existing tools as soon as `<summary>` elements exist on every page).
- Check the other new controls against the same guard: Radix `Switch` renders a `button` (covered); native `<input type="checkbox">` is not covered (Enter does not activate a checkbox, so Enter would regenerate, which is acceptable but decide it deliberately); a number input for length/count is an editable target (Enter there should regenerate, as with UUID's count field).
- e2e: focus a summary, press Enter, assert it opened AND the displayed value is unchanged.

**Warning signs:**
Password/UUID changing when the FAQ is toggled by keyboard.

**Phase to address:** P10.

---

### Pitfall 12: Disclosure a11y regressions (marker, focus, headings)

**What goes wrong:**
`list-none` on `<summary>` hides the marker in Chrome/Firefox but Safari still shows `::-webkit-details-marker`; a custom chevron is added without `aria-hidden`; `outline-none` removes the focus ring so keyboard users cannot see where they are (the project is "keyboard-first"); putting an `<h2>` inside `<summary>` flattens heading semantics in some screen readers, while removing the heading loses the page outline; the summary's touch target is smaller than 44 px (the codebase uses `h-11 min-w-11` for controls).

**How to avoid:**
- Style once in the shared component: `list-none [&::-webkit-details-marker]:hidden`, a lucide `ChevronRight` with `aria-hidden` rotated by `group-open:rotate-90` (Tailwind 4 `open:`/`group-open:` variants), `focus-visible:ring-[3px] focus-visible:ring-ring/50` as on other controls, `min-h-11` on the summary, `cursor-pointer`.
- Keep an `<h2>` ("About this tool") above the two disclosures for the outline, and let the summaries be plain text. Manually test with VoiceOver (macOS) and NVDA if available: summary announced as "button, collapsed/expanded".
- Do not rely on browser find-in-page auto-expanding closed `<details>` (behaviour differs between browsers; MEDIUM). If deep links to the FAQ matter, add an explicit `id` and a tiny client effect that opens the matching `<details>` for `location.hash`; otherwise accept that anchors do not open it.
- Contrast: the "muted" About area must still meet WCAG AA (4.5:1) in BOTH light and dark themes; check `text-muted-foreground` on the muted background.

**Warning signs:**
Double chevrons in Safari; tabbing to a summary shows nothing; muted text failing Lighthouse contrast.

**Phase to address:** P10.

---

### Pitfall 13: CLS from the new layout (island swap, pinned heights, platform differences)

**What goes wrong:**
- User-initiated `<details>` toggles are excluded from CLS (they follow input), so toggling is not the CLS risk. The real risk is the island-vs-skeleton height gap: every loader pins a skeleton height (`SubnetToolLoader` 420 px, `ConfigToolLoader` 520 px, `HashToolLoader` 2240/1612 px). When the tool's real height changes (Subnet compaction, new Password layout), a stale pin makes everything beneath (now the About section and footer) jump when the island paints.
- The Password tool's height depends on mode (password vs passphrase options), batch count, and wrapping of the displayed value at 320 px.
- The v1.2 lesson repeats: a height measured on macOS can differ on Linux Chromium because of glyph-advance rounding; v1.2 fixed it with `text-rendering: geometricPrecision` on monospace output.

**How to avoid:**
- New `PasswordToolLoader` skeleton pinned from a MEASURED island height at 320 px and at >= `sm`, rounded up to a multiple of 4, with a `password-layout.spec.ts` cloned from `hash-layout.spec.ts` (reads the pins from the loader source; island vs pin within 4 px; CLS observer < 0.01).
- Make the options panel the same height for Password and Passphrase modes (reserve the taller one) so `?mode=passphrase` on first load does not shift; the default state (count = 1) is what is pinned, and batch growth is user-initiated.
- Apply `font-variant-ligatures: none` plus `text-rendering: geometricPrecision` to the password output (also prevents a ligature turning `!=`, `->`, `<=`, `==` into a single glyph: verify whether Geist Mono's contextual alternates affect these; MEDIUM) and use a monospace face with a clearly slashed/dotted zero so `0/O` and `l/1/I` are distinguishable.
- Extend the layout-spec pattern to Subnet and Config (neither has one) as part of the change that touches their heights.
- Run the layout specs on Linux (the `mcr.microsoft.com/playwright:v1.61.1-noble` image the v1.2 retro used) once before merge, and push the branch early so Linux CI (typecheck/lint/test/build) runs from day one.
- Run Lighthouse (mobile + desktop) on the preview deployment for `/tools/password` and `/tools/subnet` (v1.2 left `/tools/hash` unmeasured, so this is a known gap); target 90+ in every category.

**Warning signs:**
`h-[Npx]` constants not recently touched after a layout change; CLS > 0.01 in the observer; the footer moving when the tool appears.

**Phase to address:** P12 (Password pins + spec), P13 (Subnet pins + new spec), P10 (verify nothing moved when the About section was relocated).

---

### Pitfall 14: Subnet compaction "fits" only on the wrong viewport, and regresses mobile

**What goes wrong:**
- "Fits 1366x768" is read as `viewport = 1366x768`, but the real inner viewport on a 1366x768 laptop is roughly 1366 x 630-680 after browser chrome and the OS taskbar, and at Windows 125%/150% display scaling it is closer to 1093 x 500 or 911 x 410 CSS px. Passing at an idealised 768 px high viewport still scrolls on real devices.
- Before the tool even starts, the page spends about 190 px on chrome: sticky header (~64 px), `py-12` main padding (48 px), the 32 px `h1` plus `mt-8` gap. Compacting the field grid alone cannot reach the goal.
- The IPv6 result has more rows than IPv4 (compressed + expanded, first/last, count, reverse zone, subdivision buttons); the "fit" claim is silently only true for the IPv4 default.
- Compaction by removing information or hiding the binary/mask rows behind toggles violates the "zero-effort, full output" core value.
- Compaction by shrinking controls below target size or text below the project's type scale (14/16/20/32 px) hurts a11y and the "one-click copy everywhere" rule; per-field copy buttons are `h-11 min-w-11` today.
- A denser multi-column grid (for example 3-4 columns at `lg`) overflows narrow columns: IPv6 expanded address (39 chars) and the binary mask (35 chars) need `min-w-0` + `break-all`; at 320-375 px the grid must collapse to 1-2 columns. Existing e2e covers 320 px wrapping; layout changes can break it silently.
- Using `vh` units to force a fit (for example `max-h-[calc(100vh-...)]`) breaks on mobile Safari's dynamic toolbar (use `dvh` if at all, but prefer not to depend on viewport height).
- Changing DOM order to achieve a visual grid (CSS `order`) changes tab/reading order.

**How to avoid:**
- Write the acceptance test precisely: Playwright viewports `1366x650` (primary) and `1280x600` (stress), asserting that, for the default IPv4 CIDR on load, the bottom of the last output row (`getBoundingClientRect().bottom`) is <= `window.innerHeight` with `scrollY === 0`, header included. Add a separate documented target for IPv6 (state what is expected: for example "everything except the subdivision row" or a second, longer target), rather than leaving it implicit.
- Reduce page chrome on this route (smaller top padding, tighter h1 spacing, or a one-line tool title) as part of the plan, not only the grid. Keep the DOM order = reading order.
- Compact via density, not removal: 2-column to 3-4 column grid at `lg`, tighter label/value stacking, smaller gaps; no new font sizes; keep all copy controls with >= 24 px targets minimum (WCAG 2.2 AA 2.5.8) and keep 44 px where the page already uses it, or enlarge the hit area with padding/pseudo-elements rather than the visible box.
- Re-run the existing Subnet e2e and unit suites unchanged (testids are the contract; do not rename `subnet-ipv4-grid`, `subnet-ipv6-grid`, `subnet-hero`, `subnet-copy-*`). Manually check 320, 375, 768, 1024, 1366 widths in light and dark, with a long IPv6 /48 value and an invalid-input message showing.
- Re-measure and re-pin `SubnetToolLoader`'s skeleton (currently 420 px) per breakpoint; add `subnet-layout.spec.ts` (Pitfall 13).
- Do this phase after P10 so the About section relocation is already settled.

**Warning signs:**
Horizontal scrollbar at 320 px; clipped IPv6 text; scrollbar visible at 1366x650; the Subnet skeleton visibly jumping.

**Phase to address:** P13.

---

## Moderate Pitfalls

### Pitfall 15: Seventh tool overflows the nav and breaks hard-coded counts

**What goes wrong:**
`tests/e2e/navigation.spec.ts` asserts that six nav links fit at 640 px without horizontal overflow (a v1.2 decision, "research A5"); `SiteHeader` shows the inline nav from `sm` (640 px) up. A seventh link ("Password") may wrap or overflow at 640-700 px. Landing page grid goes from 6 to 7 cards (orphan card in a 2/3-column grid).

**Prevention:** Test the header at 640 and 700 px with seven links BEFORE writing the tool; if it does not fit, either raise the inline-nav breakpoint (`sm` -> `md`) in `SiteHeader`/`MobileNav` or shorten `shortName`. Update the hard-coded 6s in `tools/registry.test.ts`, `home.spec.ts`, `navigation.spec.ts` and `sitemap.test.ts`. Registry: `slug: "password"`, `category: "generate"`, `clientOnly: true`, `featured: false` (do not change the featured pair casually; `getSortedTools` ordering is asserted).
**Phase to address:** P12.

### Pitfall 16: New icon string silently renders the UUID icon

**What goes wrong:**
`components/ToolCard.tsx` resolves `tool.icon` through an `ICONS` map and falls back to `Fingerprint` when the key is missing. A registry entry with an icon name that is not in the map (Password and the new distinct Config icon) silently shows the fingerprint, and the unit test for the registry does not fail. Replacing the map with `import * as Icons from "lucide-react"` would pull the whole icon set into the landing bundle.
**Prevention:** Add each new icon to the explicit named-import map (for example `KeyRound` for Password and a config-appropriate icon such as `FileCode`/`ScrollText` for Config; check that the lucide version exports them), keep named imports for tree-shaking, and add a `registry.test.ts`/`ToolCard.test.tsx` assertion that every registered icon exists in the map and that all icons are unique across tools (this also guards the Network-reused-by-Subnet-and-Config issue).
**Phase to address:** P10 (Config icon), P12 (Password icon).

### Pitfall 17: Strength meter / crack-time presentation

**What goes wrong:**
Absurd or false-precision numbers ("4.3 septillion years"), an unstated guess-rate assumption, float overflow/`Infinity` for long lengths (`2^bits` exceeds float64 range around 1024 bits; length 128 with a 94-char pool is ~839 bits, close enough to matter if lengths are raised later), "Weak" labels for deliberately short user choices, colour-only meter, announcement spam on every regenerate.
**Prevention:** Compute in log space (`log10(seconds) = bits*log10(2) - log10(rate)`), cap display at "more than a billion years"/"centuries+". State ONE labelled assumption (for example "offline attack, 10^10 guesses/second against a fast hash"; average case is half the keyspace, so subtract 1 bit). Do not claim "uncrackable". Define thresholds in bits in one constant with the rationale in a comment. Use `role="meter"`/`<meter>` with `aria-valuenow` and a text label so colour is not the only signal; update the live region only when the LABEL changes, not on every Regenerate (entropy only depends on options, not on the output). Pin the label container width/height to avoid text-length layout shift. Never use zxcvbn (decided: too heavy; and it scores generated passwords wrongly).
**Phase to address:** P11 (math), P12 (presentation).

### Pitfall 18: Keyboard model conflicts for the new tool

**What goes wrong:**
`/` should focus the length input, `Enter` regenerate, `Esc` reset, Ctrl/Cmd+C copy; but a global Enter also fires from options inputs (number fields), Esc "reset to defaults" regenerates and clobbers a password the user was about to copy, and the Copy shortcut targets a value with no visible confirmation in batch view.
**Prevention:** Reuse `useKeyboardShortcut` unchanged apart from the Pitfall 11 fix. Decide semantics explicitly: Esc resets OPTIONS to defaults and regenerates (document it, show it in a shortcut hint); Ctrl/Cmd+C copies the first password only when `count === 1` (as `UuidTool.tsx` does); `/` does not fire while focus is in an editable field (already guaranteed by the hook). Per-item copy buttons have unique accessible names.
**Phase to address:** P12.

### Pitfall 19: Custom symbol set edge cases

**What goes wrong:**
User pastes a long string, whitespace, emoji, quotes/backslash that break the URL, or an empty string while "Symbols" is on. Chars that are look-alikes (`|`, `` ` ``, `'`) get filtered making the set empty. Site-compat expectations (some sites reject certain symbols) are not explained.
**Prevention:** Normalise on blur/change: `Array.from`, strip whitespace/control, dedupe, cap length; on empty with Symbols ON, show "Add at least one symbol or turn Symbols off" and retain the last valid password; preset chips ("Common", "Safe for most sites") optional; URL-encode with `URLSearchParams` only (never string concatenation) and test the round trip.
**Phase to address:** P11 (normalise function), P12 (UX).

### Pitfall 20: Test-only pitfalls specific to randomness

**What goes wrong:**
Flaky statistical tests; tests that assert a specific output (impossible) or assert "different from last time" with a 1-in-N chance of equal outputs (for example batch of 1 with length 4 and one set); jsdom's `crypto` differs from the browser, hiding `QuotaExceededError`; fast-check shrinking logs print generated passwords into CI logs (acceptable for test data only).
**Prevention:** Use deterministic stubs for sampler tests; for "two loads differ" e2e use the default 20-char all-sets config (collision probability negligible); include a sampler test that requests the maximum batch x maximum length and asserts no call exceeds 65,536 bytes.
**Phase to address:** P11.

### Pitfall 21: Parity work on Config page inherits its odd layout

**What goes wrong:**
`app/tools/config/page.tsx` is `max-w-6xl` with a 3xl inner heading, whereas the other tool pages are `max-w-3xl`; dropping the shared About component in unchanged yields a section whose width/position differs from the other five pages. The Config tool has no layout spec and a 520 px skeleton that may not match the real island (the rich-text/plain-text preview).
**Prevention:** Make the About component width-agnostic (inherits the parent's container) and place it in a `max-w-3xl` wrapper on Config; measure and re-pin the Config skeleton; add `config-seo.spec.ts` and keep the existing `config.spec.ts` untouched. The config tool processes pasted device configs: keep the FAQ wording free of absolute privacy claims (same banned-phrase test as Hash).
**Phase to address:** P10.

---

## Minor Pitfalls

### Pitfall 22: Details element cosmetic traps

**What goes wrong:** The Worked example is longer than expected on mobile and `break-all` monospace blocks overflow when the section is opened at 320 px (the old hash test only checked this while always-visible).
**Prevention:** Keep the overflow-at-320px assertion, but run it after opening the section via the helper. Keep `data-testid` on the `<details>` wrapper and measure the inner content.

### Pitfall 23: Printing / no-JS

**What goes wrong:** Closed `<details>` content is omitted from print.
**Prevention:** Accept (tool-first design); optional `@media print { details > * { display:block } }` is not worth it for v1.3.

### Pitfall 24: Dev vs prod divergence for the wordlist chunk

**What goes wrong:** `npm run dev` (the default Playwright webServer) does not reproduce production chunk splitting, preload behaviour or the exact "no request until passphrase" property.
**Prevention:** The chunk-loading assertions belong in the prod e2e project (`playwright.prod.config.ts`), alongside the existing worker spec.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `Uint32 % n` without rejection sampling | 3 lines of code | Provable (if tiny) bias in a tool whose product is randomness; reviewers will flag it | Never |
| Keep per-page FAQ/JSON-LD builders and only wrap them in `<details>` | Smaller diff in P10 | Five duplicated builders keep drifting; password and config add two more | Never (shared component is the point of P10) |
| Hard-code entropy numbers in FAQ copy | Quick to write | Silent drift from the calculator | Never; interpolate from lib constants |
| Static-import the wordlist | No loading state | +25-30 KB gzip on every Password-mode view | Never |
| Loosen e2e `toBeVisible` to `toBeAttached` everywhere | Specs go green fast | The opened-state UX is no longer tested | Only for JSON-LD/content-equality tests; keep one opened-state assertion per tool |
| Pin skeleton heights from a macOS measurement only | Fast | CI/Linux CLS regressions (happened in v1.2) | Only if `geometricPrecision` is applied and one Linux-image run is done |
| Skipping Lighthouse on the new/changed pages | Saves time | 90+ target unverified (already the case for `/tools/hash`) | Not for the new Password page; run it on the preview deployment |
| Copy UUID's download/CSV export onto passwords | Feature parity | Plaintext secrets written to disk and download history | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Vercel Analytics (`lib/analytics/redact.ts`) | Adding password option names to `DEFAULT_ALLOW_LIST` "so we can see usage" | Leave the allow-list empty; add a test that option params are stripped |
| Next.js static prerender | Reading `searchParams` in `page.tsx` or using `useSearchParams()` | Read `window.location.search` inside the `ssr:false` island (existing pattern) |
| `useKeyboardShortcut` | Assuming `<summary>`/checkbox are "interactive" for the Enter guard | Extend `isInteractiveTarget` and test it (Pitfall 11) |
| `useCopyToClipboard` | One hook instance for N batch rows (shared "Copied!" state) | One small `CopyButton` per row (as `DigestRow` does) or a single hook with a `copiedIndex`; reset on regeneration |
| `ToolCard` icon map | New icon key not in map -> silent fallback | Explicit named imports + uniqueness/existence test |
| Playwright config | `npm run dev` only | Add prod-config specs for chunk-loading and network silence |
| EFF wordlist | Treating it as public domain | CC BY 3.0 US attribution on the page |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Wordlist in initial chunk | First-load JS +25-30 KB, Lighthouse TBT/LCP drop | Dynamic import on Passphrase | Immediately (every page view) |
| Regenerating the whole batch on each keystroke in the length/symbol-set field | Jank with batch = 20 x length 128 | Cheap enough, but debounce or skip while the field value is invalid | Only if sampling is accidentally O(n^2) (for example string concatenation in loops, `indexOf` for pool lookups) |
| Rejection loop with a tiny acceptance probability | UI freeze at length 4 with four sets | Bound attempts; precondition `length >= sets`; or construct-then-shuffle with documented entropy | Short lengths with many sets |
| Float `2**bits` in crack-time | `Infinity`/`NaN` rendering | Log-space math | Lengths above about 150 chars with a large pool |
| Re-measuring layout in JS to "fit" Subnet | Layout thrash, CLS | Pure CSS density changes | n/a |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Password in prerendered HTML | Same secret served to all visitors | `ssr:false` island + raw-HTML e2e test (Pitfall 1) |
| `Math.random`/modulo bias/silent fallback | Weak or skewed passwords | Single audited `randomInt`, fail closed (Pitfall 2) |
| Password in URL/history/title/attributes/aria-live | Leak via history, analytics, screen readers | Options-only URL, `replaceState(null, ...)`, neutral announcements (Pitfall 5) |
| Options URL as DoS vector (`?len=1e9`, huge `symset`) | Tab freeze/OOM on a shared link | Clamp/whitelist in the parser; unit tests with hostile input |
| Overclaiming privacy in FAQ ("never leaves your browser", "private") | Misleading statement (extensions, clipboard history) | Use the established banned-phrase test; describe mechanism not guarantees |
| Realistic secrets in the Config worked example | Secret scanners/real-credential confusion | RFC 5737 addresses, placeholder tokens |
| Clipboard retention not disclosed | User assumes the copy disappears | One honest FAQ line; no fake auto-clear |
| Export/download of passwords | Plaintext on disk | Do not build it |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Password hidden by default (`type=password`) | Violates "instant useful output"; no readable output to compare/copy | Show it in monospace, `user-select: all`; optional hide toggle |
| Look-alike characters indistinguishable | Mistyped passwords | Monospace with slashed zero, and default look-alike avoidance as an option (not forced) |
| Shortcut hint hidden | Keyboard-first value lost | One-line hint under the tool as on other tools |
| Info sections open and tall on mobile | Tool pushed off-screen (the milestone's reason for existing) | Closed by default, tool-first order, muted styling |
| Strength label flips on every Regenerate | Noise | Label depends on options only |
| Passphrase mode shows an empty box while loading | Looks broken | Pinned skeleton, disabled actions, clear error + Retry |
| Copy confirmation missing in batch | Silent failure | Per-row confirmation and a Copy-all confirmation; shortcut disabled in batch |

## "Looks Done But Isn't" Checklist

- [ ] **Password generator:** prerendered HTML contains no password and no output element (raw-HTML test), and two page loads differ.
- [ ] **Sampler:** no `Math.random`, no `%` on random values outside `randomInt`; boundary test with stubbed `getRandomValues`; no call over 65,536 bytes at max batch x max length.
- [ ] **Entropy:** uses the filtered, deduplicated alphabet and the real wordlist length; correct for guarantee-one-of-each; never `NaN`/`Infinity`; deterministic capitalisation/fixed separator add 0 bits.
- [ ] **URL:** options only; `history.state` null; parser clamps hostile values; round-trip property test with awkward symbols; analytics strips the params (unit test).
- [ ] **Clipboard/password managers:** no `<form>`/password input; `autoComplete="off"` + vendor opt-outs on option inputs; `translate="no"`; honest FAQ line.
- [ ] **Wordlist:** loaded only in Passphrase mode (prod e2e proves it); failure state with Retry and no fallback; integrity test (count, uniqueness, pinned hash); CC BY 3.0 attribution on the page.
- [ ] **About sections (all 6 tools + Password):** native `<details>`, closed by default, content present in server HTML, exactly one JSON-LD script, JSON-LD generated from the same `faqItems`, Enter on a focused summary does NOT trigger the tool.
- [ ] **e2e specs:** uuid/subnet/dns/hash SEO specs updated with `openAbout` helper; new `config-seo.spec.ts`; counts of 6 updated to 7 in registry/home/navigation/sitemap tests; `npm run test:e2e` and `npm run test:e2e:prod` run locally (CI does not run them).
- [ ] **Nav:** seven links verified at 640 px and 700 px; mobile drawer shows 7.
- [ ] **Icons:** Password and Config icons in the `ICONS` map and unique across tools.
- [ ] **CLS/layout:** skeleton pins re-measured for Password, Subnet and Config; layout specs exist and pass; Linux image run done; Lighthouse 90+ on preview for `/tools/password` and `/tools/subnet`.
- [ ] **Subnet compaction:** passes at 1366x650 and 1280x600 for IPv4 default; IPv6 target stated and met; no horizontal overflow at 320/375; copy controls retained; existing subnet testids unchanged; light and dark checked.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Password baked into static HTML | HIGH if shipped | Redeploy immediately (the build output is the leak); add the raw-HTML test; purge CDN cache; note any crawled copies are inert once redeployed |
| Modulo bias discovered after release | MEDIUM | Replace the sampler (single file by design); add the boundary test; no data migration since passwords are never stored |
| Entropy overstated | LOW | Fix `resolveAlphabets`/formula; update FAQ constants (derived, so automatic) |
| e2e specs left red after P10 | LOW | Run the suite locally, add `openAbout` helper, fix selectors |
| JSON-LD drift | LOW | Move to shared component; add the equality unit test |
| CLS regression from stale skeleton | LOW | Re-measure on the Linux image, update pin, rerun layout spec |
| Wordlist bloats first load | LOW | Move to dynamic import; verify via prod e2e |
| Nav overflow with seventh tool | LOW | Raise the nav breakpoint or shorten the label |
| Subnet compaction fails on real laptops | MEDIUM | Re-test at 1366x650/1280x600; trim page chrome as well as the grid |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 SSR/static password leak | P12 (rule in P11) | Raw-HTML e2e test; two-load-differ test |
| 2 Modulo bias / Math.random / fallback | P11 | Stubbed-boundary unit test; lint/grep guard; byte-limit test |
| 3 Entropy errors | P11 | fast-check properties; unit tests for empty pool, length < sets, duplicates |
| 4 Password regenerates under user | P12 | RTL test: copy then value unchanged; reset-on-change test |
| 5 URL/history/analytics/DOM leaks | P11 + P12 | Serializer test, `history.state` e2e, redact test, hostile-input parser tests |
| 6 Password managers/clipboard/translate | P12 | Attribute unit tests; manual 1Password/Bitwarden/Chrome check; FAQ banned-phrase test |
| 7 Wordlist bundle/load/license | P11 + P12 | Integrity test; prod e2e chunk assertion; chunk size noted in PR; attribution present |
| 8 SEO specs and hard-coded counts break | P10 (+P12) | Local e2e + prod e2e green; Vitest component test in CI |
| 9 Wrong disclosure implementation | P10 | `curl` shows closed content; no `"use client"` in About component |
| 10 JSON-LD drift / SEO expectations | P10 + P12 | Equality test; one JSON-LD script; numbers interpolated from constants |
| 11 Enter on `<summary>` | P10 | Hook unit test + e2e |
| 12 Disclosure a11y | P10 | Manual VoiceOver pass; Lighthouse a11y; focus-visible check |
| 13 CLS/pins/platform | P12, P13, P10 | Layout specs; Linux image run; Lighthouse on preview |
| 14 Subnet compaction | P13 | 1366x650 and 1280x600 assertions; 320/375 overflow tests; unchanged subnet testids |
| 15 Nav with 7 tools | P12 | Header test at 640/700 px; updated counts |
| 16 Icon fallback | P10 + P12 | Registry/ToolCard icon-existence and uniqueness test |
| 17 Strength/crack-time | P11 + P12 | Unit tests for log-space math; a11y check of meter |
| 18 Keyboard conflicts | P12 | Keyboard unit/e2e tests |
| 19 Symbol set edge cases | P11 + P12 | Property tests; hostile-input tests |
| 20 Randomness test flakiness | P11 | Deterministic stubs only |
| 21 Config page layout/skeleton | P10 | `config-seo.spec.ts`, layout spec |

## Sources

Codebase (HIGH, read directly 2026-11-11):
- `/Users/mwallraf/Developer/packetory.dev/.planning/PROJECT.md`, `.planning/RETROSPECTIVE.md` (v1.2 lessons: pinned skeletons, Linux glyph rounding, CI e2e removed)
- `app/tools/{hash,uuid,subnet,dns,mac,config}/page.tsx`, `*Loader.tsx`, `faq-data.ts`; `app/tools/uuid/UuidTool.tsx` (regenerate/copy/reset pattern, WR-02/WR-03)
- `lib/hooks/useKeyboardShortcut.ts` (Enter guard selector), `lib/hooks/useCopyToClipboard.ts`, `lib/analytics/redact.ts`, `lib/analytics/PacketoryAnalytics.tsx`
- `components/ToolCard.tsx` (icon map + `Fingerprint` fallback), `components/SiteHeader.tsx`, `tools/registry.ts`, `tools/registry.test.ts`
- `tests/e2e/{hash,uuid,subnet,dns}-seo.spec.ts`, `home.spec.ts`, `navigation.spec.ts`, `hash-layout.spec.ts`; `playwright.config.ts`, `vitest.config.ts`

External (confidence as marked):
- EFF Large Wordlist is CC BY 3.0 US, 7,776 words, about 12.9 bits/word: https://www.eff.org/document/passphrase-wordlists and secondary sources (e.g. https://github.com/philthompson/eff_diceware, https://sts10.github.io/2023/05/04/copyrighting-word-lists.html) — MEDIUM (EFF page not directly readable; multiple secondary sources agree)
- `crypto.getRandomValues` throws `QuotaExceededError` above 65,536 bytes (byte length, not element count); rejection sampling is the standard modulo-bias fix: https://bugzilla.mozilla.org/show_bug.cgi?id=1236176, https://1password.com/blog/generating-strong-passwords — HIGH for the limit, MEDIUM for the bias-magnitude discussion
- Google FAQPage documentation (rich results restricted to well-known government/health sites): https://developers.google.com/search/docs/appearance/structured-data/faqpage — HIGH; claim of full removal in May 2026 (https://www.techwyse.com/news/ai-search/google-faq-rich-results-deprecated-2026, https://searchengineland.com/faq-schema-rise-fall-seo-today-463993) — LOW, unconfirmed
- Content in accordions/tabs indexed with full weight under mobile-first indexing (Google statements 2016/2020; no newer confirmation): https://www.seroundtable.com/amp/google-mobile-first-content-hidden-in-tabs-25658.html, https://www.searchenginejournal.com/googles-mueller-on-myth-of-hidden-tab-content/358724/ — MEDIUM
- Radix/shadcn accordion unmounts closed content (from library behaviour, not re-verified in this session) — MEDIUM
- Browser find-in-page expansion of `<details>`, Safari marker behaviour, Geist Mono ligatures — from general knowledge, not verified in this session — LOW-MEDIUM; verify during P10/P12 manual testing

---
*Pitfalls research for: Packetory v1.3 (Password Generator & Tool Page Polish)*
*Researched: 2026-11-11*
