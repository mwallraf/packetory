# Phase 14: Passphrase, Strength & Launch - Pattern Map

**Mapped:** 2026-11-11
**Files analyzed:** 36 (new + modified)
**Analogs found:** 34 / 36 (all analog paths verified git-tracked; none are gitignored mirrors)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/tools/password/PasswordTool.tsx` (modify) | island/state | event-driven + async load | itself (lines 118-358) | self-extend |
| `app/tools/password/ModeToggle.tsx` (new) | component | request-response | `app/tools/hash/OutputToolbar.tsx` | exact |
| `app/tools/password/toggle-classes.ts` (new) | utility | n/a | `ITEM_CLASS` in `OutputToolbar.tsx` L16-17 | role-match |
| `app/tools/password/PassphraseOptionsPanel.tsx` (new) | component | request-response | `app/tools/password/PasswordOptionsPanel.tsx` | exact |
| `app/tools/password/PasswordOptionsPanel.tsx` (modify: range row, grid reflow) | component | request-response | itself L125-179 | self-extend |
| `app/tools/password/StrengthPanel.tsx` (new) | component (pure) | transform | `PasswordOptionsPanel.tsx` (presentational) + `OutputToolbar.tsx` (ToggleGroup) | role-match |
| `app/tools/password/PasswordOutput.tsx` (modify: loading/error states, passphrase copy) | component | request-response | itself L40-65 `ErrorPanel` | self-extend |
| `app/tools/password/PasswordRow.tsx` (modify: names, seq) | component | event-driven | itself | self-extend |
| `app/tools/password/ColoredPassword.tsx` (modify: `breakAfter`/`<wbr>`) | component | transform | itself | self-extend |
| `app/tools/password/reload.ts` (new) | utility | n/a | none (one-liner) | no analog |
| `app/tools/password/PasswordToolLoader.tsx` (modify: final skeleton pin) | component | static | itself L19-36; `HashToolLoader.tsx` | self-extend |
| `app/tools/password/page.tsx` (modify: metadata, intro, ToolAbout) | route (server) | request-response | `app/tools/config/page.tsx` | exact |
| `app/tools/password/faq-data.ts` (new) | data | static | `app/tools/config/faq-data.ts`, `app/tools/hash/faq-data.ts` | exact |
| `app/tools/password/PasswordExample.tsx` (new) | component (server) | static | `app/tools/config/ConfigExample.tsx` | role-match |
| `app/tools/password/faq-data.test.ts` (new) | test | n/a | `app/tools/hash/faq-data.test.ts` | exact |
| `app/tools/password/StrengthPanel.test.tsx`, `PasswordTool.passphrase.test.tsx` (new) | test | event-driven | `PasswordTool.options.test.tsx`, `PasswordTool.url.test.tsx` | exact |
| `app/tools/password/page-guards.test.ts` (modify) | test (source guard) | n/a | itself L228, L287-296, L507-510 | self-extend |
| `lib/password/boundaries.test.ts` (modify: one mutant) | test (source guard) | n/a | itself | self-extend |
| `app/tools/password/PasswordTool.url.test.tsx` (modify L89-93) | test | n/a | itself | self-extend |
| `tools/registry.ts` (modify) | config | static | existing `config`/`hash` entries | exact |
| `components/ToolCard.tsx` (modify `ICONS`) | component | static | itself L28-35 | exact |
| `components/SiteHeader.tsx` (modify `px-2.5` to `px-2`) | component | static | itself L70 | self-extend |
| `tools/registry.test.ts`, `app/sitemap.test.ts`, `components/ToolCard.test.tsx` (count 6 to 7) | test | n/a | themselves | self-extend |
| `app/tools/pages-about.test.ts` (add `password: passwordFaq`) | test | n/a | itself L9-21 | self-extend |
| `tests/e2e/home.spec.ts`, `navigation.spec.ts` (6 to 7, 640/700 fit) | e2e | n/a | themselves (`navigation.spec.ts` L85-110) | self-extend |
| `tests/e2e/password-seo.spec.ts` (new) | e2e | n/a | `tests/e2e/config-seo.spec.ts` | exact |
| `tests/e2e/password-layout.spec.ts` (new) | e2e | n/a | `tests/e2e/hash-layout.spec.ts` | exact |
| `tests/e2e/password-passphrase.spec.ts` (new) | e2e | n/a | `tests/e2e/password-options.spec.ts` | role-match |
| `tests/e2e-prod/password-wordlist.spec.ts` (new) | e2e-prod | event-driven | `tests/e2e-prod/password-ssr.spec.ts` (+ RESEARCH Pattern 2) | partial |
| `tests/e2e-prod/password-ssr.spec.ts`, `tests/e2e/password-privacy.spec.ts`, `password-responsive.spec.ts`, `password-keyboard.spec.ts` (extend) | e2e | n/a | themselves | self-extend |

## Pattern Assignments

### `app/tools/password/PasswordTool.tsx` (island, event-driven + async load)

**Analog:** itself. Keep `commit()` as the single choke point.

**Existing `commit` to change** (L192-204). The mode must no longer be forced to password:
```typescript
function commit(next: ToolOptions): Generated {
  const normalized = normalizeToolOptions({ ...next, mode: "password" });   // <- drop the forced mode
  setOptions(normalized);
  const applied = generate(normalized, gen.generation + 1);
  applyGenerated(applied);
  writeUrl(normalized);
  return applied;
}
```
Change: `normalizeToolOptions(next)`, add `++seqRef.current` in here, and branch to `requestLoad()` when `normalized.mode === "passphrase"` and `wordsRef.current === null`.

**`initialState` coercion to remove** (L118-124, D-03):
```typescript
function initialState(): { options: ToolOptions; gen: Generated } {
  const options = normalizeToolOptions({
    ...parseOptions(window.location.search),
    mode: "password",          // <- remove
  });
  return { options, gen: generate(options, 0) };
}
```
For `mode === "passphrase"` return `gen = { results: [], error: null, status: "loading", generation: 0 }` (no list yet). Keep: no `typeof window` guard (page-guard bans it), no side effects.

**`generate()` to make mode-aware** (L55-71). Keep the fail-closed catch ladder. Add a `list` param and branch: `opts.mode === "passphrase" ? generatePassphraseBatch(opts, list, opts.batch) : generateBatch(opts, opts.batch)`. `WordlistIntegrityError` maps to `"unexpected"`. Add `status: "ready" | "loading" | "wordlist-error"` to `Generated` (L42-46).

**StatusPhrase to extend, never widen to `string`** (L31-40):
```typescript
export type StatusPhrase =
  | "Copied" | "Copied all passwords" | "New password generated"
  | `${number} new passwords generated` | "Options reset. New password generated";
```
Add the six D-20(b) phrases and `${number} new passphrases generated`. Extend `generatedPhrase(n, mode)`.

**`announce` clear-then-set** (L143-147) is the pattern to keep:
```typescript
const announce = useCallback((phrase: StatusPhrase) => {
  if (statusTimer.current) clearTimeout(statusTimer.current);
  setStatus("");
  statusTimer.current = setTimeout(() => setStatus(phrase), 0);
}, []);
```

**Copy-announce effect to re-key on a counter** (L158-168; D-20a, RESEARCH "Copy re-announce" snippet). The effect keys on `heroCopy.copied` today. Add `heroSeq`/`allSeq` state bumped after `await copy()`, and include it in the deps. Keep the `setTimeout(...,0)` wrapper because of `react-hooks/set-state-in-effect`.

**Mount effect precedent** (L172-175), the shape for the D-05 load-start effect (cleanup does `seqRef.current++`):
```typescript
useEffect(() => {
  writeUrl(options);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only canonical rewrite; idempotent under StrictMode
}, []);
```

**Load state machine** (new, RESEARCH Pattern 1). Import only from the deep module, relaxing the guard for this one specifier:
```typescript
import { loadWordlist } from "@/lib/password/wordlist"; // NOT the barrel, NEVER wordlist/eff-large
// requestLoad(opts, announceStart): token = ++seqRef.current; loadWordlist().then(ok, err)
// ok:  if (token !== seqRef.current || opts.mode !== "passphrase") return; wordsRef.current = list; applyGenerated(generate(opts, ++generationRef.current, list));
// err: if (token !== seqRef.current) return; lastLoadErrorRef.current = err; applyGenerated({results: [], error: null, status: "wordlist-error", generation: ++generationRef.current});
// Retry: lastLoadErrorRef.current?.name === "ChunkLoadError" ? reloadPage() : requestLoad(options, true)
```
Use refs (`generationRef`, `wordsRef`), not closure state, in the `.then`. Do not generate inside a `setState` updater.

**Esc handler** (L287-295) keeps the mode and resets the scenario:
```typescript
function resetAll() {
  ...
  const next = commit({ ...DEFAULT_OPTIONS, mode: options.mode });   // D-02: keep mode
  setScenario("fast");                                               // D-09
```
**`/` shortcut** (L302-306): focus `lengthRef` in password mode and `wordsRef` in passphrase mode.

**Layout JSX** (L318-355): wrap as `ModeToggle`, then `password-output-zone`, then `StrengthPanel` inside one `flex flex-col gap-4` group. The Options panel follows after `gap-8`. The `aria-live` span is kept (`data-testid="password-status"`).

---

### `app/tools/password/ModeToggle.tsx`, the Separator group and the scenario group (component, request-response)

**Analog:** `app/tools/hash/OutputToolbar.tsx` L64-112. Copy the `ToggleGroup` usage and the deselect guard:
```tsx
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function handleEncodingChange(next: string) {
  // Radix emits "" on deselect; ignore it so one item is always selected.
  if (next !== "hex" && next !== "HEX" && next !== "base64") return;
  onEncodingChange(next);
}
<ToggleGroup type="single" variant="outline" value={encoding}
  onValueChange={handleEncodingChange} aria-labelledby="hash-encoding-label"
  data-testid="hash-encoding-toggle">
  <ToggleGroupItem value="hex" aria-label="Lowercase hex" data-testid="hash-encoding-hex" className={ITEM_CLASS}>hex</ToggleGroupItem>
```
**Deviation:** Hash's `ITEM_CLASS` (L16-17) is `text-[14px] ... data-[state=on]:text-primary`, which UI-SPEC says fails AA. Use the shared `TOGGLE_ITEM_CLASS` from UI-SPEC (`h-11 min-w-11 px-4 ... data-[state=on]:text-cyan-700 dark:data-[state=on]:text-primary`) in a new `toggle-classes.ts` (non-test, barrel-free, no banned tokens). The separator items come from `SEPARATORS` with an aria-name `Record`, never from a literal list. The Radix items are `role="radio"`, so the global Enter guard already skips them.

---

### `app/tools/password/PassphraseOptionsPanel.tsx` (component, request-response) and `PasswordOptionsPanel.tsx` reflow

**Analog:** `app/tools/password/PasswordOptionsPanel.tsx`. Copy these sections.

**Guards, label and hint classes** (L42-56). Reuse by exporting from a shared file:
```typescript
const TEXT_INPUT_GUARDS = { autoComplete: "off", spellCheck: false, autoCorrect: "off", autoCapitalize: "off",
  "data-1p-ignore": true, "data-lpignore": "true", "data-bwignore": true, "data-form-type": "other" } as const;
const LABEL_CLASS = "text-[14px] leading-[1.4] font-semibold";
const HINT_CLASS = "text-[14px] leading-[1.4] font-normal text-muted-foreground";
```

**Range+draft row to copy for Word count** (L125-179: `Label` + `Input` + native `<input type="range">` + error hint with `aria-invalid`/`aria-describedby`). Apply Fix 4 here: move the min/max numbers to the two ends of the slider row, as in UI-SPEC "Range rows". Island-side draft handlers to copy: `onLengthDraftChange`, `onLengthBlur`, `onSliderChange` (PasswordTool.tsx L206-231) with `parseIntInRange(value, WORDS_MIN, WORDS_MAX)`.

**Switch row with hint, for Capitalize and Append number** (L257-280, the look-alikes row):
```tsx
<div className="flex min-h-11 items-center gap-4">
  <Switch id="password-lookalikes" data-testid="password-lookalikes" checked={options.avoidLookalikes}
    aria-describedby="password-lookalikes-hint" onCheckedChange={onLookalikesChange} />
  <Label htmlFor="password-lookalikes" className={LABEL_CLASS}>Avoid look-alikes</Label>
</div>
<p id="password-lookalikes-hint" data-testid="password-lookalikes-hint" className={HINT_CLASS}>...</p>
```
Hint copy is built from constants: `` `... Adds about ${APPEND_NUMBER_BITS.toFixed(1)} bits.` ``.

**Batch count row** (L282-312) moves to its own `sm:col-span-2` row and is shared by both modes (Fix 5). The shortcut line `Kbd` helper (L314-331) gets a passphrase variant.

**Imports pattern** (L3-15): `@/components/ui/*` plus barrel-only `@/lib/password` (`WORDS_MIN`, `WORDS_MAX`, `SEPARATORS`, `APPEND_NUMBER_BITS`, `type ToolOptions`). No deep imports in this file.

---

### `app/tools/password/StrengthPanel.tsx` (component, pure transform)

**Analog:** `PasswordOptionsPanel.tsx` (stateless presentational: props in, no state) plus the ToggleGroup pattern above.

**Derivation rules** (RESEARCH Pattern 4):
```typescript
const bits = options.mode === "password" ? passwordEntropyBits(options) : passphraseEntropyBits(options);
const level = strengthLevel(bits);                                   // raw bits
const label = `${STRENGTH_LABELS[level]} · ${formatBits(bits)}`;
const t = formatCrackTime(crackTimeLog10Seconds(bits, GUESS_RATES[scenario]));
```
- No `useMemo` (page-guard bans it) and no `aria-live`.
- Pool line: `${resolveAlphabet(options).poolSize} chars · ${formatBits(bits)}` or `${EFF_WORD_COUNT.toLocaleString("en-US")} words × ${n}${num ? " + 1 digit" : ""} · ${formatBits(bits)}`.
- Crack sentence: drop "About" and capitalize when `t` starts with "less than" or "more than". This is a small exported pure helper with its own unit test.
- Assumption text is `GUESS_RATE_LABELS[scenario]` verbatim.
- Markup is in UI-SPEC "Strength panel". The meter has `aria-hidden`, `data-level`, `h-2`, `gap-1`. The scenario group uses `flex-wrap`.
- Scenario `onValueChange` ignores `""`, as in the Hash analog.

---

### `app/tools/password/PasswordOutput.tsx` (modify: loading and wordlist-error states)

**Analog:** its own `ErrorPanel` (L40-65). Copy this structure for the wordlist error panel and add the Retry button, which reuses the Regenerate outline classes at L117:
```tsx
<div data-testid="password-error" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-background p-4">
  <TriangleAlert aria-hidden="true" className="mt-1 size-4 shrink-0 text-destructive" />
  <div role="alert" className="flex flex-col gap-2">
    <p className="text-[16px] leading-[1.5] font-normal text-destructive">{copy.sentence}</p>
    <p className="text-[14px] leading-[1.4] font-normal text-muted-foreground">{copy.nextStep}</p>
  </div>
</div>
```
**Render dispatch** (L221-240): extend the order to `status === "loading"` (pulse block), `status === "wordlist-error"` (panel + Retry, no copy controls), then the existing error, batch and hero branches. Each output state is exactly one node inside `password-output-zone`. Hero value class changes `break-all` to `[overflow-wrap:anywhere]` for passphrases only. Accessible names (`Copy passphrase`, `Copy all passphrases`, `{n} passphrases`) are derived from `options.mode`, passed as a prop. `ERROR_COPY` gets passphrase variants (UI-SPEC Copywriting).

### `PasswordRow.tsx`

**Analog:** itself (L21-40). Keep the `copied` effect with the `setTimeout(onCopied, 0)` wrapper. Add a `kind` prop for the `aria-label` (`Copy passphrase {i}`) and a copy-seq so repeat copies re-announce (D-20a).

### `ColoredPassword.tsx`

**Analog:** itself (L16-26). Add optional `breakAfter?: string` and emit `<wbr />` (keyed `Fragment`) after separator characters in passphrase mode. `<wbr>` adds no text, so `textContent` stays exact. Update `ColoredPassword` or `runs` tests that assume spans only (RESEARCH Pitfall 8).

---

### `app/tools/password/page.tsx` (server route)

**Analog:** `app/tools/config/page.tsx` (full file, L1-53). Copy the metadata block, the intro `<p>` and `ToolAbout` as the last child of `main`:
```tsx
export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CANONICAL_URL, type: "website" },
};
<p className="mt-4 text-[16px] leading-[1.5] text-muted-foreground">...</p>
<div className="mt-8"><PasswordToolLoader /></div>
<ToolAbout slug="password" faqItems={faqItems}><PasswordExample /></ToolAbout>
```
Remove the `robots: { index: false, follow: false }` (current L21). Keep `max-w-3xl` as in the current Password page (Config uses `max-w-6xl`). The page imports only server-safe barrel exports and never the island or the wordlist. Add `data-testid="password-intro"` to the intro.

### `app/tools/password/faq-data.ts`

**Analog:** `app/tools/config/faq-data.ts` (shape L15-59) and the header comment of `app/tools/hash/faq-data.ts` (L1-14, the privacy pin note). `lib/seo/jsonld.ts` L11 exports `FaqItem`; the tool files re-declare it locally. Either approach is fine, but follow the Config shape:
```typescript
export type FaqItem = { question: string; answer: string };
export const faqItems: FaqItem[] = [ { question: "...", answer: `...${DEFAULT_POOL_SIZE}...` }, ... ];
```
- Answers are plain strings with every number as a template from `@/lib/password`. No JSX.
- Attribution links live in `PasswordExample`, not in FAQ answers (RESEARCH Pattern 6 parity).
- Q5 and Q6 are the D-15 drafts, pinned by exact equality in `faq-data.test.ts` (Hash precedent).
- Imports are barrel-only and must never touch the wordlist.

### `app/tools/password/PasswordExample.tsx` (server component)

**Analog:** `app/tools/config/ConfigExample.tsx` (L12-50): a server function component with a `text-[14px] font-semibold` sub-heading, a bordered `bg-secondary` block, and a `mt-4 text-[16px] ... text-muted-foreground` prose paragraph. Keep it free of `"use client"`. Placeholder: `Array(WORDS_DEFAULT).fill("word").join("-")` in a `<pre>`. **Deviation:** no sample password or passphrase string (the prod SSR spec scans for one). Links use `rel="noreferrer"` and the `LINK` class from UI-SPEC. Add `data-testid="password-attribution"`.

---

### `app/tools/password/PasswordToolLoader.tsx` (skeleton re-pin)

**Analog:** itself (L19-36). Replace the single hero block with the three text-free blocks (mode row, hero, strength panel). The pinned `h-[Npx] sm:h-[Npx]` classes sit on the element with `data-testid="password-skeleton"`. Record the "Measured (14-xx ...)" line in the doc comment. In planning docs write the heights as prose, not bracketed class text (Tailwind scans `.planning/`, Pitfall 12). Keep `dynamic(..., { ssr: false, loading })`.

---

### Registry, ToolCard, SiteHeader

**`tools/registry.ts`:** append after the `config` entry (L87-100 is the shape). The current last entry is:
```typescript
  {
    slug: "config", name: "Config Syntax Highlighter", shortName: "Config",
    description: "...", category: "network", keywords: [...],
    icon: "FileTerminal", status: "active", clientOnly: true, featured: false,
  },
];
```
New entry per D-10 (`category: "generate"`, `icon: "KeyRound"`, description from UI-SPEC Copywriting). **The sort puts Password LAST**, after MAC, because Subnet and UUID are featured (RESEARCH Pitfall 2). Expected order: `subnet, uuid, config, dns, hash, mac, password`.

**`components/ToolCard.tsx` L28-35:** add `KeyRound` to the lucide import and to `ICONS`.

**`components/SiteHeader.tsx` L70:** change `px-2.5` to `px-2` on the active-link class string. RESEARCH measured 0px slack at 640px. The planned-link class on L56 may stay the same unless the registry has planned tools.

### Count and ordering updates (all `6` to `7`, order ends `"mac", "password"`)

- `tests/e2e/home.spec.ts` L10, L12, L45, L47: `toHaveCount(6)`, `i < 6`, plus the names list gains `"Password Generator"`.
- `tests/e2e/navigation.spec.ts` L32 (drawer shortName list gains `"Password"`), L37 `toHaveCount(6)` becomes 7, and L85-110 `describe("Desktop nav fits six tools at 640px")`. Rename it and parametrize widths 640 and 700, keeping this shape:
```typescript
test.use({ viewport: { width: 640, height: 800 } });
const links = page.getByTestId("nav-link");
await expect(links).toHaveCount(7);
const overflow = await page.evaluate(() => { const header = document.querySelector("header"); return {
  pageScrollWidth: document.documentElement.scrollWidth, pageClientWidth: document.documentElement.clientWidth,
  headerScrollWidth: header?.scrollWidth ?? 0, headerClientWidth: header?.clientWidth ?? 0 }; });
```
Add a shared-`offsetTop` assertion, a >= 8px slack assertion and logo/theme-toggle visibility.
- Also: `tools/registry.test.ts`, `app/sitemap.test.ts`, `components/ToolCard.test.tsx` (hard-coded `toHaveLength(6)` and `Set size 6`), and `app/tools/pages-about.test.ts` L9-21 (add `import { faqItems as passwordFaq } from "./password/faq-data"` and `password: passwordFaq`).

---

### Guard tests

**`app/tools/password/page-guards.test.ts`** (modify). Current rules to change:
- `deepLibImports` (L290-296) currently flags any `lib/password/<x>`. Change to allow exactly `lib/password/wordlist` from `ISLAND`:
```typescript
.filter((s) => { const r = resolveSpecifier(f, s);
  if (r === BARREL || !r.startsWith(`${BARREL}/`)) return false;
  return !(f === ISLAND && r === "lib/password/wordlist"); })
```
- `GENERATION_RE` (L228) `\b(?:${GEN_BATCH}|${GEN_ONE})\s*\(`. Extend with passphrase names, assembled from parts (self-hygiene, like L52-53: `"generate" + "Passphrase"`).
- Update the mutant at L507-510 ("detects a deep import of the word-list loader", currently appended to `ISLAND`). Retarget it to `OUTPUT` and add mutants: `@/lib/password/wordlist` in `ISLAND` is allowed (empty result), in `faq-data.ts` or `PasswordExample.tsx` it is caught, `@/lib/password/wordlist/eff-large` in `ISLAND` is caught, and `generatePassphraseBatch(` in `OUTPUT` is caught.
- Non-vacuity test (L358-367): add `expect(allSpecifiers(code(ISLAND)).filter(s => s === "@/lib/password/wordlist")).toHaveLength(1)`.
- Pattern for mutants: `mutatePage(file, snippet)` (L312-316). In-memory only.

**`lib/password/boundaries.test.ts`:** no relaxation is needed (RESEARCH Pitfall 7). Add one mutant: a static import of `@/lib/password/wordlist/eff-large` from the island file is still caught by `wordlistStaticImporters`.

**`app/tools/password/PasswordTool.url.test.tsx` L89-93:** flip
```typescript
it("mode=passphrase is rewritten without mode (RESEARCH Pitfall 7)", () => {
  mount("/tools/password?mode=passphrase");
  expect(search()).toBe("");
```
to "restores the mode and keeps `?mode=passphrase`", with `vi.mock("@/lib/password/wordlist", ...)` and a resolved 7,776-word list.

---

### RTL tests (new): `PasswordTool.passphrase.test.tsx`, `StrengthPanel.test.tsx`

**Analog:** `PasswordTool.url.test.tsx` and `PasswordTool.options.test.tsx` (mount helper, StrictMode wrap, `cycleFill` from `password-test-utils.ts`). Mock the loader:
`vi.mock("@/lib/password/wordlist", () => ({ loadWordlist: vi.fn() }))` with deferred promises. Mocked lists must hold exactly 7,776 distinct strings (the generator throws `WordlistIntegrityError` otherwise). `reloadPage` is `vi.mock`ed for the `ChunkLoadError` case. For deterministic passphrase fills, indices are word indices modulo 7776 (13-RESEARCH pitfall 11). Case matrix: see RESEARCH "RTL loader seam".

---

### E2E specs

**`tests/e2e/password-seo.spec.ts`** copies `tests/e2e/config-seo.spec.ts` (L1-60). Reuse its metadata and FAQ-parity shape, swapping the testids (`password-faq-item` or whatever `ToolAbout` emits), `openAbout(page, "password", ["faq"])` from `./helpers/about`, and adding `head meta[name="robots"]` count 0 or no `noindex`:
```typescript
const jsonLdScript = page.locator('script[type="application/ld+json"]');
await expect(jsonLdScript).toHaveCount(1);
expect(parsed.mainEntity[i].name).toBe(question);
expect(parsed.mainEntity[i].acceptedAnswer.text).toBe(answer);
```

**`tests/e2e/password-layout.spec.ts`** copies `tests/e2e/hash-layout.spec.ts`:
- `readPinnedHeights` (L11-21) must be anchored on the `data-testid="password-skeleton"` element's class string, not the first `h-[..] sm:h-[..]` pair (the new skeleton has several height classes).
- CLS observer (L50-61) and the wait-until-stable loop (L70-86) are copied as-is. Assert `<= 0.001` on the default load and `< 0.1` on `?mode=passphrase`.
- The height tolerance is 1px (D-17), and the multiple-of-4 assertions (L28-29) are dropped. Pin `Math.round(measured)`.
- Island testid is `password-tool`. Add the toggle test: compare `password-output-zone` `getBoundingClientRect().top` before and after clicking `password-mode-passphrase`.

**`tests/e2e-prod/password-wordlist.spec.ts`** (no repo analog). Use the verified RESEARCH Pattern 2 snippet. Header and imports follow `tests/e2e-prod/password-ssr.spec.ts` L1-50 (it imports from `../../lib/password` and has `visibleText` and `flightPayloads` helpers):
```typescript
await page.route("**/_next/static/chunks/**", async (route) => {
  if (!/\.js(\?|$)/.test(route.request().url())) return route.continue();
  const res = await route.fetch(); const body = await res.text();
  seen.push({ url, hasMarker: body.includes("abacus abdomen abdominal") });
  await route.fulfill({ response: res, body });
});
```
For (c), `route.abort()` only the first marker-bearing request, then Retry causes a page reload (RESEARCH Pitfall 1) and the second request is allowed. Tokenize passphrases with `EFF_HYPHENATED_WORDS` in mind (Pitfall 5), preferring `_` or space for counts.

**`password-ssr.spec.ts`** (extend): update the old title, description and `noindex` assertions (they assert the pre-launch metadata). Assert no robots `noindex` and no wordlist marker in raw HTML.

**`password-privacy.spec.ts` and `password-responsive.spec.ts`:** extend in place with the passphrase session and the 320px 20-word cases (D-20c/d). Match the full joined passphrase string in exit-surface scans.

## Shared Patterns

### Fail-closed generation (never fall back, never log)
**Source:** `app/tools/password/PasswordTool.tsx` L55-71. Apply to the passphrase branch and the wordlist error: no result, no previous value and no alternative list on any failure.

### Options-only URL via `history.replaceState`
**Source:** `PasswordTool.tsx` L95-107 (`writeUrl`). Apply to every commit. The scenario is never written to the URL. Never use the router or fragments.

### Live region with fixed phrases only
**Source:** `PasswordTool.tsx` L31-40 and L143-147 (`StatusPhrase`, `announce`). The union is extended, never `string`. The value never appears in the region.

### Source-guard bans (every non-test file in `app/tools/password/`)
**Source:** `page-guards.test.ts` rules: no `fetch(`, `console.`, `title=`, `<form|output|fieldset|textarea`, `useMemo`, `typeof window`, router, `location.hash/assign/replace`, storage, or generation calls outside the island. No non-barrel `lib/password/*` import except the one island exception. Build forbidden snippets from parts in tests.

### 44px targets, spacing scale, type scale
**Source:** `PasswordOutput.tsx` L95/L117 pill classes and `PasswordOptionsPanel.tsx` L53-56. Scale is 4/8/16/24/32, with no `gap-1.5`, `px-2.5`, `px-3` or `gap-3` in the page folder. 14/16px text, 400/600 weights.

### Radix ToggleGroup single-select
**Source:** `app/tools/hash/OutputToolbar.tsx` L64-112. Always `type="single" variant="outline"` and ignore the `""` value.

### Registry as single source
**Source:** `tools/registry.ts` header comment (L1-9). Nav, landing grid and sitemap derive from it. Unknown icons throw (`ToolCard.tsx` L41-47).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `app/tools/password/reload.ts` | utility | n/a | One-line `location.reload()` wrapper so RTL can `vi.mock` it (jsdom cannot stub it). Not matched by the page-guard `location.assign/replace` rules. |
| `tests/e2e-prod/password-wordlist.spec.ts` | e2e-prod | event-driven | No chunk-body scanning spec exists. Use the RESEARCH Pattern 2 snippet (empirically verified on Next 16.2.11 Turbopack). |
| Async load state machine inside the island | state | async | No existing async-loaded-data island in the repo. Use RESEARCH Pattern 1 plus `lib/password/wordlist.ts` L15-37 (memo cleared on failure). |

## Key Cautions for the Planner (from RESEARCH, verified against code)

1. **Retry cannot just re-call the loader in a prod build.** The Turbopack runtime caches the rejected chunk promise. Retry must `reloadPage()` when `lastLoadErrorRef.current?.name === "ChunkLoadError"`. The URL already holds the options, so the reload lands on the D-05 bookmark path.
2. **Sort order:** Password is last (after MAC), not "between MAC and Subnet".
3. **Nav slack is 0px at 640px.** Apply `px-2` unconditionally in `SiteHeader.tsx`.
4. **Append-number bits floor to 80, not CONTEXT's 81.** Take every figure from `formatBits`, never from prose.
5. **Register the tool late** (the registry auto-enrolls it in `about.spec`, `about-prod`, `pages-about.test`, nav, grid and sitemap). Finish the island and About first.
6. **Hyphenated EFF words** break naive `split("-")` assertions about 0.3% of the time in e2e.

## Metadata

**Analog search scope:** `app/tools/{password,config,hash}`, `components/`, `tools/`, `lib/password/wordlist.ts`, `tests/e2e`, `tests/e2e-prod`
**Files scanned:** about 30 read or grepped; all analogs confirmed tracked via `git ls-files`
**Pattern extraction date:** 2026-11-11
