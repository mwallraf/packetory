# Roadmap: Packetory

## Overview

Packetory ships as five vertical-slice phases. Phase 1 builds the shared shell, tool registry, and cross-cutting infrastructure (theming, accessibility/keyboard framework, sitemap/robots, privacy notice, CI gate, and — critically — the analytics allow-list) that every tool depends on. Phases 2–5 then ship one complete, end-to-end working tool each, in the confirmed order UUID Generator → IP Subnet Calculator → DNS Lookup → MAC Address Inspector. This order isn't just "easiest first" — each tool after the first is chosen to stress a new architectural seam (client/server split → bookmarkable URL state → external async data with race conditions → API-route extraction) while reusing everything proven by the previous tool, so by the time MAC Inspector ships, every seam the roadmap needs has already been exercised once. The analytics allow-list is deliberately placed in Phase 1, before Phase 3 (Subnet), because Subnet is the first tool with sensitive URL state and retrofitting redaction after data collection is the costliest pitfall to recover from.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Shared Shell + Registry** - Landing page, registry-driven nav/sitemap, visitor-IP widget, theming, accessibility/keyboard framework, analytics allow-list, privacy notice, and CI gate (completed 2026-07-23)
- [x] **Phase 2: UUID Generator** - Instant v4/v7 UUID generation with batch, formatting, export, and copy — proves the tool-page pattern (completed 2026-07-24)
- [x] **Phase 3: IP Subnet Calculator** - Instant IPv4/IPv6 CIDR breakdown with full field output and bookmarkable URL state (completed 2026-07-24)
- [ ] **Phase 4: DNS Lookup** - Debounced, race-safe DNS-over-HTTPS lookups across common record types with transparent resolver attribution
- [ ] **Phase 5: MAC Address Inspector** - As-you-type MAC normalization, vendor lookup, and hedged bit-level classification

## Phase Details

### Phase 1: Shared Shell + Registry

**Mode:** mvp
**Goal**: Visitors can browse a fast, accessible, theme-able site shell that lists every tool from a single registry, see their own public IP, and trust that every future change is CI-gated, privacy-respecting, and analytics-safe — even before any tool exists.
**Depends on**: Nothing (first phase)
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05, SHELL-06, QUAL-03, QUAL-04, QUAL-05, QUAL-06, QUAL-07, QUAL-09
**Success Criteria** (what must be TRUE):

  1. Visitor lands on the homepage and sees every registered tool listed with name, description, and category, plus their own public IP address with a one-click copy button.
  2. Visitor can navigate to and between tool pages via consistent, instant navigation, and can toggle light/dark mode.
  3. Visitor on a 320px-wide mobile screen can use the site with no cumulative layout shift, and can operate global keyboard shortcuts (`/` focus, `Enter` execute, `Esc` clear) with logical focus order and accessible copy confirmations.
  4. `sitemap.xml`, `robots.txt`, and a published privacy notice are live, and no tracking cookies are set.
  5. A PR that adds a new tool touches only its own module plus one registry entry; PRs require passing tests/type-check/lint/build before merge, `main` auto-deploys, and a brand-new fake sensitive query param is excluded from analytics without any code change (allow-list, not block-list).

**Plans**: 5/5 plans executed
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Walking skeleton: Next.js scaffold + tool registry + landing card grid + light/dark theme toggle (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Registry-driven navigation + 320px mobile nav + reusable keyboard framework (wave 2)
- [x] 01-03-PLAN.md — Visitor-IP widget (forwarded-header route) + reusable copy-with-confirmation hook (wave 2)
- [x] 01-05-PLAN.md — Registry-derived sitemap/robots + CI merge gate + Vercel deploy (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Analytics allow-list redaction + cookie-free Vercel Analytics + privacy notice + footer (wave 3)

**UI hint**: yes

### Phase 2: UUID Generator

**Mode:** mvp
**Goal**: Users get an instant, customizable UUID (v4 or v7) with zero required input, full export/copy options, and complete SEO/FAQ content — establishing the tool-page pattern (Server-shell/Client-island split, per-tool metadata, worked examples/FAQ) that every later tool reuses.
**Depends on**: Phase 1
**Requirements**: UUID-01, UUID-02, UUID-03, UUID-04, UUID-05, UUID-06, QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):

  1. User loads `/tools/uuid` and immediately sees a generated UUID v4 with no input required and no hydration-mismatch flicker.
  2. User can switch generation to UUID v7, regenerate a single UUID, or generate a batch of 1–100.
  3. User can toggle uppercase/lowercase and hyphens on/off, and view/export the result as plain text, CSV, or JSON.
  4. User can copy a single value, copy all values, or download the result, each with a visible copy confirmation.
  5. The UUID tool page has a unique title, meta description, canonical URL, and Open Graph tags, plus a worked example and genuine FAQ content.

**Plans**: 4/4 plans executed
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Walking skeleton: instant v4 UUID on load (ssr:false loader) + one-click copy + registry flip (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Customization: v4/v7 toggle, live batch 1–100, regenerate, case/hyphen reformat, keyboard shortcuts (wave 2)
- [x] 02-03-PLAN.md — SEO/content: metadata + canonical/OG, worked example, FAQ prose + FAQPage JSON-LD (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md — Export: one selector drives text/CSV/JSON copy-all + download, plus per-value copy (wave 3)

**UI hint**: yes

### Phase 3: IP Subnet Calculator

**Mode:** mvp
**Goal**: Users get instant, mathematically correct IPv4/IPv6 subnet breakdowns from CIDR input, with every field individually copyable and the result bookmarkable/shareable — the first tool to introduce URL-state and BigInt-safe domain math.
**Depends on**: Phase 2
**Requirements**: SUBNET-01, SUBNET-02, SUBNET-03, SUBNET-04, SUBNET-05, SUBNET-06, SUBNET-07
**Success Criteria** (what must be TRUE):

  1. User loads `/tools/subnet` and sees a sensible example CIDR already calculated, with IPv4 vs. IPv6 auto-detected.
  2. Entering an invalid CIDR shows inline validation with no page reload or popup error.
  3. A valid IPv4 CIDR returns network address, broadcast address, first/last usable host, usable host count, subnet mask, wildcard mask, binary representation, and reverse DNS zone; a valid IPv6 CIDR returns normalized prefix, RFC-5952-compliant compressed and expanded notation, first/last address, address count, reverse DNS zone, and /48–/64 subdivision options — correct at boundary prefixes (/31, /32, /127, /128) and at large prefixes requiring BigInt math.
  4. Every output value has its own copy button.
  5. The current CIDR is reflected in the URL, and pasting a shared/bookmarked subnet URL into a fresh browser tab reproduces the exact same result.

**Plans**: 5/5 plans executed
Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Walking skeleton: IPv4 core breakdown on load + per-field copy + inline validation + `?cidr=` URL state + registry flip (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — IPv4 completeness: RFC-5952 + both-family reverse-DNS modules + IPv4 reverse-DNS field (wave 2)
- [x] 03-05-PLAN.md — SEO/content: metadata + canonical/OG + worked example + FAQ + FAQPage JSON-LD (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-03-PLAN.md — IPv6 family: 128-bit BigInt math + RFC-5952 grid + `ip6.arpa` reverse-DNS (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 03-04-PLAN.md — IPv6 subdivisions: bounded /48–/64 option list + clickable replace-CIDR pills (wave 4)

**UI hint**: yes

### Phase 4: DNS Lookup

**Mode:** mvp
**Goal**: Users get fast, accurate, race-condition-free DNS answers across common record types via DNS-over-HTTPS, with transparent resolver attribution and clearly distinguished result/error states — the first tool with an external async dependency.
**Depends on**: Phase 3
**Requirements**: DNS-01, DNS-02, DNS-03, DNS-04, DNS-05, DNS-06, DNS-07, DNS-08, DNS-09, DNS-10, QUAL-08
**Success Criteria** (what must be TRUE):

  1. User loads `/tools/dns` and sees a preselected demonstration domain already resolved.
  2. Pasting a domain or pressing Enter resolves immediately; typing resolves after a ~600–800ms debounce; an explicit refresh control re-runs the lookup.
  3. Results display A/AAAA/MX/TXT/NS/CNAME values with TTL, which resolver (primary or fallback) produced the answer, and lookup duration — fallback triggers only on genuine primary-resolver failure, never silently on a legitimate empty/NXDOMAIN result.
  4. NXDOMAIN, empty-NOERROR, invalid-input, rate-limited, and resolver-unavailable states each render a distinct, clearly worded message, and a slower earlier response can never overwrite a newer result on screen (verified under simulated out-of-order resolution).
  5. The current domain and record-type state is reflected in the URL and can be bookmarked/shared.

**Plans**: 1/3 plans executed
Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Walking skeleton: demo domain (cloudflare.com/A) auto-resolves end-to-end over DoH with primary→fallback, all 6 record types, debounce/paste/Enter/refresh, AbortController race-safety, resolver badge + duration, per-record copy, `?name=&type=` URL state, registry flip (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 04-02-PLAN.md — Error-state matrix (QUAL-08): 5 distinct inline states (invalid-input, NXDOMAIN, empty-NOERROR, rate-limited, resolver-unavailable) with Try-again, record-type display completeness, out-of-order race E2E (wave 2)
- [ ] 04-03-PLAN.md — SEO/content: metadata + canonical/OG + hand-verified worked example + FAQ (incl. D-02 Cloudflare/Google resolver disclosure) + FAQPage JSON-LD + privacy-notice disclosure (wave 2)

**UI hint**: yes

### Phase 5: MAC Address Inspector

**Mode:** mvp
**Goal**: Users get instant, accurate MAC address normalization, vendor identification, and hedged bit-level classification for any common MAC format, entirely as they type — the first tool to prove the API-route/core-logic separation ahead of a future public API.
**Depends on**: Phase 4
**Requirements**: MAC-01, MAC-02, MAC-03, MAC-04, MAC-05, MAC-06, MAC-07, MAC-08, MAC-09, MAC-10
**Success Criteria** (what must be TRUE):

  1. As the user types a MAC address in any common separator format (colon, dash, dot, none), it's normalized live and all normalized format variants are displayed.
  2. Vendor/organization and OUI prefix are shown when known from the OUI, without shipping the full vendor dataset to the client.
  3. Locally- vs. universally-administered (U/L) and unicast vs. multicast (I/G) addressing are identified, and likely-randomized/private addressing is flagged as "likely," never asserted as certain fact.
  4. Bit-level classification (OUI, U/L, I/G, randomized-likelihood) still works and shows useful output even when vendor lookup fails or is unavailable.
  5. User can copy individual fields or the complete result, and full MAC addresses are never sent to analytics.

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|-----------------|--------|-----------|
| 1. Shared Shell + Registry | 5/5 | Complete    | 2026-07-23 |
| 2. UUID Generator | 4/4 | Complete    | 2026-07-24 |
| 3. IP Subnet Calculator | 5/5 | Complete    | 2026-07-24 |
| 4. DNS Lookup | 1/3 | In Progress|  |
| 5. MAC Address Inspector | 0/TBD | Not started | - |
