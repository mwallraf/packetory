---
phase: 03
slug: ip-subnet-calculator
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-24
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| URL `?cidr=` → client render | User-controlled query string read on mount and reflected into page text and `window.history.replaceState` | CIDR string (IPv4/IPv6) |
| User keystrokes → parse → render | Untrusted CIDR strings enter the pure BigInt parser | CIDR string |
| (no server tier) | All computation is client-side BigInt math; no server request handles the CIDR | n/a |
| Parsed address BigInt → formatted strings | Pure formatting; input already validated by `parseCidr` | BigInt address values |
| Reverse-DNS zone → page text | Formatted zone string rendered as React text content | Zone name string |
| IPv6 `?cidr=` → parse → 128-bit math → render | User-controlled IPv6 CIDR flows through the pure BigInt parser and formatters into React text | CIDR string |
| Subdivision pill click → `setCidr` → URL/render | A bounded, tool-generated CIDR re-enters the same validated parse + URL-write path as a typed edit | Tool-generated CIDR |
| Static FAQ content → JSON-LD script | Author-controlled build-time content injected via `dangerouslySetInnerHTML` | Static `faqItems` constant |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 (03-01) | Tampering / EoP | `?cidr=` value rendered into SubnetTool | high | mitigate | Rendered only as React text content (default JSX escaping); no `dangerouslySetInnerHTML` for user input; URL write uses `encodeURIComponent`. Confirmed: no `dangerouslySetInnerHTML` call sites take user input (03-VERIFICATION.md Key Link Verification; 03-REVIEW.md Summary). | closed |
| T-03-02 (03-01) | Denial of Service | `parseCidr` input validation | medium | mitigate | Bounded, non-backtracking validation (split on `/`, per-octet/hextet bounded char-class checks + WHATWG `URL` bracket-wrap); no nested-quantifier regex. Confirmed by code-review read of `lib/subnet/parse.ts` (03-REVIEW.md) — no ReDoS-prone patterns; WR-02 fix (commit `d2098c9`) only tightened validator/expander agreement, did not introduce backtracking. | closed |
| T-03-03 (03-01) | Information Disclosure | Private-range CIDR in bookmarkable URL reaching analytics | high | mitigate | D-01 (locked): `cidr` never added to `lib/analytics/redact.ts` allow-list; no analytics call in the subnet code path. Confirmed: `grep -n "cidr" lib/analytics/redact.ts` = no match (03-VERIFICATION.md Truth #8). | closed |
| T-03-SC (03-01) | Tampering (supply chain) | npm installs | low | accept | No new packages added in 03-01 (only a `tsconfig.json` target bump, no dependency changes). | closed |
| T-03-01 (03-02) | Tampering / EoP | Reverse-DNS / formatted values rendered into SubnetTool | high | mitigate | Values derived from an already-validated BigInt, rendered only as React text content; no `dangerouslySetInnerHTML`. Confirmed by code review of `SubnetTool.tsx`. | closed |
| T-03-05 (03-02) | Repudiation / transparency | Non-aligned reverse-DNS zone shown without a note | medium | mitigate | Truncated-boundary zone always carries an explanatory note, never presented as authoritative. Confirmed: 03-VERIFICATION.md Truth #3a; user-confirmed as desired UX in 03-UAT.md Test 2 (2026-07-24). | closed |
| T-03-SC (03-02) | Tampering (supply chain) | npm installs | low | accept | No new packages added in 03-02. | closed |
| T-03-01 (03-03) | Tampering / EoP | IPv6 values rendered into SubnetTool | high | mitigate | Rendered only as React text content; no `dangerouslySetInnerHTML` for user input. Confirmed by code review of the IPv6 grid branch in `SubnetTool.tsx`. | closed |
| T-03-02 (03-03) | Denial of Service | IPv6 literal validation | medium | mitigate | IPv6 syntax validated by the bounded WHATWG `URL` bracket-wrap in `parseCidr`; no backtracking regex; 128-bit math is O(1) BigInt ops. Confirmed via 03-REVIEW.md code read; WR-02 fix did not add regex complexity. | closed |
| T-03-06 (03-03) | Tampering (precision) | 128-bit address/count math | medium | mitigate | BigInt end-to-end, no `Number()` coercion; fast-check property test proves exact counts over prefix 0-128. Confirmed: `grep -c "Number(" lib/subnet/ipv4.ts` = 0 (03-VERIFICATION.md Truth #3b); property tests pass. | closed |
| T-03-SC (03-03) | Tampering (supply chain) | npm installs | low | accept | No new packages added in 03-03. | closed |
| T-03-04 (03-04) | Denial of Service (client) | Subdivision option rendering | medium | mitigate | Only a fixed ≤3-item granularity list is ever rendered; never a per-child enumeration of a wide prefix. Confirmed: `subdivide.ts`'s `STANDARD_SUBDIVISION_PREFIXES` is a fixed 3-member constant (03-VERIFICATION.md Truth #9). | closed |
| T-03-01 (03-04) | Tampering / EoP | Generated sub-block CIDR rendered/URL-written | high | mitigate | Sub-block CIDR is re-validated by `parseCidr` and rendered/URL-encoded via the same path as a typed edit (`handleSubdivide` → `handleCidrChange`); no `dangerouslySetInnerHTML`. Confirmed by 03-VERIFICATION.md Key Link Verification. | closed |
| T-03-SC (03-04) | Tampering (supply chain) | npm installs | low | accept | No new packages added in 03-04. | closed |
| T-03-01 (03-05) | Tampering / EoP | FAQPage JSON-LD `dangerouslySetInnerHTML` | high | mitigate | Source is a static, author-controlled `faqItems` constant (no user input); `<`→escaped substitution reused from the UUID page neutralizes script-break injection. Confirmed: 03-REVIEW.md Summary — "the one `dangerouslySetInnerHTML` call is correctly escaped for JSON-LD." | closed |
| T-03-03 (03-05) | Information Disclosure | FAQ copy about analytics | medium | mitigate | FAQ content makes no tracking claim and describes no analytics; D-01 privacy posture preserved. No flags raised by code review or verification. | closed |
| T-03-SC (03-05) | Tampering (supply chain) | npm installs | low | accept | No new packages added in 03-05. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-SC | T-03-SC (all plans) | No new npm dependencies added anywhere in phase 3 — nothing to supply-chain-verify. | Planner (per-plan threat model, D-03) | 2026-07-24 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-24 | 17 | 17 | 0 | Claude (gsd-secure-phase, ASVS L1 — register authored at plan time, short-circuit per workflow Step 3) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-24
