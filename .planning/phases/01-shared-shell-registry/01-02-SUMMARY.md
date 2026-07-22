---
phase: 01-shared-shell-registry
plan: 02
subsystem: ui
tags: [nextjs, react, typescript, tailwindcss, shadcn, radix-dialog, vitest, playwright, keyboard-accessibility]

requires:
  - phase: 01-shared-shell-registry (plan 01)
    provides: "tools/registry.ts (getSortedTools/ToolDefinition), ThemeToggle, shadcn primitives, Vitest/Playwright test infra"
provides:
  - "components/SiteHeader.tsx — registry-driven top nav bar rendered on every route via app/layout.tsx"
  - "components/MobileNav.tsx + components/ui/sheet.tsx — 320px hamburger drawer (Radix Dialog-based Sheet)"
  - "lib/hooks/useKeyboardShortcut.ts — reusable slash/enter/escape/copy keydown plumbing, unbound-safe"
affects: [01-03, 01-04, 01-05, phase-02-uuid]

tech-stack:
  added:
    - "shadcn Sheet component (components/ui/sheet.tsx, added via `npx shadcn add sheet`, no new npm dependency — built on the already-installed radix-ui package's Dialog primitive)"
  patterns:
    - "SiteHeader/MobileNav both iterate getSortedTools() — zero hardcoded tool links, enforced by grep in verification"
    - "status:\"planned\" tools render as a non-interactive <span> (not a <Link>) in both desktop nav and mobile drawer, so they are never a real navigation target or an extraneous tab stop (D-01)"
    - "Active-nav-link distinguished by both accent tint AND a border-b-2/border-l-2 underline indicator, never color alone (QUAL-05)"
    - "useKeyboardShortcut reads handlers from a ref synced in a post-render effect (not written during render, avoiding the react-hooks/refs lint error) so the single window keydown listener is never re-subscribed on every render"
    - "Editable-field guard for the copy shortcut checks tag name + isContentEditable + the contenteditable attribute/property directly, since jsdom (used by this hook's own unit tests) doesn't compute isContentEditable"

key-files:
  created:
    - components/SiteHeader.tsx
    - components/MobileNav.tsx
    - components/ui/sheet.tsx
    - lib/hooks/useKeyboardShortcut.ts
    - lib/hooks/useKeyboardShortcut.test.ts
    - tests/e2e/navigation.spec.ts
  modified:
    - app/layout.tsx

key-decisions:
  - "Nav routes assumed as /tools/{slug} per project-brief.md's documented URL examples (/tools/subnet?cidr=..., /tools/dns?name=...) — no route yet exists (all tools status:\"planned\"), but the active-link matcher is written against this shape now so Phase 2 needs no nav-logic change when the uuid route ships"
  - "Task 1 built SiteHeader with a reserved 44x44 hamburger placeholder slot; Task 2 replaced it with the real MobileNav component — kept as two atomic commits per the plan's task boundaries, with no layout shift between them"
  - "e2e assertions for header/toggle visibility while the drawer is open use getByTestId, not getByRole — Radix's modal Sheet correctly marks background content aria-hidden while open (focus-trap a11y behavior), which strips it from Playwright's accessibility-tree-based role queries even though it stays visually present"

patterns-established:
  - "Registry-driven nav: any shared nav surface (desktop bar, mobile drawer) must iterate getSortedTools(), never hardcode a tool slug/name/shortName — verified by grep in this plan and reusable as a check in future plans"
  - "Keyboard-shortcut plumbing: lib/hooks/useKeyboardShortcut.ts is the single hook Phase 2+ tool pages import and bind their own slash/enter/escape/copy handlers to — no page should attach its own raw keydown listener"

requirements-completed: [SHELL-02, SHELL-04, SHELL-06, QUAL-04, QUAL-05]

coverage:
  - id: D1
    description: "SiteHeader renders a registry-driven top nav bar on every route; desktop tool links iterate getSortedTools() with zero hardcoded tool names/slugs"
    requirement: "SHELL-02"
    verification:
      - kind: other
        ref: "grep -n 'UUID Generator|Subnet Calculator|DNS Lookup|MAC Address' components/SiteHeader.tsx components/MobileNav.tsx app/layout.tsx (0 matches)"
        status: pass
      - kind: other
        ref: "npm run build && npm run typecheck && npm run lint (all pass with SiteHeader mounted in app/layout.tsx)"
        status: pass
    human_judgment: false
  - id: D2
    description: "status:\"planned\" tools (all four in Phase 1) render muted and non-clickable as a <span>, not a <Link>, in both the desktop nav and the mobile drawer (D-01)"
    requirement: "SHELL-04"
    verification:
      - kind: e2e
        ref: "tests/e2e/navigation.spec.ts#hamburger trigger is visible; opening reveals all tool shortNames while logo + theme toggle stay visible — asserts drawer.locator('a')).toHaveCount(0)"
        status: pass
    human_judgment: true
    rationale: "The e2e assertion proves the mobile drawer's planned-tool spans are non-clickable; the desktop nav shares the identical isNavigable branch but has no dedicated >=640px e2e check in this plan (no route exists yet to click through since every tool is still status:\"planned\") — worth a quick visual confirm once Phase 2 makes the first tool active."
  - id: D3
    description: "Active-nav-link logic (exactly one active link, matched via /tools/{slug}, distinguished by accent tint AND a non-color underline/border indicator) is implemented and ready, though unexercised at runtime since no status:\"active\" tool exists in Phase 1 (SHELL-02 adjacency edge, QUAL-05)"
    requirement: "SHELL-02"
    verification: []
    human_judgment: true
    rationale: "No tool route is active yet to navigate to and observe the active-link styling; logic is implemented identically in SiteHeader and MobileNav and will be exercised for real once Phase 2 ships the first active tool page. Flagged for a visual check at that point."
  - id: D4
    description: "At <=320px the desktop nav hides and a 44x44 hamburger trigger opens a scrollable Sheet drawer listing registry shortName links; logo and ThemeToggle stay visible outside the drawer; Esc closes it and returns focus to the trigger; no horizontal scroll (D-04, SHELL-06)"
    requirement: "SHELL-06"
    verification:
      - kind: e2e
        ref: "tests/e2e/navigation.spec.ts#hamburger trigger is visible; opening reveals all tool shortNames while logo + theme toggle stay visible"
        status: pass
      - kind: e2e
        ref: "tests/e2e/navigation.spec.ts#Esc closes the drawer and returns focus to the trigger"
        status: pass
    human_judgment: false
  - id: D5
    description: "useKeyboardShortcut hook: slash/enter/escape/copy handler map on a single window keydown listener; '/' is unbound-safe (no-op, never throws) with no registered handler and never fires while focus is inside an editable field; Ctrl/Cmd+C only fires outside editable fields; listener removed on unmount (D-03, QUAL-04)"
    requirement: "QUAL-04"
    verification:
      - kind: unit
        ref: "lib/hooks/useKeyboardShortcut.test.ts#calls the slash handler and prevents default on '/' keydown"
        status: pass
      - kind: unit
        ref: "lib/hooks/useKeyboardShortcut.test.ts#is unbound-safe: pressing '/' with no registered handler is a no-op that never throws (D-03)"
        status: pass
      - kind: unit
        ref: "lib/hooks/useKeyboardShortcut.test.ts#fires the copy handler on Ctrl/Cmd+C when focus is outside an editable field"
        status: pass
      - kind: unit
        ref: "lib/hooks/useKeyboardShortcut.test.ts#does NOT fire the copy handler when focus is inside an editable field (input/textarea/contenteditable)"
        status: pass
      - kind: unit
        ref: "lib/hooks/useKeyboardShortcut.test.ts#fires the escape and enter handlers when registered"
        status: pass
      - kind: unit
        ref: "lib/hooks/useKeyboardShortcut.test.ts#removes the keydown listener on unmount (no leaked listeners)"
        status: pass
    human_judgment: false
  - id: D6
    description: "No command palette, quick-switcher, or functional '/' binding is built in Phase 1 — the hook is plumbing only, not wired to any landing-page target (D-03, deferred scope)"
    requirement: "QUAL-04"
    verification:
      - kind: other
        ref: "grep -rn 'palette|quick-switcher' app/ components/ lib/ (0 matches); no consumer of useKeyboardShortcut exists yet in app/ or components/"
        status: pass
    human_judgment: false
  - id: D7
    description: "Focus order (logo -> nav/hamburger -> theme toggle -> main content) and a visible accent focus ring on every interactive control (QUAL-05)"
    requirement: "QUAL-05"
    verification: []
    human_judgment: true
    rationale: "Focus-visible ring classes are applied consistently (matching Task 1's ThemeToggle convention from Plan 01) and DOM order matches the intended tab sequence, but this plan has no automated keyboard-tab-order e2e test — a live keyboard walk-through is the reliable way to confirm perceived focus order and ring visibility across both themes."
  - id: D8
    description: "Mobile drawer scrolls vertically once tool-link count exceeds viewport height, while the header/logo/toggle stay pinned outside the scroll area (UI-SPEC mobile-nav-drawer overflow backstop)"
    requirement: "SHELL-06"
    verification: []
    human_judgment: true
    rationale: "UI-SPEC explicitly marks this row 'backstop' — needs a visual test once tool count grows past Phase 1's 4 registry entries to actually overflow the drawer's viewport height; the drawer nav is already built with overflow-y-auto and a shrink-0 header, but there's nothing to visually overflow yet."

duration: ~55min active execution
completed: 2026-07-22
status: complete
---

# Phase 1 Plan 02: Registry-Driven Nav + Mobile Drawer + Keyboard Plumbing Summary

**Registry-driven `SiteHeader` (desktop nav + logo + theme-toggle mount) rendered on every route, a Radix-Dialog-based `MobileNav` Sheet drawer at 320px, and a reusable `useKeyboardShortcut` hook covering slash/enter/escape/copy — all unbound-safe until Phase 2 tool pages consume them.**

## Performance

- **Duration:** ~55 min active execution
- **Completed:** 2026-07-22
- **Tasks:** 3/3 (Task 3 was `tdd="true"`: RED then GREEN commits)
- **Files modified:** 6 created, 1 modified (7 total)

## Accomplishments

- `components/SiteHeader.tsx`: sticky top nav bar (Secondary/slate bg per UI-SPEC) deriving desktop tool links exclusively from `getSortedTools()` — zero hardcoded tool names (SHELL-04); `status:"planned"` tools (all four in Phase 1) render as muted, non-clickable spans (D-01); active-link logic marks the current route with both an accent tint and a non-color underline indicator (QUAL-05), ready for Phase 2's first active tool
- Mounted `SiteHeader` in `app/layout.tsx` above `{children}` so it's consistent on every route (SHELL-02)
- `components/ui/sheet.tsx` added via `npx shadcn add sheet` (Radix Dialog-based, no new npm dependency) and `components/MobileNav.tsx`: 44x44 hamburger trigger opening a scrollable drawer of registry `shortName` links at <=320px; logo + `ThemeToggle` stay visible outside the drawer (D-04); Radix's default focus trap, Esc-to-close, and focus-return-to-trigger all apply out of the box
- `tests/e2e/navigation.spec.ts` (320px viewport): hamburger visibility, drawer contents (all 4 registry shortNames), pinned logo/toggle, zero anchor tags for planned tools, no horizontal scroll, and Esc-close-with-focus-return — all passing
- `lib/hooks/useKeyboardShortcut.ts`: reusable global keydown plumbing for `{slash, enter, escape, copy}` handlers built TDD-first (RED then GREEN); `/` is unbound-safe (silent no-op, never throws, with no handler registered — D-03) and never hijacks typing already in progress inside an editable field; Ctrl/Cmd+C only fires outside editable fields so native text-selection copy still works; single listener cleans up on unmount
- Full verification suite green: `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test` (11/11 unit tests across both Plan 01 + Plan 02), `npx playwright test` (6/6 e2e tests across `home.spec.ts` + `navigation.spec.ts`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Registry-driven site header + layout integration** — `430781c` (feat)
2. **Task 2: Mobile hamburger nav drawer (320px)** — `9611aac` (feat)
3. **Task 3: Reusable keyboard-shortcut hook (plumbing)** — `8b6e8a7` (test, RED) then `1416096` (feat, GREEN)

**Plan metadata:** pending (this commit)

_Note: Task 3 was `tdd="true"`. `lib/hooks/useKeyboardShortcut.test.ts` was written and confirmed RED (import-resolution failure — the hook didn't exist yet) before `lib/hooks/useKeyboardShortcut.ts` was implemented, then confirmed GREEN (6/6 tests passing). See "TDD Gate Compliance" below._

## Files Created/Modified

- `components/SiteHeader.tsx` — registry-driven top nav bar, mounted on every route
- `components/MobileNav.tsx` — 320px hamburger Sheet drawer, registry-driven
- `components/ui/sheet.tsx` — shadcn Sheet primitive (Radix Dialog), added via CLI
- `lib/hooks/useKeyboardShortcut.ts` — reusable slash/enter/escape/copy keydown hook
- `lib/hooks/useKeyboardShortcut.test.ts` — 6 unit tests (RED then GREEN)
- `tests/e2e/navigation.spec.ts` — 2 Playwright tests at 320px viewport
- `app/layout.tsx` — modified to render `SiteHeader` in place of the Plan 01 inline placeholder header

## Decisions Made

See `key-decisions` in frontmatter — summarized: (1) nav hrefs assume the `/tools/{slug}` route shape documented in `project-brief.md`, so Phase 2's uuid page needs no nav-logic change; (2) Task 1 reserved a 44x44 hamburger placeholder slot, replaced by the real `MobileNav` in Task 2, avoiding CLS between the two atomic commits; (3) e2e visibility checks for the header while the drawer is open use `getByTestId` rather than `getByRole`, since Radix's modal Sheet correctly `aria-hide`s background content while open (a11y-correct focus-trap behavior) which a role-based query would otherwise filter out.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `getByRole` link query failed while the mobile drawer was open**
- **Found during:** Task 2 (writing `tests/e2e/navigation.spec.ts`)
- **Issue:** `page.getByRole("link", { name: "Packetory" })` timed out while the Sheet drawer was open. Root cause: Radix's modal `Dialog`/`Sheet` marks sibling content `aria-hidden="true"` while open (correct focus-trap accessibility behavior — screen readers shouldn't reach inert background content), which removes it from Playwright's accessibility-tree-based role queries even though it's still visually present.
- **Fix:** Added `data-testid="site-logo"` to the logo `Link` and switched the test to `page.getByTestId(...)`, which checks actual DOM/CSS visibility rather than the accessibility tree.
- **Files modified:** `components/SiteHeader.tsx`, `tests/e2e/navigation.spec.ts`
- **Verification:** `npx playwright test tests/e2e/navigation.spec.ts` — both tests pass.
- **Committed in:** `9611aac`

**2. [Rule 1 - Bug] jsdom doesn't compute `isContentEditable`, so the copy-shortcut's editable-field guard test failed**
- **Found during:** Task 3 (`npm run test -- lib/hooks/useKeyboardShortcut.test.ts`, GREEN attempt)
- **Issue:** The `contenteditable` unit test case failed — jsdom (used by this hook's own Vitest suite) doesn't implement `HTMLElement.isContentEditable` (returns `undefined`) and doesn't reflect the `contentEditable` IDL property back onto the `contenteditable` attribute, unlike real browsers.
- **Fix:** `isEditableTarget()` now also checks the `contenteditable` attribute directly and the raw `contentEditable` property value (`=== "true"`) as a jsdom-compatible fallback, in addition to `isContentEditable` (which real browsers satisfy directly).
- **Files modified:** `lib/hooks/useKeyboardShortcut.ts`
- **Verification:** `npm run test -- lib/hooks/useKeyboardShortcut.test.ts` — 6/6 pass.
- **Committed in:** `1416096`

**3. [Rule 1 - Bug] `react-hooks/refs` lint error on the ref-sync pattern**
- **Found during:** Task 3 (`npm run lint` verify step, GREEN attempt)
- **Issue:** `handlersRef.current = handlers;` written directly in the hook's render body tripped the `react-hooks/refs` rule shipped with `eslint-plugin-react-hooks@^7` ("Cannot access refs during render").
- **Fix:** Moved the ref sync into its own `useEffect(() => { handlersRef.current = handlers; })` with no dependency array (runs after every render), keeping the main keydown-listener effect's empty-deps array (and thus its single stable subscription) unchanged.
- **Files modified:** `lib/hooks/useKeyboardShortcut.ts`
- **Verification:** `npm run lint` passes clean; all 6 hook unit tests still pass.
- **Committed in:** `1416096`

---

**Total deviations:** 3 auto-fixed (all Rule 1 — bugs surfaced by the plan's own verification gates)
**Impact on plan:** All three were necessary to make `npm run lint`, `npm run test`, and the e2e suite actually pass as specified in the plan's own verification steps; none reduced or expanded scope.

## TDD Gate Compliance

Task 3 (`tdd="true"`): `lib/hooks/useKeyboardShortcut.test.ts` was written first; RED confirmed via `npm run test -- lib/hooks/useKeyboardShortcut.test.ts` (import-resolution failure — `useKeyboardShortcut.ts` did not exist) in commit `8b6e8a7 test(01-02): add failing test for useKeyboardShortcut hook (RED)`. GREEN confirmed (6/6 tests passing, after the two Rule 1 fixes above) in commit `1416096 feat(01-02): implement useKeyboardShortcut hook (GREEN)`. Both gate commits are present in `git log` in the correct order — RED before GREEN. No REFACTOR commit was needed (no post-GREEN cleanup beyond what GREEN already required).

## Issues Encountered

See "Deviations from Plan" above — all three issues were surfaced and resolved during this plan's own verification loop, not pre-existing problems.

## User Setup Required

None — no external service configuration required. No auth gates encountered; plan executed fully autonomously with no checkpoints (as declared in its frontmatter).

## Next Phase Readiness

Ready for the remaining Phase 1 plans (01-03 visitor-IP widget, 01-04 analytics redaction, 01-05 privacy notice + CI): the registry-driven nav pattern, the Sheet-based drawer pattern, and the `useKeyboardShortcut` hook are all in place as shared shell infrastructure. Phase 2 (UUID Generator) can bind `/` to its primary input and `Enter`/`Escape`/copy to its own handlers via `useKeyboardShortcut` with zero changes to the hook itself, and its tool page will automatically appear in both nav surfaces the moment its registry entry's `status` flips to `"active"`.

Four coverage items are flagged `human_judgment: true` (D2, D3, D7, D8 above) — desktop nav's planned-tool non-clickability, the active-link visual treatment (unexercised until a real active tool exists), keyboard focus order/ring visibility, and the mobile-drawer overflow-scroll backstop — all worth a quick manual pass, ideally once Phase 2 ships the first active tool route.

---
*Phase: 01-shared-shell-registry*
*Completed: 2026-07-22*
