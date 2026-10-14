# Feature Research

**Domain:** Network/infrastructure engineer utility tools (multi-tool site: UUID generator, IP subnet calculator, DNS lookup, MAC address inspector)
**Researched:** 2026-07-21
**Confidence:** MEDIUM (cross-checked across multiple competitor tools per category; no primary-source vendor docs needed since this is a competitive-landscape survey, not an API/library integration)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist across this tool category. Missing these makes a tool feel broken or amateur next to the incumbents.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Instant default result on page load (no button press) | uuidgenerator.net set the bar; users judge "modern" tools by whether they have to do anything before seeing output | LOW | Brief already requires this for all four tools — confirmed correct |
| One-click copy with visible confirmation | Universal across every competitor surveyed (macvendors.com, uuidgenerator.net, all DNS/subnet tools) | LOW | Brief requires per-field + copy-all — matches or exceeds market norm |
| Inline validation, no popups/alerts | Cluttered, alert-driven UX (subnet-calculator.com) is explicitly called out as the bad example to avoid | LOW–MEDIUM | Brief already requires this |
| CIDR auto-detect IPv4 vs IPv6 in one input | Modern subnet tools (cidrtools.net, strongdm CIDR calculator) treat this as baseline; older tools force separate fields per version | MEDIUM | Brief already scopes this correctly |
| Subnet calc: network, broadcast, first/last usable host, host count, subnet mask, wildcard mask, binary representation | Present in every subnet tool surveyed (subnet-calculator.com, cidr.tools, TunnelsUp, SubnetOnline, calculator.net) | LOW–MEDIUM | Brief's v1 IPv4 output list matches this almost field-for-field |
| Subnet calc: reverse DNS zone (in-addr.arpa / ip6.arpa) | Present in essentially every serious subnet tool as a "nice detail that saves a manual calc" | LOW | Brief includes this — correctly scoped as table stakes, not a differentiator |
| IPv6: compressed + expanded notation, first/last address, address count | Standard across dedicated IPv6 calculators (dnschecker.org IPv6 tool, coderstool, site24x7) | MEDIUM | Brief matches this |
| DNS lookup: A, AAAA, MX, TXT, NS, CNAME | This is the near-universal minimum record set across dnschecker.org, mxtoolbox, getzenquery, itoolverse, toolpage.dev | MEDIUM | Brief's v1 set matches the table-stakes minimum exactly |
| DNS lookup: per-record TTL | Present on every modern DNS tool surveyed as a base expectation | LOW | Brief already includes this |
| DNS lookup: NXDOMAIN / empty-result handling | Any tool without this looks broken on a bad query — universal expectation | LOW–MEDIUM | Brief already includes this |
| MAC lookup: accept any common separator format, normalize automatically | macvendors.com's headline UX feature — "send it in any shape and we handle it" | LOW | Brief already requires this |
| MAC lookup: vendor/organization from OUI | The entire reason macvendors.com and macvendorlookup.com exist; if this is wrong or missing the tool has no reason to exist | LOW–MEDIUM | Brief includes this — data-source decision correctly deferred to phase |
| UUID: v4 support, single or bulk generation | Universal across every UUID generator surveyed | LOW | Brief matches |
| UUID: copy / bulk copy / download | uuidgenerator.net's batch+download feature is treated as standard, not exceptional, by users who've used any modern generator | LOW | Brief matches |
| No login required, works standalone per tool with its own URL | Every competitor in this space (macvendors.com, uuidgenerator.net, cidrtools.net, networktools.dev) is login-free; a login wall in this category would be a hard bounce | LOW | Brief matches (explicitly out of scope) |

### Differentiators (Competitive Advantage)

Features that set the product apart from the incumbent field. Not required to be "complete," but where Packetory can genuinely stand out.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| MAC bit-level classification: locally vs. universally administered (U/L bit), unicast vs. multicast (I/G bit), randomized/private-MAC detection | macvendors.com and most vendor-lookup tools stop at "here's the vendor name." Dedicated bit-level classification is present only in more specialist tools (maclookup.app, macaddress.io) — not the market leader. This directly serves Packetory's stated target audience (network/infra engineers who need to know *why* a MAC won't resolve to a vendor, e.g. randomized Wi-Fi MACs) | MEDIUM | Brief's framing "more than a basic vendor lookup" is well-founded — this is a real, defensible differentiator, not scope creep |
| Consistent shared shell across all four tools (one nav, one visual language, instant tool switching) | Most competitor sites in this space are either single-purpose (macvendors.com, uuidgenerator.net) or multi-tool but cluttered/ad-heavy (subnet-calculator.com) or narrowly security-focused (networktools.dev). A clean, coherent, ad-free multi-tool suite is a gap in the market | MEDIUM | Architecture-level differentiator; registry pattern is the right foundation |
| Bookmarkable/shareable URL state (`?cidr=`, `?name=&type=`) for every tool | Present in some individual tools but not consistently applied as a site-wide principle; most competitor tools reset on reload | LOW–MEDIUM | Genuine differentiator when applied consistently across all four tools, not just one |
| Explicit UUID format controls: case, hyphens on/off, plain text/CSV/JSON output | uuidgenerator.net and most competitors offer bulk generation but not granular output-format controls in one unified UI; this is a step up, not table stakes | LOW | Correctly scoped as a differentiator, not required for MVP viability |
| DNS lookup: shows resolver used + whether fallback triggered, request cancellation via AbortController so stale results can't overwrite fresh ones | Competitor tools rarely surface "which resolver answered" or handle race conditions from fast retyping — most just show the latest fire-and-forget response | MEDIUM | Genuinely differentiating attention to correctness/UX polish that most incumbents skip |
| Zero third-party requests / fully local computation for UUID and Subnet Calculator | cidrtools.net is the only competitor found that explicitly markets "calculations happen locally in your browser" as a feature — most others quietly proxy through a server without saying so | LOW–MEDIUM | Real and provable differentiator once shipped; pairs well with the "no tracking / no accounts" positioning networktools.dev already uses for brand trust |
| Cookie-free, privacy-oriented analytics with sensitive-param redaction (MACs, internal hostnames, private IPs) | No competitor surveyed publishes this level of specificity about what they exclude from analytics; most either have heavy tracking or say nothing | LOW–MEDIUM | Trust/positioning differentiator more than a UI feature — reinforces "engineer built this for engineers" credibility |
| Keyboard-first global interaction model (`/` focus, `Enter` execute, `Esc` clear) across all tools | Not found as a consistent, advertised pattern on any competitor site surveyed — competitors are mouse/form-first | LOW–MEDIUM | Low-cost, high-signal differentiator for the target power-user audience |

### Anti-Features (Commonly Requested, Often Problematic)

Features competitors offer that look tempting but would work against Packetory's stated positioning, or that the brief already correctly excludes.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| DNS propagation checker (multi-geo, 20+ resolver locations with a world map) — dnschecker.org's signature feature | Looks impressive, well-known "flagship" DNS-tool feature | Requires a distributed backend / proxy infrastructure across many regions — heavy ops burden, real cost, and a scope explosion far beyond "single authoritative-ish lookup with primary+fallback resolver" the brief scopes | Ship the simple single/dual-resolver lookup in v1 (as scoped); revisit propagation-map as a distinct future tool only if traffic data justifies the infra cost |
| Full domain health check (SPF/DKIM/DMARC + nameserver consistency in one report) — dnschecker.org / mxtoolbox style | Sounds like a natural DNS-tool extension, "more value in one page" | Turns a fast single-purpose lookup into a slow multi-step audit tool; conflicts with "zero-effort, instant result" core value; also edges toward email-deliverability-consulting territory, a different audience | Keep DNS Lookup scoped to the confirmed record types; if SPF/DKIM validation is wanted later, make it its own dedicated tool (matches brief's "email and MX validation" future-roadmap item) |
| Port scanning / open-port checker (present on dnschecker.org, network-tools.webwiz.net, networktools.dev) | Common companion tool in this space, feels like an obvious addition | Explicitly flagged in the brief as abuse/liability risk requiring server-side probing of arbitrary hosts — correctly excluded already | Keep excluded; if ever revisited, restrict to self-service check-your-own-port workflows on tightly scoped infrastructure |
| MAC address *generator* (random MAC with vendor OUI, unicast/multicast toggle) — offered by miniwebtool, serverless.tools, routerhax alongside vendor lookup | Natural companion to a MAC inspector; low effort to add given the bit logic is already built for the inspector | Scope creep risk for v1: brief's MAC tool is explicitly a lookup/inspector, and generation is a different intent (testing/spoofing use cases) that could raise abuse-adjacent concerns and dilutes focus | Note as a candidate v1.x/v2 companion feature once inspector ships — cheap to add later since bit-manipulation logic is shared, but don't bundle into v1 scope |
| VLSM / full subnet-splitting planner — offered by advanced calculators (SubnetOnline advanced tools) | Power users searching "subnet calculator" sometimes want full allocation planning, not just single-CIDR breakdown | Materially larger UI/logic surface (multi-subnet allocation, waste minimization, supernetting) — brief already correctly defers this to v2 | Keep as documented v2 roadmap item; v1 single-CIDR breakdown is the right scope |
| Heavy multi-tool "kitchen sink" expansion (WHOIS, geolocation, ASN lookup, ping/traceroute) bundled into initial launch — pattern seen on coderstool.com, networkcheckr.com, webmandor.com | Competitors bundle 10-100+ tools; looks more complete/impressive at a glance | Directly contradicts the brief's phased build order and "network-first, not generic devtools sprawl" positioning; also several of these (ping/traceroute, WHOIS via arbitrary lookups) require server-side infrastructure and abuse-mitigation the brief defers | Ship the 4 confirmed v1 tools well; treat WHOIS/RDAP, HTTP header inspector, TLS inspector as the brief's own documented future-roadmap items, not v1 additions |
| Loud/aggressive monetization (popup ads, interstitials) — seen on subnet-calculator.com, explicitly called the bad example in the brief | Ad-supported competitors monetize this way and still get traffic | Directly named as the reason subnet-calculator.com is the "copy the concept, not the execution" example; conflicts with core "no-friction" value prop | Brief's reserved-but-unimplemented ad space approach is correct; do not reconsider for v1 |

## Feature Dependencies

```
Shared site shell + tool registry (tools/registry.ts)
    └──requires──> nothing (foundational, build first)

UUID Generator
    └──independent of external data/services (confirms brief's build-order rationale: ship first)

IP Subnet Calculator (IPv4 + IPv6)
    └──independent of external data/services (pure local computation)

DNS Lookup
    └──requires──> DNS-over-HTTPS resolver decision (primary + fallback)
    └──requires──> AbortController-based stale-request cancellation (correctness dependency, not sequencing)

MAC Address Inspector
    └──requires──> Vendor/OUI data source decision (API proxy vs. local dataset)
    └──bit-level classification (U/L, I/G, randomized-MAC)──is independent of the vendor-data decision
         (bit logic can ship even if vendor lookup degrades/fails — should degrade gracefully)

Bookmarkable URL state (?cidr=, ?name=&type=)
    └──enhances──> Subnet Calculator, DNS Lookup (each tool implements its own param schema)

Per-tool SEO (metadata, FAQ, examples)
    └──enhances──> every tool, but requires each tool's core UI to exist first

Privacy-safe analytics (redaction of MACs/private IPs/hostnames)
    └──requires──> awareness of each tool's own sensitive-param shape
         (MAC Inspector and DNS Lookup carry the highest-sensitivity params; redaction rules differ per tool)

MAC vendor-generator companion tool (anti-feature, deferred)
    └──would enhance──> MAC Address Inspector (shares bit-manipulation logic)
         but explicitly NOT bundled into v1

DNS propagation/multi-geo checker (anti-feature, deferred)
    └──conflicts with──> "zero third-party infra, local-first" architecture principle
         (requires distributed backend Packetory doesn't otherwise need)
```

### Dependency Notes

- **MAC bit-level classification does not require the vendor lookup to succeed.** The U/L, I/G, and randomized-MAC checks are pure local computation on the MAC's first octet — this should be implemented so it still works and displays useful output even if the vendor API/dataset is down, rate-limited, or the OUI is unknown. This is an important resilience property, not just a feature dependency.
- **Bookmarkable URL state enhances but does not gate the individual tools.** Each tool (Subnet, DNS) should work fully without URL params on first load (matching "zero-effort default") and then layer in URL-driven state as an enhancement — confirms the brief's phrasing "current state should be bookmarkable" rather than "requires URL params to function."
- **DNS Lookup's correctness features (AbortController cancellation, resolver-used display, fallback transparency) are a differentiator cluster that depends on nothing else in the roadmap** — they can and should be built alongside the base record-type support in the same phase, not deferred.
- **The MAC vendor-generator anti-feature would reuse MAC Inspector's bit logic if ever built** — worth noting in `lib/mac/` structure (keep bit-classification functions decoupled from lookup/normalization) so this option stays cheap later without being built now.
- **DNS propagation/health-check anti-features conflict with the "local-first, no third-party requests unless the result inherently requires network data" architecture constraint** — they require standing distributed infrastructure Packetory has no other reason to operate, which is why they're anti-features rather than deferred features.

## MVP Definition

### Launch With (v1)

Matches the brief's confirmed v1 scope — validated against the competitive landscape as correctly scoped, neither under- nor over-built.

- [ ] Shared site shell + tool registry — foundation every other tool depends on
- [ ] UUID Generator: v4 default + v7, single/batch 1-100, case/hyphen toggles, text/CSV/JSON, copy/copy-all/download — matches or exceeds uuidgenerator.net's feature set
- [ ] IP Subnet Calculator: CIDR auto-detect IPv4/IPv6, full breakdown per brief's field list, inline validation, bookmarkable URL — matches cidr.tools/cidrtools.net's table-stakes bar
- [ ] DNS Lookup: A/AAAA/MX/TXT/NS/CNAME via DoH primary+fallback, debounce/paste/Enter triggers, AbortController cancellation, TTL/resolver-used/duration display — matches table stakes and includes the correctness differentiator
- [ ] MAC Address Inspector: format normalization, vendor lookup, U/L + I/G + randomized-MAC detection — exceeds macvendors.com's table-stakes bar with a genuine differentiator
- [ ] Keyboard-first interaction model, accessible copy confirmations — differentiator not found consistently in the competitive set

### Add After Validation (v1.x)

- [ ] MAC address generator companion (random MAC + vendor/OUI + unicast/multicast/local toggles) — add once MAC Inspector's bit logic exists and traffic data shows demand; trigger: user requests via feedback channel or organic search demand signal
- [ ] Additional DNS record types (SOA, CAA, PTR, SRV) — trigger: user feedback or SEO data showing search demand for these record types specifically
- [ ] Locally maintained OUI dataset (replacing API proxy) — trigger: this is already the brief's stated longer-term direction for the MAC tool, not conditional on new demand

### Future Consideration (v2+)

- [ ] Full VLSM / subnet-splitting planner — defer until subnet calculator traffic validates demand for multi-subnet planning workflows; already flagged v2 in brief
- [ ] DNSSEC inspection / authoritative-path analysis — defer; niche audience within an already-niche DNS tool, adds real complexity (chain-of-trust validation)
- [ ] WHOIS/RDAP lookup, HTTP header inspector, TLS certificate inspector — defer to their own dedicated tool phases once the core four validate the shared-shell architecture; matches brief's future roadmap
- [ ] DNS propagation/multi-geo checker — defer indefinitely unless a specific business case justifies standing up distributed lookup infrastructure; conflicts with local-first principle
- [ ] Domain/mail health check (SPF/DKIM/DMARC audit) — defer; different audience/intent than a fast record lookup, better as its own tool
- [ ] Public developer API — already correctly sequenced in the brief as a post-traffic-validation milestone

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| UUID v4/v7 generation + batch + formats | HIGH | LOW | P1 |
| Subnet calculator IPv4 full breakdown | HIGH | MEDIUM | P1 |
| Subnet calculator IPv6 full breakdown | HIGH | MEDIUM | P1 |
| DNS lookup core record types (A/AAAA/MX/TXT/NS/CNAME) | HIGH | MEDIUM | P1 |
| DNS lookup correctness (AbortController, resolver transparency) | MEDIUM | LOW | P1 |
| MAC normalization + vendor lookup | HIGH | MEDIUM | P1 |
| MAC bit-level classification (U/L, I/G, randomized) | MEDIUM-HIGH | MEDIUM | P1 |
| Bookmarkable URL state (Subnet, DNS) | MEDIUM | LOW-MEDIUM | P1 |
| Keyboard-first interaction model | MEDIUM | LOW-MEDIUM | P1 |
| Per-tool SEO/FAQ/examples | MEDIUM | MEDIUM | P1 |
| Local dataset OUI lookup (replacing API proxy) | MEDIUM | MEDIUM-HIGH | P2 |
| MAC address generator companion | LOW-MEDIUM | LOW (reuses bit logic) | P3 |
| Additional DNS record types (SOA, CAA, PTR, SRV) | LOW-MEDIUM | LOW | P3 |
| Full VLSM / subnet-splitting planner | MEDIUM | HIGH | P3 |
| DNSSEC inspection | LOW | HIGH | P3 |
| DNS propagation/multi-geo checker | LOW (misaligned with positioning) | HIGH | P3/reject |
| Domain health check (SPF/DKIM/DMARC) | LOW (different audience) | HIGH | P3/reject |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | macvendors.com | uuidgenerator.net | cidr.tools / cidrtools.net | dnschecker.org / mxtoolbox | Our Approach |
|---------|-----------------|--------------------|-----------------------------|------------------------------|--------------|
| Zero-effort default result | N/A (requires input) | Yes — signature feature | Yes — pre-filled example | Partial — usually requires typing | Adopt everywhere: pre-filled example on all four tools |
| Bit-level / deep analysis | No (vendor name only) | N/A | N/A | Partial (DNSSEC status on some) | MAC Inspector goes deeper (U/L, I/G, randomized) — key differentiator |
| Bulk/batch operation | No | Yes (1-100+, download) | No (single CIDR at a time) | No | Match uuidgenerator.net's bulk UX for UUID; single-CIDR is correct scope for Subnet |
| Client-side/local computation | Unclear (API-based) | Unclear | Yes — explicitly marketed | No (server relay to DoH) | Subnet + UUID fully local; MAC + DNS use external data where inherently required — matches brief's local-first principle |
| Ad-free, no popups | Yes | Mostly (some ads) | Yes | No (mxtoolbox has ads/upsells) | Zero ads/popups in v1, reserved space only — clear differentiator |
| Multi-tool shared shell | No (single-purpose) | No (single-purpose) | Partial (small suite) | Yes (dnschecker.org "all tools") but cluttered | Clean shared shell across exactly 4 tools, no sprawl — differentiator |
| Propagation/multi-geo checking | No | N/A | No | Yes (dnschecker.org signature) | Deliberately excluded (anti-feature) — infra cost vs. positioning conflict |
| Privacy/no-tracking positioning | Implicit | No stated position | Implicit (client-side claim) | No | Explicit, redaction-documented privacy stance — differentiator, matches networktools.dev's positioning |

## Sources

- [Subnet Calculators - SubnetOnline.com](https://subnetonline.com/pages/subnet-calculators.php)
- [Online IP Subnet Calculator and CIDR Calculator - subnet-calculator.com](https://www.subnet-calculator.com/)
- [Subnet Calculator | TunnelsUP](https://www.tunnelsup.com/subnet-calculator/)
- [IP Subnet Calculator | IPTP Networks](https://www.iptp.net/iptp-tools/ip-calculator/)
- [CIDR Tools — Free Network & Subnet Calculator Suite (cidrtools.net)](https://cidrtools.net/)
- [CIDR Calculator: IPv4/IPv6 Subnet and IP Range Tool - StrongDM](https://www.strongdm.com/tools/ip-subnet-cidr-calculator)
- [IPv6 Subnet Calculator - dnschecker.org](https://dnschecker.org/ipv6-cidr-to-range.php)
- [IPv6 Subnet Calculator Tool - Site24x7](https://www.site24x7.com/tools/ipv6-subnetcalculator.html)
- [DNS Checker - DNS Check Propagation Tool](https://dnschecker.org/)
- [DNS Lookup - Check All DNS Records for Any Domain - dnschecker.org](https://dnschecker.org/all-dns-records-of-domain.php)
- [DNS Propagation Tool - MxToolbox](https://mxtoolbox.com/dnspropagation.aspx)
- [DNS Lookup Tool - MxToolbox](https://mxtoolbox.com/DNSLookup.aspx)
- [18 Best DNS Tools to Check Records, Health & Security - Geekflare](https://geekflare.com/guides/dns-lookup-checker-tools/)
- [DNS Lookup – GetZenQuery](https://www.getzenquery.com/tools/dns-lookup/)
- [DNS Lookup — A, AAAA, MX, TXT, NS Records - toolpage.dev](https://toolpage.dev/dns-lookup/)
- [DNS Lookup - A, MX, TXT, DNSSEC & SPF Checks - iToolVerse](https://www.itoolverse.com/web/dns-lookup)
- [API | The simplest MAC Vendor Lookup API - MACVendors.com](https://macvendors.com/api)
- [Home | MAC Vendor Lookup Tool & API - MACVendors.com](https://macvendors.com/)
- [MAC Address Lookup - MAC/OUI/IAB/IEEE Vendor Manufacturer Search](https://www.macvendorlookup.com/)
- [MAC address, OUI, IAB vendor API - macaddress.io](https://macaddress.io/api)
- [4 Best Mac Address Vendor Lookup Tools - OUI Lookup](https://ouilookup.com/post/4-best-mac-address-vendor-lookup-tools)
- [MAC Address Vendor Lookup - maclookup.app](https://maclookup.app/)
- [MAC Address Generator - miniwebtool](https://miniwebtool.com/mac-address-generator/)
- [MAC Address Generator — Random, Vendor OUI & Multicast - Serverless Tools](https://serverless.tools/mac-address-generator/)
- [Online UUID Generator Tool - uuidgenerator.net](https://www.uuidgenerator.net/)
- [Version 7 Online UUID Generator Tool - uuidgenerator.net](https://www.uuidgenerator.net/version7)
- [Developer's Corner - UUID Generator - uuidgenerator.net](https://www.uuidgenerator.net/dev-corner)
- [NetworkTools.dev – Privacy-First Network Utilities](https://networktools.dev/)
- [13 Free Network and DNS Tools - ServerWatch](https://www.serverwatch.com/networking/13-free-network-and-dns-tools/)
- [DNS & IP Tools, Developer & Webmaster Tools - dnschecker.org/all-tools](https://dnschecker.org/all-tools.php)
- [Free Network Tools — DNS, Email, SSL, IP & Website Diagnostics - Web Wiz](https://network-tools.webwiz.net/)
- [Network Tools: DNS,IP,MX,Email,NSLookup - Coder's Tool](https://www.coderstool.com/network-tools)
- [Free Network Tools — IP, DNS, Subnet & More - NetworkCheckr](https://networkcheckr.com/network-tools/)
- `project-brief.md` (repo root) — the source scope document validated against the above
- `.planning/PROJECT.md` — distilled active requirements cross-checked against competitive landscape

---
*Feature research for: Network/infrastructure engineer utility tools*
*Researched: 2026-07-21*
