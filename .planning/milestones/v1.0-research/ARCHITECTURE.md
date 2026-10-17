# Architecture Research

**Domain:** Multi-tool Next.js App Router utility site (network/infra engineering tools)
**Researched:** 2026-07-21
**Confidence:** MEDIUM — Next.js official docs are authoritative for framework mechanics (rendering, searchParams, metadata); the "tool registry" composition pattern itself is not an official Next.js pattern but a well-established community convention validated against the brief's own proposal and cross-checked across multiple independent sources.

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        REGISTRY (data layer)                         │
│  tools/registry.ts — single typed array, no framework imports        │
└───────────────────────────────┬────────────────────────────────────-┘
                                 │ imported by (read-only, one direction)
        ┌────────────────────────┼─────────────────────────┬───────────────┐
        ▼                        ▼                          ▼               ▼
┌───────────────┐      ┌──────────────────┐      ┌──────────────────┐  ┌───────────┐
│  Site Shell    │      │   Tool Pages      │      │  Generated Assets │  │  Search/  │
│ (nav, footer,  │      │  app/tools/[x]/   │      │ sitemap.xml,       │  │  cmd-K    │
│  landing cards)│      │  page.tsx         │      │ robots.txt          │  │ (future)  │
└───────────────┘      └────────┬─────────┘      └──────────────────┘  └───────────┘
                                 │ renders
                                 ▼
                    ┌────────────────────────┐
                    │  Server Component shell │  ← static, no searchParams read here
                    │  (explanatory copy, FAQ,│
                    │   related links, layout)│
                    └───────────┬─────────────┘
                                 │ composes (children/props)
                                 ▼
                    ┌────────────────────────┐
                    │  Client Component       │  ← 'use client', owns interaction
                    │  (input, controls,      │
                    │   nuqs URL state)       │
                    └───────────┬─────────────┘
                                 │ calls
                                 ▼
                    ┌────────────────────────┐
                    │  lib/<tool>/ core logic │  ← framework-agnostic, pure TS
                    │  (pure functions,       │
                    │   unit-tested)          │
                    └───────────┬─────────────┘
                                 │ (DNS/MAC tools only) may call
                                 ▼
                    ┌────────────────────────┐
                    │  External data source   │  DoH resolver / OUI dataset /
                    │  or app/api/* route     │  vendor API proxy
                    └────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| `tools/registry.ts` | Single source of truth for every tool's metadata (slug, name, description, category, keywords, status, icon) | Plain typed TS array/object, zero React/Next imports, importable from server or client code |
| Site shell (`components/nav`, `components/landing`) | Global nav, footer, landing-page tool cards, category grouping | Server Components that `.map()` over the registry at build/request time — no manual per-tool JSX |
| `app/sitemap.ts`, `app/robots.ts` | Generate `sitemap.xml`/`robots.txt` from the registry | Next.js file-convention route handlers, iterate registry entries |
| Tool page shell (`app/tools/<slug>/page.tsx`) | Route entry, SEO metadata, static explanatory content, composes the interactive island | Server Component by default; `generateMetadata` sourced from the matching registry entry, not from `searchParams` |
| Tool interactive island (`app/tools/<slug>/*-client.tsx` or `components/tools/<slug>/`) | Owns user input, local UI state, URL sync, triggers core logic | `'use client'`, smallest possible subtree, uses `nuqs` for bookmarkable state |
| `lib/<tool>/*.ts` | Pure, framework-agnostic domain logic (UUID gen, subnet math, MAC parsing, DNS response shaping) | Plain TypeScript modules, typed inputs/outputs, no Next.js/React imports, unit-testable in isolation |
| `app/api/<tool>/route.ts` (only where needed) | Thin Route Handler adapter over `lib/` for server-only concerns (CORS-restricted vendor APIs, future public API) | Calls the same `lib/` functions the client calls directly for local-first tools |
| External services (DoH resolver, MAC vendor source) | Supply data the browser cannot derive locally | Called directly from the client for DNS (CORS-friendly DoH JSON API); proxied through `app/api/mac-vendor` only if the vendor source requires a server-side key/CORS workaround |

## Recommended Project Structure

```
app/
├── layout.tsx                 # root layout: theme, NuqsAdapter, global shell
├── page.tsx                   # landing page: reads tools/registry.ts, renders cards
├── sitemap.ts                 # generates sitemap.xml from registry
├── robots.ts                  # generates robots.txt
├── tools/
│   ├── uuid/
│   │   ├── page.tsx            # Server Component: metadata + static copy + <UuidTool/>
│   │   └── uuid-tool.tsx        # 'use client': generation controls, nuqs state
│   ├── subnet/
│   │   ├── page.tsx
│   │   └── subnet-tool.tsx      # 'use client': ?cidr= via nuqs, calls lib/subnet
│   ├── dns/
│   │   ├── page.tsx
│   │   └── dns-tool.tsx         # 'use client': ?name=&type=, debounce, AbortController
│   └── mac/
│       ├── page.tsx
│       └── mac-tool.tsx         # 'use client': as-you-type normalize, calls lib/mac
├── api/
│   └── mac-vendor/
│       └── route.ts            # only if vendor source needs a server-side proxy
components/
├── shell/                     # header, nav, footer — all registry-driven
├── landing/                   # tool-card grid, category sections
├── tools/                     # shared tool-page chrome: CopyButton, ResultPanel,
│                               # ExampleBlock, FaqSection, RelatedTools, KeyboardHints
└── ui/                        # generic primitives (Button, Input, Badge) — no tool logic
lib/
├── uuid/
│   ├── generate.ts             # pure v4/v7 generation, formatting
│   └── generate.test.ts
├── subnet/
│   ├── ipv4.ts                 # pure CIDR math
│   ├── ipv6.ts
│   └── *.test.ts
├── dns/
│   ├── resolvers.ts            # DoH endpoint config, primary/fallback selection
│   ├── query.ts                # fetch + response normalization (framework-agnostic;
│   │                           # takes a fetch impl so it's testable + reusable)
│   └── *.test.ts
├── mac/
│   ├── parse.ts                # normalization, OUI extraction, bit flags
│   ├── vendor.ts                # vendor lookup (local dataset or adapter interface)
│   └── *.test.ts
└── shared/
    ├── analytics.ts             # query-param redaction rules (§8.2 of brief)
    └── clipboard.ts              # copy-with-confirmation helper
tools/
└── registry.ts                 # ToolDefinition[] — the single source of truth
```

### Structure Rationale

- **`tools/registry.ts` lives outside `app/`:** it is data, not routing. Keeping it framework-agnostic means it can be imported by `app/sitemap.ts`, `app/page.tsx`, nav components, and (later) a `@packetory/core` package without pulling in Next.js-specific code. This is exactly what the brief proposes in §8 — the research confirms rather than changes it.
- **`lib/<tool>/` mirrors `app/tools/<tool>/`:** 1:1 naming makes the boundary obvious and keeps future API-route extraction mechanical — a new `app/api/<tool>/route.ts` just imports the same `lib/<tool>/*` functions the page's client component already calls.
- **Each tool page splits into `page.tsx` (server) + `<tool>-tool.tsx` (client):** this is the load-bearing pattern for satisfying "static-first, client components only where interaction requires them" (brief §8/constraints) while still supporting bookmarkable URL state — see Pattern 1 below.
- **`components/tools/` holds cross-tool chrome** (CopyButton, ResultPanel, FAQ, RelatedTools) so every new tool reuses the same building blocks instead of re-implementing copy/confirm/keyboard behavior per tool.
- **`lib/shared/analytics.ts` is a dedicated module**, not inline per-tool code, because the redaction rule (never send MACs/private IPs/hostnames to analytics) is a cross-cutting policy that every tool's client component must call through the same choke point — centralizing it means a single audit point rather than four ad-hoc implementations.

## Architectural Patterns

### Pattern 1: Server shell / Client island split for URL-bookmarkable tools

**What:** The route's `page.tsx` stays a Server Component that does *not* declare a `searchParams` prop and does *not* read `useSearchParams`. It renders static SEO content (title context, worked examples, FAQ) plus a single Client Component "island" that owns all interactivity, including reading/writing the URL query string.

**When to use:** Every tool in this project (UUID, Subnet, DNS, MAC) — all four need zero-effort default results on load (static-renderable) *and* bookmarkable state (`?cidr=`, `?name=&type=`), which is exactly the combination that breaks if `searchParams` is read at the page level.

**Trade-offs:** Keeps the route statically generated (fast TTFB, cacheable, good Lighthouse) and avoids the "any `searchParams` read forces the whole route dynamic" trap. Cost: the island must handle the "no query param yet" case client-side (i.e., the *default* UUID/CIDR/example is computed in the client component on mount, not baked into server HTML) — acceptable here because generation is inherently a client action anyway (crypto RNG, or trivially reproducible IP math), and a one-line skeleton avoids CLS.

**Example:**
```tsx
// app/tools/subnet/page.tsx — Server Component, static
import { getToolBySlug } from "@/tools/registry";
import { SubnetTool } from "./subnet-tool";

export async function generateMetadata() {
  const tool = getToolBySlug("subnet");
  return { title: tool.name, description: tool.description /* ... */ };
}

export default function SubnetPage() {
  return (
    <article>
      <h1>IP Subnet Calculator</h1>
      <SubnetTool />           {/* client island, no searchParams here */}
      <RelatedTools slug="subnet" />
      <FaqSection slug="subnet" />
    </article>
  );
}
```
```tsx
// app/tools/subnet/subnet-tool.tsx
"use client";
import { useQueryState } from "nuqs";
import { calculateSubnet } from "@/lib/subnet/ipv4";

export function SubnetTool() {
  const [cidr, setCidr] = useQueryState("cidr", { defaultValue: "10.20.0.0/20" });
  const result = calculateSubnet(cidr); // pure lib/ call, no network
  // ...render input + result, setCidr() on change (shallow, no server round trip)
}
```

### Pattern 2: Registry-driven derived UI (nav, cards, sitemap, related-tools)

**What:** `tools/registry.ts` exports one typed array. Every place that currently would need per-tool hand-editing (nav links, landing-page cards, `sitemap.ts`, "related tools" widget, future search/command-palette) instead imports the registry and derives its UI via `.map()`/`.filter()`.

**When to use:** Always, from the first tool onward — this is the mechanism that makes "adding a tool = new module + one registry entry" actually true. If any shared component hardcodes a tool's slug/name/href, the registry pattern is broken for that surface.

**Trade-offs:** Slightly more indirection for a 1-tool site; pays off immediately at 2 tools and compounds at 4+. The registry itself has zero framework imports, so it doubles as the shape the future `@packetory/core` package (brief §12.1) would also expose.

**Example:**
```ts
// tools/registry.ts
export type ToolDefinition = {
  slug: string; name: string; shortName: string; description: string;
  category: "network" | "dns" | "web" | "encode" | "generate";
  keywords: string[]; icon: string; status: "active" | "beta" | "planned";
  clientOnly: boolean; featured: boolean;
};

export const tools: ToolDefinition[] = [
  { slug: "uuid", name: "UUID Generator", shortName: "UUID", /* ... */ status: "active" },
];

export const getToolBySlug = (slug: string) => tools.find(t => t.slug === slug);
export const relatedTools = (slug: string, n = 3) =>
  tools.filter(t => t.slug !== slug && t.status === "active").slice(0, n);
```
```ts
// app/sitemap.ts
import { tools } from "@/tools/registry";
export default function sitemap() {
  return tools
    .filter(t => t.status === "active")
    .map(t => ({ url: `https://packetory.dev/tools/${t.slug}`, changeFrequency: "monthly" }));
}
```

### Pattern 3: Framework-agnostic `lib/` core, called identically from client, server, and future API

**What:** Every tool's domain logic (`lib/<tool>/*.ts`) is plain TypeScript with typed inputs/outputs and no `next/*` or `react` imports. Client components call it directly (UUID gen, subnet math, MAC parsing — pure, synchronous, in-browser). Where a Route Handler is needed (MAC vendor proxy today; a future public API), the route handler imports the *same* function rather than reimplementing it.

**When to use:** Every tool, from day one — this is a stated hard requirement in both the brief (§8, §12.1) and PROJECT.md ("website and API stay one codebase"). Retrofitting it later means an extraction/refactor pass across every tool.

**Trade-offs:** Requires slight discipline (no `fetch` calls hardcoded to browser-only APIs inside `lib/` — pass a fetch implementation or keep DoH-calling code isolated so it also runs in a Route Handler/edge function later). Payoff: unit tests run without spinning up Next.js, and the eventual `@packetory/core` extraction (brief §12.1) is a copy, not a rewrite.

**Example:**
```ts
// lib/uuid/generate.ts — no Next.js/React imports anywhere
export type UuidVersion = "v4" | "v7";
export function generateUuid(version: UuidVersion = "v4"): string { /* ... */ }
export function generateBatch(count: number, version: UuidVersion): string[] { /* ... */ }
```
```ts
// app/api/uuid/route.ts — thin adapter, only needed once a public API ships
import { generateBatch } from "@/lib/uuid/generate";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  return Response.json(generateBatch(Number(searchParams.get("count") ?? 1), "v4"));
}
```

## Data Flow

### Request Flow (local-first tool, e.g. UUID/Subnet/MAC)

```
[Browser navigates to /tools/subnet?cidr=10.0.0.0/24]
    ↓
[Vercel Edge/CDN serves statically generated HTML for /tools/subnet]  ← page.tsx has NO searchParams read
    ↓ (hydration)
[SubnetTool client island mounts] → reads ?cidr= via nuqs (client-side, from window.location)
    ↓
[lib/subnet/ipv4.ts calculateSubnet(cidr)] → pure computation, no network call
    ↓
[Result rendered in-browser] ← [setCidr() on user input updates URL via history.replaceState, shallow]
```

### Request Flow (network-dependent tool, e.g. DNS Lookup)

```
[Browser navigates to /tools/dns?name=example.com&type=MX]
    ↓
[Static HTML shell served]  ← page.tsx still has no searchParams read
    ↓ (hydration)
[DnsTool client island mounts] → reads ?name=&type= via nuqs
    ↓
[debounce ~600-800ms on typed input; immediate on paste/Enter]
    ↓
[fetch(doH-primary-endpoint) with AbortController] → on failure/timeout → [fetch(doH-fallback)]
    ↓
[lib/dns/query.ts normalizes response] → TTL, resolver used, duration, NXDOMAIN/empty states
    ↓
[Result rendered] + [analytics: lib/shared/analytics.ts strips/redacts `name` before any event fires]
```

### State Management

```
URL query string (source of truth for shareable state)
    ↕ (nuqs useQueryState, shallow by default)
Client island local state (React useState/useReducer for transient UI: loading/error/copy-confirmed)
    ↓ (derived, not stored)
lib/ pure function output → rendered result
```

There is no global client-side state store (Redux/Zustand) — each tool's state is local to its island component and the URL. This matches the "each tool page works standalone" principle and avoids a cross-tool state layer that would only add coupling.

### Key Data Flows

1. **Registry → derived UI:** `tools/registry.ts` is read (never written to at runtime) by nav, landing cards, sitemap, related-tools, and per-page `generateMetadata`. One direction only — UI components never mutate or extend the registry at runtime.
2. **URL ↔ client island:** nuqs keeps `window.location.search` and component state in sync bidirectionally, shallow (no navigation) by default so local-first tools never trigger a server round trip just from typing.
3. **Client island → lib/ → result:** every tool's "generate/calculate/lookup" action ultimately calls a pure or async function in `lib/<tool>/`, never inlines domain logic in a component.
4. **Client island → analytics guard → analytics provider:** any interaction event passes through the shared redaction helper before being sent, so sensitive query param values (MACs, internal hostnames, private IPs, secrets) never reach the analytics vendor.

## Recommended Build Order (dependency chain)

This directly informs roadmap phase sequencing, and matches the build order already confirmed in PROJECT.md (UUID → Subnet → DNS → MAC):

1. **Shared shell + registry (Phase 0, before any tool)**
   - `tools/registry.ts` with the `ToolDefinition` type (even with only a `planned` UUID entry)
   - Root `layout.tsx` (theme, `<NuqsAdapter>`, global nav/footer components reading the registry)
   - `app/page.tsx` landing page rendering cards from the registry
   - `components/ui/*` primitives (Button, Input, CopyButton) and `components/tools/*` chrome (ResultPanel, FaqSection, RelatedTools) — built generically even though only one tool exists yet, because the second tool is where a hardcoded shell would first show cracks
   - `lib/shared/analytics.ts` redaction contract established before any tool sends events
   - **Why first:** every subsequent tool depends on this; changing the registry shape after 2+ tools exist means touching every tool.

2. **UUID Generator (first tool, validates the whole pattern end-to-end)**
   - `lib/uuid/generate.ts` (pure, zero external dependencies — matches PROJECT.md's stated rationale for going first)
   - `app/tools/uuid/page.tsx` + `uuid-tool.tsx` split
   - Registry entry flips `uuid` from `planned` → `active`
   - **Validates:** server/client split pattern, copy/download UX, registry-driven nav actually updates without touching other files.

3. **IP Subnet Calculator (second tool, validates URL-state pattern)**
   - `lib/subnet/ipv4.ts`, `lib/subnet/ipv6.ts` (pure, no external dependency — still local-first)
   - `app/tools/subnet/page.tsx` + `subnet-tool.tsx`, introduces `nuqs` and the `?cidr=` bookmarkable pattern for the first time
   - **Validates:** the searchParams-avoids-dynamic-rendering pattern (Pattern 1) under a real bookmarkable-state requirement; second registry entry proves the shell doesn't need per-tool edits.

4. **DNS Lookup (third tool, first external dependency)**
   - `lib/dns/resolvers.ts` + `lib/dns/query.ts` (async, DoH fetch, but still framework-agnostic — no Next.js imports, testable with a mocked fetch)
   - `app/tools/dns/page.tsx` + `dns-tool.tsx`: adds debounce, `AbortController`, loading/error/empty states, `?name=&type=` URL state
   - **Depends on:** resolver choice (deferred decision per PROJECT.md) — but the *architecture* (client-side fetch to a CORS-friendly DoH JSON endpoint, no API route needed) can be locked in now regardless of which resolver is finally chosen.

5. **MAC Address Inspector (fourth tool, first potential API route)**
   - `lib/mac/parse.ts` (pure, local-first: format normalization, OUI extraction, bit-flag detection — no network needed)
   - `lib/mac/vendor.ts` (adapter interface: local dataset lookup now, or a call the client makes if a proxy is needed)
   - Only if the launch vendor source requires a server-side key/CORS workaround: `app/api/mac-vendor/route.ts`, which imports `lib/mac/vendor.ts` — first proof that the API-route/core-logic separation (Pattern 3) actually works, ahead of the future public API milestone.
   - **Depends on:** vendor data source decision (deferred per PROJECT.md) — architecture accommodates either choice (local dataset = fully client-side; proxy = thin Route Handler over the same `lib/` function) without restructuring.

**Ordering rationale:** each tool after the first is chosen specifically to stress a *new* piece of the shared architecture (client/server split → URL state → external async data → API-route extraction) while reusing everything validated by the previous tool. This is a stronger reason for the order than "UUID is simplest" alone — it means by the time MAC ships, every architectural seam the roadmap needs has already been exercised once.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|---------------------------|
| 4 tools (v1 launch) | Structure as described above is sufficient; no code-splitting concerns beyond Next.js's automatic per-route bundling |
| 10-15 tools (near-term roadmap, §12 of brief) | Registry gains a `category` grouping already in the type; landing page groups cards by category; consider a `lib/index.ts` barrel per category if cross-tool imports emerge (e.g. shared IP-parsing utility used by both Subnet and a future WHOIS tool) |
| 20+ tools / public API traffic (post-v1, §12.1) | `lib/` is the natural extraction boundary for `@packetory/core` as an actual published package (npm workspace or separate repo); `app/api/*` routes become thin adapters with auth/rate-limiting middleware layered on top, still calling the same `lib/` functions the website uses |

### Scaling Priorities

1. **First bottleneck: registry sprawl.** Once 8-10 tools exist, a flat array is still fine, but grouping/derived views (by category, by status) should live as *functions over the registry* (`getToolsByCategory()`), not duplicated filtering logic scattered across components — keep this discipline from tool #2 onward so it never needs a refactor.
2. **Second bottleneck: `lib/` cross-tool duplication.** IP parsing/validation logic will likely be needed by Subnet, DNS (reverse lookups), and any future WHOIS/ping tool. Watch for copy-pasted CIDR/IP-validation code across `lib/subnet/` and `lib/dns/` — extract to `lib/shared/ip.ts` the moment a second tool needs the same primitive, not preemptively.

## Anti-Patterns

### Anti-Pattern 1: Reading `searchParams` directly in a tool's `page.tsx`

**What people do:** Destructure `searchParams` in the Server Component page (`export default function Page({ searchParams })`) to pre-render the result server-side "for SEO," e.g. rendering the subnet breakdown for `?cidr=` server-side.
**Why it's wrong:** This opts the entire route out of static generation — every request to `/tools/subnet` (even with no query string) is now server-rendered, defeating "static-first" and the 90+ Lighthouse target, and it doesn't even buy real SEO value here since these are interactive utility results, not crawlable content that needs to vary per query.
**Do this instead:** Keep `page.tsx` static (no `searchParams` prop), do all searchParams reading in the Client Component island via `nuqs`/`useSearchParams` inside a `Suspense` boundary (Pattern 1).

### Anti-Pattern 2: Hardcoding a tool's nav link, landing card, or sitemap entry outside the registry

**What people do:** Add the second tool by copy-pasting the first tool's `<Link>` in the nav component and adding a new `<Card>` in the landing page JSX, because it's "just one more line."
**Why it's wrong:** This is precisely the failure mode the brief's architecture intent calls out — by tool 3 or 4, nav/landing/sitemap/related-tools all drift independently, and "add a tool" silently regains its old cost of touching 4-5 files.
**Do this instead:** Every one of those surfaces must derive from `tools/registry.ts` via a shared helper (`getToolsByCategory`, `relatedTools`, etc.) from the very first tool onward — add the discipline before there's a second tool to prove it matters, not after.

### Anti-Pattern 3: Putting DNS/MAC network calls inside `lib/`-imported browser-only APIs without an adapter seam

**What people do:** Write `lib/dns/query.ts` using the global `fetch` and assume it always runs in the browser, or conversely write it assuming it always runs server-side with Node-only APIs.
**Why it's wrong:** Breaks the "same core logic callable by pages and future API routes" requirement (brief §12.1) — if `lib/dns/query.ts` only works in one runtime, the eventual API route (or an edge-runtime deployment) needs a parallel reimplementation, exactly the duplication the architecture is meant to prevent.
**Do this instead:** Use the standard `fetch` API (available in browser, Node 18+, and Edge runtime) with no runtime-specific globals, and keep resolver endpoint selection/config as plain data so both a client component and a Route Handler can call the same function with the same inputs.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|----------------------|-------|
| DNS-over-HTTPS resolver (primary + fallback) | Direct client-side `fetch()` to the resolver's JSON API (e.g. Cloudflare/Google-style DoH JSON, both CORS-enabled) — no `app/api` proxy needed | Resolver choice deferred per PROJECT.md; architecture (client-direct fetch) holds regardless of which resolver is chosen, since major DoH JSON endpoints are CORS-friendly |
| MAC vendor/OUI data | Either (a) local dataset bundled/generated at build time and queried fully client-side, or (b) `app/api/mac-vendor/route.ts` proxying a low-rate public API if a server-side key or CORS restriction requires it | Brief explicitly flags local-dataset as the preferred long-term model; architecture supports switching from (b) to (a) later by just changing what `lib/mac/vendor.ts` does internally — callers don't change |
| Future public API consumers | `app/api/<tool>/route.ts` Route Handlers importing `lib/<tool>/*` directly | Not built in v1; the `lib/` boundary is what makes this additive rather than a rewrite |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|----------------|-------|
| `tools/registry.ts` ↔ shell/landing/sitemap components | Direct import, read-only, one direction | Registry never imports from `components/` or `app/` — avoids circular deps |
| `page.tsx` (Server) ↔ `*-tool.tsx` (Client) | Composition via JSX children/props, not import-of-server-into-client | Server Component renders the Client Component as a child; static content (FAQ, examples) stays server-rendered around the island |
| Client island ↔ `lib/<tool>/*` | Direct function call (sync for UUID/Subnet/MAC parsing, async for DNS/vendor lookup) | No context/store layer between them — keeps each tool's data flow traceable in one file |
| Client island ↔ URL | `nuqs` `useQueryState`, shallow by default | Only DNS's explicit "refresh" action or a future non-shallow case should trigger a real navigation/server re-render |
| Any client component ↔ analytics | Must pass through `lib/shared/analytics.ts` redaction helper | Single choke point makes the privacy requirement (brief §8.2) auditable in one file rather than trusted per-tool |

## Sources

- [Next.js: searchParams / use-search-params reference](https://nextjs.org/docs/app/api-reference/functions/use-search-params) — MEDIUM confidence (official docs, cross-checked)
- [searchParams Forces Dynamic Rendering in Next.js — Route Separation Fix](https://www.buildwithmatija.com/blog/nextjs-searchparams-static-generation-fix) — MEDIUM confidence (cross-checked against official docs and a second independent article)
- [Fixing "Dynamic server usage" with URL/search params in Next.js](https://matthewmorek.com/journal/fixing-dynamic-server-usage-when-working-with-url-search-params-in-next-js) — MEDIUM confidence
- [nuqs — Type-safe search params state management for React](https://nuqs.dev/) and [nuqs GitHub](https://github.com/47ng/nuqs) — MEDIUM confidence (project docs, cross-checked against multiple independent write-ups)
- [nuqs Options docs — shallow routing](https://nuqs.dev/docs/options) — MEDIUM confidence
- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — MEDIUM confidence (official docs, cross-checked)
- [Vercel Academy: Client-Server Component Boundaries](https://vercel.com/academy/nextjs-foundations/client-server-boundaries) — MEDIUM confidence
- [Next.js: generateMetadata reference](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) — MEDIUM confidence (official docs)
- [Next.js: Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) — MEDIUM confidence (official docs)
- General community App Router structure articles (feature-sliced design, enterprise-pattern write-ups) — LOW-MEDIUM confidence, used only to corroborate conventions already implied by the brief's own proposed structure, not as the primary basis for any recommendation

Overall note on confidence: this project's own `project-brief.md` §8/§8.1 already specifies the registry pattern, `ToolDefinition` type, and folder layout in detail — this research validates that proposal against current (2026) Next.js App Router mechanics rather than inventing a new structure, and the one substantive addition beyond the brief is the explicit Server-shell/Client-island split (Pattern 1) needed to reconcile "static-first rendering" with "bookmarkable URL state," which is not spelled out in the brief but is required to satisfy both constraints simultaneously.

---
*Architecture research for: Packetory (multi-tool Next.js App Router utility site)*
*Researched: 2026-07-21*
