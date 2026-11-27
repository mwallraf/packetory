# Phase 18 — RIPEstat Enrichment Research

- Use [AS Overview](https://stat.ripe.net/docs/data-api/api-endpoints/as-overview) with `resource=AS<origin>`. Read `data.holder` for that ASN. A null holder means unavailable. Preserve the origin observed by Looking Glass regardless of AS Overview's visibility threshold or results.
- Use [RIR](https://stat.ripe.net/docs/data-api/api-endpoints/rir) with the matched prefix and `lod=2`. It returns both covering and more-specific delegations. A live query for `140.78.0.0/16` returned `status: "ok"` and `data.rirs` containing a record with `rir: "RIPE NCC"` and `resource: "140.78.0.0/16"`. Display each applicable record with its own block and registry. Preserve partial rows without assigning missing values from the BGP match.
- Preserve Phase 17's direct HTTPS requests, one in flight per tab, timeout, cooldown, and no query persistence. Deduplicate enrichment using separate normalized ASN and prefix cache keys. The [API usage rules](https://stat.ripe.net/docs/data-api/ripestat-data-api#rules-of-usage) document eight concurrent requests per source IP and registration for regular usage above 1,000 requests per day.
- Extend the existing results component and native disclosures. No new tool route, UI dependency, or backend is needed. The enrichment endpoints' browser CORS behavior must be smoke-tested during execution.

## Validation Architecture

Use fixed production browser fixtures to gate timing, expansion, retry, cache reuse, race handling, and narrow layout. Unit-test provider envelopes, partial/empty values, shared scheduling, and cooldown. Opt into a single end-to-end RIPEstat smoke for the existing public worked example.
