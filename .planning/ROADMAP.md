# Roadmap: Packetory

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-07-25)
- 🚧 **v1.1 Production Domain & Landing Page Polish** — Phases 6-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-07-25</summary>

- [x] Phase 1: Shared Shell + Registry (5/5 plans) — completed 2026-07-23
- [x] Phase 2: UUID Generator (4/4 plans) — completed 2026-07-24
- [x] Phase 3: IP Subnet Calculator (5/5 plans) — completed 2026-07-24
- [x] Phase 4: DNS Lookup (4/4 plans) — completed 2026-07-25
- [x] Phase 5: MAC Address Inspector (3/3 plans) — completed 2026-07-25

Full phase details archived at `.planning/milestones/v1.0-ROADMAP.md`.

</details>

### v1.1 Production Domain & Landing Page Polish (Phases 6-7)

- [x] **Phase 6: Landing Page Card Navigation** - Tool cards in the landing grid become clickable, reaching parity with the nav menu (completed 2026-07-25)
- [x] **Phase 7: Production Domain Cutover (packetory.dev)** - Code-side domain cutover complete (canonical URLs confirmed via audit); redirects and runbook deliberately descoped by user decision after live-evidence review (completed 2026-07-25)

## Phase Details

### Phase 6: Landing Page Card Navigation

**Goal**: A visitor can click anywhere on a tool card in the landing page grid and land on that tool's page — the grid stops being a visual-only listing and matches what the nav menu already does.
**Depends on**: Nothing (independent of Phase 7; execution order between the two doesn't matter)
**Requirements**: LP-01
**Success Criteria** (what must be TRUE):

  1. Clicking anywhere on an active tool's card (not just its title text) in the landing grid navigates to that tool's `/tools/{slug}` page
  2. A card can be reached via Tab and activated via Enter/Space, with a visible focus indicator — the grid stays fully keyboard-operable, matching the site's keyboard-first non-negotiable
  3. A tool card with `status: "planned"` (if one exists in the registry, now or in the future) keeps rendering as a non-interactive "Coming soon" card that does not navigate anywhere — today's placeholder behavior isn't broken by making active cards clickable

**Plans**: 2/2 plans executed
**Wave 1**

- [x] 06-01-PLAN.md — Stretched-link + full-card ring in ToolCard, component unit test, updated home E2E (LP-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — Human-verify checkpoint: full-card hover/focus ring visually encloses the card at all breakpoints

**UI hint**: yes

### Phase 7: Production Domain Cutover (packetory.dev)

**Goal**: All code-side pieces of the packetory.dev cutover are in place (canonical origin used everywhere, old-URL redirects configured, and a runbook exists) so that once the user completes the one-time manual steps — registering the domain and adding it in Vercel's dashboard — the site goes live at packetory.dev with old URLs redirecting to it.

**Scope narrowed during Phase 7 discussion** (see `07-CONTEXT.md` D-01..D-08): the user had already manually registered and configured `packetory.dev` in Vercel before planning started, and explicitly chose not to implement redirects or a runbook after being shown live evidence. Final phase outcome: DOM-01 verified-live, DOM-03 confirmed complete by audit, DOM-02 and DOM-04 deliberately descoped.

**Depends on**: Nothing (independent of Phase 6; execution order between the two doesn't matter)
**Requirements**: DOM-01, DOM-02, DOM-03, DOM-04
**Success Criteria** (what must be TRUE):

  1. **MET** *(Agent-verifiable)* Every hardcoded site-origin reference — the `SITE_URL` constant, per-tool canonical URLs and OG tags, `sitemap.xml`, `robots.txt` — resolves to `https://packetory.dev`, confirmed by a repo-wide search that turns up zero remaining `packetory.vercel.app` literals in application code (DOM-03, confirmed by Phase 7 audit per D-07/D-08 — no code changes were needed since `SITE_URL` already derived every reference)
  2. **DESCOPED** *(Agent-verifiable)* A redirect rule is committed to the deployed config (e.g. `next.config.ts` or `vercel.json`) so that requests to `packetory.vercel.app` and `www.packetory.dev` are redirected to the canonical apex `packetory.dev` — the user deliberately chose not to implement this after being shown live evidence that neither host currently redirects (D-02/D-03/D-04). Accepted consequence: `packetory.vercel.app` remains a live duplicate-content URL and `www.packetory.dev` keeps failing TLS, indefinitely, unless revisited in a future phase.
  3. **DESCOPED** *(Agent-verifiable)* A runbook document exists that walks through, step by step, how to register `packetory.dev`, add it as a Domain in the Vercel project dashboard, and confirm DNS/SSL issuance — the user already completed these one-time manual steps themselves and does not want documentation of a completed action written (D-05/D-06); no runbook was created and `DEPLOY.md` was not extended.
  4. **MET** *(Requires user confirmation after the user's own manual steps)* Once the user has registered the domain and completed the Vercel dashboard configuration per the runbook, `https://packetory.dev` resolves the live site over valid HTTPS (DOM-01) — verified live 2026-07-25 via `curl -sI https://packetory.dev` → `HTTP/2 200`, valid TLS certificate (`CN=packetory.dev`), per D-01.
  5. **DESCOPED** *(Requires user confirmation after the user's own manual steps)* `packetory.vercel.app` and `www.packetory.dev` both redirect to `https://packetory.dev` in production (DOM-02) — descoped alongside criterion 2 per D-02/D-03/D-04; neither redirect exists and none was added this phase.

**Plans**: 1/1 plan executed
**Wave 1**

- [x] 07-01-PLAN.md — DOM-03 confirmation audit + reconcile REQUIREMENTS/ROADMAP/PROJECT docs (DOM-01 verified-live, DOM-02/DOM-04 descoped) (DOM-01, DOM-02, DOM-03, DOM-04)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Shared Shell + Registry | v1.0 | 5/5 | Complete | 2026-07-23 |
| 2. UUID Generator | v1.0 | 4/4 | Complete | 2026-07-24 |
| 3. IP Subnet Calculator | v1.0 | 5/5 | Complete | 2026-07-24 |
| 4. DNS Lookup | v1.0 | 4/4 | Complete | 2026-07-25 |
| 5. MAC Address Inspector | v1.0 | 3/3 | Complete | 2026-07-25 |
| 6. Landing Page Card Navigation | v1.1 | 2/2 | Complete    | 2026-07-25 |
| 7. Production Domain Cutover | v1.1 | 1/1 | Complete (DOM-02/DOM-04 descoped) | 2026-07-25 |
