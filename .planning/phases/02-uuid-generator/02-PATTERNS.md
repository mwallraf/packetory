# Phase 2: UUID Generator - Pattern Map

**Mapped:** 2026-07-23
**Files analyzed:** 12
**Analogs found:** 9 / 12 (no direct analog exists yet for the Server-shell/dynamic-loader tool-page split — this is the first tool page — so several assignments combine partial analogs)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/uuid/generate.ts` | utility (framework-agnostic core) | transform | `lib/network/parseForwardedIp.ts` | role-match (pure fn module) |
| `lib/uuid/generate.test.ts` | test | transform | `lib/network/parseForwardedIp.test.ts` | exact (Vitest unit-test shape) |
| `lib/uuid/format.ts` | utility (transform) | transform | `lib/network/parseForwardedIp.ts` | role-match |
| `lib/uuid/format.test.ts` | test | transform | `lib/network/parseForwardedIp.test.ts` | exact |
| `lib/uuid/export.ts` | utility (serialize) | transform | `lib/analytics/redact.ts` | role-match (pure string/array transform, no I/O) |
| `lib/uuid/export.test.ts` | test | transform | `lib/network/parseForwardedIp.test.ts` | exact |
| `app/tools/uuid/page.tsx` | route (Server Component) | request-response | `app/privacy/page.tsx` | role-match (static metadata + prose Server Component) |
| `app/tools/uuid/UuidToolLoader.tsx` | provider/wrapper (Client Component) | event-driven | none in repo | no analog — new pattern (`next/dynamic({ssr:false})` wrapper), follow RESEARCH.md Pattern 1 verbatim |
| `app/tools/uuid/UuidTool.tsx` | component (interactive, Client) | event-driven / CRUD-like (generate/reformat/export) | `components/IpBadge.tsx` | exact (client "use client" widget: hook-driven state, copy button, `data-testid`, accent/copy conventions) |
| `tools/registry.ts` (modify: `status: "planned"` → `"active"`) | config | CRUD (single-field update) | itself (existing file, one-line edit) | exact |
| `tests/e2e/uuid.spec.ts` | test (e2e) | request-response | `tests/e2e/ip-widget.spec.ts` | exact (Playwright spec shape: route mocking, `getByTestId`, clipboard grant) |
| shadcn components (`toggle-group`, `switch`, `input`, `label`, `scroll-area`) | component (generated UI primitive) | — | `components/ui/tooltip.tsx`, `components/ui/button.tsx` | exact (shadcn-generated primitives already in `components/ui/`, same generation convention — no hand-authoring) |

## Pattern Assignments

### `lib/uuid/generate.ts` / `format.ts` / `export.ts` (utility, transform)

**Analog:** `lib/network/parseForwardedIp.ts` (full file read above)

**Module shape to copy:**
- No React/Next import at all — pure TypeScript, framework-agnostic (file header comment explicitly states this requirement: "this module stays framework-agnostic ... independently testable and reusable by pages and future API routes").
- Exported pure functions with no side effects; a documented input type (`HeaderReader` in the analog) for anything abstracted away from a concrete runtime object — for `lib/uuid`, this pattern doesn't need an input abstraction since `uuid.v4()`/`v7()` need no arguments, but keep the same "one clear exported function per concern" shape:
```typescript
export function generateBatch(opts: { version: "v4" | "v7"; count: number }): string[] {
  ...
}
```
- Extensive doc comments above each exported function explaining the "why" (which decision/requirement it satisfies), matching the analog's style:
```typescript
/**
 * Reads the platform-trusted visitor IP from forwarded-IP headers (D-05).
 * ...
 */
export function parseForwardedIp(headers: HeaderReader): string | null {
```
For `lib/uuid/format.ts`, model the doc comment on D-02/D-04's "reformat, not regenerate" distinction (Pitfall 4 in RESEARCH.md) the same way the analog documents its own trust-model constraint.
- Small private helper functions below the public export, same file (see `isPlausibleIpLiteral`, `isValidIpv4`, `isValidIpv6` below `parseForwardedIp`) — mirror this for any internal case/hyphen helper in `format.ts`.

**Error handling pattern:** the analog returns `null`/a safe fallback rather than throwing (`if (!candidate) return null;`). `lib/uuid/*` doesn't have a comparable failure mode (generation cannot fail per UI-SPEC's "error: not applicable" rows), so no try/catch is needed — keep functions total (always return a value for valid input types), consistent with the analog's "no throw" philosophy for a framework-agnostic module.

---

### `lib/uuid/*.test.ts` (test, transform)

**Analog:** `lib/network/parseForwardedIp.test.ts` (full file read above)

**Imports pattern** (lines 1-2):
```typescript
import { describe, expect, it } from "vitest";
import { parseForwardedIp } from "./parseForwardedIp";
```

**Core test-case pattern** (lines 16-62): one `describe` block per module, one `it` per behavior, each `it` title is a plain-English behavior statement that often cites the decision ID it verifies, e.g.:
```typescript
it("preserves an IPv6 value unchanged (D-06 single-family, no normalization)", () => {
  const headers = headersFrom({ "x-forwarded-for": "2001:db8::1" });
  expect(parseForwardedIp(headers)).toBe("2001:db8::1");
});
```
Apply the same "cite the decision in the test title" convention for `format.test.ts` (D-02, D-04) and `generate.test.ts` (D-01, D-03). Per RESEARCH.md's Validation Architecture, `generate.test.ts` and `format.test.ts` should use `@fast-check/vitest`'s `it.prop()` for the boundary/round-trip properties (batch-count 0/1/100/101; `format(format(x,A),B)` round-trip identity) — no existing fast-check test exists yet in this repo to copy from, so follow the official `@fast-check/vitest` API directly (RESEARCH.md's Validation Architecture section is the authoritative source since no in-repo precedent exists).

---

### `app/tools/uuid/page.tsx` (route, Server Component, request-response)

**Analog:** `app/privacy/page.tsx` (full file read above)

**Metadata pattern** (lines 1-7):
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Packetory",
  description: "...",
};
```
Extend for UUID per RESEARCH.md's Code Examples (canonical + OG additions, reusing `SITE_URL` from `app/sitemap.ts`):
```typescript
import { SITE_URL } from "@/app/sitemap";

export const metadata: Metadata = {
  title: "UUID Generator (v4 & v7) — Packetory",
  description: "...", // must mention both versions per D-12
  alternates: { canonical: `${SITE_URL}/tools/uuid` },
  openGraph: { title: "...", description: "...", url: `${SITE_URL}/tools/uuid`, type: "website" },
};
```

**Page-shell + typography pattern** (lines 17-23, 44-47):
```tsx
export default function UuidPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-[32px] leading-[1.2] font-semibold text-foreground">
          UUID Generator
        </h1>
        {/* <UuidToolLoader /> here — the one dynamic subtree */}
        <section>
          <h2 className="text-[20px] leading-[1.2] font-semibold text-foreground">
            Worked example
          </h2>
          <p className="mt-2">...</p>
        </section>
      </main>
    </div>
  );
}
```
Reuse the exact Display (`text-[32px] leading-[1.2] font-semibold`) and Heading (`text-[20px] leading-[1.2] font-semibold`) className strings verbatim from `app/privacy/page.tsx` — these are the project's locked typography tokens (UI-SPEC confirms unchanged inheritance from Phase 1).

**FAQ JSON-LD:** no in-repo analog exists (privacy page has no JSON-LD). Follow RESEARCH.md's Code Examples section verbatim (official Next.js JSON-LD guide pattern, including the `<` → `<` escape) — this is the authoritative source since nothing in-repo does this yet.

---

### `app/tools/uuid/UuidToolLoader.tsx` (provider/wrapper, event-driven)

**No analog found in this repo.** This is a brand-new pattern (`next/dynamic(..., {ssr:false})` wrapper) required specifically to avoid the hydration-mismatch problem RESEARCH.md identifies as the phase's central risk. Use RESEARCH.md's "Architecture Patterns → Pattern 1" code example verbatim — it is sourced directly from the official Next.js 16.2.11 docs and is the only correct implementation shape (do not substitute a lazy `useState` initializer or `isClient`/`useEffect` two-pass — both are explicitly named Anti-Patterns in RESEARCH.md).

---

### `app/tools/uuid/UuidTool.tsx` (component, interactive Client Component)

**Analog:** `components/IpBadge.tsx` (full file read above)

**"use client" + hook composition pattern** (lines 1-5, 23-25):
```tsx
"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";

export function UuidTool() {
  const { copy, copied } = useCopyToClipboard();
  // + useKeyboardShortcut(...) per D-03/A1
```

**Copy-button + confirmation-swap pattern** (lines 77-103) — copy this almost verbatim for both the hero single-copy button and the "Copy all" button:
```tsx
<button
  type="button"
  onClick={() => copy(value)}
  aria-label={copied ? "Copied!" : "Copy UUID"}
  data-testid="uuid-copy"
  className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
>
  {copied ? (
    <>
      <Check aria-hidden="true" className="size-4" />
      <span className="text-[14px] leading-[1.4] font-semibold whitespace-nowrap">Copied!</span>
    </>
  ) : (
    <Copy aria-hidden="true" className="size-5" />
  )}
</button>
<span aria-live="polite" className="sr-only" data-testid="uuid-copy-status">
  {copied ? "Copied!" : ""}
</span>
```
This exact icon+label swap, `data-testid` naming convention (`{widget}-{element}`), 44×44 hit-area class string, and `aria-live="polite"` sr-only announcement span are the project's locked copy-confirmation pattern (UI-SPEC's Copywriting Contract explicitly says "mirroring `IpBadge`'s exact pattern").

**Monospace value display pattern** (lines 71-76):
```tsx
<span
  data-testid="uuid-hero-value"
  className="font-mono text-[16px] leading-[1.5] font-normal break-all text-foreground"
/>
```
Adjust size to Heading role (20px/600, per UI-SPEC) for the hero value specifically, but keep `font-mono` + `break-all` (long-text backstop, matches the IPv6 wrap-not-clip convention UI-SPEC explicitly extends to UUIDs).

**State-shape pattern:** `IpBadge` models a discriminated-union `IpState` (`loading | unavailable | available`). `UuidTool` doesn't need this exact union (no loading/error states per UI-SPEC's coverage table) but should follow the same "one small typed state object, not scattered booleans" discipline — e.g. `{ rawUuids: string[]; version: "v4"|"v7"; case: "upper"|"lower"; hyphens: boolean; count: number; format: "text"|"csv"|"json" }`, with `rawUuids` regenerated only on version/count/regenerate changes (D-01/D-03/D-04) and everything else derived via `lib/uuid/format.ts` on render (Pitfall 4).

**Keyboard-shortcut wiring:** `useKeyboardShortcut` (already read in full above) is imported and called with a handlers object; no existing tool page wires it yet (Phase 1 built it unbound), so follow the hook's own doc comments: bind `slash` to focus the batch-count input (A1/UI-SPEC), `enter` to regenerate, `copy` to copy the hero value.

---

### `tools/registry.ts` (config, one-line CRUD edit)

**Analog:** itself — no external analog needed. The only change is:
```typescript
status: "planned", // → "active"
```
on the existing `uuid` entry (lines 24-37 as read above). No other field changes; `getSortedTools`/`getToolBySlug` (lines 84-96) require no modification — registry-derived nav/sitemap/robots pick this up automatically per SHELL-04.

---

### `tests/e2e/uuid.spec.ts` (test, e2e)

**Analog:** `tests/e2e/ip-widget.spec.ts` (full file read above)

**Spec shape** (lines 1-3, 18-37):
```typescript
import { expect, test } from "@playwright/test";

test.describe("UUID Generator (UUID-01..06, QUAL-01/02)", () => {
  test("loads a v4 UUID immediately with no hydration flicker", async ({ page }) => {
    await page.goto("/tools/uuid");
    await expect(page.getByTestId("uuid-hero-value")).toBeVisible();
  });

  test("copies the hero value with a visible + announced confirmation", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/tools/uuid");
    await page.getByTestId("uuid-copy").click();
    await expect(page.getByTestId("uuid-copy-status")).toHaveText("Copied!");
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText.length).toBeGreaterThan(0);
  });
});
```
Reuse: `context.grantPermissions(["clipboard-read","clipboard-write"])` before any copy assertion, `page.getByTestId(...)` (never CSS selectors), `page.setViewportSize({width:320, height:700})` for the long-text/overflow backstop tests (mirrors lines 60-61 of the analog for the 320px IPv6 backstop — apply identically for the UUID hero value and the 100-row batch list).

---

### shadcn UI primitives (`toggle-group`, `switch`, `input`, `label`, `scroll-area`)

**Analog:** `components/ui/tooltip.tsx`, `components/ui/button.tsx` (existing generated primitives in `components/ui/`)

**Pattern:** these are generated, not hand-authored — run `npx shadcn@latest add toggle-group switch input label scroll-area` (per RESEARCH.md Standard Stack) exactly as Phase 1 generated `button`/`card`/`badge`/`separator`/`tooltip`/`sheet` into `components/ui/`. Do not hand-write these files; do not modify the generated output beyond what shadcn itself produces, consistent with how `tooltip.tsx` imports directly from the unified `radix-ui` package (`import { Tooltip as TooltipPrimitive } from "radix-ui"`).

## Shared Patterns

### Copy-to-clipboard with visible + announced confirmation
**Source:** `lib/hooks/useCopyToClipboard.ts` (full file read above) + `components/IpBadge.tsx` lines 77-103
**Apply to:** `UuidTool.tsx` — both the hero single-copy button and the "Copy all" button. Reuse the hook unmodified; each call site provides its own button/icon/label markup following `IpBadge`'s exact swap pattern.

### Global keyboard shortcuts (unbound-safe)
**Source:** `lib/hooks/useKeyboardShortcut.ts` (full file read above)
**Apply to:** `UuidTool.tsx` — first real consumer of this hook (Phase 1 built it, wired nothing). Bind `slash` → focus batch-count input (A1), `enter` → regenerate (D-03), `copy` → copy hero value. Do not reimplement the editable-field guard; it's already handled by the hook.

### Registry-derived nav/sitemap/robots (no manual wiring)
**Source:** `tools/registry.ts`, `app/sitemap.ts` lines 35-42
**Apply to:** No new code needed — flipping `status: "planned"` → `"active"` on the existing `uuid` entry is sufficient; `app/sitemap.ts`'s `.filter((tool) => tool.status !== "planned")` and equivalent nav-rendering logic elsewhere pick this up automatically (SHELL-04). Do not hand-edit `app/sitemap.ts`, `app/robots.ts`, or nav components for this phase.

### Static Server Component page shell + typography tokens
**Source:** `app/privacy/page.tsx` (full file read above)
**Apply to:** `app/tools/uuid/page.tsx` — reuse the exact `bg-background` / `max-w-3xl` / `px-4 py-12 sm:px-6 lg:px-8` shell classes and the Display/Heading/Body typography className strings verbatim; these are the project's locked tokens (confirmed unchanged in UI-SPEC).

### Client-only render via `next/dynamic({ssr:false})` (new this phase — no in-repo precedent)
**Source:** RESEARCH.md "Architecture Patterns → Pattern 1" (sourced from official Next.js 16.2.11 docs)
**Apply to:** `app/tools/uuid/UuidToolLoader.tsx` — mandatory for UUID-01's "no hydration flicker" success criterion. This is the one place where RESEARCH.md, not an in-repo analog, is authoritative — follow it verbatim rather than inventing a variant.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/tools/uuid/UuidToolLoader.tsx` | provider/wrapper | event-driven | This is the first tool page in the repo; no prior `next/dynamic({ssr:false})` wrapper exists anywhere in the codebase. Use RESEARCH.md's Pattern 1 code example (official Next.js docs) as the authoritative source. |
| FAQ `FAQPage` JSON-LD block (within `app/tools/uuid/page.tsx`) | (embedded, not a separate file) | request-response | No `<script type="application/ld+json">` usage exists anywhere in this repo yet. Use RESEARCH.md's Code Examples section (official Next.js JSON-LD guide, including the XSS-escape caveat) verbatim. |
| `lib/uuid/generate.test.ts` / `format.test.ts` property-based assertions using `@fast-check/vitest` | test | transform | `@fast-check/vitest` is installed (per package.json/RESEARCH.md) but no existing test file in this repo uses `it.prop()` yet — follow the official `@fast-check/vitest` API docs cited in RESEARCH.md rather than an in-repo precedent. |

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `tools/`, `tests/` (entire src tree; no `node_modules`)
**Files scanned:** 26 source files (`.ts`/`.tsx`) via `find`, 8 read in full for pattern extraction: `components/IpBadge.tsx`, `lib/hooks/useCopyToClipboard.ts`, `lib/hooks/useKeyboardShortcut.ts`, `app/privacy/page.tsx`, `tools/registry.ts`, `app/sitemap.ts`, `lib/network/parseForwardedIp.ts` (+ its test), `tests/e2e/ip-widget.spec.ts`, `app/page.tsx`
**Pattern extraction date:** 2026-07-23
