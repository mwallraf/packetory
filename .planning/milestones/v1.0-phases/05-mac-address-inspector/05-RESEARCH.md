# Phase 5: MAC Address Inspector - Research

**Researched:** 2026-07-25
**Domain:** Client-side MAC address parsing/normalization/bit-classification + first-ever server-side API-route proxy to an external vendor-lookup service
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Ship a `/api/mac-vendor` route calling a free public MAC-vendor API as the v1 interim measure — explicitly sanctioned by `project-brief.md` §5.4 and `CLAUDE.md`'s "MAC/OUI Vendor Data" table. This is **not** the permanent architecture; the long-term direction (build-time IEEE OUI compaction) is tracked as `MAC-V2-02` in REQUIREMENTS.md and stays deferred, not built this phase.
- **D-02:** Use `maclookup.app` (`api.maclookup.app/v2/macs/{mac}`) as the vendor API called by the proxy route. Live-verify CORS/rate-limit/response-shape behavior during research before locking implementation details. If it turns out unusable, fall back to `macvendors.com` per the user's second-choice option. **(Resolved this research pass — see "D-02 Verification Results" below: `maclookup.app` is usable, confirmed.)**
- **D-03:** Debounce vendor lookups (~400–600ms after a syntactically valid MAC/OUI is present) and cache OUI→vendor results in-memory client-side for the session, so re-editing the host portion of a MAC doesn't re-hit the API for an OUI already looked up. Faster debounce than DNS's 600–800ms since the payload/round-trip is smaller and the input is more constrained (fixed-length hex).
- **D-04:** Accept all common separator formats while typing, auto-detected: colon (`00:1A:2B:3C:4D:5E`), dash (`00-1A-2B-3C-4D-5E`), dot/Cisco (`001A.2B3C.4D5E`), and no separator (`001A2B3C4D5E`). Matches the permissive auto-detected input parsing already established for CIDR (Subnet) and domain (DNS).
- **D-05:** Display all 4 normalized format variants simultaneously in the result — colon, dash, dot/Cisco, and no-separator — all uppercase hex, each individually copyable via its own copy button (MAC-09).
- **D-06:** On first page load (zero-effort default), pre-fill a real, recognizable demo MAC address (a known vendor OUI, e.g. an Apple or Cisco range) so the full result — all 4 formats + vendor + OUI + U/L + I/G + randomization flag — is visible immediately.
- **D-07:** While the user is mid-edit with a syntactically incomplete/invalid MAC (e.g. `00:1A`), keep the last valid result visible (dimmed/marked stale) rather than blanking the panel — same "keep last valid visible" pattern established in Subnet (invalid CIDR) and DNS (in-flight/error states).
- **D-08:** Present U/L and I/G as labeled badges/pills, each with a short one-line plain-language explanation. Matches the icon+label+explanation pattern established for DNS's 5 error states.
- **D-09:** Exact hedge wording for likely-randomized/private addressing: badge/label reads **"Likely randomized (privacy MAC)"**, with explanation: *"This address has the locally-administered bit set, a pattern used by iOS/Android/Windows MAC randomization — it may not reflect the device's real hardware vendor."*
- **D-10:** The randomization flag is triggered by the U/L bit alone (locally-administered bit set → flag as "likely randomized"). No secondary heuristic. **(Verified this research pass — see "D-10 Verification Results" below.)**
- **D-11:** When the vendor API fails or is unavailable, show a neutral inline note in place of the vendor name/badge — e.g. "Vendor: lookup unavailable" — not an error banner. The rest of the result panel displays normally.
- **D-12:** For MACs already flagged as locally-administered/likely-randomized (D-09/D-10), skip the vendor API call entirely. Show "Vendor: not applicable (randomized address)" instead.

### Claude's Discretion

None — all four discussed areas reached explicit user decisions (recommended option accepted every round, with D-02's exact provider choice subject to live verification during research per its own note).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. Build-time OUI dataset migration (`MAC-V2-02`) and MAC generator companion tool (`MAC-V2-01`) remain explicitly v2/out-of-scope per REQUIREMENTS.md.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAC-01 | User input is normalized as they type across common MAC formats | "Architecture Patterns" Pattern 1 (strip-then-validate parsing); "Common Pitfalls" Pitfall 1 |
| MAC-02 | Normalized format variants are displayed | "Architecture Patterns" Pattern 1 (4-format formatter); Code Examples |
| MAC-03 | Vendor/organization is returned where known from OUI | `maclookup.app` live-verified response shape (D-02 Verification Results); Pattern 3 (API route) |
| MAC-04 | OUI prefix is identified and displayed | Pattern 2 (bit/OUI classification, framework-agnostic, computed independent of vendor lookup) |
| MAC-05 | Locally vs. universally administered addressing (U/L bit) is identified | D-10 Verification Results (live cross-checked against `maclookup.app`'s own independent implementation) |
| MAC-06 | Unicast vs. multicast addressing (I/G bit) is identified | D-10 Verification Results (multicast test vector) |
| MAC-07 | Likely randomized/private MAC addressing is flagged, hedged wording | D-09's locked copy; Pattern 2 |
| MAC-08 | Bit-level classification still works when vendor lookup fails | Pattern 3 (vendor state is a separate, independently-failing concern from Pattern 2's pure classification) |
| MAC-09 | User can copy individual fields or the complete result | Reuse `lib/hooks/useCopyToClipboard.ts` (existing asset, see "Code Context") |
| MAC-10 | Full MAC addresses are never captured in analytics | "Security Domain" + OUI-only proxy design (Pattern 3) — full MAC never leaves the browser at all |

</phase_requirements>

## Summary

This phase has two genuinely separate technical problems that must stay architecturally decoupled: (1) pure, framework-agnostic MAC address parsing/normalization/bit-math that can run entirely offline and must never depend on network availability (MAC-01, 02, 04, 05, 06, 07), and (2) a brand-new server-side API-route pattern (`/api/mac-vendor`) that proxies to a third-party vendor-lookup API — the first genuinely external-network-dependent server route in the codebase (`app/api/ip/route.ts` exists but reads only request headers, calling nothing external). MAC-08 exists specifically to force this separation: classification must be computed and rendered correctly even when the vendor call never completes.

**D-02 Verification Results:** `maclookup.app`'s `v2/macs/{mac}` endpoint was live-`curl`-verified today (2026-07-25) against 6 distinct inputs (a real Apple OUI, a real Taiwanese-vendor OUI, the broadcast address, a canonical locally-administered test address, an IPv4-multicast MAC, and a malformed string). It requires **no API key** for basic lookups, returns clean JSON for both found and not-found cases, returns a structured `400` + `errorCode` for malformed input, and its documented unauthenticated rate limit (10 req/sec, 25K req/6h) is far more than this tool's debounced+cached, human-paced traffic will ever need. It sets **no CORS header** (`access-control-allow-origin` absent from every response) — this would block a *direct browser* call, but is a complete non-issue for this phase's architecture, which calls it exclusively from the Next.js Route Handler (server-to-server, unaffected by CORS, which is a browser-enforced mechanism only). This confirms the researcher agrees with CONTEXT.md's own framing that CORS is not a hard blocker here. **Verdict: `maclookup.app` is usable and recommended as primary — no fallback to `macvendors.com` is needed**, though `macvendors.com` was also live-verified as a working (but far more rate-limit-fragile — a live test hit `429` on the *second* request within one second) plain-text-response fallback, confirming it remains viable as an emergency secondary if `maclookup.app` ever degrades in production.

**D-10 Verification Results:** The standard IEEE 802 MAC-48/EUI-48 first-octet bit convention — bit 0 (LSB) is the I/G (Individual/Group) bit distinguishing unicast (0) from multicast/broadcast (1), and bit 1 is the U/L (Universal/Local) bit distinguishing universally-administered (0, IEEE-assigned OUI) from locally-administered (1) — is well-documented (Wikipedia "MAC address", IEEE 802 standards, RFC drafts on MAC randomization). This research went further and **live cross-checked this exact heuristic against `maclookup.app`'s own independent `isRand` field**: `00:1A:2B:00:00:00` (U/L=0) → `isRand:false`; `02:00:00:00:00:00` (U/L=1, the canonical textbook locally-administered example) → `isRand:true`; `FF:FF:FF:FF:FF:FF` (U/L=1) → `isRand:true`; `01:00:5E:00:00:00` (IPv4-multicast MAC, I/G=1 but U/L=0) → `isRand:false`. This last vector is the important one: it confirms a third-party production system, independently, also drives its own randomization flag from the U/L bit alone — NOT the I/G bit — exactly matching D-10's locked heuristic. This is strong external corroboration, not just training-data recall.

**Primary recommendation:** Build `lib/mac/` as pure, dependency-free TypeScript (parse → classify → format), matching the `lib/dns/`/`lib/subnet/` framework-agnostic convention already established in this codebase. Build `/api/mac-vendor` as a single Route Handler that accepts only a 6-hex-character **OUI** (never a full MAC) as its query parameter, validates it server-side before ever touching the network, and proxies to `https://api.maclookup.app/v2/macs/{oui}` with a bounded timeout — mirroring `lib/dns/query.ts`'s existing timeout-composition pattern. No new npm dependencies are needed for this phase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| MAC input parsing/normalization (4 formats) | Browser / Client | — | Pure string manipulation, must work offline and instantly as-you-type; no reason to ever leave the browser |
| Bit-level classification (OUI extraction, U/L, I/G, randomization flag) | Browser / Client | — | Must "still work and show useful output even when vendor lookup fails" (MAC-08) — cannot depend on any network tier |
| Vendor/organization lookup | API / Backend | Browser / Client (cache) | `maclookup.app` sets no CORS header, so a direct browser call is not possible; also the architectural goal of this phase is explicitly to prove the API-route/core-logic separation (phase goal). Client owns the session-scoped OUI→result cache (D-03) |
| Copy-to-clipboard (per-field + full result) | Browser / Client | — | `navigator.clipboard` is browser-only; reuses existing `useCopyToClipboard` hook |
| Analytics redaction | Browser / Client (existing `beforeSend` middleware) | — | Already-shipped Phase 1 infrastructure (`PacketoryAnalytics.tsx`) strips all non-allow-listed query params from every reported page URL; this phase's only obligation is to never add `mac`/`oui` to `DEFAULT_ALLOW_LIST` |

## Standard Stack

### Core

No new runtime dependencies are required for this phase. MAC parsing, normalization, and bit-level classification are ~50-line, well-bounded string/number operations — this project's established convention (see `lib/subnet/`, which hand-rolled IPv4/IPv6 math with BigInt rather than adopting the `ip-address` package originally suggested in `CLAUDE.md`, and `lib/dns/`, which hand-rolled DoH JSON parsing) is to hand-write framework-agnostic `lib/{tool}/` logic rather than pull in a dependency for problems this small and this well-specified. Introducing a MAC-parsing npm package here would be inconsistent with that established pattern and unnecessary — see "Don't Hand-Roll" below for where a dependency-equivalent (external API) genuinely is warranted instead (the vendor dataset itself, not the parsing/bit-math).

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| *(none — no new packages)* | — | — | MAC-48 parsing/formatting/bit-math is simple, well-specified, and cheaper to hand-write than to vet/pin/maintain a dependency for, consistent with this codebase's existing `lib/subnet`/`lib/dns` precedent |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next` (Route Handlers, `NextRequest`/`NextResponse`) | 16.2.11 (already installed) | Server-side `/api/mac-vendor` proxy | Already the project's framework; `app/api/ip/route.ts` is the existing (simpler, no-upstream-fetch) precedent |
| `lib/hooks/useCopyToClipboard.ts` | existing (in-repo) | Per-field + full-result copy with visible confirmation | Reuse verbatim, one instance per copyable field, exactly as `DnsRecordRow`/Subnet's `CopyableField` already do |
| `lib/hooks/useKeyboardShortcut.ts` | existing (in-repo) | `/` focus, `Enter`/`Escape`/copy-chord | Reuse verbatim |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `lib/mac/` parsing | An npm MAC-parsing package (e.g. searched, no well-established/actively-maintained single-purpose "mac-address-parser" package with meaningful adoption was found) | None found worth adopting — the problem is small enough that hand-rolling has lower total cost than vetting+pinning+maintaining a third-party package, and the format-variant/bit-math requirements are fully custom to this project's exact 4-format-simultaneous-display design (D-05) anyway |
| `maclookup.app` as vendor API | `macvendors.com` (`api.macvendors.com/{mac}`, plain-text response) | Use only as an emergency fallback if `maclookup.app` degrades in production — live-tested today and its unauthenticated rate limit is dramatically stricter (hit `429` on a second request within 1 second in this research session, vs. `maclookup.app`'s 10 req/sec), and its response is unstructured plain text (just the company name, or a JSON error body on failure) rather than a rich, uniformly-JSON-shaped `{success, found, company, ...}` object |

**Installation:**
```bash
# No new packages required for this phase.
```

**Version verification:** N/A — no new packages recommended. Existing pinned versions (`next@16.2.11`, `react@19.2.8`, `typescript@6.0.3`) are unchanged by this phase.

## Package Legitimacy Audit

**Not applicable this phase** — no new external packages are installed. `lib/mac/` is hand-rolled (see "Standard Stack"); `app/api/mac-vendor/route.ts` calls an external HTTP API (`maclookup.app`) directly via the native `fetch`, which is not a package dependency and therefore outside the scope of the Package Legitimacy Gate (that gate governs npm/PyPI/crates registry packages, not third-party HTTP APIs). The third-party API itself was instead vetted via the live-verification protocol documented above and in "D-02 Verification Results."

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Browser (app/tools/mac/MacTool.tsx — client island)                  │
│                                                                        │
│  1. User types/pastes MAC (any of 4 separator styles)                 │
│         │                                                              │
│         ▼                                                              │
│  2. lib/mac/parse.ts                                                  │
│     strip non-hex chars → validate length==12 hex → total function,   │
│     never throws (mirrors lib/dns/validate.ts's contract)             │
│         │                                                              │
│         ├─── incomplete/invalid ──► keep last valid result dimmed     │
│         │                            (D-07), render inline note        │
│         ▼ (12 valid hex chars)                                        │
│  3. lib/mac/classify.ts  (PURE, offline, no network — MAC-08)         │
│     firstOctet = bytes[0]                                             │
│     I/G = firstOctet & 0x01   → unicast | multicast                   │
│     U/L = firstOctet & 0x02   → universal | locally-administered      │
│     randomizationLikely = (U/L === locally-administered)              │
│         │                                                              │
│         ▼                                                              │
│  4. lib/mac/format.ts                                                 │
│     produces 4 simultaneous variants: colon / dash / dot / none       │
│     (all uppercase, D-05)                                             │
│         │                                                              │
│         ├── randomizationLikely? ──► skip step 5 entirely (D-12)      │
│         │                            render "not applicable" vendor    │
│         ▼ (not randomized)                                             │
│  5. Debounced (400-600ms), AbortController+seq-token guarded fetch    │
│     to /api/mac-vendor?oui=<first-3-bytes-hex-only>                   │
│     — checks session in-memory OUI→result Map first (D-03)            │
│         │                                                              │
└─────────┼──────────────────────────────────────────────────────────┘
          │ (only the 6-hex-char OUI ever crosses this boundary —
          │  the host portion of the MAC NEVER leaves the browser)
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Vercel Server — app/api/mac-vendor/route.ts (Node.js runtime)         │
│                                                                        │
│  6. Validate `oui` param: exactly /^[0-9A-Fa-f]{6}$/, else 400         │
│     (never forward unsanitized input upstream — SSRF/injection gate)  │
│         │                                                              │
│         ▼                                                              │
│  7. fetch(`https://api.maclookup.app/v2/macs/${oui}`,                 │
│            { signal: AbortSignal.timeout(4000) })                     │
│         │                                                              │
│         ├── network error / non-2xx / timeout / malformed JSON        │
│         │        ──► classify as upstream failure (mirrors            │
│         │             lib/dns/resolve.ts's queryAndClassify pattern)  │
│         │                                                              │
│         ▼ (2xx + valid JSON)                                          │
│  8. Shape down to minimal safe payload:                               │
│     { found: boolean, company: string | null }                        │
│     (never pass through address/country — not needed by the UI)       │
│         │                                                              │
└─────────┼──────────────────────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│ https://api.maclookup.app/v2/macs/{oui}  (external, no API key)      │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
lib/mac/
├── parse.ts          # strip separators, validate hex length — total function, never throws
├── parse.test.ts
├── classify.ts        # OUI extraction + U/L (locally-administered) + I/G (unicast/multicast) + randomization-likely — pure, offline, no network (MAC-08)
├── classify.test.ts
├── format.ts           # produce all 4 simultaneous variants (colon/dash/dot/none), uppercase (D-05)
├── format.test.ts
├── types.ts             # discriminated-union MacLookupState + VendorState, mirrors lib/dns/types.ts convention
└── vendor.ts            # client-side fetch wrapper to /api/mac-vendor + session OUI→result cache (D-03)

app/api/mac-vendor/
├── route.ts             # GET handler: validate oui, proxy to maclookup.app, shape response
└── route.test.ts        # first Route Handler unit test in this codebase — see "Validation Architecture" Wave 0 Gaps

app/tools/mac/
├── page.tsx             # Server Component shell + metadata + worked example + FAQ (mirrors app/tools/dns/page.tsx)
├── MacToolLoader.tsx    # "use client" + next/dynamic(ssr:false) boundary (mirrors DnsToolLoader.tsx)
├── MacTool.tsx           # client island: input, debounce+cache orchestration, result panel, badges
├── MacTool.test.tsx
└── faq-data.ts           # FAQ items + worked-example constants (mirrors dns/faq-data.ts)
```

### Pattern 1: Strip-then-Validate Parsing (not per-format branching)
**What:** Rather than writing 4 separate parsers (one per separator style), strip every non-hex character from the raw input first, then validate that exactly 12 hex characters remain. The original separator positions are discarded entirely — they carry no information once the 12 hex digits are recovered, since Cisco's dot-grouping (4 hex digits per group) doesn't align to byte boundaries the way colon/dash grouping (2 hex digits per group) does, so per-format positional parsing would need special-cased logic for no benefit.
**When to use:** Always, for this input class — auto-detecting "which of the 4 formats is this" is unnecessary work; the only real question is "are there exactly 12 hex digits in here."
**Example:**
```typescript
// lib/mac/parse.ts — mirrors lib/dns/validate.ts's total-function,
// never-throws contract (same pattern this codebase already established).
const HEX_ONLY_RE = /[^0-9A-Fa-f]/g;

export type ParsedMac =
  | { valid: true; bytes: [number, number, number, number, number, number] }
  | { valid: false };

export function parseMacInput(raw: string): ParsedMac {
  const hex = raw.replace(HEX_ONLY_RE, "");
  if (hex.length !== 12) return { valid: false };

  const bytes = [] as number[];
  for (let i = 0; i < 12; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return { valid: true, bytes: bytes as ParsedMac extends { bytes: infer B } ? B : never };
}
```

### Pattern 2: Pure, Network-Independent Bit Classification
**What:** OUI extraction, U/L, I/G, and randomization-likely are all derivable from `bytes[0]` (and `bytes[0..2]` for the OUI) alone, with zero network dependency. This is the direct enabler of MAC-08 ("bit-level classification still works when vendor lookup fails") — it must be structurally impossible for this function to depend on `fetch` succeeding.
**When to use:** Always computed synchronously, immediately after a valid parse, before any vendor lookup is even scheduled.
**Example:**
```typescript
// lib/mac/classify.ts — verified live against maclookup.app's own
// independent isRand implementation (see "D-10 Verification Results"):
// 00:1A:2B:.. (U/L=0) -> false; 02:00:00:.. (U/L=1) -> true;
// FF:FF:FF:.. (U/L=1) -> true; 01:00:5E:.. (multicast, U/L=0) -> false
// (confirms the flag tracks U/L, not I/G).
export type MacClassification = {
  ouiHex: string; // first 3 bytes, uppercase, no separator, e.g. "3C22FB"
  isUnicast: boolean; // I/G bit (bit 0 of byte[0]) === 0
  isUniversallyAdministered: boolean; // U/L bit (bit 1 of byte[0]) === 0
  randomizationLikely: boolean; // === !isUniversallyAdministered (D-10)
};

export function classifyMac(bytes: readonly number[]): MacClassification {
  const first = bytes[0];
  const isUnicast = (first & 0x01) === 0;
  const isUniversallyAdministered = (first & 0x02) === 0;
  const ouiHex = bytes
    .slice(0, 3)
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join("");

  return {
    ouiHex,
    isUnicast,
    isUniversallyAdministered,
    randomizationLikely: !isUniversallyAdministered,
  };
}
```

### Pattern 3: OUI-Only Server Proxy (privacy-by-construction, not just by policy)
**What:** The client never sends the full MAC to `/api/mac-vendor` — only the 6-hex-character OUI (`classification.ouiHex`), which was live-verified today to be a fully sufficient input to `maclookup.app` (`GET /v2/macs/3C22FB` returns the identical result as the full padded MAC). This means MAC-10 ("full MAC addresses are never captured in analytics") is satisfied structurally, not just by the existing `DEFAULT_ALLOW_LIST` discipline — the host portion of the address is architecturally incapable of appearing in any server log, any upstream request, or any URL, because it's never transmitted anywhere past the browser.
**When to use:** Always — this is the recommended contract for the route's query parameter, not merely a defensive validation detail.
**Example:**
```typescript
// app/api/mac-vendor/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // per-request upstream call, never cached

const OUI_RE = /^[0-9A-Fa-f]{6}$/;
const UPSTREAM_TIMEOUT_MS = 4000;

export async function GET(request: NextRequest) {
  const oui = request.nextUrl.searchParams.get("oui");

  // Never forward unsanitized input upstream (SSRF/injection gate) — a
  // malformed or over-length value is a 400, not a best-effort pass-through.
  if (!oui || !OUI_RE.test(oui)) {
    return NextResponse.json(
      { error: "oui must be exactly 6 hex characters" },
      { status: 400 }
    );
  }

  let response: Response;
  try {
    response = await fetch(`https://api.maclookup.app/v2/macs/${oui}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    // Network error or timeout — classify as "unavailable" (D-11), never a 5xx crash.
    return NextResponse.json({ status: "unavailable" }, { status: 200 });
  }

  if (!response.ok) {
    return NextResponse.json({ status: "unavailable" }, { status: 200 });
  }

  type UpstreamShape = { success: boolean; found: boolean; company: string };
  let body: UpstreamShape;
  try {
    body = (await response.json()) as UpstreamShape;
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 200 });
  }

  if (!body.success) {
    return NextResponse.json({ status: "unavailable" }, { status: 200 });
  }

  // body.found === false is a LEGITIMATE negative answer (the OUI is
  // syntactically fine but not in the registry) — distinct from
  // "unavailable" (see Open Question 1 below). Never conflate the two.
  return NextResponse.json(
    { status: "ok", found: body.found, company: body.found ? body.company : null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
```

### Anti-Patterns to Avoid
- **Auto-reformatting the live input field as the user types:** None of this codebase's prior tools (UUID, Subnet, DNS) mask or auto-insert separators into a freeform text input while the user types — the raw controlled input is validated on change, and formatted output is rendered separately below. Auto-inserting colons/dashes into the input field itself while typing is a well-known UX foot-gun (cursor jumps, can't backspace a separator cleanly) and isn't requested by any locked decision (D-04 only requires the *parser* to auto-detect separator style, not that the input box reformats itself).
- **Deriving `randomizationLikely` (or U/L/I/G) from the vendor API's response fields:** `maclookup.app` happens to also expose its own `isRand`/`isPrivate` fields, but MAC-08 requires classification to work when the vendor call fails entirely — so `lib/mac/classify.ts` must never read from the vendor response. The two independent computations (this app's own bit math, vs. the vendor API's own bit math) agreeing during live verification is a confirmation signal, not a caller/callee relationship.
- **Treating `found:false` and an upstream failure as the same UI state:** They are semantically different ("this MAC's OUI genuinely isn't in the vendor registry" vs. "we couldn't ask the registry right now") and CONTEXT.md's specifics section only names 3 vendor-field states explicitly — see Open Question 1.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OUI-to-company-name dataset | A hand-maintained/scraped mapping of OUI prefixes to vendor names | `maclookup.app`'s hosted API (this phase) → later, the build-time IEEE `oui.csv` compaction already scoped as `MAC-V2-02` | The full IEEE registry is tens of thousands of entries and changes ~daily; correctly reflects `CLAUDE.md`'s own "MAC/OUI Vendor Data" guidance (build-time compaction is the *right* long-term architecture, but an external API is the *right* interim step per `project-brief.md` §5.4) |
| Bit-level MAC classification (U/L/I/G) | A generic "network utility" npm package pulled in just for this one calculation | Hand-rolled `lib/mac/classify.ts` (Pattern 2 above) | The entire algorithm is 2 bitwise-AND operations against a single byte — pulling in a dependency for this would be pure overhead, and no well-audited single-purpose package for exactly this exists worth vetting |

**Key insight:** The dividing line in this phase isn't "always hand-roll" vs. "always use a library" — it's "hand-roll anything that's pure math/string logic fully specified by a public standard (MAC-48 bit layout), and never hand-roll a large, frequently-changing external dataset (vendor names) that a purpose-built service already maintains better than this project could."

## Common Pitfalls

### Pitfall 1: Assuming separator position implies byte boundary
**What goes wrong:** Writing a per-format parser that assumes colon/dash always separate individual bytes (2 hex chars) breaks the moment it's reused for Cisco dot-notation, which groups 4 hex chars per segment (`001A.2B3C.4D5E` — segment boundaries don't align with byte boundaries at all).
**Why it happens:** It's tempting to branch on "which separator character is present" and then split on it, carrying over assumptions from the colon/dash case.
**How to avoid:** Strip all non-hex characters first (Pattern 1), then validate purely on total hex-digit count (must be exactly 12). Separator style is irrelevant to the underlying bytes.
**Warning signs:** A parser with 3+ separate code paths, one per separator style, each re-deriving the same 6 bytes.

### Pitfall 2: Coupling bit classification to vendor-lookup success/failure
**What goes wrong:** If `classify.ts` is only called inside the `.then()` of the vendor fetch, then MAC-08 breaks the instant the vendor API is slow/down/rate-limited — the OUI/U-L/I-G/randomization badges would incorrectly disappear along with the vendor name.
**Why it happens:** It's natural to compute "everything about this MAC" in one combined async flow, especially since D-12 also *conditionally* skips the vendor call based on a classification result.
**How to avoid:** Compute the full `MacClassification` synchronously, immediately after parsing succeeds, entirely before any vendor-lookup scheduling logic runs (Pattern 2/3's ordering in the System Architecture Diagram: step 3 happens before step 5, and step 5's *decision* to skip the fetch (D-12) depends on step 3's output — but step 3's own correctness never depends on step 5).
**Warning signs:** A single `async function inspectMac()` that `await`s the vendor fetch before setting any classification state.

### Pitfall 3: Conflating a genuine "not found" vendor answer with "lookup unavailable"
**What goes wrong:** `maclookup.app` returns HTTP `200` + `{success:true, found:false}` for a syntactically-valid, universally-administered OUI that simply isn't in its registry (live-verified today with `FF:FF:FF:FF:FF:FF`, though that specific address is also locally-administered so D-12 would skip it in practice — the *pattern* still applies to any genuinely-unassigned real OUI). This is a completely different situation from a network/timeout/5xx failure, but both currently collapse to the same `route.ts` "unavailable" shape suggested naively.
**Why it happens:** CONTEXT.md's specifics section names exactly 3 vendor-field states ("normal", "lookup unavailable", "not applicable — randomized"), which doesn't explicitly carve out a 4th "genuinely not found in registry" case.
**How to avoid:** Flagged explicitly as Open Question 1 below — the planner should decide whether "not found" folds into "normal" (rendered as e.g. "Vendor: unknown OUI") or needs its own 4th UI state, but it must NOT silently render the same copy as "lookup unavailable" (that would misrepresent a working API as broken).
**Warning signs:** A route/component that only has a boolean `success`/`error` split with no room for a legitimate negative data answer.

### Pitfall 4: ReDoS-shaped validation regex (imported habit from other tools, unnecessary here)
**What goes wrong:** `lib/dns/validate.ts` deliberately uses a bounded, non-backtracking regex because domain-label validation genuinely has nested-quantifier risk. Copy-pasting that level of regex defensiveness into MAC validation is harmless but unnecessary complexity — MAC validation has no nested quantifiers or variable-length repetition risk at all (it's a fixed strip + fixed-length check).
**Why it happens:** Pattern-matching the previous tool's defensive style without re-deriving whether the same risk actually applies.
**How to avoid:** `raw.replace(/[^0-9A-Fa-f]/g, "")` (a single global character-class replace, no backtracking possible) followed by a plain `.length === 12` check is already maximally safe — no need for a more elaborate bounded-quantifier regex.
**Warning signs:** A MAC regex with `{n,m}` quantifiers or alternation groups where a simple strip+length check would do.

## Code Examples

### Formatting all 4 simultaneous variants (D-05)
```typescript
// lib/mac/format.ts
export type MacFormats = {
  colon: string;   // "3C:22:FB:00:00:00"
  dash: string;    // "3C-22-FB-00-00-00"
  dot: string;     // "3C22.FB00.0000" (Cisco-style, 4-hex-digit groups)
  none: string;    // "3C22FB000000"
};

function toHexPairs(bytes: readonly number[]): string[] {
  return bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0"));
}

export function formatMac(bytes: readonly number[]): MacFormats {
  const pairs = toHexPairs(bytes);
  const flat = pairs.join("");
  return {
    colon: pairs.join(":"),
    dash: pairs.join("-"),
    dot: `${flat.slice(0, 4)}.${flat.slice(4, 8)}.${flat.slice(8, 12)}`,
    none: flat,
  };
}
```

### Client-side session OUI cache + debounce (D-03), mirroring `lib/dns/resolve.ts`'s race-safety contract
```typescript
// app/tools/mac/MacTool.tsx (sketch — full component wiring is a planning
// detail, not a research deliverable; this shows the cache-before-fetch
// shape only, reusing this codebase's established
// AbortController+sequence-token pattern from DnsTool.tsx)
const vendorCacheRef = useRef(new Map<string, VendorState>());

async function lookupVendor(ouiHex: string): Promise<VendorState> {
  const cached = vendorCacheRef.current.get(ouiHex);
  if (cached) return cached;

  const response = await fetch(`/api/mac-vendor?oui=${ouiHex}`, {
    signal: controller.signal, // same abort/seq-token discipline as DnsTool
  });
  const body = await response.json();
  const result: VendorState =
    body.status === "unavailable"
      ? { kind: "unavailable" }
      : body.found
        ? { kind: "found", company: body.company }
        : { kind: "not-found" }; // see Open Question 1

  vendorCacheRef.current.set(ouiHex, result);
  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Live external MAC-vendor API as a permanent architecture | Live external API as an explicit, tracked-for-replacement interim step, with build-time IEEE OUI compaction as the stated long-term direction | Already reflected in `CLAUDE.md`/`project-brief.md` — not a new finding this session | This phase should implement the interim cleanly (isolated in `/api/mac-vendor` + `lib/mac/vendor.ts`) so swapping to a local dataset later (`MAC-V2-02`) only touches those two files, never `lib/mac/classify.ts` or the UI |

**Deprecated/outdated:** Nothing domain-specific to flag — MAC-48/EUI-48 bit layout has been stable and unchanged since its IEEE definition; no recent spec changes affect this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `maclookup.app`'s documented rate-limit headers (`X-RateLimit-Limit`/`-Remaining`/`-Reset`, per their docs) were NOT observed in this session's live response headers, despite the docs describing them — the numeric limits (10 req/sec, 25K/6h) themselves come from the docs page, not from directly observing a rate-limited response in this session (a real `429` was never triggered against `maclookup.app`, only against `macvendors.com`) | Summary / D-02 Verification Results | Low — even if the exact numeric ceiling is somewhat different than documented, the debounced+cached, human-paced traffic this tool generates is orders of magnitude below any plausible free-tier ceiling; worth a defensive `429`-handling branch in the route regardless (already included in Pattern 3's `!response.ok` branch) |
| A2 | No actively-maintained, well-adopted single-purpose "MAC address parser/formatter" npm package exists worth adopting instead of hand-rolling | Standard Stack / Don't Hand-Roll | Low — even if one exists, this phase's exact requirement (4 simultaneous format variants displayed at once, D-05) is unusual enough that a generic package likely wouldn't remove much of the ~50 lines of code needed anyway |

**If this table is empty:** N/A — see rows above; both are low-risk/low-impact assumptions with defensive code already recommended regardless of the assumption's truth.

## Open Questions

1. **Does a "syntactically valid OUI, genuinely not in the vendor registry" (`success:true, found:false`) deserve its own 4th vendor-field UI state, or should it fold into the existing "normal" state with different copy (e.g. "Vendor: unknown")?**
   - What we know: `maclookup.app` returns this exact shape today for real, non-randomized OUIs it simply hasn't catalogued (confirmed live). CONTEXT.md's `<specifics>` section explicitly enumerates only 3 states: normal / lookup-unavailable / not-applicable-randomized.
   - What's unclear: Whether the user considered this 4th case during discussion and folded it into "normal" implicitly, or simply didn't encounter it while deciding.
   - Recommendation: Treat it as a variant of the "normal" (successful lookup) state — the request succeeded, the answer is just "no match" — with copy like "Vendor: not found in OUI registry," clearly distinct from "Vendor: lookup unavailable" (D-11's wording, reserved for genuine failures). This preserves D-11's intent (only genuine API failures get the neutral-failure copy) without inventing a state CONTEXT.md didn't ask for.

2. **Should `?mac=` (or `?oui=`) ever become bookmarkable URL state, matching Subnet's `?cidr=`/DNS's `?name=&type=` precedent?**
   - What we know: `05-CONTEXT.md`'s "Established Patterns" section explicitly flags this as "not yet decided — a planning-level detail." The existing `DEFAULT_ALLOW_LIST`/`redactBeforeSend` analytics-redaction mechanism (Phase 1, verified this session by reading `lib/analytics/PacketoryAnalytics.tsx`) already strips ANY non-allow-listed query param from every reported page-view URL automatically — so adding `?mac=` state would be safe-by-default for MAC-10 as long as `mac`/`oui` is never added to `DEFAULT_ALLOW_LIST`.
   - What's unclear: Whether the phase's success criteria require bookmarkability at all (the 5 stated success criteria don't mention a shareable URL, unlike Subnet/DNS's explicit `SUBNET-07`/`DNS-10` requirements — there is no equivalent `MAC-11`).
   - Recommendation: Since no requirement mandates it, treat as optional/discretionary for the planner; if added, confirm the plan explicitly states "`mac`/`oui` must never be added to `DEFAULT_ALLOW_LIST`" as an acceptance criterion, not just an assumption.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `api.maclookup.app` (external HTTPS API) | MAC-03 vendor lookup | ✓ (live-verified 2026-07-25) | API v16.9.9 (per `x-srv` response header) | `api.macvendors.com` (also live-verified working, but far stricter unauthenticated rate limit) |
| `api.macvendors.com` (external HTTPS API) | Fallback only, not needed for v1 per D-02's resolution | ✓ (live-verified 2026-07-25) | unversioned | None — this IS the fallback |
| Node.js `fetch`/`AbortSignal.timeout` (Route Handler runtime) | `/api/mac-vendor` upstream call | ✓ (Next.js 16 / Node 18+ runtime, already the project's baseline) | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — both primary and fallback vendor APIs are confirmed reachable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (unit/component) + Playwright 1.61.1 (e2e), both already configured |
| Config file | `vitest.config.ts` (jsdom environment, `**/*.test.{ts,tsx}` glob), `playwright.config.ts` |
| Quick run command | `npm run test -- lib/mac` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAC-01 | Live-typing normalization across 4 separator formats | unit | `vitest run lib/mac/parse.test.ts` | ❌ Wave 0 |
| MAC-02 | All 4 formatted variants produced correctly | unit | `vitest run lib/mac/format.test.ts` | ❌ Wave 0 |
| MAC-03 | Vendor name shown on successful lookup | unit (route) + component | `vitest run app/api/mac-vendor/route.test.ts` | ❌ Wave 0 |
| MAC-04 | OUI prefix identified/displayed | unit | `vitest run lib/mac/classify.test.ts` | ❌ Wave 0 |
| MAC-05 | U/L bit correctly classified against known test vectors | unit | `vitest run lib/mac/classify.test.ts` (cases: `00:1A:2B:..`, `02:00:00:..`, `FF:FF:FF:..`) | ❌ Wave 0 |
| MAC-06 | I/G bit correctly classified against known test vectors | unit | `vitest run lib/mac/classify.test.ts` (case: `01:00:5E:..` multicast) | ❌ Wave 0 |
| MAC-07 | Exact hedge wording rendered for locally-administered MACs | component | `vitest run app/tools/mac/MacTool.test.tsx` | ❌ Wave 0 |
| MAC-08 | Classification badges still render when vendor fetch fails | component + e2e | `vitest run app/tools/mac/MacTool.test.tsx`; `playwright test tests/e2e/mac-lookup.spec.ts -g "vendor unavailable"` | ❌ Wave 0 |
| MAC-09 | Each field + full result independently copyable with confirmation | component + e2e | `vitest run app/tools/mac/MacTool.test.tsx`; `playwright test tests/e2e/mac-lookup.spec.ts -g "copy"` | ❌ Wave 0 |
| MAC-10 | `mac`/`oui` never added to `DEFAULT_ALLOW_LIST` | unit (regression guard) | `vitest run lib/analytics/redact.test.ts` (extend existing suite with an explicit "does not include mac/oui" assertion) | Partial — file exists, assertion is new |

### Sampling Rate
- **Per task commit:** `vitest run lib/mac` (fast, framework-agnostic core logic)
- **Per wave merge:** `npm run test && npm run typecheck && npm run lint`
- **Phase gate:** Full suite green (`npm run test && npm run test:e2e`) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/mac/parse.test.ts`, `classify.test.ts`, `format.test.ts` — core logic coverage for MAC-01/02/04/05/06
- [ ] `app/api/mac-vendor/route.test.ts` — **this is the first Route Handler unit test in the codebase** (`app/api/ip/route.ts` currently has none). Pattern: import the exported `GET` function directly and invoke it with a constructed `NextRequest` (e.g. `new NextRequest("http://localhost/api/mac-vendor?oui=3C22FB")`), mock global `fetch` for the upstream call (`vi.stubGlobal("fetch", ...)`), and assert on the returned `NextResponse`'s `.status`/`await .json()`. No new test infra package needed — `NextRequest`/`NextResponse` are usable directly under Vitest's existing jsdom/node setup.
- [ ] `app/tools/mac/MacTool.test.tsx` — component-level coverage for MAC-07/08/09 (hedge wording, vendor-failure resilience, copy confirmations)
- [ ] `tests/e2e/mac-lookup.spec.ts` — e2e coverage mirroring `tests/e2e/ip-widget.spec.ts`'s `page.route("**/api/mac-vendor", ...)` mocking pattern for both success and failure/unavailable scenarios
- [ ] Extend existing `lib/analytics/redact.test.ts` with a regression assertion that `DEFAULT_ALLOW_LIST` does not (and, ideally, structurally cannot silently) include `mac` or `oui`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | No accounts in this project |
| V3 Session Management | No | No sessions/cookies |
| V4 Access Control | No | No privileged resources |
| V5 Input Validation | Yes | `lib/mac/parse.ts`'s strip+length-check (client) AND `app/api/mac-vendor/route.ts`'s independent `/^[0-9A-Fa-f]{6}$/` re-validation (server) — never trust the client's validation alone, since the route is a public endpoint reachable directly, not only via the UI |
| V6 Cryptography | No | Not applicable — no secrets, no crypto operations in this phase |
| V12 Files and Resources | Partial | Upstream fetch is bounded by `AbortSignal.timeout(4000)` so a hung `maclookup.app` can never hang this app's own response indefinitely |
| V13 API and Web Service | Yes | The route's only user-controlled input (`oui`) is validated to an exact, narrow character class BEFORE being interpolated into the upstream URL — never string-concatenated unsanitized (prevents URL/path injection into the outbound request) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Unsanitized `oui` param interpolated into the upstream URL, enabling request smuggling / path traversal / open-proxy abuse against an attacker-chosen host | Tampering / Elevation of Privilege | Strict `/^[0-9A-Fa-f]{6}$/` validation before use; the upstream host itself (`api.maclookup.app`) is a hardcoded string literal, never derived from any request input — mirrors `lib/dns/query.ts`'s `CLOUDFLARE_URL`/`GOOGLE_URL` hardcoded-literal pattern |
| Full MAC address leaking into server logs, analytics, or the upstream request | Information Disclosure | Architectural: only the 6-hex-char OUI ever crosses the browser→server boundary (Pattern 3) — the host portion of the address is never transmitted anywhere; additionally, `mac`/`oui` must never be added to `DEFAULT_ALLOW_LIST` (existing Phase 1 `beforeSend` redaction middleware covers any future accidental `?mac=` URL-state param automatically) |
| This app's own `/api/mac-vendor` route being used as an open, unauthenticated pass-through to hammer `maclookup.app`'s rate limit (abuse via a scripted client bypassing the UI's debounce) | Denial of Service | The route only accepts a syntactically-narrow 6-hex-char value (can't be used as a generic URL-fetch proxy for arbitrary targets); `maclookup.app`'s own generous unauthenticated ceiling (10 req/sec, 25K/6h) combined with this project's low expected traffic makes a dedicated app-level rate limiter unnecessary for v1 — flag as an accepted risk unless production traffic later suggests otherwise |
| ReDoS via a pathological MAC-like input string during live-typing validation | Denial of Service | Not applicable here in practice (see Pitfall 4) — the strip+length-check approach has no backtracking-capable regex at all, unlike DNS's label validation which genuinely needed a bounded pattern |

## Sources

### Primary (HIGH confidence)
- Live `curl` against `https://api.maclookup.app/v2/macs/{mac}` (6 distinct requests: found/Apple OUI, found/Taiwanese-vendor OUI, not-found/broadcast, not-found/canonical-locally-administered-test-address, not-found/IPv4-multicast, malformed-input) — 2026-07-25, this session
- Live `curl` against `https://api.macvendors.com/{mac}` (2 requests, confirming plain-text success shape and an immediate `429` on the second request) — 2026-07-25, this session
- Live `curl` `OPTIONS`/`Origin`-header probes against `api.maclookup.app` confirming absence of `access-control-allow-origin` — 2026-07-25, this session
- This codebase's own existing implementations: `lib/dns/resolve.ts`, `lib/dns/query.ts`, `lib/dns/validate.ts`, `lib/dns/types.ts`, `lib/analytics/redact.ts`, `lib/analytics/PacketoryAnalytics.tsx`, `app/api/ip/route.ts`, `app/tools/dns/DnsTool.tsx`, `app/tools/dns/DnsToolLoader.tsx`, `app/tools/dns/page.tsx`, `lib/hooks/useCopyToClipboard.ts`, `lib/hooks/useKeyboardShortcut.ts`, `tests/e2e/ip-widget.spec.ts` — read directly in this session

### Secondary (MEDIUM confidence)
- `WebFetch` against `https://maclookup.app/api-v2/documentation` and `https://maclookup.app/api-v2/rate-limits` — official vendor documentation, cross-referenced against (and in one case, A1, found to be incompletely reflected by) live-observed behavior
- `WebSearch` for MAC-48/EUI-48 first-octet U/L (bit 1) and I/G (bit 0) bit convention — general web sources cross-referenced with the live `maclookup.app` `isRand` field behavior (Primary tier), which independently corroborates the exact same heuristic

### Tertiary (LOW confidence)
- None — every material claim in this document was either live-verified against the actual production API this phase will call, or cross-referenced against this codebase's own existing, already-shipped implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing codebase conventions directly observed and read
- Vendor API (D-02): HIGH — live-verified today against 8+ real requests to both `maclookup.app` and `macvendors.com`, including edge cases (malformed input, rate-limit trigger, CORS-header absence, OUI-only lookup)
- Bit classification (D-10): HIGH — standard, stable IEEE convention, additionally cross-checked live against an independent third-party production system's own implementation of the same heuristic across 4 test vectors
- Architecture/patterns: HIGH — directly derived from this codebase's own existing, shipped `lib/dns`/`lib/subnet` patterns, not external inference
- Open Questions: flagged explicitly (vendor "not found" 4th state, optional URL-state) — genuine gaps in CONTEXT.md's specifics, not research gaps

**Research date:** 2026-07-25
**Valid until:** 2026-08-24 (30 days — `maclookup.app`'s API surface is stable/versioned (`v2`), but free-tier availability/rate-limit terms for any third-party service should be re-verified if this phase's execution slips meaningfully past this window)
