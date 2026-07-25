# Phase 1: Shared Shell + Registry - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Visitors can browse a fast, accessible, theme-able site shell that lists every tool from a single registry, see their own public IP, and trust that every future change is CI-gated, privacy-respecting, and analytics-safe — even before any tool exists. This phase delivers: landing page, registry-driven nav/cards/sitemap, visitor-IP widget, light/dark theming, accessibility/keyboard framework (plumbing only — no tool page exists yet to focus), analytics allow-list, privacy notice, and CI gate. No tool logic (UUID/Subnet/DNS/MAC) ships in this phase.

</domain>

<decisions>
## Implementation Decisions

### Landing page & tool status
- **D-01:** All 5 registry entries (shell + 4 future tools) are shown on the landing page immediately, even though only the shell exists in Phase 1. Tools with `status: "planned"` render with a muted "Coming soon" badge and are not clickable (or link to a stub) — the site should not look empty on day one.
- **D-02:** Cards render in a single responsive flat grid, sorted by the registry's `featured` flag then alphabetically. No category grouping in Phase 1 (revisit once more tools exist across more categories).
- **D-03:** The global `/` keyboard shortcut has no landing-page target in Phase 1. The keyboard-hook framework is built as reusable plumbing now; `/` becomes active once tool pages exist starting Phase 2. No command-palette/quick-switcher in this phase — that's future scope.
- **D-04:** Mobile nav (≤320px) uses a hamburger menu: logo + theme toggle stay visible, tool links collapse behind the hamburger icon.

### Visitor IP widget
- **D-05:** IP is determined server-side via a Vercel API route reading the incoming request's forwarded-IP header — no third-party IP-echo service call, avoiding an external dependency and staying consistent with the "no third-party requests when avoidable" constraint.
- **D-06:** Show whichever address family (IPv4 or IPv6) the incoming request actually provides — no dual-lookup, no guarantee of showing both.
- **D-07:** If the IP can't be determined (e.g. local dev, missing header), hide the widget entirely rather than showing an error/placeholder state.
- **D-08:** Widget is a small badge/pill near the top of the page (header/hero area) — secondary to the tool grid, not treated as its own tool card.

### Theming (light/dark)
- **D-09:** Default theme on first visit follows system preference (`prefers-color-scheme`), overridable by the visitor.
- **D-10:** A manual theme choice persists across visits via `localStorage` (not a cookie), overriding system preference until changed again.
- **D-11:** Theme toggle is a simple two-state light/dark icon button — no explicit third "system" state in the UI.

### Analytics & privacy notice
- **D-12:** Vercel Analytics is the Phase 1 analytics provider — native to the existing Vercel/Next.js hosting stack, cookie-free by design, no new vendor relationship to set up.
- **D-13:** The query-param allow-list is implemented as a central redaction utility in `lib/` (e.g. `lib/analytics/redact.ts`) that every page routes tracked params through. New tools are safe-by-default: a param is only reported if explicitly added to the allow-list, never the reverse. This is the concrete mechanism satisfying QUAL-06.
- **D-14:** The privacy notice lives at a dedicated `/privacy` route, linked from the site footer on every page.
- **D-15:** Claude drafts a real first-pass privacy notice (accurately describing actual behavior: no tracking cookies, no accounts, redacted analytics) rather than a placeholder stub — but it is explicitly flagged as needing the user's sign-off before being considered launch-final, per the autonomy boundary in PROJECT.md (legal/privacy text requires human approval).

### Cross-cutting
- **D-16:** Mobile responsiveness (usable at 320px, no cumulative layout shift) is a baseline constraint across every piece built in this phase — landing page, nav, IP widget, and theme toggle — not a separate feature. Already locked via SHELL-06; confirmed during discussion, no new decision needed.

### Claude's Discretion
None — all four discussed areas reached explicit user decisions (no "you decide" selections this round).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project source of truth
- `project-brief.md` (repo root) — full design principles (§3), global interaction model (§6), architecture/file layout and `ToolDefinition` registry schema (§8.1), URL/analytics safety rules (§8.2), git/deployment workflow (§9), non-functional requirements incl. performance/testing/accessibility/privacy (§10), autonomy boundaries (§14 — legal/privacy text requires human approval). Confirmed accurate by the user; treat as authoritative detail reference.
- `.planning/PROJECT.md` — distilled project context, requirements, constraints, key decisions, autonomy model.
- `.planning/REQUIREMENTS.md` — SHELL-01–06 and QUAL-03/04/05/06/07/09 are the locked v1 requirements this phase must satisfy.
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and dependency ordering (no dependencies; first phase).

### Registry schema (already locked, not re-decided here)
- `project-brief.md` §8.1 — the `ToolDefinition` TypeScript type (`slug`, `name`, `shortName`, `description`, `category` enum, `keywords`, `icon`, `status`, `clientOnly`, `featured`) is fully specified in the brief. Implement `tools/registry.ts` against this exact shape.

</canonical_refs>

<code_context>
## Existing Code Insights

This is a greenfield codebase — no application code exists yet (only `.planning/`, `.claude/`, and `project-brief.md` at the repo root). Nothing to reuse; establishing the initial structure per `project-brief.md` §8 (`app/`, `components/`, `lib/`, `tools/registry.ts`) is this phase's job.

### Reusable Assets
None yet — this phase creates the foundational assets (registry, nav, theme provider, redaction util) that all later phases will reuse.

### Established Patterns
None yet — Phase 1 establishes the patterns (registry-driven nav/sitemap, `lib/` framework-agnostic core logic, redact-by-allow-list) that Phases 2–5 must follow.

### Integration Points
- `tools/registry.ts` is the single integration point every future tool phase touches to register itself — no other shared component should require editing when a new tool ships (per SHELL-04).
- `lib/analytics/redact.ts` (or equivalent) is the integration point every future tool's URL-state params must route through before being reported.

</code_context>

<specifics>
## Specific Ideas

- Visitor IP widget should read like a small utility badge ("Your IP: x.x.x.x [copy]") near the top of the page — not a full tool card, not the visual centerpiece.
- Privacy notice content should be honest and specific about actual behavior (no cookies, no accounts, allow-list redaction) rather than generic boilerplate, since Claude is drafting a real first pass for review rather than a stub.

</specifics>

<deferred>
## Deferred Ideas

- **Command palette / `/`-triggered quick tool switcher** — mentioned as a possible use of the registry's `keywords` field (project-brief.md §8.1 explicitly earmarks the registry for "any future command palette"), but explicitly deferred out of Phase 1 scope. Revisit once more tools exist and the tool grid alone is no longer sufficient for fast navigation.
- **Category-grouped landing page layout** — deferred in favor of a flat grid for now; revisit once tool count grows enough that categories provide real navigational value.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 1-Shared Shell + Registry*
*Context gathered: 2026-07-21*
