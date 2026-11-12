# Phase 10: Shared About Section & Config Parity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-11
**Phase:** 10-shared-about-section-config-parity
**Areas discussed:** About area look, Disclosure structure, Config worked example, Config FAQ & intro

---

## About area look

| Option | Description | Selected |
|--------|-------------|----------|
| Separator + grey heading | Thin top border, small muted "About this tool" heading, two disclosures | ✓ |
| Tinted panel | Muted background card holding both disclosures | |
| No heading, just disclosures | Two muted summary rows, no label | |

| Option (heading tag) | Description | Selected |
|--------|-------------|----------|
| Real `<h2>` | Proper outline, styled muted/small | ✓ |
| Visual only | No heading semantics | |
| You decide | | |

| Option (open content) | Description | Selected |
|--------|-------------|----------|
| Muted summaries, normal content | Readable once opened | ✓ |
| Everything muted | | |

| Option (spacing) | Description | Selected |
|--------|-------------|----------|
| Same as today (mt-12) | | |
| Larger gap (mt-16) | More breathing room | ✓ |
| You decide | | |

**User's choice:** Separator + muted `<h2>`, normal open content, mt-16.

---

## Disclosure structure

| Option (labels) | Description | Selected |
|--------|-------------|----------|
| Plain + count | "Worked example" / "FAQ (5 questions)" | ✓ |
| Plain only | "Worked example" / "Frequently asked questions" | |
| Descriptive per tool | e.g. "Worked example: 192.168.1.0/24 broken down" | |

| Option (FAQ items) | Description | Selected |
|--------|-------------|----------|
| Flat Q/A list | One click opens all | ✓ |
| Nested per-question `<details>` | | |

| Option (caret) | Description | Selected |
|--------|-------------|----------|
| lucide ChevronRight rotating 90° | Consistent cross-browser | ✓ |
| Native browser marker | | |
| You decide | | |

| Option (focus) | Description | Selected |
|--------|-------------|----------|
| Existing focus-visible ring | Reuse Button ring | ✓ |
| Browser default | | |

**User's choice:** Plain + count, flat FAQ list, rotating ChevronRight, existing focus ring.

---

## Config worked example

| Option (snippet) | Description | Selected |
|--------|-------------|----------|
| Small mixed config | hostname, interface, ACL w/ remark, static route, `!` comments | ✓ |
| Interface block only | | |
| Larger realistic excerpt (~25 lines) | | |

| Option (display) | Description | Selected |
|--------|-------------|----------|
| Highlighted output only | | ✓ |
| Plain input → highlighted output | | |

| Option (render) | Description | Selected |
|--------|-------------|----------|
| Server-side via highlightConfig (static fallback) | | ✓ |
| Always static pre-highlighted | | |

| Option (copy note) | Description | Selected |
|--------|-------------|----------|
| Short note under the example | | ✓ |
| No note | | |

**User's choice:** Small mixed IOS snippet, highlighted only, server-rendered via highlightConfig, short copy note.

---

## Config FAQ & intro

| Option (FAQ topics, multi) | Selected |
|--------|----------|
| Privacy: is my config uploaded? | ✓ |
| Pasting into Outlook/Word/Docs | ✓ |
| Supported syntax/vendors | ✓ |
| Monochrome / printing | ✓ |

| Option (intro/width) | Description | Selected |
|--------|-------------|----------|
| Keep both; About at max-w-3xl | | ✓ |
| Move intro into About | | |
| Keep intro, About full 6xl width | | |

**User's choice:** All four FAQ topics; keep intro + max-w-6xl, About constrained to max-w-3xl.

---

## Claude's Discretion

- Config FAQ answer wording; may add up to 2 extra items (max 6)
- Worked-example markup sharing approach (slot vs ExampleFields)
- Preserving existing data-testids
- Exact border token, chevron size, summary padding

## Deferred Ideas

None.
