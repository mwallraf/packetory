# Requirements: Packetory v1.5 BGP Looking Glass

## v1.5 Requirements

- [ ] **BGP-01**: Look up a public IPv4 or IPv6 address or CIDR prefix. An address can return a covering prefix. A CIDR lookup requires an exact match.
- [ ] **BGP-02**: Show the matched prefix, first and last addresses, all observed origin ASNs, collector count, and observation timestamp.
- [ ] **BGP-03**: Browse and copy AS paths by collector with repeated ASNs preserved. Expand peer observations to see the peer IP, next hop, and when the route last changed and was last confirmed.
- [ ] **BGP-04**: Show each origin ASN’s registered holder when available. Display route results while holder details load.
- [ ] **BGP-05**: Fetch address registration on demand. Show the regional registry and any available registered block separately from the announced prefix.
- [ ] **BGP-06**: Query RIPEstat directly from the browser. Start lookups on submit, allow one request in flight per tab, reuse recent duplicate results, and back off when rate-limited.
- [ ] **BGP-07**: Distinguish invalid input, no route observed, and a failed lookup. Explain that results reflect RIPE RIS observations and that the submitted query goes to RIPEstat.

## Traceability

Phase assignments are pending roadmap creation.
