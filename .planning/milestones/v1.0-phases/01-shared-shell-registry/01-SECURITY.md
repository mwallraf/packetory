---
phase: 01
slug: shared-shell-registry
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-23
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry -> build machine | Third-party packages installed during scaffold execute arbitrary install scripts (supply-chain surface). | Package code/scripts |
| browser localStorage -> client theme logic | The stored theme value is client-controllable input read on every load. | Theme preference string |
| browser DOM events -> global keyboard hook | Global keydown listener processes untrusted user key events on every page. | Key events |
| current URL/path -> active-link logic | The pathname (user-controllable via navigation) drives which nav link is marked active. | Path string |
| client request headers -> app/api/ip route | `x-forwarded-for` is client-influenceable; only the platform-set portion is trustworthy. | IP address (PII) |
| server IP value -> rendered DOM | The IP string is reflected into the page and the clipboard. | IP address (PII) |
| visitor IP -> analytics/logs | The IP is PII; it must not leak into telemetry. | IP address (PII) |
| page URL / query params -> analytics provider | Query params may contain sensitive values (future MACs, private IPs, hostnames, secrets); the redaction boundary decides what leaves the browser. | Query param values |
| AI-drafted legal text -> published /privacy page | Privacy/legal wording asserted to users must be accurate and human-approved. | Published copy |
| PR source -> CI runner | Untrusted PR code executes in CI; third-party actions run with repo context. | Repo code, Actions context |
| CI/Vercel -> production deploy | The merge gate + deploy pipeline decides what reaches production. | Build artifacts |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-SC | Tampering | npm installs during scaffold | high | mitigate | Blocking-human package-legitimacy checkpoint verified every package on npmjs.com before install; all 26 deps resolve to registry.npmjs.org, no slop/typosquat package | closed |
| T-01-02 | Tampering | localStorage theme value | low | mitigate | `ThemeProvider.tsx` `isValidTheme` + `THEME_INIT_SCRIPT` gate stored value to `{light,dark}` before applying to `<html>` | closed |
| T-01-03 | Information Disclosure | theme persistence | low | accept | localStorage only, never a cookie; no PII stored | closed |
| T-02-01 | Tampering | useKeyboardShortcut global listener | low | mitigate | Dispatches only to fixed closed key set `{/,Enter,Escape,Ctrl/Cmd+C}`; no eval/reflection; copy branch gated to non-editable focus | closed |
| T-02-02 | Denial of Service | active-link path parsing | low | accept | Pure string compare against registry slugs, no regex/network | closed |
| T-02-03 | Elevation of Privilege | registry-derived nav | low | accept | Static compile-time-typed registry, no user-authored content | closed |
| T-03-01 | Spoofing | x-forwarded-for parsing | high | mitigate | `parseForwardedIp` selects left-most (platform-trusted) entry, validates IPv4/IPv6 shape, display-only | closed |
| T-03-02 | Tampering/Injection | IP value rendered into DOM | medium | mitigate | Validated as IP literal, rendered via React default text escaping, no dangerouslySetInnerHTML | closed |
| T-03-03 | Information Disclosure | visitor IP handling | medium | mitigate | Not logged/persisted, `no-store` on route + client fetch, never enters analytics | closed |
| T-04-01 | Information Disclosure | analytics query-param reporting | high | mitigate | `redactParams` safe-by-default allow-list wired via `beforeSend`; allow-list currently empty | closed |
| T-04-02 | Repudiation/Compliance | AI-drafted privacy notice | medium | mitigate | Published as flagged draft, human sign-off recorded 2026-07-23, no unverified compliance claims | closed |
| T-04-03 | Information Disclosure | cookie-free analytics | low | accept | `@vercel/analytics/next` is cookie-free by design, no fingerprinting identifier introduced | closed |
| T-05-SC | Tampering | GitHub Actions third-party actions | medium | mitigate | Pinned trusted-publisher actions, `npm ci` against committed lockfile, no `continue-on-error` on any gating step | closed |
| T-05-01 | Elevation of Privilege | deploy credentials | medium | mitigate | Vercel GitHub integration, no deploy token/secrets in repo or workflow | closed |
| T-05-02 | Spoofing | merge gate bypass | high | mitigate | Live-verified: ruleset `protect-main` requires PR + status checks (typecheck/lint/test/build/e2e), `current_user_can_bypass: never` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-01 | T-01-03 | Theme persistence deliberately uses localStorage, not a cookie — no tracking-cookie surface, no PII stored. | mwallraf (plan-time, PLAN.md 01-01) | 2026-07-23 |
| R-02 | T-02-02 | Active-link matching is a pure string compare with no regex backtracking or network call; a crafted path at worst matches zero links (safe default). | mwallraf (plan-time, PLAN.md 01-02) | 2026-07-23 |
| R-03 | T-02-03 | Nav is rendered from a static, compile-time-typed registry with no user-authored content — no injection path into the nav list. | mwallraf (plan-time, PLAN.md 01-02) | 2026-07-23 |
| R-04 | T-04-03 | Vercel Analytics is cookie-free by design and no fingerprinting identifier is introduced, so no tracking-cookie surface exists. | mwallraf (plan-time, PLAN.md 01-04) | 2026-07-23 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-23 | 15 | 15 | 0 | gsd-security-auditor (Claude, opus) |

**Auditor notes:** T-01-SC verified with a scope clarification — the shipped dependency set legitimately exceeds CLAUDE.md's recommendation tables (shadcn/Radix UI stack, `@vercel/analytics`, `geist`, `lucide-react`, testing scaffold), but the register's actual verification criterion ("no unexpected/slop deps, all resolve to registry.npmjs.org") is satisfied — closed with this scope note rather than treated as a literal-wording failure. No unregistered threats found: no `## Threat Flags` in any SUMMARY.md, and a codebase-wide grep found only one `dangerouslySetInnerHTML` sink (`app/layout.tsx`, the intended compile-time-constant `THEME_INIT_SCRIPT`, not user data).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-23
