# Phase 6: Landing Page Card Navigation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 6-Landing Page Card Navigation
**Areas discussed:** Click target, Focus/hover scope, Planned card hover

---

## Click target

| Option | Description | Selected |
|--------|-------------|----------|
| Stretched-link overlay | CardTitle becomes a real `<Link>`; an invisible `::after` overlay stretches it to cover the whole card. Screen readers announce just the tool name as the link (concise), while clicking/tapping anywhere on the card works. Standard accessible pattern (GOV.UK/Bootstrap use it). | ✓ |
| Whole-card anchor wrap | Wrap the entire `<Card>` content in a single `<Link>`. Simpler markup, but the accessible name becomes the full card text (title + description + category) read as one link — more verbose for screen reader users. | |

**User's choice:** Stretched-link overlay (recommended option, accepted directly).
**Notes:** None — accepted the recommendation without further elaboration.

---

## Focus/hover scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full card boundary | Focus ring and hover state (e.g. border/shadow shift) visually wrap the entire card, reinforcing that the whole card — not just the title text — is the click/tab target. Matches the "card is the target" mental model from the success criteria. | ✓ |
| Link element only | Default browser/Tailwind focus-visible ring appears only around the title text/link itself, even though clicking anywhere on the card navigates. Simpler to implement, but visually understates the click area. | |

**User's choice:** Full card boundary (recommended option, accepted directly).
**Notes:** None — accepted the recommendation without further elaboration.

---

## Planned card hover

| Option | Description | Selected |
|--------|-------------|----------|
| No change | Planned cards keep their current appearance and cursor exactly as-is — no hover style, no cursor change. Reinforces that they are inert, matching today's behavior 1:1. | ✓ |
| Explicit not-allowed cursor | Add `cursor: not-allowed` on hover for planned cards, giving an explicit signal that the card is intentionally non-interactive rather than just unstyled. | |

**User's choice:** No change (recommended option, accepted directly).
**Notes:** None — accepted the recommendation without further elaboration.

---

## Claude's Discretion

- Exact Tailwind utility classes/selectors used to implement the card-level hover/focus ring (e.g., `has-[:focus-visible]` vs. a `group`/`peer` approach).
- Whether `CardTitle` itself changes from a `<div>` to wrap a `<Link>`, or whether the `<Link>` is a sibling positioned via the `::after` trick — as long as the accessible name is just the tool name and the link covers the full card.

## Deferred Ideas

None — discussion stayed within phase scope. No scope-creep suggestions came up.
