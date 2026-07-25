# Requirements: Packetory — Milestone v1.1

**Defined:** 2026-07-25
**Core Value:** Zero-effort, instant results — every tool shows a useful output immediately with no login, no required input, and one-click copy.

## v1.1 Requirements

Requirements for this milestone. Each maps to a roadmap phase.

### Landing Page

- [ ] **LP-01**: User can click a tool card in the landing page grid to navigate to that tool (parity with the nav menu, which already links correctly)

### Domain / Infrastructure

- [ ] **DOM-01**: Site is reachable at `packetory.dev` (apex) over valid HTTPS once the domain is registered and pointed at Vercel DNS
- [ ] **DOM-02**: `packetory.vercel.app` and/or `www.packetory.dev` redirect to the canonical `packetory.dev` apex
- [ ] **DOM-03**: All hardcoded references (`SITE_URL` constant, canonical URLs, OG tags, `sitemap.xml`, `robots.txt`) updated from `packetory.vercel.app` to `packetory.dev`
- [ ] **DOM-04**: A documented runbook covers the manual steps (domain registration, Vercel dashboard Domains configuration, DNS verification) so the cutover is reproducible

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloudflare as DNS/proxy layer | Vercel DNS is simpler and avoids proxy/SSL conflicts with Vercel's own edge; no clear benefit identified for this milestone |
| Per-tool subdomains (`uuid.packetory.dev`, etc.) | Would fragment SEO authority and break the shared-nav "switch tools instantly" experience; path-based `/tools/*` routing stays |
| Related-tool links, accessibility re-audit, public API, OUI dataset compaction, `/api/mac-vendor` rate limiting | Carried-over v1.0 tech debt (see PROJECT.md Active requirements) — not in scope for this milestone unless explicitly pulled in later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LP-01 | TBD | Pending |
| DOM-01 | TBD | Pending |
| DOM-02 | TBD | Pending |
| DOM-03 | TBD | Pending |
| DOM-04 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 5 total
- Mapped to phases: 0
- Unmapped: 5 ⚠️ (pending roadmap creation)

---
*Requirements defined: 2026-07-25*
*Last updated: 2026-07-25 after initial definition*
