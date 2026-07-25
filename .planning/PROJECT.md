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

## Current Milestone: v1.1 Production Domain & Landing Page Polish

**Goal:** Fix the landing page so tool cards are clickable, and cut the site over to the real packetory.dev domain.

**Target features:**
- Landing page grid cards link to their tool pages (parity with the nav menu, which already works)
- Site runs on custom domain packetory.dev via Vercel DNS (no Cloudflare, no per-tool subdomains)
- Canonical URLs/OG tags/sitemap/robots.txt/`SITE_URL` updated from packetory.vercel.app to packetory.dev
- Documented runbook for the manual steps (domain registration + Vercel dashboard DNS pointing) since registering/paying for a domain always requires human action (project-brief.md §14)

**Key context:** Domain not registered yet — user will do that manually. Vercel DNS confirmed over Cloudflare (avoids proxy/SSL conflicts, no extra account needed). Path-based `/tools/*` routing stays; no per-tool subdomains (would fragment SEO authority and break the shared-nav "switch tools instantly" value prop).

## Requirements

### Validated

- ✓ Shared site shell: landing page, consistent navigation, tool registry (`tools/registry.ts`) driving nav/cards/sitemap — Phase 1
- ✓ CI: tests, type checking, linting, build validation required on PRs; Vercel preview deployments per PR, `main` auto-deploys to production — Phase 1 (live-verified: a deliberately failing commit was confirmed to block merge via `gh pr merge` rejection before being reverted; production deploy confirmed live at packetory.vercel.app)
- ✓ Privacy-oriented cookie-free analytics with redaction of sensitive query params — Phase 1 (`lib/analytics/redact.ts` safe-by-default allow-list); exercised for real in Phase 3 — `cidr` was deliberately never added to the allow-list, live-verified via grep and UAT, so the subnet CIDR never reaches analytics
- ✓ UUID Generator — v4 (default) and v7, single or batch (1–100) generation, uppercase/lowercase, hyphens on/off, plain text/CSV/JSON output, copy/copy-all/download — Phase 2 (`/tools/uuid`; 70 unit + 27 e2e tests; security-reviewed, 0 open threats)
- ✓ Global interaction model, first live instance — Phase 2: `/` focuses batch-count input, `Enter` regenerates (now guarded against double-firing when focus is on a native button/toggle), Ctrl/Cmd+C copies (disabled in batch view where no visible confirmation exists). Confirms the `useKeyboardShortcut` plumbing built in Phase 1; carried onto Subnet in Phase 3 (`/` focus, `Esc` reset, copy shortcut).
- ✓ Per-tool SEO, first live instance — Phase 2: `/tools/uuid` ships unique title/meta/canonical/OG tags, a worked v4/v7 example, and FAQPage JSON-LD (4 items) server-rendered and content-matched against the visible FAQ. Repeated for `/tools/subnet` in Phase 3 (5 FAQ items, worked IPv4+IPv6 examples); DNS/MAC still need their own instances.
- ✓ IP Subnet Calculator — CIDR input (IPv4 + IPv6, auto-detected), full network breakdown (network/broadcast/usable range/host count/masks/binary/reverse DNS zone for IPv4; normalized prefix/RFC-5952 compressed+expanded/first-last/count/reverse DNS/subdivision options for IPv6), inline validation, bookmarkable URL state (`?cidr=`) — Phase 3 (`/tools/subnet`; 130 unit + 39 e2e tests; BigInt end-to-end, correct at /31,/32,/127,/128 boundaries; security-reviewed, 0 open threats; 2 UAT items user-confirmed)
- ✓ DNS Lookup — A/AAAA/MX/TXT/NS/CNAME via DNS-over-HTTPS, Cloudflare primary + Google fallback with transparent resolver/duration attribution, debounced typed input (700ms) with instant paste/Enter/Refresh trigger, race-safe `AbortController` + sequence-token cancellation (both invalid- and valid-input edits cancel a stale in-flight request), 5-state QUAL-08 error matrix, bookmarkable URL state (`?name=&type=`) — Phase 4 (`/tools/dns`; 60 unit + 12 e2e tests; 4 plans incl. 1 gap-closure round; security-reviewed, 0 open threats — `04-SECURITY.md` confirmed verified, correcting a prior stale note here that listed the review as still outstanding)
- ✓ MAC Address Inspector — live 4-format normalization (colon/dash/Cisco-dot/no-separator), OUI prefix + U/L/I/G bit-level classification with hedged randomization badge (never certain), vendor/organization lookup via a new server-side `/api/mac-vendor` Route Handler (OUI-only privacy boundary, debounced + session-cached, graceful degradation), per-field and full-result copy — Phase 5 (`/tools/mac`; 263 unit + 66 e2e tests; 3 plans; security-reviewed, 0 open threats — 1 deliberately accepted risk, no rate limiting on the vendor proxy; 7/7 UAT items user-confirmed 2026-07-25)
- ✓ Landing page grid cards link to their tool pages (LP-01) — full-card stretched-link click target (click anywhere on the card, not just the title), keyboard Tab/Enter activation, full-card hover/focus-visible accent ring reaching parity with the nav menu; `status:"planned"` cards stay inert — Phase 6 (`components/ToolCard.tsx`; 2 plans, 5 unit + 2 new e2e tests; human-verified ring encloses the full card at desktop and 320px 2026-07-25)

- ✓ Framework-agnostic core logic (`lib/`) per tool, independently unit-testable, shared by pages and future API routes — Phase 2 (`lib/uuid/*`), Phase 3 (`lib/subnet/*`), Phase 4 (`lib/dns/*`), Phase 5 (`lib/mac/{types,parse,format,classify,vendor}.ts`) — all zero framework imports, all unit-tested in isolation. Established as a consistent pattern across all 4 v1 tools.
- ✓ Per-tool SEO — unique title/meta/canonical/OG tags, worked example, and content-matched FAQPage JSON-LD — shipped for all 4 v1 tools: UUID (Phase 2), Subnet (Phase 3), DNS (Phase 4, `app/tools/dns/faq-data.ts`), MAC (Phase 5, `app/tools/mac/faq-data.ts` — includes D-01/D-02 privacy disclosure and D-09 randomization-wording FAQ)
- ✓ Light/dark mode, mobile usability down to 320px, CLS-free async states (loading/error/empty/success) — shell-level theme toggle and 320px CLS manually verified in Phase 1 UAT; Phase 3 user-confirmed 320px wrapping for subnet field values; Phase 5 user-confirmed 320px layout integrity for messy MAC input and long vendor-name wrap — re-verified per-tool across all 4 tool families (calculation-heavy, list-heavy, async-network, badge-heavy)

### Active

- [ ] Related-tool links (part of per-tool SEO) — not yet built on any tool page (UUID, Subnet, DNS, or MAC); candidate for v1.1
- [ ] Accessibility: full keyboard nav, contrast, labels, logical focus order, screen-reader announcements — shell-level focus order and focus-ring visibility manually verified in Phase 1 UAT; Phase 2 added accessible names to the UUID tool's Version/Export-format toggle groups; not re-audited per-tool since; candidate for a dedicated a11y pass in v1.1
- [ ] Public developer API (`@packetory/core` style package reusing the same `lib/` modules) — deferred to a post-v1 milestone per Business Context; no work started
- [ ] Build-time OUI dataset compaction to replace `/api/mac-vendor`'s interim API-proxy architecture — tracked tech debt from Phase 5 (CLAUDE.md's stated long-term direction); no work started
- [ ] Rate limiting on `/api/mac-vendor` — accepted risk (AR-05-01) at v1.0 launch; revisit if production traffic warrants it

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

- **v1.0 shipped** 2026-07-25: all 5 phases (Shared Shell, UUID, Subnet, DNS, MAC), 21 plans, 48/48 v1 requirements complete. ~12,500 LOC TypeScript across `app/`, `lib/`, `components/`. Live at packetory.vercel.app; CI-gated (`main` auto-deploys, PRs require tests/typecheck/lint/build/e2e). Every tool's core logic lives in a framework-agnostic `lib/` module with its own unit test suite; all 4 tools passed security review (0 open threats each) and user UAT with zero unresolved issues.
- **Known tech debt carried into v1.1+**: `/api/mac-vendor` interim API-proxy (build-time OUI dataset is the intended permanent architecture per CLAUDE.md); no rate limiting on that same route (accepted risk); no related-tool links yet; no dedicated per-tool accessibility re-audit since Phase 1's shell-level pass.
- **v1.1 progress**: Phase 6 (Landing Page Card Navigation, LP-01) shipped 2026-07-25 — the only remaining v1.1 work is Phase 7 (Production Domain Cutover to packetory.dev), which needs the user to manually register the domain and add it in the Vercel dashboard before its live-HTTPS/redirect success criteria can be confirmed. Phase 6's code review flagged two pre-existing/adjacent, non-blocking accessibility items (`CardTitle` renders a `<div>` not a heading element; `status:"beta"` tools are visually indistinguishable from `"active"`) — folded into the existing "dedicated per-tool accessibility re-audit" tech debt line above rather than tracked separately.
- **Source document**: `project-brief.md` at the repo root is a comprehensive, near-final brief (design principles, per-tool specs, tech stack, NFRs, ops model). The user confirmed it's accurate as-is — treat it as the authoritative detail reference; this PROJECT.md is the distilled/living version GSD workflows act on.
- **Build order** (confirmed): UUID Generator → IP Subnet Calculator → DNS Lookup → MAC Address Inspector. UUID first because it's fully self-contained (no external data/services); DNS and MAC come later because they depend on external resolvers / vendor data.
- **Open decisions deferred to relevant phases** (per brief §15, user confirmed defer-not-block): MAC vendor data source — API proxy at launch vs. locally maintained OUI dataset longer-term (resolve during MAC Inspector phase), ad slot placement (footer vs. sidebar — layout reserves space only, no v1 implementation), final logo/visual identity, and `@packetory` package-name registry availability (only matters once the public API/package is on the roadmap). Primary/fallback DNS-over-HTTPS resolver choice resolved in Phase 4 (Cloudflare primary, Google fallback).
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
| Build order: UUID → Subnet → DNS → MAC | UUID has zero external dependencies, fastest to ship end-to-end and validate the shared shell/registry pattern; DNS and MAC need external resolver/vendor-data decisions best made closer to their own phase | ✓ UUID (Phase 2), Subnet (Phase 3), DNS (Phase 4) shipped — MAC pending |
| Every state-transition path that can supersede an in-flight async request (not just the "obvious" ones) must cancel it — abort the controller + bump the sequence token — before scheduling or dispatching the next one | Phase 4 code review (CR-01) found the DNS-04 race guard wired into the invalid-input branches only; verification then caught that the *valid*-input branch had the identical gap (a slower stale response could still render after a newer valid edit). Two review passes were needed because the fix was applied by analogy to one path without auditing every path that reaches the same guarded state | ✓ Fixed (Phase 4, gap-closure plan 04-04) — audit ALL paths into `runLookup`/equivalent for MAC Inspector's async vendor lookup (Phase 5), not just the ones exercised by the first test written |
| URL state via raw History API (`window.history.replaceState`), never `router.replace()`/`next/navigation` | App Router has no Pages-Router-style shallow routing; `router.replace` re-triggers client navigation machinery on every keystroke — undesirable for a live-typing CIDR field. Established in Phase 3, reusable for DNS's `?name=&type=` state | ✓ Shipped (Phase 3) — reapply for DNS Lookup phase |
| BigInt end-to-end for all subnet/address math, zero `Number()` coercion | IPv6 128-bit addresses and counts overflow `Number`'s safe-integer range; fast-check property tests prove exact counts over the full prefix range (0-128) rather than spot-checking a few values | ✓ Shipped (Phase 3) |
| Reverse-DNS zone for non-aligned prefixes: truncate to nearest fully-covered boundary + explanatory note (not a full RFC 2317 classless-delegation name) | Simpler to implement and reason about than classless delegation; flagged as an unresolved planner assumption (A1) and explicitly confirmed as desired UX via UAT | ✓ Confirmed by user (Phase 3 UAT) |
| Subdivision suggestions: bounded ≤3-item `{48,56,64}` prefix list, never per-child enumeration | A wide IPv6 prefix (e.g. `/32`) could otherwise enumerate an astronomically large child list — DoS risk (T-03-04) and unusable UI | ✓ Shipped (Phase 3) |
| Defer remaining open decisions (DNS resolver, MAC vendor source, ad slot, logo, package naming) to their owning phases rather than resolving upfront | Brief already flags these explicitly as open; resolving them now would block project setup on decisions better informed by phase-specific research | — Pending |
| Use project-brief.md as-is, distilled into PROJECT.md rather than rewritten from scratch | User confirmed the brief is accurate and complete; re-deriving it via cold questioning would be redundant | ✓ Good |
| Vercel Framework Preset must be explicitly pinned via `vercel.json` (`{"framework":"nextjs"}`) rather than relying on dashboard auto-detection | Dashboard defaulted to "Other" (static) on project creation, causing every deploy to fail looking for a `public/` output dir | ✓ Fixed (Phase 1) |
| CI must pin the npm version to match the committed lockfile's origin | GitHub Actions' bundled npm (10.9.8) failed `npm ci` against a lockfile generated with local npm 11.10.1 | ✓ Fixed (Phase 1) |
| GitHub branch protection requires an explicit `required_status_checks` + `pull_request` ruleset rule, not just deletion/non-fast-forward | Initial ruleset only blocked deletion/force-push, silently allowing merges/pushes with red CI; verified live by pushing a deliberately failing commit and confirming `gh pr merge` was rejected before fixing | ✓ Fixed (Phase 1) |
| Keyboard-shortcut hook (`useKeyboardShortcut`) ships as unbound, tested plumbing in Phase 1 rather than being wired to a no-op target | Landing page has no primary input for `/` to focus until Phase 2's first tool page exists | ✓ Went live (Phase 2) |
| Every tool page follows a Server-shell + Client-island split (`page.tsx` server component wraps a `next/dynamic(..., { ssr: false })` loader) | Client-random values (UUIDs) baked into SSR HTML would hydration-mismatch; established as the reusable pattern for Subnet/DNS/MAC too | ✓ Established (Phase 2) |
| Global `Enter` shortcut must ignore native interactive targets (buttons, `role="radiogroup"` toggles) | Without a focus guard, `Enter` on a focused Copy/Download/toggle button double-fires: the button's own click *and* the global regenerate handler, desyncing what's copied/downloaded from what's displayed — found by code review (CR-01), fixed in `useKeyboardShortcut` | ✓ Fixed (Phase 2) — apply the same guard to every future tool with a global `Enter` handler |
| CSV export needs no escaping library when the exported alphabet structurally can't start a spreadsheet formula or break CSV structure | UUID output is hex digits + hyphen only, so `=`/`+`/`@`/comma/quote/newline injection is impossible; accepted as a documented risk (T-02-06) rather than adding a dependency — re-evaluate per-tool if a future export includes free-text/user-derived fields | ✓ Accepted (Phase 2) |
| MAC vendor lookup ships as a server-side Route Handler (`app/api/mac-vendor/route.ts`) proxying to `api.maclookup.app`, sending only the 6-hex OUI — never the full MAC | Brief's open decision (API proxy vs. local OUI dataset) resolved during Phase 5 planning in favor of the interim API-proxy path (CLAUDE.md §MAC/OUI Vendor Data); this is also the phase's signature architectural seam proving API-route/core-logic separation ahead of a future public API | ✓ Shipped (Phase 5) — build-time OUI dataset compaction remains the intended permanent architecture per CLAUDE.md; API proxy is explicit interim tech debt, not yet scheduled |
| No rate limiting added to `/api/mac-vendor` for v1 | maclookup.app's own unauthenticated ceiling (10 req/sec, 25K/6h) plus low expected traffic make an app-level limiter unnecessary; a naive in-memory/IP-based limiter was explicitly considered and rejected (would misuse `parseForwardedIp.ts`, whose docstring forbids use in security decisions) | ✓ Accepted (Phase 5, T-05-03/AR-05-01) — revisit if production traffic suggests otherwise; needs an infra decision (Vercel KV/Upstash or Firewall rules) if ever added |
| Every async-superseding path must cancel its predecessor (abort + sequence token) — carried forward from the Phase 4 lesson, now applied to MAC's vendor lookup | Phase 4 needed two review passes because the fix for DNS-04's race guard was applied to only the "obvious" invalid-input path first, missing the valid-input path that reached the same guarded state | ✓ Shipped correctly on the first pass (Phase 5) — `MacTool.tsx` audited all paths into vendor lookup (typing/debounce, new valid paste, demo-on-load, Esc-reset) up front, per the Phase 4 retrospective decision above |

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
*Last updated: 2026-07-25 after v1.1 milestone started*
