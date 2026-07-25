# Phase 5: MAC Address Inspector - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 5-MAC Address Inspector
**Areas discussed:** Vendor data source, Input formats & normalization, Classification display & hedging, Vendor-lookup failure UX

---

## Vendor data source

| Option | Description | Selected |
|--------|-------------|----------|
| API proxy now | Ship `/api/mac-vendor` calling a free public MAC-vendor API as an interim measure, sanctioned by CLAUDE.md/brief §5.4. Fastest to ship; tracked as tech debt to replace with local dataset. | ✓ |
| Build-time OUI dataset now | Write the CI script now to compact IEEE's oui.csv into a client-bundled lookup table — the long-term architecture, but more work this phase. | |
| You decide | Let Claude pick based on what's fastest to ship correctly. | |

**User's choice:** API proxy now

---

| Option | Description | Selected |
|--------|-------------|----------|
| maclookup.app | api.maclookup.app/v2/macs/{mac} — free, no API key for reasonable limits, JSON response. | ✓ |
| macvendors.com | api.macvendors.com/{mac} — free tier, 1 req/sec unauthenticated, plain-text response. | |
| You decide | Let Claude pick after live-verifying availability/CORS/rate-limits. | |

**User's choice:** maclookup.app (Claude to live-verify during research; macvendors.com as documented fallback)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Debounce + client cache | Debounce ~400-600ms, cache OUI→vendor results in-memory for the session. | ✓ |
| Debounce only, no cache | Debounce each lookup but always hit the API fresh. | |
| You decide | Let Claude choose based on simplicity given existing DNS pattern. | |

**User's choice:** Debounce + client cache
**Notes:** User confirmed "Next area" after this round — no further vendor-data questions.

---

## Input formats & normalization

| Option | Description | Selected |
|--------|-------------|----------|
| All common formats | Colon, dash, dot/Cisco, no-separator — all accepted and auto-detected. | ✓ |
| Colon + dash only | Skip dot/Cisco and bare hex as an initial simplification. | |
| You decide | Let Claude decide based on what's easy to parse robustly. | |

**User's choice:** All common formats

---

| Option | Description | Selected |
|--------|-------------|----------|
| Colon+dash+dot+bare, upper | Show all 4 separator variants simultaneously, uppercase, each individually copyable. | ✓ |
| Colon + dash only, upper | Show just the two most common variants. | |
| You decide | Let Claude pick based on conventions of other similar tools. | |

**User's choice:** Colon+dash+dot+bare, upper

---

| Option | Description | Selected |
|--------|-------------|----------|
| Demo MAC pre-filled | Preload a real, recognizable vendor MAC so the full result is visible immediately on load. | ✓ |
| Empty input, placeholder text only | Start blank with a placeholder example; no result until typed. | |

**User's choice:** Demo MAC pre-filled

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep last valid result visible | Same "keep last valid visible" pattern from Subnet/DNS — dim/mark stale during partial edit. | ✓ |
| Clear result during partial input | Blank the result panel while input is incomplete/invalid. | |

**User's choice:** Keep last valid result visible
**Notes:** User confirmed "Next area" after this round.

---

## Classification display & hedging

| Option | Description | Selected |
|--------|-------------|----------|
| Labeled badges | Small badge/pill per attribute with a short explanation — matches DNS's icon+label+explanation pattern. | ✓ |
| Plain text list | Simple text rows, no badges. | |
| You decide | Let Claude pick for visual consistency. | |

**User's choice:** Labeled badges

---

| Option | Description | Selected |
|--------|-------------|----------|
| "Likely randomized" | Badge reads "Likely randomized (privacy MAC)" with explanation about the locally-administered bit and OS randomization. | ✓ |
| "Possibly randomized" | Softer hedge wording. | |
| You decide | Let Claude pick precise wording during planning/implementation. | |

**User's choice:** "Likely randomized" (privacy MAC)

---

| Option | Description | Selected |
|--------|-------------|----------|
| U/L bit alone | Locally-administered bit set = flag as "likely randomized". Simple, well-understood heuristic. | ✓ |
| U/L bit + known randomization OUI ranges | Also check vendor-published randomization prefixes for a stronger signal — more complex, second data source. | |

**User's choice:** U/L bit alone
**Notes:** User confirmed "Next area" after this round.

---

## Vendor-lookup failure UX

| Option | Description | Selected |
|--------|-------------|----------|
| "Vendor lookup unavailable" | Neutral inline note in place of vendor name; rest of result panel unaffected. | ✓ |
| Hide the vendor field entirely | Omit the vendor row/section entirely when lookup fails. | |

**User's choice:** "Vendor lookup unavailable"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Skip lookup, show explanatory note | Don't call the vendor API for locally-administered MACs; show "not applicable (randomized address)". | ✓ |
| Still attempt lookup | Call the API regardless and show whatever comes back. | |

**User's choice:** Skip lookup, show explanatory note
**Notes:** User confirmed "Next area" (wrap up) after this round, then confirmed ready for context.

---

## Claude's Discretion

None — all four discussed areas reached explicit user decisions. The one item requiring Claude follow-through: D-02's exact vendor-API provider (maclookup.app) must be live-verified during research before being locked into planning; macvendors.com is the documented fallback if it proves unusable.

## Deferred Ideas

None — discussion stayed within phase scope. MAC-V2-01 (MAC generator) and MAC-V2-02 (local OUI dataset migration) remain out of scope per REQUIREMENTS.md, unchanged by this discussion.
