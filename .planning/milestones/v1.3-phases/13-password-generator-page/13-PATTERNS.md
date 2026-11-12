# Phase 13: Password Generator Page - Pattern Map

**Mapped:** 2026-11-11
**Files analyzed:** 17 new/modified
**Analogs found:** 16 / 17 (all analog paths verified git-tracked)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/tools/password/page.tsx` | route (server shell) | request-response (static) | `app/tools/uuid/page.tsx` | exact (minus ToolAbout, plus noindex) |
| `app/tools/password/PasswordToolLoader.tsx` | component (client boundary) | request-response | `app/tools/uuid/UuidToolLoader.tsx` | exact |
| `app/tools/password/PasswordTool.tsx` | component (island) | event-driven + CRUD state | `app/tools/uuid/UuidTool.tsx` | exact (role + flow) |
| `app/tools/password/PasswordOptionsPanel.tsx` | component | event-driven | `app/tools/uuid/UuidTool.tsx` L187-303 (Label/Input/Switch rows) | role-match |
| `app/tools/password/PasswordOutput.tsx` / `PasswordRow.tsx` | component | event-driven | `app/tools/uuid/UuidTool.tsx` L305-460 (hero, Copy all, batch list) | role-match |
| `app/tools/password/ColoredPassword.tsx` + `runs.ts` | component + utility | transform | none for runs; `lib/config/token-classes.ts` for palette | partial |
| `app/tools/password/password-test-utils.ts` | utility (test helper) | transform | `lib/password/test-utils.ts` (exports `queueFill`, `constantFill`, `recordingFill`) | role-match |
| `app/tools/password/PasswordTool*.test.tsx` | test | event-driven | `app/tools/hash/HashTool.test.tsx` (+ split `.keyboard/.url/.output` files) | exact |
| `app/tools/password/page-guards.test.ts` | test (source guard) | batch | `lib/password/boundaries.test.ts` | exact |
| `lib/password/boundaries.test.ts` (modify L23) | test | batch | self | n/a |
| `tests/e2e/password*.spec.ts` | test (e2e) | request-response | `tests/e2e/hash-url.spec.ts`, `uuid.spec.ts` | role-match |
| `tests/e2e-prod/password-ssr.spec.ts` | test (prod e2e) | request-response | `tests/e2e-prod/about-prod.spec.ts` (uses `request` fixture) | role-match |

## Pattern Assignments

### `app/tools/password/page.tsx` (server shell)
**Analog:** `app/tools/uuid/page.tsx` L1-48. Copy the `Metadata` object shape, `SITE_URL` import, and the `<div className="flex flex-1 flex-col bg-background"><main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">` + h1 `text-[32px] leading-[1.2] font-semibold text-foreground` + `<div className="mt-8"><Loader/></div>`.
```tsx
import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
const CANONICAL_URL = `${SITE_URL}/tools/uuid`;
export const metadata: Metadata = { title, description, alternates: { canonical: CANONICAL_URL }, openGraph: {...} };
```
Differences: drop `ToolAbout` / `faq-data` and OG (D-04), add `robots: { index: false, follow: false }`. No props, no request API, so route stays static.

### `app/tools/password/PasswordToolLoader.tsx`
**Analog:** `app/tools/uuid/UuidToolLoader.tsx` (whole file, 42 lines).
```tsx
"use client";
import dynamic from "next/dynamic";
const UuidTool = dynamic(() => import("./UuidTool").then((mod) => mod.UuidTool), {
  ssr: false, loading: () => <UuidToolSkeleton />,
});
function UuidToolSkeleton() {
  return <div aria-hidden="true" data-testid="uuid-hero-skeleton"
    className="h-[76px] animate-pulse rounded-md border border-border bg-secondary" />;
}
export function UuidToolLoader() { return <UuidTool />; }
```
Use `data-testid="password-skeleton"`, provisional `h-[Npx] sm:h-[Mpx]` per RESEARCH Pattern 10 (measure; record in SUMMARY). Island needs a named export plus default (`export default UuidTool;` at UuidTool.tsx L478).

### `app/tools/password/PasswordTool.tsx` (island)
**Analog:** `app/tools/uuid/UuidTool.tsx`

**Imports / hooks** (L1-17):
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
```
Replace the uuid lib imports with the `@/lib/password` barrel only (never `@/lib/password/test-utils` or wordlist).

**Draft-count validation** (L36-47, generalize to `parseIntInRange(value, min, max)` with constants):
```tsx
function parseCountInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (parsed < 1 || parsed > 100) return null;
  return parsed;
}
```
**Lazy initializer** (L63-72): `useState<UuidToolState>(() => ({ rawUuids: generateBatch(...) ...}))` plus `countInput`/`countError` draft state. Password variant: ONE lazy initializer calling `parseOptions(window.location.search)` then `generate()` in try/catch, with NO `typeof window` guard (RESEARCH Pattern 1). Do not write the URL inside it.

**Keyboard wiring incl. WR-03** (L102-111):
```tsx
useKeyboardShortcut({
  slash: () => countInputRef.current?.focus(),
  enter: () => regenerate(),
  copy: state.count === 1 ? () => copy(primaryValue) : undefined,
});
```
Add the `window.getSelection()?.toString()` early return (D-14), `escape: resetAll` (lift drafts to island state; do not remount the panel).

**WR-02 reset** (L96-100): UUID uses a `useEffect` keyed on results. Password variant (RESEARCH Pattern 7): call `heroCopy.reset(); allCopy.reset()` inside the single `applyGenerated()` handler helper instead of an effect. Two independent hook instances as in L74-82.

**Draft input error UI** (L229-251): `Input` with `inputMode="numeric"`, `aria-invalid={countError}`, `aria-describedby` conditional hint span. Add `autoComplete="off"`, `spellCheck={false}`, `data-1p-ignore`, `data-lpignore="true"`, `data-bwignore` (D-08; see Hash analog below).

**Switch row** (L268-284):
```tsx
<Label htmlFor="uuid-case-switch" className="text-[14px] leading-[1.4] font-semibold">Case</Label>
<Switch id="uuid-case-switch" data-testid="uuid-case-switch" checked={...} onCheckedChange={...} />
```
Add `className="peer-disabled:opacity-100"` on Label (shadcn Label has `peer-disabled:opacity-50`).

**Copy button + confirmation + live region** (L405-442): icon/label swap with `Check`/`Copy`, `h-11 min-w-11 rounded-full ... text-primary`, `{error && <span ...>Couldn&apos;t copy — select the text and copy manually.</span>}`. Password variant: one shared `aria-live="polite"` sr-only region with fixed phrases only (not the per-button `copied ? "Copied!"` span); announce from the hook's `copied` becoming true, not the click handler. Never put the value in `aria-label`/`title`/`data-*`.

**Batch list and keys** (L446-463): UUID uses `key={`${index}-${value}`}`; password MUST use `key={`${generation}-${index}`}` (never the value). Rows own their own `useCopyToClipboard`.

**Regenerate button** (L253-266): copy classes verbatim (`inline-flex h-11 ... rounded-full px-3 text-primary ...`) with `RefreshCw`.

### URL writer (in `PasswordTool.tsx`)
**Analog:** `app/tools/subnet/SubnetTool.tsx` L93-100.
```tsx
function syncCidrToUrl(cidr: string): void {
  const url = `${window.location.pathname}?cidr=${encodeURIComponent(cidr)}`;
  window.history.replaceState(null, "", url);
}
```
Password: `const qs = serializeOptions(opts); replaceState(null, "", qs ? \`${pathname}?${qs}\` : pathname)`. Call from `commit()` and a mount-only effect. No `router.replace`, `useSearchParams`, hash. Note: in real Next `history.state` is NOT null (RESEARCH Pitfall 1); only assert null in jsdom.

### Input attribute hardening
**Analog:** `app/tools/hash/HashTool.tsx` L328-334:
```tsx
spellCheck={false}
autoCorrect="off"
autoCapitalize="off"
autoComplete="off"
data-1p-ignore
data-lpignore="true"
data-form-type="other"
```
Add `data-bwignore` (D-08). Test analog: `HashTool.test.tsx` L97-101 (`el.getAttribute("spellcheck")).toBe("false")`, `autocomplete` `"off"`, `hasAttribute("data-1p-ignore")`). Iterate over every input in the password tool.

### `ColoredPassword.tsx` / `runs.ts`
No code analog. Use RESEARCH Pattern 6 (`segmentRuns`, adjacent spans, no whitespace, index keys, `data-kind` with fixed values only). Palette: `text-foreground`, `text-sky-700 dark:text-sky-300`, `text-amber-700 dark:text-amber-300` (D-09); consult `lib/config/token-classes.ts` for the pairing convention. Optionally add a fast-check property (concat of runs equals input).

### `password-test-utils.ts`
**Analog:** `lib/password/test-utils.ts` (`queueFill`, `constantFill`, `recordingFill`; the `RandomFill` seam). Non-test file under `app/tools/password`, so it is scanned by the `getRandomValues` guard: export only `cycleFill(indices)`, do NOT name the Web Crypto method, no `.test.` infix. Install in tests via `vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(cycleFill([...]) as never)`. Default pool cycle `[0, 26, 52, 62]` = `Aa0!`.

### `PasswordTool*.test.tsx`
**Analog:** `app/tools/hash/HashTool.test.tsx` (L1-60: vitest + `@testing-library/react` imports, `StrictMode` wrapper, helper functions, `beforeEach` mocking) and its split siblings `HashTool.keyboard.test.tsx`, `.url.test.tsx`, `.output.test.tsx`. Use `fireEvent.change` on controlled inputs. Keyboard: assert Enter keyDown on a button/switch causes zero new `getRandomValues` calls (jsdom does not synthesize click from Enter).

### `page-guards.test.ts` and `lib/password/boundaries.test.ts`
**Analog:** `lib/password/boundaries.test.ts`.
- Modify L22-23: `// Phase 13 appends "app/tools/password" here (D-05).` then `const WALK_DIRS = ["lib/password"];` becomes `["lib/password", "app/tools/password"]`. Check that `LIB_PREFIX` / `isTest` logic (L26, L39) behaves for app/ paths.
- New guard file: begin with `// @vitest-environment node`, pure `analyze(sources)` + in-memory mutants, forbidden snippets assembled from parts (L33-35: `const M = "Ma" + "th"; const GRV = "getRandom" + "Values";`). Ban in non-test files: `localStorage`, `sessionStorage`, `router.replace`, `useSearchParams`, `location.hash`, `pushState`, `track(`, `console.`, `fetch(`, `dangerouslySetInnerHTML`, import of `@/lib/password/test-utils`.

### `tests/e2e/password*.spec.ts`
**Analog:** `tests/e2e/hash-url.spec.ts` (`import { expect, test } from "@playwright/test"`; `test.describe`, `page.goto("/tools/hash?text=...")`, `page.url()` + `history.length` assertions, `context.grantPermissions(["clipboard-read","clipboard-write"])` in `beforeEach`). Also `tests/e2e/uuid.spec.ts` and `hash-keyboard.spec.ts`. Crypto-missing case: `page.addInitScript`. History state: allow null or only `__NA` / `__PRIVATE_NEXTJS_INTERNALS_TREE` keys.

### `tests/e2e-prod/password-ssr.spec.ts`
**Analog:** `tests/e2e-prod/about-prod.spec.ts` (`test({ page, request })`, `test.use({ javaScriptEnabled: false })`; prod server on :3101 via `playwright.prod.config.ts`). Use `request.get("/tools/password")`; strip `<script>`/`<style>`/tags before token scan (RESEARCH Pitfall 2), include a positive control for the detector.

## Shared Patterns

### Copy primitive
**Source:** `lib/hooks/useCopyToClipboard.ts` L18-60. Returns `copy`, `copied`, `error`, `reset`. One instance per copy target; `copy()` never throws and swallows rejection (cannot report success).
**Apply to:** hero, each row, Copy all.

### Keyboard shortcuts
**Source:** `lib/hooks/useKeyboardShortcut.ts`; used unchanged. Enter skipped on button/switch/radio/link/summary; `/` and copy suppressed in editable targets; Esc fires anywhere.

### UI constants and bounds
**Source:** `lib/password` barrel (`LENGTH_MIN/MAX/DEFAULT`, `BATCH_MIN/MAX`, `DEFAULT_SYMBOLS`, `SYMBOL_SET_MAX`, `LOOK_ALIKES`, `DEFAULT_OPTIONS`; `clampInt`, `normalizeSymbols`, `normalizeToolOptions`, `parseOptions`, `serializeOptions`, errors). Never restate numeric literals; hint text from constants.

### Typography and control classes
**Source:** UuidTool: `text-[14px] leading-[1.4] font-semibold` labels, `text-[14px] ... font-normal text-muted-foreground` hints, pill buttons `h-11 ... rounded-full ... focus-visible:ring-[3px] focus-visible:ring-ring/50`, mono output `font-mono ... break-all text-foreground`, bordered surface `rounded-md border border-border bg-secondary`. Per UI-SPEC override `Input` with `h-11 text-base md:text-base`.

### Fail-closed generation
**Source:** RESEARCH Pattern 1/2 (`generate()` try/catch returning `{results: [], error}`; `role="alert"` message; copy controls not rendered; no `console.*`).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `app/tools/password/runs.ts` + `ColoredPassword.tsx` | utility/component | transform | No per-character colored output exists; use RESEARCH Pattern 6 |
| Native `<input type="range">` slider | component | event-driven | No range input used elsewhere; follow RESEARCH Pattern 3 (controlled, commit per `onChange`) |
| Lock-last-switch hint | component | event-driven | New behavior; RESEARCH Pattern 4 |

## Metadata

**Analog search scope:** `app/tools/{uuid,hash,subnet,dns,config}`, `lib/hooks`, `lib/password`, `tests/e2e`, `tests/e2e-prod`, `components/ui`
**Files read:** UuidTool.tsx, UuidToolLoader.tsx, uuid/page.tsx, HashTool.tsx (excerpt), HashTool.test.tsx, SubnetTool.tsx (excerpt), useCopyToClipboard.ts, boundaries.test.ts (excerpts), e2e specs (excerpts)
**Pattern extraction date:** 2026-11-11
