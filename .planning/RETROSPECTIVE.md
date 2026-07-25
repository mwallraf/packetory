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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | — | 5 | First milestone — established the shared-shell/registry pattern, Server-shell+Client-island split, and framework-agnostic `lib/` convention now expected of every future tool. |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|---------------------|
| v1.0 | ~600+ unit + e2e (per-phase counts: 97 UUID, 169 Subnet, 72 DNS, 329+ MAC — approximate, not centrally tallied) | Not centrally measured | `ip-address`, `uuid`, DoH via native `fetch` (no new dependency) |

### Top Lessons (Verified Across Milestones)

1. Audit every path into a guarded async/state-transition condition before shipping a fix — established in v1.0 (DNS-04 → MAC vendor lookup), not yet cross-validated by a second milestone.
