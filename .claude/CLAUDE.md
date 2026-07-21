<!-- GSD:project-start source:PROJECT.md -->

## Project

**Packetory**

Packetory is a single, fast, no-friction website (packetory.dev) hosting a growing collection of small, free network and infrastructure utilities — starting with a UUID generator, IP subnet calculator, DNS lookup, and MAC address inspector. Each tool lives on its own page but shares one consistent landing page and navigation, so switching tools is instant and obvious. It's built for network engineers, sysadmins, DevOps/SRE professionals, and developers who need a quick answer and want to leave the site open as a bookmark.

**Core Value:** Zero-effort, instant results: every tool shows a useful output immediately with no login, no required input, and one-click copy — engineers should be able to get their answer and leave in seconds.

### Constraints

- **Tech stack**: Next.js (App Router) + TypeScript, Tailwind CSS, hosted on Vercel connected to GitHub — confirmed, not open for reconsideration
- **Rendering**: Static-first; client components only where interaction requires them; API routes used only where browser-only execution isn't appropriate
- **Local-first processing**: Calculations/transformations run in-browser when practical — external services only when the result inherently requires network data (DNS resolution, MAC vendor lookup)
- **No third-party requests** for tools that can operate fully locally (perf + privacy)
- **Performance**: Target 90+ Lighthouse across all categories; minimal JS per page; no avoidable CLS
- **Privacy**: No tracking cookies, no accounts, no PII in v1; sensitive URL query params (MACs, internal hostnames, private IPs, secrets) must be excluded/redacted from analytics
- **UX non-negotiables** (from brief, apply to every tool): zero-effort default result on load, minimum required input, one-click copy with visible confirmation everywhere, keyboard-first operation, no modal ads/popups/interstitials ever
- **Region**: Belgian/EU — final analytics and disclosure configuration must be confirmed before launch

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Already Confirmed (context only — not open for reconsideration)

| Technology | Latest observed version (2026-07-21) | Notes |
|------------|---------------------------------------|-------|
| Next.js (App Router) | 16.2.11 | Confirmed in PROJECT.md |
| React / React DOM | 19.2.8 | Ships with Next 16 |
| TypeScript | 7.0.2 | Confirmed |
| Tailwind CSS | 4.3.3 | Confirmed |
| ESLint | 10.7.0 | Use Next's built-in `eslint-config-next` on top of this |

### Core Domain Libraries

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|------------------|
| `ip-address` | 10.2.0 | IPv4 + IPv6 parsing, subnet math | GitHub: 612 stars, actively maintained (pushed 2026-06-28), **zero runtime dependencies**, 270KB unpacked, explicitly documented as browser-safe with no Node-only APIs. Its API maps almost 1:1 onto the brief's required subnet-calculator output fields: `startAddress()`/`endAddress()` (network/broadcast or first/last usable), `subnetMaskAddress()`, `wildcardMask()`, `reverseForm()` (reverse-DNS zone), `canonicalForm()` (IPv6 expanded) vs. default compressed `::` output. This is the single biggest reason it beats the alternatives below — it needs almost no glue code. |
| `uuid` | 14.0.1 | UUID v4 + v7 generation, formatting, validation | RFC 9562–compliant, 15.3k GitHub stars, 265M weekly downloads, **zero runtime dependencies**, browser-safe (uses `crypto.getRandomValues` under the hood, no Node `crypto` module import in the browser build), 66KB unpacked. One import gives you v4 *and* v7 plus `validate()`/`version()`/`parse()`/`stringify()` — one code path for the whole UUID tool instead of mixing a native API with a separate v7 package. |
| Native `crypto.randomUUID()` | — (built into the browser, no install) | NOT recommended as the primary generator — see "What NOT to Use" | Zero-byte, but v4-only (no v7 support), so using it would force a second dependency for v7 anyway. Keep it in mind only as a fallback/polyfill trigger check, not as the tool's core implementation. |

### DNS-over-HTTPS Resolver Strategy

| Choice | Endpoint | Verified Behavior |
|--------|----------|--------------------|
| **Primary: Cloudflare** | `GET https://cloudflare-dns.com/dns-query?name=<name>&type=<type>` with header `accept: application/dns-json` | Live-`curl`-verified (2026-07-21): returns `access-control-allow-origin: *` — directly callable from browser `fetch()`, no proxy/CORS workaround needed. JSON schema: `Status` (standard DNS RCODE, `0`=NOERROR, `3`=NXDOMAIN — confirmed via a live NXDOMAIN test), `Answer[]` with `name`/`type`/`TTL`/`data`. Cloudflare's documented indicative rate limit is ~1000 req/hour/IP — generous for a client-driven, human-paced lookup tool. |
| **Fallback: Google** | `GET https://dns.google/resolve?name=<name>&type=<type>` (no special header required) | Live-`curl`-verified: also returns `access-control-allow-origin: *`. Same de-facto JSON shape as Cloudflare (`Status`/`Answer[]`/`TTL`), so the DNS Lookup tool's response-parsing code can share one shape/type between both resolvers with no provider-specific branching for the common fields. |

### MAC/OUI Vendor Data

| Approach | Verdict | Details |
|----------|---------|---------|
| **Build-time OUI compaction (recommended)** | Use this | Live-verified: `https://standards-oui.ieee.org/oui/oui.csv` (MA-L / 24-bit registry, the classic "OUI") is public, unauthenticated, returns `Registry,Assignment,Organization Name,Organization Address` CSV, ~3.8MB raw, and its `Last-Modified` header shows same-day updates — IEEE refreshes it roughly daily. `MA-M` (28-bit, `oui28/mam.csv`) and `MA-S`/`OUI-36` (36-bit, `oui36/oui36.csv`) extend coverage for organizations that bought smaller blocks. Write a small Node script (run in CI on a schedule, e.g. weekly GitHub Action) that downloads these CSVs, normalizes/dedupes them, and emits a **compact integer-keyed lookup** (e.g. a `Map<number, string>`/typed array keyed by the numeric 24-bit prefix, JSON or a small binary format) checked into the repo or published as a build artifact. |
| **`mac-oui-lookup` npm package (v1.1.4)** | Reference only, don't ship raw | Zero deps, but **1.75MB unpacked** — bundles ~50K OUI entries as plain JSON. Fine as inspiration for parsing logic, too large to import directly into a client bundle without code-splitting. |
| **`oui-data` npm package (v1.1.571)** | Reference only, don't ship raw | The raw IEEE database as JSON, **4.06MB unpacked / ~1.2MB gzip**. Same bundle-size problem — good as an input source for your own build script (or study its normalization approach), bad as a runtime dependency. |
| **External API proxy (`/api/mac-vendor`)** | Acceptable for launch only | Brief explicitly allows this as an initial/interim step (§5.4) but flags it as **not the permanent architecture** — treat it as a stopgap only if the compaction script isn't ready in time for the MAC Inspector phase. |

### Testing Stack

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Vitest | 4.1.10 | Unit tests for framework-agnostic `lib/` modules + sync client components | Official Next.js docs (nextjs.org/docs/app/guides/testing/vitest) recommend it for App Router. Install: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`; config with `environment: 'jsdom'` + `tsconfigPaths()` + `react()` plugins. |
| `@testing-library/react` | 16.3.2 | Component-level tests where needed | Pairs with Vitest + jsdom. |
| `fast-check` | 4.9.0 | Property-based testing for subnet/address/MAC math | 5073 GitHub stars, actively maintained (pushed 2026-07-20), TypeScript-native, QuickCheck-style. This directly satisfies the brief's NFR: "subnet and address logic uses boundary and property-based tests where practical" (§10.2). |
| `@fast-check/vitest` | 0.4.1 | Official fast-check ↔ Vitest integration | Adds `test.prop()`/`it.prop()` extending Vitest's `test`/`it` with arbitraries; supports sync and async properties; integrates `beforeEach`/`afterEach` per generated run. Install alongside `fast-check`. |
| `@playwright/test` | 1.61.1 | End-to-end tests for full user flows | Use for anything Vitest structurally can't cover: async Server Components (a known current Vitest/React-ecosystem limitation, not Next-specific), full keyboard-interaction flows (`/` focus, `Enter` execute, `Esc` clear), and real DNS-lookup round trips through the debounce/`AbortController` logic. Can auto-start the Next dev/start server via its `webServer` config. |

- **Vitest + fast-check** own all of `lib/uuid`, `lib/subnet`, `lib/dns` (pure parsing/formatting logic), `lib/mac` — this is where nearly all business-logic risk lives, and it's 100% framework-agnostic so tests run fast with no DOM/browser needed for the math itself.
- **Vitest + Testing Library** own client components with meaningful conditional rendering (copy-confirmation states, loading/error/empty states).
- **Playwright** owns the small number of true end-to-end flows: keyboard shortcuts working across a real page, debounced DNS lookup not racing itself, bookmarkable URL state (`?cidr=`, `?name=&type=`) actually restoring tool state on load.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|--------------|-------------|--------------------------|
| `ip-address` | `ip-num` (v1.6.1, 175 GH stars, zero-dep, TS-native `IPv4CidrRange`/`IPv6CidrRange` with `.split()`) | If you specifically need programmatic subnet-splitting/VLSM-style range division as a first-class primitive — relevant for the *v2* "full VLSM planner" feature explicitly deferred in the brief. Revisit `ip-num` (or use it alongside `ip-address`) when that v2 feature is scheduled, since its `.split()` semantics are closer to what a VLSM planner needs. For v1's single-CIDR breakdown, `ip-address` requires less glue code. |
| `ip-address` | `netmask` (v2.1.1, 253 GH stars, 26KB, now supports both IPv4 and IPv6) | If you want the smallest possible footprint and don't need reverse-DNS-zone generation or IPv6 canonical/compressed dual output — `netmask`'s API is simpler but doesn't cover the brief's full IPv6 output list (compressed *and* expanded notation, reverse DNS zone) out of the box. |
| `uuid` package for both v4 and v7 | Native `crypto.randomUUID()` for v4 + a small dedicated `uuidv7` package (v1.2.1) for v7 | If minimizing bytes is critical (e.g. you're chasing the last few KB of a 90+ Lighthouse performance budget) and you're comfortable maintaining two separate code paths with slightly different APIs. Not recommended for v1: the complexity cost outweighs the marginal byte savings for a single small tool page. |
| Cloudflare primary / Google fallback for DoH | Any single resolver only | Never — the brief explicitly requires primary + fallback (§5.3), and single-resolver dependency is a real availability risk for a "leave-it-open bookmark" tool. |
| Build-time OUI compaction | Live external MAC-vendor API (e.g. macvendors.com's API, `maclookup-nodejs`/macaddress.io) | Only as a temporary stopgap if the compaction script can't ship in time for the MAC Inspector phase — the brief is explicit that this must not become the permanent architecture (§5.4), and it also conflicts with the "no third-party requests for tools that can operate locally" NFR (§10.1) once a local dataset is feasible. |
| Vitest + Playwright | Jest + Testing Library only (no Playwright) | If the team wants to avoid maintaining two test runners and is willing to accept weaker coverage of true browser-only behavior (async Server Components, real keyboard-flow E2E). Not recommended given the brief's explicit CI requirement for tests as a PR gate and the amount of keyboard-interaction behavior specified (§6). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Node.js `net`/`dns` core modules for subnet math or MAC parsing | Not available in the browser at all, and mixing Node-only logic into `lib/` breaks the brief's "framework-agnostic, independently testable, shared by pages and future API routes" requirement (the whole point is these modules must run client-side in a static-first app) | `ip-address` (pure JS/TS math, no Node APIs) |
| DNS resolution via a Node-only library (e.g. `dns.promises` or `dns2`) inside a client component or anything expected to run in the browser | Node-only APIs; would force every DNS lookup through a server round-trip even though DoH is designed to be called directly from the browser, adding latency and defeating the "instant" UX goal | Direct browser `fetch()` to Cloudflare/Google DoH JSON endpoints (both CORS-open, verified above) |
| Shipping `oui-data` or `mac-oui-lookup` as direct dependencies imported into a client component | 1.2–4MB of JSON in the client bundle destroys the "minimal JS per page" NFR and the 90+ Lighthouse target instantly | A build-time-compacted, size-minimized custom dataset (see MAC/OUI section above) |
| Relying on `crypto.randomUUID()` alone for the whole UUID tool | It only produces v4 — the tool explicitly requires v4 *and* v7 with unified output formatting (case, hyphens, batch, CSV/JSON) | The `uuid` npm package, which covers both versions with one API |
| A single DNS resolver with silent failover | The brief explicitly forbids silently switching resolvers when the result could differ (§5.3) — a user needs to know when a fallback was used | Explicit primary/fallback with the "resolver used" and "whether a fallback resolver was used" fields surfaced in the UI, as already scoped |
| An unauthenticated/uncapped scheduled job hitting `standards-oui.ieee.org` on every request or every deploy | Unnecessary load on a public registry and slower builds; the file only changes roughly daily | A time-boxed scheduled rebuild (e.g. weekly GitHub Action), not a per-request or per-deploy fetch |

## Installation

# Core domain libraries

# Testing

## Stack Patterns by Variant

- Use a minimal `/api/mac-vendor` route calling a public/free MAC-vendor API as an interim measure (explicitly sanctioned by the brief, §5.4).
- Treat this as technical debt with a tracked follow-up to replace it with the local dataset — don't let the interim become permanent, since it also violates the "no third-party requests for tools that can operate locally" NFR once a local dataset is feasible.
- Consider splitting to native `crypto.randomUUID()` (v4) + `uuidv7` (v7) only if profiling shows the `uuid` package's footprint is actually a measurable problem — don't pre-optimize for this in v1.
- Re-evaluate `ip-num`'s `.split()`-based range API alongside `ip-address` — the two aren't mutually exclusive; `ip-address` can stay for the core single-CIDR breakdown while `ip-num` (or hand-rolled logic on top of `ip-address`'s BigInt-friendly address representation) handles the splitting/planning UI.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|------------------|-------|
| `ip-address@10.2.0` | TypeScript 7.x, Next.js 16.x (App Router, both server and client components) | Zero deps — no transitive version conflicts to track. |
| `uuid@14.0.1` | Browser (via Web Crypto) and Node/Edge runtimes alike | Zero deps — safe to import in both client and server code paths, including Vercel Edge functions if a future API route needs UUIDs server-side. |
| `vitest@4.1.10` + `@vitejs/plugin-react` + `jsdom` | Next.js 16.x App Router unit tests | Cannot test async Server Components directly (current React-ecosystem-wide limitation) — route those to Playwright instead, not a version-compatibility bug to try to work around. |
| `fast-check@4.9.0` + `@fast-check/vitest@0.4.1` | `vitest@4.x` | Official integration package, versions here are both current-as-of-research — recheck compatibility if bumping either independently later. |
| `@playwright/test@1.61.1` | Next.js 16.x dev/start server via `webServer` config | No known conflicts; browsers must be installed separately via `npx playwright install`. |

## Sources

- npm registry (`registry.npmjs.org`) — direct API queries for latest version, unpacked size, and dependency count of: `ip-address`, `ip-num`, `netmask`, `uuid`, `uuidv7`, `mac-oui-lookup`, `oui-data`, `vitest`, `fast-check`, `@fast-check/vitest`, `@testing-library/react`, `playwright`, `@playwright/test`, `next`, `react`, `typescript`, `tailwindcss`, `eslint` — HIGH confidence (primary source).
- GitHub REST API — direct queries for stars/last-push date of: `beaugunderson/ip-address`, `ip-num/ip-num`, `rs/node-netmask`, `silverwind/oui`, `dubzzz/fast-check`, `uuidjs/uuid` — HIGH confidence (primary source).
- Live `curl` against `https://cloudflare-dns.com/dns-query`, `https://dns.google/resolve`, and `https://standards-oui.ieee.org/oui/oui.csv` (2026-07-21) — HIGH confidence (empirical, production endpoints).
- Web search (via built-in WebSearch tool) — general context on `crypto.randomUUID()` browser support, DoH rate-limit documentation, Vitest/fast-check integration patterns, and Next.js App Router testing conventions — MEDIUM confidence, cross-referenced against the primary-source checks above wherever a specific factual claim mattered.
- `nextjs.org/docs/app/guides/testing/vitest` (official Next.js docs, referenced via search results) — MEDIUM confidence.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
