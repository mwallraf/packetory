# Phase 4: DNS Lookup - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Users get fast, accurate, race-condition-free DNS answers across A/AAAA/MX/TXT/NS/CNAME record types via DNS-over-HTTPS, with transparent resolver attribution and clearly distinguished result/error states. This is the first tool page with an external async dependency — the first to need debouncing, request cancellation (`AbortController`), and multi-state error handling. It also introduces a second URL-state tool page (`?name=&type=`), following the pattern Phase 3 established for `?cidr=`.

</domain>

<decisions>
## Implementation Decisions

### Resolver choice & privacy posture
- **D-01:** Use Cloudflare (`cloudflare-dns.com/dns-query`) as primary resolver and Google (`dns.google/resolve`) as fallback, per `.planning/research/STACK.md`'s live-verified recommendation (both CORS-open, DoH JSON, no proxy needed). Quad9 was tested during research but its DoH JSON endpoint didn't respond — not usable without further investigation, so not pursued this phase.
- **D-02:** Add a plain-language note (FAQ and/or privacy notice) disclosing that lookups are sent to Cloudflare (primary) and Google (fallback) — honest disclosure given the project's Belgian/EU privacy-first positioning and project-brief.md §8.2's explicit sensitivity flag on domain names, even though the tool itself never stores or reports the domain.
- **D-03:** The `name` (domain) query param is **never** added to the analytics allow-list — same posture as Phase 3's `cidr` decision (D-01 in `03-CONTEXT.md`), directly required by project-brief.md §8.2 ("internal hostnames or domain names" is explicitly listed as sensitive). The `type` param (record type alone, e.g. "MX") is **also never** allow-listed — kept fully consistent with the domain's privacy treatment rather than carving out an exception for a minor product-analytics signal.

### Error/loading state design
- **D-04:** Each of the 5 required states (NXDOMAIN, empty-NOERROR, invalid input, rate-limited, resolver-unavailable) gets a distinct icon + short label + one-line plain-language explanation — not just color-coding or bare text. Matches the scannable, inline-validation style already established on the Subnet page.
- **D-05:** NXDOMAIN and empty-NOERROR messaging spells out the distinction explicitly rather than relying on terse phrasing the user has to infer from context — e.g. "No such domain — {domain} doesn't exist" vs. "No {TYPE} records — {domain} exists but has none of this type."
- **D-06:** Rate-limited and resolver-unavailable states include their own explicit "Try again" retry button in the error card itself, in addition to the page's general explicit refresh control (DNS-05) — no need to hunt for the general refresh action after an error.

### In-flight / debounce UX
- **D-07:** While a typed lookup is debouncing (600–800ms) or a request is in flight (any trigger — type, paste, Enter, refresh), the previous valid result stays visible at reduced opacity with a subtle loading indicator, rather than clearing or staying at full brightness with no feedback. Mirrors Subnet's "keep the last valid grid visible" pattern for its invalid-input state.
- **D-08:** On first page load — before the demo domain has resolved and no previous result exists yet — show a fixed-height skeleton placeholder (not blank space), so the result panel never causes layout shift once the first result lands. Same CLS-free-loading-state pattern as `SubnetToolLoader.tsx`/`UuidToolLoader.tsx`.

### Record-type selector & demo domain
- **D-09:** Record type (A/AAAA/MX/TXT/NS/CNAME) is selected via a segmented-control/tab row — all 6 types visible at once, single active selection, one click to switch. Reuses the toggle-group pattern already established for UUID's case/hyphen controls, rather than introducing a new dropdown pattern.
- **D-10:** The page preloads and resolves `cloudflare.com` on first visit (not `example.com`) — a real, stable domain with a rich record set across A/AAAA/MX/TXT/NS that better demonstrates the tool's range, and is thematically fitting since Cloudflare is also the primary DoH resolver (D-01).
- **D-11:** The default active record type on load is **A** — the most familiar/expected default for "look up a domain," not NS (which would showcase Cloudflare's own nameservers but is less intuitive to a first-time visitor).

### Claude's Discretion
None — all four discussed areas reached explicit user decisions (recommended option accepted every round).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project source of truth
- `project-brief.md` §5.3 — DNS Lookup v1 scope: debounce/paste/Enter/refresh behavior, supported record types, display fields, DNS-over-HTTPS primary+fallback requirement, bookmarkable URL state example (`/tools/dns?name=example.com&type=MX`), DNSSEC/authoritative-path analysis explicitly deferred to a later enhancement
- `project-brief.md` §8.2 — URL and analytics safety: "internal hostnames or domain names" explicitly listed as a sensitive query-param category — the direct basis for D-03
- `.planning/PROJECT.md` — distilled project context, requirements, constraints, key decisions, autonomy model
- `.planning/REQUIREMENTS.md` — DNS-01–10 and QUAL-08 are the locked v1 requirements this phase must satisfy
- `.planning/ROADMAP.md` Phase 4 section — goal, success criteria, dependency on Phase 3; explicitly frames this as "the first tool with an external async dependency"

### Resolver research (locks D-01)
- `.planning/research/STACK.md` — "DNS-over-HTTPS Resolver Strategy" section: live-`curl`-verified Cloudflare (`cloudflare-dns.com/dns-query`, `accept: application/dns-json` header) and Google (`dns.google/resolve`, no special header) endpoints, both CORS-open (`access-control-allow-origin: *`), same de-facto JSON shape (`Status`/`Answer[]`/`TTL`); documents Quad9's DoH JSON endpoint as untested/non-responding; notes DoH JSON has no formal RFC (only wireformat is RFC 8484-standardized) — schema-tolerant parsing recommended
- `CLAUDE.md` "What NOT to Use" table — explicitly prohibits Node-only DNS libraries (`dns.promises`, `dns2`) in client code; direct browser `fetch()` to the DoH JSON endpoints is the locked architecture (no proxy/API-route wrapper needed for CORS reasons)

### Prior-phase decisions this phase builds on
- `.planning/phases/01-shared-shell-registry/01-CONTEXT.md` — D-13 (analytics allow-list mechanism D-03 applies to; `lib/analytics/redact.ts`'s safe-by-default allow-list)
- `.planning/phases/02-uuid-generator/02-CONTEXT.md` — Server-shell/Client-island page split pattern; toggle-group UI pattern (D-09 reuses this) for UUID's case/hyphen controls; `lib/{tool}/` framework-agnostic core-logic pattern
- `.planning/phases/03-ip-subnet-calculator/03-CONTEXT.md` — D-01 (never allow-list the sensitive query param — direct precedent for this phase's D-03); URL-state via raw History API pattern (`window.history.replaceState`, never `router.replace()`) — the same mechanism this phase's `?name=&type=` state should reuse; "keep last valid result visible on invalid input" pattern — direct precedent for this phase's D-07

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/hooks/useCopyToClipboard.ts` — reuse for copying resolved record values/TTL.
- `lib/hooks/useKeyboardShortcut.ts` — reuse for `/` focus and `Enter`-resolves-immediately (DNS-03).
- `lib/analytics/redact.ts` + `DEFAULT_ALLOW_LIST` — the redaction mechanism D-03 explicitly decides NOT to extend for `name` or `type`.
- `tools/registry.ts` — the `dns` entry already exists with `status: "planned"`; this phase's job is to build the page and flip status to `"active"`.
- Server-shell + Client-island split (`app/tools/subnet/{page,SubnetToolLoader,SubnetTool}.tsx`) — direct template for `app/tools/dns/`, including its URL-state read/write functions (`getInitialCidrFromUrl`/`syncCidrToUrl` shape → adapt for `name`+`type`).
- UUID's toggle-group pattern (case/hyphens controls) — direct template for D-09's record-type segmented control.

### Established Patterns
- `lib/{tool}/` framework-agnostic, independently unit-testable core logic (`lib/uuid/`, `lib/subnet/`) — DNS response parsing/normalization (Cloudflare + Google → one shared shape) belongs in `lib/dns/` following the same shape.
- Client-only URL-state boundary: `page.tsx` never destructures `searchParams`; the client island reads/writes via `window.location.search`/`window.history.replaceState` to stay statically prerendered — same pattern this phase's `?name=&type=` state must follow.
- Registry-driven activation: flipping `tools/registry.ts`'s `dns.status` from `"planned"` to `"active"` is the only shared-file touch expected.
- "Keep last valid result visible, don't blank the UI" — established in Subnet for invalid-CIDR input; this phase extends the same principle to network-latency states (D-07).

### Integration Points
- `app/tools/dns/` is the new route (matching the established `/tools/{slug}` shape).
- `tools/registry.ts`'s `dns` entry status flip.
- **New territory, no existing precedent:** debounce implementation, `AbortController`-based request cancellation/race handling, and multi-resolver fallback logic — this phase establishes these patterns from scratch. No debounce utility or fetch-cancellation code exists anywhere in the codebase yet.
- `lib/analytics/redact.ts`'s `DEFAULT_ALLOW_LIST` is explicitly NOT touched by this phase (per D-03).

</code_context>

<specifics>
## Specific Ideas

- Demo domain: `cloudflare.com`, default type `A`, resolved automatically on first load.
- Error states each get their own icon + label + one-line explanation; NXDOMAIN and empty-NOERROR spell out their difference in plain language rather than relying on terse parallel phrasing.
- Rate-limited/resolver-unavailable errors carry their own inline "Try again" button.
- Loading feedback: dim + spinner over the last valid result during debounce/network wait (not a full clear); skeleton placeholder only for the very first, pre-any-result page load.
- Record-type UI: a 6-way segmented control/tab row (A/AAAA/MX/TXT/NS/CNAME), not a dropdown.
- Resolver privacy: ship Cloudflare+Google now, but disclose the resolver choice transparently in the FAQ/privacy notice.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (DNSSEC inspection and authoritative-path analysis remain explicitly out of scope per PROJECT.md and project-brief.md §5.3, unchanged by this discussion. A more privacy-focused resolver than Cloudflare/Google — e.g. properly verifying Quad9's actual DoH JSON endpoint — was considered and explicitly not pursued this phase per D-01; worth revisiting only if Cloudflare/Google reliability or privacy concerns become a real problem in production.)

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 4-DNS Lookup*
*Context gathered: 2026-07-24*
