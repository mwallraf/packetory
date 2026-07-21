# Phase 1: Shared Shell + Registry - Pattern Map

**Mapped:** 2026-07-21
**Files analyzed:** 12 (approx.)
**Analogs found:** 0 / 12 (greenfield repo — no analogs exist in-codebase)

## Greenfield Notice

This is a greenfield repository. At the time of this analysis, the working tree
contains only `.planning/`, `.claude/`, and `project-brief.md` at the repo root —
no `package.json`, no `app/`, no prior Next.js scaffold, and no prior phase has
shipped code (confirmed via `ls`/`find` at repo root: only `.claude`, `.git`,
`.planning`, `project-brief.md` present).

**There are no existing-code analogs to copy from.** Instead of inventing a
fictitious analog, this document extracts the concrete conventions, shapes, and
schemas already locked in `project-brief.md` (§8, §8.1, §8.2) and
`.claude/CLAUDE.md` (confirmed tech stack) that the planner and executor MUST
follow when creating this phase's files from scratch. Phase 1 is itself the
"pattern-establishing" phase — its outputs (registry, nav, theme provider,
redaction util) become the analogs that Phases 2-5 will map against.

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|-----------------|---------------|
| `tools/registry.ts` | model/config | CRUD (static, read-only) | none | no-analog |
| `app/layout.tsx` | component (root layout) | request-response | none | no-analog |
| `app/page.tsx` | component (landing page) | request-response | none | no-analog |
| `app/privacy/page.tsx` | component (static page) | request-response | none | no-analog |
| `app/api/ip/route.ts` (or similar) | route (API route handler) | request-response | none | no-analog |
| `components/SiteHeader.tsx` / nav | component | request-response | none | no-analog |
| `components/ToolCard.tsx` | component | transform (render list item) | none | no-analog |
| `components/ThemeToggle.tsx` | component | event-driven (client) | none | no-analog |
| `components/ThemeProvider.tsx` | provider | event-driven (client, localStorage) | none | no-analog |
| `components/IpBadge.tsx` | component | request-response (fetch API route) | none | no-analog |
| `lib/analytics/redact.ts` | utility | transform | none | no-analog |
| `lib/hooks/useKeyboardShortcut.ts` (or similar) | hook | event-driven | none | no-analog |
| `app/sitemap.ts` | config/route | batch (build-time generation from registry) | none | no-analog |
| test files (`*.test.ts(x)`) | test | n/a | none | no-analog |

## Pattern Assignments (from project-brief.md + CLAUDE.md, no code analogs available)

### `tools/registry.ts` (model/config, CRUD-static)

**Source of shape:** `project-brief.md` §8.1 (lines 283-301)

Exact type to implement, verbatim from the brief — this is locked, not open for
reinterpretation:

```ts
export type ToolDefinition = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  category: "network" | "dns" | "web" | "encode" | "generate";
  keywords: string[];
  icon: string;
  status: "active" | "beta" | "planned";
  clientOnly: boolean;
  featured: boolean;
};
```

**Contents required by CONTEXT.md D-01:** all 5 entries (shell + uuid + subnet +
dns + mac) must exist in the array from Phase 1 onward, even though only the
shell ships now. Non-shell entries get `status: "planned"`.

**Integration point rule (CONTEXT.md line 75):** `tools/registry.ts` is the
single file every future tool phase edits to register itself. No nav/sitemap/
landing-page component should require a code change when a new tool is added —
they must all derive their lists by importing and iterating/filtering this
registry array, never by hardcoding tool entries inline.

**Consumers that must derive from the registry (not hardcode tool lists):**
- Landing page grid (`app/page.tsx`) — sort by `featured` then alphabetical
  (CONTEXT.md D-02)
- Nav/header tool links
- `app/sitemap.ts` — one sitemap entry per non-"planned" (or all, per Claude's
  judgement at execution time) registry slug

### `lib/analytics/redact.ts` (utility, transform)

**Source of shape:** `project-brief.md` §8.2 (lines 303-313) + CONTEXT.md D-13

Behavior contract (no code exists yet, so implement to this contract):
- Central allow-list utility that every page/route routes tracked URL query
  params through before reporting to analytics.
- **Safe-by-default:** a param is reported ONLY if explicitly present in the
  allow-list. Never allow-list-by-exclusion (i.e., never "block known-bad
  params" — always "permit known-good params"). This is the concrete QUAL-06
  mechanism per CONTEXT.md D-13.
- Must exclude/redact: MAC addresses, internal hostnames/domains, private IP
  ranges, generated secrets/tokens (brief §8.2, though Phase 1 has no tool
  params yet — this phase just builds the plumbing/utility itself for later
  phases to call).

### `components/ThemeProvider.tsx` + `components/ThemeToggle.tsx` (provider/component, event-driven)

**Source of shape:** CONTEXT.md D-09, D-10, D-11

- Default: follow `prefers-color-scheme` on first visit.
- Manual override persists via `localStorage` (NOT a cookie) — required to stay
  within the "no tracking cookies" privacy constraint (CLAUDE.md Privacy
  constraint).
- Toggle UI is a simple two-state (light/dark) icon button, no third "system"
  state exposed in the UI, even though system-preference is the initial
  detection source.
- Must avoid CLS / hydration flash — standard Next.js App Router theme
  providers apply the theme class via an inline script or `suppressHydrationWarning`
  before paint; no existing repo convention to copy, so the executor should
  follow standard Next.js 16 App Router theming practice (research this at
  implementation time if needed, since RESEARCH.md was skipped this run).

### `app/api/ip/route.ts` (route, request-response)

**Source of shape:** CONTEXT.md D-05, D-06, D-07

- Server-side Next.js Route Handler (App Router `route.ts` convention) reading
  the incoming request's forwarded-IP header (e.g. `x-forwarded-for` /
  Vercel's `req.headers.get('x-forwarded-for')` or `x-real-ip`) — no
  third-party IP-echo service call.
- Return whichever address family is present (IPv4 or IPv6) — no dual lookup.
- If undeterminable, the API/response should signal "not available" so the
  client component can hide the widget entirely (D-07) rather than rendering
  an error/placeholder state.

### `components/IpBadge.tsx` (component, request-response)

**Source of shape:** CONTEXT.md D-05, D-07, D-08, specifics section

- Small badge/pill near top of page (header/hero), secondary visual weight —
  not a tool card.
- Fetches from `app/api/ip/route.ts`.
- Renders nothing (not an error state) when IP is unavailable.
- One-click copy affordance per the brief's global UX non-negotiable ("one-click
  copy with visible confirmation everywhere" — CLAUDE.md UX constraints).

### `app/page.tsx` (landing page component, request-response)

**Source of shape:** CONTEXT.md D-01, D-02, D-04, D-16

- Single responsive flat grid (no category grouping in Phase 1).
- Sort: `featured` flag first, then alphabetical — derived from
  `tools/registry.ts`, not hardcoded.
- `status: "planned"` tools render with a muted "Coming soon" badge and are
  not clickable (or link to a stub).
- Must remain usable at 320px width, no CLS (D-16, baseline across all Phase 1
  UI).

### Mobile nav / header (component)

**Source of shape:** CONTEXT.md D-04

- ≤320px: hamburger menu. Logo + theme toggle stay visible; tool links
  collapse behind the hamburger icon.

### Keyboard shortcut plumbing (hook, event-driven)

**Source of shape:** CONTEXT.md D-03, project-brief.md §6 (lines 222-234)

- Build the reusable hook/framework now (e.g. `useKeyboardShortcut` or similar)
  supporting `/` focus, `Enter` execute, `Esc` clear, `Ctrl/Cmd+C` copy — but
  `/` has no landing-page target in Phase 1 (no input to focus yet). Wire the
  hook without binding `/` to anything functional until Phase 2 tool pages
  exist.
- No command palette / quick-switcher — explicitly deferred (CONTEXT.md
  deferred section).

## Shared Patterns

### Registry-driven, no-hardcode rule
**Source:** `project-brief.md` §8 ("Adding a tool should mean creating the tool
module and registering it, without editing multiple shared navigation
components") + CONTEXT.md line 75
**Apply to:** landing page, header/nav, sitemap — all must read from
`tools/registry.ts`, never hardcode a tool list.

### Privacy-safe-by-default
**Source:** `project-brief.md` §8.2, §10.5; CONTEXT.md D-13
**Apply to:** `lib/analytics/redact.ts` and any component/page passing query
params to Vercel Analytics — allow-list only, no cookies, no PII.

### Framework-agnostic core logic
**Source:** `project-brief.md` §8 ("Core logic: framework-agnostic modules
shared by pages, tests, and future APIs")
**Apply to:** any pure logic extracted in this phase (e.g. redaction logic,
theme-resolution logic) should live under `lib/` with no Next.js/React import
dependency, so it is independently unit-testable per CLAUDE.md's Vitest
conventions.

### Static-first rendering
**Source:** CLAUDE.md constraints; `project-brief.md` §8
**Apply to:** `app/page.tsx`, `app/privacy/page.tsx` should be server
components by default; only `ThemeToggle`, `IpBadge`, mobile-nav
hamburger-toggle, and the keyboard-shortcut hook need `"use client"`.

## No Analog Found

All files in this phase have no in-codebase analog, since this is the first
phase of a greenfield repository. Every entry in the File Classification table
above falls into this bucket. The planner should treat `project-brief.md` §8/§8.1/§8.2
and this document's "Pattern Assignments" section as the authoritative source
for shape/conventions instead of a code analog, and should note that Phase 1's
own output becomes the analog baseline for Phase 2 onward (e.g. Phase 2's tool
pages should copy the `app/page.tsx` server/client split pattern and
`lib/` framework-agnostic module pattern established here).

## Metadata

**Analog search scope:** entire repo root (`.`), excluding `.git`, `.planning`
**Files scanned:** repo root listing only — confirmed no `app/`, `components/`,
`lib/`, or `tools/` directories exist yet (`ls -la` and `find . -maxdepth 2`
both run at repo root)
**Pattern extraction date:** 2026-07-21
**Sources used in place of code analogs:** `project-brief.md` (§6, §7, §8,
§8.1, §8.2, §10), `.claude/CLAUDE.md` (Technology Stack, Constraints),
`.planning/phases/01-shared-shell-registry/01-CONTEXT.md` (all decisions D-01
through D-16)
