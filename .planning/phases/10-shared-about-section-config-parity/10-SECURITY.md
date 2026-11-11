---
phase: "10"
slug: "shared-about-section-config-parity"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-11"
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Static FAQ copy → JSON-LD script | FAQ strings are serialized into an inline `application/ld+json` script on every tool page | Repo-authored text (public); must not break out of the script element |
| Browser keyboard → tool shortcuts | Global Enter shortcut can trigger tool actions (DNS lookup = third-party DoH request) | User intent; unintended outbound requests |
| Config sample → public page | A shipped Config worked example is rendered on a public page | Sample device config; must contain no secrets or real addresses |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-10-01 | Tampering | lib/seo/jsonld.ts serializeJsonLd | high | mitigate | `JSON.stringify(...).replace(/</g, "\\u003c")` (jsonld.ts:26); jsonld.test.ts proves `</script>` round-trip | closed |
| T-10-02 | Tampering | components/ToolAbout.tsx FaqJsonLd | medium | mitigate | Raw-HTML prop only in ToolAbout (JSON-LD) among phase-touched files; visible FAQ renders as React text | closed |
| T-10-03 | Repudiation | JSON-LD vs visible FAQ | low | mitigate | One `faqItems` prop feeds both FaqJsonLd and the visible list (ToolAbout.tsx:57,75) | closed |
| T-10-04 | Information Disclosure | useKeyboardShortcut Enter branch | low | mitigate | `summary` in isInteractiveTarget selector (useKeyboardShortcut.ts:66) | closed |
| T-10-05 | Spoofing | ToolCard icon lookup | low | mitigate | `Object.hasOwn(ICONS, name)` else throw (ToolCard.tsx:42); no fallback | closed |
| T-10-06 | Repudiation | REQUIREMENTS CFG-03 / ROADMAP SC-4 | low | mitigate | Amended wording present in both files (content gate grep = 1 each) | closed |
| T-10-07 | Information Disclosure | config faq-data SAMPLE_CONFIG | medium | mitigate | faq-data.test.ts RFC 5737 allow-list + secret-term deny-list | closed |
| T-10-08 | Tampering | ConfigExample.tsx | high | mitigate | No raw-HTML prop or clipboard HTML builder (grep = 0); tokens are React text | closed |
| T-10-09 | Repudiation | Config FAQ privacy / rich-copy answers | medium | mitigate | faq-data.test.ts wording guards with positive control | closed |
| T-10-10 | Tampering | lib/config/token-classes.ts | low | mitigate | Plain module, no `use client` (grep = 0) | closed |
| T-10-11 | Tampering | tool page.tsx files | medium | mitigate | No page-local raw-HTML prop on any /tools/* page; only remaining site is pre-existing theme-init script in app/layout.tsx (unchanged since ede2221) | closed |
| T-10-12 | Repudiation | existing tools' FAQ copy | low | mitigate | `git diff --quiet ede2221 -- app/tools/*/faq-data.ts` (non-config) exits 0 | closed |
| T-10-13 | Spoofing | duplicate testids after migration | low | mitigate | Section-level `{slug}-worked-example` testid absent from page.tsx files (grep = 0) | closed |
| T-10-14 | Tampering | JSON-LD sites repo-wide | medium | mitigate | app/tools/pages-about.test.ts structural guard (negative-tested in 10-05) | closed |
| T-10-15 | Information Disclosure | DNS Enter vs FAQ summary | low | mitigate | about.spec.ts INFO-04 request-count test with positive control | closed |
| T-10-16 | Repudiation | release gate | low | mitigate | Gate results recorded in 10-VALIDATION.md (10-06-03 row, sign-off) and 10-06-SUMMARY.md | closed |
| T-10-17 | Tampering | production HTML of /tools/* | low | mitigate | tests/e2e-prod/about-prod.spec.ts uses expectServerAboutParity; test:e2e:prod 13/13 | closed |
| T-10-SC | Tampering | npm installs | low | mitigate | `git diff --quiet ede2221 -- package.json package-lock.json` exits 0 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 18 | 18 | 0 | execute-phase orchestrator (L1 grep verification; auditor skipped per short-circuit rule: plan-time register, ASVS 1, threats_open 0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
