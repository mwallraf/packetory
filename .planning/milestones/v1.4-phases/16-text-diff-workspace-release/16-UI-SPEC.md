---
phase: "16"
slug: "text-diff-workspace-release"
status: approved
reviewed_at: "2026-11-26"
shadcn_initialized: true
preset: radix-nova
created: "2026-11-26"
---

# Phase 16 — Text Diff UI design contract

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn |
| Preset | radix-nova, neutral base, CSS variables from components.json |
| Component library | Radix UI |
| Icon library | Lucide for the shared tool entry and optional decorative controls |
| Font | Geist Sans for interface text, Geist Mono for snippets and line numbers |

## Component Inventory

Enumerated by `ls components/ui/*.tsx | wc -l` — 13 components — shadcn@4.13.1 — 2026-11-26.

`npx --offline shadcn info` could not enumerate because its registry DNS lookup failed. The 13 files under the configured UI alias supply the component count. `node -p 'require("./node_modules/shadcn/package.json").version'` confirms the installed version.

| Component | Import path | Use |
|-----------|-------------|-----|
| Button | `@/components/ui/button` | Compare, Clear all, example and fold controls |
| Label | `@/components/ui/label` | Associated labels for the two native editors |
| Textarea | `@/components/ui/textarea` | Plain-text editing and paste |
| ToolAbout | `@/components/ToolAbout` | Shared worked example and FAQ below the workspace |

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Diff row vertical padding |
| sm | 8px | Label-to-field gap, toolbar gap, line gutter padding |
| md | 16px | Mobile shell padding, input padding and gaps |
| lg | 24px | Tablet shell padding, workspace gaps and results separation |
| xl | 32px | Wide shell padding, heading-to-workspace separation |
| 2xl | 48px | Shared tool page vertical padding |

Give both desktop editors the same 192px minimum height and each stacked editor a 144px minimum height. Interactive controls use a minimum 44px touch height. Buttons wrap as needed on narrow screens. Use the existing shared radius and focus ring. Spacing exceptions are the shared corner radius, border thickness, and intrinsic line number width.

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Labels, controls, summary, gutter and result lines | 14px | 400 or 600 | 1.5 |
| Intro and editors | 16px | 400 | 1.5 |
| Tool heading | 32px | 600 | 1.2 |

Use 600 for field labels, result headings and toolbar controls. Use 400 for text, counts and statuses. Editors use 16px on touch browsers. Result code and line numbers use Geist Mono with tabular digits.

## Color

| Role | Light | Dark | Use |
|------|-------|------|-----|
| Dominant (60%) | `--background` #ffffff | `--background` #020617 | Page and editor backgrounds |
| Secondary (30%) | `--card` #f1f5f9 | `--card` #0f172a | Gutter, folds and result panel context |
| Accent (10%) | Compare fill #0e7490, focus ring #0891b2 | `--primary` #22d3ee | Compare and focus indicators |
| Additions | emerald-50 row, emerald-200 highlight, emerald-950 text | emerald-950 row, emerald-800 highlight, emerald-100 text | Added row or modified row's added fragment |
| Removals | red-50 row, red-200 highlight, red-950 text | red-950 row, red-800 highlight, red-100 text | Removed row or modified row's removed fragment |

Compare is the primary action in the empty workspace. The change summary anchors the populated result. Reserve the accent for the Compare button and visible focus. Set Compare's light label to white and dark label to slate-950. Use cyan-800 on light hover and cyan-300 on dark hover. Preserve at least 4.5:1 text contrast across base, hover, and inline emphasis. Clear all uses the neutral outline treatment. Errors use normal readable foreground text with a semantic border. Add and remove use visible plus and minus signs supported by screen-reader labels. A modified line's changed spans get the stronger tint and an accessible change meaning. Keep unchanged tokens in normal foreground.

## Layout and interaction

- Use the shared Packetory shell and tool registry at `/tools/diff`. Put the workspace above the existing About area. Use the standard tool heading and short intro. The comparison interface uses type, borders and semantic highlighting.
- Use two stacked editors below the Tailwind `md` breakpoint (768px). At and above it, use two equal-width columns with Original on the left. Place actions underneath in this order: Compare, Clear all, Try an example when available. Keep the comparison status directly after the controls and the result immediately after the status.
- Enable Compare when each editor contains a non-whitespace character. Keep the raw strings intact. Compare on button activation or Ctrl/Command+Enter from within the workspace. Keep editors and Clear all usable during comparison. Suppress accidental repeat submissions of the active pair.
- Try an example is available when both editors are empty and there is no result. It fills both editors and runs the comparison. Use a short test-network configuration with an IP changing from 192.0.2.1 to 192.0.2.2 and one line added. Keep the loaded example editable. The visible example action uses the same native button interaction as Compare.
- Clear all empties both editors, error, status, results and fold state, cancels the current worker, ignores old replies and moves focus to Original. The reset is immediate, with no dialog. Keep input focus and caret steady during normal comparison. An edit invalidates active work and marks a prior result out of date until the next comparison. Clear stale state on reset.
- Render one result model. At and above 768px show a shared grid with Original and Modified headings and corresponding numbered sides aligned on every row. Below 768px show a unified stream. A modified pair appears as its old line followed by its new line, with line numbers and Removed or Added labels as appropriate. Hide inactive layout elements from the accessibility tree if using breakpoint-specific markup.
- Preserve whitespace in text rendering. Use wrapping for long content, including unbroken tokens, with zero minimum grid item width so the page fits at 320px. Keep both sides of a desktop row aligned when either side wraps. Represent a changed final-newline endpoint with the explicit marker in the copy table. Show input and rendering-limit errors inline with both editors editable.
- Keep three unchanged lines adjacent to each change. Where an unchanged run leaves hidden lines beyond that context, render a keyboard-accessible disclosure with an accurate hidden-line count and expanded state. On collapse keep focus on that disclosure. Count each modified pair once in the summary.
- Render comparison content literally and keep it out of URLs, requests, logs, telemetry and app-managed storage.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Tool heading | Text Diff |
| Intro | Paste two snippets to see what changed. The comparison runs in your browser. |
| Editors | Original, Modified |
| Primary CTA | Compare |
| Secondary actions | Clear all, Try an example |
| Empty state heading | Original and Modified are the empty-state headings. |
| Empty state body | Field placeholders read “Paste original text” and “Paste modified text.” The result area begins empty. |
| Running status | Comparing… |
| Dirty result | Out of date. Compare again to update the results. |
| Result summary | {count} added · {count} removed · {count} modified. Omit zero counts. |
| Equal result | No differences found. |
| Fold control | Show {count} unchanged lines. Expanded control reads “Hide {count} unchanged lines.” |
| Source change labels | Added, Removed, Modified |
| Trailing newline marker | No newline at end of text |
| Input limit | One snippet is too long. Shorten it and compare again. |
| Comparison or rendering limit | This comparison is too large to display. Try comparing a smaller section. |
| Worker error | Couldn’t compare this text. Try again. |
| Destructive confirmation | Clear all resets immediately and focuses Original. |

## UI Considerations

Applicable state considerations resolved: 7 covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| Empty | Workspace | ✅ covered | Both fields start empty, Compare is disabled, and the example is available. |
| Partial | Editors | ✅ covered | Compare stays disabled until both fields contain a non-whitespace character. |
| Loading | Toolbar and status | ✅ covered | A polite status announces work in progress and users can still edit or clear. |
| Populated | Results | ✅ covered | Result shows either a change summary and aligned rows or the identical-text message. |
| Stale | Results | ✅ covered | Edits visibly mark previous results out of date and late jobs cannot replace current state. |
| Error | Status region | ✅ covered | An actionable message appears below the controls and both snippets remain editable. |
| Overflow | Results and editors | ✅ covered | Unbroken lines wrap within their pane, and expanding any context fold keeps the page horizontally contained. |

Use a polite live region for comparison state and counts. Keep result rows in an ordinary named region for navigation. Clear all removes all comparison state and restores focus to Original.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Existing local primitives | No new registry fetch or install |
| Third-party | None | Not applicable |

## Checker Sign-Off

- [ ] Dimension 1 Copywriting
- [ ] Dimension 2 Visuals
- [ ] Dimension 3 Color
- [ ] Dimension 4 Typography
- [ ] Dimension 5 Spacing
- [ ] Dimension 6 Registry Safety
- [ ] Dimension 7 Inventory Provenance

**Approval:** pending
