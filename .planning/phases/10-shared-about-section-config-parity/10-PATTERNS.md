# Phase 10: Shared About Section & Config Parity - Pattern Map

**Mapped:** 2026-11-11
**Files analyzed:** 22 new/modified
**Analogs found:** 22 / 22 (all tracked in git; verified for uuid, config, ToolCard, tests/e2e)

Note: 10-RESEARCH.md already contains near-complete code for the new files (ToolAbout, FaqJsonLd, jsonld.ts, ConfigExample, openAbout, hook unit test). This map points to the real analog for each and the exact lines to copy or change; use the RESEARCH.md "Pattern 1-5" and "Code Examples" bodies as the target implementation.

**Plans are authoritative where they differ from this map.** Two known differences: (1) `FaqJsonLd` is exported from `components/ToolAbout.tsx` (10-01), not a separate `components/FaqJsonLd.tsx`; (2) the Config example pane wrapper uses `overflow-x-auto` (10-03 Task 1), not `overflow-auto`, so the pane scrolls only horizontally. Copy rules for Config are D-15 (privacy) and D-17 (rich copy "should keep") in 10-CONTEXT.md.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `components/ToolAbout.tsx` (new) | component (server) | request-response (static render) | `app/tools/uuid/page.tsx` lines 64-113 (markup being extracted) | exact (extraction) |
| `components/FaqJsonLd.tsx` (new) | component (server) | transform | `app/tools/uuid/page.tsx` lines 31-55 | exact |
| `lib/seo/jsonld.ts` (new) | utility | transform | `app/tools/uuid/page.tsx` lines 31-39, 53 | exact |
| `lib/seo/jsonld.test.ts` (new) | test | transform | `app/tools/hash/faq-data.test.ts` | role-match |
| `components/ToolAbout.test.tsx` (new) | test | render | `components/ToolCard.test.tsx` | role-match |
| `lib/config/token-classes.ts` (new) | utility/config | transform | `app/tools/config/ConfigTool.tsx` lines 16-36 (move verbatim) | exact |
| `app/tools/config/ConfigTool.tsx` (mod) | component (client) | event-driven | self: replace lines 16-36 with import | exact |
| `app/tools/config/ConfigExample.tsx` (new) | component (server) | transform | `ConfigTool.tsx` lines 195-225 | exact |
| `app/tools/config/faq-data.ts` (new) | model/data | static | `app/tools/uuid/faq-data.ts` | exact |
| `app/tools/config/faq-data.test.ts`, `ConfigExample.test.tsx` (new) | test | transform | `app/tools/hash/faq-data.test.ts` | exact |
| `app/tools/{uuid,subnet,dns,mac,hash}/page.tsx` (mod) | route (server shell) | request-response | `app/tools/uuid/page.tsx` | exact |
| `app/tools/config/page.tsx` (mod) | route (server shell) | request-response | `app/tools/uuid/page.tsx` | role-match |
| `app/tools/pages-about.test.ts` (new) | test (node env, fs) | batch | `app/tools/hash/faq-data.test.ts` (`// @vitest-environment node`) | role-match |
| `lib/hooks/useKeyboardShortcut.ts` (mod) | hook | event-driven | self line 62 | exact |
| `lib/hooks/useKeyboardShortcut.test.ts` (mod) | test | event-driven | self lines 142-154 | exact |
| `components/ToolCard.tsx` (mod) | component | request-response | self lines 20-43 | exact |
| `components/ToolCard.test.tsx` (mod) | test | render | self lines 125-142 | exact |
| `tools/registry.ts` (mod, line ~98) | config | static | self | exact |
| `tools/registry.test.ts` (mod) | test | static | self | exact |
| `tests/e2e/helpers/about.ts` (new) | test helper | request-response | RESEARCH.md `openAbout` | no repo analog |
| `tests/e2e/{uuid,subnet,dns,hash}-seo.spec.ts` (mod) | test e2e | request-response | `tests/e2e/uuid-seo.spec.ts` | exact |
| `tests/e2e/config-seo.spec.ts`, `about.spec.ts` (new) | test e2e | request-response | `tests/e2e/uuid-seo.spec.ts` | exact |

## Pattern Assignments

### `lib/seo/jsonld.ts` + `components/FaqJsonLd.tsx`
**Analog:** `app/tools/uuid/page.tsx` (identical copies exist in subnet/dns/mac/hash pages).

Builder to lift (lines 31-39) and serializer (line 53):
```ts
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};
// script: dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
```
Keep the `<` -> `<` escape byte-identical. Carry over the doc comment (T-02-04, static author-controlled data). The per-tool `FaqItem` type in each `faq-data.ts` (uuid lines 14-17) is structurally identical to the new shared type; leave untouched.

### `components/ToolAbout.tsx` (server, native details)
**Analog:** `app/tools/uuid/page.tsx` lines 64-113 (the two `<section>`s being replaced).

Preserve exact FAQ item markup (two `<p>` children, testid) lines 102-111:
```tsx
{faqItems.map((item) => (
  <div key={item.question} data-testid="uuid-faq-item">
    <p className="text-[14px] leading-[1.4] font-semibold text-foreground">{item.question}</p>
    <p className="mt-1 text-[16px] leading-[1.5] font-normal text-muted-foreground">{item.answer}</p>
  </div>
))}
```
Parameterize testid as `${slug}-faq-item`. Worked-example body (uuid lines 68-94) moves to `children` in the page unchanged, keeping `uuid-worked-example-v4/v7` testids. Use the full component from RESEARCH.md Pattern 1; no `"use client"`, use plain `border-t border-border` (not `components/ui/separator.tsx`, which is a client Radix wrapper). Reuse `cn` from `@/lib/utils`; the focus ring classes come from `components/ui/button.tsx` (`focus-visible:ring-3 focus-visible:ring-ring/50`).

### `app/tools/<slug>/page.tsx` migration (all five + config)
**Analog:** `app/tools/uuid/page.tsx`.

Remove: `faqJsonLd` const (31-39), the `<script>` (50-55), both `<section>`s (64-113). Keep: metadata block (6-21), `<h1>` + `mt-8` tool loader (57-62). New tail of `<main>`:
```tsx
<ToolAbout slug="uuid" faqItems={faqItems}>
  {/* existing worked-example body, verbatim from lines 68-94 */}
</ToolAbout>
```
Imports to add: `import { ToolAbout } from "@/components/ToolAbout";`. About is the last child of `<main>`.

**Config page** (`app/tools/config/page.tsx` lines 22-41): keep `max-w-6xl` main and the `max-w-3xl` intro (D-14); add after the `mt-8` loader div:
```tsx
<ToolAbout slug="config" faqItems={faqItems}><ConfigExample /></ToolAbout>
```
`ToolAbout` already applies `max-w-3xl`, so it self-constrains inside the wider main. Imports: `import { faqItems } from "./faq-data"; import { ConfigExample } from "./ConfigExample";`.

### `lib/config/token-classes.ts` and `ConfigTool.tsx`
**Analog/source:** `app/tools/config/ConfigTool.tsx` lines 16-36 (`TOKEN_CLASSES`, `MONOCHROME_TOKEN_CLASSES`, typed `Record<ConfigTokenKind, string>` with `ConfigTokenKind` from `@/lib/config/highlight`). Move verbatim, add `export`, no `"use client"`; in `ConfigTool.tsx` delete the local consts and import both. (`ConfigTool.tsx` line 1 is `"use client"`, which is why a server file cannot import these values from it.)

### `app/tools/config/ConfigExample.tsx` (server)
**Analog:** `ConfigTool.tsx` lines 195-225 (preview structure):
```tsx
<pre className="min-w-full w-max p-4 font-mono text-[13px] leading-[1.5]">
  {highlightedLines.map((line, lineIndex) => (
    <Fragment key={lineIndex}>
      {line.map((token, tokenIndex) => (
        <span key={`${lineIndex}-${tokenIndex}`} className={TOKEN_CLASSES[token.kind]} data-token={token.kind}>{token.text}</span>
      ))}
      {lineIndex < highlightedLines.length - 1 ? "\n" : null}
    </Fragment>
  ))}
</pre>
```
Wrapper uses `rounded-lg border border-border bg-secondary max-w-full overflow-auto`. Use RESEARCH.md Pattern 4 (testid `config-worked-example-preview`, `role="region"`, `tabIndex={0}`); the tool's own testid is `config-preview`, do not reuse. Call `highlightConfig(SAMPLE_CONFIG, "cisco")` directly (pure TS, zero imports). No `dangerouslySetInnerHTML`.

### `app/tools/config/faq-data.ts`
**Analog:** `app/tools/uuid/faq-data.ts` (header doc comment on single source of truth lines 1-12; `export type FaqItem` lines 14-17; `export const faqItems: FaqItem[]` of `{question, answer}` plain strings; sample constants exported lines 41-47). Add `SAMPLE_CONFIG` (D-09 snippet) in place of `sampleV4`. 4 items; privacy answer limited to "stays in this browser tab and is never uploaded or saved" (ConfigTool.tsx:290-293 wording; D-15, which resolves RESEARCH Assumption A1).

### Tests: `faq-data.test.ts` / `ConfigExample.test.tsx` / `pages-about.test.ts`
**Analog:** `app/tools/hash/faq-data.test.ts` lines 1-25:
```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { faqItems } from "./faq-data";
describe("hash faqItems", () => {
  it("...", () => {
    for (const item of faqItems) {
      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length).toBeGreaterThan(0);
    }
  });
```
Config: assert `4 <= length <= 6` (not `===`); do NOT copy Hash's `FORBIDDEN_PHRASES` list (Hash-specific). `ToolAbout.test.tsx`: use `renderToStaticMarkup` (RESEARCH Code Examples); component-render style from `components/ToolCard.test.tsx`.

### `lib/hooks/useKeyboardShortcut.ts` (line 62)
Change:
```ts
return target.closest('button, [role="button"], [role="radio"], a[href]') !== null;
```
to add `, summary` to the selector; update the doc comment above it (lines ~50-60). Test: add next to the button case at `useKeyboardShortcut.test.ts:142-154`, reusing `dispatchKeydown(init, target)` (lines 5-17); full body in RESEARCH Code Examples.

### `components/ToolCard.tsx` (lines 20-43) and test
Current:
```tsx
const ICONS: Record<string, LucideIcon> = { Fingerprint, Network, Globe, Cpu, Hash };
...
const Icon = ICONS[tool.icon] ?? Fingerprint;
```
Change: add `FileTerminal` to the lucide import and map, `export` the map, add `resolveToolIcon` that throws (RESEARCH Pattern 5), use it in place of line 43. Keep the doc comment ("Every icon referenced by tools/registry.ts MUST have an entry here"). `ToolCard.test.tsx` lines 133-142 ("falls back to the Fingerprint icon ... documents the silent fallback") must be REPLACED with a throws-for-unknown test (spy `console.error`); other cases there use `container.querySelector("svg.lucide-hash")`, mirror that for `svg.lucide-file-terminal`. `tools/registry.ts` ~line 98: `icon: "Network"` -> `"FileTerminal"`; add a registry-wide test that each `tool.icon` is a key of `ICONS` and Config's icon is distinct.

### e2e: SEO specs + `openAbout`
**Analog:** `tests/e2e/uuid-seo.spec.ts`. Lines to patch: 43-51 (`getByText(question).toBeVisible()`) and the worked-example visibility asserts (~72-82): insert `await openAbout(page, "uuid")` after `page.goto` (import from `./helpers/about`). Keep unchanged: `getByTestId("uuid-faq-item")` count, `script[type="application/ld+json"]` count 1, JSON-LD vs `<p>` textContent equality (open-state independent). Same edits in subnet (38-45, 66-79), dns (40, 51-53, 84-91), hash (open before the 320px overflow measure ~122-127). `config-seo.spec.ts`: copy the uuid-seo structure (metadata test, FAQ + JSON-LD test) with slug `config` and count 4-6. `about.spec.ts` and `helpers/about.ts`: no repo analog; use RESEARCH.md code (JS-disabled test, Enter-on-summary tests; DNS mocking pattern at `tests/e2e/dns-lookup.spec.ts:30-52`).

## Shared Patterns

### One JSON-LD builder (INFO-05)
Source: `lib/seo/jsonld.ts` (new). Apply to all six pages via `ToolAbout` only; no page may contain `application/ld+json` or `dangerouslySetInnerHTML` (guard in `pages-about.test.ts`, iterate the `tools` registry).

### Server shell + client loader
Every `page.tsx` is a Server Component shell with `<h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">`, `mt-8` tool loader (`*ToolLoader`, `ssr:false`), metadata via `SITE_URL` from `@/app/sitemap`. About is the last child of `<main>`.

### Testid contract (keep to limit e2e churn)
`{slug}-worked-example` and `{slug}-faq` on the `<details>`, `{slug}-faq-item` on each Q/A div, `{slug}-worked-example-*` inside bodies.

### Gates
`npm run typecheck && npm run lint && npm run test && npm run build && npm run test:e2e && npm run test:e2e:prod` (e2e suites sequential, shared `.next`).

## No Analog Found

| File | Role | Reason |
|---|---|---|
| `tests/e2e/helpers/about.ts` | e2e helper | No shared e2e helpers dir yet; use RESEARCH.md `openAbout` |
| `tests/e2e/about.spec.ts` (JS-disabled, Enter-on-summary) | e2e | No existing `javaScriptEnabled:false` or summary-keyboard spec; use RESEARCH.md examples |
| `ToolAbout` `<details>` markup | component | No existing native-disclosure component; use UI-SPEC / RESEARCH Pattern 1 |

## Metadata

**Analog search scope:** `app/tools/*`, `components/`, `lib/hooks`, `lib/config`, `tools/`, `tests/e2e`
**Pattern extraction date:** 2026-11-11
