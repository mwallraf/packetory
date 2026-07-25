# Phase 4: DNS Lookup - Pattern Map

**Mapped:** 2026-07-24
**Files analyzed:** 12 (new) + 2 (modified)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `lib/dns/types.ts` | model | transform | `lib/subnet/parse.ts` (types section) | role-match |
| `lib/dns/validate.ts` | utility | transform | `lib/subnet/parse.ts` (`parseCidr`/regex validation) | exact |
| `lib/dns/query.ts` | service | request-response | none (new territory: fetch wrapper) — nearest is `components/IpBadge.tsx`'s `fetch("/api/ip")` call | partial |
| `lib/dns/resolve.ts` | service | request-response + event-driven (abort/fallback) | none (new territory) — nearest is `components/IpBadge.tsx`'s cancellation-flag fetch pattern | partial |
| `lib/dns/parse.ts` | utility | transform | `lib/subnet/format.ts` / `lib/subnet/parse.ts` (pure normalization functions) | role-match |
| `app/tools/dns/page.tsx` | route (server shell) | request-response (static) | `app/tools/subnet/page.tsx` | exact |
| `app/tools/dns/DnsToolLoader.tsx` | component (client boundary) | request-response | `app/tools/subnet/SubnetToolLoader.tsx` | exact |
| `app/tools/dns/DnsTool.tsx` | component (client island) | streaming/event-driven (debounce+abort) | `app/tools/subnet/SubnetTool.tsx` (state/URL/keyboard shell) + `app/tools/uuid/UuidTool.tsx` (toggle-group) | role-match (composite) |
| `app/tools/dns/faq-data.ts` | config/content | static | `app/tools/subnet/faq-data.ts` | exact |
| `tools/registry.ts` | config | CRUD (status flip) | itself — only the `dns` entry's `status` field changes | exact |
| `tests/e2e/dns-lookup.spec.ts` | test | event-driven (mocked network) | `tests/e2e/ip-widget.spec.ts` | exact |
| `lib/dns/*.test.ts` (validate/query/resolve/parse) | test | transform | `lib/subnet/parse.test.ts`, `lib/subnet/format.test.ts` | exact |

## Pattern Assignments

### `lib/dns/validate.ts` (utility, transform)

**Analog:** `lib/subnet/parse.ts`

**Header/framework-agnostic contract** (lines 1-18):
```typescript
/**
 * Framework-agnostic CIDR string parser (SUBNET-01, D-03). No React/Next
 * import — independently testable and reusable by pages and future API
 * routes...
 * `parseCidr` is a total function: malformed input always returns a typed
 * `ParseError`, never throws...
 */
```
Copy this exact contract style for `isValidDomainInput`: no React import, total function (never throws), typed result. RESEARCH.md already supplies the concrete implementation (ReDoS-safe, bounded `LABEL_RE`, no backtracking) — mirror `lib/subnet/parse.ts`'s bounded-regex precedent (lines 60-64: `/^\d{1,3}$/` non-backtracking prefix check) for the per-label regex.

**Type-guard pattern** (lines 34-39):
```typescript
export function isParseError(
  result: ParsedCidr | ParseError
): result is ParseError {
  return "error" in result;
}
```
Reuse this discriminated-union + type-guard shape for `DnsLookupState` variants (RESEARCH.md's `DnsLookupState` union already follows this convention).

### `lib/dns/query.ts` + `lib/dns/resolve.ts` (service, request-response/event-driven)

**No direct codebase analog** — this is genuinely new territory (first external async dependency). Closest partial precedent: `components/IpBadge.tsx`'s fetch + cancellation-flag pattern (lines 27-45):
```typescript
useEffect(() => {
  let cancelled = false;
  fetch("/api/ip", { cache: "no-store" })
    .then((res) => res.json())
    .then((data) => {
      if (cancelled) return;
      setState(...);
    })
    .catch(() => {
      if (!cancelled) setState({ status: "unavailable" });
    });
  return () => { cancelled = true; };
}, []);
```
`lib/dns/resolve.ts` must use the stronger `AbortController` + sequence-token form specified in RESEARCH.md Pattern 2 (not the boolean-flag form) — RESEARCH.md explicitly notes IpBadge's flag variant as the weaker precedent DNS should upgrade from. Follow RESEARCH.md's own code examples for `resolveWithFallback`/`queryResolver` verbatim; there is no existing multi-endpoint-fallback code in this repo to copy structure from.

### `lib/dns/parse.ts` (utility, transform)

**Analog:** `lib/subnet/format.ts` and `lib/subnet/parse.ts` — pure, framework-agnostic, no-throw transform functions operating on validated input. Follow the same "small named pure functions, each independently unit-tested" decomposition (`stripTrailingDot`, `normalizeValue`, `normalizeRecords` — already spec'd in RESEARCH.md Pattern 4) rather than one large function.

### `app/tools/dns/page.tsx` (route, server shell)

**Analog:** `app/tools/subnet/page.tsx`

**Metadata + canonical pattern** (lines 1-28):
```typescript
import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { SubnetToolLoader } from "./SubnetToolLoader";
import { faqItems, sampleIpv4, ... } from "./faq-data";

const TITLE = "IP Subnet Calculator (IPv4 & IPv6) — Packetory";
const DESCRIPTION = "...";
const CANONICAL_URL = `${SITE_URL}/tools/subnet`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CANONICAL_URL, type: "website" },
};
```
Copy verbatim structure for `/tools/dns`, swapping title/description per DNS copy, `CANONICAL_URL` → `${SITE_URL}/tools/dns`.

**FAQPage JSON-LD pattern** (lines 39-47, 60-65):
```typescript
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};
// ...
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
/>
```
Reuse exactly — the `<` escape is a locked XSS mitigation precedent (T-03-01/T-02-04), and `faqJsonLd` must be built from the same `faqItems` array rendered on-page (no drift).

**Server-shell no-searchParams contract**: `page.tsx` "takes no props and reads no request-time query-string API" (lines 49-56) — DNS's `page.tsx` must follow this identically; `?name=&type=` is read only inside the client island (`DnsTool.tsx`), never destructured here, to keep the route statically prerendered.

### `app/tools/dns/DnsToolLoader.tsx` (component, client boundary)

**Analog:** `app/tools/subnet/SubnetToolLoader.tsx` (full file, 49 lines) — copy near-verbatim:
```typescript
"use client";
import dynamic from "next/dynamic";

const DnsTool = dynamic(
  () => import("./DnsTool").then((mod) => mod.DnsTool),
  { ssr: false, loading: () => <DnsToolSkeleton /> }
);

function DnsToolSkeleton() {
  return (
    <div
      aria-hidden="true"
      data-testid="dns-tool-skeleton"
      className="h-[420px] animate-pulse rounded-md border border-border bg-secondary"
    />
  );
}

export function DnsToolLoader() {
  return <DnsTool />;
}
```
Rationale for `ssr:false` is the same as Subnet's: `?name=&type=` must be read via `window.location.search`, never the server `searchParams` prop (D-08's skeleton-height requirement is the same CLS-free precedent).

### `app/tools/dns/DnsTool.tsx` (component, client island)

**Primary analog:** `app/tools/subnet/SubnetTool.tsx` — for URL-state read/write, keyboard shortcuts, "keep last valid result visible" state shape, and copyable-field component.

**URL-state read pattern** (lines 87-100):
```typescript
function getInitialCidrFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("cidr");
}

function syncCidrToUrl(cidr: string): void {
  const url = `${window.location.pathname}?cidr=${encodeURIComponent(cidr)}`;
  window.history.replaceState(null, "", url);
}
```
Adapt to two params (`name`+`type`) — build the query string with both via `URLSearchParams` rather than manual concatenation, since DNS has 2 keys vs. Subnet's 1. Per RESEARCH.md Assumption A2, sync only when a lookup actually commits (debounce fires or an immediate trigger runs) — not on every keystroke, unlike Subnet's every-valid-keystroke sync.

**Keep-last-valid-result state shape** (lines 102-113):
```typescript
type SubnetToolState = {
  rawCidr: string;
  lastValidCidr: string;
  urlFallbackNote: string | null;
};
```
Direct precedent for `DnsLookupState`'s `lastValidResult` field carried through every non-success variant (RESEARCH.md's discriminated union already follows this shape).

**`useKeyboardShortcut` wiring** (lines 297-302):
```typescript
useKeyboardShortcut({
  slash: () => inputRef.current?.focus(),
  enter: () => inputRef.current?.blur(),
  escape: () => handleReset(),
  copy: () => copyHero(heroValue),
});
```
DNS-03 requires Enter to resolve immediately (not just blur) — call `runLookupImmediate` from the `enter` handler instead of `.blur()`.

**Copyable-field component** (lines 122-199, `CopyableField`): reuse verbatim structure — own `useCopyToClipboard()` instance per field, `useEffect` reset on value change, icon+label swap, `aria-live="polite"` sr-only status span, "Couldn't copy" fallback text. Apply this to each DNS record row (value + TTL).

**Secondary analog for record-type selector:** `app/tools/uuid/UuidTool.tsx`, ToggleGroup pattern (lines 197-219, 313-344):
```typescript
<ToggleGroup
  type="single"
  variant="outline"
  value={state.version}
  onValueChange={handleVersionChange}
  aria-labelledby="uuid-version-label"
  data-testid="uuid-version-toggle"
>
  <ToggleGroupItem value="v4" ... className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
    v4
  </ToggleGroupItem>
  ...
</ToggleGroup>
```
Reuse for the 6-way A/AAAA/MX/TXT/NS/CNAME segmented control (D-09). **Critical guard to copy** (lines 120-123, 154-160 comment): Radix's single-select `ToggleGroup` emits `""` on deselect (clicking the already-active item) — every `onValueChange` handler MUST early-return on an invalid/empty value so exactly one type stays selected. This exact pitfall is called out again in RESEARCH.md's Anti-Patterns section.

**Debounce/abort/fallback orchestration**: no existing analog — implement per RESEARCH.md Patterns 1-3 code examples directly (debounce timer via `useRef`, `AbortController` + `requestSeqRef` sequence token, explicit primary→fallback branching). This is the one part of `DnsTool.tsx` with no codebase precedent to copy from.

**Loading/dim-with-spinner state (D-07)**: no direct analog exists (Subnet's invalid-input state keeps full brightness with an inline message, not a dimmed overlay). Implement fresh per D-07's spec — reduced opacity wrapper + spinner icon over the last valid result — but reuse the "never blank/never fully clear" *principle* from Subnet's `lastValidCidr` pattern.

### `app/tools/dns/faq-data.ts` (config/content)

**Analog:** `app/tools/subnet/faq-data.ts` (full file, 88 lines) — copy structure exactly:
```typescript
export type FaqItem = { question: string; answer: string };
export const faqItems: FaqItem[] = [ /* ... */ ];
export const sampleIpv4 = "192.168.1.0/24"; // -> sampleDomain = "cloudflare.com"
export const sampleIpv4Fields = { /* hand-verified literal constants */ };
export const workedExampleNote = "...";
```
Per the header comment's own convention (lines 8-22): worked-example field values must be literal, hand-verified constants (not computed at render time) — run the actual DoH query for `cloudflare.com` type `A` during planning/implementation and hardcode the real response fields, exactly as Subnet's IPv4/IPv6 samples were hand-verified via `npx tsx`.

### `tools/registry.ts` (config, CRUD)

**Analog:** itself. Only change required (per CONTEXT.md "Integration Points" and RESEARCH.md "Registry-driven activation"): flip the existing `dns` entry's `status: "planned"` (line 60) to `status: "active"`, and `clientOnly: false` (line 61) to `clientOnly: true` (DNS resolution happens entirely client-side via `fetch()`, matching `uuid`'s and `subnet`'s `clientOnly: true`, not server-dependent like the current placeholder value implies). No other fields need to change; no other shared file requires editing per the registry's own "single source of truth" contract (lines 1-9).

### `tests/e2e/dns-lookup.spec.ts` (test, event-driven)

**Analog:** `tests/e2e/ip-widget.spec.ts` (full file, 89 lines)

**Route-mocking pattern** (lines 10-16):
```typescript
await page.route("**/api/ip", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ip: "203.0.113.7" }),
  })
);
```
Adapt to mock both `**/cloudflare-dns.com/**` and `**/dns.google/**` (RESEARCH.md explicitly calls this out: "must mock both `cloudflare-dns.com` and `dns.google` via `page.route()`, mirrors `tests/e2e/ip-widget.spec.ts`'s pattern"). For the race-safety test (DNS-04), use `route.fulfill()` with an artificial `await new Promise(r => setTimeout(r, ms))` delay on the first mocked request and a fast response on the second, then assert only the second domain's result renders.

**Copy-confirmation assertion pattern** (lines 24-36): reuse verbatim for each DNS record row's copy button — `aria-label` swap assertion + `aria-live` status text assertion + `navigator.clipboard.readText()` assertion.

### `lib/dns/*.test.ts` (test, transform)

**Analog:** `lib/subnet/parse.test.ts`, `lib/subnet/format.test.ts` — standard Vitest unit-test structure for pure framework-agnostic functions, one test file per `lib/dns/` module, mirroring the existing 1:1 module-to-test-file convention in `lib/subnet/` and `lib/uuid/`. For `lib/dns/resolve.test.ts` specifically, use `vi.stubGlobal("fetch", ...)` (no MSW in devDependencies per RESEARCH.md) to construct controllable mock responses/delays for fallback and race-condition assertions.

---

## Shared Patterns

### Copy-to-clipboard
**Source:** `lib/hooks/useCopyToClipboard.ts` (full file, 71 lines)
**Apply to:** Every copyable field in `DnsTool.tsx` (record values, TTL if copyable)
```typescript
export function useCopyToClipboard(revertMs: number = DEFAULT_REVERT_MS) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  // ... copy() writes via navigator.clipboard.writeText, sets copied=true for ~2s
  // ... reset() clears pending confirmation/error immediately — call this
  //     whenever the underlying value changes out from under a visible confirmation
}
```
Each field/row needs its OWN hook instance (per `SubnetTool.tsx`'s `CopyableField` precedent) — never share one instance across multiple copy targets.

### Keyboard shortcuts
**Source:** `lib/hooks/useKeyboardShortcut.ts` (full file, 117 lines)
**Apply to:** `DnsTool.tsx` — `/` focuses the domain input, `Enter` triggers `runLookupImmediate` (not blur, per DNS-03's explicit "Enter resolves immediately" requirement — differs from Subnet's blur-only behavior)
```typescript
export function useKeyboardShortcut(handlers: KeyboardShortcutHandlers): void {
  // single window keydown listener; handlers read from a ref, never
  // re-subscribed on every render; guards against firing inside editable
  // fields / already-interactive controls (see isEditableTarget/isInteractiveTarget)
}
```

### Analytics redaction (explicitly NOT extended)
**Source:** `lib/analytics/redact.ts`
**Apply to:** No file in this phase touches `DEFAULT_ALLOW_LIST` — D-03 locks `name` and `type` as permanently excluded. If any DNS code path emits analytics events, it must call `redactParams()` unchanged and simply never add `name`/`type` to the list. This is a "shared pattern by omission," not an integration point to build.
```typescript
export const DEFAULT_ALLOW_LIST: readonly string[] = []; // do not add "name" or "type" here
```

### URL bookmarkable state (client-only boundary)
**Source:** `app/tools/subnet/SubnetTool.tsx` lines 87-100, `app/tools/subnet/page.tsx` lines 49-56
**Apply to:** `app/tools/dns/DnsTool.tsx` (read/write) + `app/tools/dns/page.tsx` (must NOT destructure `searchParams`)
- Read via `new URLSearchParams(window.location.search)`, never `useSearchParams()`.
- Write via `window.history.replaceState(null, "", url)`, never `router.replace()`.
- `page.tsx` stays a plain static shell with zero request-time API usage, keeping `/tools/dns` statically prerendered.

### Server-shell + client-island split
**Source:** `app/tools/subnet/{page,SubnetToolLoader,SubnetTool}.tsx`
**Apply to:** `app/tools/dns/{page,DnsToolLoader,DnsTool}.tsx`
- `page.tsx`: Server Component, metadata + FAQ JSON-LD + worked example, renders one dynamic subtree.
- `*Loader.tsx`: `"use client"` + `dynamic(..., { ssr: false, loading: () => <Skeleton /> })`, fixed-height skeleton matching the real panel's approximate height (D-08).
- `*Tool.tsx`: the actual interactive island, all client-only URL/state logic lives here.

### "Keep last valid result visible" principle
**Source:** `app/tools/subnet/SubnetTool.tsx` (`lastValidCidr` field + `displayParsed` derivation, lines 106-113, 240-244)
**Apply to:** `DnsTool.tsx`'s `DnsLookupState` — every non-idle, non-success variant carries `lastValidResult: DnsSuccessResult | null` (already specified in RESEARCH.md's discriminated union) so the UI renders from the last good result at reduced opacity (D-07) rather than blanking, extending Subnet's synchronous-invalid-input precedent to DNS's network-latency case.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/dns/query.ts` | service | request-response | No prior direct external-fetch service module exists in `lib/`; `IpBadge.tsx`'s fetch call is component-embedded, not an extracted framework-agnostic module. Build per RESEARCH.md Pattern 3's `queryResolver` code example. |
| `lib/dns/resolve.ts` | service | event-driven (fallback + abort) | First multi-resolver-fallback + `AbortController`/sequence-token orchestration in this codebase (RESEARCH.md explicitly flags this as "new territory, no existing precedent"). Build per RESEARCH.md Patterns 2-3 code examples directly. |
| Debounce timer logic within `DnsTool.tsx` | (embedded in component) | event-driven | No debounce utility or timer-coexistence-with-immediate-triggers code exists anywhere in the codebase yet. Build per RESEARCH.md Pattern 1's code example. |

## Metadata

**Analog search scope:** `app/tools/`, `lib/`, `tools/registry.ts`, `tests/e2e/`, `components/IpBadge.tsx`
**Files scanned:** 24 (all files under `app/tools/subnet/`, `app/tools/uuid/`, `lib/subnet/`, `lib/uuid/`, `lib/hooks/`, `lib/analytics/`, `tools/registry.ts`, `tests/e2e/ip-widget.spec.ts`, `components/IpBadge.tsx`)
**Pattern extraction date:** 2026-07-24
