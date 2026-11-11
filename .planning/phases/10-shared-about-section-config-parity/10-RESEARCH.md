# Phase 10: Shared About Section & Config Parity - Research

**Researched:** 2026-11-11
**Domain:** Next.js 16 App Router server components, native `<details>/<summary>` disclosures, FAQPage JSON-LD, global keyboard-shortcut guard, Playwright e2e rewrite, Config highlighter server rendering
**Confidence:** HIGH (almost everything here is in-repo code that was read this session, or was probed empirically against Chromium 149 / the production build)

## Summary

This is a refactor-plus-parity phase with no new dependencies. The five existing tool pages (`uuid`, `subnet`, `dns`, `mac`, `hash`) each carry a near-identical copy of a `faqJsonLd` object, a `<script type="application/ld+json">`, a 20px "Worked example" `<section>` and a 20px "FAQ" `<section>`. All of that is replaced by one server component, `ToolAbout`, that renders a muted `<h2>`, two native `<details>` (closed, no `open` attribute) and one JSON-LD script built by one shared builder from the same `faqItems` array that renders the visible FAQ. Config (`app/tools/config/page.tsx`) has none of this today and gets a `faq-data.ts`, a server-rendered highlighted worked example and the same `ToolAbout`.

Three things are non-obvious and drive the plan: (1) the global Enter guard `isInteractiveTarget` lacks `summary`, and an empirical probe confirmed Enter on a focused `<summary>` both toggles the disclosure AND reaches window-level keydown listeners, so the tool's `enter` handler would fire without the fix; (2) `TOKEN_CLASSES` lives inside a `"use client"` module (`ConfigTool.tsx`) and is not even exported, so a Server Component cannot reuse it until it is moved into a plain module; (3) a closed `<details>` element is itself *visible* to Playwright (its `<summary>` has a box), but its content is *hidden*, so existing specs that assert visibility of FAQ text or worked-example fields fail, while specs that assert on the `<details>` wrapper itself pass vacuously. The `openAbout` helper must therefore assert `[open]`, and measurements (320px overflow) must run after opening.

`highlightConfig` in `lib/config/highlight.ts` has zero imports and no browser APIs, so it is server-safe; the D-09 sample (run through the real tokenizer this session) produces all seven non-plain token kinds. The static pre-highlighted fallback is NOT needed.

**Primary recommendation:** Build `lib/seo/jsonld.ts` + `components/FaqJsonLd.tsx` + `components/ToolAbout.tsx` (server, native `<details>`, `children` slot for the worked-example body), add `summary` to `isInteractiveTarget`, extract `lib/config/token-classes.ts`, give Config a `faq-data.ts` + `ConfigExample.tsx`, migrate all six pages, remove the `?? Fingerprint` fallback (export `ICONS`, throw on unknown), then rewrite the e2e specs around a shared `openAbout` helper plus one cross-tool `about.spec.ts`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| About area (h2, two disclosures, FAQ list) | Frontend Server (SSR / static prerender) | Browser (native `<details>` toggle, zero JS) | Content must be in server HTML (INFO-03); toggling is a browser built-in, no client component needed |
| FAQPage JSON-LD | Frontend Server | — | Static build-time data; one script per page; must not depend on JS |
| Enter-on-summary guard | Browser / Client | — | `useKeyboardShortcut` is a client hook attached to `window` |
| Config worked-example highlighting | Frontend Server (build time) | — | `highlightConfig` is pure TS; render once at build, ship plain HTML spans |
| Config interactive tool | Browser / Client (`ssr:false` island) | — | Unchanged; only `TOKEN_CLASSES` moves to a shared plain module |
| Tool icon resolution | Frontend Server | — | `ToolCard` is a server component; registry string to lucide component map |
| e2e verification of raw-HTML guarantee | Test tier (Playwright, JS disabled) | Vitest `renderToStaticMarkup` | Proves SEO guarantee without a browser in CI |

## User Constraints (from CONTEXT.md)

<user_constraints>
### Locked Decisions

**About area look**
- **D-01:** The area is set off from the tool by a thin top border (separator). After it comes a small, muted (`text-muted-foreground`, 14px) "About this tool" heading, then the two disclosures. No tinted panel and no new surface color.
- **D-02:** The "About this tool" heading is a real `<h2>` (outline: h1 = tool name, h2 = About), styled small and muted rather than in the current 20px section-heading style.
- **D-03:** Summary rows look muted and secondary. Open content uses today's readable styling: normal foreground colors, 16px body, and the existing Q (14px semibold) / A (16px muted) typography.
- **D-04:** The About area starts `mt-16` below the tool (more than the current `mt-12` section spacing).

**Disclosure structure**
- **D-05:** Summary labels are plain, with a count: "Worked example" and "FAQ (N questions)", where N is derived from `faqItems.length`, never hard-coded.
- **D-06:** The FAQ is one `<details>` holding a flat Q/A list, like today's layout. Individual questions are not nested `<details>`.
- **D-07:** Hide the native marker and use lucide `ChevronRight` (already installed), rotated 90° via CSS when `[open]`. It must look the same in all browsers.
- **D-08:** Each `<summary>` gets the existing focus-visible ring style (reuse the Button component's focus-visible classes). Hover darkens the text toward the foreground color.

**Config worked example**
- **D-09:** Use a small mixed Cisco IOS snippet (~11 lines) that exercises every highlighter token kind. Only RFC 5737 addresses (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24), and no secrets, passwords, keys or community strings. Baseline, agreed with the user:
  ```
  hostname edge-rtr-01
  !
  interface GigabitEthernet0/1
   description Uplink to ISP
   ip address 192.0.2.1 255.255.255.252
  !
  ip access-list extended MGMT-IN
   remark allow SSH from docs net
   permit tcp 198.51.100.0 0.0.0.255 any eq 22
  !
  ip route 0.0.0.0 0.0.0.0 192.0.2.2
  ```
- **D-10:** Show the highlighted output only, rendered like the tool's preview pane. No separate plain-input block.
- **D-11:** Render it at build time in the server component by calling the real `highlightConfig` from `lib/config/highlight.ts`, so the example can't drift from the tool. Fallback, only if that proves not to be server-safe: a static pre-highlighted sample.
- **D-12:** Add one short sentence under the example: rich copy keeps these colors and monospace formatting when pasted into email/docs, and plain copy gives the raw text. No buttons inside the example.

**Config FAQ & page layout**
- **D-13:** The Config FAQ covers these four topics (meets the 4–6 minimum): (1) Privacy: is my config uploaded? (No; all local in the browser. Add a gentle tip to strip secrets before sharing anyway.) (2) Pasting into Outlook/Word/Google Docs: how rich copy keeps colors and monospace, and when to use plain copy or monochrome. (3) Supported syntax/vendors: Cisco IOS-style profile plus the "plain" profile, and what happens with other vendors' configs. (4) Monochrome/printing: what the monochrome option is for (print, grayscale docs, accessibility).
- **D-14:** Keep Config's intro paragraph under the h1 and the page's `max-w-6xl` width. Constrain only the About area to `max-w-3xl`.

**Already locked at milestone level (do not reopen):** native `<details>/<summary>` in a server component (no Radix Collapsible/Accordion); closed by default; one JSON-LD builder that keeps the `<` to `<` escape; Config icon = `FileTerminal`; no new runtime or dev dependencies; `openAbout` shared e2e helper; don't promise find-in-page into closed `<details>`; the release gate needs `npm run test:e2e` and `npm run test:e2e:prod` to pass locally.

### Claude's Discretion
- Exact FAQ answer wording for Config, accurate to the shipped `ConfigTool`/`lib/config` behavior. Claude may add at most 2 more items (to a 6 maximum) if a clearly useful topic appears while writing.
- How per-tool worked-example markup is shared: a children/slot in `ToolAbout` vs a data-driven `ExampleFields` helper. Existing worked-example bodies should be preserved, not redesigned.
- Whether to keep the existing `data-testid`s (`{slug}-worked-example`, `{slug}-worked-example-*`, `{slug}-faq-item`). Keep them where possible, to minimize e2e churn.
- Where `faq-data.ts` lives for Config (follow the `app/tools/<slug>/faq-data.ts` convention).
- Exact separator/border token, chevron size, and summary padding, consistent with the existing Tailwind scale.

### Deferred Ideas (OUT OF SCOPE)
None. The discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFO-01 | Worked Example and FAQ render below the tool in a muted "About this tool" area on every tool page | `ToolAbout` as last child of `<main>` after the `mt-8` tool block; Pattern 1; UI-SPEC structure |
| INFO-02 | Each is a native `<details>`, closed by default, operable by mouse and Enter/Space | Native element; probe confirmed Enter opens and Space closes; no `open` prop, no client state |
| INFO-03 | Collapsed content stays in server HTML; exactly one FAQPage JSON-LD built from the same data as the visible FAQ | `ToolAbout` renders both list and `FaqJsonLd` from one `faqItems` prop; `renderToStaticMarkup` unit test + JS-disabled Playwright test |
| INFO-04 | Enter on a focused `<summary>` toggles only that section; never fires the tool's global Enter shortcut | Add `summary` to `isInteractiveTarget` selector; hook unit test + e2e on UUID and DNS |
| INFO-05 | All six tools use one shared About component; no per-page duplicated JSON-LD builder | Migrate six pages; structural test that no `app/tools/*/page.tsx` contains `ld+json` / `dangerouslySetInnerHTML` |
| CFG-01 | Worked example on `/tools/config`: highlighted Cisco IOS snippet, RFC 5737 only, no realistic secrets | `ConfigExample` server component calling real `highlightConfig`; sample verified to hit all token kinds; unit test for addresses/secrets |
| CFG-02 | 4–6 item FAQ on `/tools/config` with matching FAQPage JSON-LD | `app/tools/config/faq-data.ts` + same `ToolAbout`; unit test on count; `config-seo.spec.ts` parity |
| CFG-03 | Config shows its own `FileTerminal` icon; every registered icon resolves explicitly | Registry `icon: "FileTerminal"`, `ICONS` entry, remove `?? Fingerprint`, registry-wide icon test. Nav/h1 display scope was decided in UI-SPEC (card + registry only) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Source: `.claude/CLAUDE.md` (read this session). Treat as locked.
- Stack is Next.js App Router + TypeScript + Tailwind, Vercel; not open for reconsideration.
- Static-first rendering; client components only where interaction requires them. The About area must remain a server component with no client JS.
- Performance target 90+ Lighthouse across all categories; minimal JS per page; no avoidable CLS.
- UX non-negotiables: zero-effort default result, keyboard-first operation, visible copy confirmation, no modal ads/popups/interstitials.
- Privacy: no tracking cookies, no accounts; sensitive URL params excluded from analytics. The Config page uses no query params.
- GSD workflow: file-changing work must start through a GSD command (this research is run under `/gsd-plan-phase`).
- Testing stack: Vitest + Testing Library for components, Playwright for true end-to-end flows. Note: CLAUDE.md's "latest observed version" table lists TypeScript 7.0.2 / ESLint 10.7.0, but `package.json` actually pins `typescript 6.0.3` and `eslint 9.39.5`; treat `package.json` as authoritative.

## Standard Stack

No new packages are installed in this phase (milestone-locked: no new runtime or dev dependencies).

### Core (all already installed) [VERIFIED: package.json]
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.11 | App Router, server components, static prerender | Project stack |
| react / react-dom | 19.2.8 | `renderToStaticMarkup` in unit tests; server component rendering | Project stack |
| lucide-react | 1.25.0 | `ChevronRight`, `FileTerminal` | Already used by `ToolCard`; both icons verified present in `node_modules/lucide-react/dist/esm/icons/{chevron-right,file-terminal}.mjs` |
| tailwindcss | 4.3.3 | `group-open:`, `list-none`, `[&::-webkit-details-marker]:hidden` | Compiled this session with `@tailwindcss/node`; `group-open:rotate-90` emits `:is(:where(.group):is([open], :popover-open, :open) *)` |
| vitest + @testing-library/react | 4.1.10 / 16.3.2 | Unit tests (baseline: 51 files, 699 tests passing) | Project stack |
| @playwright/test | 1.61.1 | e2e; Chromium installed locally | Project stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<details>` | Radix Collapsible/Accordion | LOCKED OUT: unmounts closed content (kills SEO/JSON-LD parity) and forces client JS |
| `children` slot for worked example | Data-driven `ExampleFields` helper | Helper adds a new abstraction and churn across 5 working pages; `children` preserves existing markup verbatim. Recommend `children`. |
| `Separator` (`components/ui/separator.tsx`) | Plain `border-t border-border` | `Separator` is a `"use client"` Radix wrapper (read this session, line 1), which would add a client boundary. Use the plain border. |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed or recommended in this phase. The legitimacy gate is not applicable. Packages removed due to SLOP: none. Packages flagged SUS: none.

## Architecture Patterns

### System Architecture Diagram

```
Build time (next build, static prerender)
  app/tools/<slug>/faq-data.ts  ──faqItems──┐
  app/tools/<slug>/page.tsx (server)        │
     ├─ <h1> + tool island (ssr:false loader)│   [tool renders first; About is LAST child of <main>]
     └─ <ToolAbout slug faqItems>           │
           children = worked-example markup │
           │                                │
           ├─ <section data-testid="about-tool" border-t mt-16 max-w-3xl>
           │     ├─ <FaqJsonLd items=faqItems/>  ──buildFaqJsonLd──serializeJsonLd(escape "<")──> ONE <script ld+json>
           │     ├─ <h2>About this tool</h2>
           │     ├─ <details {slug}-worked-example>  (no open attr)  summary + children
           │     └─ <details {slug}-faq>             (no open attr)  summary "FAQ (N questions)" + flat Q/A <p><p>
  /tools/config only:
     ConfigExample (server) ── highlightConfig(SAMPLE_CONFIG,"cisco") ── token spans using lib/config/token-classes.ts ──> <pre>

Browser
  static HTML (About fully present, collapsed) ──> user clicks / Enter / Space on <summary> ──> native toggle (no JS)
  window keydown ──> useKeyboardShortcut.onKeyDown
        Enter: isInteractiveTarget(target)?  button | [role=button] | [role=radio] | a[href] | summary
               yes -> tool's enter handler NOT called    no -> enter()
```

### Recommended Project Structure
```
components/
├── ToolAbout.tsx            # server; the shared About area
├── ToolAbout.test.tsx       # unit: renderToStaticMarkup + RTL
└── FaqJsonLd.tsx            # server; renders the single <script>
lib/
├── seo/jsonld.ts            # FaqItem type, buildFaqJsonLd(), serializeJsonLd()
├── seo/jsonld.test.ts
└── config/token-classes.ts  # TOKEN_CLASSES + MONOCHROME_TOKEN_CLASSES (plain TS, no "use client")
app/tools/config/
├── faq-data.ts              # faqItems + SAMPLE_CONFIG (follows other tools' convention)
├── faq-data.test.ts
├── ConfigExample.tsx        # server component
└── ConfigExample.test.tsx
app/tools/pages-about.test.ts   # structural guard (node env, reads page.tsx sources)
tests/e2e/helpers/about.ts   # openAbout()
tests/e2e/about.spec.ts      # cross-tool, parameterised over six slugs
tests/e2e/config-seo.spec.ts
```
`tests/e2e/helpers/about.ts` does not match Playwright's default `*.spec.ts`/`*.test.ts` testMatch and Vitest excludes `tests/e2e/**`, so it is never picked up as a test file. `tsconfig.json` includes `**/*.ts`, so it is typechecked.

### Pattern 1: `ToolAbout` (server component, native disclosures)
**What:** One component owns the whole About area, including the JSON-LD script, so a page cannot render the FAQ without the matching JSON-LD (structural drift prevention).
**When to use:** Every tool page (and Phase 13/14's password page).
**Example:**
```tsx
// components/ToolAbout.tsx  (no "use client")
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { FaqJsonLd } from "@/components/FaqJsonLd";
import type { FaqItem } from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";

const SUMMARY_CLASS =
  "flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg py-2 text-[16px] leading-[1.5] font-semibold text-muted-foreground transition-colors outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden";
const CHEVRON_CLASS =
  "size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none";

export function ToolAbout({
  slug, faqItems, children, className,
}: { slug: string; faqItems: readonly FaqItem[]; children: ReactNode; className?: string }) {
  return (
    <section
      data-testid="about-tool"
      aria-labelledby="about-heading"
      className={cn("mt-16 w-full max-w-3xl border-t border-border pt-8", className)}
    >
      <FaqJsonLd items={faqItems} />
      <h2 id="about-heading" className="text-[14px] leading-[1.4] font-semibold text-muted-foreground">
        About this tool
      </h2>
      <div className="mt-4">
        <details data-testid={`${slug}-worked-example`} className="group">
          <summary className={SUMMARY_CLASS}>
            <ChevronRight aria-hidden="true" className={CHEVRON_CLASS} />
            Worked example
          </summary>
          <div className="pt-2 pb-4 pl-6">{children}</div>
        </details>
        <details data-testid={`${slug}-faq`} className="group">
          <summary className={SUMMARY_CLASS}>
            <ChevronRight aria-hidden="true" className={CHEVRON_CLASS} />
            FAQ ({faqItems.length} questions)
          </summary>
          <div className="space-y-6 pt-2 pb-4 pl-6">
            {faqItems.map((item) => (
              <div key={item.question} data-testid={`${slug}-faq-item`}>
                <p className="text-[14px] leading-[1.4] font-semibold text-foreground">{item.question}</p>
                <p className="mt-1 text-[16px] leading-[1.5] font-normal text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
```
Source for classes: UI-SPEC "summary anatomy" (approved) [VERIFIED: 10-UI-SPEC.md]; the Tailwind variants were compiled this session. The `<h2 id="about-heading">` is page-unique (one About per page). Keep exactly two `<p>` children per FAQ item (existing specs read `locator("p").nth(0/1)` and `querySelector("p")`).

### Pattern 2: One JSON-LD builder
```ts
// lib/seo/jsonld.ts
export type FaqItem = { question: string; answer: string };

export function buildFaqJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Escapes "<" so a "</script>" inside data cannot break out of the script tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
```
```tsx
// components/FaqJsonLd.tsx (server)
import { buildFaqJsonLd, serializeJsonLd, type FaqItem } from "@/lib/seo/jsonld";
export function FaqJsonLd({ items }: { items: readonly FaqItem[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildFaqJsonLd(items)) }}
    />
  );
}
```
Shape and escape are byte-identical to the five existing page-local builders (read this session, e.g. `app/tools/uuid/page.tsx:31-39,50-55`: `.replace(/</g, "\\u003c")`). The official Next.js guide recommends exactly this escape [CITED: nextjs.org/docs/app/guides/json-ld]. Leave the five per-file `FaqItem` type declarations in `faq-data.ts` untouched; they are structurally identical to the new shared type, so TypeScript accepts them without churn.

### Pattern 3: `summary` in the Enter guard
```ts
// lib/hooks/useKeyboardShortcut.ts  (isInteractiveTarget, currently line ~62)
return target.closest('button, [role="button"], [role="radio"], a[href], summary') !== null;
```
Current verbatim line: `return target.closest('button, [role="button"], [role="radio"], a[href]') !== null;` [VERIFIED: lib/hooks/useKeyboardShortcut.ts:62]. `closest` also covers an event whose target is a child node inside the summary. Update the function's doc comment to mention `summary`. Do not touch Space/slash/escape/copy branches.

### Pattern 4: Config worked example (server)
```tsx
// app/tools/config/ConfigExample.tsx  (no "use client")
import { Fragment } from "react";
import { highlightConfig } from "@/lib/config/highlight";
import { TOKEN_CLASSES } from "@/lib/config/token-classes";
import { SAMPLE_CONFIG } from "./faq-data";

export function ConfigExample() {
  const lines = highlightConfig(SAMPLE_CONFIG, "cisco");
  return (
    <div>
      <p className="text-[14px] leading-[1.4] font-semibold text-foreground">
        Cisco IOS snippet, highlighted (documentation addresses only, RFC 5737)
      </p>
      <div
        data-testid="config-worked-example-preview"
        role="region" aria-label="Highlighted example configuration" tabIndex={0}
        className="mt-2 max-w-full overflow-x-auto rounded-lg border border-border bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <pre className="min-w-full w-max p-4 font-mono text-[14px] leading-[1.5]">
          {lines.map((line, i) => (
            <Fragment key={i}>
              {line.map((t, j) => (
                <span key={`${i}-${j}`} className={TOKEN_CLASSES[t.kind]} data-token={t.kind}>{t.text}</span>
              ))}
              {i < lines.length - 1 ? "\n" : null}
            </Fragment>
          ))}
        </pre>
      </div>
      <p className="mt-4 text-[16px] leading-[1.5] font-normal text-muted-foreground">
        Copy for email keeps these colors and the monospace formatting when you paste into email or documents. Copy plain text gives the raw configuration.
      </p>
    </div>
  );
}
```
Mirrors `ConfigTool.tsx:204-223` (the `<pre>`/`Fragment`/`data-token` structure) [VERIFIED: app/tools/config/ConfigTool.tsx:195-225]. Do NOT use `buildConfigHtml` + `dangerouslySetInnerHTML` here; React text children are escaped automatically.

`lib/config/token-classes.ts` must be a plain module. Move the two maps verbatim from `ConfigTool.tsx:16-36` and import them back into `ConfigTool.tsx`. Verbatim current values [VERIFIED: app/tools/config/ConfigTool.tsx:16-36]:
```
plain: "text-foreground"
comment: "text-slate-500 italic dark:text-slate-400"
command: "font-semibold text-blue-700 dark:text-blue-300"
keyword: "font-semibold text-violet-700 dark:text-violet-300"
interface: "text-amber-700 dark:text-amber-300"
address: "text-emerald-700 dark:text-emerald-300"
number: "text-rose-700 dark:text-rose-300"
string: "text-fuchsia-700 dark:text-fuchsia-300"
```
(Monochrome map: same keys; `comment: "text-foreground italic"`, `command`/`keyword: "font-semibold text-foreground"`, all others `"text-foreground"`.) Tailwind v4 auto-detects classes in `lib/` (no `@source` overrides exist in `app/globals.css`, which only has `@import`/`@theme`/`@custom-variant`), so no config change is needed.

### Pattern 5: Icon resolution without silent fallback
Export `ICONS` (or a `resolveToolIcon`) from `components/ToolCard.tsx`, add `FileTerminal`, delete `?? Fingerprint` and throw for an unknown name:
```tsx
export const ICONS: Record<string, LucideIcon> = { Fingerprint, Network, Globe, Cpu, Hash, FileTerminal };
export function resolveToolIcon(name: string): LucideIcon {
  const icon = ICONS[name];
  if (!icon) throw new Error(`Unknown tool icon "${name}": add it to ICONS in components/ToolCard.tsx`);
  return icon;
}
```
`ToolCard` has no `"use client"` (read this session), so a throw happens at build/prerender time and fails the build loudly, which is the intended no-silent-fallback behavior. Only `ToolCard` consumes `tool.icon` [VERIFIED: grep of app/components/lib/tools, 2026-11-11: only `components/ToolCard.tsx:43` and `tools/registry.ts`].

### Anti-Patterns to Avoid
- **Controlled `open={false}` or `useState` on the `<details>`:** force-closes a section the user opened on re-render. No client component in `ToolAbout`.
- **Nested `<details>` per FAQ question (D-06):** locked out; also breaks the two-`<p>` spec contract.
- **`overflow-hidden` on `<details>` or its parent:** clips the 3px focus ring (UI-SPEC backstop E3-overflow).
- **Rendering a `<Button>` inside `<summary>`:** interactive-in-interactive.
- **Asserting visibility on the `<details>` wrapper to prove "open":** passes even when closed (see Pitfall 3). Assert `[open]` or visibility of inner content.
- **A second JSON-LD block (e.g. `WebApplication`) on any tool page:** existing specs count exactly one `application/ld+json` script.
- **Putting the highlighted example in a client component or importing `ConfigTool.tsx` from a server file:** non-component exports of a `"use client"` module become client references and are unusable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible region | Client accordion / own toggle state | Native `<details>/<summary>` | Content stays in server HTML; keyboard (Enter/Space) and a11y semantics come free; zero JS |
| FAQ JSON-LD per page | Six local `faqJsonLd` objects | `buildFaqJsonLd` + `FaqJsonLd` from `ToolAbout` | The five existing copies are identical; one source makes drift structurally impossible |
| Config highlighting for the example | Hand-written coloured spans | `highlightConfig(SAMPLE_CONFIG, "cisco")` + shared `TOKEN_CLASSES` | Example cannot drift from the tool; verified server-safe |
| Disclosure chevron | Custom SVG / CSS triangle | lucide `ChevronRight` + `group-open:rotate-90` | Already installed; identical in all browsers once the native marker is hidden |
| Expanding disclosures in tests | Per-spec click snippets | One `openAbout(page, slug, which)` helper | Locked decision; single place to fix if the DOM contract changes |

**Key insight:** every piece of this phase already exists in five slightly different copies. The work is consolidation plus a guard, not invention; the risk lives in the specs and in the three non-obvious behaviors listed in the Summary.

## Runtime State Inventory

Not a rename/migration phase. Omitted. (One adjacent note: no stored data, service config, OS registrations or env vars reference the changed strings; the only build-artifact concern is that `next dev` and `next build/start` share `.next`, so `test:e2e` and `test:e2e:prod` must run sequentially, never concurrently, per the comment in `playwright.prod.config.ts`.)

## Common Pitfalls

### Pitfall 1: Enter on a focused `<summary>` also fires the tool's global Enter shortcut
**What goes wrong:** UUID regenerates, DNS re-runs its lookup (and Subnet/MAC/Hash run their `enter` handlers) while the user toggles a disclosure.
**Why it happens:** `isInteractiveTarget` has no `summary`. Probe result this session (Chromium 149.0.7827.55): with a focused `<summary>`, pressing Enter set `open`, and a window-level `keydown` listener without the guard saw the Enter (`m=1`), while the same listener with `target.closest('summary')` excluded saw `0`. Space then closed the disclosure natively.
**How to avoid:** Pattern 3 plus a unit test (below). Five tools consume the hook: `UuidTool`, `DnsTool`, `SubnetTool`, `MacTool`, `HashTool` [VERIFIED: grep]. Config does not use it.
**Warning signs:** the UUID hero value changes after Enter on a summary.

### Pitfall 2: `TOKEN_CLASSES` unusable from a Server Component
**What goes wrong:** Build error or `undefined` class map when `ConfigExample` imports from `ConfigTool.tsx`.
**Why it happens:** `ConfigTool.tsx` starts with `"use client"` (line 1) and `TOKEN_CLASSES` is a non-exported `const` (line 16).
**How to avoid:** Extract to `lib/config/token-classes.ts`; import in both places. A unit test can assert the example's rendered classes equal the map.

### Pitfall 3: Closed `<details>` semantics in Playwright
**What goes wrong:** Specs fail or pass for the wrong reason.
**Why it happens:** Empirical probe (Chromium 149): closed `<details>` element `isVisible() === true`; its inner `<p>` `isVisible() === false`; `textContent()` still returns the hidden text; `getByText(...)` still counts it (count 1); after Enter on the summary the `open` attribute reads `""` and the `<p>` is visible; Space then removes `open` (`null`).
**How to avoid:** Use `toBeVisible()` on inner content only after `openAbout`; use `textContent()` / `toHaveText()` / `toBeAttached()` for open-state-independent content/JSON-LD equality; assert `toHaveAttribute("open", "")` inside the helper. Specs that currently only assert the wrapper's visibility (`dns-seo`/`subnet-seo` wrapper `toBeVisible`, `hash-seo` 320px overflow test) would pass vacuously, so open before measuring.

### Pitfall 4: Existing SEO specs break (exact lines)
Read this session:
- `uuid-seo.spec.ts:43-51` `getByText(question).toBeVisible()` x3 and `:72-82` `uuid-worked-example-v4/v7` `toBeVisible()` — need FAQ and worked example open. (No outer `uuid-worked-example` testid exists today; `ToolAbout` creates `uuid-worked-example` on the `<details>`.)
- `subnet-seo.spec.ts:38-45` question `toBeVisible()`; `:66-79` `workedExample.getByText(...)` `toBeVisible()`.
- `dns-seo.spec.ts:40,51-53` question visibility; `:84-91` worked-example field visibility.
- `hash-seo.spec.ts` — FAQ equality test uses `toHaveCount`, `textContent`, `locator("p").nth(i)` and works while closed; `:84-95` uses `toHaveText`/`toContainText` (works closed); `:122-127` 320px overflow measures `scrollWidth - clientWidth` of the wrapper (open first to measure real content); `:97-116` forbidden-phrase test reads `textContent` (works closed, but now also includes the summary label "Worked example", which contains no forbidden phrase).
- The equality tests (`parsed.mainEntity.length === visibleCount`, per-item name/text vs `<p>` textContent) are open-state independent and must keep passing unchanged. Keep `{slug}-faq-item` and the two-`<p>` structure.
- `dns-seo.spec.ts:44-49` asserts the answer contains "never stored or sent anywhere else"; do not touch DNS FAQ copy.

### Pitfall 5: Hash D-27 forbidden phrases / privacy wording
**What goes wrong:** A privacy claim ships without human approval.
**Why it happens:** `hash/faq-data.test.ts` pins hash copy against `["tracking","never leaves","never stored","never sent","private","100%"]`; STATE.md notes legal/privacy FAQ wording is a human gate for the password page. The Config FAQ draft in UI-SPEC says "never uploaded, stored or sent to a server ... gone when you close or reload the page", which is stronger than the shipped in-tool copy "Your configuration stays in this browser tab and is never uploaded or saved." [VERIFIED: ConfigTool.tsx:290-293].
**How to avoid:** Keep the Config privacy answer to claims the code supports: processing is in the browser; the shipped footer says "never uploaded or saved". Drop "stored" and "gone when you reload" unless the user approves (see Assumptions A1). Do NOT apply the Hash forbidden-phrase list to Config; it is Hash-specific.

### Pitfall 6: Replacing the documented silent fallback test
`components/ToolCard.test.tsx:133-142` is a test titled "falls back to the Fingerprint icon for an unknown icon string (documents the silent fallback)". It asserts the exact behavior CFG-03 removes and WILL fail once the fallback is removed. Replace it with a "throws for an unknown icon" test (spy `console.error` to silence React's error log). Also `tools/registry.ts:98` currently has `icon: "Network"` for Config (same as Subnet) and must change to `"FileTerminal"`; no existing test pins Config's icon.

### Pitfall 7: CLS now involves the About area
Baseline CLS measured this session against `next start` (production build, `tools/<slug>` at 800px viewport height, after 1.5s): uuid 0.183 (375w) / 0.043 (1280w); subnet 0.167 / 0.029; dns 0.100 / 0.042; mac 0.067 / 0.020; hash 0 / 0; config 0 / 0. Skeleton pins: uuid 76px, subnet/dns/mac 420px, config 520px, hash 2240/1612 (the hash pin is already gate-tested). Today the shifting content below the tool is the large FAQ/example; after this phase it is the short collapsed About area plus footer. This is not a Phase 10 requirement (Lighthouse gate is Phase 14), so: re-measure after the change, do not regress, and note any skeleton-height mismatch for Phase 11/14. Config's real island height (623px at 1280w, 1162px at 375w) exceeds its 520px skeleton, so at 1280x800 the About area may sit in the viewport and shift when the island paints.

### Pitfall 8: `data-testid` collisions and strict-mode locators
`getByTestId` is exact-match, so `{slug}-faq` does not collide with `{slug}-faq-item`. Config's example uses `config-worked-example-preview`, distinct from the tool's `config-preview`; existing `config.spec.ts` selectors are all `preview.locator('[data-token=...]')` scoped (read this session, lines 21-24), so the example's `data-token` spans do not create duplicate matches. No existing spec asserts on a heading name that the new `<h2>` could match (`hash-keyboard.spec.ts:13` uses name "Digests"; `home.spec.ts:97` uses level 1).

### Pitfall 9: Safari marker/flex on `<summary>`
`list-none` plus `[&::-webkit-details-marker]:hidden` is the standard double hide; `display:flex` on `<summary>` is widely supported in current browsers but was not tested in Safari this session [ASSUMED]. Keep both hide rules and `aria-hidden` on the chevron; add a manual Safari/VoiceOver check to the UAT list.

## Code Examples

### `openAbout` helper
```ts
// tests/e2e/helpers/about.ts
import { expect, type Page } from "@playwright/test";

export type AboutSection = "worked-example" | "faq";

export async function openAbout(
  page: Page,
  slug: string,
  sections: AboutSection[] = ["worked-example", "faq"],
) {
  for (const section of sections) {
    const details = page.getByTestId(`${slug}-${section}`);
    await expect(details).toBeAttached();
    if ((await details.getAttribute("open")) === null) {
      await details.locator("summary").click();
    }
    await expect(details).toHaveAttribute("open", "");
  }
}
```
`toHaveAttribute("open", "")` matches the probed behavior (`open` reads `""` when open). Clicking works before hydration because the toggle is native.

### `useKeyboardShortcut` unit test (add next to the existing button test at `useKeyboardShortcut.test.ts:142-154`)
```ts
it("does NOT fire the enter handler while focus is on a <summary> (INFO-04), nor on an element inside one", () => {
  const enter = vi.fn();
  renderHook(() => useKeyboardShortcut({ enter }));

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const icon = document.createElement("span");
  summary.appendChild(icon);
  details.appendChild(summary);
  document.body.appendChild(details);

  dispatchKeydown({ key: "Enter" }, summary);
  dispatchKeydown({ key: "Enter" }, icon);
  expect(enter).not.toHaveBeenCalled();

  // control: a plain non-interactive target still fires the shortcut
  const div = document.createElement("div");
  document.body.appendChild(div);
  dispatchKeydown({ key: "Enter" }, div);
  expect(enter).toHaveBeenCalledTimes(1);

  details.remove();
  div.remove();
});
```
`dispatchKeydown(init, target)` is the existing helper in that file (read this session, lines 5-17).

### Raw-HTML guarantee without Playwright (INFO-02/03 in CI)
```tsx
// components/ToolAbout.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
const html = renderToStaticMarkup(
  <ToolAbout slug="demo" faqItems={items}><p>example body</p></ToolAbout>,
);
expect(html).not.toMatch(/<details[^>]*\sopen/);       // closed on load
expect(html).toContain("example body");                  // collapsed content in HTML
expect(html).toContain(`FAQ (${items.length} questions)`);
expect((html.match(/application\/ld\+json/g) ?? []).length).toBe(1);
expect(html).not.toMatch(/<script[^>]*>[^<]*<[^/]/);     // "<" escaped inside the script body
```
Add a fixture item whose answer contains `</script><b>x` and assert the serialized body has `<` and `JSON.parse` of the script text round-trips to the original string.

### JS-disabled e2e (raw server HTML, INFO-02/03)
```ts
test.describe("About area without JS", () => {
  test.use({ javaScriptEnabled: false });
  for (const slug of SLUGS) {
    test(`${slug}: content + one JSON-LD in server HTML, closed`, async ({ page }) => {
      await page.goto(`/tools/${slug}`);
      await expect(page.locator("details[open]")).toHaveCount(0);
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
      const first = await page.getByTestId(`${slug}-faq-item`).first().locator("p").first().textContent();
      expect(first?.trim().length).toBeGreaterThan(0);          // text present though collapsed
      await page.getByTestId(`${slug}-faq`).locator("summary").click();  // native toggle needs no JS
      await expect(page.getByTestId(`${slug}-faq`)).toHaveAttribute("open", "");
    });
  }
});
```
Preferred over `request.get()` + string matching because React HTML-escapes characters like `'` in text (`&#x27;`), making raw-string comparisons brittle. If a literal raw-HTML assertion is wanted, limit it to counting `application/ld+json` and the absence of ` open`.

### Enter-on-summary e2e (SC-3)
- UUID: read `uuid-hero-value`; control: click the `h1`, press Enter, `expect(...).toPass()` that the value changed (proves the global shortcut is live); then `getByTestId("uuid-faq").locator("summary").focus()`, record the value, press Enter, assert `uuid-faq` has `open` and the hero value is unchanged.
- DNS: the spec pattern for mocking is in `dns-lookup.spec.ts:30-52` (`page.route("**/cloudflare-dns.com/**", ...)`). Count fulfilled requests in the route handler; wait for the initial lookup; focus the FAQ summary; press Enter; wait a short fixed interval; assert the counter is unchanged and `dns-faq` is open. Add a control (Enter on a non-interactive element triggers one lookup) only if the DNS tool does not de-duplicate identical lookups; confirm during execution, since `dns-lookup.spec.ts:290-299` shows Enter triggers an immediate lookup.

### Config FAQ data module shape
```ts
// app/tools/config/faq-data.ts
export type FaqItem = { question: string; answer: string };
export const SAMPLE_CONFIG = `hostname edge-rtr-01
!
interface GigabitEthernet0/1
 description Uplink to ISP
 ip address 192.0.2.1 255.255.255.252
!
ip access-list extended MGMT-IN
 remark allow SSH from docs net
 permit tcp 198.51.100.0 0.0.0.255 any eq 22
!
ip route 0.0.0.0 0.0.0.0 192.0.2.2`;
export const faqItems: FaqItem[] = [ /* 4 items, plain-string answers (they are also JSON-LD text) */ ];
```
Use the four UI-SPEC FAQ questions, with answers corrected to shipped behavior (verified this session):
- Colored kinds are command, keyword, interface, address (IPv4 and IPv6), number, string (description/remark text) and comment (`!` or `#` lines) [VERIFIED: lib/config/highlight.ts:3-11,143-166]. The UI-SPEC answer 3 omits keywords and IPv6; add them.
- Monochrome keeps bold commands/keywords and italic comments and drops color in both the preview and the rich copy [VERIFIED: ConfigTool.tsx:27-36, highlight.ts:102-106,275]. Plain copy is unaffected.
- Rich-copy fallback: UI label "Copied as plain text" and screen-reader text "Rich clipboard unavailable. Copied as plain text." [VERIFIED: ConfigTool.tsx:244-255].
- Button/option names to quote: `Copy for email`, `Copy plain text`, `Monochrome`, `Cisco IOS / IOS-XE / IOS-XR`, `Plain text` [VERIFIED: ConfigTool.tsx:129-130,150,248,277]. Note the label above the toggle is "Colour mode" (British spelling).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Five per-page JSON-LD builders and 20px open sections | One `ToolAbout` + one builder, collapsed native `<details>` | This phase | Single source for six (soon seven) pages |
| `?? Fingerprint` silent icon fallback | Explicit `ICONS` + throw | This phase | A new tool without an icon fails the build/test |
| Chromium treats closed `<details>` content as hidden (Playwright `isVisible()` false) | Same, unchanged | Observed Chromium 149 | `toBeVisible()` on inner content requires opening first |

**Deprecated/outdated:** nothing in this phase. FAQ rich results in Google SERPs are limited to a small set of sites; the JSON-LD is kept for consistency/machine readability, not for SERP features (`.planning/research/PITFALLS.md` Pitfall 10; MEDIUM). Do not write copy for rich results.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Config privacy FAQ answer may safely say processing happens in the browser and the config "is never uploaded or saved" (copied from the shipped footer), but the UI-SPEC's stronger wording ("stored or sent to a server", "gone when you close or reload") has not been approved and the reload claim was not verified in a browser | Pitfall 5, Config FAQ | Privacy/legal copy shipped without approval; needs user confirmation before it is locked |
| A2 | Outlook, Word and Google Docs preserve the colors and monospace font from the rich-copy HTML (inline styles with Consolas/Monaco/Courier New, `&nbsp;` whitespace) | Config FAQ answer 2 | FAQ over-promises on third-party apps; soften to "should keep" or have the user confirm |
| A3 | `display:flex` on `<summary>` plus the two marker-hiding rules renders correctly in Safari | Pitfall 9 | Double chevron or missing indicator in Safari; manual check needed |
| A4 | Find-in-page behavior into closed `<details>` varies by browser; copy must not promise it (milestone-locked) | Anti-patterns | Low; nothing in copy should mention it |
| A5 | After the change, CLS on the six pages will not regress versus the baseline numbers in Pitfall 7 | Pitfall 7 | Hidden Lighthouse regression surfacing in Phase 14; re-measure to confirm |

## Open Questions

1. **CFG-03 / ROADMAP SC-4 wording vs. UI-SPEC decision**
   - What we know: REQUIREMENTS.md CFG-03 and ROADMAP SC-4 say the icon appears "in nav, landing card and page". UI-SPEC records a user decision (2026-11-11): only the landing card (registry-driven) shows icons; `SiteHeader`, `MobileNav` and tool `<h1>`s stay text-only for all tools, to protect the seven-link nav fit at 640px for Phase 14. Verified: only `ToolCard` renders `tool.icon`.
   - What's unclear: the requirement text still reads as three surfaces.
   - Recommendation: include a small docs task in the plan that amends CFG-03 and SC-4 to "registry-driven landing card plus explicit `ICONS` entry; nav/h1 icons out of scope", so verification does not fail against stale wording.

2. **Should Config ship 4 FAQ items or up to 6?**
   - What we know: D-13 gives four topics; Claude may add up to two.
   - Recommendation: ship exactly 4 (meets 4–6, smallest unverified-claim surface). Tests should assert `4 <= n <= 6`, not `=== 4`.

3. **RFC 5737 test and the default route**
   - What we know: the D-09 sample contains `0.0.0.0` (default route), netmask `255.255.255.252` and wildcard `0.0.0.255`, which are not RFC 5737 addresses; UI-SPEC accepts `0.0.0.0` explicitly.
   - Recommendation: the unit test extracts every IPv4 literal from `SAMPLE_CONFIG`, requires each to be inside 192.0.2.0/24, 198.51.100.0/24 or 203.0.113.0/24, EXCEPT an explicit allow-list for masks/wildcards/unspecified (`0.0.0.0`, anything starting `255.`, `0.0.0.255`). Document the allow-list in the test so the intent is visible.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build, vitest, playwright | yes | v22.23.4 | — |
| npm / `node_modules` | all scripts | yes | installed (37 bins) | — |
| Playwright Chromium | `test:e2e`, `test:e2e:prod`, probes | yes | Chromium 149.0.7827.55 launched successfully; `~/Library/Caches/ms-playwright` has chromium-1228/1248 | — |
| Ports 3000 / 3101 | dev server for e2e / prod e2e | yes (free, `lsof` empty before probing) | — | — |
| `next build` baseline | `test:e2e:prod`, release gate | yes | built OK, 14 static pages, all six `/tools/*` prerendered (`○`) | — |

Baseline gate status measured this session: `npx vitest run` = 51 files / 699 tests passed (3.9s); `npm run build` succeeds. Typecheck, lint and the two e2e suites were not run at baseline (e2e needs the dev/prod servers; run them sequentially, never concurrently, because both use `.next`).

**Missing dependencies:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (jsdom default; `// @vitest-environment node` for fs tests) + Testing Library 16.3.2; Playwright 1.61.1 |
| Config file | `vitest.config.ts` (includes `**/*.test.{ts,tsx}`, excludes `tests/e2e/**`); `playwright.config.ts` (dev server :3000, `testDir ./tests/e2e`); `playwright.prod.config.ts` (build+start :3101, `testDir ./tests/e2e-prod`) |
| Quick run command | `npx vitest run <file>` |
| Full suite command | `npm run typecheck && npm run lint && npm run test && npm run build && npm run test:e2e && npm run test:e2e:prod` (e2e runs sequential) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFO-01 | About area is the last child of `<main>`, after the tool; muted h2 present | e2e (all six slugs) | `npx playwright test tests/e2e/about.spec.ts -g "tool first"` | no, Wave 0 |
| INFO-01 | `ToolAbout` renders h2 "About this tool" + two summaries | unit | `npx vitest run components/ToolAbout.test.tsx` | no, Wave 0 |
| INFO-02 | Both `<details>` closed in server markup; toggle by click, Enter, Space | unit + e2e | `npx vitest run components/ToolAbout.test.tsx`; `npx playwright test tests/e2e/about.spec.ts -g "toggle"` | no, Wave 0 |
| INFO-03 | Full collapsed text and exactly one FAQPage script in server HTML; JSON-LD matches visible FAQ item for item | unit (`renderToStaticMarkup`) + e2e JS-disabled | `npx vitest run components/ToolAbout.test.tsx lib/seo/jsonld.test.ts`; `npx playwright test tests/e2e/about.spec.ts -g "without JS"` | no, Wave 0 |
| INFO-03 | `<` escape survives (`</script>` in data cannot break out) | unit | `npx vitest run lib/seo/jsonld.test.ts` | no, Wave 0 |
| INFO-04 | Enter on `<summary>` (and a child of it) does not call `enter`; plain target still does | unit | `npx vitest run lib/hooks/useKeyboardShortcut.test.ts` | file yes; case to add |
| INFO-04 | UUID value unchanged and DNS makes no new lookup after Enter on a summary | e2e | `npx playwright test tests/e2e/about.spec.ts -g "Enter on summary"` | no, Wave 0 |
| INFO-05 | No `app/tools/*/page.tsx` contains `application/ld+json` or `dangerouslySetInnerHTML`; each renders `<ToolAbout` (iterates `tools` registry) | unit (node env, reads sources) | `npx vitest run app/tools/pages-about.test.ts` | no, Wave 0 |
| INFO-05 | Every tool's `faqItems.length >= 4`, non-empty, unique questions (Config 4–6) | unit | `npx vitest run app/tools/config/faq-data.test.ts app/tools/pages-about.test.ts` | no, Wave 0 |
| CFG-01 | Example tokenizes to every non-plain kind; only RFC 5737 addresses (+ allow-listed masks/unspecified); no secret-like words | unit | `npx vitest run app/tools/config/faq-data.test.ts` | no, Wave 0 |
| CFG-01 | Server render of `ConfigExample`: pre text equals `SAMPLE_CONFIG`, all `data-token` kinds present, region is focusable | unit | `npx vitest run app/tools/config/ConfigExample.test.tsx` | no, Wave 0 |
| CFG-01/02 | `/tools/config` shows example + 4–6 FAQ items, JSON-LD parity, metadata, closed by default | e2e | `npx playwright test tests/e2e/config-seo.spec.ts` | no, Wave 0 |
| CFG-02 | FAQ count 4–6, plain-string answers, question/answer non-empty | unit | `npx vitest run app/tools/config/faq-data.test.ts` | no, Wave 0 |
| CFG-03 | Every registry `tool.icon` has an explicit `ICONS` entry; unknown icon throws; Config icon is `FileTerminal` and distinct across the registry; Config card renders `svg.lucide-file-terminal` | unit | `npx vitest run components/ToolCard.test.tsx tools/registry.test.ts` | files yes; cases to add; the fallback test at `ToolCard.test.tsx:133-142` must be replaced |
| SC-5 | Four existing SEO specs open disclosures via `openAbout` before visibility asserts | e2e | `npx playwright test tests/e2e/uuid-seo.spec.ts tests/e2e/subnet-seo.spec.ts tests/e2e/dns-seo.spec.ts tests/e2e/hash-seo.spec.ts` | files yes; edits needed |
| SC-5 | Typecheck, lint, unit, build, both e2e suites green | gate | `npm run typecheck && npm run lint && npm run test && npm run build && npm run test:e2e && npm run test:e2e:prod` | yes |

### Sampling Rate
- **Per task commit:** the targeted `npx vitest run <file>` for the files touched (seconds), plus `npm run typecheck` after any component/page edit.
- **Per wave merge:** `npm run test` (51+ files) and `npm run lint`; after the page migration wave also `npm run build` (confirms all six pages prerender statically and the icon throw does not fire).
- **Phase gate:** full suite above green, including `npm run test:e2e` then `npm run test:e2e:prod` sequentially, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `lib/seo/jsonld.test.ts` — builder shape, order, `<` escape, round-trip (INFO-03)
- [ ] `components/ToolAbout.test.tsx` — closed on load, content in markup, count label from `faqItems.length`, one script, two `<p>` per item, testids (INFO-01/02/03)
- [ ] `app/tools/pages-about.test.ts` — structural no-local-JSON-LD + uses `ToolAbout`, driven by the `tools` registry (INFO-05)
- [ ] `app/tools/config/faq-data.test.ts` and `ConfigExample.test.tsx` — CFG-01/02
- [ ] `tests/e2e/helpers/about.ts`, `tests/e2e/about.spec.ts` (covers MAC, which has no SEO spec today), `tests/e2e/config-seo.spec.ts`
- [ ] New cases in `lib/hooks/useKeyboardShortcut.test.ts`, `components/ToolCard.test.tsx`, `tools/registry.test.ts`
- Framework install: none.

## Security Domain

`security_enforcement` is enabled (absent/true in `.planning/config.json`, ASVS level 1). The phase adds no inputs, auth, storage or network calls.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation / Output Encoding | yes (output) | JSON-LD built from static author-controlled data with `serializeJsonLd` escaping `<`; config example rendered via React text children, never `dangerouslySetInnerHTML` |
| V6 Cryptography | no | — |
| V14 Configuration | yes | No new dependencies; no new third-party requests; no query params or analytics events added |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Script breakout via `</script>` inside JSON-LD text | Tampering | `JSON.stringify(...).replace(/</g, "\\u003c")` in one shared serializer, unit-tested with a hostile fixture [CITED: nextjs.org/docs/app/guides/json-ld] |
| Realistic secrets or non-documentation addresses leaking into the public Config sample | Information disclosure | Unit test: only RFC 5737 (+ allow-listed masks/unspecified); deny-list of `password`, `secret`, `community`, `snmp-server`, `username`, `key`, `crypto` in `SAMPLE_CONFIG` |
| Over-promising privacy claims in FAQ copy | Repudiation / legal | Keep wording to what the code does; see Assumptions A1 (human confirmation) |
| Client-reference misuse (server file importing client module values) | Tampering (build integrity) | Move `TOKEN_CLASSES` to a plain module (Pitfall 2) |

## Sources

### Primary (HIGH confidence)
- In-repo files read this session: `.claude/CLAUDE.md`; `10-CONTEXT.md`; `10-UI-SPEC.md`; `.planning/REQUIREMENTS.md` (INFO/CFG lines); `.planning/ROADMAP.md` Phase 10; `.planning/research/PITFALLS.md` and `SUMMARY.md` (excerpts); `app/tools/{uuid,subnet,dns,mac,hash,config}/page.tsx`; `app/tools/{uuid,subnet,dns,mac,hash}/faq-data.ts`; `app/tools/hash/faq-data.test.ts`; `app/tools/config/{ConfigTool,ConfigToolLoader}.tsx`; `lib/config/{highlight,clipboard}.ts`; `lib/hooks/useKeyboardShortcut.ts` and `.test.ts`; `components/ToolCard.tsx` and `.test.tsx`; `tools/registry.ts` and `.test.ts`; `tests/e2e/{uuid,subnet,dns,hash}-seo.spec.ts`, `config.spec.ts`, `hash-layout.spec.ts`, `navigation.spec.ts`; `playwright.config.ts`, `playwright.prod.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `package.json`, `.github/workflows/ci.yml`.
- Empirical probes this session: highlight tokenization of the D-09 sample via Node (`address,command,comment,interface,keyword,number,plain,string`); Tailwind 4.3.3 compile of the disclosure classes; Playwright/Chromium 149 behavior of closed/open `<details>` and Enter/Space on `<summary>`; production build and baseline CLS measurement; `npx vitest run` baseline.
- `nextjs.org/docs/app/guides/json-ld` (fetched this session) — `<script type="application/ld+json">` in `layout`/`page`, `replace(/</g, '\\u003c')` sanitization advice.

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` claims about Google FAQ rich results and hidden-content indexing (milestone research, not re-verified here).

### Tertiary (LOW confidence)
- Safari rendering of flex `<summary>` and find-in-page behavior (Assumptions A3, A4).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; versions read from `package.json` and `node_modules`.
- Architecture: HIGH — mirrors existing page structure and UI-SPEC; server-safety of `highlightConfig` confirmed by reading the file (no imports) and running it.
- Pitfalls: HIGH for hook/spec/ICONS/client-boundary issues (all reproduced or read); MEDIUM for Safari and CLS-after-change.

**Research date:** 2026-11-11
**Valid until:** 2026-12-11 (stable; the codebase is the dependency)
