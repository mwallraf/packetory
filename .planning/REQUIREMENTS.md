# Requirements: Packetory — Milestone v1.1

**Defined:** 2026-07-25
**Core Value:** Zero-effort, instant results — every tool shows a useful output immediately with no login, no required input, and one-click copy.

## v1.1 Requirements

Requirements for this milestone. Each maps to a roadmap phase.

### Landing Page

- [x] **LP-01**: User can click a tool card in the landing page grid to navigate to that tool (parity with the nav menu, which already links correctly)

### Domain / Infrastructure

- [x] **DOM-01**: Site is reachable at `packetory.dev` (apex) over valid HTTPS once the domain is registered and pointed at Vercel DNS — verified live 2026-07-25 via `curl -sI https://packetory.dev` returning `HTTP/2 200` with a valid TLS certificate (`CN=packetory.dev`), per Phase 7 D-01
- [x] **DOM-02**: `packetory.vercel.app` and/or `www.packetory.dev` redirect to the canonical `packetory.dev` apex — **descoped in Phase 7** (D-02/D-03/D-04): the user deliberately chose not to implement these redirects after being shown live evidence neither currently redirects. Accepted consequence: `packetory.vercel.app` remains a live duplicate-content URL and `www.packetory.dev` keeps failing TLS, indefinitely, unless revisited in a future phase.
- [x] **DOM-03**: All hardcoded references (`SITE_URL` constant, canonical URLs, OG tags, `sitemap.xml`, `robots.txt`) updated from `packetory.vercel.app` to `packetory.dev` — confirmed complete by a Phase 7 repo-wide audit: zero `packetory.vercel.app` literals in application code, every origin reference derives from the `SITE_URL` constant (`app/sitemap.ts`), per D-07/D-08. No code rewrite was needed.
- [x] **DOM-04**: A documented runbook covers the manual steps (domain registration, Vercel dashboard Domains configuration, DNS verification) so the cutover is reproducible — **descoped in Phase 7** (D-05/D-06): the user already completed the one-time manual registration/Vercel-dashboard steps and does not want documentation of a completed one-time action; no runbook was written.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloudflare as DNS/proxy layer | Vercel DNS is simpler and avoids proxy/SSL conflicts with Vercel's own edge; no clear benefit identified for this milestone |
| Per-tool subdomains (`uuid.packetory.dev`, etc.) | Would fragment SEO authority and break the shared-nav "switch tools instantly" experience; path-based `/tools/*` routing stays |
| Related-tool links, accessibility re-audit, public API, OUI dataset compaction, `/api/mac-vendor` rate limiting | Carried-over v1.0 tech debt (see PROJECT.md Active requirements) — not in scope for this milestone unless explicitly pulled in later |
| Host-based redirects (`packetory.vercel.app` / `www.packetory.dev` → apex) | Deliberately descoped in Phase 7 per user decision (see PROJECT.md / Phase 7 CONTEXT D-02..D-04) |
| Domain/DNS registration runbook | Deliberately descoped in Phase 7 per user decision (see PROJECT.md / Phase 7 CONTEXT D-05/D-06) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LP-01 | Phase 6 | Complete |
| DOM-01 | Phase 7 | Complete |
| DOM-02 | Phase 7 | Descoped |
| DOM-03 | Phase 7 | Complete |
| DOM-04 | Phase 7 | Descoped |

**Coverage:**

- v1.1 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-25*
*Last updated: 2026-07-25 after ROADMAP.md creation — 100% v1.1 coverage across Phase 6 (LP-01) and Phase 7 (DOM-01..04)*
