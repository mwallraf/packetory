---
phase: "17"
slug: "bgp-route-lookup"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-27"
---

# Phase 17 — Validation Strategy

Use the existing Vitest and production Playwright configs. Add each fixture and assertion in the task that introduces its behavior.

| Task | Requirement | Secure behavior | Verification |
|---|---|---|---|
| 17-01-01 | BGP-01, BGP-02, BGP-06 | Fixed HTTPS destination, no requests before submit | `npx playwright test -c playwright.prod.config.ts tests/e2e-prod/bgp.spec.ts --grep tracer` |
| 17-01-02 | BGP-01, BGP-02, BGP-06, BGP-07 | Validate inputs and upstream data, bound requests, avoid query persistence | `npm test -- lib/bgp/lookup.test.ts` |
| 17-01-03 | BGP-02, BGP-03, BGP-07 | Render upstream strings as text, preserve keyboard and narrow viewport access | `npx playwright test -c playwright.prod.config.ts tests/e2e-prod/bgp.spec.ts` |

Run each focused command after its task, then `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` before handoff. During manual verification submit one known IPv4 and one known IPv6 resource from the built page. Check CORS, direct network destination, result labels, and the mobile layout. Record observed evidence before updating validation status.
