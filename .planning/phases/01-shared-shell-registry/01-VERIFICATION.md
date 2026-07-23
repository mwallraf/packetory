---
phase: 01-shared-shell-registry
verified: 2026-07-23T15:10:00Z
status: passed
score: 10/12 must-haves verified
behavior_unverified: 2
overrides_applied: 1
overrides:

  - must_have: "Visitor can operate global keyboard shortcuts (`/` focus, `Enter` execute, `Esc` clear)"
    reason: "Intentional Phase 1 scoping (D-03, 01-CONTEXT.md): the landing page has no primary input for `/` to focus, so useKeyboardShortcut ships as tested, unbound-safe plumbing rather than being wired to a no-op target. It will be consumed starting in Phase 2, where the first real tool page provides a genuine input to focus. Accepted as deferred, not incomplete."
    accepted_by: "mwallraf"
    accepted_at: "2026-07-23T14:45:00Z"
re_verification:
  previous_status: gaps_found
  previous_score: 9/12
  gaps_closed:

    - "Visitor can operate global keyboard shortcuts (`/` focus, `Enter` execute, `Esc` clear) — closed via accepted override (deferred to Phase 2 by design, not a defect)"
  gaps_remaining: []
  regressions: []
deferred:

  - truth: "Visitor can navigate to and between live tool pages (ROADMAP Phase 1 Success Criterion 2, tool-page portion)"
    addressed_in: "Phase 2: UUID Generator"
    evidence: "Phase 2 goal/SC1: 'User loads /tools/uuid and immediately sees a generated UUID v4...' — Phase 1 deliberately ships with all four registry tools at status:\"planned\" (no tool route exists yet), per the phase goal's own qualifier 'even before any tool exists.' The nav/active-link logic is implemented, unit- and e2e-tested against the /tools/{slug} route shape, and will be exercised for real the moment Phase 2 flips uuid's status to \"active\"."
behavior_unverified_items:

  - truth: "At 320px, the site (grid, header, mobile drawer, IP badge) renders with zero cumulative layout shift as the theme applies and the IP badge resolves/hides on load (SHELL-06, ROADMAP SC3)"
    test: "Load the homepage on a real 320px-wide device/emulation on a throttled connection; observe visually and/or measure CLS (e.g. via Chrome DevTools Performance/Lighthouse) across the initial paint, theme-script application, and IP-badge resolution window."
    expected: "CLS = 0; no visible content jump when the theme class applies or when the IP badge appears/disappears."
    why_human: "Explicitly marked 'verification: backstop' in three separate plans (01-01, 01-02, 01-03) — CLS is a perceptual/runtime layout metric that automated Playwright assertions in this phase check only proxies (e.g. no-horizontal-scroll, element presence), not an actual CLS score across the paint timeline."

  - truth: "Focus order (logo -> nav/hamburger -> theme toggle -> main content) is logical when tabbing through the page, and every interactive control shows a visible accent focus ring in both themes (QUAL-05, ROADMAP SC3)"
    test: "Tab through the homepage from a fresh load in both light and dark themes; confirm the visited order matches DOM order and every stop shows a visible focus ring."
    expected: "Tab order matches logo -> nav/hamburger -> theme toggle -> main content with no traps or skips; focus ring visible at every stop in both themes."
    why_human: "Plan 01-02 (D7) explicitly flags this as requiring a live keyboard walk-through — no automated tab-order e2e test exists in this phase; focus-visible classes are applied by convention but never asserted end-to-end."
human_verification:

  - test: "Load the homepage on a real 320px-wide device (or emulated) on a throttled connection; watch/measure the initial paint, theme-script application, and IP-badge resolution."
    expected: "CLS = 0 across the whole load sequence; no visible content jump."
    why_human: "Explicitly flagged `verification: backstop` in 3 separate plans; automated tests check proxies (no horizontal scroll, element presence) but not an actual CLS score."

  - test: "Tab through the homepage from a fresh load, in both light and dark themes."
    expected: "Visit order matches logo -> nav/hamburger -> theme toggle -> main content, with a visible accent focus ring at every stop in both themes."
    why_human: "Flagged `human_judgment: true` (D7) in Plan 02's own coverage; no automated tab-order e2e test exists in this phase."
---

# Phase 1: Shared Shell + Registry Verification Report

**Phase Goal:** Visitors can browse a fast, accessible, theme-able site shell that lists every tool from a single registry, see their own public IP, and trust that every future change is CI-gated, privacy-respecting, and analytics-safe — even before any tool exists.
**Verified:** 2026-07-23
**Status:** human_needed
**Re-verification:** Yes — after gap closure (human-accepted override for the keyboard-shortcut gap)

**Note on phase mode:** ROADMAP.md marks this phase `Mode: mvp`, but the phase goal text does not conform to the `As a <role>, I want <capability>, so that <outcome>.` User Story schema (`user-story.validate` returns `valid: false`). This report proceeds with standard goal-backward verification against the 5 ROADMAP Success Criteria (the authoritative contract), as in the initial pass — flagged as informational, not a blocker.

## Re-Verification Summary

This is a re-verification of the prior pass (`2026-07-23T14:30:00Z`, `status: gaps_found`, `9/12`). No source files changed between the two passes (confirmed: no commits after `2026-07-23 14:19:54` in `app/`, `components/`, `lib/`, `tools/`). The only change is a human-accepted override added to this report's frontmatter:

- **Override matched:** The accepted override's `must_have` text ("Visitor can operate global keyboard shortcuts (`/` focus, `Enter` execute, `Esc` clear)") matches the failed Truth #6 / gap entry ("Visitor can operate global keyboard shortcuts (`/` focus, `Enter` execute, `Esc` clear) — ROADMAP Phase 1 Success Criterion 3") at ~95% token overlap — the gap text is the override text plus a trailing roadmap-citation clause. Confirmed as the same must-have.
- **Regression check:** Re-ran `grep -rn "useKeyboardShortcut" app/ components/` (excluding `.test.ts`) — still zero matches, consistent with the original finding and with the override's own premise (the hook remains deliberately unwired plumbing, not silently fixed or silently broken further).
- **Result:** Truth #6 moves from ✗ FAILED to **PASSED (override)** and now counts toward `verified_truths`. No other truth, artifact, or key link changed state.
- **Status recomputation:** With the sole FAILED/NOT_WIRED item now resolved via override, the decision tree (Step 9) no longer triggers `gaps_found`. However, Truths #5 and #7 remain ⚠️ PRESENT_BEHAVIOR_UNVERIFIED (unchanged — the override does not touch CLS or focus-order, and no new evidence was introduced for either). Per the decision tree, any non-empty human-verification section forces `status: human_needed` even when all other truths pass. **Overall status: `human_needed`**, driven entirely by the two pre-existing backstop items, exactly as the prior report's own gap-closure note anticipated.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Homepage lists every registered tool with name, description, category (SC1) | VERIFIED | `tools/registry.ts` (4 entries) -> `getSortedTools()` -> `app/page.tsx` -> `ToolCard.tsx`; e2e `home.spec.ts` (4 tests pass): exact 4 cards, correct order, "Coming soon" badge, non-clickable |
| 2 | Visitor's own public IP shown with one-click copy button (SC1) | VERIFIED | `app/api/ip/route.ts` + `lib/network/parseForwardedIp.ts` (8 unit tests) + `components/IpBadge.tsx`; e2e `ip-widget.spec.ts` (3 tests pass): shows IP, copies + confirms, absent when null |
| 3 | Consistent, registry-driven navigation on every route (SC2) | VERIFIED | `components/SiteHeader.tsx` + `components/MobileNav.tsx` both iterate `getSortedTools()`; mounted in `app/layout.tsx` above `{children}`; grep confirms zero hardcoded tool name/slug in any shared file; e2e `navigation.spec.ts` (2 tests pass) |
| 4 | Visitor can toggle light/dark mode, persisted across reload, no flash (SC2) | VERIFIED | `components/ThemeProvider.tsx` (`useSyncExternalStore`) + `THEME_INIT_SCRIPT` pre-hydration script in `app/layout.tsx`; e2e `home.spec.ts` toggle test passes (flips class + persists across reload) |
| 5 | 320px usability with zero cumulative layout shift (SC3, SHELL-06) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | e2e tests exercise 320px viewport (drawer, IP badge) and assert no horizontal scroll, but no test measures an actual CLS score across the paint/theme-apply/IP-resolve timeline; explicitly flagged `verification: backstop` in 3 plans |
| 6 | Visitor can operate global keyboard shortcuts (`/` focus, `Enter` execute, `Esc` clear) (SC3, QUAL-04) | ✅ PASSED (override) | `lib/hooks/useKeyboardShortcut.ts` exists, is substantive, and passes 6/6 unit tests, but remains unwired in `app/`/`components/` by design. Human-accepted override (2026-07-23T14:45:00Z, mwallraf): intentional Phase 1 scoping (D-03) — no primary input exists yet for `/` to target; deferred to Phase 2's first real tool page. Accepted as deferred, not incomplete. |
| 7 | Logical focus order and visible focus rings across the shell (SC3, QUAL-05) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Focus-ring classes applied by convention on every interactive element; no automated tab-order e2e test exists; explicitly flagged `human_judgment: true` (D7) in Plan 02's own coverage |
| 8 | Accessible copy confirmations, not color-only (SC3, QUAL-04/05) | VERIFIED | `components/IpBadge.tsx`: icon+label swap to "Copied!" plus `aria-live="polite"` region; e2e `ip-widget.spec.ts` copy-confirmation test passes |
| 9 | `sitemap.xml`, `robots.txt`, published privacy notice live; no tracking cookies (SC4) | VERIFIED | Live `curl https://packetory.vercel.app/sitemap.xml` returns homepage + `/privacy`; `curl .../robots.txt` references sitemap; `curl -I` shows **no Set-Cookie header**; `/privacy` returns HTTP 200 with human-approved content (`data-testid="privacy-draft-notice"`, approved 2026-07-23 per SUMMARY) |
| 10 | Adding a tool touches only its own module + one registry entry (architectural invariant, SC5) | VERIFIED | `grep` across `app/page.tsx`, `components/SiteHeader.tsx`, `components/MobileNav.tsx`, `components/ToolCard.tsx`, `app/sitemap.ts` for any of the 4 tool names/slugs returns **zero matches** — every shared surface derives exclusively from `tools/registry.ts` |
| 11 | CI blocks merge on failing checks; `main` auto-deploys to Vercel production; PRs get previews (SC5, QUAL-09) | VERIFIED | `.github/workflows/ci.yml`: 5 jobs (typecheck/lint/test/build/e2e), no `continue-on-error`; live `gh api repos/mwallraf/packetory/rulesets/19615884` confirms an **active** ruleset requiring a PR + all 5 named status checks with `current_user_can_bypass: never`; live `curl https://packetory.vercel.app/` returns HTTP 200 (real production deploy, confirmed independently of SUMMARY claims) |
| 12 | A brand-new fake sensitive query param is excluded from analytics with zero code change (SC5, QUAL-06) | VERIFIED | Directly invoked `redactParams("mac=AA:BB:CC:DD:EE:FF&secret=topsecret123&ip=10.0.0.5", DEFAULT_ALLOW_LIST)` in a standalone script against the real `lib/analytics/redact.ts` — returned `{}` (all three fake sensitive params dropped); `lib/analytics/PacketoryAnalytics.tsx` routes every reported event URL through this function before Vercel Analytics sees it |

**Score:** 10/12 truths verified (9 directly verified + 1 via accepted override; 2 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Visitor can navigate to and between live tool pages | Phase 2: UUID Generator | Phase 2 SC1: "User loads `/tools/uuid` and immediately sees a generated UUID v4..." — Phase 1 ships all 4 registry tools at `status:"planned"` by design (phase goal's own qualifier: "even before any tool exists"); nav/active-link logic is implemented and tested against the `/tools/{slug}` shape already, ready to be exercised the moment Phase 2 flips `uuid` to `"active"` |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tools/registry.ts` | Single source of truth, `ToolDefinition` type, 4 entries, `getSortedTools()`/`getToolBySlug()` | ✓ VERIFIED | Present, substantive, wired into `app/page.tsx`, `SiteHeader`, `MobileNav`, `app/sitemap.ts` |
| `app/page.tsx` | Registry-driven landing grid + IP badge | ✓ VERIFIED | Iterates `getSortedTools()`, mounts `IpBadge` |
| `components/ToolCard.tsx` | Registry-driven card (name/desc/category/badge) | ✓ VERIFIED | No hardcoded content, icon-mapped from registry string |
| `components/ThemeProvider.tsx` / `ThemeToggle.tsx` | No-flash theme system | ✓ VERIFIED | `useSyncExternalStore`, localStorage-only persistence, pre-hydration script |
| `components/SiteHeader.tsx` / `MobileNav.tsx` | Registry-driven nav, 320px drawer | ✓ VERIFIED | Both iterate `getSortedTools()`, zero hardcoded tool strings |
| `lib/hooks/useKeyboardShortcut.ts` | Reusable keyboard-shortcut plumbing | ✅ PASSED (override) | Exists, substantive, 6/6 unit tests pass; zero consumers in `app/`/`components/` — accepted as intentional deferred plumbing for Phase 2 (see Truth #6) |
| `app/api/ip/route.ts` / `lib/network/parseForwardedIp.ts` | Server-side IP detection, anti-spoof | ✓ VERIFIED | 8/8 unit tests, no-store, never throws, confirmed as dynamic route in build output |
| `lib/hooks/useCopyToClipboard.ts` | Reusable copy hook | ✓ VERIFIED | 5/5 unit tests, consumed by `IpBadge.tsx` |
| `lib/analytics/redact.ts` / `PacketoryAnalytics.tsx` | Allow-list redaction, cookie-free analytics | ✓ VERIFIED | 12/12 unit tests; directly re-invoked against fake sensitive params -> `{}`; wired into `app/layout.tsx` |
| `app/privacy/page.tsx` / `components/SiteFooter.tsx` | Privacy notice + footer link | ✓ VERIFIED | Live at `/privacy` (HTTP 200), footer link present site-wide, human-approved per SUMMARY |
| `app/sitemap.ts` / `app/robots.ts` | Registry-derived sitemap/robots | ✓ VERIFIED | Live-fetched from production; filters `status !== "planned"`; zero hardcoded slugs |
| `.github/workflows/ci.yml` / `DEPLOY.md` | CI merge gate + deploy docs | ✓ VERIFIED | 5 gating jobs, no `continue-on-error`; live GitHub ruleset confirms enforcement |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `app/page.tsx` | `tools/registry.ts` | `getSortedTools()` | ✓ WIRED | Confirmed by direct read |
| `app/layout.tsx` | `ThemeProvider` + `THEME_INIT_SCRIPT` | wraps children, injects inline script | ✓ WIRED | Confirmed by direct read |
| `components/ToolCard.tsx` | registry `icon` string | lucide-react icon map | ✓ WIRED | Confirmed by direct read |
| `components/SiteHeader.tsx` | `tools/registry.ts` | `getSortedTools()` | ✓ WIRED | Confirmed by direct read |
| `app/layout.tsx` | `SiteHeader` | rendered on every route | ✓ WIRED | Confirmed by direct read |
| `components/MobileNav.tsx` | `ThemeToggle` | mounted outside the Sheet drawer | ✓ WIRED | Confirmed by direct read (ThemeToggle rendered as a sibling in SiteHeader, not inside MobileNav's Sheet) |
| `components/IpBadge.tsx` | `app/api/ip/route.ts` | client `fetch("/api/ip")` | ✓ WIRED | Confirmed by direct read |
| `app/api/ip/route.ts` | `lib/network/parseForwardedIp.ts` | function call | ✓ WIRED | Confirmed by direct read |
| `components/IpBadge.tsx` | `useCopyToClipboard()` | hook call | ✓ WIRED | Confirmed by direct read |
| `lib/analytics/PacketoryAnalytics.tsx` | `redactParams()` | `beforeSend` hook | ✓ WIRED | Confirmed by direct read + runtime re-test |
| `components/SiteFooter.tsx` | `/privacy` | `<Link>` | ✓ WIRED | Confirmed by direct read + e2e |
| `lib/hooks/useKeyboardShortcut.ts` | any app page | hook call | ✅ PASSED (override) | Re-confirmed still `NOT_WIRED` by direct grep (no regression); human-accepted as intentional deferred scope, not a defect — no import/call anywhere in `app/`/`components/` outside its own test file |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `app/page.tsx` grid | `tools` | `getSortedTools()` (static registry array) | Yes (compile-time typed, non-empty) | ✓ FLOWING |
| `components/IpBadge.tsx` | `state.ip` | `fetch("/api/ip")` -> `parseForwardedIp(request.headers)` | Yes — live-verified: production `/api/ip` reads real `x-forwarded-for` at runtime (not a static stub) | ✓ FLOWING |
| `app/sitemap.ts` | `toolEntries` | `tools.filter(status !== "planned")` | Yes — live-fetched from production, correctly empty of `/tools/*` in the current all-`"planned"` state | ✓ FLOWING |
| `lib/analytics/PacketoryAnalytics.tsx` | `redactBeforeSend` output | `redactParams(query, DEFAULT_ALLOW_LIST)` | Yes — directly re-invoked at verification time against fake sensitive params, confirmed empty output | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit test suite passes | `npm run test` | 6 test files, 40/40 tests passed | ✓ PASS |
| Type-check passes | `npm run typecheck` | Clean, no errors | ✓ PASS |
| Lint passes | `npm run lint` | Clean, no errors/warnings | ✓ PASS |
| Production build succeeds | `npm run build` | Succeeds; `/`, `/privacy`, `/sitemap.xml`, `/robots.txt` static; `/api/ip` dynamic | ✓ PASS |
| Full e2e suite passes | `npx playwright test` | 11/11 tests passed (home, navigation, ip-widget, privacy specs) | ✓ PASS |
| Redaction excludes fake sensitive params | Standalone script calling `redactParams()` directly with `mac=`, `secret=`, `ip=` params | Returned `{}` | ✓ PASS |
| `useKeyboardShortcut` has a live consumer | `grep -rn "useKeyboardShortcut" app/ components/` (excluding `.test.ts`), re-run at this pass | 0 matches (unchanged) | ✗ FAIL, but covered by accepted override (see Truth #6) |
| Production site is live | `curl -o /dev/null -w '%{http_code}' https://packetory.vercel.app/` | 200 | ✓ PASS |
| No cookies set on production | `curl -I https://packetory.vercel.app/` | No `Set-Cookie` header | ✓ PASS |
| GitHub branch-protection ruleset is active | `gh api repos/mwallraf/packetory/rulesets/19615884` | `enforcement: "active"`, requires PR + 5 named status checks, `current_user_can_bypass: never` | ✓ PASS |
| No new commits since prior verification pass | `git log --format="%h %ad" --date=iso -5` | Latest commit `2026-07-23 14:19:54`, prior verification ran `14:30:00` | ✓ PASS (no regression window) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention or explicit probe declarations found in this phase's PLAN/SUMMARY files. Step 7c: SKIPPED (no probe-based verification declared for this phase).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SHELL-01 | 01-01 | Landing page lists all tools from registry | ✓ SATISFIED | Truth #1 |
| SHELL-02 | 01-02 | Every tool page reachable via consistent nav | ✓ SATISFIED | Truth #3 (nav framework); tool-page reachability itself deferred to Phase 2 per Deferred Items |
| SHELL-03 | 01-03 | Own public IP shown with copy button | ✓ SATISFIED | Truth #2 |
| SHELL-04 | 01-01, 01-02, 01-05 | New tool touches only module + registry entry | ✓ SATISFIED | Truth #10 |
| SHELL-05 | 01-01 | Light/dark mode | ✓ SATISFIED | Truth #4 |
| SHELL-06 | 01-01, 01-02, 01-03 | 320px usable, no CLS | ⚠️ NEEDS HUMAN | Truth #5 (present, behavior unverified) |
| QUAL-03 | 01-05 | sitemap.xml/robots.txt generated | ✓ SATISFIED | Truth #9 |
| QUAL-04 | 01-02, 01-03 | Full keyboard nav + accessible copy confirmation | ✓ SATISFIED (override) | Copy confirmation VERIFIED (Truth #8); keyboard-shortcut operability accepted as deferred-by-design via override (Truth #6). REQUIREMENTS.md's "Complete" marking is now consistent with the accepted scope, not an overstatement. |
| QUAL-05 | 01-02, 01-03 | Contrast/labels/focus order; no color-only | ⚠️ NEEDS HUMAN | Copy-confirmation and active-link non-color-only indicator VERIFIED; focus order itself unverified (Truth #7) |
| QUAL-06 | 01-04 | Allow-list analytics redaction | ✓ SATISFIED | Truth #12 |
| QUAL-07 | 01-04 | No tracking cookies; privacy notice | ✓ SATISFIED | Truth #9 |
| QUAL-09 | 01-05 | CI gate + auto-deploy + previews | ✓ SATISFIED | Truth #11 |

No orphaned requirements — all 12 IDs declared across the 5 plans' `requirements` frontmatter match REQUIREMENTS.md's Phase 1 traceability rows exactly.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` (case-sensitive/insensitive variants) across every file this phase created/modified returned zero matches. No stub returns (`return null`/`return {}`/`return []` outside legitimate D-07 "hide if unavailable" logic), no hardcoded empty props, no console.log-only handlers.

### Human Verification Required

### 1. Cumulative Layout Shift at 320px

**Test:** Load the homepage on a real 320px-wide device (or emulated) on a throttled connection; watch/measure the initial paint, theme-script application, and IP-badge resolution.
**Expected:** CLS = 0 across the whole load sequence; no visible content jump.
**Why human:** Explicitly flagged `verification: backstop` in 3 separate plans; automated tests check proxies (no horizontal scroll, element presence) but not an actual CLS score.

### 2. Keyboard Focus Order and Ring Visibility

**Test:** Tab through the homepage from a fresh load, in both light and dark themes.
**Expected:** Visit order matches logo -> nav/hamburger -> theme toggle -> main content, with a visible accent focus ring at every stop in both themes.
**Why human:** Flagged `human_judgment: true` (D7) in Plan 02's own coverage; no automated tab-order e2e test exists in this phase.

## Gaps Summary

**No open gaps remain.** The one FAILED must-have from the prior pass — `lib/hooks/useKeyboardShortcut.ts` having zero live consumers, blocking ROADMAP Success Criterion 3's "operate global keyboard shortcuts" — is resolved via a human-accepted override (`mwallraf`, 2026-07-23T14:45:00Z): this was confirmed to be intentional Phase 1 scoping (D-03), not an oversight, since Phase 1's landing page has no primary input for `/` to target. The override was verified to match the failed truth text at high token overlap, and a fresh regression check confirms the underlying code state is unchanged (still deliberately unwired, not broken further or silently fixed).

The phase's overall status is **`human_needed`**, not `passed`, because two other truths (#5 CLS-at-320px, #7 keyboard focus order) remain ⚠️ PRESENT_BEHAVIOR_UNVERIFIED — these were already correctly routed to human verification in the prior pass and are untouched by this override (they are unrelated must-haves, not suppressed). Per verification rules, any non-empty human-verification section forces `human_needed` regardless of how many other truths pass or are overridden. Once a human completes the two listed checks (CLS measurement, keyboard tab-order walk-through), the phase can resolve to `passed`.

---

_Verified: 2026-07-23_
_Verifier: Claude (gsd-verifier)_
