---
phase: "11"
slug: "subnet-calculator-compaction"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-11"
---

# Phase 11 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| URL `?cidr=` -> SubnetTool render | Untrusted query text parsed and echoed in the validation note and hero; this phase changed layout only | User-supplied CIDR text (may be an internal address; never sent off-device) |
| repo -> release | Local release gate proves every suite passes on this checkout | Build and test output |
| executor -> GitHub | Executor only read deployment metadata via `gh api`; Lighthouse capture deferred to milestone UAT | Public deployment metadata (sha, environment URL) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-11-01 | Tampering | SubnetTool.tsx rendering of `?cidr=` | low | mitigate | `dangerouslySetInnerHTML` count in SubnetTool.tsx = 0; SubnetTool.test.tsx byte-identical to 8a94a0f and passing | closed |
| T-11-02 | Information Disclosure | URL and analytics surface | low | mitigate | Diff vs 8a94a0f adds no fetch, storage, tracking or URL writes in app/tools/subnet (grep count 0); 8a94a0f invariant diff clean | closed |
| T-11-03 | Denial of Service | Mobile usability at 320/375px | low | mitigate | subnet-layout.spec.ts narrow-width describe (no overflow, About below tool) passing | closed |
| T-11-04 | Repudiation | Release gate | low | mitigate | Six gate commands' result lines quoted in 11-01-SUMMARY.md | closed |
| T-11-05 | Tampering | Test-only `readFileSync` of SubnetToolLoader.tsx | low | accept | Fixed repo-relative path, no external input, test code only | closed |
| T-11-06 | Information Disclosure | Preview URL recorded in SUMMARY | low | mitigate | Preview row is PENDING; record gate's anchored origin pattern rejects query strings/tokens when filled | closed |
| T-11-07 | Repudiation | Lighthouse numbers attributed to wrong build | low | mitigate | Record gate requires preview sha diff-clean vs Phase 11 code commit 5f8369f; backstop truth keeps PENDING human_needed | closed |
| T-11-08 | Elevation of Privilege | Executor pushing/deploying | low | mitigate | No push (no phase-11 remote heads), no vercel command, no checkpoint returned | closed |
| T-11-SC | Tampering | npm installs | low | mitigate | `git diff --quiet 8a94a0f -- package.json package-lock.json` exits 0 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-11-01 | T-11-05 | Test-only fixed-path file read with no external input; same pattern as hash-layout.spec.ts | plan (11-01 threat model) | 2026-11-11 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 9 | 9 | 0 | gsd-secure-phase (orchestrator, L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
