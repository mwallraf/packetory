# Phase 2: UUID Generator - Research

**Researched:** 2026-07-23
**Domain:** Client-side cryptographic ID generation (Next.js App Router, RFC 9562 UUIDs) + first tool-page SEO/metadata pattern
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Regenerate-on-settings-change**
- **D-01:** Switching UUID version (v4 ↔ v7) immediately regenerates fresh value(s) in the new version — v4 and v7 are structurally different (v7 encodes a timestamp), so one cannot be reformatted into the other.
- **D-02:** Toggling case (upper/lower) or hyphens (on/off) reformats the value(s) already on screen in place — no new randomness, no change to underlying UUID identity.
- **D-03:** A visible "Regenerate" control (button/icon) is always present near the result, and the global `Enter` shortcut also triggers regeneration — consistent with the site's "Enter = execute" interaction model.
- **D-04:** Changing the batch count (e.g. 1 → 10) regenerates the batch live as the count changes — no separate "Generate" click required, matching the "zero-effort instant result" core value.

**Batch UX & local history**
- **D-05:** Batch results (2–100 values) render as a single scrollable list, one UUID per line — no pagination, same treatment regardless of batch size.
- **D-06:** Local-only "last 5 generated UUIDs" convenience history is explicitly **deferred**, not part of Phase 2 — see Deferred Ideas.
- **D-07:** One format selector (plain text / CSV / JSON) governs both the "Copy All" clipboard content and the "Download" file — not two independent pickers.
- **D-08:** CSV/JSON exports contain only the raw UUID strings — no index, version, or timestamp metadata columns/fields.

**SEO content specifics**
- **D-09:** The worked example shows a real, actually-generated v4 and v7 UUID side-by-side with a one-line note on when to use each (v7 = sortable/time-ordered).
- **D-10:** FAQ content targets practical/technical questions a developer would actually search for (e.g. "What's the difference between UUID v4 and v7?", "Are UUIDs guaranteed unique?", "Can I use a UUID as a database primary key?") — not generic/beginner framing.
- **D-11:** 3–4 focused FAQ questions — enough for FAQ schema/SEO value without padding.
- **D-12:** Page title and meta description mention both UUID versions (v4 and v7) rather than leading with v4 only — captures search intent from users specifically looking for v7.

### Claude's Discretion

- **Keyboard shortcut target (`/`)** — this area was surfaced but the user chose not to discuss it this round. Per Phase 1's D-03, `/` becomes active starting with this, the first tool page. No traditional "search input" exists for a default-on-load UUID generator, so the planner/researcher should pick a sensible target consistent with the site's interaction model and document the choice in PLAN.md rather than leaving it unbound. This is genuinely undecided by the user — flagged so downstream agents don't silently assume either way. (Research note: `02-UI-SPEC.md` already made a best-judgment call here — focus the batch-count input — tagged `[ASSUMPTION]`; carried forward as Assumption A1 below rather than treated as locked.)

### Deferred Ideas (OUT OF SCOPE)

- **Local-only "last 5 generated UUIDs" history** — mentioned in project-brief.md §5 as an example of acceptable convenience storage, but not part of Phase 2's locked UUID-01–06 requirements. Deferred to a later phase/enhancement.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UUID-01 | A UUID v4 is generated and displayed immediately on page load | `ssr:false` client-only render pattern (Architecture Patterns, Pattern 1) resolves the hydration-mismatch risk named in Success Criterion 1; `uuid.v4()` generation verified via package README |
| UUID-02 | User can switch generation to UUID v7 | `uuid.v7()` confirmed as a first-class export (npm registry README); D-01 requires a fresh regenerate, not a reformat — see Pitfall 4 for the distinction |
| UUID-03 | User can regenerate a single UUID or generate a batch of 1–100 | Batch generation is a trivial synchronous loop over `v4()`/`v7()`; boundary values (0/1/100/101) called out in Validation Architecture's Wave 0 test gaps |
| UUID-04 | User can toggle uppercase/lowercase and hyphens on/off | Formatting is a pure string transform over already-generated values (D-02); must NOT re-trigger generation — see Pitfall 4 and the `lib/uuid/format.ts` code example |
| UUID-05 | User can view/export output as plain text, CSV, or JSON | `lib/uuid/export.ts` code example; no CSV-escaping library needed given the UUID alphabet (Don't Hand-Roll table) |
| UUID-06 | User can copy a single value, copy all, or download the result | Reuses Phase 1's `useCopyToClipboard`; download via native `Blob`/anchor pattern (Code Examples, Pitfall 3 for cleanup) |
| QUAL-01 | Unique title, meta description, canonical URL, Open Graph metadata per tool page | Metadata API example reusing the existing `SITE_URL` constant from `app/sitemap.ts`; no OG image asset currently exists (Assumption A4) |
| QUAL-02 | Concise explanation, worked examples, genuine FAQ content | D-09–D-11 locked scope; FAQPage JSON-LD pattern verified against the official Next.js JSON-LD guide, including its XSS-escaping caveat |
</phase_requirements>

## Summary

Phase 2 is low-risk on the generation math (the `uuid` npm package handles all RFC 9562 v4/v7 logic) but carries one genuinely tricky architectural problem that the approved UI-SPEC's stated approach does not fully solve: **a value produced by a cryptographically random function cannot be identical between a server render and a client hydration render.** Success Criterion 1 requires "no hydration-mismatch flicker," and the UI-SPEC's proposed fix (a lazy `useState` initializer) prevents *recomputation on re-render* but does **not** prevent the *server-vs-client mismatch on first mount*, because this "use client" component is still executed once during SSR/static prerendering and again during client hydration — producing two different UUIDs. The verified, idiomatic Next.js App Router fix is to render the interactive tool through `next/dynamic(..., { ssr: false })`, wrapped in a small Client Component (Next.js forbids `ssr: false` directly inside a Server Component) — this skips server rendering of that subtree entirely, so there is nothing for the client render to mismatch against. This is the single most important finding in this research and should anchor the planner's component-boundary design.

Beyond that, everything else in this phase is well-trodden: the `uuid@14.0.1` package (already pinned in CLAUDE.md) is verified live on the npm registry, has zero dependencies, no postinstall script, and its own README confirms both `v4()` and `v7()` are first-class exports using the Web Crypto API. Export-to-CSV/JSON/download and clipboard copy need no new libraries — the existing `useCopyToClipboard` hook covers copy, and the browser's native `Blob` + anchor-`download` pattern covers file export. The SEO requirements (QUAL-01/02) are best served by Next.js's per-page `metadata` export (reusing the project's existing `SITE_URL` constant from `app/sitemap.ts` for the canonical URL) plus a `FAQPage` JSON-LD `<script>` block per the official Next.js JSON-LD guide, with its documented XSS-escaping caveat.

**Primary recommendation:** Split the page into three files — a Server Component `page.tsx` (metadata + canonical + OG + JSON-LD FAQ + static worked-example/FAQ copy) that renders a thin Client Component wrapper (`UuidToolLoader.tsx`) which `next/dynamic`-imports the actual interactive tool (`UuidTool.tsx`) with `ssr: false`. Core generation/formatting/export logic lives in framework-agnostic `lib/uuid/*` modules per the established pattern, tested with Vitest + fast-check.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| UUID v4/v7 generation (CSPRNG) | Browser / Client | — | `clientOnly: true` in the registry; no server round-trip needed or wanted for a pure-math operation (project-brief.md §8.1, §10.1 "no third-party requests for tools that can operate locally") |
| Case (upper/lower) + hyphen formatting | Browser / Client | — | Pure reformatting of an already-generated string, D-02 — no new randomness, stays client-side |
| Batch generation (1–100) + list rendering | Browser / Client | — | Synchronous, cheap; D-04 requires live regeneration with no server call |
| Copy (single / copy-all) | Browser / Client | — | `navigator.clipboard` is browser-only; reuses `useCopyToClipboard` (Phase 1) |
| CSV / JSON / plain-text export formatting | Browser / Client | — | Pure string transforms over an in-memory array, D-07/D-08 |
| File download trigger | Browser / Client | — | `Blob` + `URL.createObjectURL` + anchor `download` — browser-only APIs |
| Keyboard shortcuts (`/`, `Enter`, `Esc`, `Ctrl/Cmd+C`) | Browser / Client | — | Reuses Phase 1's `useKeyboardShortcut`, a `window`-level listener |
| Page metadata (title, description, canonical, OG) | Frontend Server (SSR) | CDN / Static | Next.js `metadata` export runs at build/prerender time; served as static HTML `<head>` from Vercel's edge/CDN |
| FAQ `FAQPage` JSON-LD | Frontend Server (SSR) | CDN / Static | Must be present in the initial server-rendered HTML for crawlers (official Next.js JSON-LD guide) — never client-injected |
| Worked-example / FAQ prose (static copy) | Frontend Server (SSR) | CDN / Static | No interactivity, no per-user variance — rendered once as static HTML |
| Tool registry status flip (`planned` → `active`) | Frontend Server (build-time) | CDN / Static | `tools/registry.ts` is imported by nav/sitemap/robots Server Components; consumed at build time, not runtime |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `uuid` | `14.0.1` | UUID v4 + v7 generation, `parse`/`stringify`/`validate`/`version`, `NIL`/`MAX` constants | `[VERIFIED: npm registry]` Confirmed live via `npm view uuid version` (14.0.1, published 2026-06-20) and via the package-legitimacy gate (`OK` verdict — see audit below). Package README (fetched directly from the npm registry, itself the package's official documentation) confirms `uuid.v4()` and `uuid.v7()` are both top-level exports, "Secure — Uses modern `crypto` API for random values," and "Zero-dependency." Note the README's explicit warning: **CommonJS (`require`) is no longer supported starting `uuid@12`** — the package is ESM-only. This project is already ESM/TypeScript throughout (Next 16 App Router, `"type"` unset but all source uses `import`), so this is a non-issue, but flag it if any future test tooling tries `require("uuid")`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-*` (via the unified `radix-ui` package, already a dependency at `1.6.4`) | `1.6.4` installed / `1.6.5` latest `[CITED: npm registry]` | Underlying primitives for the new shadcn components (`toggle-group`, `switch`, `input`, `label`, `scroll-area`) | Already the project's established pattern (see `components/ui/tooltip.tsx`, which imports `{ Tooltip as TooltipPrimitive } from "radix-ui"`) — no new package needed, shadcn's generator will reuse the existing `radix-ui` dependency. A trivial patch bump (1.6.4→1.6.5) is available but not required for this phase. |
| `lucide-react` | `1.25.0` (installed) | Icons: `Fingerprint` (already reserved for this tool), `Copy`, `Check`, `RefreshCw`, `Download` | Already a dependency; no action needed beyond importing the new icon names. |

### shadcn/ui components to add this phase

`[VERIFIED: shadcn CLI]` — confirmed via a live `npx shadcn@latest add toggle-group switch input label scroll-area --dry-run` against the project's initialized `radix-nova` style: resolves cleanly to 6 new files (`toggle-group` also pulls in `toggle` as an internal dependency):

```bash
npx shadcn@latest add toggle-group switch input label scroll-area
```

| Component | Purpose |
|-----------|---------|
| `toggle-group` (+ `toggle`) | Version selector (v4/v7) and export-format selector (text/CSV/JSON) — single-click, no dropdown, per UI-SPEC's stated rationale for "zero-effort" |
| `switch` | Case (upper/lower) and hyphens (on/off) toggles |
| `input` | Batch-count numeric field |
| `label` | Form-control labels |
| `scroll-area` | Batch-list scroll container (D-05, `max-h-96`) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `uuid` package for v4+v7 | Native `crypto.randomUUID()` (v4 only) + separate `uuidv7` package | Two code paths, two APIs, marginal byte savings — not worth it for a single tool page (CLAUDE.md already reached this conclusion; re-confirmed here) |
| Native `<select>`/shadcn `Select` for version/format pickers | shadcn `toggle-group` (recommended, per UI-SPEC) | `Select` needs an extra click to open the dropdown before choosing — contradicts "zero-effort instant result" for a 2–3-option control; only reach for `Select` if the option count grows past what fits a single-row toggle group |
| Hand-rolled CSV escaping | N/A — no library needed either way | UUIDs are fixed-alphabet strings (hex digits + hyphens only); they can **never** contain a comma, quote, or newline, so there is no CSV-injection surface and no escaping library is warranted. Do not add `csv-stringify` or similar for this data shape — it would be pure over-engineering. |

**Installation:**
```bash
npm install uuid
npx shadcn@latest add toggle-group switch input label scroll-area
```

**Version verification:** `npm view uuid version` → `14.0.1` (confirmed live 2026-07-23, matches CLAUDE.md, no drift). `npm view uuid dependencies` returned empty (zero runtime deps, confirmed). `npm view uuid scripts.postinstall` returned empty (no postinstall script).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `uuid` | npm | Published `14.0.1` 2026-06-20 (package itself: 10+ years, `uuidjs/uuid`) | ~269M/week | `github.com/uuidjs/uuid` | `[OK]` | Approved |

Ran via the package-legitimacy seam (`gsd-tools query package-legitimacy check --ecosystem npm uuid`): `exists: true`, `deprecated: false`, `postinstall: null`, `weeklyDownloads: 269131761`, `repoUrl: git+https://github.com/uuidjs/uuid.git`, `reasons: []`. No new packages beyond `uuid` are being installed this phase — the shadcn additions are code generated directly into `components/ui/` (not new npm dependencies; they resolve to the already-installed `radix-ui` package).

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
Browser request → GET /tools/uuid
        │
        ▼
Server Component: app/tools/uuid/page.tsx  (static-generated at build)
  ├─ exports `metadata` (title, description, alternates.canonical, openGraph)
  │     — canonical built from the existing SITE_URL constant (app/sitemap.ts)
  ├─ renders static worked-example prose (real v4 + v7 sample values, computed
  │     at build time via lib/uuid — safe because these are illustrative only,
  │     never claimed as "your" generated value)
  ├─ renders static FAQ prose + <script type="application/ld+json"> FAQPage
  │     block (must be server-rendered so crawlers see it in initial HTML)
  └─ renders <UuidToolLoader />  ── the ONLY dynamic subtree on the page
        │
        ▼
Client Component: app/tools/uuid/UuidToolLoader.tsx  ("use client")
  └─ next/dynamic(() => import("./UuidTool"), { ssr: false, loading: Skeleton })
        — this wrapper exists ONLY because Next.js forbids `ssr:false`
          directly inside a Server Component; the dynamic() call itself
          MUST live in a "use client" file.
        │
        ▼  (browser only — never rendered on the server, no hydration
        │   mismatch possible because there is no server-rendered
        │   counterpart to disagree with)
Client Component: app/tools/uuid/UuidTool.tsx  ("use client")
  ├─ useState(() => generateBatch({version:"v4", count:1, ...})) — lazy
  │     initializer, runs once, ONLY in the browser (thanks to ssr:false)
  ├─ D-01: version toggle (v4↔v7) → regenerate fresh batch
  ├─ D-02: case/hyphen toggles → reformat existing values, no new randomness
  ├─ D-03: Regenerate button + global Enter shortcut → regenerate batch
  ├─ D-04: batch-count input (clamped 1–100) → regenerate live on change
  ├─ D-05: count=1 → hero display; count 2–100 → ScrollArea list
  ├─ D-07: one format selector (text/CSV/JSON) drives Copy-All AND Download
  ├─ useCopyToClipboard() (Phase 1, reused) → single-copy / copy-all
  └─ useKeyboardShortcut() (Phase 1, reused) → "/" focuses batch-count input,
        Enter regenerates, Ctrl/Cmd+C copies hero/primary value
        │
        ▼
lib/uuid/*  (framework-agnostic, no React/Next import — independently unit-
  and property-tested with Vitest + fast-check)
  ├─ generate.ts   — wraps uuid.v4()/uuid.v7(), batch generation
  ├─ format.ts     — case + hyphen transforms over already-generated strings
  └─ export.ts     — array-of-strings → plain text / CSV / JSON string
```

### Recommended Project Structure
```
app/
└── tools/
    └── uuid/
        ├── page.tsx              # Server Component: metadata, canonical, OG, JSON-LD FAQ, static copy
        ├── UuidToolLoader.tsx    # "use client" — dynamic(..., {ssr:false}) wrapper (see pitfall below)
        └── UuidTool.tsx          # "use client" — the actual interactive tool
lib/
└── uuid/
    ├── generate.ts               # v4/v7 generation + batch
    ├── generate.test.ts          # Vitest + fast-check property tests
    ├── format.ts                 # case/hyphen formatting
    ├── format.test.ts
    ├── export.ts                 # plain text / CSV / JSON serialization
    └── export.test.ts
tests/
└── e2e/
    └── uuid.spec.ts               # Playwright: keyboard flow, copy/download, 320px/100-row backstops
```

### Pattern 1: Client-only render to avoid an unavoidable hydration mismatch
**What:** Any component whose initial render output depends on a non-deterministic value (CSPRNG-based UUIDs, `Math.random()`, `Date.now()`) will produce different output on the server and during client hydration, because both environments execute the same component function independently. React's hydration contract requires the two outputs to match exactly, or React emits a "Text content does not match server-rendered HTML" warning/error and forces a client-side re-render of that subtree anyway — which is visually a flicker.
**When to use:** Any time a Client Component's *first* render must contain fresh randomness that cannot and should not be identical between server and client.
**Example:**
```tsx
// Source: https://nextjs.org/docs/app/guides/lazy-loading (fetched live, Next.js 16.2.11 docs)
// app/tools/uuid/UuidToolLoader.tsx
"use client";

import dynamic from "next/dynamic";

// ssr:false is ONLY legal inside a "use client" file — Next.js throws
// "ssr: false is not allowed with next/dynamic in Server Components"
// if this call is placed directly in page.tsx.
const UuidTool = dynamic(() => import("./UuidTool"), {
  ssr: false,
  loading: () => <UuidToolSkeleton />, // same fixed height as the real hero
});                                     // value — prevents CLS (SHELL-06)

export function UuidToolLoader() {
  return <UuidTool />;
}
```
```tsx
// app/tools/uuid/page.tsx (Server Component — unchanged metadata/SEO responsibilities)
import { UuidToolLoader } from "./UuidToolLoader";

export default function UuidPage() {
  return (
    <>
      {/* static worked example, FAQ, JSON-LD — server-rendered */}
      <UuidToolLoader />
    </>
  );
}
```

### Anti-Patterns to Avoid
- **Lazy `useState` initializer alone, without `ssr: false`:** This is what the current UI-SPEC's `## UI Considerations` "loading" row describes ("generated during the initial client render via a lazy `useState` initializer... avoids the hydration-mismatch flicker"). This is **incomplete** — a lazy initializer prevents *recomputation on every re-render*, but the component is still SSR'd once (producing UUID-A in the server HTML) and then hydrated on the client (computing a *different* UUID-B in the same initializer) — a genuine mismatch, not merely a stylistic risk. Flag this for the planner explicitly; the fix is `ssr:false`, not a memoization pattern.
- **Two-pass `isClient` + `useEffect` flag:** A documented alternative (render a placeholder, flip to the real value after mount) — works, but produces a *visible* flash from placeholder → real value, which directly conflicts with Success Criterion 1's "no hydration-mismatch flicker." Not recommended here; use `ssr:false` instead, which shows a skeleton (styled identically in size, no jank) only for the brief window before the client bundle executes, then paints the real value once — no swap-after-paint flash of already-rendered content.
- **`suppressHydrationWarning` on the UUID text node:** Silences the console warning but does not prevent the actual value swap the user sees; React still overwrites server HTML with client output on hydration. Treated by React's own docs as "an escape hatch," not a fix for this case.
- **Generating the initial UUID server-side and passing it as a prop into the Client Component:** Would fix the mismatch (server and client would agree, since the client uses the passed prop instead of generating its own value) — but requires `export const dynamic = "force-dynamic"` on the route (a fresh server render per request) since otherwise Next.js bakes ONE UUID into the static HTML at build time and serves that same stale value to every visitor until they interact. This directly contradicts `tools/registry.ts`'s `clientOnly: true` flag for this tool and CLAUDE.md's static-first mandate, and adds a per-request Vercel function invocation for a tool whose entire value proposition is "runs fully in your browser." Not recommended; documented only so the planner can consciously reject it if `ssr:false`'s skeleton flash proves visually unacceptable during UAT.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RFC 9562 UUID v4/v7 byte layout (version/variant bits, v7's 48-bit Unix-ms timestamp + monotonic sub-millisecond entropy) | A custom `crypto.getRandomValues()` + manual bit-twiddling generator | `uuid` package's `v4()`/`v7()` | Getting the version/variant nibbles wrong produces a string that *looks* like a UUID but fails validation elsewhere (e.g. a downstream Postgres `uuid` column, or a strict validator); v7's monotonicity-within-the-same-millisecond guarantee (so v7 batches are actually sortable, the entire point of choosing v7) requires careful counter/entropy handling that the library already solved and tested |
| Global keyboard shortcut plumbing (`/`, `Enter`, `Esc`, `Ctrl/Cmd+C`, editable-field guard) | A new per-page `keydown` listener | `lib/hooks/useKeyboardShortcut.ts` (Phase 1, already unit-tested) | Already handles the editable-field guard correctly (including the jsdom quirk noted in its own comments) — reimplementing risks regressing that guard |
| One-click copy + timed "Copied!" confirmation state | A new clipboard hook per component | `lib/hooks/useCopyToClipboard.ts` (Phase 1, already unit-tested) | Already handles the reject-without-throw case and revert timing; reuse for both the hero single-copy button and the batch copy-all button |

**Key insight:** This phase's actual complexity is not in the domain logic (UUID math is a solved, thoroughly-tested library problem) — it's in getting the Next.js App Router rendering boundary right so the "instant, no-flicker" UX promise holds up under React's hydration contract. Spend the implementation budget there, not on re-deriving UUID byte layouts or clipboard/keyboard plumbing that Phase 1 already built.

## Common Pitfalls

### Pitfall 1: Hydration mismatch from SSR'd randomness (see Architecture Patterns above for the fix)
**What goes wrong:** The hero UUID value flashes/changes once immediately after page load, or React logs a hydration-mismatch warning in the console, or (in the worst case with `suppressHydrationWarning` misapplied broadly) real bugs in that subtree get silently swallowed.
**Why it happens:** A "use client" component is rendered once during SSR/static prerendering and again during client hydration; calling `uuid.v4()`/`uuid.v7()` in either the component body or a `useState` initializer runs the CSPRNG independently in both environments, producing two different strings.
**How to avoid:** Wrap the interactive tool in `next/dynamic(..., { ssr: false })` via a small Client Component wrapper (see Pattern 1). Verify with a curl/View Source check of the built page that the served static HTML shows the *skeleton*, not a baked-in UUID.
**Warning signs:** Any hydration warning in the dev console mentioning the UUID text node; a UUID value in the static HTML (visible via "View Page Source") that differs from what appears after JS loads.

### Pitfall 2: `ssr: false` placed in the wrong file
**What goes wrong:** Build fails with `Error: × ssr: false is not allowed with next/dynamic in Server Components. Please move it into a Client Component.`
**Why it happens:** `page.tsx` is a Server Component by default (no `"use client"` directive); Next.js 16 explicitly forbids `dynamic(..., {ssr:false})` there because Server Components have no hydration phase to "skip."
**How to avoid:** Put the `dynamic()` call inside a dedicated `"use client"` file (`UuidToolLoader.tsx`) and have `page.tsx` render that wrapper, not the dynamic import directly.
**Warning signs:** Build-time error, not a runtime one — will be caught immediately in `npm run build` / CI, per QUAL-09's existing build gate.

### Pitfall 3: Forgetting to revoke the Blob object URL on download
**What goes wrong:** Repeated "Download" clicks leak memory (each `URL.createObjectURL()` call holds a reference until explicitly revoked or the document unloads) — negligible for a handful of clicks, but a bad habit worth avoiding since the download control is meant to be clicked repeatedly during a session (batch regeneration + re-download).
**Why it happens:** `URL.createObjectURL(blob)` returns a URL that stays alive until `URL.revokeObjectURL()` is called; it's easy to trigger the download and never call the cleanup.
**How to avoid:** Call `URL.revokeObjectURL(url)` immediately after the synthetic anchor click (a `setTimeout(() => URL.revokeObjectURL(url), 0)` or a `click`-then-revoke in the same tick is the standard pattern — the browser has already started the download by the time the URL is revoked).
**Warning signs:** Not user-visible; only shows up as a growing memory footprint under heavy repeated-download stress testing — low severity, cheap to just do right the first time.

### Pitfall 4: Case/hyphen formatting order and re-application on version switch
**What goes wrong:** Toggling uppercase before removing hyphens (or vice versa) is order-independent for these two specific transforms (`.toUpperCase()` and `.replaceAll("-", "")` commute), so this isn't actually a bug risk — but a *real* pitfall is forgetting that D-01 (version switch → regenerate fresh values) and D-02 (case/hyphen toggle → reformat in place) are genuinely different code paths with different triggers. A naive implementation that treats every settings change identically (regenerate-on-any-change) violates D-02's "no new randomness" requirement — a case toggle must reformat the *same* underlying UUIDs, not call `v4()`/`v7()` again.
**Why it happens:** It's tempting to model all controls uniformly as "any control change → re-run the whole generation pipeline," which is simpler to write but wrong per the locked decisions.
**How to avoid:** Keep the raw generated UUID array as the single source of truth in state (regenerated only on version switch, batch-count change, or explicit Regenerate); derive the *displayed* strings from that raw array + current case/hyphen settings on every render (a pure format step, not a generation step).
**Warning signs:** A property-based test asserting "toggling case twice returns the exact original string, byte-for-byte" — this is the concrete assertion that would catch a regenerate-instead-of-reformat bug in code review.

## Code Examples

Verified patterns from official sources:

### UUID v4/v7 generation (from the package's own README, fetched live via `npm view uuid readme`)
```typescript
// Source: npm registry — uuid@14.0.1 README (uuidjs/uuid)
import { v4 as uuidv4, v7 as uuidv7, validate, version } from "uuid";

uuidv4(); // e.g. "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
uuidv7(); // e.g. "017f22e2-79b0-7cc3-98c4-dc0c0c07398f" — sortable, encodes a
          // Unix-ms timestamp in its first 48 bits

validate(uuidv4()); // true
version(uuidv7());  // 7
```

### FAQPage JSON-LD (D-11: 3–4 questions), server-rendered
```tsx
// Source: https://nextjs.org/docs/app/guides/json-ld (fetched live, Next.js 16.2.11 docs)
// app/tools/uuid/page.tsx (Server Component)
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

// The docs explicitly warn: JSON.stringify does NOT sanitize against XSS —
// escape "<" to its unicode equivalent before injecting.
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
  }}
/>;
```

### Canonical URL + Open Graph metadata, reusing the existing `SITE_URL` constant
```typescript
// Source: project convention — app/sitemap.ts and app/robots.ts already both
// import SITE_URL rather than re-declaring the literal; follow the same
// pattern here instead of hardcoding "https://packetory.dev" a third time.
import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";

export const metadata: Metadata = {
  title: "UUID Generator (v4 & v7) — Packetory",
  description:
    "Generate UUID v4 and v7 identifiers instantly...", // must mention both versions per D-12
  alternates: { canonical: `${SITE_URL}/tools/uuid` },
  openGraph: {
    title: "UUID Generator (v4 & v7) — Packetory",
    description: "...",
    url: `${SITE_URL}/tools/uuid`,
    type: "website",
  },
};
```
Note: no OG image asset exists in the repo yet (`public/` doesn't exist, `find` for `og*.png`/`opengraph*` returned nothing) — ship text-only Open Graph metadata (title/description/url/type) this phase; an OG image is a nice-to-have deferred, not a QUAL-01 blocker (QUAL-01 requires "Open Graph metadata," not specifically an image).

### CSV/JSON/plain-text export (no library needed — trivial data shape)
```typescript
// lib/uuid/export.ts — framework-agnostic, unit-testable
export function toPlainText(uuids: string[]): string {
  return uuids.join("\n");
}

export function toCsv(uuids: string[]): string {
  // Single column, no special characters possible in a UUID string — no
  // escaping library needed (see "Don't Hand-Roll" table entry).
  return ["uuid", ...uuids].join("\n"); // header row — see Assumptions Log A2
}

export function toJson(uuids: string[]): string {
  return JSON.stringify(uuids, null, 2); // flat array of raw strings (D-08)
}
```

### Download trigger (Blob + anchor, with cleanup)
```typescript
// lib/uuid or inline in UuidTool.tsx — standard browser pattern, no library
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0); // Pitfall 3
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| UUID v1 (MAC address + timestamp) as the default "random-looking" ID | UUID v4 (fully random) or v7 (time-ordered, RFC 9562) | RFC 9562 obsoleted RFC 4122 (2024) | v1 leaks the generating machine's MAC address and is explicitly out of scope for this project (REQUIREMENTS.md "Out of Scope") |
| `uuid` package usable via `require()` (CommonJS) | ESM-only starting `uuid@12` | Per the package's own README | Not an issue for this all-ESM/TypeScript project, but would break if anyone adds a legacy CommonJS test harness later |
| Manually authoring `<link rel="canonical">` / `<meta property="og:*">` tags via `next/head` (Pages Router) | Declarative `metadata` / `generateMetadata` export (App Router Metadata API) | App Router GA | Already the pattern used in `app/layout.tsx` and `app/privacy/page.tsx` in this codebase — Phase 2 extends the same pattern, doesn't introduce a new one |

**Deprecated/outdated:**
- UUID v1/v3/v5 as a "modern random ID" default: superseded by v4 (random) and v7 (sortable) for new systems; this project correctly scopes only v4/v7 for v1.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `/` shortcut should focus the batch-count input (already decided in `02-UI-SPEC.md`, itself marked `[ASSUMPTION]` there since CONTEXT.md D-flagged this as genuinely undecided) | Architecture Patterns / carried from UI-SPEC | Low — the hook is unbound-safe by design (Phase 1); rebinding later is a one-line change with no structural risk |
| A2 | CSV export includes a one-row `uuid` header (D-08 rules out index/version/timestamp *columns*, but doesn't explicitly confirm or rule out a single-column header label) | Code Examples — `toCsv()` | Low-medium — if the user actually wants headerless CSV (to exactly mirror the plain-text output), this is a one-line change in `lib/uuid/export.ts` and its test; flag as a quick confirm during planning or UAT rather than blocking on it |
| A3 | Download filenames follow `uuids.txt`/`uuids.csv`/`uuids.json` (already flagged `[ASSUMPTION]` in `02-UI-SPEC.md` — no convention was specified by the user) | Code Examples — `downloadFile()` | Low — cosmetic, trivially changed |
| A4 | No OG image is required this phase (none exists in the repo; QUAL-01 requires "Open Graph metadata," not necessarily an image) | Code Examples — metadata example | Low — a missing OG image degrades social-share preview quality but doesn't fail any locked requirement; add later as a `public/` asset without touching this phase's logic |

## Open Questions

1. **Should the CSV export include a header row?**
   - What we know: D-08 explicitly forbids index/version/timestamp *metadata columns*; it's silent on whether the single `uuid` column itself gets a header label.
   - What's unclear: Whether "no metadata columns" was meant to also exclude a plain header labeling the one real column.
   - Recommendation: Ship with a `uuid` header (A2 above) since it makes the CSV self-describing when opened in a spreadsheet tool, and revisit trivially if UAT feedback disagrees — this is a one-line, low-risk default, not worth blocking planning on.

2. **Does `dynamic(..., {ssr:false})`'s brief skeleton-fallback window read as "instant" enough to satisfy Success Criterion 1 in practice?**
   - What we know: The JS bundle for this single client-only tool is small; on a typical connection the `ssr:false` fallback window is sub-100ms and imperceptible, and — critically — there is no visible value-swap flash (unlike the `useEffect`/two-pass alternative), only a skeleton→value transition on first paint.
   - What's unclear: Actual perceived latency depends on real-device/network conditions not measurable at research time.
   - Recommendation: Implement per Pattern 1, then explicitly verify during UAT/Playwright testing (e.g. assert the skeleton is visible for ≤1 frame in a throttled-network test, or simply confirm no console hydration warning appears and the final value is stable). If real-world latency proves unacceptable, the documented fallback (server-generated initial prop + `force-dynamic`) trades a small per-request server cost for a zero-skeleton first paint — see "Anti-Patterns to Avoid" for why it's not the default recommendation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/dev/test | ✓ | v22.13.1 | — |
| npm | Package install | ✓ | 11.10.1 | — |
| npm registry access | Installing `uuid`, shadcn component fetch | ✓ | — (live `npm view`/`npx shadcn add --dry-run` succeeded this session) | — |

No missing dependencies; this phase adds exactly one new npm package (`uuid`) plus code-generated shadcn components against the already-configured `radix-nova` registry.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (unit/property) + `@fast-check/vitest` 0.4.1 + Playwright 1.61.1 (e2e) — all already installed, versions confirmed live against `package.json` |
| Config file | `vitest.config.ts` (jsdom, `include: ["**/*.test.{ts,tsx}"]`, excludes `tests/e2e/**`); `playwright.config.ts` (`testDir: ./tests/e2e`, `baseURL: http://localhost:3000`) |
| Quick run command | `npm test -- lib/uuid` |
| Full suite command | `npm test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UUID-01 | v4 UUID displayed on load, no input, no hydration flicker | e2e | `npx playwright test tests/e2e/uuid.spec.ts -g "loads a v4"` | ❌ Wave 0 |
| UUID-02 | Switch to v7 regenerates fresh v7 value(s) | unit + e2e | `npx vitest run lib/uuid/generate.test.ts` / e2e | ❌ Wave 0 |
| UUID-03 | Regenerate single / batch 1–100 | unit (property) | `npx vitest run lib/uuid/generate.test.ts -t "batch"` | ❌ Wave 0 |
| UUID-04 | Case + hyphen toggles reformat in place (byte-identical round-trip) | unit (property, fast-check) | `npx vitest run lib/uuid/format.test.ts` | ❌ Wave 0 |
| UUID-05 | Export as text/CSV/JSON | unit | `npx vitest run lib/uuid/export.test.ts` | ❌ Wave 0 |
| UUID-06 | Copy single/all, download, visible confirmation | e2e | `npx playwright test tests/e2e/uuid.spec.ts -g "copy"` | ❌ Wave 0 |
| QUAL-01 | Unique title/description/canonical/OG | unit (metadata assertion) or e2e (`<head>` inspection) | `npx playwright test tests/e2e/uuid.spec.ts -g "metadata"` | ❌ Wave 0 |
| QUAL-02 | Worked example + FAQ content present | e2e (content assertion) | `npx playwright test tests/e2e/uuid.spec.ts -g "faq"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/uuid` (fast, framework-agnostic, no browser needed)
- **Per wave merge:** `npm test && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/uuid/generate.test.ts` — covers UUID-01, UUID-02, UUID-03 (fast-check property tests: batch-count boundaries 0/1/100/101, version switch produces structurally distinct output, byte-length/format invariants)
- [ ] `lib/uuid/format.test.ts` — covers UUID-04 (property test: `format(format(x, A), B)` composition and round-trip identity)
- [ ] `lib/uuid/export.test.ts` — covers UUID-05 (snapshot-style: given a fixed input array, exact text/CSV/JSON output)
- [ ] `tests/e2e/uuid.spec.ts` — covers UUID-01, UUID-06, QUAL-01, QUAL-02 (new file — no existing e2e spec touches `/tools/uuid`)
- [ ] No new framework install needed — all four test tools already present in `package.json`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this tool — public, stateless |
| V3 Session Management | No | No session state; nothing persisted beyond the current page load |
| V4 Access Control | No | No access-controlled resources |
| V5 Input Validation | Yes | Batch-count input clamped to 1–100 client-side (UI-SPEC's inline error copy); no server round-trip to validate against, so no injection surface — but still validate defensively against non-numeric/negative/decimal input before using it as an array length |
| V6 Cryptography | Yes | `uuid` package's `v4()`/`v7()` use the Web Crypto API's CSPRNG (`crypto.getRandomValues`) under the hood — confirmed via the package README ("Secure — Uses modern `crypto` API for random values"). **Never** substitute `Math.random()` for any part of UUID generation; it is not cryptographically secure and would silently produce collision-prone, guessable identifiers. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via unescaped JSON-LD injection (`dangerouslySetInnerHTML`) | Tampering | Escape `<` to `<` in the serialized JSON-LD string before injection, exactly as the official Next.js JSON-LD guide documents — this is the only `dangerouslySetInnerHTML` usage this phase introduces |
| Weak/predictable ID generation (using `Math.random()` instead of a CSPRNG) | Tampering / Information Disclosure | Use only the `uuid` package's `v4()`/`v7()` — never hand-roll a generator (see Don't Hand-Roll table) |
| Clipboard write failure silently reported as success | Repudiation (weak form) | Already mitigated by the existing `useCopyToClipboard` hook's `error` flag and the UI-SPEC's inline "Couldn't copy" fallback copy — no new work needed, just wire it up consistently for both single-copy and copy-all |

## Sources

### Primary (HIGH confidence)
- `npm view uuid version|dependencies|scripts.postinstall|readme` — live registry query, 2026-07-23
- `gsd-tools query package-legitimacy check --ecosystem npm uuid` — live seam query, verdict `OK`
- `npx shadcn@latest add toggle-group switch input label scroll-area --dry-run` — live CLI query against the project's initialized registry, 2026-07-23
- `npx shadcn@latest info` — confirmed live preset (`radix-nova`, `base=radix`, `lucide` icons) matches `02-UI-SPEC.md`
- https://nextjs.org/docs/app/guides/lazy-loading — fetched live, Next.js 16.2.11 docs (matches project's pinned Next version) — `ssr:false` restriction to Client Components
- https://nextjs.org/docs/app/guides/json-ld — fetched live, Next.js 16.2.11 docs — JSON-LD `<script>` pattern + XSS-escaping caveat
- Direct codebase reads: `tools/registry.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/layout.tsx`, `app/privacy/page.tsx`, `components/IpBadge.tsx`, `lib/hooks/useCopyToClipboard.ts`, `lib/hooks/useKeyboardShortcut.ts`, `components/ui/tooltip.tsx`, `components.json`, `vitest.config.ts`, `playwright.config.ts`, `lib/analytics/redact.ts`, `tests/e2e/*.spec.ts`

### Secondary (MEDIUM confidence)
- WebSearch: React hydration-mismatch causes/fixes (`Math.random()`/randomness in render), cross-referenced against the primary Next.js docs fetches above and https://react.dev/link/hydration-mismatch (fetched live — confirms the two-pass `isClient` pattern is a documented but jankier alternative to `ssr:false`)
- WebSearch: Next.js App Router metadata/canonical/OpenGraph best practices (`metadataBase`, `alternates.canonical`) — cross-referenced against this project's existing convention of exporting `SITE_URL` from `app/sitemap.ts`

### Tertiary (LOW confidence)
- None retained as authoritative in this document — all claims above were either tool-verified this session or cited to an official docs fetch; see Assumptions Log for the handful of genuinely unconfirmed cosmetic choices (CSV header, download filenames, OG image).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `uuid@14.0.1` verified live on the npm registry with zero deps, no postinstall script, and an `OK` package-legitimacy verdict; shadcn component names verified live via CLI dry-run against the project's own initialized registry.
- Architecture: HIGH — the `ssr:false` client-only-render requirement is verified directly against the officially fetched Next.js 16.2.11 docs (the exact version pinned in this project), not inferred from training data.
- Pitfalls: HIGH for Pitfalls 1–2 (directly sourced from official docs and cross-checked against React's own hydration-mismatch guidance); MEDIUM for Pitfalls 3–4 (standard, well-known browser/state-management patterns, not independently fetched from an authoritative source this session, but uncontroversial).

**Research date:** 2026-07-23
**Valid until:** 2026-08-22 (30 days — stable domain; the one fast-moving risk is Next.js's dynamic-import/SSR rules, which are pinned to the project's exact installed version 16.2.11 and verified live, so this window is safe as long as Next.js isn't upgraded before implementation)
