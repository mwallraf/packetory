# Phase 2: UUID Generator - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-23
**Phase:** 2-UUID Generator
**Areas discussed:** Regenerate-on-settings-change, Batch UX & local history, SEO content specifics

---

## Regenerate-on-settings-change

| Option | Description | Selected |
|--------|-------------|----------|
| Switching version immediately regenerates | v4/v7 are structurally different, changing version instantly produces new value(s) | ✓ |
| Switching version only changes future generations | Displayed value stays until explicit Regenerate | |

**User's choice:** Switching version immediately regenerates.

| Option | Description | Selected |
|--------|-------------|----------|
| Reformat existing value(s) in place | Case/hyphen toggles restyle what's shown, no new randomness | ✓ |
| Generate brand-new value(s) on any toggle | Every control change regenerates fresh values | |

**User's choice:** Reformat existing value(s) in place.

| Option | Description | Selected |
|--------|-------------|----------|
| Visible Regenerate button + global Enter shortcut | Button always visible, Enter also regenerates (matches Enter=execute model) | ✓ |
| Enter shortcut only, no button | No dedicated button, keyboard-only | |

**User's choice:** Visible Regenerate button + global Enter shortcut.

| Option | Description | Selected |
|--------|-------------|----------|
| Regenerates live as the count changes | Batch count change immediately regenerates that many values | ✓ |
| Requires clicking Regenerate/Enter after changing the count | Explicit trigger needed after count change | |

**User's choice:** Regenerates live as the count changes.

---

## Batch UX & local history

| Option | Description | Selected |
|--------|-------------|----------|
| Scrollable list, one per line | Bounded-height scrollable list/textarea, no pagination | ✓ |
| Paginated grid/table | Splits large batches across pages | |

**User's choice:** Scrollable list, one per line.

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to a later phase | Keep Phase 2 scoped to locked UUID-01–06 requirements | ✓ |
| Include it in Phase 2 | Add localStorage "last 5" list now | |

**User's choice:** Defer to a later phase.
**Notes:** History mentioned in project-brief.md §5 as an optional example, not a locked requirement — captured as a Deferred Idea.

| Option | Description | Selected |
|--------|-------------|----------|
| One selector controls both copy-all and download | Single format toggle for both actions | ✓ |
| Separate format choices for copy vs. download | Independent pickers | |

**User's choice:** One selector controls both copy-all and download.

| Option | Description | Selected |
|--------|-------------|----------|
| Just the raw UUID strings | CSV: one per row no header; JSON: flat array | ✓ |
| Include index/version metadata | CSV header row, JSON array of objects | |

**User's choice:** Just the raw UUID strings.

---

## SEO content specifics

| Option | Description | Selected |
|--------|-------------|----------|
| Show a real generated v4 + v7 side-by-side with a one-line note | Concrete example, immediate v4-vs-v7 education | ✓ |
| Show a code snippet using the UUID in a real context | Developer-oriented usage demo | |

**User's choice:** Show a real generated v4 + v7 side-by-side with a one-line note on when to use each.

| Option | Description | Selected |
|--------|-------------|----------|
| Practical/technical questions a dev would actually search for | v4 vs v7, uniqueness, DB primary key usage | ✓ |
| Broad/general audience questions | "What is a UUID?" framing | |

**User's choice:** Practical/technical questions a dev would actually search for.

| Option | Description | Selected |
|--------|-------------|----------|
| 3-4 focused questions | Enough for FAQ schema/SEO without padding | ✓ |
| 5-8 questions, more exhaustive | Broader long-tail coverage | |

**User's choice:** 3-4 focused questions.

| Option | Description | Selected |
|--------|-------------|----------|
| Mention both versions | Title/meta captures v7-specific search intent | ✓ |
| Lead with v4 only, mention v7 in body copy | Simpler title matching common search term | |

**User's choice:** Mention both versions.

---

## Claude's Discretion

- **Keyboard shortcut target (`/`)** — presented as a selectable gray area but the user did not choose to discuss it, and declined to explore further areas afterward. Left as an open decision for the planner/researcher, documented in CONTEXT.md's Claude's Discretion section with a suggested direction (focus the batch-count input, or treat as an Enter-equivalent regenerate trigger) rather than silently assuming either way.

## Deferred Ideas

- **Local-only "last 5 generated UUIDs" history** — mentioned in project-brief.md §5 as an example of acceptable convenience storage; not part of Phase 2's locked requirements. Deferred to a future phase/enhancement.
