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

- ✓ Shared site shell: landing page, consistent navigation, tool registry (`tools/registry.ts`) driving nav/cards/sitemap — Phase 1
- ✓ CI: tests, type checking, linting, build validation required on PRs; Vercel preview deployments per PR, `main` auto-deploys to production — Phase 1 (live-verified: a deliberately failing commit was confirmed to block merge via `gh pr merge` rejection before being reverted; production deploy confirmed live at packetory.vercel.app)
- ✓ Privacy-oriented cookie-free analytics with redaction of sensitive query params — Phase 1 (`lib/analytics/redact.ts` safe-by-default allow-list); exercised for real in Phase 3 — `cidr` was deliberately never added to the allow-list, live-verified via grep and UAT, so the subnet CIDR never reaches analytics
- ✓ UUID Generator — v4 (default) and v7, single or batch (1–100) generation, uppercase/lowercase, hyphens on/off, plain text/CSV/JSON output, copy/copy-all/download — Phase 2 (`/tools/uuid`; 70 unit + 27 e2e tests; security-reviewed, 0 open threats)
- ✓ Global interaction model, first live instance — Phase 2: `/` focuses batch-count input, `Enter` regenerates (now guarded against double-firing when focus is on a native button/toggle), Ctrl/Cmd+C copies (disabled in batch view where no visible confirmation exists). Confirms the `useKeyboardShortcut` plumbing built in Phase 1; carried onto Subnet in Phase 3 (`/` focus, `Esc` reset, copy shortcut).
- ✓ Per-tool SEO, first live instance — Phase 2: `/tools/uuid` ships unique title/meta/canonical/OG tags, a worked v4/v7 example, and FAQPage JSON-LD (4 items) server-rendered and content-matched against the visible FAQ. Repeated for `/tools/subnet` in Phase 3 (5 FAQ items, worked IPv4+IPv6 examples); DNS/MAC still need their own instances.
- ✓ IP Subnet Calculator — CIDR input (IPv4 + IPv6, auto-detected), full network breakdown (network/broadcast/usable range/host count/masks/binary/reverse DNS zone for IPv4; normalized prefix/RFC-5952 compressed+expanded/first-last/count/reverse DNS/subdivision options for IPv6), inline validation, bookmarkable URL state (`?cidr=`) — Phase 3 (`/tools/subnet`; 130 unit + 39 e2e tests; BigInt end-to-end, correct at /31,/32,/127,/128 boundaries; security-reviewed, 0 open threats; 2 UAT items user-confirmed)
- ✓ DNS Lookup — A/AAAA/MX/TXT/NS/CNAME via DNS-over-HTTPS, Cloudflare primary + Google fallback with transparent resolver/duration attribution, debounced typed input (700ms) with instant paste/Enter/Refresh trigger, race-safe `AbortController` + sequence-token cancellation (both invalid- and valid-input edits cancel a stale in-flight request), 5-state QUAL-08 error matrix, bookmarkable URL state (`?name=&type=`) — Phase 4 (`/tools/dns`; 60 unit + 12 e2e tests; 4 plans incl. 1 gap-closure round; security review via `/gsd-secure-phase 4` still outstanding)

### Active

- [ ] MAC Address Inspector — format normalization as-you-type, vendor/OUI lookup, locally/universally administered + unicast/multicast + randomized-MAC detection, per-field and full-result copy
- [ ] Framework-agnostic core logic (`lib/`) per tool, independently unit-testable, shared by pages and future API routes — Phase 2 shipped the reference instance (`lib/uuid/{generate,format,export}.ts`); Phase 3 added `lib/subnet/{parse,ipv4,ipv6,format,reverse-dns,subdivide}.ts`; Phase 4 added `lib/dns/{types,validate,query,resolve,parse}.ts` (zero framework imports); remains an ongoing per-tool requirement for MAC
- [ ] Related-tool links (part of per-tool SEO) — not yet built on any tool page, including UUID, Subnet, and DNS
- [ ] Accessibility: full keyboard nav, contrast, labels, logical focus order, screen-reader announcements — shell-level focus order and focus-ring visibility manually verified in Phase 1 UAT; Phase 2 added accessible names to the UUID tool's Version/Export-format toggle groups; remains an ongoing per-tool requirement
- [ ] Light/dark mode, mobile usability down to 320px, CLS-free async states (loading/error/empty/success) — shell-level theme toggle and 320px CLS manually verified in Phase 1 UAT; Phase 3 user-confirmed 320px text wrapping (no clipping/scroll) for all subnet field values; remains an ongoing per-tool requirement

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
*Last updated: 2026-07-25 after Phase 4*
