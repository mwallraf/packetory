# Phase 3: IP Subnet Calculator - Research

**Researched:** 2026-07-24
**Domain:** IPv4/IPv6 CIDR arithmetic (BigInt), RFC-5952 IPv6 text representation, reverse-DNS zone naming, Next.js App Router bookmarkable URL state
**Confidence:** HIGH (standards/RFC content, Next.js official docs, existing codebase patterns) / MEDIUM (exact display conventions for non-aligned reverse-DNS zones — flagged as open questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** The `cidr` query param is **never** added to the analytics allow-list. It stays permanently excluded from `lib/analytics/redact.ts`'s `DEFAULT_ALLOW_LIST` — no per-lookup value (and no generic "a lookup happened" event) is reported. Page-view metrics alone are sufficient; project-brief.md §8.2 explicitly flags private IP ranges/customer addressing as sensitive, and the user chose the safest interpretation over a value-free usage-tracking compromise.

**D-02:** The default/example CIDR shown on first load (before any URL param or user input) is a **private-range example** (e.g. `192.168.1.0/24` or the brief's own `10.20.0.0/20`) — familiar and recognizable, not a public/documentation range. This is purely a UI default; per D-01 it is never reported to analytics regardless of whether it's private or public.

**D-03:** IPv4/IPv6 CIDR arithmetic (network/broadcast bounds, address count, subdivisions, RFC-5952 compression) is implemented with **native BigInt, no new npm dependency** — addresses represented as BigInt, bit math done by hand in `lib/subnet/`. This fits the project's local-first/minimal-JS constraint and keeps the tool's core logic framework-agnostic and independently testable (same pattern as `lib/uuid/`). Claude owns full correctness/edge-case test coverage for this — expect property-based tests (fast-check, per Phase 2's precedent) covering boundary prefixes.

**D-04:** Boundary prefixes show **correct RFC-accurate values plus a short explanatory note**, never "N/A" and never omitted rows. Specifically: `/31` (RFC 3021 point-to-point) shows both addresses as usable, host count 2, with a one-line note explaining there's no broadcast address at this prefix. `/32` and IPv6 `/128` show network = broadcast = the single address, host count 1. `/127` follows the same both-addresses-usable treatment as `/31`. Output field shape stays consistent across all prefix lengths — only the values and the note change.

**D-05:** Subdivision suggestions (e.g. "split this /48 into /64s") are **interactive, not just informational text** — clicking a suggested subdivision recomputes the tool for that sub-block, reusing the same URL-state mechanism as the main CIDR input.

**D-06:** Clicking a subdivision **replaces** the top-level CIDR input entirely (updates the input field and the URL to the sub-block's own CIDR) rather than drilling down with a "back to parent" breadcrumb. One CIDR in, one result out — consistent with the rest of the tool and requires no new breadcrumb/history UI state.

### Claude's Discretion

None — all four discussed areas reached explicit user decisions (recommended option accepted every round, no "you decide" selections).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. (Full VLSM planner / arbitrary subnet splitting remains explicitly out of scope per PROJECT.md and project-brief.md §5.2, unchanged by this discussion.)

**Reviewed Todos (not folded):** None — no pending todos matched this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| SUBNET-01 | User can enter CIDR notation and have IPv4 vs IPv6 auto-detected | `lib/subnet/parse.ts` design (Recommended Project Structure); family detection is a simple `.`/`:` character-shape check ahead of full validation |
| SUBNET-02 | Page pre-fills a sensible example CIDR and calculates immediately on load | Pattern 1 (client-only URL-state boundary) — default private-range example (D-02) computed identically whether or not a URL param is present, first-painted only after client mount via the `ssr:false` loader |
| SUBNET-03 | Invalid input is validated inline without page reload or popup errors | Pitfall 3/4 boundary-safe parsing + `lib/subnet/parse.ts` returning a typed parse error rather than throwing; existing inline-validation UI conventions from Phase 1/2 (no `alert()`/native popups anywhere in the codebase) |
| SUBNET-04 | IPv4 input returns network/broadcast/first-last host/host count/mask/wildcard/binary/reverse DNS | Pattern 3 (BigInt mask arithmetic), Pitfall 3 (`/31`/`/32` boundary host-count branching), Code Examples (reverse-DNS), Assumption A3 (binary formatting convention) |
| SUBNET-05 | IPv6 input returns normalized prefix, compressed/expanded notation, first/last address, address count, reverse DNS zone, and /48–/64 subdivision options | RFC 5952 compression (Code Examples), RFC 3596 `ip6.arpa` construction (Code Examples), RFC 6177 `/56`/`/64` subdivision convention (State of the Art), Open Question 2 (subdivision option list), Anti-Pattern (never enumerate all children) |
| SUBNET-06 | Every output value has its own copy button | `lib/hooks/useCopyToClipboard.ts` reuse (Don't Hand-Roll) |
| SUBNET-07 | Current CIDR is reflected in the URL and can be bookmarked/shared | Pattern 1 (read via `window.location.search`) + Pattern 2 (write via `window.history.replaceState`); Validation Architecture e2e test for the bookmark round-trip |
</phase_requirements>

## Summary

This phase's math is well-specified by three RFCs (5952 for canonical IPv6 text, 3596 for `ip6.arpa` reverse zones, 3021 for `/31` point-to-point semantics) plus ordinary IPv4 `in-addr.arpa` convention — none of this requires a third-party library, which directly validates CONTEXT.md's D-03 decision to hand-roll BigInt math in `lib/subnet/` rather than pull in `ip-address` (the package CLAUDE.md's Technology Stack section recommends, written before this phase's context/discussion locked in D-03). **D-03 is the authoritative, locked decision for this phase and overrides CLAUDE.md's stack recommendation** — this research supports and does not second-guess that choice.

The bigger open technical risk in this phase isn't the math, it's the **URL-state architecture**. The project's "static-first" constraint and Phase 2's established `next/dynamic(ssr:false)` client-loader pattern (used there to dodge a CSPRNG hydration mismatch) both point toward the same answer for a different reason here: reading `searchParams` directly in a Server Component `page.tsx` (the officially documented approach) forces that whole route into **per-request dynamic rendering** — a regression against "static-first" for a route that has no need to run any logic on the server at all. The recommended architecture (detailed under Architecture Patterns) keeps `page.tsx` fully static and reads/writes the `cidr` param entirely client-side, using the same `ssr:false` loader shape as `UuidToolLoader.tsx`, and writes URL updates via the raw History API (`window.history.replaceState`) rather than `router.replace()` — the official Next.js docs confirm there is no Pages-Router-style shallow routing in App Router, and `router.replace`/`push` still runs App Router's client navigation machinery on every keystroke, which a live-typing CIDR field cannot afford.

**Primary recommendation:** Build `lib/subnet/` as pure, framework-agnostic BigInt modules (parse → mask math → format → reverse-DNS → subdivide), mirroring `lib/uuid/`'s shape; keep `app/tools/subnet/page.tsx` a static Server Component with a `next/dynamic(ssr:false)` client loader (reusing Phase 2's pattern for a new reason: avoiding dynamic rendering, not avoiding hydration mismatch); read the initial CIDR from `window.location.search` inside the client-only component and write updates via `window.history.replaceState`, never `router.replace`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CIDR parsing, BigInt mask math, RFC-5952 formatting, reverse-DNS zone naming | Browser / Client | — | Pure, deterministic, framework-agnostic logic (`lib/subnet/`) — must run identically in-browser per the local-first/no-third-party-requests constraint; no network dependency exists for this math, so no server tier is involved at all |
| Initial page shell, metadata, FAQ/worked-example content, JSON-LD | Frontend Server (SSR, static) | — | Static-first: page chrome, `<title>`/OG tags, and FAQ copy are build-time-known and should be statically prerendered like the UUID page |
| Reading/writing the `?cidr=` URL query param | Browser / Client | — | Must NOT be read via the Server Component `searchParams` prop (that opts the whole route into dynamic per-request rendering, violating static-first); read via `window.location.search` and written via `window.history.replaceState` entirely client-side |
| Copy-to-clipboard per output field | Browser / Client | — | Reuses existing `lib/hooks/useCopyToClipboard.ts`; inherently a browser API |
| Analytics allow-list enforcement (D-01: `cidr` never added) | Browser / Client (reporting call site) | — | `lib/analytics/redact.ts` already owns this; this phase's only obligation is to NOT touch `DEFAULT_ALLOW_LIST` |
| Tool registry entry (`status: "planned"` → `"active"`) | Shared config (build-time) | — | Same `tools/registry.ts` flip pattern as Phase 2 |

## Standard Stack

### Core

No new runtime dependency is introduced this phase. Per D-03 (locked, CONTEXT.md), CIDR arithmetic is hand-rolled with native `BigInt` in `lib/subnet/`.

| Capability | Approach | Why Standard (for this project) |
|------------|----------|----------------------------------|
| IPv4/IPv6 parsing, mask math, RFC-5952 formatting | Native `BigInt`, hand-written in `lib/subnet/` | D-03 locked decision; zero bytes added to the client bundle; keeps `lib/subnet/` framework-agnostic and unit-testable exactly like `lib/uuid/` and `lib/network/` [CITED: .planning/phases/03-ip-subnet-calculator/03-CONTEXT.md D-03] |
| Reverse-DNS zone construction | Hand-written, following RFC 3596 (`ip6.arpa` nibble reversal) and conventional `in-addr.arpa` octet reversal | No package needed — this is string formatting over already-parsed BigInt/octet data [CITED: RFC 3596, IETF] |
| URL bookmark state | Native `window.history.replaceState` + `URLSearchParams`, no `next/navigation` router calls for writes | Avoids introducing `nuqs` or similar URL-state libraries; Next.js App Router has no built-in shallow-routing helper, and the official doc-recommended `router.push`/`replace` pattern re-triggers App Router's client navigation machinery on every keystroke — undesirable for a live-typing field [CITED: nextjs.org/docs/app/api-reference/functions/use-search-params; community pattern verified against Next.js GitHub discussions #49540, #48110] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fast-check` | 4.9.0 (already a devDependency) | Property-based tests over BigInt boundary math | Exactly the Phase 2 precedent — generate arbitrary valid prefixes (including `/31`, `/32`, `/127`, `/128`) and assert invariants (host count, network ⊆ range, no address escapes bounds) [VERIFIED: package.json] |
| `@fast-check/vitest` | 0.4.1 (already a devDependency) | `fc.prop`/`it.prop` ergonomics on top of `fast-check` | Same integration already used in `lib/uuid/generate.test.ts` [VERIFIED: package.json, lib/uuid/generate.test.ts] |
| `lib/hooks/useCopyToClipboard.ts` | n/a (existing project code) | Per-field copy buttons (SUBNET-06) | Reuse as-is; Subnet needs many more copy targets than UUID's single/batch case, but the hook is already value-agnostic |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled BigInt math (`lib/subnet/`) | `ip-address` npm package (CLAUDE.md's stack recommendation, 10.2.0, zero deps, browser-safe) | CONTEXT.md's D-03 explicitly locks OUT this option for this phase — the user chose hand-rolled math for "framework-agnostic, independently testable" parity with `lib/uuid/`, accepting Claude owns full edge-case coverage. Revisit only if a future v2 VLSM planner (SUBNET-V2-01) needs range-splitting primitives beyond what's built here. |
| `window.history.replaceState` for URL writes | `nuqs` (URL-state-as-React-state library) | `nuqs` adds a new dependency and its own re-render model; for a single string param with a simple debounce-free read/write need, raw History API is zero-byte and matches the project's "minimal JS per page" constraint. Reconsider only if Phase 4 (DNS, `?name=&type=`) or Phase 5 need multi-param URL state complex enough to justify the abstraction. |

**Installation:** None — no new packages this phase.

**Version verification:** N/A (no new packages). Existing pinned versions (`fast-check@4.9.0`, `@fast-check/vitest@0.4.1`, `vitest@4.1.10`) already verified in Phase 2's RESEARCH.md and confirmed still present in `package.json` [VERIFIED: package.json read directly].

## Package Legitimacy Audit

No external packages are installed in this phase (D-03 locks hand-rolled BigInt math; URL state uses native `window.history`/`URLSearchParams`, both browser built-ins). The Package Legitimacy Gate is not applicable — nothing to check against the npm registry.

**Packages removed due to [SLOP] verdict:** none (n/a — no packages proposed)
**Packages flagged as suspicious [SUS]:** none (n/a — no packages proposed)

## Architecture Patterns

### System Architecture Diagram

```
Browser tab loads /tools/subnet
        │
        ▼
Static Server Component (page.tsx)
  - renders page chrome, <h1>, FAQ, JSON-LD (build-time content, no CIDR logic)
  - renders <SubnetToolLoader /> — next/dynamic(ssr:false), same shape as UuidToolLoader
        │  (server emits ONLY a skeleton for this subtree — no CIDR computed on the server)
        ▼
Client hydrates → SubnetTool.tsx mounts (first, and ONLY, place CIDR logic runs)
        │
        ├─► read window.location.search → cidr param present?
        │       ├─ yes → validate it
        │       │      ├─ valid  → use it as initial CIDR
        │       │      └─ invalid → fall back to default private-range example (D-02),
        │       │                   show inline validation note for the bad param
        │       └─ no  → use default private-range example (D-02)
        │
        ▼
lib/subnet/parse.ts → detect IPv4 vs IPv6 (SUBNET-01)
        │
        ▼
lib/subnet/{ipv4,ipv6}.ts → BigInt mask math
  (network, broadcast, first/last usable, host count, mask, wildcard, binary)
        │
        ▼
lib/subnet/format.ts → RFC-5952 compressed + expanded IPv6 forms
        │
        ▼
lib/subnet/reverse-dns.ts → in-addr.arpa / ip6.arpa zone name
        │
        ▼
lib/subnet/subdivide.ts → /48-/64 subdivision options (IPv6 only, SUBNET-05)
        │
        ▼
Render result fields, each wrapped with useCopyToClipboard (SUBNET-06)
        │
        ├─► user edits CIDR input ──► re-run the pipeline above ──► inline validation (SUBNET-03)
        │                                                     └──► window.history.replaceState(new ?cidr=)  (SUBNET-07)
        │
        └─► user clicks a subdivision suggestion ──► REPLACES current CIDR (D-06, no drill-down) ──► re-run pipeline + replaceState
```

### Recommended Project Structure

```
lib/subnet/
├── parse.ts           # CIDR string -> { family, address: bigint, prefixLength } | ParseError; IPv4-vs-IPv6 auto-detect (SUBNET-01)
├── parse.test.ts
├── ipv4.ts             # network/broadcast/first-last/hostCount/mask/wildcard/binary for IPv4 (SUBNET-04), boundary-aware (/31, /32 — D-04)
├── ipv4.test.ts        # + fast-check property tests over prefix 0-32
├── ipv6.ts             # network/first-last/addressCount for IPv6 (SUBNET-05), boundary-aware (/127, /128 — D-04)
├── ipv6.test.ts        # + fast-check property tests over prefix 0-128
├── format.ts           # RFC-5952 compressed + expanded IPv6 text forms
├── format.test.ts
├── reverse-dns.ts      # in-addr.arpa (IPv4) / ip6.arpa (IPv6) zone name construction
├── reverse-dns.test.ts
├── subdivide.ts        # IPv6 /48-/64 subdivision option list (SUBNET-05, D-05/D-06)
└── subdivide.test.ts

app/tools/subnet/
├── page.tsx                # Static Server Component shell — mirrors app/tools/uuid/page.tsx (metadata, FAQ, JSON-LD)
├── SubnetToolLoader.tsx     # next/dynamic(ssr:false) client-only boundary — mirrors UuidToolLoader.tsx, but for URL-state (not CSPRNG) reasons
├── SubnetTool.tsx           # Client component: owns CIDR input, URL read/write, all output field rendering + copy buttons
└── faq-data.ts              # Worked examples + FAQ content, same shape as uuid/faq-data.ts
```

### Pattern 1: Client-only URL-state boundary (extends Phase 2's `ssr:false` loader pattern for a new reason)

**What:** Keep `page.tsx` a plain static Server Component. Do NOT destructure the `searchParams` prop there. Use `next/dynamic(() => import("./SubnetTool"), { ssr: false, loading: () => <Skeleton /> })` inside a `"use client"` loader file, exactly like `UuidToolLoader.tsx`.

**When to use:** Any tool page whose only source of "the value that differs per load" is the URL query string, on a project with a static-first rendering constraint.

**Why:** Next.js's own docs state the `searchParams` Server Component prop is a **Request-time API** and "using it will opt the page into dynamic rendering at request time" [CITED: nextjs.org/docs/app/api-reference/file-conventions/page]. Awaiting `searchParams` in `page.tsx` — the pattern shown in Next's own examples — would silently convert `/tools/subnet` from a statically prerendered route into a per-request SSR route, which regresses this project's "static-first" constraint and the Lighthouse/perf targets it protects. Reading the param entirely client-side (via `window.location.search`, not even `useSearchParams()`) sidesteps this: the route stays static, and because the client-only subtree never server-renders at all, there is also no `<Suspense>` boundary requirement (that requirement in Next's docs is specifically for routes that ARE prerendered and use `useSearchParams()` inside them — n/a here since this subtree never prerenders).

**Example:**
```typescript
// SubnetToolLoader.tsx — "use client"
"use client";
import dynamic from "next/dynamic";

const SubnetTool = dynamic(
  () => import("./SubnetTool").then((mod) => mod.SubnetTool),
  { ssr: false, loading: () => <SubnetToolSkeleton /> }
);

export function SubnetToolLoader() {
  return <SubnetTool />;
}
```
```typescript
// SubnetTool.tsx — "use client", reads the URL itself; no useSearchParams() needed
// since this component is never server-rendered.
function getInitialCidrFromUrl(): string | null {
  if (typeof window === "undefined") return null; // defensive; ssr:false makes this unreachable in practice
  return new URLSearchParams(window.location.search).get("cidr");
}
```

### Pattern 2: URL writes via History API, not `router.replace`

**What:** On every valid CIDR change (typed input or subdivision click), call `window.history.replaceState(null, "", \`${pathname}?cidr=${encodeURIComponent(cidr)}\`)` directly instead of `useRouter().replace(...)`.

**When to use:** Any live-typing/high-frequency URL-state update where a server round-trip per keystroke is unacceptable.

**Why:** App Router has no Pages-Router-style shallow-routing flag. Next's own documented pattern for updating search params still funnels through `router.push`/`replace`, which triggers App Router's client-side navigation machinery (segment cache lookup, potential RSC fetch) on every call [CITED: nextjs.org/docs/app/api-reference/functions/use-search-params; community-verified via vercel/next.js discussions #49540 and #48110]. Calling the History API directly avoids this entirely — the URL updates, back/forward and bookmark/reload behavior work correctly (a fresh tab reads `window.location.search` on mount per Pattern 1), and there is no App Router navigation overhead per keystroke.

```typescript
// Source: pattern verified against nextjs.org/docs (official doc's own caveats about
// searchParams/router behavior) + community-documented workaround (no first-party
// shallow-routing API exists in App Router)
function syncCidrToUrl(cidr: string) {
  const url = `${window.location.pathname}?cidr=${encodeURIComponent(cidr)}`;
  window.history.replaceState(null, "", url);
}
```

### Pattern 3: BigInt mask arithmetic (IPv4 + IPv6 share the same shape)

**What:** Represent every address as a single `BigInt` (32 bits for IPv4, 128 bits for IPv6). Build a prefix mask of the right bit width, then AND/OR against it.

**When to use:** All CIDR math in `lib/subnet/ipv4.ts` and `lib/subnet/ipv6.ts`.

```typescript
// Source: general BigInt subnetting pattern, cross-checked against multiple
// implementations — treat the exact helper shape as illustrative, not
// copy-paste-authoritative (see Assumptions Log A2)
function maskFor(bitWidth: bigint, prefixLength: bigint): bigint {
  const hostBits = bitWidth - prefixLength;
  const allOnes = (1n << bitWidth) - 1n;
  return hostBits === 0n ? allOnes : allOnes ^ ((1n << hostBits) - 1n);
}

function networkAddress(address: bigint, mask: bigint): bigint {
  return address & mask;
}

// IPv4 only — IPv6 has no broadcast concept (multicast replaces it)
function broadcastAddress(address: bigint, mask: bigint, bitWidth: bigint): bigint {
  const allOnes = (1n << bitWidth) - 1n;
  return address | (mask ^ allOnes);
}
```

### Anti-Patterns to Avoid

- **Reading `searchParams` in `page.tsx` (Server Component):** Opts the whole route into per-request dynamic rendering, contradicting "static-first." Use Pattern 1 instead.
- **Using `router.replace()`/`router.push()` for every keystroke:** Triggers App Router's client navigation machinery unnecessarily. Use Pattern 2 (`window.history.replaceState`) instead.
- **Eagerly enumerating every IPv6 subdivision child (e.g., all 65,536 `/64`s under a `/48`):** SUBNET-05 asks for "subdivision **options**" (i.e., a short list of selectable granularities like "/56" and "/64"), not an exhaustive child list — a `/32` parent split into `/64` children would be an astronomically large, unrenderable set. Offer a small fixed set of standard next-step prefix lengths (e.g., current prefix + common increments up to `/64`), not a generated enumeration.
- **Treating `Number()` as sufficient for any address math:** IPv4 already exceeds safe 32-bit bitwise operator behavior in JS in some edge cases (JS bitwise ops are 32-bit signed), and IPv6 (128-bit) cannot use `Number` at all — `BigInt` end-to-end, per D-03, avoids both classes of bug.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Copy-to-clipboard + confirmation timing | A new copy hook per output field | `lib/hooks/useCopyToClipboard.ts` (existing) | Already handles clipboard write, 2s revert, and rejected-write error state; reused as-is across every one of Subnet's many copy targets |
| IPv6 literal syntax validation | A hand-rolled regex for IPv6 shorthand | The `new URL('http://[candidate]')` bracket-wrap trick already used in `lib/network/parseForwardedIp.ts` | Proven in this codebase (Phase 1); the WHATWG URL parser correctly validates IPv6 literal syntax with zero new dependency. Note: this validates *address syntax only* — CIDR-specific parsing (prefix length, network-boundary semantics) still needs `lib/subnet/parse.ts`'s own logic on top of it. |
| Query-param analytics exclusion | A new redaction mechanism for `cidr` | `lib/analytics/redact.ts`'s existing allow-list (D-01: explicitly NOT extended for `cidr`) | The mechanism already exists and already defaults to excluding anything not explicitly allow-listed; this phase's only job is to NOT add `cidr` to it |

**Key insight:** Nearly everything genuinely reusable for this phase already exists in the codebase from Phases 1–2. The only new "Don't Hand-Roll" risk is on the URL-state side, where it's tempting to reach for `next/navigation`'s router APIs because they're the "official" way — but the official way has a documented performance/architecture cost (Pattern 2) that a two-line History API call avoids.

## Common Pitfalls

### Pitfall 1: Reading `searchParams` server-side silently kills static rendering
**What goes wrong:** A developer follows Next's own `page.tsx` example (`async function Page({ searchParams }) { const { cidr } = await searchParams }`) to get the initial value "the official way," and the route silently becomes dynamically rendered per request.
**Why it happens:** The pattern is the first thing shown in Next's own docs for reading query params in a Server Component; it looks like the "correct," idiomatic choice.
**How to avoid:** Never destructure `searchParams` in `app/tools/subnet/page.tsx`. Follow Pattern 1 — the value is read entirely client-side, after the static shell has already been served.
**Warning signs:** `next build` output shows `/tools/subnet` marked dynamic (`ƒ`) instead of static (`○`) in the route summary; a production `curl` of the built HTML shows per-request-varying content that shouldn't vary for a static route.

### Pitfall 2: Non-nibble/non-octet-aligned prefix reverse-DNS zones have no single "correct" display convention
**What goes wrong:** A prefix like `/20` (IPv4) or `/52` (IPv6) doesn't land on a clean octet (IPv4, 8-bit) or nibble (IPv6, 4-bit) boundary, so there's no textbook single-label reverse zone name for it — RFC 2317 classless delegation exists for the IPv4 case but adds real complexity for what's meant to be a quick display field.
**Why it happens:** The success criteria ask for "reverse DNS zone" as a single field per CIDR block, but the underlying DNS delegation system only cleanly supports certain boundary alignments.
**How to avoid:** Decide (and document) one consistent display convention up front — e.g., show the zone name truncated to the nearest fully-covered boundary (`floor(prefixLength / 8)` octets for IPv4, `floor(prefixLength / 4)` nibbles for IPv6) with a short note when the prefix isn't boundary-aligned, rather than attempting full RFC 2317 classless-delegation syntax. This is flagged in Assumptions Log (A1) — confirm the exact wording/behavior with the user or via discuss-phase-style judgment before treating it as final, since it's a display/UX choice, not a pure math question.
**Warning signs:** Test cases only cover octet/nibble-aligned prefixes (`/24`, `/64`) and never exercise `/20`, `/28`, `/52`, etc.

### Pitfall 3: `/31` and `/127` "both addresses usable" breaks a naive `(broadcast - network - 1)` host-count formula
**What goes wrong:** A generic "usable host count = total addresses − 2" formula returns 0 for `/31`/`/127` and would (wrongly) suggest no usable hosts, contradicting D-04's explicit requirement that both addresses are usable (host count = 2) at these prefixes.
**Why it happens:** The "−2 for network/broadcast" rule is the common case, not universal — `/31` and `/127` are the well-known RFC 3021 exception, and `/32`/`/128` are the single-host exception.
**How to avoid:** Branch host-count/usable-range logic explicitly on prefix length: `bitWidth - prefix >= 2` → normal (−2) case; `== 1` → `/31`/`/127` (both usable, count 2); `== 0` → `/32`/`/128` (single address, count 1, network=broadcast=that address). D-04 requires this branch to still populate every field with a real value plus an explanatory note — never `"N/A"` or a hidden row.
**Warning signs:** A boundary-prefix fast-check property test (host count for prefix ∈ {30, 31, 32} or {126, 127, 128}) fails or the UI renders a negative/zero host count.

### Pitfall 4: JS's native bitwise operators (`&`, `|`, `~`, `<<`) are 32-bit-signed and will silently corrupt IPv6 (and even edge-case IPv4) math if mixed with `BigInt`
**What goes wrong:** Mixing `Number`-typed bitwise ops with `BigInt` values throws a `TypeError` (can't mix BigInt and other types), or — worse — a developer converts a `BigInt` down to `Number` "just for this one operation" and silently loses precision/sign for large 128-bit IPv6 values.
**Why it happens:** JS's native `&`/`|`/`~` operators only work correctly on `Number` for values that stay within 32-bit signed range; muscle memory from typical JS bit-twiddling code doesn't carry over to 128-bit IPv6 math.
**How to avoid:** Use `BigInt` literals (`1n`, `0xffffn`) and `BigInt`-typed operators end-to-end in `lib/subnet/ipv4.ts`/`ipv6.ts`; never call `Number()` on an intermediate address/mask value.
**Warning signs:** TypeScript flags a type error mixing `bigint` and `number` in an arithmetic/bitwise expression (this is actually the safety net — don't silence it with `as any`/`Number()` casts).

## Code Examples

### RFC 5952 canonical IPv6 compression (illustrative shape)
```typescript
// Source: RFC 5952 rules (leading zeros suppressed, "::" used maximally for the
// longest run of all-zero 16-bit groups, single all-zero group -> "0", not "::")
function compressIpv6(groups: number[]): string {
  // groups.length === 8, each 0-0xffff
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  groups.forEach((g, i) => {
    if (g === 0) {
      if (curStart === -1) curStart = i;
      curLen++;
      if (curLen > bestLen) { bestStart = curStart; bestLen = curLen; }
    } else {
      curStart = -1; curLen = 0;
    }
  });
  if (bestLen < 2) {
    // No run of 2+ zero groups -> no "::" per RFC 5952 (a single 0000 stays "0", not "::")
    return groups.map((g) => g.toString(16)).join(":");
  }
  const before = groups.slice(0, bestStart).map((g) => g.toString(16));
  const after = groups.slice(bestStart + bestLen).map((g) => g.toString(16));
  return `${before.join(":")}::${after.join(":")}`;
}
```

### IPv6 reverse DNS (`ip6.arpa`) nibble construction
```typescript
// Source: RFC 3596 — nibble sequence in REVERSE order, low-order nibble first
function ipv6ReverseZone(addressBigInt: bigint, prefixLength: number): string {
  const fullNibbles: string[] = [];
  for (let i = 0n; i < 32n; i++) {
    const shift = i * 4n;
    const nibble = (addressBigInt >> shift) & 0xfn;
    fullNibbles.push(nibble.toString(16));
  }
  // fullNibbles[0] is already the LOWEST-order nibble (matches RFC 3596's
  // "low-order nibble first" reversed ordering) because of how we shifted.
  const coveredNibbles = Math.floor(prefixLength / 4); // Pitfall 2: non-nibble-aligned prefixes need a display decision
  return `${fullNibbles.slice(32 - coveredNibbles).join(".")}.ip6.arpa.`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| RFC 3177 blanket `/48`-to-every-end-site recommendation | RFC 6177 — `/56` is the common default for residential/small sites; `/48` reserved for larger/enterprise sites; `/64` remains the fixed universal subnet building block | RFC 6177 (2011), reflecting RIR policy already changed by 2005 | SUBNET-05's "/48-/64 subdivision options" should present `/56` and `/64` as the realistic subdivision granularities, not assume every IPv6 CIDR block a user enters is a `/48` |
| Next.js Pages Router `router.push(url, as, { shallow: true })` | App Router has no shallow-routing option; official docs point to raw History API or accept full client navigation | Since the App Router's introduction (v13) | Directly shapes Pattern 2 above — there is no equivalent first-party "shallow" flag to reach for |

**Deprecated/outdated:**
- Pages-Router-style shallow routing (`{ shallow: true }`): does not exist in App Router; do not search for or expect an equivalent config flag on `useRouter()`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Reverse-DNS zone display for non-octet/non-nibble-aligned prefixes should truncate to the nearest fully-covered boundary with an explanatory note, rather than implementing full RFC 2317 classless IPv4 delegation syntax | Pitfall 2, Code Examples | If the user actually wants RFC 2317-style classless names (e.g. `5-28.0.2.192.in-addr.arpa` for `192.0.2.0/28`), the simpler truncation approach under-delivers; low risk since this is additive (can be refined without breaking other fields), but should be confirmed during planning/discuss rather than assumed final |
| A2 | The BigInt mask-arithmetic code shape (Pattern 3, Code Examples) is presented as illustrative pseudocode, not verified against a specific canonical open-source implementation | Architecture Patterns Pattern 3, Code Examples | Low risk — the underlying identities (AND with prefix mask = network address; OR with inverted mask = broadcast) are standard, well-known networking math, but Claude must still write full first-party test coverage (fast-check boundary tests) rather than trusting this snippet verbatim, per D-03's explicit expectation that Claude owns full correctness |
| A3 | "Binary representation" (IPv4 output field, SUBNET-04) should render as dot-separated 8-bit groups (e.g. `11000000.10101000.00000001.00000000`) matching common subnet-calculator convention | Standard Stack / Code Examples (implied) | Low risk — this is a display-only formatting choice with no functional consequence; project-brief.md only says "binary representation where useful" without specifying exact grouping |

## Open Questions (RESOLVED)

1. **Exact reverse-DNS zone display convention for non-aligned prefixes**
   - What we know: RFC-clean zone names only exist at octet (IPv4) / nibble (IPv6) boundaries.
   - What's unclear: Whether the product wants a simplified truncated-boundary display (this research's default assumption, A1) or a full RFC 2317 classless-delegation-style name for IPv4.
   - Recommendation: Default to the truncated-boundary approach with an inline note (matches D-04's "always show a real value + short note, never N/A" precedent for boundary prefixes) — planner should treat this as consistent with, and extending, D-04's spirit rather than a new open decision requiring another discuss-phase round.
   - **RESOLVED:** Planner adopted the truncated-boundary recommendation and surfaced it as an explicit flagged assumption (not a locked decision) in `03-02-PLAN.md` and in `03-UI-SPEC.md`'s UI Considerations table, so `/gsd-verify-work` re-confirms it against user expectations rather than treating it as silently settled.

2. **Exact subdivision-option list contents for IPv6 (SUBNET-05/D-05/D-06)**
   - What we know: Options must be interactive (clicking recomputes/replaces the top-level CIDR, D-05/D-06) and span "/48–/64."
   - What's unclear: The precise set of prefix lengths to always offer (e.g., always show `/56` and `/64` regardless of input prefix? Or only show subdivisions strictly longer than the input's current prefix, capped at `/64`?).
   - Recommendation: Offer a small fixed list of standard next-step prefixes greater than the current prefix and ≤ `/64` (e.g., input `/32` → offer `/48`, `/56`, `/64`; input `/56` → offer `/64` only), following RFC 6177's `/56`/`/64` convention (State of the Art table) — this keeps the list short, standards-aligned, and avoids the enumeration anti-pattern.
   - **RESOLVED:** Planner implemented the fixed-list recommendation directly in `03-04-PLAN.md` (`lib/subnet/subdivide.ts`, bounded option list, no enumeration anti-pattern).

## Environment Availability

This phase has no new external service/tool dependencies — all math and URL-state logic runs client-side with browser built-ins (`BigInt`, `URLSearchParams`, `window.history`) and the existing project toolchain.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/dev/test tooling | ✓ | v22.13.1 | — |
| npm | Package scripts | ✓ | 11.10.1 | — |
| Vitest | Unit + property tests | ✓ | 4.1.10 | — |
| Playwright | E2E (bookmark round-trip, SUBNET-07) | ✓ | 1.61.1 (config present at `playwright.config.ts`) | — |
| `fast-check` / `@fast-check/vitest` | Boundary-prefix property tests | ✓ | 4.9.0 / 0.4.1 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (unit/property) + Playwright 1.61.1 (e2e) |
| Config file | `vitest.config.ts` (jsdom, globals, `**/*.test.{ts,tsx}`) / `playwright.config.ts` (`tests/e2e/`, `baseURL: http://localhost:3000`) |
| Quick run command | `npx vitest run lib/subnet` |
| Full suite command | `npm test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUBNET-01 | IPv4 vs IPv6 auto-detected from CIDR string | unit | `npx vitest run lib/subnet/parse.test.ts` | ❌ Wave 0 |
| SUBNET-02 | Default example pre-fills and calculates on load | component/e2e | `npx vitest run app/tools/subnet` / `npx playwright test tests/e2e/subnet.spec.ts -g "default"` | ❌ Wave 0 |
| SUBNET-03 | Invalid CIDR shows inline validation, no reload/popup | component | `npx vitest run app/tools/subnet` | ❌ Wave 0 |
| SUBNET-04 | IPv4 field set correct incl. `/31`/`/32` boundaries | unit + property | `npx vitest run lib/subnet/ipv4.test.ts` | ❌ Wave 0 |
| SUBNET-05 | IPv6 field set + subdivision options correct incl. `/127`/`/128` boundaries | unit + property | `npx vitest run lib/subnet/ipv6.test.ts lib/subnet/subdivide.test.ts` | ❌ Wave 0 |
| SUBNET-06 | Every output value individually copyable | component | `npx vitest run app/tools/subnet` | ❌ Wave 0 |
| SUBNET-07 | CIDR reflected in URL; bookmarked URL reproduces result in a fresh tab | e2e | `npx playwright test tests/e2e/subnet.spec.ts -g "bookmark"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/subnet` (and `app/tools/subnet` once component tests exist)
- **Per wave merge:** `npm test && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/subnet/parse.test.ts` — covers SUBNET-01
- [ ] `lib/subnet/ipv4.test.ts` (+ fast-check property tests over prefix 0–32) — covers SUBNET-04
- [ ] `lib/subnet/ipv6.test.ts` (+ fast-check property tests over prefix 0–128) — covers SUBNET-05
- [ ] `lib/subnet/format.test.ts` — RFC-5952 compression/expansion round-trips
- [ ] `lib/subnet/reverse-dns.test.ts` — covers reverse-DNS field for both families
- [ ] `lib/subnet/subdivide.test.ts` — covers SUBNET-05 subdivision option generation
- [ ] `app/tools/subnet/SubnetTool.test.tsx` (Testing Library) — covers SUBNET-02, SUBNET-03, SUBNET-06
- [ ] `tests/e2e/subnet.spec.ts` (Playwright) — covers SUBNET-07 bookmark round-trip (load a URL with `?cidr=...` in a fresh context, assert the rendered result matches)
- No new framework install needed — all test infrastructure already exists from Phase 1/2.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | No auth in this project |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No access-controlled resources |
| V5 Input Validation | Yes | CIDR string parsed via a bounded, explicit grammar (no catastrophic-backtracking regex); reject anything that doesn't match expected IPv4/IPv6 CIDR shape before doing any BigInt math or rendering |
| V6 Cryptography | No | No crypto in this phase (BigInt math here is arithmetic, not cryptographic) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| ReDoS via a pathological CIDR-like input string | Denial of Service | Use simple, non-backtracking character-class validation (split on `/`, validate octet/hextet shape with bounded-length checks) rather than a single complex regex with nested quantifiers |
| Reflected XSS via the `?cidr=` URL param rendered into the page | Tampering / Elevation of Privilege | React's default JSX escaping already neutralizes this as long as the value is only ever rendered as text content (never via `dangerouslySetInnerHTML`, which this phase has no reason to use for user input — only the existing FAQ JSON-LD pattern uses it, and only over static author-controlled content) |
| Sensitive private-IP data reaching analytics via the bookmarkable URL | Information Disclosure | Already mitigated by D-01 (CONTEXT.md, locked): `cidr` is never added to `lib/analytics/redact.ts`'s `DEFAULT_ALLOW_LIST`. This phase's only obligation is to NOT modify that allow-list. |
| Unbounded UI enumeration of subdivision children as a client-side resource-exhaustion vector | Denial of Service (client-side) | Per the "Don't Hand-Roll"/Anti-Patterns guidance: never enumerate all child subnets of a wide prefix; only ever offer a short, fixed list of standard next-step prefix lengths (Open Question 2) |

## Sources

### Primary (HIGH confidence)
- `nextjs.org/docs/app/api-reference/functions/use-search-params` (fetched live, v16.2.11-current per doc metadata) — `useSearchParams` behavior, Suspense requirement, documented update pattern
- `nextjs.org/docs/app/api-reference/file-conventions/page` (fetched live, v16.2.11-current per doc metadata) — `searchParams` prop is a Promise since v15, and is explicitly a "Request-time API" that opts a route into dynamic rendering
- Direct codebase reads: `app/tools/uuid/{page.tsx,UuidToolLoader.tsx}`, `lib/network/parseForwardedIp.ts`, `lib/analytics/redact.ts`, `lib/hooks/useCopyToClipboard.ts`, `tools/registry.ts`, `package.json`, `vitest.config.ts`, `playwright.config.ts`, `.planning/phases/03-ip-subnet-calculator/03-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, `project-brief.md` §5.2/§8.2

### Secondary (MEDIUM confidence)
- RFC 5952 (IPv6 canonical text representation) — via WebSearch, cross-referenced against datatracker.ietf.org/rfc-editor.org listings
- RFC 3596 (`ip6.arpa` nibble reverse-DNS format) — via WebSearch, cross-referenced against rfc-editor.org
- RFC 3021 (`/31` point-to-point usable-host semantics) — via WebSearch, cross-referenced against rfc-editor.org/datatracker.ietf.org
- RFC 6177 (obsoletes RFC 3177's `/48` default; `/56` common default, `/64` universal building block) — via WebSearch, cross-referenced against rfc-editor.org
- `in-addr.arpa` IPv4 reverse-DNS octet-reversal convention — via WebSearch, cross-referenced against multiple vendor/registry docs (DNS Made Easy, RIPE, Microsoft Learn, Red Hat)
- vercel/next.js GitHub Discussions #49540, #48110 (no App Router shallow routing; History API workaround) — via WebSearch, community-sourced but consistent with the official docs' own routing behavior

### Tertiary (LOW confidence)
- Generic "how to build a BigInt subnet calculator" blog/tool-vendor content (Pattern 3's illustrative code shape) — via WebSearch, third-party, not a spec; flagged in Assumptions Log A2 as pattern-only, not copy-paste-authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — D-03 is a locked user decision, not a research judgment call; no new packages to evaluate
- Architecture: HIGH for the client-only URL-state boundary (directly grounded in official Next.js docs' own stated behavior); MEDIUM for exact BigInt helper shapes (illustrative, needs first-party test coverage per D-03)
- Pitfalls: HIGH for the static-rendering and `/31`/`/127` host-count pitfalls (grounded in official docs / RFC text); MEDIUM for the reverse-DNS display-convention pitfall (a genuine open UX/display question, not fully resolved)

**Research date:** 2026-07-24
**Valid until:** 30 days (RFC/DNS content is stable; Next.js App Router routing APIs move faster — re-verify Pattern 1/2 against docs if this phase is replanned much later than a Next.js minor version bump)
