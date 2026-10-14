# Pitfalls Research

**Domain:** Network/infrastructure utility website (UUID generator, IP subnet calculator, DNS lookup, MAC inspector) — Next.js App Router, static-first, client-island architecture
**Researched:** 2026-07-21
**Confidence:** MEDIUM (domain math/protocol facts are HIGH confidence — well-established RFC-backed standards cross-checked against multiple sources; ecosystem/tooling claims are MEDIUM — general web search, not curated docs)

## Critical Pitfalls

### Pitfall 1: IPv6 host-count and address arithmetic overflow (JS Number precision loss)

**What goes wrong:**
A `/64` IPv6 network has 2^64 addresses — a `/48` has 2^80. JavaScript's `Number` type only safely represents integers up to 2^53 (`Number.MAX_SAFE_INTEGER`). Any subnet calculator that does host-count or address-range math using ordinary numbers (or worse, `parseInt`/bitwise operators, which coerce to 32-bit signed integers) will silently produce wrong, truncated, or garbage results for anything above roughly a `/74` — and IPv4 bitwise operators (`<<`, `>>>`, `&`) are already unsafe above `/1` for full 32-bit masks in some edge cases (sign bit issues on `/0`–`/1`).

**Why it happens:**
IPv4 subnetting habits (32-bit math fits in a JS Number/Int32) get copy-pasted into IPv6 logic without re-checking bit width. It "looks done" because small prefixes like `/64`–`/128` render fine (few/no usable hosts to enumerate), but larger networks (`/48`, `/32`) silently break.

**How to avoid:**
Use `BigInt` for all IPv6 address-to-integer conversions, network/broadcast-equivalent math, and host-count calculations. For IPv4, use `>>> 0` (unsigned right shift by zero) after bitwise ops to avoid sign-bit corruption, or also use BigInt for consistency across both stacks in the shared `lib/subnet` module. Write the core address-math module framework-agnostic and unit-test it independently before wiring it into any UI.

**Warning signs:**
- Host count displays as a negative number, `NaN`, or `Infinity` for large prefixes.
- Network/first-address calculation is correct for `/64`+ but wrong for `/32`–`/48`.
- Any use of `parseInt(x, 2)` or `<<`/`>>` on more than 31 bits in the codebase.

**Phase to address:**
IP Subnet Calculator phase (2nd in build order). This is core-logic work, not UI polish — should be caught by boundary/property-based unit tests before the tool ships.

---

### Pitfall 2: Off-by-one and "no host bits" errors at IPv4 /31, /32 and IPv6 /127, /128

**What goes wrong:**
Standard subnet math assumes network address + broadcast address + usable hosts. RFC 3021 defines `/31` as a special case (point-to-point links) with **no network/broadcast address** — both addresses are usable. `/32` is a single host with no network, broadcast, or usable range at all. IPv6 has **no broadcast address concept whatsoever** — applying IPv4 broadcast logic to IPv6 is a category error. `/127` is the IPv6 point-to-point equivalent (RFC 6164, both addresses usable), and `/128` is a single host.

**Why it happens:**
Generic subnet formulas (`usable hosts = 2^n - 2`) are hard-coded without branching for these boundary prefixes, since they're rare in example data but common in real point-to-point/loopback configs that engineers actually look up.

**How to avoid:**
Explicitly branch these four cases (`/31`, `/32` for IPv4; `/127`, `/128` for IPv6) in the core subnet-math module rather than relying on the general formula to degrade gracefully. Add them as required unit-test fixtures, not optional edge cases.

**Warning signs:**
Usable host count shows as negative (`2^0 - 2 = -1`) or the tool displays a broadcast address field for IPv6 output.

**Phase to address:**
IP Subnet Calculator phase.

---

### Pitfall 3: IPv6 zero-compression and normalization not RFC 5952-compliant

**What goes wrong:**
IPv6 has multiple textually valid representations of the same address (`2001:0db8:0000:0000:0000:0000:0000:0001` vs `2001:db8::1`), and naive string-based compression logic produces non-canonical or ambiguous output: compressing a single zero group (not allowed — `::` must replace the *longest run* of ≥2 groups, and if there's a tie, the *first* run), using uppercase hex, or leaving unnecessary leading zeros.

**Why it happens:**
Developers write ad-hoc regex/string-replace compression instead of implementing the RFC 5952 canonical algorithm precisely, and testing only against "nice" example addresses instead of adversarial ones (multiple equal-length zero runs, a single isolated zero group, mixed-case input).

**How to avoid:**
Implement (or use a well-vetted library for) full RFC 5952 canonicalization: lowercase hex, no leading zeros per group, compress only the single longest run of ≥2 all-zero groups (first one wins on ties), never compress a lone zero group. Provide both compressed and expanded forms as the spec requires — test round-trip (parse → normalize → re-parse → same address).

**Warning signs:**
Two different valid input strings for the same address produce different "normalized" output, or `::` appears where only one zero group exists.

**Phase to address:**
IP Subnet Calculator phase (IPv6 output requirement explicitly calls for "compressed and expanded notation").

---

### Pitfall 4: DoH JSON response treated as "success" based on HTTP status instead of the DNS RCODE

**What goes wrong:**
DNS-over-HTTPS JSON APIs (Cloudflare `/dns-query`, Google `dns.google/resolve`) return **HTTP 200** for NXDOMAIN, SERVFAIL, and most other DNS response codes — the actual outcome lives in the JSON body's `Status` field (the RCODE integer: 0 = NOERROR, 3 = NXDOMAIN, 2 = SERVFAIL, etc.), not the HTTP status. A DNS Lookup tool that treats `response.ok` as "lookup succeeded" will show an empty/blank result (or worse, a raw error) for NXDOMAIN instead of a clear "domain does not exist" message — directly contradicting the explicit requirement to distinguish NXDOMAIN from empty-result states.

**Why it happens:**
Treating a DoH endpoint like a normal REST API (HTTP status = outcome) is the natural first instinct; the RCODE-in-body quirk is undocumented in any single authoritative spec since the JSON DoH format has no formal RFC (only RFC 8484 wireformat is standardized).

**How to avoid:**
Always parse the JSON body's `Status` field explicitly and map RCODE values to distinct UI states (NOERROR-with-empty-answer vs NXDOMAIN vs SERVFAIL vs REFUSED). Never infer success from `fetch()` promise resolution or HTTP status alone. Build this RCODE-mapping logic as a pure, independently-tested function in `lib/dns/`.

**Warning signs:**
NXDOMAIN lookups render as a blank/empty results list indistinguishable from "no records of this type" instead of a distinct "domain does not exist" state.

**Phase to address:**
DNS Lookup phase (3rd in build order).

---

### Pitfall 5: Stale DNS/async requests overwrite newer results (race condition on fast typing/resolver switch)

**What goes wrong:**
With debounced typed input (~600–800ms) plus instant-on-paste/Enter plus a fallback-resolver retry path, there are multiple concurrent code paths that can each kick off a fetch. Without cancellation, a slow response to an *earlier* query (e.g., resolving `example.co` while the user finishes typing `example.com`) can resolve *after* the response to the current query and overwrite the correct on-screen result with stale data — a subtle bug that only shows up under real typing speed and flaky network latency, not in manual QA where requests are naturally sequenced.

**Why it happens:**
Developers debounce the *trigger* but forget that debouncing alone doesn't guarantee response ordering — two in-flight requests can still resolve out of order. This is explicitly called out as an acceptance criterion in the brief ("stale async requests cannot overwrite newer results") precisely because it's an easy miss.

**How to avoid:**
Use `AbortController` to cancel the previous in-flight request the moment a new one starts (not just to save bandwidth — as the *primary* correctness mechanism), and additionally guard state updates with a request-id/generation counter so an aborted-but-still-resolving promise can never write to state if a newer request has since started. Apply the same pattern to the primary→fallback resolver retry logic, which is itself a second async hop that can race.

**Warning signs:**
Rapidly typing and backspacing in the DNS input occasionally shows a result for a domain no longer in the input box; results flicker between two different domains' data when network is throttled in DevTools.

**Phase to address:**
DNS Lookup phase — this should be a required, automated test (simulate two in-flight requests resolving out of order), not just manual verification.

---

### Pitfall 6: Silent resolver fallback masks meaningfully different results

**What goes wrong:**
The brief explicitly warns: "never switch silently when the returned result could differ." Different DoH resolvers can return genuinely different answers for the same query (different DNS views for split-horizon/geo-DNS domains, different filtering — e.g., malware-blocking resolver variants, different TTL/caching behavior, different TXT-record quoting since the JSON format isn't RFC-standardized). A naive "try primary, on any error silently retry fallback and show the result" implementation hides *which* resolver actually produced the displayed answer, which is actively misleading for a tool engineers rely on for ground truth.

**Why it happens:**
Fallback-on-failure is a common, otherwise-correct resiliency pattern; the domain-specific twist (that a "successful" fallback response is not equivalent to the primary would have returned) is easy to overlook.

**How to avoid:**
Always surface which resolver produced the displayed result (this is already a stated output requirement: "whether a fallback resolver was used"). Trigger fallback only on primary resolver *failure* (network error, timeout, malformed response) — never silently on a NOERROR-but-empty or NXDOMAIN result, since that's usually a legitimate answer, not a resolver failure.

**Warning signs:**
A domain that legitimately doesn't have an AAAA record shows as if the fallback resolver "found" a different answer, or the resolver-used indicator is missing/wrong in the UI.

**Phase to address:**
DNS Lookup phase.

---

### Pitfall 7: MAC "locally administered" bit conflated with "randomized" bit

**What goes wrong:**
The standard heuristic for detecting a randomized/private MAC address is: locally-administered bit (U/L, bit 1 of the first octet) = 1 AND unicast bit (I/G, bit 0) = 0, which always makes the second hex nibble one of `{2, 6, A, E}`. But locally-administered ≠ randomized in general — VMs (VirtualBox, VMware, Docker bridge interfaces), manually-configured MACs, and some enterprise MAC-assignment schemes also set the U/L bit without being privacy-motivated randomization. A tool that labels every locally-administered address as "randomized/private MAC" will mislabel legitimate VM/manually-set addresses, which is a credibility-damaging mistake for a tool aimed at engineers who will recognize the error immediately.

**Why it happens:**
The U/L-bit heuristic is the closest thing to a detection signal that exists (there's no cryptographic proof of randomization), and it's tempting to present a heuristic as a definitive fact.

**How to avoid:**
Label the result as "likely randomized/locally administered" rather than an assertion of certainty, and expose the underlying bits (U/L, I/G) transparently so engineers can judge for themselves — this matches the brief's requirement to "identify... likely randomized/private MAC addressing" (note: "likely," already hedged in the spec). Do not overclaim precision the underlying signal doesn't support.

**Warning signs:**
Support/feedback reports of "this VM MAC isn't randomized but your tool says it is."

**Phase to address:**
MAC Address Inspector phase (4th in build order).

---

### Pitfall 8: Full MAC addresses (and other sensitive lookup values) leaking into analytics via URL query params

**What goes wrong:**
Shareable/bookmarkable URL state (`?cidr=`, `?name=&type=`, and implicitly a MAC-inspector equivalent) is a stated feature, but most analytics tools (even "privacy-friendly" ones) record the full page URL including query string by default. A private/internal MAC address, an internal hostname (`?name=db01.corp.internal`), or an RFC1918 private IP (`?cidr=10.20.0.0/20`) pasted into a tool and left in the URL for sharing becomes de-facto PII/internal-infrastructure data sitting in analytics logs — directly contradicting the explicit privacy requirement and turning a convenience feature into a data-leak vector.

**Why it happens:**
URL-state and analytics are built by different concerns/phases; the interaction between them ("shareable state" + "collect page views") isn't obviously in tension until someone traces exactly what a typical analytics snippet actually sends. Blocklisting specific param names is also fragile — it's easy to add a new tool/param and forget to update the analytics-exclusion list.

**How to avoid:**
Default to an **allow-list**, not a block-list, for which query parameters are ever sent to analytics (e.g., only non-identifying params like `?ref=` are passed through; everything else is stripped before the analytics call fires) — mirrors how privacy-focused analytics tools like Plausible handle this by discarding all query params except attribution ones by default. Strip the query string from the tracked page-view URL entirely and track only the pathname (`/tools/subnet`) unless a specific param is explicitly allow-listed. Do this centrally in one shared analytics wrapper function, not per-tool, so new tools can't forget it.

**Warning signs:**
Any analytics dashboard where the "top pages" report shows full CIDR ranges, domain names, or MAC-looking strings in the URL column.

**Phase to address:**
Shared site-shell phase (analytics wrapper should exist and be allow-list-based *before* the first tool with sensitive URL state ships — i.e., before or alongside the Subnet Calculator phase, since UUID has no sensitive query data but Subnet is next and does).

---

### Pitfall 9: Hydration mismatch from client-only logic bleeding into the initial (server-rendered) render

**What goes wrong:**
Every tool needs an *instant* default result on load (UUID generated immediately, subnet pre-filled and calculated, DNS demo value resolved) — several of these depend on browser-only or non-deterministic APIs: `crypto.randomUUID()`/`crypto.getRandomValues()`, `Date.now()` (relevant to UUID v7's timestamp-based generation), `localStorage` (last-5-UUIDs convenience storage), or `window`. If any of this executes during the server-render pass (or if the client's *first* render pass produces different output than what the server sent — e.g., generating a *different* random UUID client-side than what was server-rendered), React will throw a hydration mismatch, discard the server-rendered HTML, and force a client re-render — which both hurts performance (defeats the point of static-first rendering) and can cause a visible flash/flicker of a different value than what was initially shown.

**Why it happens:**
"Zero-effort instant result on load" naturally pulls developers toward generating the result as early as possible, including during SSR — but crypto randomness, `Date.now()`, and `localStorage` are inherently non-deterministic/client-only and cannot be safely computed on the server and expected to match the client.

**How to avoid:**
For content that must be truly random/instant (UUID generator, MAC-vendor "OUI copy" reference), either (a) generate it in a `useEffect` on mount and render a stable placeholder/skeleton during the SSR pass (accepting the brief instant that adds), or (b) mark the whole interactive tool as a client component with no server-rendered dynamic content, letting the *static shell* (nav, headings, explanatory copy, FAQ) stay server-rendered while the *tool itself* renders client-side only, matching the project's own "client islands" architecture intent. Never read `localStorage`/`window` during the render body of a component that's also invoked during SSR — always gate behind `useEffect` or `typeof window !== 'undefined'` checks placed correctly (not just present, but placed so they don't create the mismatch anyway).

**Warning signs:**
Console warnings about "Text content did not match" or "Hydration failed because the initial UI does not match what was rendered on the server"; a visible flash where the first UUID shown changes a moment after page load.

**Phase to address:**
Shared site-shell / first tool phase (UUID Generator) — this is the first tool built and sets the pattern every subsequent tool copies, so getting the client-island boundary right here matters most.

---

### Pitfall 10: UUID v7 monotonicity and randomness-source mistakes

**What goes wrong:**
UUID v7 embeds a millisecond Unix timestamp in the high bits specifically so IDs sort chronologically — but a naive implementation that (a) doesn't use a cryptographically secure random source (`crypto.getRandomValues`, not `Math.random()`) for the random bits, or (b) generates a batch of 1–100 UUIDs in a tight loop without any monotonic-counter/sub-millisecond-collision handling, can produce IDs that aren't actually sortable within the same millisecond (multiple v7 UUIDs generated in the same millisecond have no defined ordering relative to each other) or, worse, use `Math.random()` which is not cryptographically secure and is explicitly disallowed by the RFC 9562 spec for the random portion of any UUID version.

**Why it happens:**
`Math.random()` is the reflexive choice for "I need a random number in JS," and batch-generation-in-a-loop is the obvious naive implementation that doesn't consider same-millisecond ordering.

**How to avoid:**
Always use `crypto.getRandomValues()` (available in all browsers and Node ≥ 19 as `crypto.randomUUID()` for v4; v7 needs custom implementation or a vetted library like `uuid` npm package, since native `crypto.randomUUID()` only produces v4). For batch generation, either accept RFC 9562's documented behavior (same-millisecond v7 UUIDs are not guaranteed ordered relative to each other, which is spec-compliant) or implement the optional monotonic counter extension if ordering-within-batch is a stated requirement — decide explicitly rather than leaving it as an accidental behavior.

**Warning signs:**
A batch of 100 UUIDs generated instantly (well within one millisecond in modern JS engines) don't sort in generation order when sorted lexically.

**Phase to address:**
UUID Generator phase (1st in build order) — since this ships first and is the "fully self-contained, no external dependencies" validation phase for the whole shared-shell pattern, get the crypto-randomness source right here as the template for MAC-vendor-lookup randomness needs too (if any) later.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Hand-roll IPv4-only subnet math first, "add IPv6 later" | Faster initial ship | IPv6 usually needs a structurally different data model (BigInt, no broadcast concept) — bolting it on later means a rewrite, not an extension | Never for this project — brief requires both IPv4 and IPv6 auto-detected from the same input in v1 |
| Use a single public MAC-vendor API (e.g., macvendors.com) directly from the client with no proxy/caching | Zero backend work, ships fast | Low-rate public APIs throttle/block quickly under real traffic; brief explicitly says "do not make a low-rate public API the permanent architecture" | Acceptable only as an explicitly temporary `/api/mac-vendor` proxy route at MAC-inspector launch, with a tracked follow-up to move to a local OUI dataset |
| Blocklist a few known-sensitive query param names in analytics | Quick to implement | New tool/param added later and forgotten → silent PII leak | Never — use allow-list instead (see Pitfall 8) |
| Mark entire tool pages as `'use client'` at the top level instead of isolating the interactive island | Simpler mental model, fewer files | Ships unnecessary JS for static content (headings, FAQ, examples) on every page load, hurting the "minimal JS per page" performance target | Acceptable only very early (pre-Lighthouse-check) as a stepping stone, must be refactored before performance NFR verification |
| Skip `AbortController`/race-condition guards on first DNS Lookup implementation, "add later if it's a problem" | Faster initial ship | Race condition is a correctness bug that's hard to reproduce in manual testing and erodes trust in a tool whose whole value is accuracy | Never — stated as an explicit acceptance criterion in the brief, should be built in from the first version |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| DoH JSON resolver (Cloudflare `/dns-query`, Google `dns.google/resolve`) | Treating HTTP 200 as "lookup succeeded"; not sending `Accept: application/dns-json` header (some resolvers require it to return JSON instead of wireformat) | Parse the `Status` RCODE field from the JSON body explicitly; always set `Accept: application/dns-json`; handle non-2xx HTTP separately from DNS-level errors (network/CORS failure vs. NXDOMAIN) |
| MAC vendor lookup API (interim `/api/mac-vendor` proxy) | Calling the third-party vendor API on every keystroke as the user types the MAC | Debounce, and only query once the input is a syntactically complete/valid MAC (matching the DNS tool's own debounce pattern); cache OUI→vendor lookups (OUIs are static, don't change per request) |
| Vercel Edge/serverless functions for any API route | Assuming Node.js-only APIs (`fs`, certain crypto methods) work in Edge Runtime | Confirm runtime (`export const runtime = 'nodejs'` vs default edge) matches what each API route actually needs, especially if the future local OUI-dataset lookup reads a bundled file |
| Vercel preview deployments + analytics | Preview/staging traffic polluting production analytics dashboards | Gate analytics initialization on `NODE_ENV === 'production'` / `VERCEL_ENV === 'production'`, not just presence of the script |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Loading a full/local OUI vendor dataset (tens of thousands of entries) as client-side JSON | Large first-load JS/data payload hurts Lighthouth performance score and "minimal JS" NFR | Look up OUI vendor data server-side (API route or build-time static lookup), return only the matched result to the client — don't ship the whole dataset to the browser | Immediately at MAC Inspector launch if done naively; brief's own perf NFR (90+ Lighthouse) will catch this in CI/Lighthouse checks if configured |
| Re-running full subnet math on every keystroke without debounce for large-prefix inputs | Noticeable input lag typing a CIDR, especially IPv6 with BigInt math | Debounce or memoize input parsing; only recompute when the CIDR string is syntactically complete enough to be meaningful | Minor at v1 scale (single-user client-side compute), but matters for mobile/low-end-device Lighthouse scores from day one |
| Global 'use client' at page/layout level | Larger JS bundles shipped for pages that are mostly static content (FAQ, examples, related-tool links) | Keep static content (explanatory copy, FAQ, SEO content) as Server Components; isolate only the actual interactive tool as a client component "island" | Shows up immediately in Lighthouse/bundle-analyzer, worsens as more tools + shared UI accumulate JS |
| Client-side crypto/randomness-heavy batch operations (100x UUID generation, or large-block IPv6 host enumeration) blocking the main thread | UI briefly freezes / jank on generate | Cap batch sizes to stated limits (1–100 already specified for UUID) and avoid ever trying to enumerate/list individual IPv6 hosts for large subnets (only present counts, not full lists) | Would break badly if a future feature let users "list all hosts" in a `/48` — explicitly avoid building that |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Reflecting user-supplied `name`/`cidr`/MAC query params directly into HTML (e.g., page `<title>` or meta description built from `?name=`) without escaping | Reflected XSS via crafted shareable URL | Always escape/sanitize any user-controlled URL param before interpolating into HTML, titles, or meta tags; prefer React's default JSX escaping and avoid `dangerouslySetInnerHTML` with param-derived content |
| Building a server-side DNS/WHOIS/vendor lookup proxy without egress restrictions | SSRF risk if the proxy can be tricked into fetching arbitrary internal/attacker-chosen URLs (e.g., a "resolver URL" param) | Hard-code the allowed resolver/vendor-API endpoints server-side; never let client input control the target host of a server-side fetch |
| Treating `crypto.randomUUID()`/UUID output as a security token or session identifier elsewhere in the app later | UUIDs generated purely for display/utility purposes get reused as auth tokens without considering entropy/leakage assumptions | Keep the UUID tool's output purely a utility feature; if authentication/session tokens are ever needed elsewhere in the app, use a separate, purpose-built token generation path, not the public-facing generator's code path |
| Rate-limiting-free `/api/mac-vendor` (or any API route) proxying a third-party service | The route becomes an open proxy/amplification vector for hitting the upstream vendor API, risking the upstream banning the whole app | Apply basic rate limiting (even simple IP-based, via Vercel/Edge middleware) on any API route that forwards to a paid/rate-limited third party |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Generic/unhelpful error messages ("Something went wrong") for DNS/network failures | Engineer can't tell if it's their typo, a real NXDOMAIN, a resolver outage, or their own network — defeats the tool's purpose | Explicitly distinguish and label: invalid input, NXDOMAIN, empty result (NOERROR, no records of that type), resolver timeout, rate-limited, temporary service unavailable — exactly as the brief's error-handling NFR requires |
| Layout shift (CLS) when async result replaces a loading skeleton with a different-sized block | Page jumps as content loads, especially jarring on mobile, actively penalized by the stated CLS-free NFR | Reserve fixed/min-height space for result blocks based on the largest plausible result shape (e.g., DNS multi-record lists, subnet's full field breakdown) before data arrives; use skeleton placeholders sized to match |
| Copy button with no visible confirmation, or confirmation only visible to sighted mouse users | Keyboard/screen-reader users can't tell if copy succeeded; sighted users double-click "just in case," sometimes copying twice or triggering rate-sensitive re-lookups | Pair every copy action with both a visible transient state change (icon/label swap) AND an `aria-live` region announcement, per the accessibility NFR |
| Debounce timing tuned only for "typical" typing speed, ignoring paste-then-edit patterns | User pastes a domain, tool resolves instantly (correct), then immediately re-triggers a second debounced lookup mid-paste-edit if they touch the field again, causing a visible double-flicker | Treat "paste" and "Enter" as an immediate-trigger + debounce-timer-reset event, not just an additional trigger on top of the existing debounce timer |
| MAC input requiring one exact format (colons only, or dashes only) before it will parse | Engineers copy MACs from many different tool outputs (Cisco `.` grouping, Windows `-`, Linux `:`) — a rigid parser feels broken | Accept and auto-normalize all common delimiters/groupings (`:`, `-`, `.`, no delimiter, Cisco triplet grouping) as-you-type, matching the brief's explicit "normalize as the user types" requirement |

## "Looks Done But Isn't" Checklist

- [ ] **IPv6 subnet support:** Often "works" only for the example `/64`/`/48` shown in the demo — verify against `/127`, `/128`, `/1`, and prefixes requiring BigInt math (anything beyond `/74`-ish where host counts exceed 2^53)
- [ ] **DNS error states:** Often only the happy path (valid domain, A record exists) is tested — verify NXDOMAIN, SERVFAIL, a domain with no records of the requested type (empty NOERROR), a syntactically invalid domain, and a resolver timeout all render distinctly
- [ ] **Stale-request cancellation:** Often looks correct in slow manual testing — verify with an automated test that artificially delays an earlier request's response past a later request's response and asserts the UI shows the later result
- [ ] **MAC bit inspection:** Often only handles the "normal" universally-administered unicast case — verify multicast addresses (e.g., `01:00:5e:...`), locally-administered non-randomized addresses (VM MACs), and malformed/too-short/too-long input all produce sensible labeled output, not a crash
- [ ] **Analytics query-param safety:** Often verified only by checking that *known* sensitive params (the ones in the spec) are stripped — verify the default behavior is allow-list (nothing new leaks) by adding a brand-new fake sensitive param name and confirming it's excluded without any code change
- [ ] **CLS-free async states:** Often looks fine on the exact demo data used during development — verify with the largest plausible real result (e.g., a domain with many TXT/MX records, a subnet with the longest possible field labels) that the reserved space doesn't shift
- [ ] **Keyboard-only operation:** Often verified by clicking through with a mouse while glancing at focus rings — verify a full keyboard-only pass (Tab order, `/` focus-input shortcut, `Enter` execute, `Esc` clear) with the mouse physically unplugged/ignored
- [ ] **Bookmarkable URL state round-trip:** Often verified only in the "just generated" direction — verify pasting a saved/shared URL directly into a fresh browser tab reproduces the exact same result, including for malformed/tampered query values (must degrade to a validation error, not a crash)
- [ ] **UUID v7 batch behavior:** Often looks correct because 100 UUIDs "look random and different" — verify explicitly whether same-millisecond ordering is guaranteed or not, and that this matches what's documented/promised to users
- [ ] **Server/client component boundaries:** Often "just works" in dev mode — verify in a production build (`next build && next start`) specifically, since dev mode is more forgiving of hydration mismatches and some issues only surface in production

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| IPv6 Number-precision math bugs shipped to production | MEDIUM | Identify all address-math call sites in `lib/subnet`, convert to BigInt, re-run/expand unit test suite with large-prefix fixtures, redeploy — contained because core logic is isolated per the framework-agnostic `lib/` architecture |
| Silent resolver fallback already shipped and users have bookmarked/shared URLs with misleading results | LOW | Add resolver-used indicator to the UI (no data migration needed, purely additive), fix fallback trigger condition; no backward-compat break since URL state doesn't encode which resolver was used |
| Analytics already collected sensitive query params before allow-list fix shipped | HIGH | Requires a data-deletion/purge request to the analytics provider for the affected date range (may not be fully possible depending on provider retention/export controls) plus a written incident note — this is the costliest pitfall to recover from because data exposure, once collected by a third party, may not be fully retractable; strongly prioritize preventing this over any other item in this document |
| Hydration mismatches discovered after multiple tools already built on the same flawed client-island pattern | MEDIUM-HIGH | Fix the pattern in the shared `components/` layer once, then each tool page needs a targeted re-verification pass (not a full rewrite, since core logic in `lib/` is unaffected) — cost scales with number of tools already shipped, which is why Pitfall 9 should be resolved during the very first tool (UUID) |
| MAC randomization heuristic mislabeled as certain fact, already published/indexed | LOW | Copy/wording change only (add "likely" hedge, expose raw bits) — no data model change, ships as a normal content fix |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|----------------|
| UUID v7 randomness source / batch ordering (Pitfall 10) | UUID Generator (Phase 1) | Unit test asserts `crypto.getRandomValues` (not `Math.random`) is used; documented/tested behavior for same-millisecond batch ordering |
| Hydration mismatch from client-only logic in initial render (Pitfall 9) | UUID Generator (Phase 1) — sets the client-island pattern for all later tools | Production build (`next build && next start`) shows zero hydration-mismatch console warnings; visual check for no flash-of-different-value on load |
| Analytics allow-list for sensitive URL params (Pitfall 8) | Shared site-shell (Phase 1, before/alongside first tool with sensitive URL state) | Add a fake never-seen-before sensitive param name to a test URL, confirm it's excluded from the analytics call without any code change |
| IPv6 Number-precision overflow (Pitfall 1) | IP Subnet Calculator (Phase 2) | Unit/property-based tests covering `/32`, `/48`, `/64`, `/80`+ host-count and address math using BigInt |
| /31, /32, /127, /128 boundary handling (Pitfall 2) | IP Subnet Calculator (Phase 2) | Explicit unit test fixtures for all four boundary prefixes in both IPv4 and IPv6 |
| RFC 5952 IPv6 normalization (Pitfall 3) | IP Subnet Calculator (Phase 2) | Round-trip tests: multiple valid textual inputs for the same address normalize to one canonical output |
| DoH RCODE-vs-HTTP-status handling (Pitfall 4) | DNS Lookup (Phase 3) | Test fixtures/mocks for NOERROR-empty, NXDOMAIN, SERVFAIL responses each render a distinct UI state |
| Stale async request race conditions (Pitfall 5) | DNS Lookup (Phase 3) | Automated test simulating out-of-order response resolution; `AbortController` + request-generation-counter both present |
| Silent resolver fallback masking differing results (Pitfall 6) | DNS Lookup (Phase 3) | UI always displays which resolver produced the result; fallback only triggers on network/timeout failure, not on legitimate NXDOMAIN/empty |
| MAC locally-administered vs. randomized conflation (Pitfall 7) | MAC Address Inspector (Phase 4) | Copy review confirms hedged ("likely") language; raw U/L and I/G bits exposed in output, not just a boolean verdict |
| Local OUI dataset not shipped to client as raw JSON (Performance Trap) | MAC Address Inspector (Phase 4) | Bundle-size/Lighthouse check confirms no multi-thousand-entry dataset in client JS payload |

## Sources

- [DNS over HTTPS — Wikipedia](https://en.wikipedia.org/wiki/DNS_over_HTTPS) — MEDIUM confidence (general web search, cross-checked against known RFC 8484 scope)
- [Using JSON — Cloudflare Docs](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/) — MEDIUM confidence
- [DNS over HTTPS JSON API needs some tweaks — Cloudflare Community](https://community.cloudflare.com/t/dns-over-https-json-api-needs-some-tweaks/14728) — MEDIUM confidence (community report of TXT-quoting divergence)
- [draft-ietf-doh-dns-over-https-14](https://datatracker.ietf.org/doc/html/draft-ietf-doh-dns-over-https-14) — HIGH confidence (IETF draft/RFC lineage for RFC 8484)
- IPv6 Subnet Calculator references (IO Tools, Networking Toolbox, ipcalc.info, Gcore) — MEDIUM confidence, cross-checked against RFC 5952 (zero-compression canonical form) and RFC 6164/RFC 3021 (/127, /31 point-to-point special cases), which are HIGH-confidence standards knowledge
- [Cisco DNA Center Q&A for Randomized MAC Addresses](https://www.cisco.com/c/en/us/td/docs/cloud-systems-management/network-automation-and-management/dna-center/tech_notes/b_randomized_mac_addresses.html) — MEDIUM confidence
- [Nzyme — What are random MAC addresses](https://www.nzyme.org/knowledge/wifi/random-mac-addresses) — MEDIUM confidence
- [draft-ietf-madinas-mac-address-randomization](https://datatracker.ietf.org/doc/html/draft-ietf-madinas-mac-address-randomization-06) — HIGH confidence (IETF draft), cross-checked against IEEE 802 U/L and I/G bit definitions (HIGH-confidence standards knowledge)
- Next.js App Router hydration-mismatch articles (LogRocket, Medium, OneUptime) — MEDIUM confidence, cross-checked against React/Next.js official hydration-error documentation behavior (server/client render divergence, browser-API-during-render causes) which is HIGH-confidence framework knowledge
- [Cloudflare vs Google DNS comparisons](https://5gstore.com/blog/2026/03/03/google-dns-vs-cloudfare-dns/) — MEDIUM confidence (retention-policy claims should be re-verified against each provider's current privacy policy before final resolver selection in the DNS Lookup phase)
- [PII examples: what not to send to analytics — Plausible Analytics](https://plausible.io/blog/pii-examples) — MEDIUM confidence
- [Data Redaction in Google Analytics 4](https://www.analyticsmania.com/post/data-redaction-in-ga4/) — MEDIUM confidence
- RFC 9562 (UUID) — HIGH confidence, own model knowledge of the specification (v7 timestamp+random structure, cryptographic randomness requirement, no cross-instance same-millisecond ordering guarantee)

---
*Pitfalls research for: Network/infrastructure utility website (Packetory)*
*Researched: 2026-07-21*
