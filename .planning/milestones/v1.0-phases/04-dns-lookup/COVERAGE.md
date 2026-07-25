# Phase 4 — API Coverage Matrix

**Detected:** `api-coverage` scan returned `detected: true` (signals: "the DoH **JSON** API", browser-native async fetch surface).

**External API surface:** the two locked DNS-over-HTTPS **JSON** endpoints — Cloudflare primary
(`https://cloudflare-dns.com/dns-query`, `Accept: application/dns-json`) and Google fallback
(`https://dns.google/resolve`). Both share the `Status`/`Question`/`Answer[]` JSON shape. This is a
small, fixed capability surface; full coverage is the default and most rows INTEGRATE because the phase
requirements (DNS-06) already enumerate the complete v1 record-type list.

Parser note: this table is the strict 3-column `| capability | decision | reason |` form the
`api-coverage.verify-pre` gate expects (a 4-column form silently miscounts every row — see 01-COVERAGE
lesson in STATE.md).

| capability | decision | reason |
|---|---|---|
| resolve A record (type 1) | INTEGRATE | DNS-06 required record type; default demo type (D-11) |
| resolve AAAA record (type 28) | INTEGRATE | DNS-06 required record type |
| resolve MX record (type 15) | INTEGRATE | DNS-06 required record type |
| resolve TXT record (type 16) | INTEGRATE | DNS-06 required record type; quote-stripping normalization required |
| resolve NS record (type 2) | INTEGRATE | DNS-06 required record type |
| resolve CNAME record (type 5) | INTEGRATE | DNS-06 required record type; also filtered out of interleaved A responses |
| Cloudflare primary resolver | INTEGRATE | D-01 locked primary resolver |
| Google fallback resolver | INTEGRATE | D-01/DNS-09 locked explicit fallback |
| NXDOMAIN (Status 3) handling | INTEGRATE | DNS-08 distinct state |
| empty-NOERROR (Status 0, empty Answer) handling | INTEGRATE | DNS-08 distinct state |
| SERVFAIL (Status 2) handling | INTEGRATE | Treated as genuine failure → triggers fallback (RESEARCH A1, resolved) |
| HTTP 429 rate-limit handling | INTEGRATE | QUAL-08 rate-limited state |
| resolver-unavailable (network error / non-2xx / timeout) handling | INTEGRATE | QUAL-08 resolver-unavailable state |
| resolve SOA / CAA / PTR / SRV record types | OPT-OUT | deferred to DNS-V2-01 (v2 additional record types) — not in v1 scope |
| DNSSEC validation flags (`do` / `cd` query params) | OPT-OUT | explicitly out of scope per project-brief §5.3 / DNS-V2-02 |
| reverse / PTR name lookup | OPT-OUT | deferred to DNS-V2-01; not a v1 requirement |
| DoH wireformat (RFC 8484 binary) API | OPT-OUT | CLAUDE.md locks the JSON API; a binary DNS codec has no other use in this project |
| custom / user-supplied resolver URL | OPT-OUT | not in scope; hardcoded resolver URLs are the SSRF mitigation (T-04-04) |
| resolver EDNS client-subnet (`edns_client_subnet`) param | OPT-OUT | not needed; would leak more locality than the privacy posture (D-02/D-03) permits |
