# Phase 7: Production Domain Cutover (packetory.dev) - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Originally scoped (per ROADMAP.md) as: canonical origin used everywhere, old-URL redirects configured, and a runbook for the user's manual domain-registration/Vercel-dashboard steps.

**This changed during discussion.** The user has already manually registered `packetory.dev` and added/configured it in the Vercel dashboard — live-verified during this session (`curl -sI https://packetory.dev` → `HTTP/2 200`, served by Vercel with a valid TLS cert for `packetory.dev`). The user then explicitly decided to skip the redirect work and skip the runbook (see Decisions below).

**Phase 7 is now narrowly scoped to:** confirming DOM-03 (canonical URL / `SITE_URL` correctness) in code, and recording DOM-01/DOM-02/DOM-04's actual status (verified-live, descoped, descoped) in project docs. There is little to no new code to write.

</domain>

<decisions>
## Implementation Decisions

### Domain live status (DOM-01)
- **D-01:** Verified live during this discussion: `https://packetory.dev` returns `HTTP/2 200` from Vercel with a valid TLS certificate (`CN=packetory.dev`, issued 2026-07-25, expires 2026-10-23). DOM-01 is satisfied — no further code or user action needed. Planner/executor should treat this as an already-met success criterion, confirmed via live check rather than user self-report alone.

### Redirects (DOM-02) — explicitly descoped
- **D-02:** The user decided **not** to implement the `packetory.vercel.app` → `packetory.dev` and `www.packetory.dev` → `packetory.dev` redirects, despite ROADMAP.md's original success criterion 2 requiring them. This was a deliberate choice after being shown live evidence that neither currently redirects:
  - `https://packetory.vercel.app` → `HTTP 200` (serves the same content directly, does not redirect)
  - `https://www.packetory.dev` → TLS handshake fails; the certificate served only covers `CN=packetory.dev`, not `www` — `www` is not fully configured in Vercel
- **D-03:** No `next.config.ts` / `vercel.json` redirect rule should be added in this phase. Do not implement host-based redirects even though the codebase scout found no existing rule and the roadmap originally called for one.
- **D-04:** REQUIREMENTS.md's DOM-02 and ROADMAP.md's Phase 7 success criteria #2 and #5 should be marked descoped/dropped at the next PROJECT.md/ROADMAP.md transition, not left as "pending" — this was a deliberate scope-narrowing decision, not an oversight. Known consequence, stated explicitly to the user and accepted: `packetory.vercel.app` will keep serving the same content as a permanent second live URL (duplicate-content SEO exposure), and `www.packetory.dev` will keep failing TLS/serving nothing usable, both indefinitely, unless revisited in a future phase.

### Runbook (DOM-04) — explicitly descoped
- **D-05:** No runbook document (forward-looking or retroactive) should be written. The user already completed the manual registration/Vercel-dashboard steps themselves and does not want documentation of a now-completed one-time action. Do not create a new doc or extend `DEPLOY.md` for this.
- **D-06:** REQUIREMENTS.md's DOM-04 and ROADMAP.md's Phase 7 success criteria #3 should likewise be marked descoped at the next transition.

### Canonical URLs (DOM-03) — confirm, don't rewrite
- **D-07:** Codebase scout during this discussion found `SITE_URL` (`app/sitemap.ts:9`) already hardcodes `https://packetory.dev`, and every tool page's canonical/OG tags (`app/tools/{uuid,subnet,dns,mac}/page.tsx`) already import and derive from it — a repo-wide grep for `packetory.vercel.app` found zero literal matches in application code. `app/robots.ts` also derives its `sitemap:` field from the same `SITE_URL` constant.
- **D-08:** Remaining work for DOM-03 is a **confirmation/audit pass**, not a rewrite: re-run the repo-wide grep at execution time (code may have changed since this discussion), and explicitly verify there are no other hardcoded-origin references outside the files already found (e.g., check `vercel.json`, any `.env` files, absolute image/OG URLs, structured data/JSON-LD blocks). If the audit still finds zero `packetory.vercel.app` literals, DOM-03 can be marked complete with that grep output as evidence — no code changes expected.

### Claude's Discretion
- Exact wording/placement of the PROJECT.md and ROADMAP.md updates recording DOM-01 as verified-live and DOM-02/DOM-04 as descoped — implementer's call, as long as the rationale (user's explicit decision, live-evidence-informed) is preserved for future readers.
- Whether the DOM-03 audit pass runs as part of this phase's plan or is folded directly into phase verification, given how little independent work it represents.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements & roadmap
- `.planning/ROADMAP.md` — Phase 7 section: original goal and 5 success criteria (criteria 2 and 3 for DOM-02/DOM-04 are now descoped per this discussion; criteria 1 and 4 for DOM-03/DOM-01 still apply, with DOM-01 already verified live)
- `.planning/REQUIREMENTS.md` — DOM-01, DOM-02, DOM-03, DOM-04 definitions (lines 16-19); DOM-02 and DOM-04 to be marked descoped, not "Pending", at the next transition
- `.planning/PROJECT.md` — "v1.1 progress" context note already anticipated that DOM-01/DOM-02 needed user confirmation after manual steps; that confirmation happened during this discussion, informally, and should be reflected here

### Existing docs relevant to the (now-skipped) redirect/runbook work
- `DEPLOY.md` — existing "one-time human dashboard action" runbook style for Vercel/CI setup; NOT to be extended per D-05, but is the reference point that made the "skip the runbook" decision informed (a similar doc already exists and this phase chose not to add to it)
- `project-brief.md` §14 "Automation and operations model" — human approval required before "registering or paying for a domain or service"; already satisfied since the user did this manually before this discussion

### Code locations for the DOM-03 confirmation pass
- `app/sitemap.ts` — `SITE_URL` constant (line 9), already `https://packetory.dev`
- `app/robots.ts` — derives `sitemap:` URL from `SITE_URL`
- `app/tools/uuid/page.tsx`, `app/tools/subnet/page.tsx`, `app/tools/dns/page.tsx`, `app/tools/mac/page.tsx` — each imports `SITE_URL` from `@/app/sitemap` for its `CANONICAL_URL`

**No external specs beyond the above** — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/sitemap.ts`'s `SITE_URL` constant — single source of truth already correctly set; nothing to build, only confirm.

### Established Patterns
- Registry/constant-driven origin: every tool page imports `SITE_URL` rather than hardcoding an origin string — this pattern is already fully applied, no gaps found.

### Integration Points
- None expected — this phase, as descoped, touches no runtime code paths. Any work is documentation-only (PROJECT.md/ROADMAP.md/REQUIREMENTS.md updates) plus a confirmation grep.

</code_context>

<specifics>
## Specific Ideas

- User's own words: "I have registered the domain packetory.dev and linked it in vercel, everything is working, I don't need redirects or anything." Live checks during discussion showed the redirect and www-subdomain pieces are not actually in place yet, but the user still chose to explicitly close that scope rather than complete it now — this was surfaced and confirmed, not overlooked.

</specifics>

<deferred>
## Deferred Ideas

- **`packetory.vercel.app` → `packetory.dev` redirect** — not implemented. If duplicate-content SEO issues or user confusion from two live URLs become a problem later, this would need a new phase (host-matched `next.config.ts` or `vercel.json` redirect rule).
- **`www.packetory.dev` fix** — currently fails TLS (cert doesn't cover `www`). Needs the user to add `www.packetory.dev` as a domain in the Vercel dashboard (with or without Vercel's native redirect-to-apex toggle) if this is ever revisited.
- **Runbook for domain/DNS/SSL setup** — not written. Would only be worth doing retroactively if this project becomes a template for future similar sites, or if the current setup ever needs to be reproduced (e.g. migrating Vercel accounts, cert renewal issues).

</deferred>

---

*Phase: 7-Production Domain Cutover (packetory.dev)*
*Context gathered: 2026-07-25*
