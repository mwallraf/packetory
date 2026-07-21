# Requirements: Packetory

**Defined:** 2026-07-21
**Core Value:** Zero-effort, instant results — every tool shows a useful output immediately with no login, no required input, and one-click copy.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Shell (Shared shell, registry, landing page)

- [ ] **SHELL-01**: Visitor sees a landing page listing all tools with name, description, and category, sourced from a single tool registry (`tools/registry.ts`)
- [ ] **SHELL-02**: Every tool page is reachable via consistent, instant navigation
- [ ] **SHELL-03**: Visitor's own public IP address is displayed on the landing page with a one-click copy button
- [ ] **SHELL-04**: Adding a new tool requires only a new module + registry entry — no manual edits to nav, cards, sitemap, or related-tools components
- [ ] **SHELL-05**: Site supports light and dark mode
- [ ] **SHELL-06**: Site is usable at 320px mobile width with no cumulative layout shift when results appear

### UUID (UUID Generator)

- [ ] **UUID-01**: A UUID v4 is generated and displayed immediately on page load
- [ ] **UUID-02**: User can switch generation to UUID v7
- [ ] **UUID-03**: User can regenerate a single UUID or generate a batch of 1–100
- [ ] **UUID-04**: User can toggle uppercase/lowercase and hyphens on/off
- [ ] **UUID-05**: User can view/export output as plain text, CSV, or JSON
- [ ] **UUID-06**: User can copy a single value, copy all, or download the result

### SUBNET (IP Subnet Calculator)

- [ ] **SUBNET-01**: User can enter CIDR notation and have IPv4 vs IPv6 auto-detected
- [ ] **SUBNET-02**: Page pre-fills a sensible example CIDR and calculates immediately on load
- [ ] **SUBNET-03**: Invalid input is validated inline without page reload or popup errors
- [ ] **SUBNET-04**: IPv4 input returns network address, broadcast address, first/last usable host, usable host count, subnet mask, wildcard mask, binary representation, and reverse DNS zone
- [ ] **SUBNET-05**: IPv6 input returns normalized prefix, compressed and expanded notation, first/last address, address count, reverse DNS zone, and common subdivision options (/48–/64)
- [ ] **SUBNET-06**: Every output value is individually copyable
- [ ] **SUBNET-07**: Current CIDR state is reflected in the URL and can be bookmarked/shared (e.g. `/tools/subnet?cidr=...`)

### DNS (DNS Lookup)

- [ ] **DNS-01**: Page resolves a preselected demonstration domain on load
- [ ] **DNS-02**: Pasted domain input resolves immediately
- [ ] **DNS-03**: Typed input resolves after a ~600–800ms debounce; pressing Enter resolves immediately
- [ ] **DNS-04**: Outdated in-flight requests are cancelled via `AbortController` so stale results never overwrite newer ones
- [ ] **DNS-05**: User can trigger an explicit refresh
- [ ] **DNS-06**: Supports A, AAAA, MX, TXT, NS, and CNAME record types
- [ ] **DNS-07**: Results display record values, TTL, resolver used, and lookup duration
- [ ] **DNS-08**: NXDOMAIN and empty-result states are distinguished and shown clearly
- [ ] **DNS-09**: Lookups use DNS-over-HTTPS with a primary resolver and an explicit fallback, never silently switching when results could differ
- [ ] **DNS-10**: Current domain + record-type state is reflected in the URL and can be bookmarked/shared (e.g. `/tools/dns?name=&type=`)

### MAC (MAC Address Inspector)

- [ ] **MAC-01**: User input is normalized as they type across common MAC formats
- [ ] **MAC-02**: Normalized format variants are displayed
- [ ] **MAC-03**: Vendor/organization is returned where known from OUI
- [ ] **MAC-04**: OUI prefix is identified and displayed
- [ ] **MAC-05**: Locally vs. universally administered addressing (U/L bit) is identified
- [ ] **MAC-06**: Unicast vs. multicast addressing (I/G bit) is identified
- [ ] **MAC-07**: Likely randomized/private MAC addressing is flagged, worded as a hedge ("likely") not a certainty
- [ ] **MAC-08**: Bit-level classification (MAC-04–MAC-07) still works and displays useful output when vendor lookup fails or is unavailable
- [ ] **MAC-09**: User can copy individual fields or the complete result
- [ ] **MAC-10**: Full MAC addresses are never captured in analytics

### QUAL (Quality, SEO, accessibility, privacy — cross-cutting)

- [ ] **QUAL-01**: Each tool page has a unique title, meta description, canonical URL, and Open Graph metadata
- [ ] **QUAL-02**: Each tool page includes a concise explanation, one or two worked examples, and genuine FAQ content
- [ ] **QUAL-03**: `sitemap.xml` and `robots.txt` are generated
- [ ] **QUAL-04**: Site supports full keyboard navigation (`/` focus, `Enter` execute, `Esc` clear, `Ctrl/Cmd+C` copy) with accessible copy confirmations
- [ ] **QUAL-05**: Color contrast, labels, and focus order meet accessibility standards; no interaction depends only on color
- [ ] **QUAL-06**: Analytics excludes/redacts sensitive query parameters (MACs, internal hostnames, private IP ranges, secrets/tokens) via an allow-list, not a block-list
- [ ] **QUAL-07**: No tracking cookies; a concise privacy notice is published
- [ ] **QUAL-08**: Validation and runtime errors appear inline and distinguish invalid input, no result, rate limiting, resolver failure, and temporary service unavailability
- [ ] **QUAL-09**: PRs require passing tests, type checking, linting, and build validation before merge; `main` auto-deploys to Vercel production; feature branches get preview deployments

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### MAC

- **MAC-V2-01**: MAC address generator companion (random MAC + vendor/OUI + unicast/multicast/local toggles), reusing the Inspector's bit-classification logic
- **MAC-V2-02**: Migrate MAC vendor lookup from API proxy to a locally maintained, build-time-compacted OUI dataset (already the brief's stated long-term direction)

### DNS

- **DNS-V2-01**: Additional DNS record types (SOA, CAA, PTR, SRV)
- **DNS-V2-02**: DNSSEC inspection and authoritative-path analysis

### SUBNET

- **SUBNET-V2-01**: Full VLSM / subnet-splitting planner

### New Tools

- **TOOLS-V2-01**: WHOIS/RDAP lookup
- **TOOLS-V2-02**: HTTP header inspector
- **TOOLS-V2-03**: TLS certificate inspector
- **TOOLS-V2-04**: Dedicated public-IP / user-agent inspector tool (beyond the v1 landing-page IP display)
- **TOOLS-V2-05**: Base64/URL encoders, hash and password generators

### Platform

- **API-V2-01**: Public developer API (`@packetory/core`) — free + paid tiers, key auth, metering, billing — once free-tool traffic justifies it

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts or login | Contradicts the zero-friction core value; nothing in v1 needs persistent identity |
| Saved history across devices | Local-only convenience storage (e.g. last 5 UUIDs) is fine; no server-side history |
| Collection of PII | Privacy-first positioning |
| Payment processing, ads, affiliate/sponsored content | Monetization deferred until usage data exists; no monetization implementation in v1 |
| Non-English localization | v1 is English-only |
| UUID v1 | Only v4/v7 supported unless later demand justifies it |
| Port scanning / arbitrary server-side network probing | Abuse and liability risk; explicitly excluded per brief |
| DNS propagation / multi-geo checker | Requires distributed backend infrastructure that conflicts with the local-first architecture; scope explosion vs. a single authoritative-ish lookup |
| Domain/mail health check (SPF/DKIM/DMARC audit) | Different audience and intent than a fast record lookup; better as its own future tool if ever built |
| Public API authentication, billing, metering | Post-v1 milestone once traffic justifies it (see API-V2-01) |

## Traceability

Populated during roadmap creation (`/gsd-new-project` → roadmap step).

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 41 ⚠️ (expected — roadmap not yet created)

---
*Requirements defined: 2026-07-21*
*Last updated: 2026-07-21 after initial definition*
