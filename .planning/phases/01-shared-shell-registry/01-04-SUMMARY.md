---
phase: 01-shared-shell-registry
plan: 04
subsystem: infra
tags: [analytics, privacy, redaction, vercel-analytics, nextjs, allow-list, tdd, playwright]

requires:
  - phase: 01-shared-shell-registry (plan 02)
    provides: "app/layout.tsx shell with SiteHeader mounted on every route"
provides:
  - "lib/analytics/redact.ts — framework-agnostic redactParams()/DEFAULT_ALLOW_LIST, the safe-by-default (allow-list, never block-list) mechanism every future tool's URL state must route through before analytics reporting"
  - "lib/analytics/PacketoryAnalytics.tsx — cookie-free Vercel Analytics wrapper that strips all non-allow-listed query params from reported page views via redactParams"
  - "app/privacy/page.tsx — human-approved (2026-07-23) Phase 1 privacy notice, live at /privacy"
  - "components/SiteFooter.tsx — site-wide footer with a Privacy link, rendered below {children} in app/layout.tsx on every route"
affects: [phase-03-subnet, phase-04-dns, phase-05-mac]

tech-stack:
  added:
    - "@vercel/analytics (^2.0.1) — cookie-free page-view analytics"
  patterns:
    - "redactParams(input, allowList) is allow-list-only: a query param is reported ONLY if its key is explicitly present in allowList; there is no block-list and no default-report path, so any future sensitive param (MAC, private IP, hostname, secret) is excluded by default with zero code change"
    - "DEFAULT_ALLOW_LIST starts empty in Phase 1 (no tool params exist yet) — later tools add their own known-safe param names deliberately"
    - "PacketoryAnalytics.tsx is the single required routing point: all reported page URLs pass through redactParams before Vercel Analytics ever sees them"
    - "Legal/privacy-facing copy is drafted live but explicitly flagged as a non-launch-final draft (data-testid=\"privacy-draft-notice\") until a human sign-off checkpoint approves the wording (D-15, autonomy boundary)"

key-files:
  created:
    - lib/analytics/redact.ts
    - lib/analytics/redact.test.ts
    - lib/analytics/PacketoryAnalytics.tsx
    - app/privacy/page.tsx
    - components/SiteFooter.tsx
    - tests/e2e/privacy.spec.ts
  modified:
    - app/layout.tsx
    - package.json

key-decisions:
  - "redactParams accepts URLSearchParams, a query string, or a plain record for ergonomic reuse by pages/routes and future API routes"
  - "Phase 1 DEFAULT_ALLOW_LIST ships empty since no tool has query-param state yet; Subnet/DNS/MAC phases will each deliberately add their own safe param names"
  - "Privacy notice makes no GDPR/CCPA/compliance-certification claim — it describes actual current behavior only; final Belgian/EU disclosure config remains a separate pre-launch step"
  - "Human reviewed the exact drafted privacy-notice wording and replied 'approved' with no edits (2026-07-23) — Task 3's blocking human-verify checkpoint is satisfied; launch-final legal sign-off remains a separate future step per the plan's own done criteria"

patterns-established:
  - "Safe-by-default allow-list redaction: lib/analytics/redact.ts is the mandatory routing point for ANY future tool that puts sensitive state in the URL (Subnet's ?cidr=, DNS's ?name=&type=) — add param names to the allow-list deliberately, never assume something is safe by omission from a block-list"
  - "AI-drafted legal/privacy content ships live but visibly flagged (data-testid=\"privacy-draft-notice\") pending explicit human sign-off, per the project's autonomy boundary for legal text"

requirements-completed: [QUAL-06, QUAL-07]

coverage:
  - id: D1
    description: "Central redactParams() allow-list utility: empty allow-list -> zero params, exact-match retention, new-param auto-exclusion, order independence, no-throw on empty query string"
    requirement: "QUAL-06"
    verification:
      - kind: unit
        ref: "lib/analytics/redact.test.ts (12 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cookie-free Vercel Analytics mounted in app/layout.tsx, routing all reported page-view query params through redactParams before transmission"
    requirement: "QUAL-06"
    verification:
      - kind: integration
        ref: "npm run build && npm run typecheck && npm run lint (all pass, /privacy statically prerendered alongside the rest of the shell)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Human-approved privacy notice live at /privacy, linked from the site footer on every page, describing actual no-cookie/no-account/no-PII/allow-list-redaction behavior"
    requirement: "QUAL-07"
    verification:
      - kind: e2e
        ref: "tests/e2e/privacy.spec.ts (2 tests: /privacy renders all key disclosures; footer Privacy link present on homepage and navigates to /privacy)"
        status: pass
    human_judgment: true
    rationale: "Legal/privacy-facing wording requires explicit human sign-off per the project's autonomy boundary (D-15, project-brief.md §14) — automation can only prove the page renders, not that the words are honest and approved. Human reviewed the exact drafted content and replied 'approved' with no edits on 2026-07-23."

duration: 15min
completed: 2026-07-23
status: complete
---

# Phase 1 Plan 4: Analytics redaction allow-list + cookie-free privacy notice Summary

**Safe-by-default query-param redaction (allow-list, not block-list) wired through cookie-free Vercel Analytics, plus a human-approved privacy notice at /privacy linked from every page's footer**

## Performance

- **Duration:** 15 min (this session — final verification, human sign-off intake, and closeout; Tasks 1-2 and Task 3's automation were completed in a prior session)
- **Completed:** 2026-07-23T12:14:28Z
- **Tasks:** 3/3 complete
- **Files modified:** 8

## Accomplishments

- `lib/analytics/redact.ts` exports `redactParams()` and `DEFAULT_ALLOW_LIST` — a framework-agnostic, allow-list-only redaction utility with 12 passing unit tests covering the empty-allow-list safe-by-default case, exact-match retention, new-param auto-exclusion, order independence, and no-throw-on-empty behavior.
- `lib/analytics/PacketoryAnalytics.tsx` mounts cookie-free Vercel Analytics in `app/layout.tsx`, routing every reported page URL's query params through `redactParams(DEFAULT_ALLOW_LIST)` before transmission — no full path/query is ever reported unfiltered.
- `app/privacy/page.tsx` publishes a real, honest first-pass privacy notice describing no tracking cookies, no accounts, no PII, allow-list analytics redaction, and localStorage-only theme persistence — explicitly flagged as a draft pending sign-off.
- `components/SiteFooter.tsx` renders a "Privacy" link to `/privacy` in `app/layout.tsx` on every route.
- `tests/e2e/privacy.spec.ts` verifies `/privacy` renders its key disclosures and the footer link is present and functional on the homepage.
- **Human reviewed the exact drafted privacy-notice wording and replied "approved" with no edits** — the Task 3 blocking human-verify checkpoint (D-15) is satisfied.

## Task Commits

Each task was committed atomically:

1. **Task 1: Safe-by-default query-param allow-list utility** — `4cead9e` (test, RED) then `6ad6df2` (feat, GREEN)
2. **Task 2: Cookie-free Vercel Analytics wired through redact** — `428bf34` (feat)
3. **Task 3: Privacy notice at /privacy + footer link (human sign-off)** — `b19984e` (feat, automation) — human approved the drafted wording verbatim on 2026-07-23; no further content commit was needed since no wording changes were requested

**Plan metadata:** (this commit) `docs(01-04): complete analytics redaction + privacy notice plan`

_Note: Task 1 followed TDD (test -> feat); Task 3 is a checkpoint task whose deliverable content itself required no code change after human sign-off._

## Files Created/Modified

- `lib/analytics/redact.ts` - `redactParams()` + `DEFAULT_ALLOW_LIST`, the allow-list-only redaction mechanism
- `lib/analytics/redact.test.ts` - 12 unit tests covering safe-by-default, exact-match, auto-exclusion, ordering, no-throw edges
- `lib/analytics/PacketoryAnalytics.tsx` - cookie-free Vercel Analytics wrapper routing reported params through redact
- `app/privacy/page.tsx` - the human-approved Phase 1 privacy notice
- `components/SiteFooter.tsx` - site-wide footer with the Privacy link (D-14)
- `tests/e2e/privacy.spec.ts` - e2e coverage for /privacy render + footer link
- `app/layout.tsx` - now mounts `PacketoryAnalytics` and renders `SiteFooter` below `{children}` on every route
- `package.json` - adds `@vercel/analytics` dependency

## Decisions Made

- Human reviewed the exact drafted privacy-notice wording (quoted back in full at the checkpoint) and responded "approved" — accepting the Phase 1 draft as-is with no wording edits. Launch-final legal sign-off remains a separate pre-launch step per the plan's own done criteria; this is not conflated with that later step.
- No architectural or content changes were needed post-approval, so no additional commit was required beyond the existing `b19984e` (Task 3 automation).

## Deviations from Plan

None - plan executed exactly as written. The human-verify checkpoint gate (Task 3) was satisfied by direct approval of the drafted content with no revision requests.

## Issues Encountered

None. All verification commands (`npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npx playwright test tests/e2e/privacy.spec.ts`) pass cleanly in this closeout session.

## User Setup Required

None - no external service configuration required. `@vercel/analytics` requires no environment variables or dashboard setup to function cookie-free; Vercel Analytics activates automatically once deployed on Vercel (already connected per Plan 05).

## Next Phase Readiness

- The allow-list redaction mechanism (`lib/analytics/redact.ts`) is in place and ready for Phase 3 (Subnet Calculator), which will be the first tool to introduce sensitive URL state (`?cidr=`) — that phase must add its param names to the allow-list deliberately rather than assuming safety by omission.
- Phase 1 (shared-shell-registry) is now fully complete: all 5 plans (01 through 05) have executed and been human-verified where required. No blockers remain for transitioning to Phase 2 (UUID Generator).

---
*Phase: 01-shared-shell-registry*
*Completed: 2026-07-23*

## Self-Check: PASSED

All 9 claimed files found on disk (lib/analytics/redact.ts, lib/analytics/redact.test.ts, lib/analytics/PacketoryAnalytics.tsx, app/privacy/page.tsx, components/SiteFooter.tsx, tests/e2e/privacy.spec.ts, app/layout.tsx, package.json, this SUMMARY.md). All 4 claimed commit hashes (4cead9e, 6ad6df2, 428bf34, b19984e) found in git log.
