---
phase: 4
slug: dns-lookup
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-25
---

# Phase 4 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| user input → client validation | Free-text domain string crosses into `isValidDomainInput` before any network call | Untrusted domain string |
| client → third-party DoH endpoints | Domain + record type leave the browser to Cloudflare/Google (inherent to the tool) | Domain name, record type |
| DoH response → rendered UI | Attacker-controlled record data (esp. TXT, owned by whoever controls the queried domain) and the echoed domain string cross into React rendering across all state cards | DNS record values (A/AAAA/MX/TXT/NS/CNAME), echoed domain |
| resolver failure signals → user-facing classification | HTTP status / error type determines which state is shown; misclassification is a transparency failure | HTTP status codes, error types |
| build-time content → JSON-LD script | Author-controlled FAQ strings are serialized into an inline `<script type=application/ld+json>` | Static FAQ copy |
| tool → third-party resolvers (disclosure) | The privacy-relevant fact that lookups leave to Cloudflare/Google must be transparently disclosed | N/A (disclosure boundary) |
| DoH response → React render (timing) | Stale/out-of-order DoH responses racing against newer typed input | In-flight response ordering |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-01a | Tampering/EoP | `DnsTool.tsx` record + error-card rendering (04-01, 04-02) | high | mitigate | Every DNS record value and the echoed domain render as JSX text nodes only — never `dangerouslySetInnerHTML`. Verified: no `dangerouslySetInnerHTML` call in `DnsTool.tsx` (only a comment referencing this mitigation at line 191-193). | closed |
| T-04-01b | Tampering/EoP | `page.tsx` `faqJsonLd` inline script (04-03) | high | mitigate | The only `dangerouslySetInnerHTML` in the tool is the JSON-LD block, built from static author-controlled constants with `JSON.stringify(faqJsonLd).replace(/</g, "\\u003c")` (T-03-01/T-02-04 escape precedent). Verified in `app/tools/dns/page.tsx:63-64`. | closed |
| T-04-02 | Denial of Service | `lib/dns/validate.ts` | high | mitigate | Bounded, non-backtracking per-label regex (`{0,61}` fixed quantifier) plus an explicit 253-char total-length ceiling checked *before* any regex runs. Verified: `isValidDomainInput` in `lib/dns/validate.ts` checks `trimmed.length > MAX_DOMAIN_LENGTH` before `LABEL_RE.test()`. | closed |
| T-04-03 | Information Disclosure | analytics / URL state (`lib/analytics/redact.ts`) | high | mitigate | `name` and `type` are never added to `DEFAULT_ALLOW_LIST`; the allow-list is the sole inclusion mechanism (safe-by-default). Verified: `DEFAULT_ALLOW_LIST` is `[]` in `lib/analytics/redact.ts`, unmodified by this phase. | closed |
| T-04-04a | Spoofing/Tampering | `lib/dns/query.ts` resolver URLs | medium | mitigate | `CLOUDFLARE_URL`/`GOOGLE_URL` are hardcoded string literals; only `name`/`type` are user-controlled and are validated before use — no custom-resolver feature exists. Verified: `lib/dns/query.ts:17-18` hardcodes both URLs as string literal constants. | closed |
| T-04-04b | Tampering (stale-state) | `DnsTool.tsx` `handleDomainChange` → in-flight lookup (04-04) | medium | mitigate | A stale/out-of-order DoH response can no longer overwrite the current domain's on-screen state: `cancelInFlightLookup()` aborts the in-flight `AbortController` and bumps `requestSeqRef` before a superseding valid edit's debounce is armed. Verified: `cancelInFlightLookup` has 4 references (1 definition + 3 call sites) in `DnsTool.tsx`, covered by an E2E regression test. | closed |
| T-04-05 | Information Disclosure | resolver disclosure (D-02) | medium | mitigate | Accepted-and-disclosed: FAQ and privacy notice both name Cloudflare and Google as receiving lookups — disclosure mitigation for an inherent property of any DNS tool. Verified: Cloudflare/Google named in `app/tools/dns/faq-data.ts` and `app/tools/dns/DnsTool.tsx`/`page.tsx` copy. | closed |
| T-04-06 | Repudiation/Info Disclosure | `classifyError` branch (`DnsTool.tsx`) | medium | mitigate | `rate-limited` and `resolver-unavailable` are kept as separate states with distinct copy so the UI never misrepresents a rate-limit as a generic outage or vice-versa. Verified: `lib/dns/types.ts` defines distinct `"rate-limited"` / `"resolver-unavailable"` status variants, both consumed by `classifyError` in `DnsTool.tsx`. | closed |
| T-04-SC | Tampering | npm install surface (all 4 sub-plans) | low | accept | No new packages introduced across the phase (native `fetch`/`AbortController`/React built-ins plus already-present `lucide-react` icons only, per RESEARCH Package Legitimacy Audit). Nothing to vet. | closed |

*Status: open · closed · open — below {block_on} threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-04-SC | T-04-SC | No new npm packages introduced in Phase 4 (DNS Lookup) — nothing new to vet on the supply-chain surface. | gsd-secure-phase (grep-level L1 check) | 2026-07-25 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-25 | 9 | 9 | 0 | gsd-secure-phase (orchestrator, L1 grep-depth — short-circuit rule, no auditor subagent spawned) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-25
