# Project Research Summary

**Project:** Packetory
**Domain:** Network/infrastructure engineer utility site — multi-tool suite (UUID Generator, IP Subnet Calculator, DNS Lookup, MAC Address Inspector) built on Next.js App Router + TypeScript + Tailwind, hosted on Vercel
**Researched:** 2026-07-21
**Confidence:** HIGH

## Executive Summary

Packetory is a login-free, static-first, multi-tool utility site for network/infrastructure engineers, competing against a fragmented field of single-purpose tools (macvendors.com, uuidgenerator.net) and cluttered ad-heavy kitchen-sink sites (subnet-calculator.com, dnschecker.org). Expert practice in this space converges on a small set of well-validated patterns: a registry-driven architecture so every tool's nav/landing-card/sitemap entry derives from one typed data source rather than hand-edited per tool; a Server-shell/Client-island split per tool page so static SEO content stays statically rendered while a small client component owns interactivity and bookmarkable URL state (via `nuqs`); and a framework-agnostic `lib/<tool>/` layer holding all domain math so it's unit-testable in isolation and reusable from a future public API. The chosen build order — UUID → Subnet → DNS → MAC — is validated by research as also being the ideal way to incrementally stress-test each new architectural seam (client/server split, then URL state, then external async data with race conditions, then API-route extraction), not just "easiest first."

The recommended stack is lean and low-risk: `ip-address` and `uuid` (both zero-runtime-dependency, browser-safe npm packages) cover subnet math and UUID v4/v7 generation almost out of the box; DNS Lookup should call Cloudflare's DoH JSON endpoint as primary and Google's as fallback directly from the browser (both are CORS-open, live-verified); MAC/OUI vendor data should be compacted at build time from the public IEEE registry rather than shipped as a multi-MB dataset or a permanent third-party API dependency. Testing should split Vitest+fast-check (property-based tests for the math-heavy `lib/` modules) from Playwright (true end-to-end flows: keyboard shortcuts, DNS race conditions, URL-state round-trips).

The dominant risk cluster is *domain correctness masquerading as "looks done"*: naive JS Number math silently overflows on large IPv6 prefixes (must use BigInt), DoH APIs return HTTP 200 for NXDOMAIN (must parse the JSON `Status`/RCODE field, never infer success from HTTP status), and debounced DNS lookups can still race and display stale results without explicit `AbortController` + generation-counter guards. A second risk cluster is privacy/trust: bookmarkable URLs carrying MACs, internal hostnames, or private IPs must never leak into analytics (allow-list, not block-list, established before the first tool with sensitive URL state ships), and the MAC "randomized" heuristic must be hedged ("likely"), not asserted as fact. Both clusters are cheap to prevent up front and expensive to unwind later (analytics data leakage is explicitly flagged as the costliest pitfall to recover from), so they should be treated as phase-gating acceptance criteria, not follow-up polish.

## Key Findings

### Recommended Stack

Beyond the already-confirmed baseline (Next.js 16 App Router, React 19, TypeScript 7, Tailwind 4), the domain-specific additions are minimal and each has essentially no glue-code cost: `ip-address` (v10.2.0) maps almost 1:1 onto the brief's required subnet-calculator output fields (network/broadcast, wildcard mask, reverse-DNS zone, IPv6 canonical/compressed forms), and `uuid` (v14.0.1) covers both v4 and v7 with validation/parsing in one API, avoiding the need to mix native `crypto.randomUUID()` (v4-only) with a separate v7 package. DNS resolution needs no SDK — both Cloudflare and Google DoH JSON endpoints are directly `fetch()`-callable from the browser (live-verified CORS-open). MAC/OUI data should be compiled at build time from IEEE's public CSV registries into a compact, code-split lookup rather than shipped as a raw multi-MB dependency (`mac-oui-lookup`/`oui-data` are both 1-4MB unpacked — reference only, don't import directly).

**Core technologies:**
- `ip-address` (10.2.0) — IPv4/IPv6 parsing and subnet math — zero deps, browser-safe, near-direct match to required output fields
- `uuid` (14.0.1) — UUID v4 + v7 generation/validation — one API for both versions, RFC 9562-compliant, uses `crypto.getRandomValues`
- Cloudflare DoH (primary) + Google DoH (fallback) — DNS-over-HTTPS JSON endpoints — both CORS-open, no proxy needed, satisfies brief's explicit primary+fallback requirement
- Build-time IEEE OUI compaction — MAC vendor data — avoids shipping a multi-MB dataset or depending permanently on a third-party API
- Vitest + fast-check (+ `@fast-check/vitest`) — unit/property-based tests for `lib/` domain math — satisfies the brief's boundary/property-based testing NFR
- `@playwright/test` — end-to-end tests for keyboard flows, DNS race conditions, URL-state round-trips

### Expected Features

The brief's confirmed v1 scope was independently validated against the competitive landscape (macvendors.com, uuidgenerator.net, cidr.tools, dnschecker.org, mxtoolbox, and others) as correctly scoped — neither under- nor over-built.

**Must have (table stakes):**
- Instant default result on every tool with no button press required
- One-click copy with visible confirmation (per-field + copy-all)
- Inline validation only, no popup/alert-based errors
- Subnet calc full field breakdown (network, broadcast, usable range, mask, wildcard, reverse-DNS zone) for both IPv4 and IPv6 with CIDR auto-detect
- DNS lookup for A/AAAA/MX/TXT/NS/CNAME with per-record TTL and explicit NXDOMAIN/empty-result distinction
- MAC normalization accepting any common separator format, plus vendor/OUI lookup
- No login, each tool standalone with its own URL

**Should have (competitive differentiators):**
- MAC bit-level classification (U/L, I/G, randomized/private-MAC detection) — deeper than any market leader offers
- Consistent shared shell across all four tools with instant tool switching (registry-driven)
- Bookmarkable/shareable URL state applied consistently across every tool, not just one
- DNS Lookup showing resolver-used + fallback-triggered transparency, with AbortController-based stale-request cancellation
- Zero third-party requests / fully local computation for UUID and Subnet Calculator, explicitly marketed
- Cookie-free, privacy-oriented analytics with documented sensitive-param redaction
- Keyboard-first global interaction model (`/` focus, `Enter` execute, `Esc` clear)

**Defer (v1.x / v2+):**
- MAC address generator companion (reuses Inspector's bit logic, but different intent — defer to v1.x)
- Additional DNS record types (SOA, CAA, PTR, SRV) — defer until demand signal
- Full VLSM/subnet-splitting planner — defer to v2, already flagged in brief
- DNS propagation/multi-geo checker, domain health check (SPF/DKIM/DMARC), port scanning — explicit anti-features; conflict with local-first architecture or introduce abuse/liability risk

### Architecture Approach

The architecture centers on three reinforcing patterns validated against current (2026) Next.js App Router mechanics: (1) a single typed `tools/registry.ts` array as the one source of truth that nav, landing cards, sitemap, and related-tools all derive from via `.map()`/`.filter()`, so adding a tool never requires touching multiple hardcoded files; (2) a Server-shell/Client-island split per tool route — `page.tsx` stays static with no `searchParams` read, while a `'use client'` sibling component owns all interactivity and URL state via `nuqs` — which is the mechanism that reconciles "static-first, 90+ Lighthouse" with "bookmarkable URL state" (a tension the brief states but doesn't fully resolve, so this is the one substantive addition beyond the brief); and (3) a framework-agnostic `lib/<tool>/*.ts` layer with no Next.js/React imports, called identically from client components today and from future `app/api/<tool>/route.ts` handlers later, making that eventual API extraction additive rather than a rewrite.

**Major components:**
1. `tools/registry.ts` — single typed source of truth for every tool's metadata; zero framework imports; read-only, one-directional dependency for nav/landing/sitemap
2. Site shell (`components/shell`, `components/landing`) — global nav/footer/landing cards, all registry-derived
3. Tool page pairs (`app/tools/<slug>/page.tsx` + `<slug>-tool.tsx`) — static SEO shell composing a client interaction island
4. `lib/<tool>/*.ts` — pure, framework-agnostic domain logic (UUID gen, subnet math, DNS query normalization, MAC parsing) — the shared boundary between client, server, and future public API
5. `app/api/<tool>/route.ts` (only where needed, e.g. MAC vendor proxy) — thin adapters importing the same `lib/` functions the client calls directly

### Critical Pitfalls

1. **IPv6 Number-precision overflow** — JS `Number` safely represents only up to 2^53, but a `/48` has 2^80 addresses; use `BigInt` for all IPv6 address math and host-count calculations (and prefer it for IPv4 too, for consistency), verified with property-based tests at large prefixes.
2. **DoH RCODE vs. HTTP status confusion** — Cloudflare/Google DoH JSON APIs return HTTP 200 even for NXDOMAIN/SERVFAIL; the real outcome is the JSON body's `Status` RCODE field. Always parse it explicitly and map to distinct UI states — never infer success from `response.ok`.
3. **Stale async DNS requests overwriting fresh results** — debouncing the trigger doesn't guarantee response ordering across primary/fallback retries; use `AbortController` plus a request-generation counter as the primary correctness mechanism, verified with an automated out-of-order-resolution test.
4. **Silent resolver fallback masking differing results** — never switch resolvers silently on a legitimate NXDOMAIN/empty NOERROR; only fall back on actual network/timeout failure, and always surface which resolver produced the displayed answer.
5. **Sensitive data leaking into analytics via bookmarkable URL query params** — MACs, internal hostnames, and private IPs in `?cidr=`/`?name=`/MAC-equivalent params must never reach analytics; use an allow-list (not block-list) established centrally before the first tool with sensitive URL state ships, since this is flagged as the single costliest-to-recover-from pitfall in the whole research set.

## Implications for Roadmap

Research strongly converges on the build order already stated in PROJECT.md (UUID → Subnet → DNS → MAC), and independently justifies it as the sequence that incrementally exercises every architectural seam the roadmap needs, not merely "simplest first." Suggested phase structure:

### Phase 0: Shared Shell + Registry
**Rationale:** Every subsequent tool depends on this; changing the registry shape after 2+ tools exist means touching every tool. Must also establish the analytics allow-list contract before any tool with sensitive URL state ships.
**Delivers:** `tools/registry.ts` + `ToolDefinition` type, root layout with `NuqsAdapter`, registry-driven nav/landing/sitemap/robots, `components/ui/*` and `components/tools/*` chrome (CopyButton, ResultPanel, FaqSection, RelatedTools), `lib/shared/analytics.ts` allow-list redaction contract.
**Addresses:** consistent shared shell differentiator, keyboard-first interaction model foundation
**Avoids:** Pitfall — sensitive query params leaking into analytics (Pitfall 8); anti-pattern — hardcoding nav/landing/sitemap entries outside the registry

### Phase 1: UUID Generator
**Rationale:** Fully self-contained, no external dependencies — validates the Server-shell/Client-island pattern end-to-end and sets the hydration-safe client-island template every later tool copies.
**Delivers:** `lib/uuid/generate.ts` (v4 + v7, crypto.getRandomValues-based), `app/tools/uuid/page.tsx` + `uuid-tool.tsx`, batch (1-100) generation, case/hyphen toggles, text/CSV/JSON output, copy/copy-all/download.
**Uses:** `uuid` npm package
**Implements:** Pattern 1 (Server shell / Client island split), first proof of framework-agnostic `lib/` boundary
**Avoids:** Hydration mismatch from client-only crypto/random logic bleeding into SSR (Pitfall 9); UUID v7 randomness-source and batch-ordering mistakes (Pitfall 10)

### Phase 2: IP Subnet Calculator
**Rationale:** Second tool, introduces `nuqs`-based bookmarkable URL state (`?cidr=`) for the first time and validates that the second registry entry requires zero shell edits.
**Delivers:** `lib/subnet/ipv4.ts` + `lib/subnet/ipv6.ts` (BigInt-based math), CIDR auto-detect, full field breakdown including reverse-DNS zone, RFC 5952-compliant IPv6 compression, bookmarkable state.
**Uses:** `ip-address` npm package
**Implements:** Pattern 1 under a real bookmarkable-state requirement; Pattern 2 (registry-driven derived UI) proven at 2 tools
**Avoids:** IPv6 Number-precision overflow (Pitfall 1); /31, /32, /127, /128 boundary errors (Pitfall 2); non-RFC-5952-compliant IPv6 normalization (Pitfall 3)

### Phase 3: DNS Lookup
**Rationale:** Third tool, first external/async dependency — architecture (client-direct fetch to CORS-friendly DoH) can be locked in regardless of final resolver choice.
**Delivers:** `lib/dns/resolvers.ts` + `lib/dns/query.ts` (framework-agnostic, mockable fetch), debounce + paste/Enter immediate-trigger, AbortController cancellation, `?name=&type=` URL state, TTL/resolver-used/duration display.
**Uses:** Cloudflare (primary) + Google (fallback) DoH JSON endpoints
**Implements:** async data flow through the same `lib/`-boundary pattern established in Phases 1-2
**Avoids:** DoH RCODE-vs-HTTP-status confusion (Pitfall 4); stale/race-condition async requests (Pitfall 5); silent resolver fallback masking differing results (Pitfall 6)

### Phase 4: MAC Address Inspector
**Rationale:** Fourth tool, first potential API route — proves the API-route/core-logic separation (Pattern 3) ahead of any future public API milestone.
**Delivers:** `lib/mac/parse.ts` (normalization, OUI extraction, bit-flag detection — pure, local-first) and `lib/mac/vendor.ts` (adapter interface: local dataset or proxy), optional `app/api/mac-vendor/route.ts` only if the launch vendor source needs a server-side workaround.
**Uses:** Build-time-compacted IEEE OUI dataset (or interim API proxy as explicitly sanctioned stopgap)
**Implements:** Pattern 3 (framework-agnostic `lib/` core callable from client, server, and future API) proven under a real API-route need
**Avoids:** MAC locally-administered vs. randomized conflation (Pitfall 7, must hedge language); shipping full OUI dataset as client-side JSON (performance trap)

### Phase Ordering Rationale

- Each tool after the first is deliberately chosen to stress a *new* piece of shared architecture (client/server split → URL state → external async data with race conditions → API-route extraction) while reusing everything validated by the previous tool — a stronger rationale than "easiest first" alone.
- The shared shell must exist before any tool because the registry pattern breaks (per Anti-Pattern 2) if even one tool's nav/landing/sitemap entry is hand-coded, and this drift compounds silently by tool 3-4.
- The analytics allow-list contract is placed in Phase 0 rather than deferred, because Subnet (Phase 2) is the first tool with sensitive URL-state data, and retrofitting analytics redaction after data has already been collected is explicitly the costliest recovery scenario in the pitfalls research.
- Domain-correctness pitfalls (BigInt math, RCODE parsing, race conditions) are concentrated in the phase that introduces the relevant logic (Subnet → math pitfalls, DNS → async pitfalls) so they can be caught by that phase's own unit/property-based test suite rather than surfacing later as cross-cutting bugs.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (DNS Lookup):** DoH JSON format has no formal RFC (only wireformat is RFC 8484-standardized) — schema-tolerant parsing and resolver-specific quirks (e.g., TXT-record quoting differences) may need re-verification at plan time.
- **Phase 4 (MAC Address Inspector):** Vendor/OUI data-source decision (local dataset vs. interim API proxy) is explicitly deferred per PROJECT.md — needs a concrete decision and build-script design during phase planning.

Phases with standard patterns (skip research-phase):
- **Phase 0 (Shared Shell):** Registry pattern and Server/Client split are well-documented against current Next.js App Router docs, already validated here.
- **Phase 1 (UUID Generator):** `uuid` package API and hydration-safe client-island pattern are well-established, low ambiguity.
- **Phase 2 (IP Subnet Calculator):** `ip-address` package API and RFC 5952/RFC 3021/RFC 6164 boundary rules are well-documented standards, low ambiguity beyond implementation care.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every recommendation cross-checked against npm registry metadata, GitHub repo metadata, or live `curl` against production endpoints (Cloudflare/Google DoH, IEEE OUI registry) |
| Features | MEDIUM | Competitive-landscape survey across multiple real competitor tools, no primary-source vendor docs needed since this is a market-fit analysis, not an API integration |
| Architecture | MEDIUM | Next.js official docs authoritative for framework mechanics (searchParams, metadata, rendering); the registry/tool-composition pattern itself is a validated community convention cross-checked against the brief's own proposal, not an official Next.js pattern |
| Pitfalls | MEDIUM | Domain math/protocol facts (BigInt, RFC 5952, RFC 3021/6164, RFC 9562) are HIGH confidence — well-established standards cross-checked against multiple sources; ecosystem/tooling claims (DoH quirks, hydration articles) are MEDIUM — general web search, not curated docs |

**Overall confidence:** HIGH

### Gaps to Address

- **MAC/OUI vendor data source for launch:** Whether MAC Inspector ships with the build-time-compacted local dataset ready, or a temporary `/api/mac-vendor` proxy stopgap, is an explicit open decision — resolve during Phase 4 planning, with a tracked follow-up if the interim proxy path is chosen.
- **DoH JSON schema stability:** No formal RFC governs the DoH *JSON* format (only wireformat is standardized) — build a schema-tolerant parser in Phase 3 rather than assuming every field is always present, and re-verify resolver behavior (rate limits, retention policy) at implementation time.
- **Quad9 and other DoH providers:** Not fully verified as viable third options during this research pass — revisit only if Cloudflare+Google reliability becomes a production issue.

## Sources

### Primary (HIGH confidence)
- npm registry (`registry.npmjs.org`) direct API queries — version/size/dependency data for `ip-address`, `uuid`, `vitest`, `fast-check`, `@playwright/test`, and alternatives
- GitHub REST API — stars/last-push verification for `ip-address`, `uuid`, `fast-check`, and alternatives
- Live `curl` against `https://cloudflare-dns.com/dns-query`, `https://dns.google/resolve`, `https://standards-oui.ieee.org/oui/oui.csv` (2026-07-21)
- Next.js official docs (`nextjs.org/docs/app/*`) — searchParams, Server/Client Components, generateMetadata, project structure, Vitest testing guide
- IETF RFC lineage: RFC 8484 (DoH wireformat), RFC 5952 (IPv6 canonical form), RFC 3021/6164 (/31, /127 point-to-point), RFC 9562 (UUID)

### Secondary (MEDIUM confidence)
- Competitor tool surveys: macvendors.com, uuidgenerator.net, cidr.tools/cidrtools.net, dnschecker.org, mxtoolbox, subnet-calculator.com, networktools.dev, and ~15 others
- `nuqs.dev` docs and GitHub — URL state management patterns
- Community App Router structure articles corroborating (not driving) the registry/composition pattern
- Cloudflare community reports on DoH JSON quirks (TXT-record quoting)
- Hydration-mismatch articles (LogRocket, Medium, OneUptime), cross-checked against React/Next.js official hydration-error behavior

### Tertiary (LOW confidence)
- General web search on `crypto.randomUUID()` browser support and DoH rate-limit documentation — cross-referenced against primary-source checks wherever a specific factual claim mattered
- Cloudflare vs Google DNS retention-policy comparison blog — flagged for re-verification before final resolver selection

---
*Research completed: 2026-07-21*
*Ready for roadmap: yes*
