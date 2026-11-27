---
phase: 17-bgp-route-lookup
status: secured
threats_open: 0
---

# Phase 17 Security Review

| Threat | Evidence |
|---|---|
| T-17-01 | The client validates the RIPEstat envelope and bounds accepted response and row sizes. React renders upstream values as text. |
| T-17-02 | Lookup resources are parsed as IPs or CIDRs before transmission. The HTTPS destination is fixed, redirects are refused, and both credentials and referrer are omitted. Submitted values stay out of navigation, storage, and analytics. |
| T-17-03 | A shared browser client enforces a single outstanding lookup, with explicit submit, timeout, bounded reuse, and cooldown on 429. Unit and browser tests exercise duplicate submissions and recovery. |
