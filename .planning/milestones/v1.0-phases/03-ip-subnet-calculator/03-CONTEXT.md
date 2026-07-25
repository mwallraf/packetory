# Phase 3: IP Subnet Calculator - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users get instant, mathematically correct IPv4/IPv6 subnet breakdowns from CIDR input, with every field individually copyable and the result bookmarkable/shareable. This is the first tool page to introduce URL-state (`?cidr=`) and the first to require BigInt-safe domain math (128-bit IPv6 arithmetic). It's also the first tool whose URL state can carry genuinely sensitive data (private IP ranges), which is why the analytics allow-list (`lib/analytics/redact.ts`) was built in Phase 1 ahead of this phase.

</domain>

<decisions>
## Implementation Decisions

### Analytics & URL-state privacy
- **D-01:** The `cidr` query param is **never** added to the analytics allow-list. It stays permanently excluded from `lib/analytics/redact.ts`'s `DEFAULT_ALLOW_LIST` — no per-lookup value (and no generic "a lookup happened" event) is reported. Page-view metrics alone are sufficient; project-brief.md §8.2 explicitly flags private IP ranges/customer addressing as sensitive, and the user chose the safest interpretation over a value-free usage-tracking compromise.
- **D-02:** The default/example CIDR shown on first load (before any URL param or user input) is a **private-range example** (e.g. `192.168.1.0/24` or the brief's own `10.20.0.0/20`) — familiar and recognizable, not a public/documentation range. This is purely a UI default; per D-01 it is never reported to analytics regardless of whether it's private or public.

### CIDR math implementation
- **D-03:** IPv4/IPv6 CIDR arithmetic (network/broadcast bounds, address count, subdivisions, RFC-5952 compression) is implemented with **native BigInt, no new npm dependency** — addresses represented as BigInt, bit math done by hand in `lib/subnet/`. This fits the project's local-first/minimal-JS constraint and keeps the tool's core logic framework-agnostic and independently testable (same pattern as `lib/uuid/`). Claude owns full correctness/edge-case test coverage for this — expect property-based tests (fast-check, per Phase 2's precedent) covering boundary prefixes.

### Boundary-case display (/31, /32, /127, /128)
- **D-04:** Boundary prefixes show **correct RFC-accurate values plus a short explanatory note**, never "N/A" and never omitted rows. Specifically: `/31` (RFC 3021 point-to-point) shows both addresses as usable, host count 2, with a one-line note explaining there's no broadcast address at this prefix. `/32` and IPv6 `/128` show network = broadcast = the single address, host count 1. `/127` follows the same both-addresses-usable treatment as `/31`. Output field shape stays consistent across all prefix lengths — only the values and the note change.

### IPv6 subdivision options (/48–/64)
- **D-05:** Subdivision suggestions (e.g. "split this /48 into /64s") are **interactive, not just informational text** — clicking a suggested subdivision recomputes the tool for that sub-block, reusing the same URL-state mechanism as the main CIDR input.
- **D-06:** Clicking a subdivision **replaces** the top-level CIDR input entirely (updates the input field and the URL to the sub-block's own CIDR) rather than drilling down with a "back to parent" breadcrumb. One CIDR in, one result out — consistent with the rest of the tool and requires no new breadcrumb/history UI state.

### Claude's Discretion
None — all four discussed areas reached explicit user decisions (recommended option accepted every round, no "you decide" selections).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project source of truth
- `project-brief.md` §5.2 — IP Subnet Calculator v1 scope: CIDR input, IPv4/IPv6 auto-detect, full IPv4/IPv6 output field lists, bookmarkable URL state example (`/tools/subnet?cidr=10.20.0.0%2F20`), explicit v2 deferral of subnet splitting/VLSM planner
- `project-brief.md` §8.2 — URL and analytics safety: query params must exclude/redact private IP ranges and customer addressing — the direct basis for D-01
- `.planning/PROJECT.md` — distilled project context, requirements, constraints, key decisions, autonomy model
- `.planning/REQUIREMENTS.md` — SUBNET-01–07 are the locked v1 requirements this phase must satisfy
- `.planning/ROADMAP.md` Phase 3 section — goal, success criteria, dependency on Phase 2; explicitly notes this phase introduces "bookmarkable URL state" and "BigInt-safe domain math" as new architectural seams

### Prior-phase decisions this phase builds on
- `.planning/phases/01-shared-shell-registry/01-CONTEXT.md` — D-13 (analytics allow-list mechanism this phase's D-01 decision applies to); `lib/analytics/redact.ts`'s own doc comment already flags "Phase 3's Subnet Calculator is the first" tool with URL query-param state
- `.planning/phases/02-uuid-generator/02-CONTEXT.md` — Server-shell/Client-island page split pattern; `lib/{tool}/` framework-agnostic core-logic pattern; fast-check property-test precedent this phase's BigInt math should follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/network/parseForwardedIp.ts` — contains a working IPv6-literal validation trick (`new URL('http://[candidate]')` bracket wrap) that can inform (though not fully cover) this phase's own CIDR/address validation logic.
- `lib/analytics/redact.ts` + `DEFAULT_ALLOW_LIST` (currently empty) — the redaction mechanism D-01 explicitly decides NOT to extend for `cidr`; its own doc comment already anticipated this phase.
- `lib/hooks/useCopyToClipboard.ts` — reusable copy hook from Phase 1/2; reuse for each individually-copyable output field (SUBNET-06 needs many more copy targets than UUID's single/batch case).
- `tools/registry.ts` — the `subnet` entry already exists (slug, name, shortName, description, category, keywords, icon) with `status: "planned"`; this phase's job is to build the actual page and flip status to `"active"`.
- Server-shell + Client-island split (`app/tools/uuid/page.tsx` + `UuidToolLoader.tsx` + `UuidTool.tsx`) — the established pattern for `app/tools/subnet/`, though Subnet's client value comes from user input + URL state rather than a CSPRNG value, so the `ssr:false` hydration-mismatch rationale doesn't directly apply — the planner should confirm whether Subnet still needs a dynamic loader or can be a straightforward client component.

### Established Patterns
- `lib/{tool}/` framework-agnostic, independently unit-testable core logic (established `lib/uuid/`, `lib/network/`, `lib/analytics/`) — Subnet's CIDR math belongs in `lib/subnet/` following the same shape.
- fast-check property-based testing (`@fast-check/vitest`, already a devDependency) — used for UUID batch generation edge cases in Phase 2; the natural fit for BigInt boundary-prefix testing here (D-03/D-04).
- Registry-driven activation: flipping `tools/registry.ts`'s `subnet.status` from `"planned"` to `"active"` is the only shared-file touch expected.

### Integration Points
- `app/tools/subnet/` is the new route (matching the established `/tools/{slug}` shape).
- `tools/registry.ts`'s `subnet` entry status flip.
- `lib/analytics/redact.ts`'s `DEFAULT_ALLOW_LIST` is explicitly NOT touched by this phase (per D-01) — noted here so the planner doesn't assume it needs updating just because Subnet is "the first URL-state tool."

</code_context>

<specifics>
## Specific Ideas

- Default example: a private-range CIDR (`192.168.1.0/24` or brief's `10.20.0.0/20`) pre-fills and calculates on load, never reported to analytics.
- Boundary prefixes (/31, /32, /127, /128) always show real computed values with a short inline note — never "N/A", never hidden rows.
- IPv6 subdivision suggestions (/48–/64) are clickable and replace the main CIDR input/URL when selected — no breadcrumb/drill-down history.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Full VLSM planner / arbitrary subnet splitting remains explicitly out of scope per PROJECT.md and project-brief.md §5.2, unchanged by this discussion.)

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 3-IP Subnet Calculator*
*Context gathered: 2026-07-24*
