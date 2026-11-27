# Roadmap: Packetory

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-07-25)
- ✅ **v1.1 Production Domain & Landing Page Polish** — Phases 6-7 (shipped 2026-07-25)
- ✅ **v1.2 Hash Generator** — Phases 8-9 (shipped 2026-10-17)
- ✅ **v1.3 Password Generator & Tool Page Polish** — Phases 10-14 (shipped 2026-11-12)
- ✅ **v1.4 Text Diff** — Phases 15–16 ([completed locally 2026-11-27](milestones/v1.4-ROADMAP.md))

- **v1.5 BGP Looking Glass** — Phases 17–18 (approved)

## Phases

- [x] Phase 17: BGP Route Lookup (completed 2026-11-27)
- [ ] Phase 18: ASN and Address Registration

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-07-25</summary>

- [x] Phase 1: Shared Shell + Registry (5/5 plans) — completed 2026-07-23
- [x] Phase 2: UUID Generator (4/4 plans) — completed 2026-07-24
- [x] Phase 3: IP Subnet Calculator (5/5 plans) — completed 2026-07-24
- [x] Phase 4: DNS Lookup (4/4 plans) — completed 2026-07-25
- [x] Phase 5: MAC Address Inspector (3/3 plans) — completed 2026-07-25

Full phase details archived at `.planning/milestones/v1.0-ROADMAP.md`.

</details>

<details>
<summary>✅ v1.1 Production Domain & Landing Page Polish (Phases 6-7) — SHIPPED 2026-07-25</summary>

- [x] Phase 6: Landing Page Card Navigation (2/2 plans) — completed 2026-07-25
- [x] Phase 7: Production Domain Cutover (packetory.dev) (1/1 plans) — completed 2026-07-25

Full phase details archived at `.planning/milestones/v1.1-ROADMAP.md`.

</details>

<details>
<summary>✅ v1.2 Hash Generator (Phases 8-9) — SHIPPED 2026-10-17</summary>

- [x] Phase 8: Hash Core & Worker Runtime (5/5 plans) — completed 2026-10-15
- [x] Phase 9: Hash Tool Page & Text Hashing (9/9 plans) — completed 2026-10-17

Phase 10 (File Hashing & Release Hardening) was removed 2026-10-17 by user decision; text-only is the intended scope. Full phase details archived at `.planning/milestones/v1.2-ROADMAP.md`.

</details>

<details>
<summary>✅ v1.3 Password Generator & Tool Page Polish (Phases 10-14) — SHIPPED 2026-11-12</summary>

- [x] Phase 10: Shared About Section & Config Parity (6/6 plans) — completed 2026-11-11
- [x] Phase 11: Subnet Calculator Compaction (1/1 plans) — completed 2026-11-12
- [x] Phase 12: Password Core Library (5/5 plans) — completed 2026-11-12
- [x] Phase 13: Password Generator Page (6/6 plans) — completed 2026-11-12
- [x] Phase 14: Passphrase, Strength & Launch (8/8 plans) — completed 2026-11-12

Full phase details archived at `.planning/milestones/v1.3-ROADMAP.md`.

</details>

## Phase Details

### Phase 17: BGP Route Lookup

**Goal:** Answer who is announcing a public prefix and which paths RIPE RIS observes.

**Requirements:** BGP-01, BGP-02, BGP-03, BGP-06, BGP-07

**Success Criteria** (what must be TRUE):
1. A submitted IPv4 or IPv6 address can show a covering prefix. A CIDR lookup only shows exact matches.
2. The summary shows the prefix, its address bounds, every observed origin ASN, the collector count, and the observation time.
3. Users can copy AS paths with repeated ASNs intact and expand peer details to see the peer IP, next hop, and route timestamps.
4. RIPEstat requests go directly from the browser. Lookups start on submit, requests run one at a time per tab, duplicate results can be reused, and rate limits trigger a cooldown.
5. The page distinguishes invalid input, no route observed, and lookup failure. It identifies RIPE RIS as the observation source and RIPEstat as the recipient of the query.

**Plans:** 1/1 plans complete
- [x] 17-01-PLAN.md — BGP route lookup, request controls, and collector UI

### Phase 18: ASN and Address Registration

**Goal:** Let users identify the ASN holder and see how the address space is registered.

**Depends on:** Phase 17

**Requirements:** BGP-04, BGP-05

**Success Criteria** (what must be TRUE):
1. The route result is immediately usable when the route request completes. Registered holder names appear for each origin ASN when available.
2. Opening address registration fetches the registry details on demand and presents the registered block separately from the announced prefix.

**Plans:** 1 plan
- [ ] 18-01-PLAN.md — ASN holder enrichment and on-demand address registration

## Progress

| Phase | Requirements | Status |
|---|---|---|
| 17. BGP Route Lookup | BGP-01, BGP-02, BGP-03, BGP-06, BGP-07 | Complete    |
| 18. ASN and Address Registration | BGP-04, BGP-05 | Planned |
