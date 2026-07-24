---
phase: 02
slug: uuid-generator
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-24
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry -> build | `npm install uuid` pulls third-party code into the build at install time. | Third-party package code |
| (none at runtime) | UUID generation is fully in-browser; no server round-trip, no network, no untrusted input crosses into the tool. | None |
| user -> batch-count Input | The one free-value field on the page; a user (or a crafted URL/paste) can enter arbitrary text. | User-supplied string |
| build-time content -> server HTML | FAQ/worked-example data is serialized into the initial HTML, including a JSON-LD `<script>` via `dangerouslySetInnerHTML`. | Static, author-controlled JSON |
| in-memory UUID array -> clipboard / downloaded file | Generated values are serialized to the clipboard and to a Blob the browser saves; both are local, author-controlled data. | Client-local only, never transmitted |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Tampering | lib/uuid/generate.ts (RNG source) | medium | mitigate | Generation exclusively via `uuid` package's `v4()`/`v7()` (Web Crypto CSPRNG); no `Math.random`. Verified: `generate.ts:1` imports `v4`/`v7` from `uuid`; no `Math.random` reference in the file. | closed |
| T-02-SC | Tampering | npm install `uuid` | high | mitigate | `uuid@14.0.1` pinned exact version, prior package-legitimacy audit (RESEARCH.md): zero runtime deps, ~269M weekly downloads, no postinstall script. Verified: `package.json` pins `"uuid": "14.0.1"` (exact, no caret/tilde). | closed |
| T-02-02 | Denial of Service | batch-count Input in UuidTool.tsx | medium | mitigate | Batch count clamped to integer [1,100] before use as array length, both in `generate.ts` (defense-in-depth) and the UI layer (`parseCountInput`). Verified: `generate.ts:36` clamps via `Math.min(100, Math.max(1, Math.trunc(...)))` with explicit `NaN`-normalization guard; `UuidTool.tsx` `parseCountInput` rejects non-numeric/decimal/negative/>100 input with inline hint. | closed |
| T-02-03 | Tampering | regenerate / version-switch RNG | low | mitigate | All regeneration routes through the same CSPRNG-backed `generate()`/`generateBatch()`; no alternate RNG path exists. Verified: single generation entry point in `generate.ts`, reused by all UI triggers. | closed |
| T-02-04 | Tampering (XSS) | FAQPage JSON-LD `dangerouslySetInnerHTML` in page.tsx | high | mitigate | `<` escaped to `<` in the serialized JSON-LD string before injection (per Next.js JSON-LD guidance), closing the script-break vector; data is static/author-controlled. Verified: `page.tsx:53` — `JSON.stringify(faqJsonLd).replace(/</g, "\\u003c")`. | closed |
| T-02-05 | Information Disclosure | static worked-example sample values | low | accept | v4/v7 samples are illustrative build-time constants, never claimed as the visitor's generated value, never user-derived. No mitigation required. | closed |
| T-02-06 | Tampering (CSV injection) | lib/uuid/export.ts `toCsv` | low | accept | UUID alphabet is hex digits + hyphen only; a value can never begin with `=`/`+`/`@` or contain a comma/quote/newline — no spreadsheet-formula-injection or CSV-structure-injection surface exists. No escaping library warranted. | closed |
| T-02-07 | Denial of Service (resource) | Blob object-URL on repeated Download | low | mitigate | `URL.revokeObjectURL` called immediately after the synthetic anchor click so repeated downloads do not leak object URLs. Verified: `UuidTool.tsx:184` — `setTimeout(() => URL.revokeObjectURL(url), 0)`. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-05 | Worked-example v4/v7 samples are build-time constants, not user data; disclosure risk is nil. | Plan-time (02-03-PLAN.md) | 2026-07-23 |
| AR-02-02 | T-02-06 | UUID alphabet (hex + hyphen) structurally cannot form a CSV formula-injection or structure-injection payload; no escaping library needed. | Plan-time (02-04-PLAN.md) | 2026-07-23 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-24 | 8 | 8 | 0 | Claude (orchestrator, L1 grep-depth per ASVS level 1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-24
