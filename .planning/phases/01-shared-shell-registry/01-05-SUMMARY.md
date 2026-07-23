---
phase: 01-shared-shell-registry
plan: 05
subsystem: infra
tags: [nextjs, sitemap, robots, github-actions, ci, vercel, deploy]

requires:
  - phase: 01-shared-shell-registry (plan 01)
    provides: "tools/registry.ts (tools array + status field), package.json scripts (typecheck/lint/test/build/test:e2e), playwright.config.ts"
provides:
  - "app/sitemap.ts — registry-derived MetadataRoute.Sitemap: homepage + /privacy always, one /tools/<slug> entry per non-'planned' registry tool, zero hardcoded slugs"
  - "app/robots.ts — MetadataRoute.Robots allowing all public routes, referencing the absolute /sitemap.xml URL exported from app/sitemap.ts"
  - ".github/workflows/ci.yml — five parallel gating jobs (typecheck, lint, test, build, e2e) on every PR and push to main, no continue-on-error, pinned npm version to match the committed lockfile"
  - "DEPLOY.md — Vercel GitHub-integration setup, branch-protection/merge-gate instructions, and what the CI workflow does"
  - "vercel.json — pins the Vercel project's framework preset to nextjs (fixes a dashboard misconfiguration discovered during Task 3 verification)"
  - "Verified, working production pipeline: GitHub ruleset 'protect-main' requires the four CI checks + a PR before merge; main auto-deploys to Vercel production at packetory.vercel.app"
affects: [01-04, phase-02-uuid, phase-03-subnet, phase-04-dns, phase-05-mac]

tech-stack:
  added: []
  patterns:
    - "Sitemap/robots derive from tools/registry.ts by filtering on status !== 'planned' — no per-tool file ever needs editing when a tool ships (SHELL-04); app/robots.ts imports SITE_URL from app/sitemap.ts as the single source of the canonical origin rather than duplicating the literal"
    - "CI jobs pin an explicit npm version (npm install -g npm@<version>) before npm ci, matching whatever npm major generated the committed lockfile — the runner's bundled npm version is not assumed to match"
    - "Vercel framework preset is pinned declaratively via a committed vercel.json ({\"framework\": \"nextjs\"}) rather than left to dashboard auto-detection, so a project re-import or dashboard reset can't silently regress to a wrong builder"

key-files:
  created:
    - app/sitemap.ts
    - app/robots.ts
    - app/sitemap.test.ts
    - .github/workflows/ci.yml
    - DEPLOY.md
    - vercel.json
  modified: []

key-decisions:
  - "Sitemap tool entries are produced by filtering the imported registry array (tools.filter(t => t.status !== 'planned')) rather than allow-listing 'active'/'beta' by name, so any future status value other than 'planned' is included by default without a code change."
  - "app/robots.ts imports and reuses app/sitemap.ts's exported SITE_URL constant instead of redeclaring the production origin, so the two files can never drift on the canonical domain."
  - "CI pins NPM_VERSION=11.10.1 as an explicit `npm install -g npm@...` step in every job, ahead of `npm ci`, to eliminate a lockfile-integrity mismatch between the locally-used npm major and the GitHub Actions runner's bundled npm major (see Deviations)."
  - "Vercel's Framework Preset is pinned via a committed vercel.json rather than relying solely on the dashboard's auto-detected setting, after the dashboard setting was found misconfigured as 'Other' during Task 3 verification (see Deviations)."
  - "The merge gate was verified with a real, deliberately-failing commit pushed to an open PR (not just inspection of the ruleset config) — gh pr merge was confirmed rejected with mergeStateStatus=BLOCKED while the failing commit was present, then confirmed CLEAN again after reverting it, before merging PR #1 into main."

patterns-established:
  - "Any future GitHub Actions workflow change must keep NPM_VERSION pinned to the npm major used to generate package-lock.json, or re-verify npm ci compatibility across npm majors before removing the pin."
  - "Any future Vercel project/framework config change should keep vercel.json's framework field in sync with the actual build tool — don't rely on dashboard auto-detection alone for a Next.js project."

requirements-completed: [QUAL-03, QUAL-09, SHELL-04]

coverage:
  - id: D1
    description: "Sitemap includes the homepage and /privacy URLs, contains zero /tools/* entries in the Phase 1 all-'planned' registry state, and auto-includes a synthetic 'active' registry entry's /tools/<slug> URL with no other change"
    requirement: "QUAL-03"
    verification:
      - kind: unit
        ref: "app/sitemap.test.ts#includes the homepage URL and the /privacy URL"
        status: pass
      - kind: unit
        ref: "app/sitemap.test.ts#contains no /tools/* entries when every registry tool is 'planned' (Phase 1 state)"
        status: pass
      - kind: unit
        ref: "app/sitemap.test.ts#auto-includes a synthetic 'active' registry entry's /tools/<slug> URL with no other change (SHELL-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Sitemap tool entries are registry-derived only — no hardcoded tool slug literal appears in app/sitemap.ts"
    requirement: "SHELL-04"
    verification:
      - kind: unit
        ref: "app/sitemap.test.ts#does not hardcode a tool slug literal in app/sitemap.ts (registry-derived only)"
        status: pass
    human_judgment: false
  - id: D3
    description: "robots.txt references the absolute /sitemap.xml URL and allows crawling of public routes; npm run build succeeds with both routes present"
    requirement: "QUAL-03"
    verification:
      - kind: other
        ref: "npm run build (app/sitemap.ts and app/robots.ts compiled as static routes); manual read of app/robots.ts confirms sitemap: `${SITE_URL}/sitemap.xml`"
        status: pass
    human_judgment: false
  - id: D4
    description: "ci.yml runs typecheck/lint/test/build/e2e as gating jobs on every PR and push to main, with no continue-on-error on any gating step"
    requirement: "QUAL-09"
    verification:
      - kind: other
        ref: "grep -v '^\\s*#' .github/workflows/ci.yml | grep -q 'npm run typecheck' && grep -q 'npm run build' && test -f DEPLOY.md"
        status: pass
    human_judgment: false
  - id: D5
    description: "A PR is mergeable only when all four required checks (typecheck, lint, test, build) pass — a single failing check blocks merge regardless of the others' status (QUAL-09 all-must-pass gate)"
    requirement: "QUAL-09"
    verification:
      - kind: manual_procedural
        ref: "Deliberately pushed a failing test commit (3f808ab) and a failing lint commit (acd1096) to PR #1, confirmed via `gh pr merge` that the merge was rejected ('the base branch policy prohibits the merge') with mergeStateStatus=BLOCKED, then reverted both and confirmed mergeStateStatus=CLEAN before merging"
        status: pass
    human_judgment: true
    rationale: "Merge-gate enforcement lives entirely in GitHub's branch-protection/ruleset dashboard configuration, which is not inspectable purely from repo files — the plan's own must_haves mark this a 'backstop' item requiring human/dashboard verification. It was performed end-to-end (real failing PR state, real rejected merge attempt) rather than only configured, and is recorded here as evidence, but the underlying dashboard state itself is not re-verifiable by an automated test in this repo."
  - id: D6
    description: "Vercel is connected to the GitHub repo with Production Branch = main; main auto-deploys to Vercel production; PRs receive preview deployments"
    requirement: "QUAL-09"
    verification:
      - kind: manual_procedural
        ref: "PR #1 (containing all Phase 1 work) merged into main at a7ad760, triggering a Vercel production deployment; `curl https://packetory.vercel.app/` returns HTTP 200 and serves the real Packetory landing page (page title confirmed)"
        status: pass
    human_judgment: true
    rationale: "Vercel project/dashboard connection and the GitHub App integration are dashboard-only setup (per the plan's user_setup and its explicit 'backstop' verification marking) — verified end-to-end via a real merge + live curl against production, but the dashboard configuration itself is outside this repo's automated test surface."

duration: ~20min (Task 3 verification + documentation only; Tasks 1-2 completed in a prior session)
completed: 2026-07-23
status: complete
---

# Phase 1 Plan 05: Registry-Derived Sitemap/Robots + CI Merge Gate + Verified Vercel Deploy Summary

**Registry-derived `sitemap.xml`/`robots.txt`, a five-job GitHub Actions merge gate (typecheck/lint/test/build/e2e, no continue-on-error), and an end-to-end-verified Vercel production deploy + branch-protection merge gate at packetory.vercel.app.**

## Performance

- **Duration:** ~20 min for this session (Task 3 verification + SUMMARY); Tasks 1-2 (sitemap/robots + CI workflow/DEPLOY.md) were completed and committed in a prior session
- **Completed:** 2026-07-23
- **Tasks:** 3/3 (Task 1 TDD, Task 2 auto, Task 3 checkpoint:human-verify — now approved)
- **Files modified:** 6 (app/sitemap.ts, app/robots.ts, app/sitemap.test.ts, .github/workflows/ci.yml, DEPLOY.md, vercel.json)

## Accomplishments

- `app/sitemap.ts`: registry-derived `MetadataRoute.Sitemap` — homepage + `/privacy` always present, one `/tools/<slug>` entry per non-`'planned'` registry tool, zero hardcoded slug literals (4/4 unit tests green, TDD RED confirmed before implementation)
- `app/robots.ts`: `MetadataRoute.Robots` allowing all public routes, referencing the absolute `/sitemap.xml` URL via the `SITE_URL` constant exported from `app/sitemap.ts`
- `.github/workflows/ci.yml`: five parallel gating jobs (`typecheck`, `lint`, `test`, `build`, `e2e`) triggered on every `pull_request` and every `push` to `main`; pinned `actions/checkout@v5` / `actions/setup-node@v5`; `npm ci` against the committed lockfile in every job; no `continue-on-error` on any gating step
- `DEPLOY.md`: documents the Vercel GitHub-integration setup (Production Branch = `main`, PR previews), the branch-protection rule requiring the four named CI checks before merge, and the local `npm run dev` command
- Task 3 (human-verify checkpoint) is now genuinely verified end-to-end, not just configured:
  - Vercel project created at `packetory.vercel.app`, connected to `github.com/mwallraf/packetory`
  - PR #1 opened from a throwaway branch carrying all of Phase 1's work, exercising the full pipeline
  - The GitHub ruleset `protect-main` was found missing `required_status_checks` and a `pull_request` rule (it only had deletion/non-fast-forward protection) — fixed via the GitHub API to require the typecheck/lint/test/build/e2e status checks and a PR before merging
  - The fix was verified by deliberately pushing a failing test and a failing lint error to the PR and confirming `gh pr merge` was rejected (`mergeStateStatus=BLOCKED`); both failures were reverted and CI went green again (`mergeStateStatus=CLEAN`)
  - PR #1 merged into `main` (`a7ad760`), triggering Vercel's automatic production deployment
  - Production verified directly: `curl https://packetory.vercel.app/` returns HTTP 200 and serves the real Packetory landing page

## Task Commits

Each task was committed atomically:

1. **Task 1: Registry-derived sitemap.xml + robots.txt** — `0b7a261` (test, TDD RED) → `88deb44` (feat, TDD GREEN)
2. **Task 2: CI merge-gate workflow + deploy documentation** — `491e22b` (feat)
3. **Task 3: Verify Vercel deploy + CI merge gate (human dashboard setup)** — no new source commit required for the verification step itself; two deviation-fix commits (`61658de`, `cb64644`) and the merge-gate live-fire test commits below were produced during this task's execution

**Deviation-fix commits (part of Task 3 verification):**
- `61658de` — `fix(ci): pin npm version to match local lockfile generation`
- `cb64644` — `fix(vercel): pin framework preset to nextjs via vercel.json`
- `acd1096` / `5ed2647` — deliberate lint failure + revert (merge-gate live-fire test #1)
- `3f808ab` / `4ef123c` — deliberate failing test assertion + revert (merge-gate live-fire test #2)
- `29c362b` / `c605a33` — re-verification after the ruleset fix + revert
- `a7ad760` — merge of PR #1 into `main` (triggers Vercel production deploy)

**Plan metadata:** pending (this commit)

_Note: Tasks 1-2 were executed and committed in a prior session; this continuation session completed only Task 3 (the human-verify checkpoint) plus this SUMMARY/state update._

## Files Created/Modified

- `app/sitemap.ts` — registry-derived sitemap, exports `SITE_URL`
- `app/robots.ts` — robots rules + sitemap reference
- `app/sitemap.test.ts` — 4 unit tests (homepage/privacy present, zero tool URLs when all planned, auto-include on synthetic active entry, no hardcoded slug)
- `.github/workflows/ci.yml` — 5-job CI merge gate
- `DEPLOY.md` — Vercel + branch-protection setup documentation
- `vercel.json` — pins Vercel's framework preset to `nextjs` (new file, added as a deviation fix — see below)

## Decisions Made

See `key-decisions` in frontmatter. Summarized: (1) sitemap/robots derive from the registry with no hardcoded slugs, sharing a single `SITE_URL` source of truth; (2) CI pins an explicit npm version ahead of `npm ci` in every job to avoid a lockfile-integrity mismatch against the runner's bundled npm; (3) Vercel's framework preset is pinned via a committed `vercel.json` rather than left to dashboard auto-detection; (4) the merge gate was verified with a real deliberately-failing PR commit, not just by inspecting the ruleset configuration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vercel project's Framework Preset was misconfigured as "Other" instead of Next.js**
- **Found during:** Task 3 (Vercel deploy verification)
- **Issue:** The Vercel dashboard's auto-detected/selected Framework Preset for the newly-connected project was set to "Other" (static), causing deploys to fail while looking for a `public` output directory instead of invoking the Next.js builder. This was not something the plan anticipated — Vercel's GitHub integration is documented to auto-detect Next.js, but the initial project setup did not.
- **Fix:** Added `vercel.json` with `{"framework": "nextjs"}` to explicitly and declaratively pin the framework preset, removing dependence on dashboard auto-detection.
- **Files modified:** `vercel.json` (new file)
- **Verification:** Merged the fix into `main`; the subsequent Vercel production deployment succeeded and `curl https://packetory.vercel.app/` returned HTTP 200 with the real landing page.
- **Committed in:** `cb64644`

**2. [Rule 1/3 - Bug/Blocking] `npm ci` failed under the GitHub Actions runner's bundled npm version**
- **Found during:** Task 3 (CI verification while opening the throwaway verification PR)
- **Issue:** `package-lock.json` was generated locally with npm 11.10.1. The GitHub Actions `actions/setup-node@v5` Node 22 image ships npm 10.9.8 by default. npm 10 and npm 11 resolve/hoist nested peer dependencies differently, which made the committed, locally-valid lockfile fail `npm ci`'s stricter integrity check under the runner's npm 10 — a genuine CI-blocking failure, not a code bug in the app itself.
- **Fix:** Added an explicit `npm install -g npm@${{ env.NPM_VERSION }}` step (pinned to `11.10.1`, matching local lockfile generation) before `npm ci` in every job of `.github/workflows/ci.yml`.
- **Files modified:** `.github/workflows/ci.yml`
- **Verification:** All five CI jobs (`typecheck`, `lint`, `test`, `build`, `e2e`) ran green on the verification PR after the fix; confirmed again after the deliberate-failure/revert live-fire tests below.
- **Committed in:** `61658de`

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs discovered only once real dashboard/CI infrastructure was exercised — neither was visible from source code alone, which is exactly what Task 3's end-to-end verification was designed to catch).
**Impact on plan:** Both fixes were necessary for the plan's QUAL-09 backstop truth ("main auto-deploys to Vercel production... feature branches get preview deployments") to actually hold. No scope creep — both are narrowly-targeted infrastructure-config fixes, not new features.

## Issues Encountered

- The GitHub ruleset `protect-main` (created outside this plan's automated scope, as branch-protection setup is dashboard-only per `user_setup`) was found to have only deletion/non-fast-forward protection — it was missing `required_status_checks` and a `pull_request`-required rule entirely, meaning merges were not actually gated on CI before this was discovered and fixed via the GitHub API during Task 3 verification. This was a genuine gap in dashboard configuration (not a code issue), fixed as part of completing the human_setup requirement rather than a plan deviation in the code sense.
- The fix was rigorously verified (not just assumed correct after editing the ruleset): a failing test and a failing lint error were each deliberately pushed to the open verification PR and confirmed to block `gh pr merge` (`mergeStateStatus=BLOCKED`, explicit rejection message from GitHub), then reverted and reconfirmed green (`mergeStateStatus=CLEAN`) before the real merge.

## User Setup Required

None remaining — this plan's `user_setup` (Vercel repo connection + GitHub branch protection) has been completed and verified end-to-end as described above. No further external service configuration is required for this plan.

## Next Phase Readiness

- `sitemap.ts`/`robots.ts` are in place and will automatically pick up Phase 2+'s tools as their registry `status` moves off `'planned'` — no sitemap edit needed when UUID (Phase 2) ships.
- The CI merge gate is live and enforced on `main`: every future PR (Phase 2 onward) must pass `typecheck`/`lint`/`test`/`build` (and non-blocking-but-gating `e2e`) before merge, and `main` auto-deploys to Vercel production on every merge.
- Two infrastructure fixes (`vercel.json` framework pin, CI npm version pin) are now committed and will silently protect every future phase's deploy — no repeat action needed unless the Vercel dashboard or lockfile-generating npm version changes again.
- Phase 1 Plan 04 (analytics redaction + privacy page, wave 3) remains outstanding and is not part of this plan's scope.

---
*Phase: 01-shared-shell-registry*
*Completed: 2026-07-23*

## Self-Check: PASSED

All 6 created/modified files verified present on disk (`app/sitemap.ts`, `app/robots.ts`, `app/sitemap.test.ts`, `.github/workflows/ci.yml`, `DEPLOY.md`, `vercel.json`). All 12 referenced commits (`0b7a261`, `88deb44`, `491e22b`, `61658de`, `cb64644`, `acd1096`, `5ed2647`, `3f808ab`, `4ef123c`, `29c362b`, `c605a33`, `a7ad760`) verified present in `git log`.
