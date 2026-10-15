# Phase 9: Hash Tool Page & Text Hashing - Pattern Map

**Mapped:** 2026-10-15
**Files analyzed:** 27
**Analogs found:** 25 / 27 (all analog paths verified git-tracked via `git ls-files`)

Normative detail (verify rules, StrictMode client lifecycle, pitfalls, sample digest values) is in `09-RESEARCH.md`. This file maps each file to a real analog and the excerpts to copy.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `app/tools/hash/page.tsx` | server page shell | static / request-response | `app/tools/mac/page.tsx` | exact |
| `app/tools/hash/HashToolLoader.tsx` | client loader | render boundary | `app/tools/mac/MacToolLoader.tsx` | exact |
| `app/tools/hash/HashTool.tsx` | component (island) | event-driven + async worker | `app/tools/mac/MacTool.tsx` (+ `app/tools/uuid/UuidTool.tsx` for ToggleGroup, `app/tools/subnet/SubnetTool.tsx` for URL read) | role-match |
| `app/tools/hash/faq-data.ts` | config/content | transform | `app/tools/mac/faq-data.ts` | exact |
| `app/tools/hash/faq-data.test.ts` | test | - | existing FAQ tests (grep `faq-data` in `app/tools/*`) | role-match |
| `app/tools/hash/HashTool.test.tsx` | test (RTL) | event-driven | `app/tools/mac/MacTool.test.tsx` | role-match |
| `components/ui/textarea.tsx` | UI primitive | - | `components/ui/input.tsx` | exact |
| `lib/hash/sample.ts` (+ test) | utility/constants | transform | `lib/hash/format.ts`, `lib/hash/algorithms.ts` | role-match |
| `lib/hash/format.ts` (extend) + test | utility | transform | itself (`toHex`) | exact |
| `lib/hash/verify.ts` (+ test) | utility | transform | `lib/mac/parse.ts` (normalize/parse pure fn) | role-match |
| `lib/hash/export.ts` (+ test) | utility | transform | `lib/uuid/export.ts` | exact |
| `lib/hash/client.ts` (optional WR-01/02) | service | event-driven | itself | exact |
| `tools/registry.ts` | config | - | `mac` entry (lines 65-76) | exact |
| `components/ToolCard.tsx` | component | - | `ICONS` map (line 25) | exact |
| `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts` | test fallout 4 -> 5 | - | themselves | exact |
| `lib/analytics/redact.test.ts` | test | - | MAC-10 regression block (file end) | exact |
| `tests/e2e/hash.spec.ts`, `hash-seo.spec.ts` | e2e | - | `tests/e2e/mac-lookup.spec.ts`, `uuid-seo.spec.ts` | role-match |

## Pattern Assignments

### `app/tools/hash/HashToolLoader.tsx` (client loader)
**Analog:** `app/tools/mac/MacToolLoader.tsx` (lines 1-42). Copy verbatim, rename, and make skeleton heights responsive (`h-[Apx] sm:h-[Bpx]`, measured in Playwright).
```tsx
"use client";
import dynamic from "next/dynamic";
const MacTool = dynamic(
  () => import("./MacTool").then((mod) => mod.MacTool),
  { ssr: false, loading: () => <MacToolSkeleton /> }
);
function MacToolSkeleton() {
  return (
    <div aria-hidden="true" data-testid="mac-tool-skeleton"
      className="h-[420px] animate-pulse rounded-md border border-border bg-secondary" />
  );
}
export function MacToolLoader() { return <MacTool />; }
```

### `app/tools/hash/page.tsx` (server shell)
**Analog:** `app/tools/mac/page.tsx`. Copy: `Metadata` with `alternates.canonical` (no `?text`) + `openGraph`, `SITE_URL` from `@/app/sitemap`, FAQ JSON-LD built from the same `faqItems`, no props and no `searchParams`.
```tsx
import { SITE_URL } from "@/app/sitemap";
const CANONICAL_URL = `${SITE_URL}/tools/mac`;
export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CANONICAL_URL, type: "website" },
};
const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({ "@type": "Question", name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer } })) };
// layout (lines 53-60, 64-66, 68-129):
<div className="flex flex-1 flex-col bg-background">
  <script type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
  <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">...</h1>
    <div className="mt-8"><MacToolLoader /></div>
    <section className="mt-12" data-testid="mac-worked-example"> ... <dl> dt/dd font-mono break-all ... </section>
    <section className="mt-12"> FAQ: faqItems.map -> <div data-testid="mac-faq-item"><p semibold/><p muted/></div> </section>
```
Worked example values: import `SAMPLE_TEXT`/`SAMPLE_DIGEST_HEX` from `lib/hash/sample` (re-export through `faq-data.ts`, as MAC does with `sampleFormats`).

### `app/tools/hash/faq-data.ts`
**Analog:** `app/tools/mac/faq-data.ts`: `export type FaqItem = { question: string; answer: string }` plus `export const faqItems: FaqItem[]`, and hardcoded sample constants. Required FAQ topics are listed in D-26.

### `app/tools/hash/HashTool.tsx` (island)
**Primary analog:** `app/tools/mac/MacTool.tsx`. Copy these pieces:

- **Imports** (lines 3-29): `useEffect/useRef/useState`, lucide icons (`Check`, `Copy`, `TriangleAlert`, `ShieldAlert`; add `Hash`, `Link`), `cn`, `useCopyToClipboard`, `useKeyboardShortcut`, `Label`, `Badge`. Add `ToggleGroup`/`ToggleGroupItem` from `@/components/ui/toggle-group` and `Textarea`.
- **Per-row copy** (`FormatRow`, lines 180-243): one `useCopyToClipboard()` per row, `useEffect(() => reset(), [value])` with the eslint-disable comment, a 44px round copy button with Check/Copy icon swap, an `aria-live="polite"` sr-only status, and a `COPY_ERROR_MESSAGE` fallback. Row container: `flex flex-col gap-1 rounded-md border border-border bg-secondary px-4 py-3`; value span `font-mono text-[16px] break-all`.
  ```tsx
  const { copy, copied, error, reset } = useCopyToClipboard();
  useEffect(() => { reset(); // eslint-disable-next-line react-hooks/exhaustive-deps -- reset is stable
  }, [value]);
  <button type="button" onClick={() => copy(value)} aria-label={copied ? "Copied!" : `Copy ${label} format`}
    className="ml-auto inline-flex h-11 min-w-11 ... text-primary ...">
    {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
  </button>
  <span aria-live="polite" className="sr-only">{copied ? "Copied!" : ""}</span>
  ```
- **Copy-all** (`CopyAllButton`, lines 250-320): snapshot text and `copy(fullText)`; same button class. Wire it with a labeled-list/checksum ToggleGroup.
- **Badge** (`ClassificationBadge`, lines 342-349): `<Badge variant="outline" className="gap-1.5"><Icon aria-hidden className="size-3" />{label}</Badge>`. Use for "Not for security" / "Error detection only" / MATCH. Text plus icon, never color alone.
- **Keyboard** (lines 598-610): `useKeyboardShortcut({ slash, escape })`. Hash adds `copy` (guard on `window.getSelection()?.toString()`) and leaves `enter` omitted. `slash` must do `el.focus(); el.select()`.
- **Async/race guard** (lines 481-528): the `seqRef` pattern. Hash version: `const id = ++seqRef.current; client.start(...).then(o => { if (id !== seqRef.current) return; ... })`. Ignore `cancelled` outcomes. Add a `.catch`.
- **Mount effect** (lines 588-596): the repo's pattern avoids sync `setState` in effects (`queueMicrotask` / async continuation + eslint-disable on deps). The HashClient must be created INSIDE the effect, because `dispose()` is final and StrictMode double-runs it (see RESEARCH Pattern 3).
- **Lazy initial state:** `useState(initialState)` (line 474). For `?text=` use `SubnetTool.tsx` lines 87-90:
  ```tsx
  function getInitialCidrFromUrl(): string | null {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("cidr");
  }
  ```
  Hash must NOT copy the history write-back that follows (SubnetTool line 92+).
- **Stale/dim result panel** (lines 699-705): `cn("flex flex-col gap-6", stale && "opacity-50")`. Add `aria-busy`.
- **Label + input block** (lines 661-683): `Label htmlFor` + control with `font-mono`, `spellCheck={false}`, `autoComplete="off"`. Extend with the D-24 attributes.

**ToggleGroup analog:** `app/tools/uuid/UuidTool.tsx` lines 121-123 and 197-216.
```tsx
// Radix single-select emits "" on deselect — ignore it
if (nextVersion !== "v4" && nextVersion !== "v7") return;
<ToggleGroup type="single" variant="outline" value={state.version} onValueChange={handleVersionChange}
  aria-labelledby="uuid-version-label" data-testid="uuid-version-toggle">
  <ToggleGroupItem value="v4" data-testid="uuid-version-v4"
    className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary">v4</ToggleGroupItem>
```
Use for the hex/HEX/base64 toggle and the copy-all format toggle.

**Imports allowed from UI:** `lib/hash/{algorithms,format,verify,export,sample,source,types,client}`. Never `job`, `engine`, `worker-core` (enforced by `lib/hash/boundaries.test.ts`).

### `components/ui/textarea.tsx`
**Analog:** `components/ui/input.tsx` (lines 1-19). Same shape with `React.ComponentProps<"textarea">`, `data-slot="textarea"`, the same class string with `min-h-16`/`resize-y` and without `h-8`/`file:*`, keeping `text-base md:text-sm` (avoids iOS zoom). Forward `ref` (React 19: ref is a normal prop).
```tsx
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn("... aria-invalid:border-destructive ...", className)} {...props} />
}
```

### `lib/hash/format.ts` (extend) and `lib/hash/sample.ts`
**Analog:** `lib/hash/format.ts` lines 1-27 (type-only imports, 256-entry `HEX` table, `toHex`, `digestsToHex`). Add `toHexUpper`, `toBase64` (`btoa` over `String.fromCharCode`), `hexToBytes`, `formatDigest(id, bytes, enc)`, `DigestEncoding`. Keep imports type-only. Tests: copy header of `lib/hash/format.test.ts` (`// @vitest-environment node`, vitest imports, `ALGORITHM_IDS`).
`sample.ts`: constants per RESEARCH "Code Examples" (values node-verified). Pin test hashes `SAMPLE_TEXT` via `runHashJob` and `node:crypto`/`zlib.crc32` (see `lib/hash/job.test.ts` for oracle style).

### `lib/hash/export.ts` (+ test)
**Analog:** `lib/uuid/export.ts` and `lib/uuid/export.test.ts` (pure formatters, tested directly). Use `ALGORITHMS.map(...)` from `lib/hash/algorithms.ts` for order and labels. Checksum format: always lowercase hex, `# LABEL\n<hex>  -`.

### `lib/hash/verify.ts` (+ test)
**Analog:** `lib/mac/parse.ts` and `lib/mac/parse.test.ts` (pure normalize-then-validate returning a discriminated union, table-driven tests with fast-check). Rules come from RESEARCH "Verify-box normalization rules". Return `{state:"idle"} | {state:"match", ids} | {state:"no-match", hint?}`.

### `lib/hash/client.ts` (optional WR-01/WR-02)
Keep imports type-only from `./types` (boundaries test). Add try/catch around `postMessage` and an `onmessageerror` handler, with new cases in `lib/hash/client.test.ts`.

### Registry and ToolCard
**Analog:** `tools/registry.ts` lines 65-76 (`mac` entry shape: slug, name, shortName, description, category, keywords, icon, status, clientOnly, featured). Add the `hash` entry per D-25 / RESEARCH. `components/ToolCard.tsx` lines 25-30: add `Hash` to the `ICONS` record and to the lucide import. Line 41 `ICONS[tool.icon] ?? Fingerprint` falls back silently, so add a test.
Sorted order becomes Subnet, UUID, DNS, Hash, MAC. Fallout file list is in RESEARCH "Registry fallout". Nav and sitemap are not edited.

### `lib/analytics/redact.test.ts`
**Analog:** the MAC-10 regression block at the end of the file. Add a sibling `it` with `redactParams("?text=hunter2%0Asecret", DEFAULT_ALLOW_LIST)` expecting `{}` and `expect(DEFAULT_ALLOW_LIST).not.toContain("text")`. Do not edit `redact.ts`.

### `app/tools/hash/HashTool.test.tsx`
**Analog:** `app/tools/mac/MacTool.test.tsx` (RTL `render/screen/fireEvent/waitFor`, `act`-wrapped timer helper, `afterEach(cleanup)`). Replace network mocking with `vi.mock("@/lib/hash/client")` using deferred promises for the out-of-order test. Add a history spy asserting zero `replaceState`/`pushState` calls.

### E2E
**Analog:** `tests/e2e/mac-lookup.spec.ts` (Playwright `test.describe`, `page.goto`, `getByTestId`; includes a 320px block) and `tests/e2e/uuid-seo.spec.ts` / `dns-seo.spec.ts` for the SEO spec. Add CLS and keyboard (`/`, Esc, Enter inserts newline) checks.

## Shared Patterns

### Copy confirmation
**Source:** `lib/hooks/useCopyToClipboard.ts` (`useCopyToClipboard(revertMs?)` returns `{copy, copied, error, reset}`) with the MacTool `FormatRow` markup above. Apply to every row, copy-all, and copy-link.

### Keyboard
**Source:** `lib/hooks/useKeyboardShortcut.ts` (handlers `slash`, `enter?`, `escape`, `copy?`). `copy` fires only outside editable fields and does not `preventDefault`, so guard the selection. Omit `enter`.

### Server-shell + `ssr:false` island, FAQ + JSON-LD parity
**Source:** `app/tools/mac/{page,MacToolLoader,faq-data}`. Apply to all `app/tools/hash/*` files.

### Read-once URL state
**Source:** `SubnetTool.tsx:87-90` (read half only).

### Pure lib modules
Framework-agnostic, `// @vitest-environment node` tests, type-only imports, no engine imports. Sources: `lib/hash/format.ts`, `lib/uuid/export.ts`, `lib/mac/parse.ts`.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| Worker-backed async island (client lifecycle created inside mount effect) | component | No existing tool uses `createHashClient` in a React component. The nearest is `app/hash-smoke/HashSmoke.tsx` (tracked), so read it for client usage before writing `HashTool.tsx`. RESEARCH Patterns 2-3 are authoritative. |
| `tests/e2e` CLS measurement | e2e | No existing CLS spec; use RESEARCH guidance. |

## Metadata

**Analog search scope:** `app/tools/*`, `components/`, `components/ui/`, `lib/hash`, `lib/hooks`, `lib/uuid`, `lib/mac`, `lib/analytics`, `tools/`, `tests/e2e`
**Files scanned:** ~130 tracked files listed, 9 read in full or in part
**Pattern extraction date:** 2026-10-15
