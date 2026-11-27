---
phase: "18"
slug: "asn-and-address-registration"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-27"
---

# Phase 18 — Validation Strategy

| Task | Requirement | Evidence | Command |
|---|---|---|---|
| 18-01-01 | BGP-04 | Base results precede optional holder enrichment | `npm run test:e2e:prod -- tests/e2e-prod/bgp-registration.spec.ts --grep tracer` |
| 18-01-02 | BGP-04, BGP-05 | Response validation, scheduler, cache, retry, partial results, stale response handling, mobile wrapping | `npm test -- lib/bgp` and `npm run test:e2e:prod -- tests/e2e-prod/bgp-registration.spec.ts tests/e2e-prod/bgp.spec.ts` |

Run focused checks per task. Run lint, type checking, the full unit suite, and a production build before handoff. Opt into a single live production browser smoke for the shared example and verify route, holder, and on-demand registration responses including CORS.
