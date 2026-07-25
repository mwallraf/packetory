# Phase 2: UUID Generator - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Users get an instant, customizable UUID (v4 or v7) with zero required input, full export/copy options, and complete SEO/FAQ content — establishing the tool-page pattern (Server-shell/Client-island split, per-tool metadata, worked examples/FAQ) that every later tool reuses. This is the first tool page to exist, so it's also the first page where the site's global keyboard shortcut framework (built as unbound plumbing in Phase 1) becomes live.

</domain>

<decisions>
## Implementation Decisions

### Regenerate-on-settings-change
- **D-01:** Switching UUID version (v4 ↔ v7) immediately regenerates fresh value(s) in the new version — v4 and v7 are structurally different (v7 encodes a timestamp), so one cannot be reformatted into the other.
- **D-02:** Toggling case (upper/lower) or hyphens (on/off) reformats the value(s) already on screen in place — no new randomness, no change to underlying UUID identity.
- **D-03:** A visible "Regenerate" control (button/icon) is always present near the result, and the global `Enter` shortcut also triggers regeneration — consistent with the site's "Enter = execute" interaction model.
- **D-04:** Changing the batch count (e.g. 1 → 10) regenerates the batch live as the count changes — no separate "Generate" click required, matching the "zero-effort instant result" core value.

### Batch UX & local history
- **D-05:** Batch results (2–100 values) render as a single scrollable list, one UUID per line — no pagination, same treatment regardless of batch size.
- **D-06 [informational]:** Local-only "last 5 generated UUIDs" convenience history (mentioned in project-brief.md §5 as an optional example) is explicitly **deferred**, not part of Phase 2 — see Deferred Ideas. (No plan action expected — this is a record of the deferral, not an implementation decision.)
- **D-07:** One format selector (plain text / CSV / JSON) governs both the "Copy All" clipboard content and the "Download" file — not two independent pickers.
- **D-08:** CSV/JSON exports contain only the raw UUID strings — no index, version, or timestamp metadata columns/fields.

### SEO content specifics
- **D-09:** The worked example shows a real, actually-generated v4 and v7 UUID side-by-side with a one-line note on when to use each (v7 = sortable/time-ordered).
- **D-10:** FAQ content targets practical/technical questions a developer would actually search for (e.g. "What's the difference between UUID v4 and v7?", "Are UUIDs guaranteed unique?", "Can I use a UUID as a database primary key?") — not generic/beginner framing.
- **D-11:** 3–4 focused FAQ questions — enough for FAQ schema/SEO value without padding.
- **D-12:** Page title and meta description mention both UUID versions (v4 and v7) rather than leading with v4 only — captures search intent from users specifically looking for v7.

### Claude's Discretion
- **Keyboard shortcut target (`/`)** — this area was surfaced but the user chose not to discuss it this round. Per Phase 1's D-03, `/` becomes active starting with this, the first tool page. No traditional "search input" exists for a default-on-load UUID generator, so the planner/researcher should pick a sensible target consistent with the site's interaction model (e.g. focusing the batch-count input, or acting as a page-level "regenerate" trigger equivalent to `Enter`) and document the choice in PLAN.md rather than leaving it unbound. This is genuinely undecided by the user — flagged so downstream agents don't silently assume either way.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project source of truth
- `project-brief.md` §5.1 — UUID Generator v1 scope (generation, versions, batch, output controls, copy/download)
- `project-brief.md` §8 — architecture/file layout, `ToolDefinition` registry schema, tool-page pattern (Server-shell/Client-island split)
- `.planning/PROJECT.md` — distilled project context, requirements, constraints, key decisions, autonomy model
- `.planning/REQUIREMENTS.md` — UUID-01–06 and QUAL-01/02 are the locked v1 requirements this phase must satisfy
- `.planning/ROADMAP.md` Phase 2 section — goal, success criteria, dependency on Phase 1

### Prior-phase decisions this phase builds on
- `.planning/phases/01-shared-shell-registry/01-CONTEXT.md` — D-01 (registry status/"Coming soon" badge — `tools/registry.ts` already has a `uuid` entry with `status: "planned"`, this phase flips it to `"active"`), D-03 (`/` shortcut activates starting this phase), D-13 (analytics redaction allow-list — apply if this tool ever adds bookmarkable/sensitive URL state, though none is currently planned for UUID)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tools/registry.ts` — the `uuid` entry already exists (slug, name, shortName, description, category, keywords, icon) with `status: "planned"`; this phase's job is to build the actual page and flip status to `"active"`.
- `lib/hooks/useKeyboardShortcut.ts` — built and unit-tested in Phase 1, ready to wire into this page.
- `lib/hooks/useCopyToClipboard.ts` — reusable copy hook from Phase 1's IP badge; reuse for single-value and copy-all actions here.
- `components/ThemeProvider.tsx`, `components/SiteHeader.tsx`, `components/MobileNav.tsx` — shared shell, no changes expected.

### Established Patterns
- Registry-driven nav/sitemap: adding a tool page must not require touching shared nav components by hand (SHELL-04) — only `tools/registry.ts` + the new page module.
- `lib/` framework-agnostic core logic pattern (established in Phase 1 with `lib/network/`, `lib/analytics/`) — UUID generation/formatting logic belongs in `lib/uuid/` or similar, independently unit-testable, per CLAUDE.md's confirmed `uuid` npm package choice.

### Integration Points
- `app/tools/uuid/` (or equivalent route matching the `/tools/{slug}` shape assumed by Phase 1's nav hrefs) is the new page.
- `tools/registry.ts`'s `uuid` entry status flip is the only shared-file touch this phase should need.

</code_context>

<specifics>
## Specific Ideas

- Worked example: show one real v4 and one real v7 side-by-side with a one-line "when to use each" note (not abstract prose).
- FAQ: practical/technical, dev-search-intent framing (v4 vs v7 difference, uniqueness guarantees, DB primary key usage), 3–4 questions.
- Export: single format selector drives both copy-all and download; raw UUID strings only, no metadata columns.

</specifics>

<deferred>
## Deferred Ideas

- **Local-only "last 5 generated UUIDs" history** — mentioned in project-brief.md §5 as an example of acceptable convenience storage, but not part of Phase 2's locked UUID-01–06 requirements. Deferred to a later phase/enhancement.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 2-UUID Generator*
*Context gathered: 2026-07-23*
