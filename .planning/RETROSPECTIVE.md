# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-07-25
**Phases:** 5 | **Plans:** 21 | **Tasks:** 60

### What Was Built
- Shared shell: registry-driven landing page, nav, mobile drawer, theming, visitor-IP widget, privacy-safe analytics, CI merge gate, production deploy at packetory.vercel.app
- UUID Generator (`/tools/uuid`): v4/v7, batch 1–100, case/hyphen formatting, plain text/CSV/JSON export
- IP Subnet Calculator (`/tools/subnet`): IPv4 + IPv6 CIDR breakdown via hand-rolled BigInt math, reverse-DNS zones, bounded /48–/64 subdivision planner, bookmarkable `?cidr=` URL state
- DNS Lookup (`/tools/dns`): DNS-over-HTTPS with Cloudflare primary / Google fallback, debounce + AbortController race safety, 5-state error matrix, bookmarkable `?name=&type=` URL state
- MAC Address Inspector (`/tools/mac`): live 4-format normalization, offline bit-level classification (OUI/U-L/I-G/randomization), vendor lookup via `/api/mac-vendor` proxy with OUI-only privacy boundary

### What Worked
- Server-shell + Client-island split (`page.tsx` server wrapper + `next/dynamic(ssr:false)` loader), established in Phase 2 for the UUID tool, reused unmodified for Subnet/DNS/MAC — avoided hydration mismatches for every tool needing a client-random or client-only first paint.
- Framework-agnostic `lib/` core per tool (`lib/uuid`, `lib/subnet`, `lib/dns`, `lib/mac`) with zero React/Next imports, unit-tested in total isolation — held as a consistent, unbroken pattern across all 4 tools and made every tool's math/parsing logic trivially reusable for a future public API.
- Raw History API (`window.history.replaceState`, never `router.replace()`) for bookmarkable URL state — avoided App Router's shallow-routing gap and unwanted client-navigation churn on every keystroke; established in Phase 3, reapplied directly in Phase 4.
- BigInt end-to-end for all subnet/address math (no `Number()` coercion) — sidestepped IPv6's 128-bit overflow risk entirely rather than special-casing it; fast-check property tests proved exact counts across the full 0–128 prefix range.
- Every phase shipped with a security review (`gsd-secure-phase`) before UAT — all 5 phases closed with 0 open threats (only explicitly accepted, documented risks remained).
- 4 of 5 phases passed UAT with zero user-reported issues on the first pass.

### What Was Inefficient
- The DNS-04 race-safety fix (Phase 4) needed two review passes: the first fix was applied only to the "obvious" invalid-input path, and verification then caught that the valid-input path reached the identical guarded state and was still vulnerable. The lesson ("audit every path into the guarded state up front, not just the one a test happens to exercise") was written down and applied correctly on the first pass for MAC's vendor lookup in Phase 5.
- Phase 5 code review found 1 Critical (a `null`-body upstream response could throw an uncaught 500 from `/api/mac-vendor`, violating its own no-5xx contract) plus a missing fast-check property-test suite for `lib/mac`, despite CLAUDE.md mandating property-based tests for address/MAC math — both caught late, at review time, rather than during planning.
- Phase 3's plans repeatedly tripped their own literal `grep`-based acceptance-criteria gates on doc-comment substrings (e.g. a comment mentioning "React" inside a "no React import" note, or the literal string `window.history.replaceState` appearing inside a doc-comment) — happened independently across 4 different plans in the same phase before the pattern was recognized.
- REQUIREMENTS.md's original traceability header stated "41 total" v1 requirements against an actual itemized count of 48 — caught during roadmap creation, not before.

### Patterns Established
- Server-shell + Client-island split for any page with a CSPRNG-derived or otherwise client-only first-paint value.
- `lib/` modules stay 100% framework-agnostic and independently unit-tested — the reusable seam for a future public API package.
- URL state sync via raw History API, never `next/navigation`'s `router.replace()`.
- Every state-transition path that can supersede an in-flight async request must cancel it (abort + sequence token) before scheduling the next one — not just the paths a first test happens to cover.
- Global `Enter` keyboard shortcut must ignore focused native interactive targets (buttons, toggle groups) to avoid double-firing against a button's own click handler.
- Interim third-party API proxies (e.g. `/api/mac-vendor`) are acceptable launch stopgaps only when the permanent local-data alternative is explicitly tracked as follow-up tech debt, not left implicit.

### Key Lessons
1. When fixing a bug in a guarded async/state-transition path, enumerate every path that can reach that guarded state before writing the fix — fixing only the path the failing test exercises is how the same class of bug survives a first review pass.
2. Literal `grep`-based acceptance-criteria gates are brittle against ordinary prose in doc-comments; word choice in comments needs to dodge the gate's literal substrings, which is worth flagging explicitly in a plan rather than discovering per-phase.
3. Vercel's dashboard framework auto-detection isn't reliable on first project connection — pin explicitly via `vercel.json` (`{"framework":"nextjs"}`) rather than trusting auto-detection.
4. CI runners can ship a different bundled npm version than the one that generated the committed lockfile — pin the CI npm version explicitly rather than assuming `npm ci` is version-agnostic.
5. GitHub branch-protection rulesets need an explicit `required_status_checks` + `pull_request` rule, not just deletion/force-push blocks — verify live with a deliberately failing PR before trusting the gate.

### Cost Observations
- Model mix and session count were not tracked in this project's STATE.md during v1.0 — no data to report for this milestone.
- Notable: all 5 phases shipped with 0 open security threats and 4/5 passed UAT with zero reported issues on the first attempt, suggesting the plan → execute → review → verify → UAT loop caught most defects before they reached the user-facing check.

---

## Milestone: v1.1 — Production Domain & Landing Page Polish

**Shipped:** 2026-07-25
**Phases:** 2 | **Plans:** 3 | **Tasks:** 7

### What Was Built
- Landing page grid cards (`components/ToolCard.tsx`) are now fully clickable via a stretched-link pattern (`Link` + `after:inset-0` inside `CardTitle`, `relative` on `Card`), reaching keyboard-nav parity with the top nav menu; `status:"planned"` cards stay inert (Phase 6, LP-01)
- Production domain cutover to `packetory.dev` reconciled in project docs: DOM-01 (live HTTPS) verified, DOM-03 (canonical origin everywhere) confirmed complete via a repo-wide audit — zero code changes needed since `SITE_URL` already derived every reference; DOM-02 (redirects) and DOM-04 (runbook) explicitly recorded as descoped, not silently dropped (Phase 7)

### What Worked
- The stretched-link full-card click pattern shipped and passed its human-verify checkpoint on the first pass — no rework needed across desktop and 320px viewports, active and featured card states.
- Phase 7's docs-only reconciliation plan was still run through the full phase machinery (build gate, test gate, independent verifier re-check) despite touching zero application code — the verifier's independent re-run of the DOM-03 audit grep and direct read of REQUIREMENTS/ROADMAP/PROJECT caught that the descope framing was honest, rather than trusting the executor's SUMMARY at face value.
- The milestone's own descope decisions (DOM-02, DOM-04) were carried consistently across REQUIREMENTS.md, ROADMAP.md, and PROJECT.md with the same accepted-consequences language in all three, rather than drifting between documents.

### What Was Inefficient
- Phase 7's `requirements.mark-complete` tooling verb auto-checked the DOM-02/DOM-04 checkboxes as a side effect of recording them, treating "descoped" as a generic completion outcome — the executor had to manually revert those two checkboxes before the final commit to avoid contradicting the plan's own transparency prohibition (descoped items must never read as delivered).
- No `v1.1-MILESTONE-AUDIT.md` was run before closing this milestone (the user opted to skip `/gsd-audit-milestone` given the small 2-phase scope and existing per-phase verification) — reasonable for a milestone this size, but it means cross-phase integration between the Phase 6 landing-page change and Phase 7 domain change was never explicitly checked as a single audit pass.

### Patterns Established
- Full-card click target via stretched-link (`Link` + `after:inset-0`, `relative` parent) — the reusable pattern for any future card-style component that needs a single click/keyboard target spanning a larger visual container without a JS click handler.
- When a plan's `must_haves` explicitly prohibit recording a descoped/non-delivered item as complete, treat any automated "mark complete" tooling as a first draft — verify its output against the prohibition before committing, since generic completion helpers don't distinguish "descoped" from "shipped."

### Key Lessons
1. Automated status-tracking tooling (e.g. a generic `requirements.mark-complete` verb) can conflate "descoped" with "complete" — when a plan's transparency prohibition requires a descoped item to stay visibly unchecked/labeled, verify the tooling's output rather than trusting it silently.
2. A docs-only, zero-code-change plan still benefits from the full phase gate stack (build, test, independent verifier) — the verifier's from-scratch re-run of the audit evidence (not just trusting the SUMMARY) is what confirms a reconciliation plan told the truth.
3. Skipping `/gsd-audit-milestone` for a small, low-risk milestone (2 phases, both already independently verified) is a reasonable judgment call — but it's a deliberate scope trade-off worth naming explicitly rather than defaulting to silently, since it means no single pass ever checked Phase 6 and Phase 7 together.

### Cost Observations
- 2 subagents spawned this session for Phase 7 (1 `gsd-executor`, 1 `gsd-verifier`), both on `sonnet`; Phase 6 was executed in a prior session not covered by this session's telemetry.
- Notable: the milestone shipped same-day (Phases 6 and 7 both completed 2026-07-25) with zero application-code regressions — the full test suite (268 tests, 28 files) passed unchanged before and after Phase 7's docs-only work.

---

## Milestone: v1.2 — Hash Generator

**Shipped:** 2026-10-17 (PR #16)
**Phases:** 2 | **Plans:** 14 | **Tasks:** 26

### What Was Built
- `lib/hash/`: all 10 digests (MD5, SHA-1/224/256/384/512, SHA3-256/512, RIPEMD-160, CRC32) verified against published vectors, padding/rate boundaries, SHA3-not-Keccak negatives, exact UTF-8 bytes and chunk-split invariance, computed in a production-build module Web Worker with `@noble/hashes` guarded out of initial page JS (Phase 8)
- `/tools/hash`: sample digests on load with a pinned no-CLS skeleton, live latest-wins hashing, copy/copy-all/checksum lines, hex/HEX/Base64 without re-hashing, tolerant paste-to-verify, `?text=` restore with an explicit capped Copy link, keyboard shortcuts, registry/nav/sitemap entry and full per-tool SEO (Phase 9)
- Shipped alongside the externally contributed Config Syntax Highlighter (PRs #14/#15), merged in via quick task 261017-cnt — six live tools

### What Worked
- Building the correctness gate first (Phase 8: vectors, oracles, worker supersede protocol, import-boundary guards) meant Phase 9 was pure UI over a trusted engine — no hashing bug surfaced in UAT (5/5 passed).
- Reproducing the CI-only failure in the exact Playwright Linux image (`mcr.microsoft.com/playwright:v1.61.1-noble`) and diffing per-element heights against macOS pinned the root cause (glyph-advance rounding) in minutes and let the fix be proven before committing.

### What Was Inefficient
- Scope misunderstanding: Phase 10 (file hashing + release hardening) was planned from a misread of the request and only caught at the end — a short "is this exactly what you want?" check at roadmap time would have saved planning effort.
- The local branch drifted 107 commits from GitHub `main` while outside PRs landed there; it was only noticed during UAT, forcing a late merge and re-verification.
- The branch was first pushed only at ship time, so a Linux-specific layout failure (macOS-measured skeleton pin) surfaced at the very end instead of on an early CI run.
- Phase verifications went stale after late changes (merge + CSS fix), and the milestone closed as an override rather than a verified closeout.

### Patterns Established
- Pixel-pinned skeleton heights must be measured on, or made deterministic across, every CI platform — `text-rendering: geometricPrecision` removes Linux Chromium's glyph-advance rounding for monospace text.
- Fetch and merge `origin/main` at the start of each phase; outside contributors can land work on GitHub independently of the GSD flow.
- Push the working branch early so CI runs on Linux long before ship.

### Key Lessons
1. Confirm scope back to the user in their own terms before roadmapping — a whole phase was planned for a feature that was never wanted.
2. A layout assertion that passes locally is only proven for the local OS; CI-platform text rendering differs (fractional vs rounded glyph advances).
3. With the CI e2e job removed (Actions-minutes decision), browser-level regressions are caught only by local runs — make `test:e2e` + `test:e2e:prod` part of the pre-merge routine.

### Cost Observations
- Model mix this close-out session: planner on opus; executor/verifier on sonnet.
- Notable: the CI failure fix itself was a one-class change; most effort went into reproducing it on Linux.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | — | 5 | First milestone — established the shared-shell/registry pattern, Server-shell+Client-island split, and framework-agnostic `lib/` convention now expected of every future tool. |
| v1.1 | 1 (Phase 7) + prior (Phase 6) | 2 | Smallest milestone yet (2 phases, 3 plans) — first milestone with a deliberately descoped requirement set (DOM-02/DOM-04), and first to surface a "mark-complete tooling conflates descoped-with-complete" gap. |
| v1.2 | multiple | 2 (+1 removed) | First milestone with an outside contribution merged mid-flight and a whole phase removed for scope misunderstanding; first override closeout; CI e2e job dropped to save Actions minutes. |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|---------------------|
| v1.0 | ~600+ unit + e2e (per-phase counts: 97 UUID, 169 Subnet, 72 DNS, 329+ MAC — approximate, not centrally tallied) | Not centrally measured | `ip-address`, `uuid`, DoH via native `fetch` (no new dependency) |
| v1.2 | Unit suite green; 106 dev e2e + 7 prod e2e passing locally at ship | Not centrally measured | `@noble/hashes@2.4.0` (exact-pinned, worker-only) |
| v1.1 | 268 unit tests (28 files) passing unchanged before/after; +2 new e2e for landing-page click nav | Not centrally measured | None — Phase 7 was docs-only, zero new code or dependencies |

### Top Lessons (Verified Across Milestones)

1. Audit every path into a guarded async/state-transition condition before shipping a fix — established in v1.0 (DNS-04 → MAC vendor lookup), not yet cross-validated by a second milestone.
2. Generic "mark complete" tooling doesn't understand domain-specific status nuance (e.g. descoped vs. delivered) — established in v1.1 (DOM-02/DOM-04 checkbox auto-check), not yet cross-validated by a second milestone.
3. Skipping the milestone audit is a named trade-off, not a default — v1.1 skipped it by choice; v1.2 closed with stale verification by choice. Both were recorded explicitly.
