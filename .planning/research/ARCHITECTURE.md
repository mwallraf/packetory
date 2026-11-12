# Architecture Patterns — v1.3 Integration

**Domain:** Browser-first utility site (Next.js 16 App Router, static-first)
**Milestone:** v1.3 Password Generator & Tool Page Polish (adds to the shipped v1.2 app)
**Researched:** 2026-11-11
**Confidence:** HIGH. Every integration point below was read from the actual repo, not inferred. The only MEDIUM items are called out inline (nav width at 640px, wordlist chunk size, 1366x768 headroom).

> Scope: only what the four v1.3 features need. The v1.2 hash/worker architecture is in git history and is untouched.

---

## 1. What exists today (the seams v1.3 plugs into)

| Seam | Current reality (verified in repo) | v1.3 consequence |
|------|-----------------------------------|------------------|
| Tool registration | `tools/registry.ts` is the single source for nav (`SiteHeader` -> `getSortedTools()`), landing cards (`app/page.tsx`), sitemap (`app/sitemap.ts`). Icon string -> lucide component map lives ONLY in `components/ToolCard.tsx` (`ICONS`, falls back to `Fingerprint`). | Password = one registry entry + one `ICONS` entry. Config icon = edit its registry `icon` + add to `ICONS`. No nav/sitemap edits. |
| Page shape | Each `app/tools/<slug>/page.tsx` is a Server Component: metadata, a hand-copied `faqJsonLd` const, `<script type="application/ld+json">`, `<main max-w-3xl>`, `<h1>`, `<XToolLoader/>`, then a hand-copied "Worked example" `<section>` and "FAQ" `<section>`. Six pages, ~100-170 duplicated lines each. | This duplication is exactly what feature 4 replaces with a shared component. |
| Client island | `XToolLoader.tsx` ("use client") does `dynamic(() => import("./XTool"), { ssr:false, loading: skeleton })`. Skeleton height is pinned to the settled island to avoid CLS. | Password follows this verbatim. |
| Core logic | `lib/<tool>/*` framework-agnostic, each with sibling `*.test.ts`, fast-check for math. | `lib/password/*` follows this. |
| URL state | Subnet: raw `window.history.replaceState` (never `router.replace`). Hash: read-only at mount (`?text=`), explicit "Copy link", never writes. Locked key decision in PROJECT.md. | Password: read once at mount + `replaceState` on option change; options only. |
| Analytics redaction | `DEFAULT_ALLOW_LIST = []` in `lib/analytics/redact.ts` and `PacketoryAnalytics.redactBeforeSend` strips EVERY query param. `#fragment` is not redacted. | Password option params are stripped automatically with zero code. Do NOT use `#fragment` for state. Add a regression test only (section 6). |
| Hooks | `useCopyToClipboard()` (per-instance `copied`/`error`/`reset`), `useKeyboardShortcut({slash,enter,escape,copy})`. Enter is suppressed on `button, [role=button], [role=radio], a[href]`. | Reused as-is — with ONE required fix: `summary` is missing from that Enter guard (section 2.4). |
| Tests | Vitest + jsdom unit tests beside source. Playwright e2e under `tests/e2e/*-seo.spec.ts` use `toBeVisible()` on worked-example/FAQ content and `getByTestId("<slug>-faq-item")`; home/navigation specs hard-code `toHaveCount(6)`. CI gate = typecheck/lint/test/build only (e2e is local). | Collapsing content breaks `toBeVisible()` assertions; adding tool 7 breaks the `6` counts. Both are listed as explicit modifications below. |

---

## 2. Feature 4 first: shared `ToolAbout` (the foundation everything else builds on)

### 2.1 Design decision: native `<details>`, rendered on the server

Use native `<details>/<summary>` inside a **Server Component** (no `"use client"`, no state, no Radix Collapsible).

Why:
- **Content stays in the HTML.** Closed `<details>` bodies are in the DOM/HTML payload, so SEO indexing and the FAQPage JSON-LD <-> visible-text parity both hold. A JS-driven accordion that mounts children only when open would break this.
- **Zero JS added** to seven pages (perf NFR, 90+ Lighthouse).
- Built-in keyboard (Enter/Space on `<summary>`), `aria-expanded` semantics, find-in-page auto-expand in Chromium.
- Closed-by-default is just the absence of the `open` attribute.

Two disclosures, not one per FAQ question: one `<details>` for "Worked example", one for "FAQ". FAQ questions render as plain visible `<div><p>question</p><p>answer</p></div>` inside the open FAQ disclosure. This preserves the existing e2e contract (`hash-seo.spec.ts` reads `faqItems.nth(i).locator("p")` and expects `p[0]=question`, `p[1]=answer`).

### 2.2 Component set (all NEW)

```
lib/seo/jsonld.ts            pure: buildFaqJsonLd(items) + serializeJsonLd(obj)  (the "<" -> < escape lives here ONCE)
lib/seo/jsonld.test.ts       asserts escape, @type, mainEntity order == items order
components/FaqJsonLd.tsx     server: <script type="application/ld+json" dangerouslySetInnerHTML=...>
components/ToolAbout.tsx     server: muted "About this tool" wrapper + the two <details>
components/ExampleFields.tsx server: <dl> grid of {label,value,mono?} (replaces the 3 copy-pasted dl blocks in subnet/dns/mac pages)
components/ToolAbout.test.tsx  closed by default, content present in DOM, testids, FAQ p/p structure
```

(Components stay flat in `components/` to match the existing layout — `ToolCard`, `IpBadge`, `SiteHeader`.)

### 2.3 API

```tsx
// components/ToolAbout.tsx  (Server Component)
export type FaqItem = { question: string; answer: string };

type ToolAboutProps = {
  /** registry slug; drives data-testids: `${slug}-worked-example`, `${slug}-faq`, `${slug}-faq-item` */
  slug: string;
  /** Tool-specific example body. Omit to hide the Worked example disclosure. */
  workedExample?: React.ReactNode;
  /** Same array passed to <FaqJsonLd items=.../> so visible text and JSON-LD cannot drift. */
  faq?: readonly FaqItem[];
};

export function ToolAbout({ slug, workedExample, faq }: ToolAboutProps) {
  return (
    <section aria-labelledby={`${slug}-about`} className="mt-12 border-t border-border pt-6 text-muted-foreground">
      <h2 id={`${slug}-about`} className="text-[14px] font-semibold text-muted-foreground">About this tool</h2>
      {workedExample && (
        <details data-testid={`${slug}-worked-example`} className="group mt-3 ...">
          <summary className="flex cursor-pointer list-none items-center gap-2 ... [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
            Worked example
          </summary>
          <div className="mt-3">{workedExample}</div>
        </details>
      )}
      {faq && faq.length > 0 && (
        <details data-testid={`${slug}-faq`} className="group mt-3 ...">
          <summary ...>FAQ</summary>
          <div className="mt-3 space-y-6">
            {faq.map((item) => (
              <div key={item.question} data-testid={`${slug}-faq-item`}>
                <p className="text-[14px] font-semibold text-foreground">{item.question}</p>
                <p className="mt-1 text-[16px] text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
```

Page usage (replaces ~100 lines per page):

```tsx
export default function SubnetPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <FaqJsonLd items={faqItems} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 ...>IP Subnet Calculator</h1>
        <div className="mt-8"><SubnetToolLoader /></div>
        <ToolAbout slug="subnet" faq={faqItems} workedExample={<SubnetWorkedExample />} />
      </main>
    </div>
  );
}
```

Per-page worked-example bodies stay tool-specific (UUID: two samples; Hash: sha256/printf/echo; Subnet: IPv4+IPv6 groups) but are passed as `children`-style props and use `ExampleFields` for the repetitive `<dl>`. Keep each tool's existing `faq-data.ts` unchanged (its `FaqItem` is structurally identical to the shared type). Preserve every existing inner testid (`uuid-worked-example-v4/-v7`, `hash-worked-example-sha256/-printf/-echo`, `*-faq-item`).

Not recommended: a full `ToolPageShell` (title + width + loader slot). Config uses `max-w-6xl` + subtitle, Subnet may widen for compaction — the abstraction would leak immediately. Keep the shell per page; share only the About block and JSON-LD.

### 2.4 Required hook fix (found during research — would ship as a bug otherwise)

`useKeyboardShortcut`'s Enter guard (`isInteractiveTarget`) matches `button, [role="button"], [role="radio"], a[href]`. A focused `<summary>` is none of these, so pressing Enter to open "FAQ" would BOTH toggle the disclosure AND fire the tool's global `enter` handler (regenerate password/UUID, run DNS lookup, blur Subnet). This is the same double-fire class as the Phase 2 CR-01 key decision.

- **MODIFY** `lib/hooks/useKeyboardShortcut.ts`: add `summary` to the `closest(...)` selector.
- **MODIFY** `lib/hooks/useKeyboardShortcut.test.ts`: add a case "Enter on a focused summary does not call enter handler".
- Minor pre-existing wrinkle (optional, one line): the Ctrl/Cmd+C handler fires when focus is not editable even if the user has selected FAQ prose; guard with `window.getSelection()?.toString()` non-empty so selecting FAQ text and copying keeps native behaviour.

### 2.5 Existing tests that MUST be modified (collapsed content is not "visible")

Playwright treats closed `<details>` content as hidden. Add a tiny helper `tests/e2e/helpers/about.ts` (`openAbout(page, slug, "worked-example" | "faq")` = click `[data-testid="${slug}-<section>"] > summary`) and call it before any visibility assertion.

| File | Change |
|------|--------|
| `tests/e2e/uuid-seo.spec.ts` | `getByText(...).toBeVisible()` (3 FAQ questions) and `uuid-worked-example-v4/-v7` `toBeVisible()` need `openAbout` first. `toHaveCount`/JSON-LD asserts unchanged (items remain attached). |
| `tests/e2e/subnet-seo.spec.ts` | `subnet-worked-example` `toBeVisible()` + nested `getByText` visibility -> open first. |
| `tests/e2e/dns-seo.spec.ts` | same for `dns-worked-example` (lines ~84-92) and FAQ. |
| `tests/e2e/hash-seo.spec.ts` | FAQ count/JSON-LD parity unaffected; worked-example `textContent()` fine; any `toBeVisible` -> open first. |
| `tests/e2e/mac-lookup.spec.ts` | check for MAC worked-example/FAQ assertions; open first if present. |
| NEW assertions (add to each `*-seo.spec.ts` or one `about.spec.ts`) | `details` has no `open` attribute on load; JSON-LD `mainEntity.length` equals the number of `*-faq-item` nodes while FAQ is closed (proves content-in-HTML). |

### 2.6 CLS note
The About block sits below the pinned-height tool skeleton, so no shift is introduced; opening a disclosure only moves content below it (the footer). No skeleton re-measurement required (the hash skeleton pins the tool only).

---

## 3. Feature 2: Config highlighter parity (first consumer of `ToolAbout`)

| Action | File | Detail |
|--------|------|--------|
| NEW | `app/tools/config/faq-data.ts` | `faqItems` (4-5 items: which syntaxes are supported — only Cisco IOS/IOS-XE/IOS-XR + plain; rich-text vs plain copy and why Outlook/Word paste works; "does my config leave the browser?" — **privacy wording needs human approval per project rule**; what "Colour mode" does), plus a `sampleConfig` const. |
| NEW | `app/tools/config/token-classes.ts` | Move `TOKEN_CLASSES` / `MONOCHROME_TOKEN_CLASSES` out of `ConfigTool.tsx` so the server-rendered example and the island share one palette. |
| MODIFY | `app/tools/config/ConfigTool.tsx` | Import the classes from `token-classes.ts` (pure move, no behaviour change). |
| NEW | `app/tools/config/ConfigWorkedExample.tsx` | Server component: calls the pure `highlightConfig(sampleConfig, "cisco")` at build time and renders the tokens as spans in a `<pre>`. Truthful (same tokenizer as the live tool), zero client JS. Optionally show the "rich copy" vs "plain copy" note. |
| MODIFY | `app/tools/config/page.tsx` | Add `<FaqJsonLd items={faqItems}/>` and `<ToolAbout slug="config" .../>`; keep `max-w-6xl`; improve title/description for SEO parity (keep "Cisco", "IOS-XE", "IOS-XR"). |
| MODIFY | `tools/registry.ts` | `config.icon`: `"Network"` -> `"FileCode"` (verified exported by installed lucide-react; `SquareTerminal` also exists). |
| MODIFY | `components/ToolCard.tsx` | Add `FileCode` (and `KeyRound`, see section 4) to the `ICONS` map — the map is the only place icons resolve; a missing entry silently falls back to `Fingerprint`. |
| MODIFY | `components/ToolCard.test.tsx` | Add "renders FileCode (not the Fingerprint fallback) for icon 'FileCode'", mirroring the existing Hash-icon test. |
| NEW | `tests/e2e/config-seo.spec.ts` | metadata, FAQ parity with JSON-LD, worked example present after `openAbout`. |

Existing `tests/e2e/config.spec.ts` only exercises the interactive tool — unaffected.

Note (not in scope, flag only): Config has no zero-effort default result (preview starts empty). The milestone only asks for parity items, so leave it.

---

## 4. Feature 1: Password Generator

### 4.1 Files

```
lib/password/                         # framework-agnostic, zero React/Next imports
  types.ts          PasswordOptions, PassphraseOptions, GeneratorMode, ToolOptions, defaults, limits (MIN/MAX_LENGTH, MAX_BATCH=20, WORD_MIN/MAX)
  random.ts         randomInt(maxExclusive, fill?) : unbiased rejection sampling over Uint32; shuffle()/pick(); `fill` injectable for tests
  charset.ts        class constants, AMBIGUOUS set, normalizeSymbols(input) (dedupe, printable ASCII, no space/alnum, cap ~32), buildCharset(opts) -> {pools, all, size}
  generate.ts       generatePassword(opts, fill?) ; generateBatch(opts, count)
  passphrase.ts     generatePassphrase(opts, words, fill?) (separator, capitalize, append number)
  entropy.ts        passwordEntropyBits(opts), passphraseEntropyBits(opts, wordCount), strengthLevel(bits), crackTimeEstimate(bits, guessesPerSec) -> {label, seconds log-space}
  url-state.ts      parseOptions(search: string): ToolOptions  (TOTAL — clamps/whitelists, never throws)
                    serializeOptions(opts): string            (omits defaults; NEVER takes/returns a generated value)
  wordlist.ts       loadWordlist(): Promise<readonly string[]> (memoized dynamic import), WORD_COUNT const
  wordlist/eff-large.ts   default export: one space-joined string of the 7,776 EFF large-list words
  *.test.ts         one per module (see 4.6)

app/tools/password/
  page.tsx                  server shell: metadata, FaqJsonLd, h1, <PasswordToolLoader/>, <ToolAbout slug="password" .../>
  PasswordToolLoader.tsx    "use client" dynamic ssr:false + pinned-height skeleton
  PasswordTool.tsx          client island; owns ALL state
  PasswordOptionsPanel.tsx  controls (mode toggle, length, class switches, symbol input, look-alikes, passphrase controls, batch)
  PasswordOutput.tsx        hero (count=1) or batch list; per-row copy (own useCopyToClipboard per row component); Copy all
  StrengthMeter.tsx         presentational: bits, level label, bar (role="meter"/aria-valuenow), crack-time line + stated assumption
  faq-data.ts               faqItems + worked-example constants (static sample strings; entropy numbers computed from lib/password/entropy at build time)
  PasswordTool.test.tsx     RTL: defaults on load, toggle, regenerate, URL write, copy
tests/e2e/password.spec.ts, password-seo.spec.ts
tests/e2e-prod/password-wordlist.spec.ts   # network assertion on the lazy chunk (precedent: hash-worker.spec.ts)
```

### 4.2 Modified existing files (password-specific)

| File | Change |
|------|--------|
| `tools/registry.ts` | Add `{ slug:"password", name:"Password Generator", shortName:"Password", description, category:"generate", keywords:[password, passphrase, random, entropy, generator], icon:"KeyRound", status:"active", clientOnly:true, featured:false }`. Sorted order becomes subnet, uuid, config, dns, hash, mac, password. |
| `tools/registry.test.ts` | `toHaveLength(7)`, slugs list, sorted order, statuses map. |
| `components/ToolCard.tsx` | `KeyRound` in `ICONS`. |
| `tests/e2e/home.spec.ts` | three `toHaveCount(6)` -> 7. |
| `tests/e2e/navigation.spec.ts` | `drawer.locator("a")` count 6 -> 7; the 640px describe ("fits six tools") -> seven, loop to 7. |
| `app/layout.tsx` | Optional: refresh root `description` string (mentions only 5 tools). |
| `lib/analytics/redact.test.ts` | Add a guard test: every param name from `serializeOptions` is absent from `DEFAULT_ALLOW_LIST` (see 6). |

**Risk (MEDIUM):** the desktop nav is `hidden sm:flex`, so at exactly 640px seven links incl. "Password" must fit beside logo + theme toggle. Rough estimate is ~600px used — tight. Verify with the existing 640px overflow test; fallback is a shorter `shortName` ("Pass"/"Pwd") — shortName is nav-only, `name` is used elsewhere.

### 4.3 Wordlist loading

- **Source:** EFF large wordlist (7,776 words, 12.925 bits/word). It is CC BY 3.0 US — include a header comment + one attribution line in the FAQ/About. Vendored file, not an npm dependency (no new deps).
- **Format:** a single space-joined string default-exported from `lib/password/wordlist/eff-large.ts`, split on first use. Roughly 55-60 KB raw, ~20-25 KB gzip (MEDIUM — measure in build). Smaller and cheaper to parse than a 7,776-element JSON/array literal.
- **Loading:** `loadWordlist()` = `import("./wordlist/eff-large").then(m => m.default.split(" "))`, memoized in a module-level promise. Webpack/Turbopack emit it as a separate hashed, immutably-cacheable chunk, so it is NEVER in initial page JS. No `fetch`, no `public/` asset, no third-party request (satisfies the "no third-party requests" NFR).
- **Trigger:** (a) first switch to Passphrase mode; (b) on mount only when the URL says `mode=passphrase`; (c) optional `onPointerEnter`/`onFocus` on the Passphrase toggle calls `void loadWordlist()` to make the switch feel instant. Do NOT preload on idle for Password-mode visitors.
- **Staleness guard (apply the project's Phase 4/5 lesson):** the resolved promise must check a `modeRef`/sequence token and be ignored if the user toggled back to Password before it resolved. Memoizing makes repeat toggles synchronous after the first load.
- **State while loading:** passphrase output area keeps its fixed height and shows a pending placeholder (like the hash tool's pending rows) — no layout shift; entropy line can render immediately because it depends only on `words * log2(7776)`.
- **Integrity test:** `wordlist.test.ts` asserts length 7776, all unique, all `[a-z-]+`. (EFF large contains a few hyphenated words such as `drop-down`/`t-shirt`; entropy is unaffected because words are drawn independently, but surface this in the FAQ or filter nothing — do not silently alter the list or the 12.925 bits/word claim.)

### 4.4 Data flow (client island, no server involvement)

```
page load
  PasswordToolLoader (ssr:false) --skeleton--> dynamic import PasswordTool
  PasswordTool useState initializer:
     options  = parseOptions(window.location.search)      // total, clamped, defaults on junk
     outputs  = generate(options)                          // crypto.getRandomValues, in handler-style, NOT useMemo
  (mode=passphrase) -> loadWordlist().then(words => if still passphrase: setOutputs(generate...))

user changes ANY option                              user clicks Regenerate / presses Enter
  commit(nextOptions):                                 regenerate():
     setOptions(next)                                     setOutputs(generate(options))
     setOutputs(generate(next))
     history.replaceState(null,"", serializeOptions(next) ? "?"+qs : pathname)   // options ONLY
  resetCopy() when outputs change (WR-02 pattern from UuidTool)

derived on every render (pure, not stored):
  entropyBits = mode==="password" ? passwordEntropyBits(options) : passphraseEntropyBits(options)   // from OPTIONS, never from the output string
  strength    = strengthLevel(entropyBits); crack = crackTimeEstimate(entropyBits, GUESSES_PER_SEC)

copy: useCopyToClipboard (one hook per row component + one for Copy all) -> navigator.clipboard.writeText(exact string)
```

Rules that fall out of existing decisions:
- **Regenerate in handlers, store `outputs` in state** (UuidTool pattern). Never generate inside render or `useMemo` (impure; React may re-run it).
- **URL = options only.** `serializeOptions` accepts an options object and has no parameter through which a password could flow. `outputs` is never read by the URL code. Default-valued params are omitted so the default page URL stays clean `/tools/password`. Use raw `window.history.replaceState`, never `router.replace` (locked decision). Param names, e.g. `mode,len,u,l,d,s,sym,amb,words,sep,cap,num,n`, are short and whitelisted; `sym` is run through `normalizeSymbols` on read (cap + printable-ASCII filter prevents huge/hostile URLs from distorting entropy math).
- **Single source of truth for options** (one `ToolOptions` object), as with `UuidToolState`; the displayed strength can never disagree with generation because both read the same object.
- **Entropy from options, not output.** Password: `L * log2(N)` where `N` = size of the unique, ambiguity-filtered charset. If "at least one of each enabled class" is enforced, do it by rejection-resampling (uniform over valid strings) rather than slot-forcing, and document that `L*log2(N)` slightly overstates for short lengths (negligible at L>=12). Passphrase: `words*log2(7776)` + `log2(10^digits)` if a number is appended; capitalization and separator add 0 (deterministic) — do not count them.
- **Crack-time estimate:** compute in log space (`(bits-1)*log10(2) - log10(rate)`) so 128-char passwords do not overflow; show one stated assumption in the UI ("at 10 billion guesses/second, offline fast hash"); cap display at "billions of years+". Label it an estimate.
- **Keyboard (reuse hook unchanged):** `slash` -> focus length input; `enter` -> regenerate (guarded for buttons/radios; `summary` after 2.4); `escape` -> reset to defaults and clear query string (matches Subnet's Esc-reset); `copy` -> copy the single password, **disabled when batch > 1** (same rationale as UuidTool WR-03: no visible confirmation in list view).
- **Length control:** native `<input type="range">` bound to a numeric `<Input>` (no new shadcn component or dependency). Note that Enter inside these inputs regenerates, which is desired.
- **UI primitives available** in `components/ui`: `switch`, `toggle-group`, `input`, `label`, `scroll-area`, `badge`, `separator`. Batch list reuses UUID's `ScrollArea max-h-96` pattern.
- **Skeleton:** pin height to the settled default (count=1, password mode) and measure it like `HashToolSkeleton` (rounded to multiple of 4, with a `sm:` variant if wrapping differs at 320px). Add a CLS check at 320/375/768 using the existing hash-layout spec as a template.

### 4.5 Page content (`ToolAbout` consumer)
- Worked example (server-rendered, static): one sample 20-char password and one sample 5-word passphrase labelled clearly as examples (never a freshly generated secret), plus the two entropy numbers computed from `lib/password/entropy` at build time (20 chars x log2(94) ~= 131 bits; 5 words ~= 64.6 bits) so the page cannot drift from the library.
- FAQ (+ `FaqJsonLd`): passphrase vs password; is Math.random used (no: `crypto.getRandomValues` + rejection sampling); what entropy/crack-time mean; why look-alike exclusion; what is in the URL. **The "is it sent anywhere / stored" answer is privacy wording — the project requires human approval for privacy text** (the hash FAQ pins two approved sentences with an exact-equality test; copy that pattern: "options are saved in the link, never the password" + "generated in your browser", pinned in `faq-data.test.ts`).
- Metadata: unique title/description/canonical/OG (`/tools/password`), mirroring the hash page.

### 4.6 Test plan (what proves the design)
- `random.test.ts`: `randomInt` bias check with an injected `fill` that returns values at/above the rejection threshold (proves resample path); fast-check: results always in `[0,n)`; chi-square sanity on 1e5 draws for n=94 and a non-power-of-two n.
- `charset.test.ts` / `generate.test.ts` (fast-check): length exact; every char in charset; each enabled class present; excluded look-alikes never appear; symbol-set normalization idempotent; options with zero classes -> typed error/defaults, never an empty-charset infinite loop.
- `passphrase.test.ts`: word count/separator/capitalize/number combos; deterministic with injected `fill`.
- `entropy.test.ts`: known values (L=20,N=94 -> 131.1 bits; 5 words -> 64.6 bits); monotonic; crack-time log-space does not overflow at max length/batch.
- `url-state.test.ts` (fast-check): `parse(serialize(o))` round-trips for valid options; arbitrary junk strings never throw and always return in-range options; serialized output never contains anything but whitelisted keys.
- `wordlist.test.ts`: 7776 unique, charset-clean; `loadWordlist` memoized (same promise).
- e2e: password present on load; toggle to passphrase loads the chunk; `?len=32&mode=passphrase&words=6` restores controls; URL never contains the password after Regenerate; copy + "Copied!" confirmation; Enter/slash/Esc; batch 20 + Copy all.
- e2e-prod: initial `/tools/password` load makes NO request for the wordlist chunk; one request after toggling to Passphrase; no third-party requests.

---

## 5. Feature 3: Subnet compaction to fit 1366x768

Files: `app/tools/subnet/SubnetTool.tsx` (layout classes only), `app/tools/subnet/page.tsx` (shell width/padding; already edited in the About migration), `tests/e2e/subnet.spec.ts` (+ new viewport spec). `lib/subnet/*` is untouched — this is a pure presentation change, so the 130 unit tests do not move.

Where the vertical space goes today (estimated from the markup; re-measure before cutting): header ~50 + `py-12` 48 + h1 38 + `mt-8` 32 + CIDR block ~60 + `gap-8` 32 + hero card ~76 + `gap-8` 32 + IPv4 grid of 9 `CopyableField` cards in 2 columns = 5 rows x ~92px + gaps ~ 525 = **~890px**, against ~650-700px usable on a real 768px-tall laptop viewport. IPv6 adds a subdivision section on top. The two dominant costs: (1) each `CopyableField` is tall because of the `h-11` (44px) copy button inside it, (2) a single 2-column grid.

Recommended cuts, in order of payoff:
1. **Dense field tiles at `lg`:** keep the 44px hit target for touch (default classes) but drop to `lg:h-8 lg:min-w-8` on `CopyableField`'s copy button and `lg:py-2` on the tile -> ~56px tiles. Desktop-only; mobile/touch targets unchanged.
2. **3 columns at `lg`** (`lg:grid-cols-3`) and widen the subnet page main to `max-w-5xl`: 9 IPv4 fields -> 3 rows (~3x56 + gaps ~190px vs 525px). Keep `grid-cols-1 sm:grid-cols-2` below `lg` (mobile/320px path untouched). Long values (binary, IPv6 expanded) keep `break-all` and may span via `lg:col-span-3`/`col-span-2` for `binary`/`expanded` to avoid ugly wraps.
3. **Fold the hero into the CIDR row** at `lg`: input and copy-hero button side by side (`lg:flex-row`), removing a whole 76px card + 32px gap. Keep `subnet-hero`, `subnet-hero-value`, `subnet-copy-hero` testids.
4. **Tighten page rhythm:** `py-12` -> `py-8 lg:py-6`, h1 `mt-8` -> `mt-4`, tool `gap-8` -> `gap-4 lg:gap-5`.
5. IPv6 subdivision section: make it a single inline row (label + pills) at `lg` so IPv6 /32 still fits.

Do NOT remove fields or move copy buttons out of the tiles — e2e tests and `subnet-copy-<key>` testids depend on them.

**Acceptance (put this in the phase's success criteria):** a Playwright spec at viewport `1366x768` (and ideally `1366x650`, since real browser chrome eats ~100px) loads `/tools/subnet` default IPv4 `/24`, then an IPv6 `/48`, and asserts the bottom of the last output element (`getBoundingClientRect().bottom`) is `<=` `window.innerHeight`, with the About block explicitly allowed to be below the fold. Assert on the tool island's lowest element, not `document.scrollHeight` (the footer would fail it). **Open question for requirements (MEDIUM):** is the target 768 CSS px of viewport or 768 px screen with browser chrome (~650 usable)? Recommend gating on 650.

Because compaction changes only presentation, it is independent of the `ToolAbout` work except for sharing `subnet/page.tsx`; do the About migration first so the page file is edited once per phase.

---

## 6. Analytics / privacy integration (no new code, one regression test)

- `DEFAULT_ALLOW_LIST` is `[]` and `redactBeforeSend` strips all query params from every event URL, so `?len=...&mode=...&sym=...` never reaches Vercel Analytics. Do **not** add any password param to the allow-list.
- **Add** to `lib/analytics/redact.test.ts` (or `lib/password/url-state.test.ts`): assert `redactParams(serializeOptions(opts))` is `{}` and that none of the password param names appears in `DEFAULT_ALLOW_LIST` — this turns a future well-meaning allow-list addition into a failing test.
- Generated passwords must never appear in: the URL, `localStorage`/`sessionStorage`, console logs, test snapshots, or analytics events. No persistence layer for outputs (unlike UUID's optional "last 5" idea — explicitly do not do it for passwords).
- `#fragment` is not redacted (accepted tech debt) — keep state in the query string; never in the hash.

---

## 7. Component boundaries

| Component | Responsibility | Talks to |
|-----------|----------------|----------|
| `components/ToolAbout` (NEW, server) | Muted "About this tool" wrapper; Worked example + FAQ `<details>` (closed by default, content in HTML) | pages; `FaqItem[]` from per-tool `faq-data.ts` |
| `components/FaqJsonLd` (NEW, server) | Single place that builds + escapes FAQPage JSON-LD | `lib/seo/jsonld.ts` |
| `components/ExampleFields` (NEW, server) | `<dl>` label/value grid for worked examples | Subnet/DNS/MAC example bodies |
| `lib/password/*` (NEW) | All password logic, pure | `crypto.getRandomValues` only; consumed by `PasswordTool`, `faq-data` (entropy numbers) and tests |
| `PasswordTool` (NEW, client) | Owns `ToolOptions` + `outputs`; URL sync; wordlist lifecycle; keyboard wiring | `lib/password/*`, `useCopyToClipboard`, `useKeyboardShortcut`, `History API` |
| `PasswordOptionsPanel` / `PasswordOutput` / `StrengthMeter` (NEW, client) | Presentation + callbacks only; no generation logic | `PasswordTool` |
| `tools/registry.ts` + `ToolCard` `ICONS` (MOD) | Registration + icon resolution | nav, landing, sitemap (unchanged) |
| `useKeyboardShortcut` (MOD) | Enter guard now also skips `summary` | all tool islands |
| `SubnetTool` (MOD) | Dense `lg` layout only | `lib/subnet/*` unchanged |

---

## 8. Patterns to follow

### Pattern 1: Server-shell + client-island (existing, reuse)
`page.tsx` stays a static Server Component; `PasswordToolLoader` owns `dynamic(..., { ssr:false })` + pinned skeleton. Random output is never server-rendered, so there is no hydration mismatch.

### Pattern 2: Native disclosure for secondary content
Server-render `<details>`; never gate content behind JS state. Keeps SEO + JSON-LD parity and adds zero client JS.

### Pattern 3: Injectable randomness for testability
`random.ts` takes an optional `fill: (buf: Uint32Array) => void` defaulting to `crypto.getRandomValues`. Production code never passes it; tests inject deterministic streams to prove the rejection-sampling branch and exact outputs.

### Pattern 4: Lazy data via memoized dynamic import
`loadWordlist()` memoizes one promise; consumers guard against stale resolution with a ref/sequence token (the Phase 4/5 cancellation lesson applied to a non-network async path).

## Anti-Patterns to Avoid

- **`Math.random()` or `value % n` on a random word.** Modulo bias and a non-CSPRNG are the two classic password-generator defects. Always rejection-sample over `Uint32`.
- **Generating inside `useMemo`/render.** Impure; recompute-on-demand by React would silently change the displayed password. Generate in handlers, store in state.
- **Writing the password (or a hash of it) to the URL, storage, or console.** Options only; enforce structurally (serializer signature) and by test.
- **Deriving entropy from the output string** (e.g. char-class heuristics, zxcvbn). Entropy is a property of the generation process; compute it from options.
- **Importing the wordlist statically** (`import words from ...` at module top of `PasswordTool`). Would pull ~60 KB into the page's initial JS and violate the perf NFR.
- **Per-page duplicated JSON-LD/About markup.** The whole point of `ToolAbout`/`FaqJsonLd`; do not let the password or config page add a seventh/eighth copy.
- **A client-side accordion (`useState` open/closed) for About.** Breaks "content stays in HTML" if children mount lazily and adds JS to every tool page.
- **Allow-listing password option params in analytics.** The empty allow-list is the privacy guarantee.

---

## 9. Suggested build order (with dependency reasoning)

```
Phase A  Shared About foundation + Config parity ──┬──> Phase D  Password UI + registry + e2e
Phase B  Subnet compaction (independent)           │
Phase C  lib/password core (independent, pure) ────┘
```

1. **Phase A — Shared `ToolAbout` + migrate all 6 pages + Config parity.**
   Build order inside the phase: `lib/seo/jsonld` -> `FaqJsonLd` -> `ToolAbout`/`ExampleFields` -> hook Enter-guard fix -> migrate pages one by one (UUID first: simplest, then Hash, DNS, MAC, Subnet) updating each `*-seo.spec.ts` + helper -> Config (`faq-data`, `token-classes`, `ConfigWorkedExample`, page, icon, `ICONS`, tests).
   Why first: Password and Config pages are *consumers* of this API; settling it before writing a seventh page avoids a second migration. Config is the smallest real consumer and exercises the "tool with no prior About" path. It also front-loads all the e2e churn (visibility asserts) into one reviewable change. Contains the only edit to the shared hook.
2. **Phase B — Subnet compaction.** Independent files (`SubnetTool.tsx`); can run in parallel with C. After A so `subnet/page.tsx` is not edited by two phases. Acceptance is the viewport Playwright spec above.
3. **Phase C — `lib/password` core + wordlist (no UI).** Pure TDD with fast-check; can start any time, in parallel with A/B. Delivering and verifying the sampling, entropy and URL codec before any UI exists is where the correctness/security risk lives; the UI is then thin wiring.
4. **Phase D — Password tool UI + registration.** Depends on A (`ToolAbout`) and C (`lib/password`). Includes registry/`ICONS`/test-count updates (6->7), page + loader + skeleton measurement, URL sync, keyboard, e2e and the e2e-prod lazy-chunk assertion, the 640px nav check, and the human-approved FAQ privacy wording.

Registry/`ICONS` contention: Phase A edits `registry.ts` (config icon) and `ToolCard.tsx`; Phase D edits both again. Keep A before D (as above) to avoid merge conflicts, or land both icons in A.

## Research flags for phases
- Phase A: standard patterns; the only non-obvious item is the `summary` Enter-guard gap (already identified) — no deeper research needed.
- Phase B: needs a measurement step at the start (screenshot at 1366x768 / 1366x650 to confirm where the pixels go) and a requirements decision on 768 vs ~650 usable height.
- Phase C: standard crypto-sampling patterns; confirm wordlist license text/attribution and chunk size at build.
- Phase D: standard once A and C exist; verify the 640px nav fit and the skeleton height empirically.

## Scalability / perf notes
| Concern | v1.3 impact |
|---------|-------------|
| Initial JS per tool page | `ToolAbout` is server-only (0 B). Password island is options UI + small `lib/password` (no wordlist). Wordlist (~20-25 KB gzip) only in a lazy chunk, only on Passphrase. |
| CLS | Pinned skeleton for password; About lives below tools and is collapsed; no async content above the fold except the wordlist-pending placeholder with fixed height. |
| Lighthouse | Fewer visible DOM nodes per page (collapsed About) is neutral-to-positive; `<details>` needs no hydration. |

## Sources
- Repo (read directly, HIGH): `tools/registry.ts`, `app/tools/{uuid,subnet,dns,mac,hash,config}/page.tsx`, `*Loader.tsx`, `SubnetTool.tsx`, `UuidTool.tsx`, `ConfigTool.tsx`, `components/ToolCard.tsx`, `components/SiteHeader.tsx`, `lib/hooks/*`, `lib/analytics/*`, `lib/hash/share-link.ts`, `tests/e2e/*-seo.spec.ts`, `home.spec.ts`, `navigation.spec.ts`, `tools/registry.test.ts`, `.planning/PROJECT.md`.
- `lucide-react` installed exports `KeyRound`, `FileCode`, `SquareTerminal`, `ChevronRight` confirmed by direct `require` (HIGH).
- Platform behaviour of native `<details>` (content in DOM when closed, Playwright treats it as hidden) — standard browser/Playwright semantics (MEDIUM; confirm with the first migrated spec).
- EFF large wordlist (7,776 words, CC BY 3.0 US) — general knowledge, not re-fetched this session (MEDIUM; confirm license text when vendoring).
