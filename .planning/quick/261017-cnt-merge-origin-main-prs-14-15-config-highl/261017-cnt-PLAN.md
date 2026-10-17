---
phase: quick-261017-cnt
plan: 261017-cnt
type: execute
wave: 1
depends_on: []
files_modified:
  - tools/registry.ts
  - tools/registry.test.ts
  - app/sitemap.test.ts
  - tests/e2e/home.spec.ts
  - tests/e2e/navigation.spec.ts
  - components/SiteHeader.tsx   # ONLY if the 640px fit check fails (Task 2 fallback); expected untouched
  - app/tools/config/page.tsx           # arrives via merge from origin/main, not hand-edited
  - app/tools/config/ConfigTool.tsx     # arrives via merge
  - app/tools/config/ConfigToolLoader.tsx # arrives via merge
  - app/tools/config/ConfigTool.test.tsx  # arrives via merge
  - lib/config/highlight.ts             # arrives via merge
  - lib/config/highlight.test.ts        # arrives via merge
  - lib/config/clipboard.ts             # arrives via merge
  - lib/config/clipboard.test.ts        # arrives via merge
  - tests/e2e/config.spec.ts            # arrives via merge
autonomous: true
requirements: [INTG-01]   # the merge must keep Hash Generator in nav, drawer, grid and sitemap (INTG-01) while adding Config

estimate:
  tokens: 45000
  raw_tokens: 45000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "HEAD is a two-parent merge commit whose second parent is origin/main ffb3facf257984930bd6fc64da7e833e8dd16dc7 (no rebase, no squash)"
    - "The registry holds exactly 6 active tools: uuid, subnet, dns, mac, hash, config"
    - "Landing grid, desktop nav, mobile drawer and sitemap.xml all show both Hash Generator and Config Syntax Highlighter; grid order is IP Subnet Calculator, UUID Generator, Config Syntax Highlighter, DNS Lookup, Hash Generator, MAC Address Inspector"
    - "At a 640px viewport the six desktop nav links are visible and neither the page nor the header overflows horizontally"
    - "npm run typecheck, lint, test, build, test:e2e and test:e2e:prod all pass on the merged tree"
    - "Nothing is pushed; the untracked files .planning/milestone.lock, .planning/state.json and project-brief.md remain untracked and uncommitted"
  artifacts:
    - path: "tools/registry.ts"
      provides: "Both the hash entry (category encode, icon Hash) and the config entry (category network, icon Network)"
      contains: 'slug: "config"'
    - path: "tests/e2e/navigation.spec.ts"
      provides: "Six-link drawer assertion and the six-tool 640px desktop-nav fit check"
      contains: "fits six tools at 640px"
    - path: "app/tools/config/page.tsx"
      provides: "Config Syntax Highlighter route from origin/main"
  key_links:
    - from: "tools/registry.ts"
      to: "components/SiteHeader.tsx, components/MobileNav.tsx, app/page.tsx, app/sitemap.ts"
      via: "getSortedTools() / tools iteration (registry-derived, no consumer edits)"
      pattern: "getSortedTools"
    - from: "tools/registry.ts config entry icon 'Network'"
      to: "components/ToolCard.tsx ICONS map"
      via: "ICONS[tool.icon] lookup (Network already mapped, so no Fingerprint fallback)"
      pattern: "Network"
---

<objective>
Merge origin/main (PRs #14 and #15 from contributor KoffeePi: the client-side Config Syntax Highlighter at /tools/config) into the current branch gsd/phase-08-hash-core-worker-runtime with a real merge commit, resolving every conflict as a union so BOTH the Hash Generator (this branch, Phase 9) and the Config Syntax Highlighter (origin/main) are active: 6 tools total. Then prove the six-link desktop header still fits at 640px, and run the full CI gate.

Purpose: keep the phase branch current with main before it ships, without losing either tool, and with the INTG-01 hash integration (nav, drawer, grid, sitemap, D-27 wording guard) intact.
Output: one merge commit (conflict resolution), one follow-up commit for the six-tool 640px nav check (plus a nav spacing fix only if needed), and an optional fallout-fix commit. No push.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/phases/09-hash-tool-page-text-hashing/09-03-SUMMARY.md

Facts observed at planning time (re-check, do not trust blindly):
- HEAD = 2f85a32 on gsd/phase-08-hash-core-worker-runtime. origin/main = ffb3facf257984930bd6fc64da7e833e8dd16dc7 (already fetched). Merge base = ddc2c01.
- origin/main adds app/tools/config/*, lib/config/*, tests/e2e/config.spec.ts. It changes NO package.json / package-lock.json (no installs).
- A `git merge-tree` trial reported content conflicts in tools/registry.ts, tools/registry.test.ts, app/sitemap.test.ts, tests/e2e/home.spec.ts, tests/e2e/navigation.spec.ts. Both sides appended a 5th registry entry after `mac` and bumped counts 4 to 5.
- getSortedTools() sorts featured first, then name case-insensitive. With 6 tools the sorted slugs are: subnet, uuid, config, dns, hash, mac. Sorted names: IP Subnet Calculator, UUID Generator, Config Syntax Highlighter, DNS Lookup, Hash Generator, MAC Address Inspector. Drawer/nav shortNames in that order: Subnet, UUID, Config, DNS, Hash, MAC. Alphabetical slug list: config, dns, hash, mac, subnet, uuid.
- components/ToolCard.tsx ICONS already maps both `Hash` and `Network`, so the config card (icon Network) needs no ToolCard change.
- The hash-side 640px test in tests/e2e/navigation.spec.ts (describe "Desktop nav fits five tools at 640px (INTG-01, research A5)") sits in a hunk that auto-merges cleanly, so the merge does NOT update it; Task 2 owns it.
- 09-03 solved the 5-tool fit with no SiteHeader change: the test passed as-is. SiteHeader desktop nav: `hidden flex-1 ... gap-1 sm:flex`, each link `px-2.5 py-1.5 text-[14px] font-semibold`, container `px-4 sm:px-6`, right side ThemeToggle + MobileNav trigger.
- playwright.config.ts: baseURL http://localhost:3000, webServer `npm run dev` with reuseExistingServer true locally. A Next 16.2.11 dev server started by the orchestrator is listening on port 3000 with cwd = this checkout (it hot-reloads the merged files). Next 16 writes dev output to `.next/dev` (directory observed), so `npm run build` does not share the dev server's output dir. playwright.prod.config.ts builds and serves on port 3101 with HASH_SMOKE=1.
- Untracked files that must stay untracked: .planning/milestone.lock, .planning/state.json, project-brief.md.
- Pre-merge baseline: all CI gates green (686 unit, 101 e2e, 7 e2e-prod).

Prior verify commands that already worked (reuse verbatim):
- `npx vitest run tools app/sitemap.test.ts components`
- `npx playwright test tests/e2e/home.spec.ts tests/e2e/navigation.spec.ts`
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Merge origin/main and resolve conflicts as a 6-tool union (merge commit)</name>
  <precondition>`git rev-parse origin/main` prints ffb3facf257984930bd6fc64da7e833e8dd16dc7, no MERGE_HEAD exists, and `git status --short` shows only the three untracked files (.planning/milestone.lock, .planning/state.json, project-brief.md) plus this quick-task directory under .planning/quick/. If any of that is false, halt and report.</precondition>
  <files>tools/registry.ts, tools/registry.test.ts, app/sitemap.test.ts, tests/e2e/home.spec.ts, tests/e2e/navigation.spec.ts (plus the config files that arrive unmodified via the merge)</files>
  <action>
Run `git merge --no-ff origin/main` from the repo root. Do NOT rebase, squash, or fast-forward. Conflicts are expected and the merge will stop.

MUTABLE-SCOPE AUTHORITY: run `git diff --name-only --diff-filter=U` immediately and treat THAT output as the only set of files you may hand-edit during the merge. If it differs from the five files listed in context (extra or missing files), adapt: resolve whatever it lists with the same union rule below, and note the difference in the SUMMARY. Do not touch any file that is not in that list during the merge. Do not resolve any file wholesale with `git checkout --ours` or `--theirs`: every conflicted file needs content from both sides.

Resolution rule for every conflicted file: union of both sides, so both `hash` and `config` exist and every count, loop bound and list reflects 6 tools. Where the two sides conflict only on test titles or comments, adopt origin/main's count-free wording (for example "contains the active tool entries", "all registered tools are active", "contains exactly the /tools/* entries for active registry tools", "renders every tool card from the registry with name/description/category", "cards render featured first, then by name", "active cards have no 'Coming soon' badge and exactly one clickable anchor", "All active registry entries render as real links using their shortName.") so no title or comment states a now-wrong number. Keep every hash-side test that is not about counts.

Per file:
- tools/registry.ts: keep the existing uuid, subnet, dns, mac entries untouched, then the hash entry exactly as on HEAD (category encode, icon Hash, D-27 description containing "in your browser"), then the config entry exactly as on origin/main (category network, icon Network, clientOnly true, featured false). Each slug appears once. No other edits to the type, getSortedTools or getToolBySlug.
- tools/registry.test.ts: length assertion becomes 6; alphabetical slug list is config, dns, hash, mac, subnet, uuid; getSortedTools order is subnet, uuid, config, dns, hash, mac; the statuses map includes uuid, subnet, dns, mac, hash and config all "active". Keep the HEAD-side `getToolBySlug("hash")` assertion and the whole HEAD-side D-27 hash-description wording-guard test unchanged.
- app/sitemap.test.ts: the expected /tools/* URL list contains uuid, subnet, dns, mac, hash and config (still sorted by the existing `.sort()`); the registrySlugs array used by the no-hardcoded-slug test contains all six slugs.
- tests/e2e/home.spec.ts: card count assertions and loop bounds become 6 in both the "renders every tool card" and the "Coming soon / one anchor" tests; the expected name order is IP Subnet Calculator, UUID Generator, Config Syntax Highlighter, DNS Lookup, Hash Generator, MAC Address Inspector; drop any stale comment that names a tool count or an old order. Keep the HEAD-side describe "Hash Generator integration (INTG-01)" (card click-through to /tools/hash and sitemap.xml check) unchanged.
- tests/e2e/navigation.spec.ts: the mobile-drawer shortName loop iterates Subnet, UUID, Config, DNS, Hash, MAC; the drawer anchor count becomes 6; keep the HEAD-side explicit `mobile-nav-link` "Hash" visibility assertion. Leave the auto-merged 640px desktop-nav describe block exactly as merged (Task 2 owns it in a separate commit, per the quick-task constraint that nav-fit follow-ups are not part of the merge commit).

After editing, confirm no conflict marker lines remain in any resolved file, then `git add` each resolved file BY EXPLICIT PATH. Never use `git add -A`, `git add .` or `git commit -a`: the three untracked files and anything under .planning/ must not enter the merge commit.

Before committing, run the targeted checks in the verify block except the merge-parent check (unit tests for registry/sitemap/ToolCard, the home + navigation + config e2e specs excluding the 640px test, typecheck). The dev server on port 3000 is from this checkout and is reused by Playwright; if the new /tools/config route 404s or stale content is served, wait for the dev server to recompile and rerun once before treating it as a failure.

Then conclude the merge with `git commit` (no `-a`, no `--no-verify`) using a descriptive message: subject "Merge origin/main: add Config Syntax Highlighter (PRs #14, #15) alongside Hash Generator"; body stating that conflicts in the registry, registry/sitemap unit tests and home/navigation e2e specs were resolved as a union so 6 tools are active (uuid, subnet, dns, mac, hash, config), that origin/main's count-free test titles were adopted, and that the 640px nav check follows in a separate commit; end the message with the attribution trailer lines from the session's system-reminder.
  </action>
  <verify>
    <automated>test "$(git log -1 --format=%P HEAD)" = "2f85a329cb3d0ffe232c4b8c6a12a1d7d06e19c1 ffb3facf257984930bd6fc64da7e833e8dd16dc7" && test -z "$(git diff --name-only --diff-filter=U)" && ! grep -nE '^(<{7}|={7}|>{7})' tools/registry.ts tools/registry.test.ts app/sitemap.test.ts tests/e2e/home.spec.ts tests/e2e/navigation.spec.ts && npx vitest run tools app/sitemap.test.ts components && npx playwright test tests/e2e/home.spec.ts tests/e2e/navigation.spec.ts tests/e2e/config.spec.ts --grep-invert 640px && npm run typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `git log -1 --format=%P HEAD` prints exactly `2f85a329cb3d0ffe232c4b8c6a12a1d7d06e19c1 ffb3facf257984930bd6fc64da7e833e8dd16dc7` (first parent = pre-merge HEAD 2f85a32, second = origin/main)
    - `grep -c 'slug: "hash"' tools/registry.ts` prints 1 and `grep -c 'slug: "config"' tools/registry.ts` prints 1
    - `grep -c 'toHaveLength(6)' tools/registry.test.ts` prints 1
    - `grep -c 'toHaveCount(6)' tests/e2e/home.spec.ts` prints 2
    - `grep -c 'tools/config' app/sitemap.test.ts` and `grep -c 'tools/hash' app/sitemap.test.ts` each print at least 1
    - `grep -c 'never leaves' tools/registry.test.ts` prints at least 1 (the D-27 guard survived)
    - `F=$(git diff --name-only 2f85a329cb3d0ffe232c4b8c6a12a1d7d06e19c1 HEAD) && printf '%s\n' "$F" | grep -cE '^(\.planning/|project-brief\.md)'` prints 0
    - `git diff 2f85a329cb3d0ffe232c4b8c6a12a1d7d06e19c1 HEAD -- package.json package-lock.json` prints nothing
  </acceptance_criteria>
  <done>HEAD is a two-parent merge commit (second parent ffb3fac) with no unresolved paths; registry has 6 active tools; registry/sitemap/ToolCard unit tests, home/navigation (minus 640px)/config e2e and typecheck pass; untracked files untouched.</done>
</task>

<task type="auto">
  <name>Task 2: Six-tool desktop nav fit at 640px (separate follow-up commit)</name>
  <files>tests/e2e/navigation.spec.ts, components/SiteHeader.tsx (only if the fit check fails)</files>
  <action>
In tests/e2e/navigation.spec.ts, update the 09-03 desktop-nav describe block (currently titled "Desktop nav fits five tools at 640px (INTG-01, research A5)") to six tools: retitle the describe to "Desktop nav fits six tools at 640px (INTG-01, research A5)", retitle the test to say six nav links, and change the nav-link count assertion and the visibility loop bound from five to six. Keep the viewport (640x800) and both overflow assertions (page scrollWidth vs clientWidth, header scrollWidth vs clientWidth) exactly as they are.

Run only that test (verify block). Expected outcome, matching 09-03: it passes with no SiteHeader change (planning estimate: six shortNames plus padding and gaps need roughly 360-380px of the ~590px available at 640px). If it passes, do NOT edit components/SiteHeader.tsx.

Fallback, only if it fails on overflow or visibility: the single permitted change is in components/SiteHeader.tsx, reducing the desktop nav item horizontal padding from px-2.5 to px-2 on both the active-link `Link` className and the planned-tool `span` className (keep them identical), nothing else. Rerun. If it still fails, revert the SiteHeader edit, do not attempt a broader redesign (no wrapping, no overflow menus, no breakpoint changes, no font changes), and stop: report the measured page/header scrollWidth vs clientWidth values and which links were hidden.

Record the measured header scrollWidth/clientWidth at 640px in the SUMMARY (log them from the page.evaluate result or a one-off Playwright run).

Commit by explicit path only (the spec, plus SiteHeader only if the fallback was used), no `-a`, with message "test(quick-261017-cnt): assert six-tool desktop nav fits at 640px" (or "fix(quick-261017-cnt): tighten desktop nav padding so six tools fit at 640px" if SiteHeader changed), ending with the attribution trailer lines from the session's system-reminder.
  </action>
  <verify>
    <automated>npx playwright test tests/e2e/navigation.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c 'fits six tools at 640px' tests/e2e/navigation.spec.ts` prints 1
    - `grep -c 'toHaveCount(5)' tests/e2e/navigation.spec.ts` prints 0 and `grep -c 'toHaveCount(5)' tests/e2e/home.spec.ts` prints 0
    - `grep -c 'toHaveCount(6)' tests/e2e/navigation.spec.ts` prints 2 (drawer anchors + desktop nav links)
    - `git diff --stat <merge-sha> HEAD` (merge-sha = the Task 1 merge commit hash, recorded when Task 1 committed) lists tests/e2e/navigation.spec.ts and, only in the fallback case, components/SiteHeader.tsx; nothing else
  </acceptance_criteria>
  <done>The whole navigation spec (320px drawer with 6 links, 640px desktop nav with 6 visible links and no horizontal overflow) passes and is committed separately from the merge commit; SiteHeader is unchanged unless the single padding fallback was needed.</done>
</task>

<task type="auto">
  <name>Task 3: Full CI gate on the merged tree; fix only merge fallout</name>
  <files>None expected. Only if a gate fails from merge fallout: the failing test file(s) it names.</files>
  <action>
Run the project's full CI gate sequentially from the repo root, one command at a time, in this order: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:e2e:prod`. Never run two of them concurrently. `npm run test:e2e` reuses the orchestrator's dev server on port 3000. `npm run test:e2e:prod` builds and serves its own production server on port 3101; per the playwright.prod.config.ts warning, if build or e2e:prod fails with a `.next` lock or contention error caused by the port-3000 dev server, stop that dev server, rerun, and record in the SUMMARY that it was stopped so the orchestrator knows. Lint: zero errors required; the pre-existing warning in lib/mac/vendor.ts is accepted.

Report actual pass counts for unit, e2e and e2e-prod (expect more than the pre-merge 686 / 101 / 7 because origin/main adds config unit tests and tests/e2e/config.spec.ts; do not assert exact numbers).

If any gate fails: diagnose first. Allowed fixes are merge fallout only, meaning stale tool counts, lists or orders in tests that the textual conflicts did not surface, or a test that assumes 5 tools. Put those in ONE separate commit "fix(quick-261017-cnt): update tests for six active tools" (explicit paths, attribution trailers). Do NOT change production code of the Hash tool, the Config tool, lib/hash, lib/config, SiteHeader (beyond Task 2's fallback) or any config file to make a gate pass; if a failure needs that, stop and report the failing command, test name and error.

Security checks (threat register): run the network-call grep from this task's acceptance criteria over lib/config and app/tools/config and confirm it prints nothing (the config highlighter must process pasted configs, which may contain secrets, locally only), and confirm that `git diff 2f85a329cb3d0ffe232c4b8c6a12a1d7d06e19c1 HEAD -- package.json package-lock.json` (pre-merge HEAD vs merged tree) is empty (no new dependencies arrived). Report the result; if either check fails, stop and report rather than fix.

Finally confirm: `git status --short` still lists .planning/milestone.lock, .planning/state.json and project-brief.md as untracked; `git log --oneline -4` shows the merge commit and follow-ups; nothing was pushed (do not run git push).
  </action>
  <verify>
    <automated>npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e && npm run test:e2e:prod</automated>
  </verify>
  <acceptance_criteria>
    - All six commands exit 0 (lint with 0 errors)
    - `grep -rnE 'fetch\(|XMLHttpRequest|sendBeacon' lib/config app/tools/config` prints nothing
    - `git status --short` shows the three untracked files with `??` and no staged or modified tracked files
    - `git status -sb` reports the branch ahead of its upstream (or no upstream); no push was performed
  </acceptance_criteria>
  <done>The merged branch passes typecheck, lint, unit, build, e2e and e2e:prod; counts are reported; any fallout fix is in its own commit; nothing pushed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| external contributor code -> phase branch | PR #14/#15 code from KoffeePi (already reviewed and merged to main) enters this branch through the merge |
| user-pasted config -> browser | Network configs pasted into /tools/config can contain credentials, community strings and internal addressing |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261017-01 | Tampering | merge resolution of tools/registry.ts and its tests | medium | mitigate | Union resolution by explicit rule; HEAD-side D-27 wording-guard test and hash entry kept verbatim; acceptance greps confirm both slugs present once and the guard survives; full unit + e2e gate |
| T-261017-02 | Information Disclosure | app/tools/config, lib/config | medium | mitigate | Task 3 greps lib/config and app/tools/config for fetch/XMLHttpRequest/sendBeacon and must find none, keeping pasted configs local per the local-first constraint; tool sets no URL params, so analytics redaction is unaffected |
| T-261017-03 | Tampering | contributor code quality | low | accept | Code was reviewed and merged to main via PRs #14/#15 upstream; this task integrates it, it does not re-review it; CI gate (typecheck, lint, unit, e2e, e2e-prod) runs on the merged tree |
| T-261017-04 | Repudiation | merge history | low | mitigate | Real two-parent merge commit (no rebase/squash) preserves contributor authorship of a7f882c and 3fefbc5 |
| T-261017-SC | Tampering | npm installs | high | mitigate | No install tasks; origin/main changes neither package.json nor package-lock.json, verified by `git diff 2f85a329cb3d0ffe232c4b8c6a12a1d7d06e19c1 HEAD -- package.json package-lock.json` being empty; any non-empty diff halts the task |
</threat_model>

<verification>
- `git log -1 --format=%P <merge-sha>` prints `2f85a329cb3d0ffe232c4b8c6a12a1d7d06e19c1 ffb3facf257984930bd6fc64da7e833e8dd16dc7`
- Registry: 6 active tools, sorted subnet, uuid, config, dns, hash, mac
- 640px desktop nav: 6 visible links, no page/header horizontal overflow
- Full gate green: typecheck, lint, test, build, test:e2e, test:e2e:prod
- No push; untracked files untouched
</verification>

<success_criteria>
- One merge commit containing only conflict resolution plus the files merged in from origin/main
- Follow-up commit(s) for the 640px six-tool nav check (and any fallout) separate from the merge commit
- Both /tools/hash and /tools/config reachable from nav, drawer, landing grid and sitemap.xml
- All six CI commands pass on the final HEAD
</success_criteria>

<output>
Create `.planning/quick/261017-cnt-merge-origin-main-prs-14-15-config-highl/261017-cnt-SUMMARY.md` when done. Include: merge commit hash, follow-up commit hashes, the live conflicted-file list from `git diff --name-only --diff-filter=U`, the measured 640px header widths, whether SiteHeader changed, unit/e2e/e2e-prod pass counts, and whether the port-3000 dev server had to be stopped.
</output>
