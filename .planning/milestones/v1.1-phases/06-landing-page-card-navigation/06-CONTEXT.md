# Phase 6: Landing Page Card Navigation - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

A visitor can click anywhere on an active tool's card in the landing page grid and land on that tool's `/tools/{slug}` page — the grid stops being a visual-only listing and matches what the nav menu already does. Cards stay fully keyboard-operable (Tab + Enter/Space, visible focus indicator). A `status: "planned"` card (if one exists) keeps rendering as a non-interactive "Coming soon" card that does not navigate anywhere.

This phase covers `components/ToolCard.tsx` and its rendering in `app/page.tsx` only. It does not touch `SiteHeader.tsx`'s nav (already working) or the tool registry shape.

</domain>

<decisions>
## Implementation Decisions

### Click-target technique
- **D-01:** Use the "stretched-link" pattern, not a whole-card anchor wrap. `CardTitle` becomes a real `<Link href={/tools/{slug}}>`; an invisible `::after` overlay (Tailwind `after:absolute after:inset-0`) stretches the link's hit area to cover the entire `Card`. This requires `position: relative` on the `Card` container.
- **D-02:** Rationale for choosing this over a full-card anchor wrap: the accessible name stays concise ("UUID Generator" instead of the whole card's title + description + category read as one link), matching the standard accessible pattern used by GOV.UK/Bootstrap for "card as click target."

### Focus & hover affordance
- **D-03:** The focus ring and hover affordance must visually span the entire card boundary, not just the title link/text. Implement via a state selector on the `Card` container (e.g., `has-[:focus-visible]:ring-...` / `has-[:hover]:...`) so the whole card reinforces "this is the click/tab target," matching success criterion 2's keyboard-first intent.
- **D-04:** This is a new visual affordance — no prior UI-SPEC decision covers full-card hover/focus styling (Phase 1's UI-SPEC only defined the focus ring pattern for individual interactive elements). Stay consistent with the existing `focus-visible:ring-[3px] focus-visible:ring-ring/50` convention used in `SiteHeader.tsx` when styling the card-level ring.

### Planned-card treatment
- **D-05:** `status: "planned"` cards get **no visual change** — no hover state, no cursor change, no focus ring, exactly as they render today. Reinforces they remain inert; do not add `cursor: not-allowed` or any other explicit "disabled" affordance.
- **D-06:** No `<Link>`, no `tabIndex`, no `::after` overlay on planned cards — the stretched-link markup only applies when `tool.status !== "planned"` (same `isNavigable` condition already used in `SiteHeader.tsx`).

### Claude's Discretion
- Exact Tailwind utility classes/selectors for the card-level hover/focus ring (e.g., `has-[:focus-visible]` vs. a `group`/`peer` approach) — any implementation that visually wraps the full card boundary and matches the site's existing focus-ring color/width convention is acceptable.
- Whether `CardTitle` itself needs to change from a `<div>` to wrap a `<Link>`, or whether the `<Link>` should be a sibling positioned via the `::after` trick with `CardTitle`'s text visually presented via the link — implementer's call, as long as the rendered accessible name is just the tool name (per D-02) and the link covers the full card (per D-01).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements & roadmap
- `.planning/ROADMAP.md` — Phase 6 section: goal, success criteria (3 items), `Depends on: Nothing`, `UI hint: yes`
- `.planning/REQUIREMENTS.md` — LP-01: "User can click a tool card in the landing page grid to navigate to that tool (parity with the nav menu, which already links correctly)"
- `.planning/PROJECT.md` — Active requirements section notes related-tool links and accessibility re-audit as separate, still-deferred items (out of scope for this phase)

### Existing UI-SPEC precedent (informational, not locked for this phase)
- `.planning/milestones/v1.0-phases/01-shared-shell-registry/01-UI-SPEC.md` — original card design: D-01 (planned cards render muted/non-clickable), D-02 (featured sort + accent tint), focus ring convention (§Color, "Keyboard focus ring (all interactive elements)")

### Existing nav parity pattern (the "already works" reference for LP-01)
- `components/SiteHeader.tsx` — the pattern to mirror: `href = /tools/${tool.slug}`, `isNavigable = tool.status !== "planned"`, `aria-disabled="true"` non-`<Link>` `<span>` for planned tools

**No external specs beyond the above** — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tools/registry.ts` — `getSortedTools()`, `ToolDefinition.status` (`"active" | "beta" | "planned"`), `ToolDefinition.slug` — same registry-driven pattern already used by `SiteHeader.tsx` and `app/page.tsx`; no registry changes needed for this phase.
- `components/SiteHeader.tsx` — working reference implementation of the `isNavigable`/`href`/planned-vs-active branching logic to mirror in `ToolCard.tsx`.
- `components/ui/card.tsx` — shadcn `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent` primitives, currently all plain `<div>`s with `data-slot` attributes and `cn()`-composed Tailwind classes; `Card` already supports `className` overrides needed to add `relative` positioning.

### Established Patterns
- Registry-driven rendering: nav, cards, and (per `tools/registry.ts` header comment) sitemap must all derive from `tools/registry.ts` — never hardcode a slug/status check inline.
- `data-testid` convention: `tool-card`, `tool-card-name`, `tool-card-description`, `tool-card-category` already exist on `ToolCard.tsx` and are asserted by `tests/e2e/home.spec.ts` — must be preserved (or deliberately updated together with the test) when restructuring markup for the stretched-link.
- Focus-visible ring convention: `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`, used consistently in `SiteHeader.tsx`'s logo and nav links.

### Integration Points
- `app/page.tsx` — renders `<ToolCard key={tool.slug} tool={tool} />` in a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`); no changes expected here beyond what `ToolCard` itself needs.
- `tests/e2e/home.spec.ts` (lines 37-53) — currently contains a test that explicitly asserts **the opposite** of this phase's goal: "no card is itself a clickable link (ToolCard renders no wrapping anchor)" with `await expect(card.locator("a")).toHaveCount(0)`. This test documents Phase 1's D-01 "placeholder, not yet clickable" state and MUST be updated (not left failing) as part of implementing this phase.

</code_context>

<specifics>
## Specific Ideas

No additional specific references beyond the decisions captured above — the user confirmed all three recommended options (stretched-link overlay, full-card focus/hover scope, no visual change for planned cards) without further elaboration.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. No scope-creep suggestions came up; the user accepted all three gray-area recommendations directly.

</deferred>

---

*Phase: 6-Landing Page Card Navigation*
*Context gathered: 2026-07-25*
