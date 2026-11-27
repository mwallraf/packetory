---
phase: "17"
slug: "bgp-route-lookup"
status: validated
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-27"
---

# Phase 17 — Validation Strategy

## Test Infrastructure

Vitest uses `vitest.config.ts`. Production Chromium runs against a fresh Next.js build using `playwright.prod.config.ts`.

## Per-Task Verification Map

| Task | Requirement | Coverage | Evidence |
|---|---|---|---|
| 17-01-01, 17-01-02 | BGP-01 | Covered | `lookup.test.ts` verifies normalization, exact CIDR matching, and covering routes. The production spec submits through the page. |
| 17-01-01, 17-01-03 | BGP-02 | Partial | Unit assertions cover multiple origins and timestamps. Browser assertions cover prefix, bounds, and origin. Collector count and displayed observation time remain manual. |
| 17-01-03 | BGP-03 | Partial | The production tracer opens collector and peer disclosures and verifies that clipboard output preserves AS prepending. Individual peer metadata remains manual. |
| 17-01-01, 17-01-02 | BGP-06 | Covered | Unit and Chromium tests verify submit-only traffic, single-flight, cache reuse and expiry, timeout, and rate-limit recovery. |
| 17-01-02, 17-01-03 | BGP-07 | Partial | Chromium distinguishes invalid input, no route observed, and request failure. Source and destination copy remains manual. |

Audit rerun on 2026-11-27 passed eight unit tests and three production browser tests. The opt-in live test was skipped in this rerun. Live IPv4 and IPv6 results were verified during Phase 18 and are recorded in the phase verification report.

## Manual-Only Verifications

| Requirement | Manual check |
|---|---|
| BGP-02, BGP-03 | Compare the route summary collector count and observation time with the RIPEstat response. Expand a peer and compare the peer IP, next hop, last changed, and last confirmed values against their respective source fields. |
| BGP-07 | Confirm the visible lookup text identifies RIPE RIS as the observation source and RIPEstat as the destination for the submitted query. |

The user chose to retain these two groups as manual-only. Automated coverage is partial.

## Validation Audit 2026-11-27

| Metric | Count |
|---|---|
| Gaps found | 2 |
| Resolved | 0 |
| Escalated | 2 |
