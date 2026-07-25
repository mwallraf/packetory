---
phase: 01-shared-shell-registry
plan: 01
subsystem: ui
tags: [nextjs, react, typescript, tailwindcss, shadcn, vitest, playwright, theming]

requires: []
provides:
  - "Next.js 16 App Router + TypeScript + Tailwind 4 scaffold (no src/, @/* alias)"
  - "tools/registry.ts single-source-of-truth ToolDefinition registry (uuid, subnet, dns, mac)"
  - "components/ToolCard.tsx + app/page.tsx registry-driven landing grid"
  - "components/ThemeProvider.tsx + components/ThemeToggle.tsx no-flash light/dark theme"
  - "vitest.config.ts + playwright.config.ts test infra"
affects: [01-02, 01-03, 01-04, 01-05, phase-02-uuid]

tech-stack:
  added:
    - "next@16.2.11, react@19.2.8, react-dom@19.2.8"
    - "tailwindcss@4.3.3, @tailwindcss/postcss@4.3.3"
    - "shadcn CLI (radix-nova preset) + radix-ui@1.6.4, tw-animate-css@1.4.0"
    - "lucide-react, class-variance-authority, clsx, tailwind-merge, geist"
    - "typescript@6.0.3 (downgraded from CLAUDE.md's 7.0.2 — see deviations)"
    - "eslint@9.39.5 (downgraded from CLAUDE.md's 10.7.0 — see deviations), eslint-config-next@16.2.11"
    - "vitest@4.1.10, @vitejs/plugin-react, jsdom, @testing-library/react, @testing-library/dom, vite-tsconfig-paths"
    - "@playwright/test@1.61.1, fast-check@4.9.0, @fast-check/vitest@0.4.1"
  patterns:
    - "tools/registry.ts is the single source of truth every shared component iterates (SHELL-04) — no hardcoded tool lists"
    - "getSortedTools(): featured desc, then name asc via case-insensitive localeCompare"
    - "Server components by default; 'use client' only where interaction requires it (ThemeProvider, ThemeToggle)"
    - "Pre-hydration inline <script> in <head> + suppressHydrationWarning for no-flash theming"
    - "useSyncExternalStore to read/subscribe to DOM state (documentElement class) set outside React, avoiding setState-in-effect"
    - "UI-SPEC color contract implemented as literal hex custom properties (not oklch) mapped onto shadcn's CSS variable naming"

key-files:
  created:
    - tools/registry.ts
    - tools/registry.test.ts
    - components/ToolCard.tsx
    - components/ThemeProvider.tsx
    - components/ThemeToggle.tsx
    - app/layout.tsx
    - app/page.tsx
    - app/globals.css
    - components/ui/card.tsx
    - components/ui/badge.tsx
    - components/ui/button.tsx
    - components/ui/tooltip.tsx
    - components/ui/separator.tsx
    - lib/utils.ts
    - vitest.config.ts
    - playwright.config.ts
    - tests/e2e/home.spec.ts
  modified: []

key-decisions:
  - "Task 1 package-legitimacy checkpoint approved by human ('approved') — installed exactly the CLAUDE.md-documented package list, all versions verified live against npmjs.com before install"
  - "shadcn CLI has moved to a preset system (nova/vega/maia/... + base radix/base/aria) that no longer supports the classic style=new-york/baseColor=slate/radius flow the UI-SPEC assumed; used base=radix preset=nova (closest functional equivalent) and manually overrode all CSS custom properties in app/globals.css with the UI-SPEC's literal hex color contract and radius:0.5rem instead"
  - "Downgraded typescript 7.0.2 -> 6.0.3 and eslint 10.7.0 -> 9.39.5: typescript-eslint (bundled by eslint-config-next) hard-errors on TS 7.0 (peer range >=4.8.4 <6.1.0, TS7 support tracked but unshipped — typescript-eslint#10940), and eslint-plugin-react hard-errors on ESLint 10's Linter Context API (peer range accepts up to ^9.7). Both are current upstream tooling gaps, not something this repo can route around while keeping `npm run lint` functional. Pinned to the newest versions inside each tool's supported range."
  - "Playwright baseURL/webServer.url set to http://localhost:3000 (not 127.0.0.1) — 127.0.0.1 trips Next.js dev's default cross-origin block on the Turbopack HMR websocket, which silently stalls client hydration (zero event listeners attach anywhere in the document, no console error) — found while debugging the theme-toggle e2e test"
  - "ThemeProvider reads the <html> class via useSyncExternalStore (not useState+useEffect) to avoid the react-hooks/set-state-in-effect lint rule and get React's built-in server/client snapshot reconciliation with no hydration-mismatch warning"

patterns-established:
  - "Registry-driven, no-hardcode rule: landing grid iterates tools/registry.ts exclusively; SHELL-04 enforced by grep in plan verification"
  - "Typography roles (Label/Body/Heading/Display) implemented as explicit px/line-height Tailwind arbitrary values per UI-SPEC, not shadcn's default text-sm/text-xs scale"
  - "Accent color reserved strictly for the UI-SPEC's explicit list (theme-toggle icon, focus ring) — 'Coming soon' badge and category label stay neutral slate"

requirements-completed: [SHELL-01, SHELL-04, SHELL-05, SHELL-06]

coverage:
  - id: D1
    description: "Homepage renders one card per registry tool (name, description, category), sourced only from tools/registry.ts; all four tools show status:planned 'Coming soon' badges"
    requirement: "SHELL-01"
    verification:
      - kind: e2e
        ref: "tests/e2e/home.spec.ts#renders exactly four tool cards from the registry, each with name/description/category"
        status: pass
      - kind: e2e
        ref: "tests/e2e/home.spec.ts#each card shows a muted 'Coming soon' badge and is not a clickable link"
        status: pass
    human_judgment: false
  - id: D2
    description: "Grid order is deterministic: featured desc, then case-insensitive name asc (Subnet, UUID, DNS, MAC); tie-break verified via unit test"
    requirement: "SHELL-01"
    verification:
      - kind: unit
        ref: "tools/registry.test.ts#getSortedTools() sorts by featured desc, then name asc (case-insensitive)"
        status: pass
      - kind: unit
        ref: "tools/registry.test.ts#ties within the same featured group break by case-insensitive name localeCompare"
        status: pass
      - kind: e2e
        ref: "tests/e2e/home.spec.ts#cards render in order Subnet, UUID, DNS, MAC (featured desc, then name asc)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No shared component hardcodes a tool name/slug; grid derives entirely from getSortedTools()"
    requirement: "SHELL-04"
    verification:
      - kind: other
        ref: "grep -n tool-name-strings app/page.tsx app/layout.tsx components/ToolCard.tsx components/Theme*.tsx (0 matches)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Light and dark themes fully defined; toggle swaps <html> class and every surface re-colors; persists via localStorage across reload with no third 'system' UI state"
    requirement: "SHELL-05"
    verification:
      - kind: e2e
        ref: "tests/e2e/home.spec.ts#clicking the toggle flips the <html> theme class and persists across reload"
        status: pass
    human_judgment: false
  - id: D5
    description: "No light-to-dark flash (FOUC) or hydration-mismatch warning on load — pre-hydration inline script + useSyncExternalStore"
    requirement: "SHELL-05"
    verification: []
    human_judgment: true
    rationale: "Plan marks this a 'backstop' truth requiring visual/manual confirmation (no FOUC is a perceptual, not purely automated, claim); automated e2e confirms the toggle mechanism and persistence, but the absence-of-flash claim itself needs a human look at a real page load, ideally on a throttled connection."
  - id: D6
    description: "Grid collapses to a single column at 320px, no horizontal scroll, no CLS on theme application"
    requirement: "SHELL-06"
    verification: []
    human_judgment: true
    rationale: "Plan marks this a 'backstop' item explicitly requiring a manual 320px viewport check; not exercised by the current e2e test's default desktop viewport."

duration: 5h (spans a checkpoint pause + this continuation session; ~50min of active tool-call execution)
completed: 2026-07-22
status: complete
---

# Phase 1 Plan 01: Shared Shell Scaffold + Registry + Theme Summary

**Next.js 16 App Router walking skeleton: registry-driven "Coming soon" card grid for all four v1 tools, plus a no-flash light/dark theme toggle persisted to localStorage via `useSyncExternalStore`.**

## Performance

- **Duration:** ~50 min active execution (continuation agent, resumed after a package-legitimacy checkpoint)
- **Completed:** 2026-07-22
- **Tasks:** 3/3 (Task 1 checkpoint approved by human, Task 2 + Task 3 executed)
- **Files modified:** 29 (24 in Task 2, 5 in Task 3)

## Accomplishments

- Scaffolded Next.js 16 App Router + TypeScript + Tailwind 4 + ESLint + shadcn/ui (Card, Badge, Button, Tooltip, Separator) with Geist Sans/Mono fonts, at the repo root (no `src/`, `@/*` alias)
- Built `tools/registry.ts`, the SHELL-04 single source of truth: `ToolDefinition` type locked verbatim from `project-brief.md` §8.1, four entries (uuid, subnet, dns, mac) all `status:"planned"` per flagged assumption A-01, `getSortedTools()`/`getToolBySlug()`
- Landing page (`app/page.tsx` + `components/ToolCard.tsx`) renders the registry as a responsive flat grid (1 col at 320px, up to 3 cols wide) with muted non-clickable "Coming soon" badges, in TDD order (test written and confirmed RED before implementation, then GREEN)
- Full light/dark theming: `THEME_INIT_SCRIPT` inline pre-hydration script (no FOUC), `ThemeProvider` (`useSyncExternalStore`), `ThemeToggle` (44×44 hit area, accent-tinted Sun/Moon icon), localStorage-only persistence (`packetory-theme` key, never a cookie)
- Test infra stood up: Vitest (jsdom) for `tools/registry.ts`, Playwright for the full landing-page + theme-toggle user flow — 5 unit tests + 4 e2e tests, all green; `npm run build`/`typecheck`/`lint` all pass clean

## Task Commits

1. **Task 1: Package legitimacy verification (supply-chain gate)** — no commit (pre-install checkpoint only; human typed "approved", all packages verified live against npmjs.com before Task 2's install — see Deviations)
2. **Task 2: Scaffold app + tool registry + landing-page card grid** — `636777a` (feat)
3. **Task 3: Light/dark theme provider + no-flash toggle** — `3887100` (feat)

**Plan metadata:** pending (this commit)

_Note: Task 2 was tdd="true" at the task level. Tests (`tools/registry.test.ts`, `tests/e2e/home.spec.ts`) were written first and confirmed RED (import-resolution failure / missing page content) before any implementation, then made GREEN — but committed as a single atomic `feat` commit rather than separate `test(...)`/`feat(...)` commits, since the scaffold's test and implementation files were authored together as one coherent walking-skeleton deliverable. See "TDD Gate Compliance" below._

## Files Created/Modified

- `tools/registry.ts` — `ToolDefinition` type + 4-entry registry + `getSortedTools()`/`getToolBySlug()`
- `tools/registry.test.ts` — sort order, tie-break, status, lookup unit tests
- `app/page.tsx` — landing grid, iterates `getSortedTools()`
- `components/ToolCard.tsx` — registry-driven card (icon map, Coming soon badge, line-clamp-2 description)
- `app/layout.tsx` — root layout: Geist fonts, `THEME_INIT_SCRIPT`, `ThemeProvider`, minimal header with `ThemeToggle`
- `components/ThemeProvider.tsx` — `useSyncExternalStore`-based theme context, localStorage persistence
- `components/ThemeToggle.tsx` — two-state Sun/Moon icon button
- `app/globals.css` — UI-SPEC 60/30/10 color contract (light+dark), radius 0.5rem
- `components/ui/{card,badge,button,tooltip,separator}.tsx`, `lib/utils.ts` — shadcn primitives (radix-nova preset)
- `vitest.config.ts`, `playwright.config.ts`, `tests/e2e/home.spec.ts` — test infrastructure
- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `components.json`, `eslint.config.mjs`, `.gitignore` — project config

## Decisions Made

See `key-decisions` in frontmatter — summarized: (1) human approved the exact CLAUDE.md package list at the Task 1 checkpoint; (2) shadcn's CLI redesign required substituting a preset (`radix`/`nova`) and manually re-applying the UI-SPEC's literal color/radius contract; (3) `typescript` and `eslint` were pinned one step below CLAUDE.md's stated versions because the actual lint toolchain (`typescript-eslint`, `eslint-plugin-react`) does not yet support TS 7.x / ESLint 10.x; (4) Playwright's dev-server URL uses `localhost` not `127.0.0.1` to avoid Next.js's HMR cross-origin block silently killing hydration; (5) theme state reads the DOM via `useSyncExternalStore` to satisfy `react-hooks/set-state-in-effect`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] shadcn CLI no longer supports the UI-SPEC's `style=new-york/baseColor=slate/radius=0.5rem` init flow**
- **Found during:** Task 2
- **Issue:** The installed `shadcn@4.13.1` CLI has moved to a preset system (`nova`/`vega`/`maia`/`lyra`/`mira`/`luma`/`sera`/`rhea` × `base radix/base/aria`) with no `--style`/`--base-color`/`--radius` flags at all — the classic shadcn v2 init contract the UI-SPEC and plan assumed does not exist in this CLI version.
- **Fix:** Ran `shadcn init --template next --base radix -p nova` (closest functional match: Radix primitives, CSS variables), then manually rewrote every color custom property in `app/globals.css` to the UI-SPEC's literal hex values for both themes and set `--radius: 0.5rem`, so the *visual contract* (colors, radius) matches exactly even though the CLI's own naming (`radix-nova`) differs from `new-york`.
- **Files modified:** `components.json`, `app/globals.css`
- **Verification:** Manual diff of every UI-SPEC Color table row against the final `:root`/`.dark` blocks; `npm run build` succeeds.
- **Committed in:** `636777a`

**2. [Rule 3 - Blocking issue] `typescript-eslint` does not support TypeScript 7.0**
- **Found during:** Task 2 (`npm run lint` verify step)
- **Issue:** `npm run lint` hard-errored on load (`typescript-eslint does not support TS 7.0`, peer range `>=4.8.4 <6.1.0`; TS7 support is tracked but unshipped in `typescript-eslint#10940`).
- **Fix:** Downgraded `typescript` from `7.0.2` to `6.0.3` (the newest pre-7 stable release, inside `typescript-eslint`'s supported range).
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm run lint` and `npm run typecheck` both pass clean.
- **Committed in:** `636777a`

**3. [Rule 3 - Blocking issue] `eslint-plugin-react` (bundled by `eslint-config-next`) crashes on ESLint 10's Linter API**
- **Found during:** Task 2 (`npm run lint` verify step, after fixing #2)
- **Issue:** `TypeError: contextOrFilename.getFilename is not a function` inside `eslint-plugin-react`'s `react/display-name` rule — ESLint 10 removed/renamed the legacy `context.getFilename()` API that this plugin version still calls; `eslint-plugin-react`'s peer range only reaches `^9.7`.
- **Fix:** Downgraded `eslint` from `10.7.0` to `9.39.5` (newest version inside `eslint-plugin-react`'s supported peer range).
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm run lint` passes clean.
- **Committed in:** `636777a`

**4. [Rule 1 - Bug] Theme toggle click did nothing — Playwright `127.0.0.1` baseURL silently stalled hydration**
- **Found during:** Task 3 (extending `tests/e2e/home.spec.ts` for the toggle)
- **Issue:** The toggle test failed with the `<html>` class never changing. Systematic debugging (CDP `DOMDebugger.getEventListeners`) showed **zero** event listeners anywhere in the document — React hydration never completed. Root cause: `playwright.config.ts` used `http://127.0.0.1:3000`, which trips Next.js dev's default cross-origin block on the Turbopack HMR websocket (`Blocked cross-origin request to Next.js dev resource`); the client bundle stalled with no thrown error and no console warning.
- **Fix:** Changed `baseURL` and `webServer.url` to `http://localhost:3000`.
- **Files modified:** `playwright.config.ts`
- **Verification:** Same test now passes; confirmed with a standalone Playwright script showing 1 attached listener and successful `localStorage` write after the fix.
- **Committed in:** `3887100`

**5. [Rule 1 - Bug] `react-hooks/set-state-in-effect` lint error on the theme-sync effect**
- **Found during:** Task 3 (`npm run lint` verify step)
- **Issue:** `setTheme(current)` called synchronously inside a mount-only `useEffect` (to reconcile React state with the DOM class already set by `THEME_INIT_SCRIPT`) tripped the `react-hooks/set-state-in-effect` rule shipped with `eslint-plugin-react-hooks@^7`.
- **Fix:** Replaced the `useState` + `useEffect` pair with `useSyncExternalStore`, subscribing to `<html>` class changes via a `MutationObserver` and providing a `getServerSnapshot` — the React-recommended pattern for exactly this "external system differs between server and client" case, with no hydration-mismatch warning and no lint violation.
- **Files modified:** `components/ThemeProvider.tsx`
- **Verification:** `npm run lint` passes clean; e2e toggle/persistence test still passes.
- **Committed in:** `3887100`

---

**Total deviations:** 5 auto-fixed (3× Rule 3 blocking-issue, 2× Rule 1 bug)
**Impact on plan:** All five were necessary to make the plan's own verification gates (`npm run lint`, `npm run build`, the theme-toggle e2e test) actually pass; none reduced scope. The two version downgrades (`typescript`, `eslint`) are the only lasting deviations from CLAUDE.md's stated versions — tracked as tech debt below.

## TDD Gate Compliance

Task 2 (`tdd="true"`): `tools/registry.test.ts` and `tests/e2e/home.spec.ts` were written first; RED confirmed via `npm run test -- tools/registry.test.ts` (import-resolution failure, `registry.ts` did not exist yet) before `tools/registry.ts` was implemented, then GREEN confirmed (5/5 unit tests, 3/3 e2e tests passing). No separate `test(...)` commit was made — RED and GREEN landed in the single `636777a feat(01-01): scaffold...` commit, since splitting a from-scratch app scaffold into a "tests-only, non-buildable" intermediate commit would not have produced a meaningful standalone checkpoint. Flagging per the workflow's TDD gate-sequence check, since a strict `test(...)` → `feat(...)` commit pair is not present in git log.

## Issues Encountered

See "Deviations from Plan" above — all five issues were encountered and resolved during this plan's own verification loop, not pre-existing problems.

## User Setup Required

None — no external service configuration required. (Task 1's package-legitimacy checkpoint required human approval, which was given: "approved".)

## Known Tech Debt

- `typescript` is pinned to `6.0.3` instead of CLAUDE.md's documented `7.0.2`, and `eslint` to `9.39.5` instead of `10.7.0`, purely because `typescript-eslint` and `eslint-plugin-react` (both transitive via `eslint-config-next`) do not yet support those major versions. Revisit both pins once `typescript-eslint#10940` (TS 7.x support) ships and `eslint-config-next`'s bundled `eslint-plugin-react` publishes an ESLint 10-compatible release.
- `components.json` records `style: "radix-nova"` (the shadcn CLI's current preset name) rather than the UI-SPEC's `new-york`/`slate` labels — the CLI no longer exposes those labels. The actual rendered colors/radius match the UI-SPEC exactly (verified by diffing every token); only the preset *name* differs from what UI-SPEC.md's frontmatter states. Future `shadcn add <component>` calls will use this same `radix-nova` preset by default.

## Next Phase Readiness

Ready for the remaining Phase 1 plans (nav, visitor-IP widget, analytics redaction, privacy notice — 01-02 through 01-05): `tools/registry.ts`, the shadcn primitives, the theme system, and the test infrastructure (Vitest + Playwright, both green) are all in place and are the shared foundation every later plan builds on. Two backstop truths from this plan (D5 no-flash, D6 320px/no-CLS) are flagged `human_judgment: true` in the coverage block above and should be confirmed visually before the phase is considered fully verified.

---
*Phase: 01-shared-shell-registry*
*Completed: 2026-07-22*

## Self-Check: PASSED

All 11 created files verified present on disk (`tools/registry.ts`, `tools/registry.test.ts`, `components/ToolCard.tsx`, `components/ThemeProvider.tsx`, `components/ThemeToggle.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `vitest.config.ts`, `playwright.config.ts`, `tests/e2e/home.spec.ts`). Both task commits (`636777a`, `3887100`) verified present in `git log`.
