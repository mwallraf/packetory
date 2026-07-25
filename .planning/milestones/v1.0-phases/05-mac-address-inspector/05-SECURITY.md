---
phase: 05
slug: mac-address-inspector
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-25
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| user keyboard/paste → MacTool input | Untrusted free-text MAC string enters the client; parsed + rendered into the DOM. | Arbitrary user-typed/pasted text |
| MacTool → analytics (beforeSend) | Page-view URL is reported; must never carry the MAC. | URL query params (redacted) |
| browser (MacTool) → /api/mac-vendor | Only a 6-hex OUI crosses; the host portion of the MAC never leaves the browser. | 6-hex OUI only |
| /api/mac-vendor (server) → api.maclookup.app | Server-to-server upstream fetch; user-influenced only via the pre-validated `oui` interpolated into a hardcoded host literal. | Validated 6-hex OUI |
| parsed MAC bytes → classification render | Pure computation from untrusted bytes into DOM text/badges. | Classified bytes (no new boundary) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-01 | Tampering / Elevation of Privilege | app/api/mac-vendor/route.ts `oui` param | high | mitigate | Strict `/^[0-9A-Fa-f]{6}$/` server-side validation (`OUI_RE`) before use; upstream host is a hardcoded `https://api.maclookup.app` literal, never derived from request input. Verified present at route.ts:49,68,79. | closed |
| T-05-02 | Information Disclosure | full MAC → server/logs/analytics/upstream | high | mitigate | Only the OUI (6 hex) is ever sent (privacy-by-construction); `mac`/`oui` never added to `DEFAULT_ALLOW_LIST` (regression-guarded by `redact.test.ts`); Phase 1 `beforeSend` strips any non-allow-listed param. Verified `DEFAULT_ALLOW_LIST = []` at redact.ts:25. | closed |
| T-05-02a | Information Disclosure | MacTool URL state / analytics | high | mitigate | No `?mac=`/`?oui=` URL state added; `mac`/`oui` never in `DEFAULT_ALLOW_LIST`. Same mitigation and evidence as T-05-02. | closed |
| T-05-05 | Denial of Service / Availability | route upstream fetch to maclookup.app | medium | mitigate | `AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)` bounds the upstream call so a hung maclookup.app cannot hang this app's own response. Verified present at route.ts:80. | closed |
| T-05-08 | Information Disclosure / Availability | classify.ts ↔ vendor coupling | high | mitigate | `classifyMac` is a pure, network-free function invoked synchronously before any fetch — structurally guarantees classification cannot break when vendor lookup fails (MAC-08). Verified: `classifyMac` called at MacTool.tsx:121/623, before `scheduleVendorLookup`/`runVendorLookupImmediate`; confirmed by 05-VERIFICATION.md key-link table and the no-mock e2e test. | closed |
| T-05-XSS | Tampering | MacTool format-row / badge / OUI rendering | medium | mitigate | All MAC-derived values (format rows, OUI, badges) are rendered as JSX text content only — never `dangerouslySetInnerHTML`; React auto-escaping neutralizes any injected markup in a pasted string. Verified: zero occurrences of `dangerouslySetInnerHTML` in MacTool.tsx. | closed |
| T-05-03 | Denial of Service | /api/mac-vendor as open pass-through | medium | accept | Route only accepts a narrow 6-hex value (not a generic fetch proxy); maclookup.app's own 10 req/sec, 25K/6h unauthenticated ceiling plus low expected traffic make an app-level limiter unnecessary for v1. Independently corroborated by 05-REVIEW.md WR-01, which examined and declined a naive in-memory/IP-based limiter because the project's `parseForwardedIp.ts` docstring explicitly forbids its use for security decisions — confirming the accepted-risk disposition (not a gap) rather than proposing a workaround. Revisit if production traffic suggests otherwise. | closed (accepted) |
| T-05-04 | Denial of Service | lib/mac/parse.ts / client MAC-input validation | low | accept | Strip-then-length-check has no backtracking-capable regex — ReDoS is structurally impossible; no bounded pattern needed. | closed (accepted) |
| T-05-SC | Tampering | npm/pip/cargo installs | low | accept | No new packages installed across any of the 3 plans in this phase (05-RESEARCH.md Package Legitimacy Audit: N/A); the external API is called via native `fetch`, not a package dependency. | closed (accepted) |

*Status: open · closed · open — below {block_on} threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-05-01 | T-05-03 | No rate limiting on `/api/mac-vendor`. Upstream (maclookup.app) already enforces 10 req/sec / 25K per 6h unauthenticated; expected traffic for a single-page utility tool is low. A naive in-memory/IP-based limiter was explicitly considered and rejected during code review (05-REVIEW.md WR-01) because it would require `parseForwardedIp.ts`, whose docstring forbids use in security decisions. Real rate limiting requires an infra decision (Vercel KV/Upstash or Firewall rules), deferred to a follow-up if production traffic warrants it. | Plan 05-03 (plan-time disposition), reaffirmed at code review | 2026-07-25 |
| AR-05-02 | T-05-04 | Strip-then-length-check MAC parsing has no backtracking-capable regex; ReDoS is structurally impossible by construction. | Plan 05-01/05-03 (plan-time disposition) | 2026-07-25 |
| AR-05-03 | T-05-SC | No new third-party packages introduced in this phase; the vendor lookup uses native `fetch`, not an installed dependency. | Plans 05-01/05-02/05-03 (plan-time disposition) | 2026-07-25 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-25 | 9 | 9 | 0 | Claude (gsd secure-phase, State B — register authored at plan time, ASVS L1 short-circuit; each `mitigate` disposition independently verified against source, each `accept` disposition cross-checked against 05-REVIEW.md) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-25
