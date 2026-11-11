# Phase 13: Password Generator Page - Research

**Researched:** 2026-11-11
**Domain:** Client-only Next.js 16 App Router tool page (static shell + `ssr:false` island) over the Phase 12 `lib/password` library; privacy-sensitive output (no leak to HTML, URL, analytics, autofill, translate, a11y surfaces)
**Confidence:** HIGH (every pattern below was read from this repo or probed this session; the few `[ASSUMED]` items are listed in the Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page structure, rendering & generation lifecycle**
- **D-01:** Same three-file split as the other tools:
  - `page.tsx` is the server shell: an h1 "Password Generator" and the loader, inside `max-w-3xl` like UUID.
  - `PasswordToolLoader.tsx` is `"use client"` with `dynamic(() => import("./PasswordTool"), { ssr: false, loading: <PasswordToolSkeleton/> })`.
  - `PasswordTool.tsx` is the island and owns all state.
  - Optional subcomponents: `PasswordOptionsPanel.tsx`, `PasswordOutput.tsx` and `PasswordRow.tsx`, where each row has its own `useCopyToClipboard`.
  - The page never imports the tool directly. There is no `ToolAbout` and no FAQ in this phase.
- **D-02:** State is one `ToolOptions` object plus a separate `results: string[]`, an error state and a generation counter, following the `UuidToolState` precedent. The initial state comes from a lazy `useState` initializer inside the `ssr:false` island: `parseOptions(window.location.search)`, then `generateBatch(...)` in a `try/catch`. This is the UUID pattern and ARCHITECTURE §4.4.
  - It runs once per mount, on the client only, and never during server render.
  - The roadmap rule "never in render or `useMemo`" is read as banning per-render or memoized generation. A one-shot client-only initializer is allowed.
  - After mount, results change only in event handlers: an option change, Regenerate/Enter, or Esc. They never change in effects or derivations.
  - The copy, status and focus state never touch generation (Pitfall 4).
- **D-03:** If generation throws `CryptoUnavailableError` (or `GenerationExhaustedError`), the tool shows no password and no weaker fallback.
  - It renders an inline `role="alert"` error in the output slot: "Secure random generation isn't available in this browser, so no password was generated."
  - The copy controls are not rendered. The options stay editable, and each later attempt fails closed in the same way.
  - The e2e check removes `crypto.getRandomValues` with `page.addInitScript` and asserts the error is shown and no output is present.
- **D-04:** Placeholder metadata for this phase: a title, a description and the canonical URL, plus `robots: { index: false, follow: false }` so an unfinished, unadvertised page is never indexed if the branch deploys. Phase 14 replaces this with the final metadata and removes the `noindex`.

**Options panel & controls**
- **D-05:** The layout is tool-first: the output (hero or batch) and Regenerate sit at the top, and the options sit below in a compact grid. Controls:
  - **Length:** a native `<input type="range">` (min `LENGTH_MIN`, max `LENGTH_MAX`) paired with a number input, kept in sync from one committed value. No new slider dependency: `radix-ui` is installed, but a native range input is lighter and accessible.
    - The number input keeps a local draft string. While typing, an out-of-range or empty draft shows an inline error, the same as UUID's `countError`, and doesn't regenerate.
    - A valid draft commits and regenerates.
    - On blur the draft is clamped and resynced.
    - The slider commits on every step.
  - **Character sets:** four labelled `Switch`es, for uppercase, lowercase, digits and symbols. The single remaining enabled switch is `disabled`, with the muted hint "At least one character set must stay on" (PWD-03).
  - **Symbol set:** a text input with a local draft.
    - Generation always uses `normalizeSymbols(draft)`, so an empty draft means the default set. The hint "Empty, so the default set is used" is shown.
    - On blur the draft is rewritten to the normalized value: deduped, letters, digits, spaces and non-ASCII removed, and an empty set restored to `DEFAULT_SYMBOLS`.
    - The input is disabled, keeping its value, while Symbols is off.
    - The muted hint text comes from the constants.
    - The input is never normalized on each keystroke, because that would make it impossible to clear the field and type a new set.
  - **Avoid look-alikes:** a `Switch`, with a hint that lists the removed characters taken from `LOOK_ALIKES`.
  - **Batch:** a number input from `BATCH_MIN` to `BATCH_MAX` (1–20), using the same draft and validation pattern as UUID's count input.
- **D-06:** Every option change commits through one `commit(next)` path:
  1. normalize the options
  2. `setOptions`
  3. regenerate
  4. write the URL (D-13)
  5. reset copy confirmations

  All bounds come from `lib/password` constants. None are restated as literals.
- **D-07:** Mode is always `"password"` in Phase 13. `parseOptions` output is coerced to `mode: "password"`, and the passphrase fields (`words`, `separator`, `capitalize`, `appendNumber`) pass through untouched so they survive the URL round-trip for Phase 14. A `?mode=passphrase` URL therefore shows Password mode until Phase 14 adds the toggle.
- **D-08:** All text and number inputs use `autoComplete="off"` and `spellCheck={false}`, plus the password-manager opt-outs `data-1p-ignore`, `data-lpignore="true"` and `data-bwignore`. Nothing is wrapped in a `<form>`. A unit test checks the attributes on each input, the same way `HashTool.test.tsx` does.

**Output display, copy & batch**
- **D-09:** The password renders in a non-form element, `<div data-testid="password-output" translate="no" spellCheck={false}>`.
  - It uses `font-mono`, `break-all` and `select-all`.
  - Each character run is wrapped in a `<span>` by class:
    - letters: `text-foreground`
    - digits: `text-sky-700 dark:text-sky-300`
    - symbols: `text-amber-700 dark:text-amber-300`
  - The colors use the same palette family and contrast pairing as `lib/config/token-classes.ts`.
  - There is no whitespace between the spans, so a manual selection copies plain text. The copy buttons write the raw string (PWD-08).
  - `<output>` is not used, because it is a form-associated element.
- **D-10:** Batch = 1 shows a hero row: the password, a 44px copy button and a Regenerate button with the `RefreshCw` icon.
  - Batch > 1 shows a list of rows. Each row has its own copy button and confirmation, and a toolbar has "Copy all", which joins the results with `\n`.
  - Row keys are `${generation}-${index}`, never the value.
  - Accessible names are "Copy password", "Copy password 3" and "Copy all passwords". The value never appears in a `title`, an `aria-*` attribute or a `data-*` attribute.
- **D-11:** Copy confirmation follows the established pattern: the visible label changes to "Copied!" with a check icon for about 2s. One shared polite live region per tool announces only fixed phrases: "Copied", "Copied all passwords" and "New password generated" / "N new passwords generated". It never announces the value (POUT-05).
  - `reset()` runs on every results change, the WR-02 pattern from `UuidTool`.
  - A copy failure shows the existing error state.
- **D-12:** The tool has no download, no CSV or JSON export, no history, no `localStorage`/`sessionStorage`, no `console.log` and no analytics `track()` of output (Pitfall 5).

**URL state, keyboard & privacy verification**
- **D-13:** The URL is written with `window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname)`, where `qs = serializeOptions(options)`. It is never written with `router.replace` and never with a `#fragment`.
  - It is written on every commit and once on mount, so a hostile or junk URL is rewritten to its canonical clamped form.
  - Default options produce a bare `/tools/password`.
  - Nothing is added to `DEFAULT_ALLOW_LIST`. Phase 12 D-23 already covers analytics with a unit regression.
- **D-14:** Shortcuts use `useKeyboardShortcut`, unchanged:
  - `/` focuses the length number input.
  - Enter regenerates. The hook's guard already skips buttons, `role=switch` buttons, radios, links and `summary`. Enter from the length, batch or symbol input does regenerate.
  - Esc resets every option to `DEFAULT_OPTIONS`, resets the draft inputs, regenerates and cleans the URL.
  - Ctrl/Cmd+C copies the single result through the hero's copy hook, so the visible confirmation shows. It is `undefined` when `batch > 1`.
  - The copy handler also returns early when `window.getSelection()?.toString()` is non-empty, so a user's partial selection still copies natively. This guard is local to the tool; the shared-hook WR-01 fix is separate.
  - A muted shortcut hint line sits under the options.
- **D-15:** Phase 12's `WALK_DIRS` in `lib/password/boundaries.test.ts` is extended to `app/tools/password`, so the existing `Math.random` and `getRandomValues` guards and the rule against importing the wordlist from the barrel cover the page. Phase 13-specific bans are added either there or in a sibling page test that uses the same pure `analyze()` approach with in-memory mutants:
  - `localStorage`/`sessionStorage`
  - `router.replace`/`useSearchParams`
  - `location.hash`
  - `track(`
- **D-16:** Test layers:
  - **RTL** (`PasswordTool*.test.tsx`), using a deterministic `fill` via mocked `crypto.getRandomValues`, covers: defaults on load, each option obeyed, last-set lock, symbol draft and blur normalization, look-alikes, slider and number sync, batch, copy and Copy all, value unchanged after copy, live-region text, attribute guards and the crypto-missing error.
  - **e2e** (`tests/e2e/password.spec.ts` plus keyboard, url and privacy split specs as needed) covers:
    - two loads differ, and the output is 20 characters with all sets
    - options change the output
    - shortcuts, including Enter not firing on a focused button or switch
    - bookmark restore
    - a hostile URL (`len=999`, `n=1e9`, unknown keys, a junk `sym`) is clamped, rewritten and shows no error
    - `page.url()` never contains the output, and `history.state === null`
    - the output is absent from attributes and the a11y snapshot
    - the crypto-missing error
  - **prod e2e** (`tests/e2e-prod/password-ssr.spec.ts`): the raw `request.get("/tools/password")` HTML contains the skeleton testid, has no `password-output` element and contains no 20-character all-sets string.
  - Manual UAT: no save or autofill prompt from Chrome, Safari or a password manager, and page translation leaves the output untouched.
- **D-17:** Skeleton: `PasswordToolSkeleton` (`data-testid="password-skeleton"`, `aria-hidden`) gets a provisional pinned height, measured for the default single-result state at 320px and at desktop width. The measurements go in the SUMMARY. Phase 14 does the final pin and the CLS gate, once the strength meter and passphrase controls exist (roadmap research flag). No layout-gate spec ships in this phase.

### Claude's Discretion
- The exact component split under `app/tools/password/` and the internal helper names.
- Spacing, grid column counts and helper-text wording, within the existing Tailwind scale and the 14px/16px typography conventions.
- Exactly how character runs are segmented into spans, and the digit and symbol palette, provided contrast holds in light and dark.
- Whether hero Copy and Regenerate sit side by side or stacked at 320px.
- How the e2e coverage is split across spec files.

### Deferred Ideas (OUT OF SCOPE)
- Shared-hook fix so the global Ctrl/Cmd+C and Esc don't fire on selected text or inside the About area (Phase 10 WR-01/WR-02). This stays a separate quick task. Phase 13 only adds a local selection guard to its own copy handler.
- Symbol-set preset chips ("Common", "Safe for most sites"), from Pitfall 19. These are optional and not required by any requirement.
- An auto-clear-clipboard timer. This is rejected (Pitfall 6). The honest clipboard-history FAQ wording belongs to Phase 14 and needs human approval.
- Everything in the Phase 14 boundary listed above (Password/Passphrase toggle + wordlist loading, strength meter / pool-size line / crack-time, registry/nav/landing card/sitemap/`KeyRound`, final metadata/OG, shared About area + EFF attribution + FAQ + JSON-LD + privacy FAQ wording, final no-CLS skeleton pin, Lighthouse, tool count 6 to 7).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWD-01 | Opening `/tools/password` shows a fresh 20-char all-sets password, client-side only, never in static HTML, different each load | Lazy `useState` initializer in `ssr:false` island (Pattern 1); prod raw-HTML spec with a false-positive-safe leak check (Pitfall 2); `LENGTH_DEFAULT`/`DEFAULT_OPTIONS` already give 20 chars, all sets |
| PWD-02 | Length 4–128 via slider and number input | Native range + draft number input, one committed value (Pattern 3); `clampInt`, `LENGTH_MIN/MAX` from the barrel; Playwright `fill()` supports `range` inputs |
| PWD-03 | Four set toggles; last enabled set cannot be turned off | Disable the sole checked `Switch` + lock hint (Pattern 4); Label `peer-disabled` override (Pitfall 6); library also restores all sets if all-off ever arrives |
| PWD-05 | Editable symbol set (dedupe, printable ASCII, empty restores default) | Draft + live `normalizeSymbols(draft)`; blur rewrite; `hasUsableSymbol` derived from the lib (Pattern 5) |
| PWD-06 | "Avoid look-alikes" removes `0 O o 1 l I \|` | `avoidLookalikes` option through `resolveAlphabet`; hint rendered from `LOOK_ALIKES` |
| PWD-07 | Only `crypto.getRandomValues`, fail closed when absent | Library already throws `CryptoUnavailableError`; island maps to the locked error UI (Pattern 2); verified init-script that removes the method; boundary guard extended (Pitfall 9) |
| PWD-08 | Digits/symbols color-coded, copied text plain | Pure `segmentRuns` helper + adjacent spans, copy writes the raw string (Pattern 6) |
| POUT-01 | Regenerate; per-result copy with visible confirmation | `useCopyToClipboard` per target; handler-side `reset()` (Pattern 7) |
| POUT-02 | Batch 1–20, Copy all one per line | Hero vs list rows keyed `${generation}-${index}`; `results.join("\n")` (Pattern 7) |
| POUT-03 | Options (never output) in URL; hostile URL clamped; no analytics leak | `parseOptions`/`serializeOptions` + raw `replaceState`; **Next patches `replaceState` so `history.state` is never `null` in the running app** (Pitfall 1); redact allow-list stays empty |
| POUT-04 | `/` focus length, Enter regen (not on button/switch/summary), Esc reset, Ctrl/Cmd+C single only | `useKeyboardShortcut` unchanged (Pattern 8); hook source read this session; e2e call-count technique for "no double fire" |
| POUT-05 | Password never in form field, `title`, `aria-*`, live region; `translate="no"`, spellcheck off | `<div>` output, fixed-phrase live region, attribute scan RTL + e2e, no `<form>` (also keeps Radix Switch from rendering a hidden input) |
</phase_requirements>

## Summary

Phase 13 is almost entirely composition of things that already exist. The page shell, `ssr:false` loader with a pinned skeleton, lazy-initializer generation, batch draft validation, hero-vs-list rendering, per-target copy hooks, the WR-02 reset and the WR-03 batch copy-shortcut disable all exist in `app/tools/uuid/*`; the raw `history.replaceState(null, "", url)` writer exists in `SubnetTool`/`DnsTool`; the input opt-out attributes and the RTL attribute test exist in `HashTool`; the pure `analyze()` guard style exists in `lib/password/boundaries.test.ts`. `lib/password` already exports the full API the page consumes, every bound as a constant, and a deterministic `RandomFill` seam. No new dependency is needed or recommended.

The research surfaced several non-obvious traps that would otherwise be discovered at execution or in review: (1) Next.js patches `history.replaceState`, so `history.state` is **never** `null` in the running app (the D-16 assertion `history.state === null` is correct only in jsdom); (2) the prod raw-HTML check "no 20-character all-sets string" **false-positives on the real HTML** (font class names, the build id) and must be implemented against script-stripped text; (3) a non-test helper file under `app/tools/password/` is scanned by the `getRandomValues` guard, so deterministic-fill installation must live in `*.test.tsx` files; (4) the shadcn `Label` carries `peer-disabled:opacity-50`, which would dim the label of the locked switch against the UI-SPEC; (5) remounting the options panel to reset drafts on Esc would drop focus; lift the drafts instead.

**Primary recommendation:** Build it as UUID's structure with Hash's input hardening and Subnet's URL writer, slice it tracer-first (shell + loader + minimal generating island + prod raw-HTML spec first, so the leak guard exists before any option UI), keep all draft strings in the island, route every state change through one `commit()`/`regenerate()` pair that also resets copy state, and add the Phase 13 page bans as a second pure `analyze`-style guard over `app/tools/password`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Password generation (randomness, resampling) | Browser / Client | — | Must be client-only: server generation bakes a shared password into static HTML/CDN (Pitfall 1). `lib/password` is framework-agnostic and runs only inside the `ssr:false` island |
| Page shell, h1, placeholder metadata, `noindex` | Frontend Server (static prerender) | CDN / Static | `page.tsx` is a Server Component with no request-time API, so the route is prerendered static; contains only the skeleton |
| Island mount boundary (`ssr:false` + skeleton) | Browser / Client | Frontend Server (serves skeleton HTML) | `dynamic(..., { ssr: false })` is legal only in a `"use client"` file; server HTML carries only the skeleton |
| Options state, drafts, validation | Browser / Client | — | Interactive local state; no server involvement |
| URL options persistence | Browser / Client (History API) | — | Raw `history.replaceState`, options only; never `router.replace`; no server read of the query (keeps route static) |
| Copy to clipboard + confirmation + live region | Browser / Client | — | `navigator.clipboard`, per-target hooks, one shared polite region |
| Keyboard shortcuts | Browser / Client | — | Window `keydown` via `useKeyboardShortcut` |
| Analytics redaction of option params | Browser / Client (existing `redactBeforeSend`) | — | Already enforced by an empty allow-list; Phase 13 adds nothing |
| No-leak verification (raw HTML) | Test tier (prod e2e) | — | Prod build served by `next start`; request-level GET with no JS |

## Standard Stack

### Core (all already installed; no new dependency)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.11 | App Router, `next/dynamic` (`ssr:false` in a client file) | [VERIFIED: package.json] repo-wide pattern |
| `react` / `react-dom` | 19.2.8 | UI; lazy `useState` initializer; `useEffectEvent` is available in this version | [VERIFIED: package.json; `useEffectEvent` present in `node_modules/react/cjs/react.development.js:1227`] |
| `lib/password` barrel | in-repo (Phase 12) | generation, normalizers, URL codec, constants, errors | [VERIFIED: lib/password/index.ts] |
| `radix-ui` `Switch` via `@/components/ui/switch` | radix-ui ^1.6.4 | 5 switches; renders `<button role="switch">` | [VERIFIED: components/ui/switch.tsx] |
| `@/components/ui/input`, `label` | in-repo shadcn | inputs and labels | [VERIFIED: read this session] |
| `lucide-react` | ^1.25.0 | `Copy`, `Check`, `RefreshCw`, `TriangleAlert` | [VERIFIED: package.json] |
| `useCopyToClipboard`, `useKeyboardShortcut` | in-repo hooks | copy + confirmation, global shortcuts | [VERIFIED: lib/hooks/*.ts read this session] |

### Supporting (test stack, already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 4.1.10 | unit/RTL runner, jsdom env | all `*.test.ts(x)` |
| `@testing-library/react` / `dom` | 16.3.2 / 10.4.1 | component tests | `PasswordTool*.test.tsx` |
| `@playwright/test` | 1.61.1 | e2e (`tests/e2e`) and prod e2e (`tests/e2e-prod`) | e2e specs |
| `fast-check` / `@fast-check/vitest` | 4.9.0 / 0.4.1 | property tests | optional here (library already covered in Phase 12); one property for `segmentRuns` (concat of runs equals input) is cheap |

[VERIFIED: package.json] for all versions above. No registry lookups were needed because nothing new is installed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="range">` | Radix `Slider` (radix-ui installed) | Locked by D-05: heavier, native is accessible and Playwright `fill()` supports it |
| Hand-written run segmentation | A highlighting library | Not warranted: a 3-class pure function (Don't Hand-Roll note below) |

**Installation:** none. **Version verification:** not applicable, no packages added.

## Package Legitimacy Audit

No external packages are installed in this phase. `package.json` is unchanged, so the `gsd-tools query package-legitimacy check` gate was not run (nothing to check).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | None added |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 Browser requests /tools/password[?len=..&n=..&...]
        |
        v
 [Vercel CDN / next start]  --serves-->  prerendered static HTML
        |                                 (h1 + <PasswordToolLoader/> -> skeleton only,
        |                                  NO password, NO options, query string ignored)
        v
 Browser hydrates app router; PasswordToolLoader ("use client") lazy-loads island chunk
        |
        v   (client only, once per mount)
 PasswordTool lazy useState initializer
   parseOptions(window.location.search)  --total/clamped-->  ToolOptions
   coerce mode -> "password"  (passphrase fields pass through)
   generateBatch(opts, opts.batch)       --try/catch-->  { results[] | error, generation }
        |
        +--> mount effect: history.replaceState(null,"", canonical options-only URL)
        |
        v
 render:  [output zone: hero | batch list | error]   [options panel]   [sr-only live region]
        ^                                   |
        |  every user action goes through ONE of two handler functions:
        |
   commit(nextOptions)                    regenerate()  (Regenerate click / Enter)
     normalizeToolOptions + mode:"password"   generateBatch(options) -> results/error
     setOptions; generate -> results/error    generation++, reset copy hooks, announce
     generation++; resetCopy hooks            (never writes URL: options unchanged)
     replaceState(options-only URL)
     (announce only on batch commit / Esc / Regenerate / Enter, not on slider/switch)

 copy buttons -> navigator.clipboard.writeText(raw string) -> copied=true ~2s -> "Copied!"
 Esc -> commit(DEFAULT_OPTIONS) + reset ALL drafts (lifted state, no remount)
 Ctrl/Cmd+C -> hero copy only when results.length===1 && no text selection
```

### Recommended Project Structure

```
app/tools/password/
├── page.tsx                      # Server Component: h1 + <PasswordToolLoader/>, placeholder metadata + noindex
├── PasswordToolLoader.tsx        # "use client": dynamic(ssr:false) + PasswordToolSkeleton (pinned h-[..px] sm:h-[..px])
├── PasswordTool.tsx              # island: options, drafts, results/error/generation, shortcuts, URL writer, live region
├── PasswordOptionsPanel.tsx      # presentational: controls + hints (drafts passed in as props)
├── PasswordOutput.tsx            # hero | batch | error zone
├── PasswordRow.tsx               # one row with its own useCopyToClipboard (remounts per generation key)
├── ColoredPassword.tsx           # renders runs from segmentRuns
├── runs.ts                       # pure segmentRuns(value) -> {kind, text}[]  (+ runs.test.ts)
├── password-test-utils.ts        # NON-test helper: cycleFill() only; must NOT name the Web Crypto method (Pitfall 3)
├── PasswordTool.test.tsx         # + split files (.options/.output/.keyboard/.url .test.tsx) like hash
└── page-guards.test.ts           # node env: pure analyze() page bans + mutants (or fold into boundaries.test.ts)
tests/e2e/password*.spec.ts       # password, keyboard, url, privacy (+ layout/320 overflow)
tests/e2e-prod/password-ssr.spec.ts
```

### Pattern 1: Island lifecycle (lazy initializer, no server execution)

**What:** One-shot client-only initializer parses the URL and generates; all later generation is in handlers.
**Key rule found in code:** do **not** guard the initializer with `typeof window === "undefined"` returning defaults and then generating. The island must never render on the server; if it ever does, a missing guard makes `window` throw (loud failure) whereas a guard that "falls back to defaults and generates" would silently bake a password into HTML (Pitfall 1). `SubnetTool` guards because it falls back to a harmless default; this tool must fail loud.

```tsx
// Source: pattern from app/tools/uuid/UuidTool.tsx (lazy useState initializer) + 13-CONTEXT D-02/D-07
"use client";
import { useState } from "react";
import {
  generateBatch, parseOptions, normalizeToolOptions,
  CryptoUnavailableError, GenerationExhaustedError, // GenerationExhaustedError => "exhausted" copy
  type ToolOptions,
} from "@/lib/password";

type GenError = null | "crypto" | "exhausted";
type Generated = { results: string[]; error: GenError; generation: number };

function generate(opts: ToolOptions, generation: number): Generated {
  try {
    return { results: generateBatch(opts, opts.batch), error: null, generation };
  } catch (e) {
    // Fail closed on EVERY throw (RangeError from a non-uniform/oversized fill included);
    // never fall back, never log (D-12), never keep a previous result.
    return { results: [], error: e instanceof GenerationExhaustedError ? "exhausted" : "crypto", generation };
  }
}

function initialState(): { options: ToolOptions; gen: Generated } {
  // window is intentionally unguarded: this component must never run on the server.
  const options = normalizeToolOptions({ ...parseOptions(window.location.search), mode: "password" });
  return { options, gen: generate(options, 0) };
}

export function PasswordTool() {
  // ONE lazy initializer (a second useState initializer cannot read the first state).
  const [{ options: initialOpts, gen: initialGen }] = useState(initialState);
  const [options, setOptions] = useState<ToolOptions>(initialOpts);
  const [gen, setGen] = useState<Generated>(initialGen);
  // ...drafts, copy hooks, handlers (commit / regenerate / resetAll) follow
}
```

React 19 dev StrictMode double-invokes lazy initializers, so one extra discarded draw happens in dev only; this is harmless and a reason the initializer must have no side effects (do **not** write the URL inside it).

### Pattern 2: Fail-closed error as a first-class state

`results: []` plus `error` set; the output zone renders exactly one of hero | batch | error (UI-SPEC "Island structure"). Every later `commit()`/`regenerate()` re-runs `generate()` and may succeed or fail again. Map: `GenerationExhaustedError` to the "Couldn't generate a password that uses every selected character set..." copy; everything else to the locked crypto sentence [CITED: 13-UI-SPEC.md Copywriting Contract]. The live region stays silent on error (`role="alert"` carries it).

### Pattern 3: Draft-string numeric inputs (length and batch) with one committed value

Reuse UUID's `parseCountInput` shape, parameterized by bounds from constants:

```ts
// Source: app/tools/uuid/UuidTool.tsx parseCountInput (generalized); bounds from lib/password constants
function parseIntInRange(value: string, min: number, max: number): number | null {
  const t = value.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);               // "9".repeat(400) -> Infinity -> rejected by the range check
  return n >= min && n <= max ? n : null;
}
```

- onChange: `setDraft(v)`; parsed `null` -> `setError(true)` and **no** commit; else clear error and `commit({...options, length: n})`.
- onBlur: `const c = clampInt(Number(draft), LENGTH_MIN, LENGTH_MAX, options.length)`; if `c !== options.length` commit; always `setDraft(String(c))`, clear error. (`clampInt` is exported through the barrel: [VERIFIED: lib/password/charset.ts `export function clampInt(`]. Empty or `abc` -> `Number("")` is 0 / `NaN`: use the explicit `committed` fallback for the empty/NaN case so blur restores the committed value, as UI-SPEC requires.)
- Slider onChange: `commit({...options, length: Number(e.target.value)})`, `setLengthDraft(String(n))`, clear `lengthError`. React `onChange` on a range input fires per `input` event [VERIFIED: probe test this session, `fireEvent.change` on a controlled range updated state].
- Number inputs are `type="text" inputMode="numeric"` (UI-SPEC decision 13), so no spinner/wheel surprises.

### Pattern 4: Last-set lock

```tsx
const onCount = [options.uppercase, options.lowercase, options.digits, options.symbols].filter(Boolean).length;
// each Switch: disabled={onCount === 1 && checked}  aria-describedby={onCount === 1 && checked ? "password-sets-lock-hint" : undefined}
// render the hint <p id="password-sets-lock-hint"> only when onCount === 1
```
Radix `Switch` without a `<form>` ancestor renders **only** the `<button role="switch">` (no hidden bubble input): [VERIFIED: node_modules/@radix-ui/react-switch/dist/index.mjs:45 `isFormControl = control ? !!form || !!control.closest("form") : ...` and :158 `isFormControl && jsx(SwitchBubbleInput...)`]. This is another reason nothing may be wrapped in a `<form>`: it would add a hidden checkbox input to the DOM. It also means no `ResizeObserver` is needed in jsdom (`useSize` lives only in the bubble input) [VERIFIED: probe test this session, Switch click toggles `aria-checked` in jsdom].

Focus safety: the switch that becomes disabled is always one that was *not* just toggled, so focus never lands on a freshly disabled control.

### Pattern 5: Symbol-set draft

- `symbolDraft` state; `commit` is called on every change with `symbolSet: normalizeSymbols(draft)` **only when it differs from `options.symbolSet`** (typing a letter or a repeat strips to the same set, so skip regenerating and URL-writing).
- Blur: `setSymbolDraft(normalizeSymbols(symbolDraft))`; never normalize per keystroke.
- Hint state 2 ("Empty, so the default set is used") needs "draft has no usable character". Derive it from the library rather than restating the rule: a single character is usable iff `normalizeSymbols(ch) === ch` (an unusable char yields the 23-char default, which can never equal a 1-char string):

```ts
const hasUsableSymbol = (draft: string) => [...draft].some((ch) => normalizeSymbols(ch) === ch);
// hint priority: !options.symbols -> off; !hasUsableSymbol(draft) -> empty/default; else rule text with SYMBOL_SET_MAX
```
Verified rules this derives from [VERIFIED: lib/password/charset.ts:79-96]: `normalizeSymbols` keeps printable ASCII 0x21-0x7E that is not alphanumeric, dedupes in first-seen order, caps at `SYMBOL_SET_MAX`, and returns `DEFAULT_SYMBOLS` when the result is empty; code points above BMP (emoji) have `ch.length !== 1` and are skipped.

### Pattern 6: Output coloring

```ts
// runs.ts - pure; React-free (testable in node env)
export type RunKind = "letter" | "digit" | "symbol";
export type Run = { kind: RunKind; text: string };
const kindOf = (c: string): RunKind =>
  /[A-Za-z]/.test(c) ? "letter" : /[0-9]/.test(c) ? "digit" : "symbol"; // symbols = everything else (UI-SPEC)
export function segmentRuns(value: string): Run[] { /* group consecutive same-kind chars */ }
```
Render `runs.map((r, i) => <span key={i} data-kind={r.kind} className={CLASS[r.kind]}>{r.text}</span>)` inside the `translate="no"` div. Keys are indexes (never text). No whitespace text nodes between spans (JSX map, no template literals with spaces). Properties to test: `runs.map(r => r.text).join("") === value`; adjacent runs have different kinds; `textContent` of the rendered div equals the raw value; the div has no element children other than spans. Classes (UI-SPEC): letters `text-foreground`, digits `text-sky-700 dark:text-sky-300`, symbols `text-amber-700 dark:text-amber-300`.

### Pattern 7: Copy, reset, live region

- Island owns `heroCopy` and `allCopy` hooks (the hero's `copy` must be reachable from `useKeyboardShortcut`). Rows own theirs; because rows are keyed `${generation}-${index}` they **remount on every generation**, so their confirmation resets for free with no effect. For the island-level hooks call `heroCopy.reset(); allCopy.reset()` inside the single `applyGenerated()` helper used by every handler. This satisfies D-11/WR-02 without a results-keyed effect, and keeps all generation and reset logic in handlers (D-02).
- `copy(value)` never throws and swallows rejection by design: it cannot tell the caller whether the write succeeded [VERIFIED: lib/hooks/useCopyToClipboard.ts:31-51]. So the "Copied" announcement must be driven by the hook's `copied` becoming true, not by the click handler (announcing in the click handler would say "Copied" on a failed write). For rows, notify the island from a row effect keyed on `copied` (`useEffect(() => { if (copied) onCopied(); }, [copied])`, callback stable via `useCallback`/`useEffectEvent`); for the hero and Copy all, a small effect in the island on `heroCopy.copied`/`allCopy.copied`.
- Edge: copying twice inside the 2s window leaves `copied` true (no state change), so the second copy does not re-announce. Accepted (see Open Questions 3).
- Announce helper (UI-SPEC: repeated identical phrases must re-announce): `setStatus("")` then `timerRef.current = setTimeout(() => setStatus(phrase), 0)`, clear the previous timer first and on unmount. Fixed phrases only, never the value.
- Copy all: `results.join("\n")`, no trailing newline, snapshot at click time.

### Pattern 8: Keyboard

```ts
// Source: app/tools/uuid/UuidTool.tsx (WR-03) + 13-CONTEXT D-14; hook semantics read from lib/hooks/useKeyboardShortcut.ts
useKeyboardShortcut({
  slash: () => { lengthRef.current?.focus(); lengthRef.current?.select(); },
  enter: () => regenerate(),
  escape: () => resetAll(),            // commit(DEFAULT_OPTIONS) + reset ALL drafts/errors; focus untouched
  copy: gen.results.length === 1 && gen.error === null
    ? () => { if (window.getSelection()?.toString()) return; void heroCopy.copy(gen.results[0]!); }
    : undefined,
});
```
Hook facts [VERIFIED: lib/hooks/useKeyboardShortcut.ts read this session]:
- `/`: ignored with Ctrl/Meta/Alt; fires only when the target is not editable (`INPUT`/`TEXTAREA`/contenteditable). A range input is an `INPUT`, so `/` is suppressed there too.
- Enter: skipped when `target.closest('button, [role="button"], [role="radio"], a[href], summary')` is non-null. Radix Switch is a `<button>` so it is covered. Fires from text/range inputs.
- Escape: IME-composition guard only; fires from anywhere, including inputs (so Esc in the symbol input resets everything, per D-14).
- Copy chord: `(ctrl||meta) && !shift && !alt && key==="c"`, and only when not editable.
- Handlers are read from a ref synced by an effect after each render, so fresh closures each render are safe.

**Esc must reset drafts without remounting the panel.** Remounting (e.g. `key={resetCount}` on `PasswordOptionsPanel`) would drop focus, contradicting the UI-SPEC "Focus stays where it was". Keep `lengthDraft`, `batchDraft`, `symbolDraft` and the two error booleans as island state and set them explicitly in `resetAll()` (`String(DEFAULT_OPTIONS.length)`, `String(DEFAULT_OPTIONS.batch)`, `DEFAULT_OPTIONS.symbolSet`).

### Pattern 9: URL writer

```ts
// Source: SubnetTool.syncCidrToUrl / DnsTool.syncUrlToLookup pattern (raw History API) + serializeOptions
function writeUrl(opts: ToolOptions) {
  const qs = serializeOptions(opts);
  window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}
// call: inside commit() after normalize, and once from a mount effect: useEffect(() => writeUrl(options), []) // eslint-disable-line react-hooks/exhaustive-deps -- mount-only, idempotent under StrictMode
```
`serializeOptions` takes only `ToolOptions` and returns `""` for defaults, so the type signature cannot carry output [VERIFIED: lib/password/url-state.ts:117]. Never add `?mode=` etc by hand.

### Pattern 10: Page shell, loader, skeleton

Copy `app/tools/uuid/page.tsx` structure minus `ToolAbout`; metadata per D-04/UI-SPEC copy, plus `robots: { index: false, follow: false }`. The page takes no props and reads no request API, so it stays statically prerendered [VERIFIED: existing prod HTML for a sibling tool: `.next/server/app/tools/uuid.html` contains `data-testid="uuid-hero-skeleton"` once and zero `uuid-hero-value`]. Loader: `"use client"`, `dynamic(() => import("./PasswordTool").then((m) => m.PasswordTool), { ssr: false, loading: () => <PasswordToolSkeleton /> })`. Export the island as a **named** export plus default (UuidTool does both) so `.then((m) => m.PasswordTool)` works.

Skeleton pin procedure (D-17) following `HashToolLoader`'s documented method: give the island root `data-testid="password-tool"`; with a throwaway Playwright probe (not committed) at viewport 320 and 1280, `fonts.ready`, default state, read the root's `boundingBox().height` and the hero's, round up to a multiple of 4, set `h-[Npx] sm:h-[Mpx]`, and record both in the SUMMARY. Estimate for sanity only [ASSUMED]: hero is about 122px if the 20-char value fits one line at 320px (20 x 12px Geist Mono at 20px is 240px vs ~254px content width, so it is borderline and can wrap to two lines, about 150px). Measure; do not trust the estimate. A bookmarked `?len=128&n=20` will be taller than the pinned skeleton and shift; that is accepted until Phase 14's final pin.

### Anti-Patterns to Avoid

- **Generating in an effect or `useMemo`** (empty first paint, `react-hooks/set-state-in-effect`, double generation in StrictMode).
- **Writing the URL inside the lazy initializer** (side effect in an initializer that StrictMode double-invokes).
- **Keying anything by the password value**, and putting it in any `title`/`aria-*`/`data-*`/`value`/`placeholder` (only `data-kind` with fixed values is allowed on spans).
- **`<form>`, `<output>`, `<fieldset>`, read-only `<input>`, `type="password"`, `name` attributes** on anything in the tool.
- **`useSearchParams`/`router.replace`/`location.hash`/`pushState`** (forbidden by D-13 and the page guard).
- **Announcing in the click handler** (cannot know copy success; see Pattern 7).
- **Per-keystroke symbol normalization** (D-05).
- **`console.*` anywhere** in `app/tools/password` (D-12), including in the catch block.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Randomness, uniform sampling, one-of-each resampling | Any `Math.random`, own modulo, shuffle, "patch a slot" | `generateBatch` from `@/lib/password` | Phase 12 proved unbiased rejection sampling and byte-capped fill; the guard forbids `Math.random` and naming the Web Crypto method outside `random.ts` |
| Options parsing/serialization, clamping, hostile-URL safety | Own `URLSearchParams` handling | `parseOptions` / `serializeOptions` | Total, whitelisted, 2048/64 caps, no `__proto__` copy, round-trip tested |
| Symbol set normalization and the default restore | Regex stripping in the component | `normalizeSymbols` | Identical rules to the generator; `hasUsableSymbol` derives from it |
| Integer clamp | `Math.min/max` chains | `clampInt` (barrel) | NaN-safe, total |
| Clipboard + "Copied!" timing | `navigator.clipboard` plumbing | `useCopyToClipboard` | One-per-target contract; `reset()` for WR-02 |
| Global shortcuts | Own `keydown` listener | `useKeyboardShortcut` unchanged | Enter guard, IME guard, editable guard already correct |
| Deterministic test randomness | Mocking `Math.random` | `queueFill` / `constantFill` / `recordingFill` from `@/lib/password/test-utils` plus a local `cycleFill` | The seam exists; test helpers are intentionally not in the barrel |
| Slider | A slider component dependency | Native `<input type="range">` | Locked D-05 |

**Key insight:** the risk in this phase is not algorithms (all in the library) but leak surfaces and lifecycle coupling. Every "clever" shortcut (generate in render, key by value, announce the value, derive display from output) re-opens a leak or a regenerates-under-the-user bug that the existing patterns already avoid.

## Common Pitfalls

### Pitfall 1: `history.state === null` is false in the running app (D-16 assertion is wrong for e2e)
**What goes wrong:** An e2e `expect(await page.evaluate(() => history.state)).toBeNull()` fails in real Next even though the code correctly passes `null`.
**Why:** Next's App Router patches `replaceState`/`pushState`: for non-internal data it calls `copyNextJsInternalHistoryState(data)`, which does `if (data == null) data = {}` and copies `__NA` and `__PRIVATE_NEXTJS_INTERNALS_TREE` from the current state [VERIFIED: node_modules/next/dist/client/components/app-router.js:84-95 and :258-275]. It also dispatches a router RESTORE so `usePathname`/`useSearchParams` track the new URL.
**How to avoid:** In e2e assert instead: `state` is `null` **or** a plain object whose keys are a subset of `["__NA","__PRIVATE_NEXTJS_INTERNALS_TREE"]`, and `JSON.stringify(state ?? null)` does not contain the password. Keep `history.state === null` only in the jsdom RTL URL test (no Next patch there). The router tree can carry the page segment with search params (options only), never output.
**Warning signs:** e2e fails with `Received: {"__NA":true,...}` or `{}`.

### Pitfall 2: The prod raw-HTML "no 20-char all-sets string" check false-positives on the real HTML
**What goes wrong:** A naive regex like `/[A-Za-z0-9!@#$%^&*()\-_=+\[\]{};:,.?]{20}/` plus an all-sets test flags framework strings.
**Why:** [VERIFIED: Python scan of the existing prerendered `.next/server/app/tools/uuid.html` this session] a 20+ char run over the default pool containing upper, lower, digit and symbol occurs 10 times, e.g. `geistsans_d5a4f12f-module__Ur3q_a__variable`, `GeistMono_Variable.p.3ms9vq719j3f8.woff2`, and the Next build id (`"b":"fOsQf5ZbWmGUL-GaJPwwb"`, 21 chars of `[A-Za-z0-9_-]`) which would flip the assertion randomly per build.
**How to avoid:** Run the leak check on text content with `<script>`, `<style>` and tags removed (`html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ")`), split on whitespace, and test tokens only there. The primary, deterministic assertions are structural: `data-testid="password-skeleton"` present; none of `password-output`, `password-hero`, `password-batch`, `password-row`, `password-error` present; the skeleton contains no text. Add one positive control in the same spec (a hand-made `Aa0!Aa0!Aa0!Aa0!Aa0!` token run through the same detector returns true) so the detector cannot silently become vacuous.

### Pitfall 3: A non-test helper under `app/tools/password/` is scanned by the `getRandomValues` guard
**What goes wrong:** Extending `WALK_DIRS` makes `lib/password/boundaries.test.ts` scan every `.ts/.tsx` under `app/tools/password`. `isTest` only matches `\.(test|spec)\.tsx?$`, so a helper such as `password-test-utils.ts` is treated as production code and `grvOutsideRandom` fails if it names the Web Crypto method [VERIFIED: boundaries.test.ts:39, :224].
**How to avoid:** `password-test-utils.ts` exports only `cycleFill(indices)` (a `RandomFill`), no Web Crypto name. Each `*.test.tsx` installs it with a one-liner `vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(cycleFill([...]) as never)` (test files are excluded from that rule, but `mathRandom` scans tests too, so never reference the Math random member either). Do not name the helper file with a `.test.`/`.spec.` infix (vitest would treat it as a suite and fail "No test suite found").
Also add a page ban that non-test files must not import `@/lib/password/test-utils` (only `password-test-utils.ts`, which imports types only, is exempt).

### Pitfall 4: The Esc/Enter/slash hook and focus behaviors interact with controls
**What goes wrong:** (a) Enter in the length number input must regenerate with the **last valid** options (invalid draft stays on screen with its hint). (b) `/` is a no-op while focus is in any input, including the slider. (c) Esc fires even inside inputs (locked). (d) jsdom does **not** synthesize a click from an Enter keydown on a button, so RTL cannot observe a double fire from a real button; it can only prove the global handler did not run.
**How to avoid:** RTL: with a counting fill, `fireEvent.keyDown(regenerateButton, { key: "Enter" })` and the same on a switch must produce **zero** new `getRandomValues` calls; on the length input they must produce exactly one generation's worth. e2e: the only observable double-fire signal is call count (see Validation Architecture "e2e call-count technique"), because both a native button click and the global handler regenerate.

### Pitfall 5: Stale "Copied!" and in-flight copy race
**What goes wrong:** Copy resolves after the user regenerates, setting `copied=true` next to a new value. `reset()` already ran.
**How to avoid:** Window is milliseconds (`writeText` resolves quickly) and the site precedent accepts it (UI-SPEC dismissed E7-loading). Note it; do not add machinery. Hero/rows remount per generation key where applicable.

### Pitfall 6: shadcn `Label` dims the locked switch's label
**What goes wrong:** `Label` ships `peer-disabled:opacity-50` and `Switch` ships the `peer` class, so a `Label` that follows a disabled `Switch` renders at 50% opacity, contradicting UI-SPEC ("its label stays full contrast") [VERIFIED: components/ui/label.tsx and switch.tsx read this session].
**How to avoid:** Pass `className="... peer-disabled:opacity-100"` on those `Label`s (tailwind-merge replaces the variant-specific utility). Also override `Label` defaults per UI-SPEC: `text-[14px] leading-[1.4] font-semibold`, and `Input`: `h-11 text-base md:text-base` (twMerge replaces `h-8` and `md:text-sm`).

### Pitfall 7: `?mode=passphrase` is lost on first visit
**What goes wrong:** D-07 coerces mode to `"password"`; D-13 rewrites the URL on mount from the coerced options, so `mode=passphrase` is dropped from the address bar immediately (passphrase fields survive).
**Impact:** Pre-launch and unadvertised; Phase 14 adds the toggle and stops coercing. Not a blocker; call it out in the SUMMARY so Phase 14 does not assume a bookmarked `mode=passphrase` survives a Phase 13 visit.

### Pitfall 8: Radix Switch label click and nested form semantics
**What goes wrong:** Putting the Switch inside a `<label>`/`<form>` changes behavior; wrapping in `<form>` adds a hidden input (see Pattern 4).
**How to avoid:** `Switch id` + sibling `<Label htmlFor>` exactly as UI-SPEC shows; `role="group"` + `aria-labelledby` (not `<fieldset>`) for the set group.

### Pitfall 9: Guard-test self-hygiene and the new page bans
The existing guard assembles forbidden snippets from string parts (`"Ma" + "th"`, `"getRandom" + "Values"`) so no file holds the forbidden text verbatim and shell acceptance greps stay green. The new page-ban test must do the same for `localStorage`, `sessionStorage`, `useSearchParams`, `location.hash`, `router.replace`, `track(`, `console.`, `fetch(`, `dangerouslySetInnerHTML`, `pushState`. Also: the page ban regexes apply to **non-test** files under `app/tools/password`; tests legitimately mention `localStorage` to assert it is untouched (spy) or read `history.state`.

### Pitfall 10: Dev vs prod e2e cannot run concurrently; port 3000 is already occupied
`playwright.prod.config.ts` builds and serves on 3101 with `HASH_SMOKE=1` and must not run alongside `next dev` in the same checkout (shared `.next`) [CITED: playwright.prod.config.ts header comment]. A process is already listening on :3000 in this environment, and `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so `npm run test:e2e` will silently reuse whatever is there. Verify it is this checkout's dev server (and not a stale prod server) before trusting results; run `test:e2e` and `test:e2e:prod` sequentially.

### Pitfall 11: Cycle-fill determinism depends on the pool
`cycleFill([0, 26, 52, 62])` yields `Aa0!` repeated only for the **default** pool (upper 26, lower 26, digits 10, symbols 23 [VERIFIED: constants.ts]: indices 0-25, 26-51, 52-61, 62-84). Other option sets change the pool and the mapping. Option tests should assert **shape** (length, sets present, no excluded characters) and never literals, except default-pool tests with the cycle fill. `queueFill` throws when exhausted, so prefer a cycling source for UI tests.

### Pitfall 12: Playwright `fill` on a controlled range and on the number draft
`locator.fill()` supports `range` inputs (set value and dispatch `input`/`change`) [VERIFIED: playwright-core `coreBundle.js` input-type set contains `"range"`]. React's controlled range then commits per event. For the text drafts use `fill`; `fill("")` then `blur` for the clamp/restore behavior.

### Pitfall 13: Option writes on every keystroke of the symbol input
Each effective symbol edit regenerates and rewrites the URL. Acceptable (UUID regenerates per valid count) but make sure unusable keystrokes (letters, repeats) skip commit (Pattern 5) so the password does not churn while the user is typing something that normalizes to the same set.

## Code Examples

### Verified in-repo values used by the page

```ts
// Source: lib/password/constants.ts (read this session)
export const LENGTH_MIN = 4;
export const LENGTH_MAX = 128;
export const LENGTH_DEFAULT = 20;
export const BATCH_MIN = 1;
export const BATCH_MAX = 20;
export const BATCH_DEFAULT = 1;
export const DEFAULT_SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";
export const SYMBOL_SET_MAX = 32;
export const LOOK_ALIKES = "0Oo1lI|";
// Source: lib/password/errors.ts
export class CryptoUnavailableError extends Error { override readonly name = "CryptoUnavailableError"; ... }
export class GenerationExhaustedError extends Error { override readonly name = "GenerationExhaustedError"; readonly attempts: number; ... }
// Source: lib/password/url-state.ts
export const PASSWORD_URL_KEYS = Object.freeze(["mode","len","u","l","d","s","sym","amb","words","sep","cap","num","n"] as const);
// Source: lib/password/types.ts  (ToolOptions fields)
//   mode, length, uppercase, lowercase, digits, symbols, symbolSet, avoidLookalikes, words, separator, capitalize, appendNumber, batch
```
Barrel exports (everything the page needs, no wordlist) [VERIFIED: lib/password/index.ts]: types, constants, errors, random, charset (`clampInt`, `normalizeSymbols`, `normalizeToolOptions`, `resolveAlphabet`...), generate (`generatePassword`, `generateBatch`), entropy, crack-time, passphrase, url-state. The page must import from `@/lib/password` only; never `@/lib/password/wordlist` (Phase 14) and never `@/lib/password/wordlist/eff-large`.

### Input attribute set (all three text inputs; range gets `autoComplete="off"`)

```tsx
// Source: app/tools/hash/HashTool.tsx:329-334 + HashTool.test.tsx:97-103 (attribute names) + 13-UI-SPEC superset + D-08 (bwignore)
<Input
  type="text" inputMode="numeric"
  autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
  data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other"
  /* no name, no form ancestor, never type="password" */
/>
```
RTL attribute test (copy the Hash assertion style): `getAttribute("spellcheck") === "false"`, `autocorrect === "off"`, `autocapitalize === "off"`, `autocomplete === "off"`, `hasAttribute("data-1p-ignore")`, `data-lpignore === "true"`, `hasAttribute("data-bwignore")`, `data-form-type === "other"`, and `el.closest("form") === null`, for `password-length`, `password-symbols`, `password-batch-count`.

### Deterministic RTL setup

```tsx
// Source: verified by a throwaway probe test this session (passed): vi.spyOn(globalThis.crypto,"getRandomValues") + cycle fill => "Aa0!".repeat(5); vi.stubGlobal("crypto", undefined) => Web Crypto error
import { cycleFill } from "./password-test-utils";
beforeEach(() => {
  window.history.replaceState(null, "", "/tools/password");          // reset URL per test (Hash/Subnet pattern)
  vi.spyOn(globalThis.crypto, "getRandomValues")
    .mockImplementation(cycleFill([0, 26, 52, 62]) as never);        // default pool => "Aa0!" x5
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } }); // or stubClipboard-style helper
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
// crypto-missing: vi.stubGlobal("crypto", undefined) BEFORE render -> error state; options still editable
```
`cycleFill` fills `buf[0]` (randomInt draws one `Uint32` per call) with `indices[pos++ % indices.length]` and returns `buf`. Because `randomInt` accepts `r < 2^32 - (2^32 % n)` and returns `r % n`, any small value maps exactly to that pool index [VERIFIED: lib/password/random.ts:47-70].

### e2e: remove Web Crypto (D-03)

```ts
// Source: verified by a throwaway Chromium probe this session (output: ['undefined','undefined'])
await page.addInitScript(() => {
  Object.defineProperty(Crypto.prototype, "getRandomValues", { value: undefined, configurable: true });
});
await page.goto("/tools/password");
await expect(page.getByTestId("password-error")).toBeVisible();
await expect(page.getByTestId("password-output")).toHaveCount(0);
await expect(page.getByTestId("password-copy")).toHaveCount(0);
```

### Hostile URL expected result (computed from the codec)

`/tools/password?len=999&n=1e9&u=0&l=0&d=0&s=0&sym=%F0%9F%98%80abc&evil=1` parses to: `len` = 999 (4 digits matches `^\d{1,4}$`) clamped to 128; `n=1e9` fails the digit regex so default 1; all four flags 0 so the all-off guard restores all sets; `sym` normalizes to empty so `DEFAULT_SYMBOLS`; unknown `evil` ignored [VERIFIED: lib/password/url-state.ts:52-115 and charset.ts:98-106]. After the mount rewrite the URL is exactly `/tools/password?len=128` (every other value equals its default so `serializeOptions` omits it).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useEffect` + `setState` to seed client-random state | Lazy `useState` initializer inside an `ssr:false` island | repo precedent (Phase 2) | No empty first paint; avoids `react-hooks/set-state-in-effect` |
| `router.replace` for URL state | Raw `history.replaceState` (Next 14.1+ patches it into the router) | Next 14.1 | Router stays in sync (`usePathname`/`useSearchParams`), but `history.state` is never null (Pitfall 1) |
| Ref-forwarded handlers | `useEffectEvent` (stable in React 19.2) | React 19.2 | Optional for the row `onCopied` notifier; `useCallback` also fine |

**Deprecated/outdated:** nothing relevant. Note the project rule text lists TypeScript 7 / ESLint 10 while `package.json` pins TypeScript 6.0.3 and ESLint 9.39.5 [VERIFIED: package.json]; write code against the installed versions.

## Runtime State Inventory

Not applicable: Phase 13 is greenfield UI (new route and files plus one test-file edit). No rename, refactor or migration. No stored data, live service config, OS-registered state, secrets, or build artifacts carry a renamed string. The only existing artifact touched is `lib/password/boundaries.test.ts` (`WALK_DIRS`).

## Common Pitfalls (continued): UI-SPEC open item

**E1-a11y-snapshot (open axis in UI-SPEC):** D-16 says the output must be "absent from the a11y snapshot", but the password must remain readable by screen readers, so the output must not be `aria-hidden`. Research recommendation (confirm at UAT): scope the assertion to accessible **names**, **descriptions**, `title`, `value`/`placeholder` and the live region. Implementation: (1) iterate every element in the tool and assert no attribute value (`title`, every `aria-*`, every `data-*` except `data-kind`, `value`, `placeholder`, `alt`) contains the password; (2) `expect(page.getByTestId("password-status")).not.toContainText(password)`; (3) `page.getByRole("button", { name: password })`/`getByRole("textbox", ...)`/`getByLabel(password)` count 0; (4) `ariaSnapshot()` of the **options section** and of the **status region** contains no password (the output zone's snapshot legitimately contains it as static text).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (jsdom default) + @testing-library/react 16.3.2; Playwright 1.61.1 (chromium only) |
| Config file | `/Users/mwallraf/Developer/packetory.dev/vitest.config.ts` (globals, `include **/*.test.{ts,tsx}`, excludes `tests/e2e/**`), `playwright.config.ts` (testDir `tests/e2e`, `npm run dev` on :3000, reuse existing server when not CI), `playwright.prod.config.ts` (testDir `tests/e2e-prod`, build + start on :3101, `workers: 1`) |
| Quick run command | `npx vitest run app/tools/password lib/password/boundaries.test.ts` |
| Full suite command | `npm run typecheck && npm run lint && npm test && npm run build` (CI set); locally also `npm run test:e2e` then `npm run test:e2e:prod` (sequentially) |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PWD-01 | Mount shows 20-char all-sets password; two loads differ; raw HTML has skeleton only | RTL + e2e + prod e2e | `npx vitest run app/tools/password/PasswordTool.test.tsx`; `npx playwright test tests/e2e/password.spec.ts`; `npx playwright test -c playwright.prod.config.ts password-ssr` | ❌ Wave 0 |
| PWD-02 | Slider and number input stay in sync; invalid draft shows hint and does not regenerate; blur clamps; hostile `len` clamped | RTL + e2e | `npx vitest run app/tools/password/PasswordTool.options.test.tsx`; `npx playwright test tests/e2e/password.spec.ts -g length` | ❌ Wave 0 |
| PWD-03 | Sole enabled set is `disabled` with hint and `aria-describedby`; click is a no-op; other switches enabled | RTL | same options test file | ❌ Wave 0 |
| PWD-05 | Draft normalizes live, blur rewrites, empty restores default + hint states, disabled while Symbols off, cap at `SYMBOL_SET_MAX` | RTL | same options test file | ❌ Wave 0 |
| PWD-06 | Look-alike chars absent from output; hint lists `LOOK_ALIKES` | RTL + e2e | options test; `-g look-alikes` | ❌ Wave 0 |
| PWD-07 | No Web Crypto => `password-error` role alert, no output/copy, options editable, retry fails closed; page has no weaker source (guard) | RTL + e2e + guard | options/output test (`vi.stubGlobal("crypto", undefined)`); e2e init-script; `npx vitest run lib/password/boundaries.test.ts` | ❌ Wave 0 (guard exists, needs `WALK_DIRS`) |
| PWD-08 | Runs colored by class, no whitespace between spans, `textContent` equals raw, copy writes raw string | unit + RTL + e2e | `npx vitest run app/tools/password/runs.test.ts PasswordTool.output.test.tsx`; e2e clipboard equals `textContent` after triple-click + Ctrl+C | ❌ Wave 0 |
| POUT-01 | Regenerate changes output; hero copy shows "Copied!" then reverts ~2s; copy failure message | RTL + e2e | output test; `tests/e2e/password.spec.ts -g copy` | ❌ Wave 0 |
| POUT-02 | Batch n renders n rows with per-row names `Copy password i`; Copy all writes `join("\n")`; hero at n=1 | RTL + e2e | output test; e2e `?n=5` | ❌ Wave 0 |
| POUT-03 | URL options-only; default => bare path; mount rewrites hostile URL to `?len=128`; `page.url()` never contains output; `history.state` has no output (null only in jsdom); redaction unchanged | RTL (url) + e2e + existing analytics unit | `npx vitest run app/tools/password/PasswordTool.url.test.tsx lib/analytics`; `npx playwright test tests/e2e/password-url.spec.ts` | ❌ Wave 0 (analytics regression exists from Phase 12) |
| POUT-04 | `/` focuses+selects length; Enter regenerates but not from button/switch (RTL zero-call; e2e call-count); Esc resets options+drafts+URL; Ctrl/Cmd+C copies single, none for batch, none with selection | RTL + e2e | `npx vitest run app/tools/password/PasswordTool.keyboard.test.tsx`; `npx playwright test tests/e2e/password-keyboard.spec.ts` | ❌ Wave 0 |
| POUT-05 | Output is a `div` with `translate="no"`, `spellcheck="false"`; no form/output ancestors; password absent from every `title`/`aria-*`/`data-*`/value; live region only fixed phrases; inputs carry autofill opt-outs | RTL + e2e + page-guard | output test; `tests/e2e/password-privacy.spec.ts`; page-guard test | ❌ Wave 0 |

Additional non-requirement gates (UI-SPEC explicit rows): 320px no horizontal overflow at `?len=128` and `?n=20&len=128` in light and dark (e2e, hash-layout pattern: `scrollWidth <= clientWidth`, plus per-element right-edge offender scan).

### e2e call-count technique for "Enter does not double fire"
Wrap the Web Crypto method with a counter in an init script (call original with `this`), load a **deterministic-count** configuration (`/tools/password?d=0&s=0`: only upper+lower on, so resampling never triggers in practice and one generation is exactly 20 calls), focus the Regenerate button (or a switch), record the counter, press Enter, and assert the delta equals exactly one generation (20), not two. Native button Enter fires one click; the global handler must contribute zero. [ASSUMED: the exact delta of 20 depends on `randomInt` drawing one value per character with negligible rejection; validate at first run and fall back to `delta <= 20` plus the RTL zero-call test if it proves flaky.]

### Sampling Rate
- **Per task commit:** `npx vitest run app/tools/password lib/password/boundaries.test.ts` (under 30 s, node + jsdom).
- **Per wave merge:** `npm run typecheck && npm run lint && npm test`.
- **Phase gate:** `npm run build`, then `npm run test:e2e`, then `npm run test:e2e:prod` (sequential, locally; CI does not run e2e), full unit suite green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `app/tools/password/{page,PasswordToolLoader,PasswordTool,PasswordOptionsPanel,PasswordOutput,PasswordRow,ColoredPassword}.tsx`, `runs.ts` (none exist; `app/tools/password` does not exist yet)
- [ ] `app/tools/password/password-test-utils.ts` (`cycleFill`; no Web Crypto name)
- [ ] `app/tools/password/PasswordTool*.test.tsx`, `runs.test.ts`, page-guard test (or `WALK_DIRS` extension plus new `analyze` output + mutants in `lib/password/boundaries.test.ts`)
- [ ] `tests/e2e/password.spec.ts`, `password-keyboard.spec.ts`, `password-url.spec.ts`, `password-privacy.spec.ts`
- [ ] `tests/e2e-prod/password-ssr.spec.ts`
- [ ] Framework install: none needed

## Security Domain

`security_enforcement` is enabled (absent/true), ASVS level 1, block on high [VERIFIED: .planning/config.json].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | no accounts or sessions |
| V3 Session Management | no | none |
| V4 Access Control | no | none |
| V5 Input Validation | yes | `parseOptions` (whitelist, digit-regex counts, 2048-char search cap, 64-char decoded `sym` cap, fresh object so no prototype keys) and `normalizeToolOptions`/`normalizeSymbols` on every commit; UI drafts validated by `parseIntInRange` before commit |
| V6 Cryptography | yes | only `crypto.getRandomValues` via the audited `randomInt`; never hand-rolled; fail closed on absence; guard tests forbid `Math.random` and naming the method outside `random.ts` |
| V7 Error Handling and Logging | yes | no `console.*`; error states carry fixed prose and never characters |
| V8 Data Protection | yes | no storage, history, export, analytics of output; output never in URL, `history.state`, attributes, live region |
| V14 Configuration | yes | placeholder `noindex`; no `<form>`/autofill surface |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Password baked into prerendered HTML / CDN | Information Disclosure | `ssr:false` island, no module-level generation, prod raw-HTML spec (structural + script-stripped text check) |
| Password into URL / history / analytics | Information Disclosure | `serializeOptions` takes options only; raw `replaceState(null, ...)`; allow-list stays empty; page-ban guard for `router.replace`, `useSearchParams`, `location.hash`, `track(`, `pushState` |
| Hostile link (huge `len`, `n=1e9`, junk `sym`, `__proto__`) | Tampering / DoS | codec clamps and whitelists; e2e hostile-URL case asserts clamped load with no error UI |
| Password manager / translate / spellcheck capturing output or option inputs | Information Disclosure | non-form `div`, `translate="no"`, `spellcheck="false"`, `autocomplete="off"` + vendor opt-outs, no `<form>`, manual UAT |
| Weaker-RNG fallback | Spoofing / Tampering | library throws `CryptoUnavailableError`; UI shows error and no password; guard forbids `Math.random` in the page too |
| Clipboard retention (history managers) | Information Disclosure | cannot be mitigated by the page; no auto-clear (rejected); honest wording is Phase 14 |
| Value leaked to screen readers or logs via announcements | Information Disclosure | one polite region with fixed phrases only; no `console.*` |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | all tooling | yes | v22.23.4 | — |
| npm | scripts | yes | 10.9.9 | — |
| Playwright Chromium | e2e, prod e2e | yes (`ms-playwright` has chromium-1228/1248; a headless Chromium launch succeeded this session) | 1.61.1 | — |
| Port 3000 | `npm run test:e2e` (dev server) | **occupied** by an existing node process (PID 57546 at research time); config reuses it when not CI | — | Confirm it is this checkout's dev server or stop it; Playwright will start its own if free |
| Port 3101 | `npm run test:e2e:prod` | free at research time | — | — |
| Browser password managers / Safari / page translation | manual UAT (D-16) | not automatable here | — | Manual UAT checklist, queued to milestone UAT like Phase 12's human checks |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** manual UAT items (password manager, Safari, translate) are human-only by nature.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Provisional hero height estimate (about 122px, or about 150px if the 20-char value wraps at 320px) | Pattern 10 | Only a sanity estimate; the plan measures real heights, so no execution risk |
| A2 | The e2e counting-fill technique yields exactly 20 `getRandomValues` calls per default-ish generation for `?d=0&s=0` (one `Uint32` draw per char, negligible rejection and resampling) | Validation Architecture | Flaky equality; fallback is `delta <= 20` plus the RTL zero-call proof |
| A3 | Playwright `ControlOrMeta+c` is accepted for the copy chord | Validation (keyboard e2e) | `[VERIFIED: playwright-core contains "ControlOrMeta"]` in the bundle but no existing spec uses it; fall back to `Control+c` on Linux/CI, `Meta+c` on macOS |
| A4 | The Next router tree stored in `history.state` contains only route/search-param (options) data, never output | Pitfall 1 | Low: output is never passed to any router API; the e2e `JSON.stringify(history.state)` check proves it empirically |
| A5 | Accepting that after a double Copy inside 2s the second copy is not re-announced | Pattern 7 | Minor a11y gap; fixable with a copy counter if UAT objects |
| A6 | Mapping every non-exhausted throw (including `RangeError` from a non-uniform fill) to the Web Crypto sentence | Pattern 2 | Wording slightly imprecise for an exotic failure; behavior (fail closed) is correct either way |

## Open Questions

1. **Where to put the page-ban guard (D-15 allows either)**
   - What we know: `analyze()` scopes `frameworkImporters`, `loaderImporters`, `sideChannels` to `lib/password/` only, so extending `WALK_DIRS` alone gives the page only the `Math` random, Web Crypto name, wordlist-import and crypto-module rules.
   - Recommendation: extend `WALK_DIRS` in `boundaries.test.ts` (D-15) **and** put the Phase 13 bans in a sibling pure guard (`app/tools/password/page-guards.test.ts`, `// @vitest-environment node`) reusing the same `stripComments`/mutant approach. Avoid growing `boundaries.test.ts`'s `Analysis` shape; duplicating the small `stripComments` helper is cheaper than refactoring a verified file, or export it via a tiny shared non-test module if the planner prefers.
2. **Should the island root carry `data-testid="password-tool"`?** UI-SPEC's island structure does not list it, but the skeleton pin procedure and the 320px overflow offender scan (hash-layout pattern) need a root. Recommendation: add it (testid only, no value-bearing data).
3. **Re-announce on repeated copy.** Accept the gap (A5) or add a per-hook copy counter. Recommendation: accept for Phase 13, mention in SUMMARY.
4. **E1-a11y-snapshot interpretation** (UI-SPEC unresolved row): recommendation in the section above; confirm at UAT.
5. **Manual UAT queue.** Password-manager save/autofill prompt, Safari, and translation checks are not automatable; follow the Phase 12 precedent of persisting them as a UAT file and batching them to milestone UAT.

## Suggested Plan Slicing (for the planner)

1. **Tracer (Wave 1):** `page.tsx` (+ placeholder metadata/noindex), `PasswordToolLoader.tsx` with provisional skeleton, a minimal `PasswordTool` (lazy-init generate, hero value with `ColoredPassword`, Copy, Regenerate, error state), `runs.ts` + test, `password-ssr.spec.ts` prod spec and a smoke e2e (two loads differ). This lands the leak guard before any option UI.
2. **Options + URL (Wave 2):** options panel with lifted drafts, `commit()`, URL writer + mount rewrite, symbol/length/batch behavior, RTL options/url tests, attribute-guard tests.
3. **Batch + copy + live region + keyboard (Wave 3):** rows, Copy all, announcements, shortcuts, keyboard RTL + e2e.
4. **Guards + privacy e2e + layout (Wave 4):** `WALK_DIRS` extension, page-ban guard with mutants, privacy/URL e2e (with the `history.state` correction), 320px overflow e2e, skeleton measurement recorded in the SUMMARY, full sequential gate run (`typecheck`, `lint`, `test`, `build`, `test:e2e`, `test:e2e:prod`).

## Project Constraints (from CLAUDE.md)

- Tech stack locked: Next.js App Router + TypeScript, Tailwind CSS, Vercel; static-first, client components only where interaction requires; local-first processing; no third-party requests.
- Performance: 90+ Lighthouse, minimal JS per page, no avoidable CLS (final pin and Lighthouse are Phase 14, but do not add heavy imports; never import the wordlist).
- Privacy: no tracking cookies, no PII; sensitive URL query params excluded/redacted from analytics (allow-list stays empty).
- UX non-negotiables: zero-effort default result on load, one-click copy with visible confirmation, keyboard-first, no modals/popups.
- GSD workflow: file edits go through a GSD command (this research file is the phase artifact; implementation happens in `/gsd-execute-phase`).
- Conventions: none established beyond existing patterns (follow `app/tools/uuid`, `hash`, `subnet`).
- Installed versions differ from CLAUDE.md prose (TypeScript 6.0.3, ESLint 9.39.5 in `package.json`); code against installed versions.

## Sources

### Primary (HIGH confidence)
- In-repo files read this session: `13-CONTEXT.md`, `13-UI-SPEC.md`, `lib/password/{index,constants,types,url-state,charset,generate,errors,random,test-utils,boundaries.test}.ts`, `lib/hooks/{useKeyboardShortcut,useCopyToClipboard}.ts`, `app/tools/uuid/{UuidTool,UuidToolLoader,page}.tsx`, `app/tools/hash/{HashToolLoader,HashTool.keyboard.test,hash-test-utils}`, `SubnetTool.tsx`/`DnsTool.tsx` URL writers, `components/ui/{switch,input,label}.tsx`, `tests/e2e/{hash-keyboard,hash-url,hash-layout,uuid,privacy}.spec.ts`, `tests/e2e-prod/*`, `playwright*.config.ts`, `vitest.config.ts`, `package.json`, `eslint.config.mjs`, `.planning/config.json`, `.planning/research/{ARCHITECTURE,PITFALLS}.md`, `ROADMAP.md` Phase 13, `REQUIREMENTS.md`.
- `node_modules/next/dist/client/components/app-router.js:84-95, 248-275` (history patch, `copyNextJsInternalHistoryState`).
- `node_modules/@radix-ui/react-switch/dist/index.mjs` (`isFormControl`, bubble input only in forms).
- `node_modules/playwright-core/lib/coreBundle.js` (input types supported by `fill`, includes `range`; `ControlOrMeta` present).
- Empirical probes this session: (a) throwaway Vitest test passed for Switch toggle in jsdom, controlled range `fireEvent.change`, `vi.spyOn(globalThis.crypto, "getRandomValues")` with a cycle fill producing `Aa0!` x5, and `vi.stubGlobal("crypto", undefined)` yielding the Web Crypto error (file removed afterwards, working tree clean); (b) throwaway Chromium script confirming both `Object.defineProperty(Crypto.prototype,"getRandomValues",{value:undefined,configurable:true})` and `delete Crypto.prototype.getRandomValues` make `crypto.getRandomValues` undefined; (c) Python scan of `.next/server/app/tools/uuid.html` showing the raw-HTML 20-char all-sets false positives.

### Secondary (MEDIUM confidence)
- None required; no web sources were needed (all findings are repo or installed-package facts).

### Tertiary (LOW confidence)
- Items tagged `[ASSUMED]` in the Assumptions Log only.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new; versions read from `package.json`.
- Architecture: HIGH, direct reuse of verified in-repo patterns; hook and library behavior read from source.
- Pitfalls: HIGH for the five source-verified traps (history patch, raw-HTML false positives, helper scanned by guard, Label peer-disabled, remount focus); MEDIUM for the e2e call-count exactness (A2).

**Research date:** 2026-11-11
**Valid until:** 2026-12-11 (stable internal patterns; re-check the Next history patch if Next is upgraded)
