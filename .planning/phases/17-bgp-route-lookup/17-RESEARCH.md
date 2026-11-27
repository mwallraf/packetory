# Phase 17 — Research

## RIPEstat integration

The existing research verified HTTP 200 and wildcard CORS with the Packetory origin on the Looking Glass endpoint. RIPE RIS serves near-real-time collector observations. Bare IP queries seek a covering prefix and CIDR queries require an exact prefix. Responses group peers under collectors and include routing and freshness data. The prior IPv4 sample returned 23 collectors and 385 observations, which supports collapsed collector sections and motivates a large fixture.

- [Looking Glass API contract](https://data.stat.ripe.net/docs/data-api/api-endpoints/looking-glass)
- [RIPEstat usage rules](https://stat.ripe.net/docs/data-api/ripestat-data-api#rules-of-usage)

RIPEstat documents eight simultaneous requests per source IP and asks projects regularly exceeding 1,000 calls per day to register. The Phase 17 client should use one outstanding lookup per tab, short-lived in-memory reuse, and explicit submit. Use a fixed HTTPS origin and omit credentials. Verify both address families in the browser during execution with one manual submission each. Keep automated tests offline using fixed fixtures.

## Repository patterns

Use the shell and About pattern in `app/tools/dns/page.tsx`, the shared `tools/registry.ts` and `tools/related.ts`, and the explicit icon mapping in `components/ToolCard.tsx`. Reuse `lib/subnet/parse.ts` and IPv4/IPv6 computations for exact canonical matching and numeric address bounds. Bare addresses can use the corresponding host-length suffix internally while retaining bare-address request semantics. Check existing parser behavior for IPv4-mapped IPv6 and explicitly test the supported behavior. Keep queries out of page URLs, analytics fields, and persistent storage.

## Validation Architecture

Model fixtures cover mixed families, empty and invalid envelopes, multiple origins, repeated ASNs, and timestamp parsing. Client fixtures cover request count, equivalent normalized input, cache expiry, timeout, and 429 backoff. Production Playwright covers the public route, outbound request, disclosures, clipboard feedback, keyboard use, and 320px wrapping. A manual browser smoke checks real CORS and upstream response shape.
