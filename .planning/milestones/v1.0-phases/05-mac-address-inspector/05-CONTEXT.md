# Phase 5: MAC Address Inspector - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users get instant, accurate MAC address normalization, vendor identification, and hedged bit-level classification for any common MAC format, entirely as they type. This is the first tool to prove the API-route/core-logic separation ahead of a future public API — the vendor lookup is the first feature in the project to go through a Next.js API route (`/api/mac-vendor`) rather than a pure client-side computation or a directly browser-called external endpoint (unlike DNS's direct DoH `fetch()`).

</domain>

<decisions>
## Implementation Decisions

### Vendor data source (open decision from PROJECT.md, resolved this phase)
- **D-01:** Ship a `/api/mac-vendor` route calling a free public MAC-vendor API as the v1 interim measure — explicitly sanctioned by `project-brief.md` §5.4 and `CLAUDE.md`'s "MAC/OUI Vendor Data" table. This is **not** the permanent architecture; the long-term direction (build-time IEEE OUI compaction) is tracked as `MAC-V2-02` in REQUIREMENTS.md and stays deferred, not built this phase.
- **D-02:** Use `maclookup.app` (`api.maclookup.app/v2/macs/{mac}`) as the vendor API called by the proxy route. Live-verify CORS/rate-limit/response-shape behavior during research before locking implementation details — `CLAUDE.md`'s STACK.md doesn't cover this specific provider yet, so the researcher should confirm it's actually usable (reachable server-side, reasonable free-tier limits) before planning finalizes it. If it turns out unusable, fall back to `macvendors.com` per the user's second-choice option.
- **D-03:** Debounce vendor lookups (~400–600ms after a syntactically valid MAC/OUI is present) and cache OUI→vendor results in-memory client-side for the session, so re-editing the host portion of a MAC doesn't re-hit the API for an OUI already looked up. Faster debounce than DNS's 600–800ms since the payload/round-trip is smaller and the input is more constrained (fixed-length hex).

### Input formats & normalization
- **D-04:** Accept all common separator formats while typing, auto-detected: colon (`00:1A:2B:3C:4D:5E`), dash (`00-1A-2B-3C-4D-5E`), dot/Cisco (`001A.2B3C.4D5E`), and no separator (`001A2B3C4D5E`). Matches the permissive auto-detected input parsing already established for CIDR (Subnet) and domain (DNS).
- **D-05:** Display all 4 normalized format variants simultaneously in the result — colon, dash, dot/Cisco, and no-separator — all uppercase hex, each individually copyable via its own copy button (MAC-09). Covers the common consumers of a MAC address (Wireshark/most tools use colon, Cisco IOS uses dot, Windows/some tools use dash, raw/no-separator for programmatic use).
- **D-06:** On first page load (zero-effort default per CLAUDE.md's UX non-negotiables), pre-fill a real, recognizable demo MAC address (a known vendor OUI, e.g. an Apple or Cisco range) so the full result — all 4 formats + vendor + OUI + U/L + I/G + randomization flag — is visible immediately, without requiring the user to type first. Same "instant result on load" pattern as UUID/Subnet/DNS.
- **D-07:** While the user is mid-edit with a syntactically incomplete/invalid MAC (e.g. `00:1A`), keep the last valid result visible (dimmed/marked stale) rather than blanking the panel — same "keep last valid visible" pattern established in Subnet (invalid CIDR) and DNS (in-flight/error states). Snap to the new result once a full valid MAC is typed.

### Classification display & hedging
- **D-08:** Present U/L (locally/universally administered) and I/G (unicast/multicast) as labeled badges/pills, each with a short one-line plain-language explanation (e.g. "Universally Administered — assigned by the IEEE to a specific vendor"). Matches the icon+label+explanation pattern established for DNS's 5 error states — scannable, not just color-coded.
- **D-09:** Exact hedge wording for likely-randomized/private addressing (MAC-07 requires a hedge, never a certainty claim): badge/label reads **"Likely randomized (privacy MAC)"**, with explanation: *"This address has the locally-administered bit set, a pattern used by iOS/Android/Windows MAC randomization — it may not reflect the device's real hardware vendor."*
- **D-10:** The randomization flag is triggered by the U/L bit alone (locally-administered bit set → flag as "likely randomized"). No secondary heuristic (e.g. matching known vendor-published randomization OUI ranges) — keeps detection simple, well-understood, and consistent with MAC-07's own "likely" (not certain) wording. This is the standard, well-documented heuristic (the exact bit OS vendors set for MAC randomization).

### Vendor-lookup failure UX (MAC-08)
- **D-11:** When the vendor API fails or is unavailable, show a neutral inline note in place of the vendor name/badge — e.g. "Vendor: lookup unavailable" — not an error banner. The rest of the result panel (all 4 formats, OUI prefix, U/L, I/G, randomization flag) displays normally and is unaffected, per MAC-08's requirement that bit-level classification still works and shows useful output when vendor lookup fails.
- **D-12:** For MACs already flagged as locally-administered/likely-randomized (D-09/D-10), skip the vendor API call entirely — the OUI portion is not a meaningful vendor identifier for those addresses. Show "Vendor: not applicable (randomized address)" instead. Saves an unnecessary API call and avoids surfacing a coincidental/misleading vendor match for a non-hardware OUI.

### Claude's Discretion
None — all four discussed areas reached explicit user decisions (recommended option accepted every round, with D-02's exact provider choice subject to live verification during research per its own note).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project source of truth
- `project-brief.md` §5.4 — MAC Address Inspector v1 scope: accepted formats, normalized variants, vendor/org lookup, OUI/U-L/I-G/randomization identification, copy behavior, explicit interim `/api/mac-vendor` route sanctioned with the long-term local-OUI-dataset direction stated, and the "analytics must not capture full MAC addresses" privacy constraint (direct basis for D-11/D-12/MAC-10)
- `project-brief.md` §6 — Global interaction model: `/` focus, `Enter` execute, `Esc` clear, `Ctrl/Cmd+C` copy, visible copy confirmation + accessible announcement, CLS-free async states — applies to this tool like every other
- `.planning/PROJECT.md` — distilled project context; explicitly flags "MAC vendor data source" as an open decision deferred to this phase (now resolved via D-01/D-02); also documents the Phase 4 race-condition lesson ("audit ALL paths into the async lookup, not just the ones exercised by the first test") — directly relevant to this phase's debounced vendor-lookup async logic
- `.planning/REQUIREMENTS.md` — MAC-01 through MAC-10 are the locked v1 requirements this phase must satisfy; MAC-V2-01 (MAC generator) and MAC-V2-02 (local OUI dataset migration) are explicitly out of scope for this phase, tracked as v2 backlog
- `.planning/ROADMAP.md` Phase 5 section — goal, 5 success criteria, dependency on Phase 4

### Vendor API research (locks D-01/D-02)
- `CLAUDE.md` "MAC/OUI Vendor Data" section — build-time OUI compaction is the recommended long-term approach (IEEE `oui.csv`, weekly scheduled rebuild); `mac-oui-lookup`/`oui-data` npm packages explicitly rejected as direct client dependencies (1.2–4MB bundle cost); external API proxy explicitly sanctioned as launch-only interim measure per brief §5.4, with a tracked follow-up requirement to replace it — do not let this become permanent architecture
- **Research must live-verify `maclookup.app`** (`api.maclookup.app/v2/macs/{mac}`) before planning locks it in: confirm the endpoint is reachable from a server-side Next.js API route, actual response shape, rate limits, and whether an API key is required for reasonable usage. If unusable, fall back to `macvendors.com` (`api.macvendors.com/{mac}`, plain-text response, 1 req/sec unauthenticated) per the user's stated second choice.

### Prior-phase decisions this phase builds on
- `.planning/phases/01-shared-shell-registry/01-CONTEXT.md` — analytics allow-list mechanism (`lib/analytics/redact.ts`'s safe-by-default allow-list) that D-11's "never send full MAC to analytics" constraint (MAC-10) must NOT extend to include the MAC input/result
- `.planning/phases/02-uuid-generator/02-CONTEXT.md` — Server-shell/Client-island page split pattern; toggle-group/badge UI patterns; `lib/{tool}/` framework-agnostic core-logic pattern this phase's `lib/mac/` must follow
- `.planning/phases/03-ip-subnet-calculator/03-CONTEXT.md` — URL-state via raw History API pattern (`window.history.replaceState`, never `router.replace()`); "keep last valid result visible on invalid/partial input" pattern — direct precedent for D-07
- `.planning/phases/04-dns-lookup/04-CONTEXT.md` — debounce + `AbortController`/sequence-token cancellation pattern for async lookups (first established here, reused for this phase's vendor lookup per D-03); icon+label+one-line-explanation pattern for state badges — direct precedent for D-08; "audit ALL paths into the async lookup function" lesson from the Phase 4 gap-closure round (CR-01) — applies directly to this phase's debounced/cached vendor-lookup logic, which has more entry paths (typing, format switch, page load with demo MAC) than DNS did

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/hooks/useCopyToClipboard.ts` — reuse for copying each of the 4 format variants + OUI + full result.
- `lib/hooks/useKeyboardShortcut.ts` — reuse for `/` focus and `Enter`/`Esc` behavior.
- `lib/analytics/redact.ts` + `DEFAULT_ALLOW_LIST` — the redaction mechanism this phase must NOT extend to include the MAC input/result query param, consistent with D-03/D-01 in prior CONTEXT.md files for CIDR and domain.
- `tools/registry.ts` — the `mac` entry already exists (`app/tools/mac` not yet built), currently `status: "planned"`, `keywords: ["mac", "oui", "vendor", "ethernet"]`, `icon: "Cpu"`; this phase's job is to build the page and flip status to `"active"`.
- Server-shell + Client-island split (`app/tools/dns/{page,DnsToolLoader,DnsTool}.tsx` or Subnet's equivalent) — direct template for `app/tools/mac/`.
- DNS's debounce + `AbortController` + sequence-token cancellation implementation — direct template for this phase's vendor-lookup async logic (D-03), including the "cancel on every state-superseding path" lesson.

### Established Patterns
- `lib/{tool}/` framework-agnostic, independently unit-testable core logic (`lib/uuid/`, `lib/subnet/`, `lib/dns/`) — this phase adds `lib/mac/` (parsing/normalization/formatting/bit-classification), kept separate from the `/api/mac-vendor` route which is the first genuinely server-side piece any tool has needed.
- Client-only URL-state boundary (page.tsx never destructures searchParams) — reusable if this phase adds bookmarkable `?mac=` state (not yet decided — a planning-level detail, not raised as a gray area since prior phases established the mechanism).
- Registry-driven activation: flipping `tools/registry.ts`'s `mac.status` from `"planned"` to `"active"` is the only shared-file touch expected.
- "Keep last valid result visible, don't blank the UI" — established in Subnet/DNS, extended here to partial MAC input (D-07).

### Integration Points
- `app/tools/mac/` is the new route (matching the established `/tools/{slug}` shape).
- `app/api/mac-vendor/` is new territory — **the first API route in the codebase**. No existing precedent for a Next.js Route Handler in this project; this phase establishes that pattern from scratch (request validation, upstream fetch to maclookup.app, response shaping, error handling for upstream failures).
- `tools/registry.ts`'s `mac` entry status flip.
- `lib/analytics/redact.ts`'s `DEFAULT_ALLOW_LIST` is explicitly NOT touched by this phase (MAC-10 / D-11's privacy constraint).

</code_context>

<specifics>
## Specific Ideas

- Vendor API: `maclookup.app` (`api.maclookup.app/v2/macs/{mac}`) as primary choice, `macvendors.com` as fallback if the former proves unusable during research.
- Demo MAC on first load: a real, recognizable vendor OUI (exact address to be picked during planning/implementation — e.g. a known Apple or Cisco range).
- 4 simultaneous output formats: colon, dash, dot/Cisco, no-separator — all uppercase, each individually copyable.
- Hedge wording locked: "Likely randomized (privacy MAC)" + explanatory one-liner about the locally-administered bit and OS-level MAC randomization.
- Vendor field states: normal (vendor name shown), "lookup unavailable" (API failure), "not applicable (randomized address)" (skipped because U/L bit set) — three distinct vendor-field states, not just success/failure.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Build-time OUI dataset migration (MAC-V2-02) and MAC generator companion tool (MAC-V2-01) remain explicitly v2/out-of-scope per REQUIREMENTS.md, unchanged by this discussion — the API-proxy-now decision (D-01) is consistent with, not a departure from, that existing plan.)

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 5-MAC Address Inspector*
*Context gathered: 2026-07-25*
