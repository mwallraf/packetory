---
phase: 06-landing-page-card-navigation
reviewed: 2026-07-25T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - components/ToolCard.tsx
  - components/ToolCard.test.tsx
  - tests/e2e/home.spec.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed `ToolCard.tsx` (rendering logic for the landing-page tool grid), its unit tests, and the related Playwright e2e spec. No critical/security-class issues found — the component correctly renders text-only children (no `dangerouslySetInnerHTML`), correctly excludes the anchor for non-navigable ("planned") tools, and the stretched-link pattern is wired up correctly against the `relative` positioning context on `Card`.

Three warnings were found, all related to robustness/correctness gaps that are currently masked because the live registry (`tools/registry.ts`) happens not to exercise the affected branches (no tool currently has an unmapped `icon` string, no tool currently has `status: "beta"`). Because these gaps are invisible under current data but will silently misbehave the moment the registry is edited, they are flagged as Warnings rather than Info. Several test-coverage gaps and a minor test-assertion weakness are flagged as Info.

## Warnings

### WR-01: Unmapped `icon` string silently falls back to `Fingerprint` with no dev-time signal

**File:** `components/ToolCard.tsx:25-30,41`
**Issue:** The file's own doc comment states: "Every icon referenced by tools/registry.ts MUST have an entry here." But `tool.icon` is typed as a bare `string` in `ToolDefinition` (`tools/registry.ts:18`), so nothing enforces that contract at compile time. If a future tool entry uses a typo'd or new icon key that isn't added to `ICONS`, `ICONS[tool.icon] ?? Fingerprint` silently renders the wrong icon (`Fingerprint`) with zero warning, zero test failure, and zero runtime error — the bug ships straight to production and is only caught by someone visually noticing the wrong icon.
**Fix:** At minimum, warn in development when the fallback triggers so misconfiguration is caught immediately:
```tsx
const Icon = ICONS[tool.icon] ?? (
  process.env.NODE_ENV !== "production" &&
    console.warn(`ToolCard: no icon mapped for "${tool.icon}" (slug: ${tool.slug})`),
  Fingerprint
);
```
Better: tighten `ToolDefinition.icon` to `keyof typeof ICONS` (requires touching `tools/registry.ts`, currently out of this file's scope) so a mismatch is a compile error instead of a silent runtime fallback.

### WR-02: Tool card title renders as a non-semantic `<div>`, breaking the page's heading hierarchy

**File:** `components/ToolCard.tsx:63-77` (via `components/ui/card.tsx:36-47`)
**Issue:** `06-UI-SPEC.md:63` explicitly documents this element's role as "Heading" (`CardTitle` / `tool-card-name`). `app/page.tsx` renders exactly one `<h1>` for the page and no other heading levels — the tool names are the only candidate "section" headings on the page. However, `CardTitle` (in `components/ui/card.tsx`) renders a plain `<div>`, not an `<h2>`/`<h3>`, and does not support an `asChild`/`as` prop the way `Badge` does. Screen-reader users navigating by heading (a primary AT navigation pattern) will not find any of the four tool names, contradicting the "Heading" role the spec assigns this element and undermining the accessibility bar implied by the project's "keyboard-first operation" UX non-negotiable.
**Fix:** Render an explicit heading element for the card title, e.g. add `asChild`/`as` support to `CardTitle` (mirroring the pattern already used in `Badge`) and use it here:
```tsx
<CardTitle asChild data-testid="tool-card-name" className="...">
  <h3>
    {isNavigable ? <Link href={href} ...>{tool.name}</Link> : tool.name}
  </h3>
</CardTitle>
```

### WR-03: `status: "beta"` is silently indistinguishable from `"active"` — no visual signal, no test coverage

**File:** `components/ToolCard.tsx:42` (`const isPlanned = tool.status === "planned";`)
**Issue:** `ToolDefinition.status` is a three-way union (`"active" | "beta" | "planned"`), but `ToolCard` only branches on `"planned"` vs. everything else. A tool with `status: "beta"` is rendered fully navigable, with the exact same styling as an `"active"` tool and no badge at all — users have no way to know a tool is still in beta. This is currently invisible because no registry entry uses `"beta"`, but the branch is unexercised and untested, so the first tool shipped as beta will silently look production-ready.
**Fix:** Handle all three states explicitly, e.g.:
```tsx
const badgeLabel =
  tool.status === "planned" ? "Coming soon" :
  tool.status === "beta" ? "Beta" : null;
```
and render `badgeLabel` instead of the current `isPlanned ? <Badge>Coming soon</Badge> : null`.

## Info

### IN-01: No test asserts the "Coming soon" badge actually renders for a planned tool

**File:** `components/ToolCard.test.tsx:78-88`
**Issue:** The planned-tool test only asserts zero anchors and the absence of hover/focus ring classes; it never asserts the badge text itself is present. A regression that silently drops the badge (e.g., a typo in the `isPlanned` condition) would not be caught by this suite.
**Fix:** Add `expect(getByText("Coming soon")).toBeInTheDocument();` (or equivalent) to the planned-tool test.

### IN-02: No test covers the unmapped-icon fallback path (relates to WR-01)

**File:** `components/ToolCard.test.tsx`
**Issue:** There is no fixture with an `icon` value absent from `ICONS`, so the fallback-to-`Fingerprint` behavior (and any future dev-warning) is untested.
**Fix:** Add a test case with `icon: "NotARealIcon"` and assert the component still renders without throwing (and, if WR-01's fix is adopted, that a warning fires).

### IN-03: No test covers `status: "beta"` rendering (relates to WR-03)

**File:** `components/ToolCard.test.tsx`
**Issue:** The test fixtures only cover `"active"` and `"planned"`; `"beta"` — a valid member of the `ToolDefinition.status` union — is never exercised.
**Fix:** Add a `BETA_TOOL` fixture and assert the intended (currently undefined) behavior once WR-03 is addressed.

### IN-04: Unanchored URL regex weakens e2e navigation assertions

**File:** `tests/e2e/home.spec.ts:65,79`
**Issue:** `await expect(page).toHaveURL(/\/tools\//)` matches any URL containing the substring `/tools/` anywhere (query string, hash, etc.), not just a path that starts with it. Given same-origin relative navigation in a Playwright test this is low-risk in practice, but it's a looser assertion than intended and wouldn't catch a navigation to an unexpected path that happens to contain `/tools/` as a substring.
**Fix:** Anchor the regex to the path start, e.g. `/\/^\/tools\//` via `new URL(page.url()).pathname` check, or `toHaveURL(/^\/tools\/[a-z-]+$/)` relative to origin.

---

_Reviewed: 2026-07-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
