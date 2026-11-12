# Phase 13: Password Generator Page - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 delivers the client-side Password-mode page at `/tools/password`, built on the Phase 12 `lib/password` barrel. On mount the visitor gets a fresh 20-character password that uses all four character sets. They can change the options, regenerate, copy, generate a batch of 1–20 and bookmark the options, and they can do all of it from the keyboard. The password never leaks into the server HTML, the URL, analytics, autofill, translation or accessibility surfaces.

Requirements: PWD-01, PWD-02, PWD-03, PWD-05, PWD-06, PWD-07, PWD-08 and POUT-01..05.

**In scope:**
- `app/tools/password/` page shell
- client-only loader with a skeleton
- the `PasswordTool` island, with its options panel and output (hero and batch)
- options-only URL state
- keyboard shortcuts
- privacy guards (DOM, a11y, URL, autofill, translate)
- extending the `lib/password` source guard to the page
- unit, e2e and prod-e2e coverage

**Out of scope (Phase 14):**
- the Password/Passphrase mode toggle and passphrase controls, plus the lazy wordlist loading
- the strength meter, the pool-size · bits line and the crack-time estimate
- the registry, nav, landing-card and sitemap entries, and the `KeyRound` icon
- final metadata/OG, the shared About area (worked example, EFF attribution, FAQ, JSON-LD) and the privacy FAQ wording, which needs human approval
- the final no-CLS skeleton pin
- Lighthouse runs
- updating the tool count from 6 to 7

Until then the route can be reached directly for e2e, but nothing links to it.

</domain>

<decisions>
## Implementation Decisions

### Page structure, rendering & generation lifecycle
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

### Options panel & controls
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

### Output display, copy & batch
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

### URL state, keyboard & privacy verification
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/password` barrel (`lib/password/index.ts`):
  - functions: `generatePassword`, `generateBatch`, `parseOptions`, `serializeOptions`, `normalizeSymbols`, `normalizeToolOptions`, `resolveAlphabet` and `clampInt`
  - constants: `LENGTH_*`, `BATCH_*`, `DEFAULT_SYMBOLS`, `LOOK_ALIKES` and `DEFAULT_OPTIONS`
  - errors: `CryptoUnavailableError` and `GenerationExhaustedError`
  - `PASSWORD_URL_KEYS`
  - Everything takes an optional `{ fill }` for deterministic tests.
- `lib/hooks/useKeyboardShortcut.ts`: `slash`, `enter`, `escape` and `copy`. It has the Enter guard for interactive targets and `summary`, and `/` and copy are suppressed in editable targets. A range input counts as an editable `INPUT`.
- `lib/hooks/useCopyToClipboard.ts`: `copy`, `copied`, `error` and `reset`, one instance per copy target.
- `components/ui`: `button`, `input`, `label`, `switch` (Radix renders a `<button role=switch>`, so the Enter guard covers it), `toggle-group`, `separator` and `badge`. lucide-react provides the `Copy`, `Check` and `RefreshCw` icons.
- `lib/config/token-classes.ts` provides the color-pair conventions for distinct, contrast-safe token colors.

### Established Patterns
- `app/tools/uuid/` is the closest analog: the server page, the `ssr:false` loader with a pinned skeleton, a lazy `useState` initial generation, the batch count draft and validation, the hero vs batch list, Copy all, the WR-02 copy reset, and the WR-03 copy shortcut disabled for batches.
- `app/tools/subnet/SubnetTool.tsx` has the raw `history.replaceState(null, "", url)` URL writer. `app/tools/hash/HashTool.tsx` has the `spellCheck`/`autoComplete` input attributes, the keyboard tests and the split RTL test files.
- Live regions: a visually hidden `aria-live="polite"` span with "Copied!"-style fixed text, next to the copy controls.
- The guard-test style is `lib/hash/boundaries.test.ts` and `lib/password/boundaries.test.ts`: a pure `analyze(sources)` run under `// @vitest-environment node`.

### Integration Points
- New: `app/tools/password/{page.tsx, PasswordToolLoader.tsx, PasswordTool.tsx, …}`, `tests/e2e/password*.spec.ts` and `tests/e2e-prod/password-ssr.spec.ts`.
- Modified: `lib/password/boundaries.test.ts` (`WALK_DIRS`).
- Untouched in this phase: `tools/registry.ts`, `components/ToolCard.tsx` `ICONS`, `app/sitemap.ts`, the nav, and `app/tools/pages-about.test.ts`. That guard is driven by the registry, so an unregistered page doesn't trip it.
- CI runs typecheck, lint, test and build only. `npm run test:e2e` and `npm run test:e2e:prod` must be run locally (SC-5).

</code_context>

<specifics>
## Specific Ideas

- Inputs for the researcher and planner:
  - `.planning/research/ARCHITECTURE.md` §4.1 and §4.4 (data flow)
  - `.planning/research/PITFALLS.md` Pitfalls 1, 4, 5, 6, 18, 19 and 20
- "Two loads differ" uses the default 20-character all-sets configuration, where a collision is negligible. Batch and option assertions check shape (length, sets present, no excluded characters) and never specific values.
- A hostile-URL e2e example: `/tools/password?len=999&n=1e9&u=0&l=0&d=0&s=0&sym=%F0%9F%98%80abc&evil=1`. It should load 128-character passwords using all sets, with the default symbols, the batch at its default, and the URL rewritten.
- The numbers shown in hints come from `lib/password` constants. Requirement text is never the source (STATE.md concern: pool 85, not 84).

</specifics>

<deferred>
## Deferred Ideas

- Shared-hook fix so the global Ctrl/Cmd+C and Esc don't fire on selected text or inside the About area (Phase 10 WR-01/WR-02). This stays a separate quick task. Phase 13 only adds a local selection guard to its own copy handler.
- Symbol-set preset chips ("Common", "Safe for most sites"), from Pitfall 19. These are optional and not required by any requirement.
- An auto-clear-clipboard timer. This is rejected (Pitfall 6). The honest clipboard-history FAQ wording belongs to Phase 14 and needs human approval.
- Everything in the Phase 14 boundary listed above.

</deferred>

## Auto-accepted proposals (review later)

The user asked for minimal interaction, so every Recommended answer below was accepted automatically.

### Grey Area 1/4: Page structure, rendering & generation lifecycle

| # | Question | Recommended (accepted) | Alternative(s) |
|---|----------|------------------------|----------------|
| 1 | How is the page split? | Server `page.tsx`, a `"use client"` loader with `dynamic(ssr:false)`, and the `PasswordTool` island. This mirrors UUID and Hash, and ARCHITECTURE §4.1 already prescribes it. | Render the island on the server and generate in an effect. This is rejected because of the risk of a server-HTML leak (Pitfall 1). |
| 2 | Where does the first password get generated? | In a lazy `useState` initializer inside the `ssr:false` island, as UUID does. It runs once and only on the client. The roadmap's "never in render or `useMemo`" is read as banning per-render or memoized generation. | Generate in a mount `useEffect` with setState. This causes an empty first paint and trips `react-hooks/set-state-in-effect`. |
| 3 | What happens when Web Crypto is missing? | An inline `role="alert"` error in the output slot, no password, copy controls hidden, and options still editable but every attempt failing closed. | Replace the whole tool with an error card. This hides the options for no benefit. |
| 4 | What metadata does this phase ship? | A placeholder title, description and canonical URL, plus `noindex`/`nofollow` until Phase 14. The page is unadvertised and shouldn't be indexed before it is complete. | Full SEO metadata now. That is Phase 14's scope (PREG). Or no metadata at all, which would show the default site title. |

### Grey Area 2/4: Options panel & controls

| # | Question | Recommended (accepted) | Alternative(s) |
|---|----------|------------------------|----------------|
| 1 | What should the length slider be? | A native `<input type="range">` synced with a number input. It is zero-dependency, accessible, and fits the locked "no new deps" rule. | A Radix Slider from the installed `radix-ui`. It is heavier, and the native control is enough. |
| 2 | How does the number input handle invalid typing? | A local draft with an inline error while out of range. A valid value commits and regenerates, and blur clamps and resyncs. This is the UUID `countError` precedent. | Clamp on every keystroke. This makes typing "12" impossible, because "1" becomes 4. |
| 3 | When is the symbol-set editor normalized? | Generation uses `normalizeSymbols(draft)` live, and the draft is rewritten to the normalized form on blur. The input is disabled while Symbols is off. | Normalize on every keystroke. This makes it impossible to clear the field and type a new set, because empty immediately restores the default. |
| 4 | How is the last enabled set locked? | The sole remaining `Switch` is `disabled`, with a visible hint (PWD-03). | Keep it clickable and ignore the click (confusing). Or auto-enable another set (surprising). |

### Grey Area 3/4: Output display, copy & batch

| # | Question | Recommended (accepted) | Alternative(s) |
|---|----------|------------------------|----------------|
| 1 | Which element holds the password? | A `<div translate="no" spellCheck={false}>` with `select-all`, `break-all` and mono text, with no form element and no `<output>` (POUT-05). | `<code>`, which is equivalent and acceptable. Or a read-only `<input>`, which is rejected because of autofill and password-manager prompts. |
| 2 | How are digits and symbols color-coded? | Per-run spans: letters in the foreground color, digits sky and symbols amber, as 700/300 light/dark pairs following the config token-class palette. | Bold or underline instead of color, which is weaker. Or a background tint per character, which is noisy at 128 characters. |
| 3 | What does the batch look like? | Batch 1 is a hero with copy and Regenerate. Batch >1 is a list of rows with per-row copy and Copy all (`\n`-joined), with `${generation}-${index}` keys (UUID precedent). | Always a list, even for one result. This loses the hero and the Ctrl/Cmd+C confirmation target. |
| 4 | What do live regions announce? | One polite region with fixed phrases only: "Copied", "Copied all passwords" and "New password generated". It never announces the value. | Announce copies only, which gives no feedback for Enter or Regenerate. Or announce the value, which POUT-05 forbids. |

### Grey Area 4/4: URL state, keyboard & privacy verification

| # | Question | Recommended (accepted) | Alternative(s) |
|---|----------|------------------------|----------------|
| 1 | When is the URL written? | On every commit and once on mount, through `replaceState(null, …)` with `serializeOptions`, so hostile URLs are rewritten to their canonical form. | Write only on user changes. This leaves junk params in the address bar. Or `router.replace`, which the locked decisions forbid. |
| 2 | What do Esc and Ctrl/Cmd+C do? | Esc resets all options, the drafts and the URL, then regenerates. Ctrl/Cmd+C copies only when batch is 1 and skips when the user has text selected (local guard). | Esc only blurs. Or Ctrl/Cmd+C with no selection guard, which overrides a partial native copy. |
| 3 | What happens to mode and the passphrase params in Phase 13? | Mode is coerced to `password`, and the passphrase fields pass through the URL untouched for Phase 14. | Honor `mode=passphrase` with a "coming soon" notice. That builds UI that Phase 14 replaces. |
| 4 | How are the privacy guarantees proven? | Extend `WALK_DIRS` to `app/tools/password` and add page bans (storage, `router.replace`, `location.hash`, `track(`). RTL attribute and a11y tests, e2e URL/history/a11y-snapshot checks, a prod raw-HTML SSR spec, and a manual password-manager and translate UAT. | Use e2e only, with no source guard. This is weaker against later regressions. |

**Departures from requirement/roadmap text:**
- D-02 treats a lazy client-only `useState` initializer as allowed under the roadmap rule "never in render".
- D-04 adds a temporary `noindex`.
- D-07 shows Password mode for `?mode=passphrase` until Phase 14.
- D-14 adds a selection guard to Ctrl/Cmd+C.
- The PWD-05 symbol set stays narrowed as in Phase 12 D-07: letters, digits and space are excluded.

**New dependencies:** none.
