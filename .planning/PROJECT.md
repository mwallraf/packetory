# Packetory

## What This Is

Packetory is a single, fast, no-friction website (packetory.dev) hosting a growing collection of small, free network and infrastructure utilities — starting with a UUID generator, IP subnet calculator, DNS lookup, and MAC address inspector. Each tool lives on its own page but shares one consistent landing page and navigation, so switching tools is instant and obvious. It's built for network engineers, sysadmins, DevOps/SRE professionals, and developers who need a quick answer and want to leave the site open as a bookmark.

## Core Value

Zero-effort, instant results: every tool shows a useful output immediately with no login, no required input, and one-click copy — engineers should be able to get their answer and leave in seconds.

## Business Context

- **Customer**: Network/infra engineers and developers looking up quick technical answers — no accounts, no billing in v1
- **Revenue model**: None in v1. Later: public developer API (free tier + paid tiers), then partner links, then restrained fixed-position advertising — in that preferred order
- **Success metric**: Traffic and repeat/bookmarked usage, not lead generation or data collection
- **Strategy notes**: Full brief preserved at `project-brief.md` (repo root) — the source document this PROJECT.md was distilled from

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Shared site shell: landing page, consistent navigation, tool registry (`tools/registry.ts`) driving nav/cards/sitemap/related-tools
- [ ] UUID Generator — v4 (default) and v7, single or batch (1–100) generation, uppercase/lowercase, hyphens on/off, plain text/CSV/JSON output, copy/copy-all/download
- [ ] IP Subnet Calculator — CIDR input (IPv4 + IPv6, auto-detected), full network breakdown (network/broadcast/usable range/host count/masks/binary/reverse DNS zone), inline validation, bookmarkable URL state (`?cidr=`)
- [ ] DNS Lookup — A/AAAA/MX/TXT/NS/CNAME via DNS-over-HTTPS with primary+fallback resolver, debounced typed input (~600–800ms), instant on paste/Enter, `AbortController` for stale-request cancellation, bookmarkable URL state (`?name=&type=`)
- [ ] MAC Address Inspector — format normalization as-you-type, vendor/OUI lookup, locally/universally administered + unicast/multicast + randomized-MAC detection, per-field and full-result copy
- [ ] Framework-agnostic core logic (`lib/`) per tool, independently unit-testable, shared by pages and future API routes
- [ ] Global interaction model: `/` focus input, `Enter` execute, `Esc` clear, keyboard-first throughout, accessible copy confirmations
- [ ] Per-tool SEO: unique title/meta/canonical/OG tags, worked examples, FAQ content, related-tool links; sitemap.xml + robots.txt
- [ ] Accessibility: full keyboard nav, contrast, labels, logical focus order, screen-reader announcements
- [ ] Privacy-oriented cookie-free analytics with redaction of sensitive query params (MACs, internal hostnames, private IPs, secrets/tokens)
- [ ] Light/dark mode, mobile usability down to 320px, CLS-free async states (loading/error/empty/success)
- [ ] CI: tests, type checking, linting, build validation required on PRs; Vercel preview deployments per PR, `main` auto-deploys to production

### Out of Scope

- User accounts or login — no-friction goal; nothing in v1 needs persistent identity
- Saved history across devices — local-only convenience storage (e.g. last 5 UUIDs) is fine; no server-side history
- Collection of PII — privacy-first positioning
- Payment processing, ads, affiliate/sponsored content — monetization deferred until usage data exists
- Non-English localization — v1 is English-only
- Full VLSM planner / subnet splitting — flagged as v2 in the brief
- Port scanning or arbitrary server-side network probing — abuse/liability risk, explicitly excluded
- Public API authentication, billing, metering — API is a post-v1 milestone once traffic justifies it
- UUID v1 — only v4/v7 supported unless later demand justifies it
- DNSSEC inspection, authoritative-path analysis — later DNS enhancement

## Context

- **Source document**: `project-brief.md` at the repo root is a comprehensive, near-final brief (design principles, per-tool specs, tech stack, NFRs, ops model). The user confirmed it's accurate as-is — treat it as the authoritative detail reference; this PROJECT.md is the distilled/living version GSD workflows act on.
- **Build order** (confirmed): UUID Generator → IP Subnet Calculator → DNS Lookup → MAC Address Inspector. UUID first because it's fully self-contained (no external data/services); DNS and MAC come later because they depend on external resolvers / vendor data.
- **Open decisions deferred to relevant phases** (per brief §15, user confirmed defer-not-block): primary/fallback DNS-over-HTTPS resolver choice (resolve during DNS Lookup phase), MAC vendor data source — API proxy at launch vs. locally maintained OUI dataset longer-term (resolve during MAC Inspector phase), ad slot placement (footer vs. sidebar — layout reserves space only, no v1 implementation), final logo/visual identity, and `@packetory` package-name registry availability (only matters once the public API/package is on the roadmap).
- **Architecture intent**: adding a new tool should mean creating its module + registering it in `tools/registry.ts` — never touching multiple shared nav components by hand.
- **Longer-term direction**: once free tools have meaningful traffic, expose a public API (`@packetory/core` style package) reusing the same core logic modules — website and API stay one codebase.
- **Automation model**: GSD-driven spec → plan → execute → verify → ship. Routine commits/PRs/preview deploys/reversible maintenance can proceed autonomously; human approval is required before domain/service purchases, first-time publishing on a new public channel, API pricing decisions, legal/privacy text, consent/cookie behavior changes, irreversible deletions/force-pushes, and any out-of-band merge.

## Constraints

- **Tech stack**: Next.js (App Router) + TypeScript, Tailwind CSS, hosted on Vercel connected to GitHub — confirmed, not open for reconsideration
- **Rendering**: Static-first; client components only where interaction requires them; API routes used only where browser-only execution isn't appropriate
- **Local-first processing**: Calculations/transformations run in-browser when practical — external services only when the result inherently requires network data (DNS resolution, MAC vendor lookup)
- **No third-party requests** for tools that can operate fully locally (perf + privacy)
- **Performance**: Target 90+ Lighthouse across all categories; minimal JS per page; no avoidable CLS
- **Privacy**: No tracking cookies, no accounts, no PII in v1; sensitive URL query params (MACs, internal hostnames, private IPs, secrets) must be excluded/redacted from analytics
- **UX non-negotiables** (from brief, apply to every tool): zero-effort default result on load, minimum required input, one-click copy with visible confirmation everywhere, keyboard-first operation, no modal ads/popups/interstitials ever
- **Region**: Belgian/EU — final analytics and disclosure configuration must be confirmed before launch

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build order: UUID → Subnet → DNS → MAC | UUID has zero external dependencies, fastest to ship end-to-end and validate the shared shell/registry pattern; DNS and MAC need external resolver/vendor-data decisions best made closer to their own phase | — Pending |
| Defer remaining open decisions (DNS resolver, MAC vendor source, ad slot, logo, package naming) to their owning phases rather than resolving upfront | Brief already flags these explicitly as open; resolving them now would block project setup on decisions better informed by phase-specific research | — Pending |
| Use project-brief.md as-is, distilled into PROJECT.md rather than rewritten from scratch | User confirmed the brief is accurate and complete; re-deriving it via cold questioning would be redundant | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-21 after initialization*
