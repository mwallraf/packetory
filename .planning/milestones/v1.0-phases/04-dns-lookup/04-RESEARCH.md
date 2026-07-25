# Phase 4: DNS Lookup - Research

**Researched:** 2026-07-24
**Domain:** Client-side DNS-over-HTTPS resolution in a React/Next.js static-first app — debounced input, request cancellation/race-safety, multi-resolver fallback, DoH JSON parsing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Resolver choice & privacy posture**
- **D-01:** Use Cloudflare (`cloudflare-dns.com/dns-query`) as primary resolver and Google (`dns.google/resolve`) as fallback, per `.planning/research/STACK.md`'s live-verified recommendation (both CORS-open, DoH JSON, no proxy needed). Quad9 was tested during research but its DoH JSON endpoint didn't respond — not usable without further investigation, so not pursued this phase.
- **D-02:** Add a plain-language note (FAQ and/or privacy notice) disclosing that lookups are sent to Cloudflare (primary) and Google (fallback) — honest disclosure given the project's Belgian/EU privacy-first positioning and project-brief.md §8.2's explicit sensitivity flag on domain names, even though the tool itself never stores or reports the domain.
- **D-03:** The `name` (domain) query param is **never** added to the analytics allow-list — same posture as Phase 3's `cidr` decision (D-01 in `03-CONTEXT.md`), directly required by project-brief.md §8.2 ("internal hostnames or domain names" is explicitly listed as sensitive). The `type` param (record type alone, e.g. "MX") is **also never** allow-listed — kept fully consistent with the domain's privacy treatment rather than carving out an exception for a minor product-analytics signal.

**Error/loading state design**
- **D-04:** Each of the 5 required states (NXDOMAIN, empty-NOERROR, invalid input, rate-limited, resolver-unavailable) gets a distinct icon + short label + one-line plain-language explanation — not just color-coding or bare text. Matches the scannable, inline-validation style already established on the Subnet page.
- **D-05:** NXDOMAIN and empty-NOERROR messaging spells out the distinction explicitly rather than relying on terse phrasing the user has to infer from context — e.g. "No such domain — {domain} doesn't exist" vs. "No {TYPE} records — {domain} exists but has none of this type."
- **D-06:** Rate-limited and resolver-unavailable states include their own explicit "Try again" retry button in the error card itself, in addition to the page's general explicit refresh control (DNS-05) — no need to hunt for the general refresh action after an error.

**In-flight / debounce UX**
- **D-07:** While a typed lookup is debouncing (600–800ms) or a request is in flight (any trigger — type, paste, Enter, refresh), the previous valid result stays visible at reduced opacity with a subtle loading indicator, rather than clearing or staying at full brightness with no feedback. Mirrors Subnet's "keep the last valid grid visible" pattern for its invalid-input state.
- **D-08:** On first page load — before the demo domain has resolved and no previous result exists yet — show a fixed-height skeleton placeholder (not blank space), so the result panel never causes layout shift once the first result lands. Same CLS-free-loading-state pattern as `SubnetToolLoader.tsx`/`UuidToolLoader.tsx`.

**Record-type selector & demo domain**
- **D-09:** Record type (A/AAAA/MX/TXT/NS/CNAME) is selected via a segmented-control/tab row — all 6 types visible at once, single active selection, one click to switch. Reuses the toggle-group pattern already established for UUID's case/hyphen controls, rather than introducing a new dropdown pattern.
- **D-10:** The page preloads and resolves `cloudflare.com` on first visit (not `example.com`) — a real, stable domain with a rich record set across A/AAAA/MX/TXT/NS that better demonstrates the tool's range, and is thematically fitting since Cloudflare is also the primary DoH resolver (D-01).
- **D-11:** The default active record type on load is **A** — the most familiar/expected default for "look up a domain," not NS (which would showcase Cloudflare's own nameservers but is less intuitive to a first-time visitor).

### Claude's Discretion
None — all four discussed areas reached explicit user decisions (recommended option accepted every round).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (DNSSEC inspection and authoritative-path analysis remain explicitly out of scope per PROJECT.md and project-brief.md §5.3, unchanged by this discussion. A more privacy-focused resolver than Cloudflare/Google — e.g. properly verifying Quad9's actual DoH JSON endpoint — was considered and explicitly not pursued this phase per D-01; worth revisiting only if Cloudflare/Google reliability or privacy concerns become a real problem in production.)

**Reviewed Todos (not folded):** None — no pending todos matched this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|--------------------|
| DNS-01 | Page resolves a preselected demonstration domain on load | Pattern 3 (`resolveWithFallback`) + Pitfall 3 (Strict Mode double-invoke handling via AbortController cleanup); demo domain `cloudflare.com` locked by D-10 |
| DNS-02 | Pasted domain input resolves immediately | Pattern 1 (debounce + immediate-trigger coexistence) — `onPaste` bypasses the debounce timer |
| DNS-03 | Typed input resolves after a ~600–800ms debounce; pressing Enter resolves immediately | Pattern 1, Open Question 1 (fixed 700ms constant recommendation) |
| DNS-04 | Outdated in-flight requests are cancelled via `AbortController` so stale results never overwrite newer ones | Pattern 2 (AbortController + sequence-token race safety), Pitfall 1, Pitfall 2 |
| DNS-05 | User can trigger an explicit refresh | Pattern 1 (`runLookupImmediate` shared by paste/Enter/refresh) |
| DNS-06 | Supports A, AAAA, MX, TXT, NS, and CNAME record types | Pattern 4 (`normalizeRecords`, `RECORD_TYPE_NUMBERS` mapping), live-verified response shapes for all 6 types |
| DNS-07 | Results display record values, TTL, resolver used, and lookup duration | Pattern 4 (normalization incl. TTL passthrough), Pattern 2 code example (`performance.now()` duration bracket, `resolverUsed` field), Open Question 2 (duration measurement scope) |
| DNS-08 | NXDOMAIN and empty-result states are distinguished and shown clearly | Pattern 3 (Status 3 vs. Status 0/empty Answer[] branching), live-verified curl evidence for both cases |
| DNS-09 | Lookups use DNS-over-HTTPS with a primary resolver and an explicit fallback, never silently switching when results could differ | Pattern 3 (explicit fallback-trigger algorithm), Assumption A1 (SERVFAIL handling), live CORS/endpoint verification |
| DNS-10 | Current domain + record-type state is reflected in the URL and can be bookmarked/shared | Recommended Project Structure (client-only URL-state boundary, mirrors Subnet's Pattern 1/2), Assumption A2 (sync-on-lookup vs. sync-on-keystroke) |
| QUAL-08 | Validation and runtime errors appear inline and distinguish invalid input, no result, rate limiting, resolver failure, and temporary service unavailability | Code Examples (`DnsLookupState` discriminated union covering all 5 states), Pitfall 6 (rate-limited vs. resolver-unavailable distinction), Security Domain (input validation) |
</phase_requirements>

## Summary

This phase has no new framework or library to learn — it's a pure browser-native async-orchestration problem layered onto the exact page-composition pattern already proven in Phases 2–3 (Server-shell + `ssr:false` client-island, framework-agnostic `lib/{tool}/`, raw History API URL-state). The three genuinely new pieces of engineering are: (1) a debounce timer that coexists with three immediate-trigger paths (paste, Enter, refresh button), (2) an `AbortController` + monotonic-sequence-token combination that guarantees a slower, earlier request can never overwrite a newer result on screen, and (3) explicit primary→fallback resolver semantics that only fail over on a genuine primary-resolver failure (network error, non-2xx HTTP status, or timeout) and never on a legitimate DNS answer (NXDOMAIN or empty-NOERROR).

Both DoH JSON endpoints (`cloudflare-dns.com/dns-query` with `Accept: application/dns-json`, and `dns.google/resolve`) were live-`curl`-verified during this research session (2026-07-24) and confirmed CORS-open (`access-control-allow-origin: *`) with directly-callable `fetch()` semantics — no proxy or API route needed, consistent with the CLAUDE.md-locked architecture. Both share the same de-facto JSON shape (`Status`/`Answer[]`/`TTL`), but several concrete quirks were discovered live that the planner must account for: Google appends a trailing dot to `Question.name`/`Answer[].name` while Cloudflare does not; requesting `type=A` for a domain with a CNAME returns **both** the CNAME and A records in the same `Answer[]` array (must filter by `type` field, not assume homogeneous records); TXT record `data` values arrive pre-wrapped in escaped literal quote characters (`"\"v=spf1 -all\""`) that must be stripped before display; and RCODE 2 (SERVFAILURE) is not explicitly addressed by the locked CONTEXT.md decisions — this research recommends treating it as a "genuine failure" (triggers fallback / resolver-unavailable state), flagged as an assumption requiring planner sign-off.

**Primary recommendation:** Build `lib/dns/` as pure, framework-agnostic modules (`validate.ts`, `query.ts`, `resolve.ts`, `parse.ts`, `types.ts`) exactly mirroring `lib/subnet/`'s structure, with a single `use client` orchestration hook (`useDnsLookup` or inline in `DnsTool.tsx`) that combines a `useRef`-based debounce timer with an `AbortController` + incrementing request-sequence ref to guarantee race-safety — no new npm dependency required.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Domain/record-type input validation | Browser / Client | — | Pure string validation (RFC 1035 label syntax), no network round trip needed before rejecting obviously malformed input (QUAL-08 "invalid input" state) |
| Debounce + immediate-trigger orchestration | Browser / Client | — | Client-only interaction timing logic; no server involvement per project's static-first constraint |
| DNS-over-HTTPS resolution (primary + fallback) | Browser / Client | — | CLAUDE.md explicitly locks direct browser `fetch()` to Cloudflare/Google DoH JSON endpoints — no API route proxy (both endpoints are CORS-open, verified live this session) |
| DoH JSON response normalization (Cloudflare/Google → shared shape) | Browser / Client | — | Runs entirely in `lib/dns/parse.ts`, framework-agnostic, independently unit-testable, executed client-side after `fetch()` resolves |
| Request cancellation / stale-response suppression | Browser / Client | — | `AbortController` + sequence-token pattern; no server-side state involved |
| URL bookmarkable state (`?name=&type=`) | Browser / Client | — | Same client-only `window.location.search` / `window.history.replaceState` boundary established in Phase 3 (Subnet) — `page.tsx` never destructures `searchParams`, keeping the route statically prerendered |
| Page chrome, metadata, FAQ, worked example | Frontend Server (SSR) | — | Static Server Component shell, identical to `app/tools/subnet/page.tsx` — no request-time data needed |
| Analytics redaction of `name`/`type` params | Browser / Client | — | `lib/analytics/redact.ts`'s allow-list is consulted client-side before any analytics event fires; per D-03 neither param is ever added |

## Package Legitimacy Audit

**No new external packages are introduced by this phase.** DNS-over-HTTPS calls use the native browser `fetch()` API; debounce, cancellation, and state-machine logic use only React built-ins (`useState`/`useRef`/`useEffect`) plus the native `AbortController` and `setTimeout` — the same dependency-free pattern already established by `lib/hooks/useCopyToClipboard.ts` and `lib/hooks/useKeyboardShortcut.ts`. The Package Legitimacy Gate protocol was not run because there is nothing to check against a registry.

If the planner later decides a debounce utility library (e.g. `use-debounce`) or a dedicated domain-validation package is desirable instead of hand-rolling ~15 lines of code, run `package-legitimacy check` against that specific package name before adding it as a dependency — none is recommended here given this codebase's consistent zero-dependency-hook precedent.

**Packages removed due to [SLOP] verdict:** none — none proposed.
**Packages flagged as suspicious [SUS]:** none — none proposed.

## Architecture Patterns

### System Architecture Diagram

```
User input (type / paste / Enter / refresh click)
        │
        ▼
┌───────────────────────────────────────────┐
│ DnsTool.tsx (client island, ssr:false)      │
│                                              │
│  onChange ──► debounce timer (600-800ms) ──┐│
│  onPaste  ──► immediate trigger ───────────┤│
│  Enter    ──► immediate trigger ───────────┤│
│  Refresh  ──► immediate trigger ───────────┘│
│                       │                      │
│                       ▼                      │
│         runLookup(domain, type)              │
│         - validate(domain)  [lib/dns/validate]
│         - if invalid → set "invalid" state, STOP
│         - bump requestSeqRef, new AbortController
│         - abort previous in-flight controller │
└───────────────────────┬──────────────────────┘
                         ▼
              resolveWithFallback()  [lib/dns/resolve.ts]
                         │
             ┌───────────┴────────────┐
             ▼                        │ (only on genuine failure:
   queryResolver(CLOUDFLARE)          │  network error / non-2xx / timeout)
             │  success (any Status)  │
             │  → done, resolver="primary"
             │                        ▼
             │              queryResolver(GOOGLE)
             │                        │
             │                        │ success (any Status)
             │                        │ → done, resolver="fallback"
             │                        │
             │                        │ also fails
             │                        ▼
             │              → "resolver-unavailable" state
             ▼
   parseDohResponse()  [lib/dns/parse.ts]
   - Status 3            → NXDOMAIN state
   - Status 0, Answer=[] → empty-NOERROR state
   - Status 0, Answer>0  → normalize records, render results
   - HTTP 429             → "rate-limited" state (no further fallback attempt
                             needed if this was already the fallback resolver)
             │
             ▼
   if requestSeqRef.current !== thisRequestSeq → DISCARD result (stale)
             │
             ▼
   setState(result) → render, sync URL (?name=&type=)
```

### Recommended Project Structure
```
lib/dns/
├── types.ts        # RecordType union, DohResponse, NormalizedRecord, DnsLookupState discriminated union
├── validate.ts      # isValidDomainInput() — RFC 1035-ish syntax check, no network call
├── query.ts          # queryResolver(name, type, resolverUrl, signal) → raw DohResponse
├── resolve.ts        # resolveWithFallback(name, type, signal) → { resolverUsed, response, durationMs }
├── parse.ts          # normalizeRecords(dohResponse, recordType) → NormalizedRecord[]; strips TXT quoting, trailing dots, filters by RR type
└── *.test.ts         # one test file per module, mirroring lib/subnet/ convention

app/tools/dns/
├── page.tsx           # Server Component shell — metadata, worked example, FAQ (mirrors app/tools/subnet/page.tsx)
├── DnsToolLoader.tsx  # ssr:false dynamic() boundary + fixed-height skeleton (mirrors SubnetToolLoader.tsx)
├── DnsTool.tsx        # client island: input, record-type segmented control, debounce/abort orchestration, result rendering
└── faq-data.ts        # faqItems + worked-example constants (mirrors subnet's faq-data.ts)
```

### Pattern 1: Debounce + immediate-trigger coexistence
**What:** A single `useRef<ReturnType<typeof setTimeout> | null>` holds the pending debounce timer. Typed `onChange` clears any existing timer and schedules a new one at 600–800ms. Paste (`onPaste`), Enter (via the existing `useKeyboardShortcut` `enter` handler), and the explicit refresh button all call the *same* `runLookup()` function directly, first clearing any pending debounce timer so a fast Enter-after-typing doesn't produce two lookups.
**When to use:** Any input where typing should feel considered/debounced but explicit user actions should always feel instant (DNS-02, DNS-03, DNS-05).
**Example:**
```typescript
// lib pattern — no dependency, matches useKeyboardShortcut.ts's useRef-for-latest-callback style
const DEBOUNCE_MS = 700; // within the 600-800ms window (D-07's mirrored range)
const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function scheduleDebouncedLookup(domain: string, type: RecordType) {
  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  debounceTimerRef.current = setTimeout(() => {
    runLookup(domain, type);
  }, DEBOUNCE_MS);
}

function runLookupImmediate(domain: string, type: RecordType) {
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }
  runLookup(domain, type);
}
```
Source: synthesized from React community debounce+cancellation guidance (WebSearch, 2026) cross-checked against this codebase's own `useKeyboardShortcut.ts` ref-based pattern.

### Pattern 2: AbortController + sequence-token race safety (belt-and-suspenders)
**What:** `AbortController.abort()` alone is usually sufficient, but relying on it exclusively has two known gaps: (a) some browsers/polyfills still let an already-in-flight `.then()` chain resolve with stale data in edge timing cases, and (b) `AbortError` must be explicitly caught and ignored so it doesn't get misrendered as a "resolver-unavailable" error. Pairing an incrementing `requestSeqRef` with the abort call is the standard belt-and-suspenders fix: before rendering any result, compare the request's captured sequence number against the ref's current value — if they differ, the response is stale and must be silently discarded regardless of what `AbortController` did.
**When to use:** Any debounced/rapid-fire async fetch where a definitively-ordered "last request wins" guarantee is required (DNS-04's explicit requirement).
**Example:**
```typescript
// Source: synthesized from React docs' "ignore flag" alternative + community
// AbortController patterns (WebSearch, 2026), adapted to this project's
// existing useRef-for-mutable-latest-value convention.
const requestSeqRef = useRef(0);
const abortControllerRef = useRef<AbortController | null>(null);

async function runLookup(domain: string, type: RecordType) {
  abortControllerRef.current?.abort();
  const controller = new AbortController();
  abortControllerRef.current = controller;
  const seq = ++requestSeqRef.current;

  setState((prev) => ({ ...prev, loading: true })); // D-07: dim + spinner, keep last valid result visible

  try {
    const started = performance.now();
    const result = await resolveWithFallback(domain, type, controller.signal);
    const durationMs = performance.now() - started;

    if (seq !== requestSeqRef.current) return; // stale — a newer request has since started

    setState({ status: "success", result, durationMs, loading: false });
    syncUrlState(domain, type); // only on committed lookup, not every keystroke
  } catch (err) {
    if (controller.signal.aborted) return; // superseded — do not render as an error
    if (seq !== requestSeqRef.current) return;
    setState(classifyError(err));
  }
}
```

### Pattern 3: Explicit primary → fallback resolver semantics
**What:** `resolveWithFallback` calls Cloudflare first. It only calls Google if the Cloudflare call throws (network error, `AbortError` excluded — that's a cancellation, not a failure), returns a non-2xx HTTP status, or the HTTP request itself times out. A successful 2xx response — **regardless of its DNS `Status` field** (0=NOERROR including empty NODATA, 2=SERVFAIL, 3=NXDOMAIN, or any other RCODE) is a completed lookup from the primary resolver and does NOT trigger a fallback attempt for RCODE 0/3. **Exception (flagged assumption, see Assumptions Log A1):** this research recommends also failing over on `Status: 2` (SERVFAIL), since SERVFAIL indicates the resolver itself failed to produce an answer rather than a legitimate negative result — CONTEXT.md's D-01/D-09 language ("genuine primary-resolver failure") is most naturally read to include this case, but it is not explicitly enumerated among the 5 named error states.
**When to use:** DNS-09's explicit fallback requirement.
**Example:**
```typescript
// Source: synthesized from CONTEXT.md D-01/D-09 + live-verified DoH schema (this session)
const CLOUDFLARE_URL = "https://cloudflare-dns.com/dns-query";
const GOOGLE_URL = "https://dns.google/resolve";
const RESOLVER_TIMEOUT_MS = 5000; // reasonable per-resolver ceiling; not explicitly locked — planner discretion

async function resolveWithFallback(
  name: string,
  type: RecordType,
  signal: AbortSignal
): Promise<{ resolverUsed: "primary" | "fallback"; response: DohResponse }> {
  try {
    const response = await queryResolver(name, type, CLOUDFLARE_URL, signal, RESOLVER_TIMEOUT_MS);
    if (response.status === 429) throw new RateLimitError();
    if (!response.ok) throw new ResolverFailureError(response.status);
    const body = await response.json();
    return { resolverUsed: "primary", response: body };
  } catch (err) {
    if (signal.aborted) throw err; // cancellation — propagate untouched, not a "failure"
    // genuine failure (network error, non-2xx, timeout, rate-limit) → try fallback
    const response = await queryResolver(name, type, GOOGLE_URL, signal, RESOLVER_TIMEOUT_MS);
    if (response.status === 429) throw new RateLimitError();
    if (!response.ok) throw new ResolverFailureError(response.status);
    const body = await response.json();
    return { resolverUsed: "fallback", response: body };
  }
}
```

### Pattern 4: DoH JSON response normalization
**What:** Cloudflare and Google share the `Status`/`Question`/`Answer[]` shape, but with real, live-verified differences that must be normalized in one place before any UI code touches record data.
**When to use:** DNS-06/DNS-07, all record-type rendering.
**Example:**
```typescript
// Source: live curl verification against cloudflare-dns.com and dns.google (this session, 2026-07-24)
function normalizeRecords(dohResponse: DohResponse, requestedType: RecordType): NormalizedRecord[] {
  const typeNum = RECORD_TYPE_NUMBERS[requestedType]; // e.g. A=1, AAAA=28, MX=15, TXT=16, NS=2, CNAME=5
  return (dohResponse.Answer ?? [])
    .filter((a) => a.type === typeNum) // A-record queries can also return an interleaved CNAME (type 5) —
                                        // verified live: querying type=A for www.github.com returns BOTH
                                        // a CNAME(5) entry and an A(1) entry in the same Answer[] array.
    .map((a) => ({
      name: stripTrailingDot(a.name),   // Google appends a trailing dot ("cloudflare.com."); Cloudflare does not
      ttl: a.TTL,
      value: normalizeValue(a.data, requestedType),
    }));
}

function normalizeValue(data: string, type: RecordType): string {
  if (type === "TXT") {
    // Verified live: TXT data arrives as a literal-quoted string, e.g. "\"v=spf1 -all\""
    // Strip exactly one layer of surrounding double-quotes.
    return data.startsWith('"') && data.endsWith('"') ? data.slice(1, -1) : data;
  }
  if (type === "MX") {
    // data is "priority exchange", e.g. "10 mxa.global.inbound.cf-emailsecurity.net."
    return data; // keep as-is; UI can split on first space to show priority + exchange separately
  }
  if (type === "CNAME" || type === "NS") {
    return stripTrailingDot(data);
  }
  return data;
}

function stripTrailingDot(s: string): string {
  return s.endsWith(".") ? s.slice(0, -1) : s;
}
```

### Anti-Patterns to Avoid
- **Debounce-only race protection (no AbortController/sequence token):** Debounce alone does not prevent an in-flight request that outlasts the debounce window from resolving after a newer one — this is the exact "slower earlier request overwrites newer result" bug DNS-04 explicitly requires preventing. Verified as a real, named risk in current React community guidance (WebSearch, 2026).
- **Falling back to Google on a legitimate NXDOMAIN or empty-NOERROR:** Explicitly forbidden by D-01/D-09 — a fallback here would silently mask a real "domain doesn't exist" answer behind an unnecessary second network call and could theoretically produce a different (stale-cache) answer, violating "never silently switching when results could differ."
- **Treating the DoH `Status` RCODE as an HTTP-equivalent error signal:** `Status: 3` (NXDOMAIN) and `Status: 2` (SERVFAIL) both arrive inside a normal HTTP 200 response body — checking only `response.ok`/HTTP status code without also inspecting the JSON `Status` field will misclassify every negative DNS answer as a "success."
- **Assuming `Answer[]` entries are homogeneous with the requested type:** live-verified this session — an `A` query for a CNAME-fronted domain returns both the CNAME and the A record in the same array. Code that renders `Answer[]` unfiltered will show a stray CNAME row under an "A records" heading.
- **Radix `ToggleGroup` single-select emitting `""` on deselect:** Already a documented pitfall from Phase 2 (`UuidTool.tsx`'s toggle-group code comment). The record-type segmented control (D-09) reuses this exact Radix component — the `onValueChange` handler MUST guard against an empty-string value (which Radix emits when a user clicks the already-active toggle) and simply ignore it, since exactly one record type must always remain selected.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full RFC 1035/2181/5891 domain-name validation (IDN/punycode, label edge cases, wildcard DNS syntax) | A comprehensive validation library or exhaustive regex | A deliberately narrow, ASCII-only syntax check (label length ≤63, total ≤253, alphanumeric+hyphen, no leading/trailing hyphen per label) implemented as string splitting, not a single backtracking regex | Full RFC-correct validation is a deep rabbit hole (IDNA, punycode, wildcard records) that this phase's scope doesn't require — DNSSEC/authoritative-path analysis is explicitly deferred (project-brief.md §5.3), and a narrow, ReDoS-safe check is sufficient to distinguish "invalid input" from a real NXDOMAIN lookup (QUAL-08). This directly parallels the Subnet phase's own security precedent (T-03-01: "ReDoS-free bounded validation"). |
| Retry/backoff logic for rate-limited requests | A generic retry-with-backoff utility | D-06's explicit, user-initiated "Try again" button — no automatic retry | The locked decision is a manual retry affordance, not automatic backoff; auto-retrying against a rate-limited endpoint risks worsening the rate-limit condition. |
| A custom DNS wire-format parser | Hand-rolled binary DNS message parsing | The DoH **JSON** API (already locked by CLAUDE.md/D-01) | JSON parsing needs zero binary-protocol code; wireformat DoH (RFC 8484 binary) would require a DNS message codec this project has no other use for. |

**Key insight:** Everything genuinely new in this phase (debounce, cancellation, fallback) is orchestration logic over two already-simple JSON HTTP endpoints — there is no domain complexity here that justifies a dependency; the risk is entirely in getting the state-machine sequencing right, which is why Patterns 1–3 above are worth following precisely rather than improvising.

## Common Pitfalls

### Pitfall 1: Stale response overwrites a newer result (the core DNS-04 risk)
**What goes wrong:** User types "cloud" (debounced lookup A fires), then quickly types "cloudflare.com" (debounced lookup B fires). If lookup A's network round-trip is slower than lookup B's, A's result can paint over B's newer, correct result.
**Why it happens:** Async responses do not resolve in request order; naive `.then(setState(...))` chains have no ordering guarantee.
**How to avoid:** Pattern 2 above — `AbortController.abort()` the previous request AND compare a captured sequence number before ever calling `setState` with a result.
**Warning signs:** In manual/E2E testing, throttle the network (Playwright supports this) and type a domain, delete it, and type a different one quickly — the final rendered result must always match the final typed domain.

### Pitfall 2: `AbortError` misrendered as "resolver-unavailable"
**What goes wrong:** Calling `.abort()` causes the in-flight `fetch()` promise to reject with a `DOMException` named `AbortError`. If the `catch` block doesn't special-case this, a routine, expected cancellation gets shown to the user as a resolver failure.
**Why it happens:** `fetch()` rejects on abort exactly like it rejects on a real network failure — the two must be told apart via `error.name === "AbortError"` or `signal.aborted`.
**How to avoid:** Always check `controller.signal.aborted` (or `err.name === "AbortError"`) first in the catch block and return early (no state update) before any error-classification logic runs.
**Warning signs:** Error state flickers briefly during normal fast typing even though the network is healthy.

### Pitfall 3: React Strict Mode double-invokes effects in development
**What goes wrong:** In development, React 19's Strict Mode intentionally mounts, unmounts, and remounts effects once to surface cleanup bugs. A `useEffect` that fires a DNS lookup on mount (for the D-10 demo-domain auto-resolve) will run twice, potentially firing two real network requests, unless idempotent/cancelled correctly.
**Why it happens:** This is standard, documented React 19 development-mode behavior, not a bug — it does not occur in production builds.
**How to avoid:** The same `AbortController` cleanup pattern already fixes this for free: the first mount's effect cleanup aborts its own in-flight request before the second mount's effect starts a new one. No production-only special-casing needed. This exact pattern is already implicitly proven safe in `IpBadge.tsx`'s `cancelled` boolean-flag variant (Phase 1), though DNS should use the stronger `AbortController` form per DNS-04's explicit requirement.
**Warning signs:** Two network requests visible in the dev-tools Network tab for a single page load — expected in dev, would be a real bug if seen in a production build.

### Pitfall 4: Trailing-dot / case inconsistency between resolvers
**What goes wrong:** Google's JSON responses append a trailing dot to FQDNs (`"cloudflare.com."`); Cloudflare's do not (`"cloudflare.com"`). If the UI echoes back `Answer[].name` verbatim, the displayed domain will differ cosmetically depending on which resolver answered — confusing given DNS-07 already surfaces "which resolver produced the answer."
**Why it happens:** Both implementations are valid per DNS zone-file convention (a trailing dot denotes an absolute FQDN) — this is a genuine, live-verified divergence between the two providers, not a bug in either.
**How to avoid:** Normalize (strip a single trailing dot) in `lib/dns/parse.ts` before any UI rendering, so output is resolver-agnostic and visually consistent regardless of which resolver answered.
**Warning signs:** A worked example or snapshot test written against only one resolver's raw output will look subtly different from the other's.

### Pitfall 5: TXT record values double-render escaped quotes
**What goes wrong:** Rendering `Answer[].data` for a TXT record verbatim shows a value with a leading/trailing literal `"` character baked into the displayed string (e.g. `"MS=ms70274184"` shown with the quote marks visible and copy-to-clipboard copying them too).
**Why it happens:** DoH JSON wraps TXT record text in an extra layer of quoting as part of its text-serialization convention (live-verified this session against both Cloudflare and Google).
**How to avoid:** Strip exactly one layer of surrounding double-quotes in `normalizeValue()` (Pattern 4) before display and before anything is copied via `useCopyToClipboard`.
**Warning signs:** A copied TXT value pasted elsewhere includes stray quote characters the user didn't expect.

### Pitfall 6: Confusing "rate-limited" with "resolver-unavailable"
**What goes wrong:** Both states stem from a non-2xx HTTP response, but D-04/D-06 require them to render as visibly distinct states with independently worded copy and their own retry affordance.
**Why it happens:** It's tempting to lump all non-2xx responses into one generic "something went wrong" branch.
**How to avoid:** Explicitly branch on HTTP status `429` (rate-limited) vs. any other network failure/non-2xx/timeout (resolver-unavailable) in the error-classification step, and preserve that distinction all the way to the rendered UI component (two different components/messages, not one parameterized by a string).
**Warning signs:** QA/UAT finds that a simulated 429 and a simulated network-down scenario render identical copy.

## Code Examples

### Domain input validation (ReDoS-safe, no backtracking regex)
```typescript
// Source: synthesized — ASCII hostname syntax per RFC 1035 §2.3.1, deliberately
// narrow scope (no IDN/punycode) per this phase's stated boundary. Implemented
// via string splitting rather than a single complex regex, mirroring this
// project's existing security precedent (Subnet phase T-03-01: "ReDoS-free
// bounded validation").
const LABEL_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const MAX_DOMAIN_LENGTH = 253;

export function isValidDomainInput(raw: string): boolean {
  const trimmed = raw.trim().replace(/\.$/, ""); // tolerate one trailing dot (absolute FQDN notation)
  if (!trimmed || trimmed.length > MAX_DOMAIN_LENGTH) return false;
  const labels = trimmed.split(".");
  if (labels.length < 1) return false;
  return labels.every((label) => LABEL_RE.test(label));
}
```

### Discriminated-union lookup state (drives all 5 QUAL-08 error states + loading + success)
```typescript
// Source: synthesized from CONTEXT.md D-04/D-05/D-06/D-07/D-08 and DNS-06..09,
// mirrors this codebase's existing typed-result pattern (lib/subnet/parse.ts's
// ParsedCidr | ParseError union).
export type DnsLookupState =
  | { status: "idle" }
  | { status: "invalid-input"; message: string; lastValidResult: DnsSuccessResult | null }
  | { status: "loading"; lastValidResult: DnsSuccessResult | null } // D-07: dim+spinner over last result
  | { status: "success"; result: DnsSuccessResult }
  | { status: "nxdomain"; domain: string; lastValidResult: DnsSuccessResult | null }
  | { status: "empty-noerror"; domain: string; recordType: RecordType; lastValidResult: DnsSuccessResult | null }
  | { status: "rate-limited"; lastValidResult: DnsSuccessResult | null }
  | { status: "resolver-unavailable"; lastValidResult: DnsSuccessResult | null };

export type DnsSuccessResult = {
  domain: string;
  recordType: RecordType;
  records: NormalizedRecord[];
  resolverUsed: "primary" | "fallback";
  durationMs: number;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Classic DNS resolution via OS resolver / `dns.promises` (Node) | DNS-over-HTTPS (DoH) called directly from the browser | DoH standardized via RFC 8484 (2018); Cloudflare/Google JSON APIs have been stable and widely used for years | Enables a fully client-side, zero-backend DNS lookup tool with no server round-trip latency — the entire premise this phase (and CLAUDE.md's architecture) is built on |
| `useSearchParams()` / server `searchParams` prop for URL state | Raw `window.location.search` read + `window.history.replaceState()` write inside a `ssr:false` client island | Established as this project's own convention in Phase 3 (Subnet), not a general industry shift | Keeps `/tools/dns` statically prerendered exactly like `/tools/subnet` — no regression to per-request dynamic rendering |

**Deprecated/outdated:**
- Nothing domain-specific is deprecated here — DoH JSON APIs (though not a formally standardized schema per Cloudflare's own docs) have been stable in practice since their public launch and remain the current recommended approach for browser-side DNS lookups.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | RCODE 2 (SERVFAIL) from the primary resolver should be treated as a "genuine failure" that triggers fallback to Google, not rendered as a direct answer — CONTEXT.md's D-01/D-09 do not explicitly enumerate this RCODE among the 5 named states. | Architecture Pattern 3 | If wrong, a transient primary-resolver SERVFAIL would be shown to the user as some ad-hoc/undefined state instead of transparently retrying the fallback resolver, or (if the opposite is intended) an unnecessary fallback call would fire for a case the user actually wanted surfaced as a primary-resolver answer. Low-medium risk — SERVFAIL is rare for well-formed public-domain queries against major DoH resolvers. |
| A2 | The bookmarkable URL (`?name=&type=`) should sync only when a lookup is actually triggered (debounce fires, or an immediate-trigger path runs) — not on every keystroke — so a bookmark never captures a mid-typing, unresolved domain fragment. This differs from Phase 3's Subnet pattern (which syncs on every valid keystroke, because Subnet's compute is synchronous/local). | Pattern 2 code example ("only on committed lookup, not every keystroke") | If wrong (planner/user actually wants keystroke-level URL sync to match Subnet's precedent exactly), bookmarks could differ subtly in behavior from what the discussion-phase implicitly expected via the "same mechanism as Subnet" canonical reference — low risk, easily adjustable in planning since it's a one-line call-site decision, not a structural one. |
| A3 | A per-resolver client-side timeout of ~5000ms (via `AbortController` + `setTimeout`) is a reasonable ceiling before treating a resolver as unavailable and either failing over or surfacing "resolver-unavailable." No specific timeout value is locked in CONTEXT.md or REQUIREMENTS.md. | Pattern 3 code example | If too short, a slow-but-healthy resolver response gets misclassified as unavailable and an unnecessary fallback fires; if too long, users wait longer than expected before seeing an error state. Low risk — easily tunable, no correctness impact either direction. |

**If this table is empty:** N/A — see above.

## Open Questions

1. **Exact debounce delay within the 600–800ms range**
   - What we know: CONTEXT.md and REQUIREMENTS.md both specify a range ("~600–800ms"), not a single locked value.
   - What's unclear: Whether the planner should pick a fixed constant (e.g. 700ms, as used in the code examples above) or make it configurable.
   - Recommendation: Pick a single fixed constant (700ms, the range midpoint) — no evidence in CONTEXT.md that runtime configurability is desired; matches the "one true value" style of `DEFAULT_CIDR`/`DEFAULT_REVERT_MS` constants elsewhere in this codebase.

2. **Whether "lookup duration" (DNS-07) includes a failed primary-resolver attempt's time when a fallback is used**
   - What we know: DNS-07 requires displaying "lookup duration"; D-01 requires disclosing which resolver answered.
   - What's unclear: Whether duration should be (a) total wall-clock time from trigger to final answer (including any failed primary attempt), or (b) only the successful resolver's own round-trip time.
   - Recommendation: Use total wall-clock time (option a) — it's what the user actually experienced waiting for a result, and it's the simpler single `performance.now()` bracket shown in Pattern 2's code example. Flag this as a copy/wording detail worth a one-line confirmation during planning, not a blocking research gap.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `fetch()` / `AbortController` (browser-native) | All DNS lookups | ✓ | Native in all evergreen browsers Next.js 16 targets | — |
| `cloudflare-dns.com/dns-query` (Cloudflare DoH JSON) | Primary resolver | ✓ (live-verified 2026-07-24) | — | Falls over to Google per DNS-09 |
| `dns.google/resolve` (Google DoH JSON) | Fallback resolver | ✓ (live-verified 2026-07-24) | — | If both fail: "resolver-unavailable" state |
| Node.js / npm (local dev, CI) | Build/test tooling | ✓ (already provisioned, unchanged from Phase 3) | Per package.json | — |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- None — both DoH endpoints are independently reachable and CORS-open as of this session; if a user's own network/browser blocks one or both (e.g. corporate DNS-over-HTTPS filtering), the existing "resolver-unavailable" state already covers that case with no additional engineering.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (`environment: jsdom`) for `lib/dns/` unit tests + component tests; `@playwright/test` 1.61.1 for E2E |
| Config file | `vitest.config.ts` (existing, unchanged), `playwright.config.ts` (existing, unchanged) |
| Quick run command | `npm run test -- lib/dns` (or `npx vitest run lib/dns`) |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DNS-01 | Demo domain auto-resolves on load | e2e | `npx playwright test tests/e2e/dns-lookup.spec.ts -g "auto-resolves on load"` | ❌ Wave 0 |
| DNS-02 | Pasted domain resolves immediately (no debounce wait) | e2e | `npx playwright test tests/e2e/dns-lookup.spec.ts -g "paste resolves immediately"` | ❌ Wave 0 |
| DNS-03 | Typed input debounces ~600-800ms; Enter resolves immediately | unit + e2e | `npx vitest run app/tools/dns/DnsTool.test.tsx` / `npx playwright test -g "debounce"` | ❌ Wave 0 |
| DNS-04 | Stale in-flight requests cancelled via AbortController; no out-of-order overwrite | unit | `npx vitest run lib/dns/resolve.test.ts` (mock fetch with controllable delays) | ❌ Wave 0 |
| DNS-05 | Explicit refresh control re-runs lookup | e2e | `npx playwright test -g "refresh"` | ❌ Wave 0 |
| DNS-06 | A/AAAA/MX/TXT/NS/CNAME all supported | unit | `npx vitest run lib/dns/parse.test.ts` | ❌ Wave 0 |
| DNS-07 | Displays record values, TTL, resolver used, lookup duration | unit + component | `npx vitest run lib/dns/parse.test.ts app/tools/dns/DnsTool.test.tsx` | ❌ Wave 0 |
| DNS-08 | NXDOMAIN vs empty-result distinguished | unit | `npx vitest run lib/dns/resolve.test.ts` (mock Status 3 vs Status 0/empty Answer) | ❌ Wave 0 |
| DNS-09 | Primary + explicit fallback, never silent switch on legitimate result | unit | `npx vitest run lib/dns/resolve.test.ts` (mock 200/NXDOMAIN → no fallback call asserted; mock network error → fallback call asserted) | ❌ Wave 0 |
| DNS-10 | URL state bookmarkable (`?name=&type=`) | e2e | `npx playwright test -g "bookmarkable URL"` | ❌ Wave 0 |
| QUAL-08 | 5 distinct inline error states, no popups | component + e2e | `npx vitest run app/tools/dns/DnsTool.test.tsx` / `npx playwright test -g "error states"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/dns` (fast, framework-agnostic core logic)
- **Per wave merge:** `npm run test && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/dns/validate.test.ts` — covers domain-syntax validation (invalid-input state trigger)
- [ ] `lib/dns/query.test.ts` — covers single-resolver query construction and response typing
- [ ] `lib/dns/resolve.test.ts` — covers fallback-trigger logic (the highest-risk module: must assert fallback fires ONLY on genuine failure, never on NXDOMAIN/empty-NOERROR) — needs a mockable `fetch` (native `vi.stubGlobal("fetch", ...)`, no MSW currently in this repo's devDependencies)
- [ ] `lib/dns/parse.test.ts` — covers TXT-quote-stripping, trailing-dot normalization, CNAME-filtered-from-A-query behavior (all three are live-verified real-world quirks from this research session)
- [ ] `app/tools/dns/DnsTool.test.tsx` — component-level test for the 5 QUAL-08 states + loading dim/skeleton states (D-07/D-08)
- [ ] `tests/e2e/dns-lookup.spec.ts` — new E2E file; must mock both `cloudflare-dns.com` and `dns.google` via `page.route()` (mirrors `tests/e2e/ip-widget.spec.ts`'s `page.route("**/api/ip", ...)` pattern), and needs a delayed/out-of-order-response test double to verify DNS-04's race-safety claim end-to-end (e.g. `page.route()` with a controllable delay on the first request, a faster second request, and an assertion that only the second domain's result ends up rendered)
- [ ] Framework install: none — Vitest/Playwright already fully configured from Phase 1

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | No auth in this tool |
| V3 Session Management | no | No session state |
| V4 Access Control | no | No access-controlled resources |
| V5 Input Validation | yes | `lib/dns/validate.ts`'s bounded, non-backtracking domain-syntax check (see "Don't Hand-Roll" + Code Examples) before any network call is made |
| V6 Cryptography | no | No cryptographic operations in this phase (DoH transport security is handled by HTTPS/TLS itself, not app code) |
| V13 API and Web Service | yes | Outbound calls only go to the two explicitly locked, CORS-verified DoH JSON endpoints (`cloudflare-dns.com`, `dns.google`) — no dynamic/user-controlled URL construction beyond the query-string `name`/`type` params, which are themselves validated before use |

### Known Threat Patterns for DNS-over-HTTPS in a Next.js client component

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Reflected XSS via unsanitized DNS record display (TXT records are attacker-influenced free text controlled by whoever owns the queried domain — e.g. a malicious `TXT` value containing `<script>`) | Tampering / Elevation of Privilege | JSX-only rendering (never `dangerouslySetInnerHTML` for any DNS record value) — React's default text-node escaping neutralizes this automatically, exactly as this project's Subnet phase already established as its own precedent for user-controlled string rendering |
| ReDoS via a maliciously crafted long/pathological domain string in the client-side validation regex | Denial of Service | Bounded per-label regex (`{0,61}` fixed quantifier, no nested/overlapping quantifiers) + an explicit total-length ceiling (253 chars) checked before any regex runs at all — mirrors the Subnet phase's own T-03-01 precedent |
| Domain-name/query-string leakage into analytics (the domain and record type queried are sensitive per project-brief.md §8.2) | Information Disclosure | D-03 (locked): `name` and `type` are never added to `lib/analytics/redact.ts`'s `DEFAULT_ALLOW_LIST` — same allow-list-only mechanism already covering Subnet's `cidr` param |
| SSRF-style resolver URL manipulation (an attacker attempting to redirect the app's outbound DoH call to an arbitrary host) | Spoofing / Tampering | The two resolver base URLs (`https://cloudflare-dns.com/dns-query`, `https://dns.google/resolve`) are hardcoded string literals in `lib/dns/resolve.ts`, never constructed from user input or a URL query parameter — no user-controllable "custom resolver" feature exists in this phase's scope |
| Third-party resolver receiving the queried domain (an inherent property of DNS lookup tools, not a code-level vulnerability) | Information Disclosure | Explicitly accepted and disclosed per D-02 — the privacy notice must name both Cloudflare and Google as receiving lookups; this is a disclosure/UX task, not a technical mitigation, since the tool's entire purpose requires sending the domain somewhere |

## Sources

### Primary (HIGH confidence)
- Live `curl -H "accept: application/dns-json"` against `https://cloudflare-dns.com/dns-query` (A, AAAA-via-CNAME, MX, TXT, NS, NXDOMAIN, CORS preflight OPTIONS) — 2026-07-24, this session
- Live `curl` against `https://dns.google/resolve` (A record, CNAME-chain via `www.github.com`, CORS headers) — 2026-07-24, this session
- Existing codebase: `app/tools/subnet/SubnetTool.tsx`, `SubnetToolLoader.tsx`, `page.tsx`; `lib/hooks/useKeyboardShortcut.ts`, `useCopyToClipboard.ts`; `lib/analytics/redact.ts`; `components/IpBadge.tsx`; `tests/e2e/ip-widget.spec.ts` — direct file reads, this session
- `.planning/phases/04-dns-lookup/04-CONTEXT.md` — locked user decisions D-01 through D-11
- `.claude/CLAUDE.md` "DNS-over-HTTPS Resolver Strategy" section — prior live-curl-verified research (project's own STACK.md, referenced/consistent with this session's independent re-verification)

### Secondary (MEDIUM confidence)
- `https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/` (official Cloudflare docs, fetched this session) — response schema, `do`/`cd` params, 400 error format
- `https://developers.google.com/speed/public-dns/docs/doh/json` (official Google docs, fetched this session) — response schema, TXT/SPF quoting confirmation

### Tertiary (LOW confidence)
- WebSearch: React debounce + AbortController race-condition community guidance (dev.to, various JS blogs, 2026) — general pattern confirmation only, not authoritative; cross-checked against this codebase's own existing hook conventions before being trusted
- WebSearch: Cloudflare Community forum posts on 1.1.1.1 rate limiting — no official documented HTTP 429 contract found; the "~10 req/s from a single IP" figure is anecdotal, not a documented SLA — treat any concrete rate-limit threshold as unverified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all primitives (fetch, AbortController, React hooks) are native and already used elsewhere in this codebase
- Architecture: HIGH — debounce/abort/fallback patterns are well-established, cross-checked against both community sources and this project's own existing hook conventions; DoH response shape/quirks are live-verified against production endpoints this session
- Pitfalls: HIGH for the live-verified quirks (trailing dot, TXT quoting, mixed Answer[] types); MEDIUM for rate-limit specifics (no official documented 429 contract found)

**Research date:** 2026-07-24
**Valid until:** 2026-08-23 (30 days — DoH JSON schemas and CORS posture are stable/mature, but re-verify live if implementation is delayed significantly, since neither provider's JSON schema carries a formal versioned contract)
