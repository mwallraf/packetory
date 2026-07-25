# Phase 6: Landing Page Card Navigation - Pattern Map

**Mapped:** 2026-07-25
**Files analyzed:** 3 (1 modified component, 1 modified page — no change expected, 1 modified test)
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `components/ToolCard.tsx` | component | request-response (client-side nav via `next/link`) | `components/SiteHeader.tsx` | exact (identical `isNavigable`/`href`/planned-vs-active branch, same registry-driven rendering) |
| `app/page.tsx` | component (page) | CRUD (renders registry list, no logic change expected) | `app/page.tsx` (itself — no structural analog needed) | n/a — likely untouched, verify only |
| `tests/e2e/home.spec.ts` | test | request-response (E2E assertions) | same file, existing `SiteHeader`-style nav E2E tests (none in-repo for nav clicks, but `home.spec.ts` itself is the analog for style/testid conventions) | role-match |

## Pattern Assignments

### `components/ToolCard.tsx` (component, request-response)

**Analog:** `components/SiteHeader.tsx` (lines 1-89, full file — small file, read once)

**Imports pattern** (lines 1-8, SiteHeader.tsx):
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSortedTools } from "@/tools/registry";
```
`ToolCard.tsx` currently has no `"use client"` directive and imports differently (lucide icons, Card primitives, `ToolDefinition` type). Note: `ToolCard.tsx` does NOT need `"use client"` just for a `<Link>` — `next/link` works in Server Components. Only add `"use client"` if a hover/focus JS handler beyond CSS `has-*` selectors is needed (per UI-SPEC, pure CSS `has-[:hover]`/`has-[:focus-visible]` selectors suffice, so `ToolCard` can likely stay a Server Component).

**isNavigable / href branch pattern** (lines 40-78, SiteHeader.tsx) — this is the exact logic to mirror:
```tsx
const href = `/tools/${tool.slug}`;
const isNavigable = tool.status !== "planned";
const isActive =
  isNavigable &&
  (pathname === href || pathname.startsWith(`${href}/`));

if (!isNavigable) {
  // status:"planned" — muted, non-clickable (D-01). Rendered as
  // a <span>, not a <Link>, so it is never a real navigation
  // target or an extraneous tab stop.
  return (
    <span
      key={tool.slug}
      data-testid="nav-link-planned"
      aria-disabled="true"
      className="rounded-md px-2.5 py-1.5 text-[14px] leading-[1.4] font-semibold text-muted-foreground/60"
    >
      {tool.shortName}
    </span>
  );
}

return (
  <Link
    key={tool.slug}
    href={href}
    data-testid="nav-link"
    aria-current={isActive ? "page" : undefined}
    className={cn(
      "rounded-md border-b-2 px-2.5 py-1.5 text-[14px] leading-[1.4] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
      isActive
        ? "border-primary text-primary"
        : "border-transparent text-foreground hover:text-primary"
    )}
  >
    {tool.shortName}
  </Link>
);
```
**Mapping for ToolCard.tsx:** compute `href` and `isNavigable` (reuse `isPlanned` var, already exists at line 40: `const isPlanned = tool.status === "planned";` — so `isNavigable = !isPlanned`). No `isActive`/`aria-current` needed on the landing page (that's nav-only). When `isNavigable`, `CardTitle` renders a `<Link>` inside it (or wraps its text) with the stretched `after:` overlay classes; when not navigable, `CardTitle` stays a plain `<div>` exactly as today (D-05/D-06 — zero markup change on planned cards).

**Focus-visible ring convention to reuse verbatim** (line 70, SiteHeader.tsx and D-04 in CONTEXT.md):
```
focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50
```
Per UI-SPEC, apply this at the `Card` container level via `has-[:focus-visible]:`:
```
has-[:focus-visible]:outline-none has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50
```
plus the new hover-only affordance (UI-SPEC "Prescriptive implementation", exact classes to use):
```
has-[:hover]:ring-primary/40 has-[:hover]:shadow-md transition-shadow
```
Both `has-*` variants go on the `Card` element (line 43, ToolCard.tsx: `<Card data-testid="tool-card" className="h-full">`) — requires adding `relative` to `Card`'s `className` for the `::after` overlay to position against (D-01).

**Stretched-link overlay pattern (no direct in-repo analog — net new; use `next/link` + Tailwind `after:` utilities per CONTEXT D-01/D-02):**
```tsx
<CardTitle data-testid="tool-card-name" className="text-[20px] leading-[1.2] font-semibold">
  {isNavigable ? (
    <Link
      href={href}
      className="after:absolute after:inset-0 focus-visible:outline-none"
    >
      {tool.name}
    </Link>
  ) : (
    tool.name
  )}
</CardTitle>
```
Key constraints from CONTEXT.md/UI-SPEC:
- `Card` needs `relative` added to its `className` (currently just `"h-full"` at line 43) so the `::after` overlay positions relative to the whole card, not the title.
- The `<Link>`'s accessible name must be exactly `tool.name` — do not nest description/category text inside the same anchor (D-02).
- Do not add `tabIndex`, `<Link>`, or `after:` classes at all when `isPlanned` (D-06) — the existing plain-text `CardTitle` render for planned cards must stay byte-for-byte unchanged.

**No error handling / no validation needed** — this is pure client-side declarative navigation (`next/link`), no async call, no try/catch pattern applicable (confirmed by UI-SPEC "Error state: Not applicable").

---

### `app/page.tsx` (page component, CRUD/list-render)

**Analog:** itself — no analog needed; CONTEXT.md explicitly states "no changes expected here beyond what `ToolCard` itself needs" (line 70 of 06-CONTEXT.md). Verify after `ToolCard.tsx` changes that the grid (lines 29-33) still renders correctly; no pattern extraction required unless `ToolCard`'s props signature changes (it won't — `tool: ToolDefinition` stays the same).

---

### `tests/e2e/home.spec.ts` (test, request-response/E2E)

**Analog:** the file itself — existing test conventions to preserve.

**Existing test block that must be updated, not left failing** (lines 37-53):
```ts
test("no card shows a 'Coming soon' badge now that all four registry tools are 'active' ...; no card is itself a clickable link (ToolCard renders no wrapping anchor)", async ({
  page,
}) => {
  await page.goto("/");

  const cards = page.getByTestId("tool-card");
  await expect(cards).toHaveCount(4);

  for (let i = 0; i < 4; i++) {
    const card = cards.nth(i);
    await expect(card.getByText("Coming soon")).toHaveCount(0);
    // ToolCard never wraps itself in an anchor tag, active or planned.
    await expect(card.locator("a")).toHaveCount(0);
  }
});
```
**Required update:** split/rewrite so:
1. The "no 'Coming soon' badge" assertion stays (still true — all four registry tools are active).
2. The "no card is itself a clickable link" / `card.locator("a")).toHaveCount(0)` assertion must be REVERSED to assert each card DOES contain exactly one `<a>` (the stretched-link `<Link>` inside `CardTitle`), and that clicking anywhere on the card (not just the title text) navigates to `/tools/{slug}`.

**Testid conventions to preserve** (lines 9, 14-16, 25-27): `tool-card`, `tool-card-name`, `tool-card-description`, `tool-card-category` — CONTEXT.md line 66 confirms these must be preserved unchanged.

**Pattern for a new/updated navigation-by-click test** (no exact in-repo analog for "click anywhere on card" — construct using existing Playwright idioms already in this file, e.g. `page.getByTestId(...)`, `await expect(page).toHaveURL(...)` per standard Playwright convention used implicitly via `page.goto`/`page.reload` at lines 76-81):
```ts
test("clicking anywhere on an active tool card navigates to its /tools/{slug} page", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId("tool-card").first();
  // click a point inside the card that is NOT the title text/link itself
  await card.click({ position: { x: 10, y: 10 } });
  await expect(page).toHaveURL(/\/tools\//);
});
```

---

## Shared Patterns

### isNavigable / planned-vs-active branch
**Source:** `components/SiteHeader.tsx` lines 40-78
**Apply to:** `components/ToolCard.tsx` — this is the single most important pattern for this phase; CONTEXT.md D-06 explicitly requires "same `isNavigable` condition already used in `SiteHeader.tsx`."

### Focus-visible ring convention
**Source:** `components/SiteHeader.tsx` line 70 (`focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`)
**Apply to:** `components/ToolCard.tsx`'s `Card` container, via `has-[:focus-visible]:` variant per UI-SPEC "Prescriptive implementation."

### Registry-driven rendering (never hardcode slug/status)
**Source:** `tools/registry.ts` (`getSortedTools()`, `ToolDefinition.status`, `ToolDefinition.slug`) — already used identically in `components/SiteHeader.tsx` line 6/23 and `app/page.tsx` line 1/6.
**Apply to:** `components/ToolCard.tsx` (already receives `tool: ToolDefinition` as a prop — no registry import needed inside `ToolCard.tsx` itself, only `tool.slug`/`tool.status`/`tool.name` field access).

### `cn()` utility for conditional Tailwind classes
**Source:** `lib/utils.ts` (`cn`), used in `components/SiteHeader.tsx` line 5 and lines 69-74 for the active/inactive nav-link branch.
**Apply to:** `components/ToolCard.tsx` if the hover/focus `has-*` classes need conditional composition based on `isNavigable` (likely needed since planned cards must NOT receive the `has-[:hover]`/`has-[:focus-visible]` classes at all per D-06).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Stretched-link `::after` overlay technique itself | CSS/markup technique | n/a | No existing component in this codebase uses the stretched-link/card-as-link pattern yet (`SiteHeader.tsx` uses discrete `<Link>`s, not a full-container overlay) — this is genuinely new markup, follow CONTEXT.md D-01/D-02 and UI-SPEC's "Prescriptive implementation" section directly rather than an in-repo analog. |

## Metadata

**Analog search scope:** `components/`, `components/ui/`, `app/`, `tests/e2e/`
**Files scanned:** `components/SiteHeader.tsx`, `components/ToolCard.tsx`, `components/ui/card.tsx`, `app/page.tsx`, `tests/e2e/home.spec.ts` (5 files read in full, no file exceeded 200 lines — single Read pass each, no re-reads)
**Pattern extraction date:** 2026-07-25
