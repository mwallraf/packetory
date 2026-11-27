---
phase: 17-bgp-route-lookup
verified: 2026-11-27
status: passed
score: 5/5 roadmap criteria verified
covered_files: [".planning/milestones/v1.5-phases/17-bgp-route-lookup/17-01-PLAN.md", ".planning/milestones/v1.5-phases/17-bgp-route-lookup/17-01-SUMMARY.md", ".planning/milestones/v1.5-phases/17-bgp-route-lookup/17-UI-SPEC.md", "app/sitemap.test.ts", "app/tools/bgp/BgpResults.tsx", "app/tools/bgp/BgpTool.tsx", "app/tools/bgp/faq-data.ts", "app/tools/bgp/page.tsx", "app/tools/pages-about.test.ts", "components/SiteHeader.tsx", "components/ToolCard.tsx", "lib/bgp/lookup.test.ts", "lib/bgp/lookup.ts", "lib/bgp/nonpublic.ts", "lib/bgp/transport.ts", "tests/e2e-prod/bgp.spec.ts", "tests/e2e-prod/text-diff-discovery.spec.ts", "tests/e2e/home.spec.ts", "tests/e2e/navigation.spec.ts", "tools/registry.test.ts", "tools/registry.ts", "tools/related.ts"]
covered_digest: "v4:sha256:9eef047e3ec64c8c8ec8769982e30351a724cbc8a19a2115c0bd2afee100eca8"
behavior_unverified: 0
---

# Phase 17 Verification

| Requirement | Evidence |
|---|---|
| BGP-01 | Live Chromium verified exact IPv4 prefix and IPv6 covering-prefix queries. Unit tests distinguish IP coverage from exact CIDR matching. |
| BGP-02 | Lookup fixtures verify IPv4 and IPv6 bounds, timestamp normalization, and multiple origins. Browser assertions verify the visible summary. |
| BGP-03 | Chromium opens both disclosure levels and verifies clipboard output preserves repeated hops. |
| BGP-06 | Production tests verify no request before submit, duplicate suppression, cached reuse, and rate-limit recovery. The live smoke reaches RIPEstat directly. |
| BGP-07 | Chromium verifies invalid input, failed request, and no-route states. The form displays the RIPE RIS source and RIPEstat destination. |

The browser checks exercised long values at 320px and the ninth tool in desktop navigation at 640px and 700px. ASN holder and address registration enrichment is scheduled for Phase 18.

Phase 18 reverified Phase 17 through the shared transport. All four production BGP checks passed, including live Chromium lookups for IPv4 and IPv6, and the full unit suite passed.
