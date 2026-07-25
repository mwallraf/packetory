# Phase 5: MAC Address Inspector - Pattern Map

**Mapped:** 2026-07-25
**Files analyzed:** 14
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/mac/parse.ts` | utility | transform | `lib/dns/validate.ts` | exact (total-function, never-throws validation) |
| `lib/mac/classify.ts` | utility | transform | `lib/dns/parse.ts` (normalization) + hand-rolled bit math (no direct analog, pattern is "pure sync transform") | role-match |
| `lib/mac/format.ts` | utility | transform | `lib/dns/parse.ts` | role-match |
| `lib/mac/types.ts` | model | transform | `lib/dns/types.ts` | exact (discriminated-union + error classes convention) |
| `lib/mac/vendor.ts` | service | request-response (client-side fetch + cache) | `lib/dns/resolve.ts` + `lib/dns/query.ts` | role-match (primary/fallback → single-fetch-with-cache variant) |
| `lib/mac/parse.test.ts` / `classify.test.ts` / `format.test.ts` | test | — | `lib/dns/validate.test.ts`, `lib/dns/parse.test.ts` | exact |
| `app/api/mac-vendor/route.ts` | route (API) | request-response, file/network I/O | `app/api/ip/route.ts` | role-match (first upstream-fetching route; `ip/route.ts` is same role/shape but no upstream call — `lib/dns/resolve.ts`'s error-classification supplies the missing "upstream fetch" half) |
| `app/api/mac-vendor/route.test.ts` | test | — | none exists yet — **no analog** (first Route Handler test in codebase) | no analog |
| `app/tools/mac/page.tsx` | component (server shell) | request-response (static) | `app/tools/dns/page.tsx` | exact |
| `app/tools/mac/MacToolLoader.tsx` | component (client boundary) | — | `app/tools/dns/DnsToolLoader.tsx` | exact |
| `app/tools/mac/MacTool.tsx` | component (client island) | event-driven, streaming (debounced async) | `app/tools/dns/DnsTool.tsx` | exact |
| `app/tools/mac/MacTool.test.tsx` | test | — | `app/tools/dns/DnsTool.test.tsx` | exact |
| `app/tools/mac/faq-data.ts` | config | — | `app/tools/dns/faq-data.ts` | exact |
| `tools/registry.ts` (modify: `mac.status` → `"active"`, `mac.clientOnly` → confirm) | config | CRUD (single-field edit) | itself (existing `mac` entry) | exact |
| `lib/analytics/redact.ts` (NOT modified — verify no `mac`/`oui` added) | utility | — | itself | n/a — regression guard only |
| `tests/e2e/mac-lookup.spec.ts` | test | event-driven (e2e) | `tests/e2e/ip-widget.spec.ts` (per RESEARCH.md's route-mocking note) | role-match |

## Pattern Assignments

### `lib/mac/parse.ts` (utility, transform)

**Analog:** `lib/dns/validate.ts` (38 lines, read in full)

**Header/contract pattern** (lines 1-11):
```typescript
/**
 * Framework-agnostic domain-name input validation (DNS-01, QUAL-08's
 * "invalid input" state, T-04-02). No React/Next import — independently
 * testable, mirrors `lib/subnet/parse.ts`'s no-throw total-function
 * contract.
 * ...
 * `isValidDomainInput` is a total function: it never throws for any string
 * input, however pathological (T-04-02 ReDoS mitigation).
 */
```

**Core pattern** (lines 13-38) — bounded regex declared as module constant, single exported total function, never throws:
```typescript
const LABEL_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
export const MAX_DOMAIN_LENGTH = 253;

export function isValidDomainInput(raw: string): boolean {
  const trimmed = raw.trim().replace(/\.$/, "");
  if (!trimmed || trimmed.length > MAX_DOMAIN_LENGTH) return false;
  const labels = trimmed.split(".");
  if (labels.length < 1) return false;
  return labels.every((label) => label.length <= 63 && LABEL_RE.test(label));
}
```

**Apply to `lib/mac/parse.ts`:** same total-function/never-throws contract, module-doc explaining WHY this input class needs no bounded/backtracking-safe regex (RESEARCH.md Pitfall 4 explicitly calls this out — a plain `.replace(/[^0-9A-Fa-f]/g, "")` + `.length === 12` check is sufficient, do not over-copy DNS's bounded-regex defensiveness where it isn't needed). Return a discriminated union (`ParsedMac`) rather than boolean, per RESEARCH.md's Pattern 1 code example — closer to `lib/subnet/parse.ts`'s `ParsedCidr`/`ParseError` shape than to DNS's boolean return; check `lib/subnet/parse.ts` if more detail is needed on the discriminated-union return convention.

---

### `lib/mac/classify.ts` and `lib/mac/format.ts` (utility, transform)

**Analog:** `lib/dns/parse.ts` (pure, framework-agnostic, no network — same "compute synchronously from already-validated input" shape). RESEARCH.md's own Pattern 2/Code-Examples sections already contain the exact target implementation for both files — copy those directly (they were derived from this codebase's conventions, live-verified against `maclookup.app`'s own `isRand` field). Match documentation-comment style to `lib/dns/types.ts`'s block-comment convention (explain the WHY — e.g. "must never read from the vendor response," citing MAC-08 — not just the WHAT).

---

### `lib/mac/types.ts` (model)

**Analog:** `lib/dns/types.ts` (141 lines, read in full)

**Discriminated-union UI-state pattern** (lines 91-112) — every non-idle, non-success variant carries `lastValidResult`/equivalent so the UI can dim-and-keep rather than blank (direct precedent for MAC's D-07):
```typescript
export type DnsLookupState =
  | { status: "idle" }
  | { status: "invalid-input"; message: string; lastValidResult: DnsSuccessResult | null }
  | { status: "loading"; lastValidResult: DnsSuccessResult | null }
  | { status: "success"; result: DnsSuccessResult }
  | { status: "rate-limited"; lastValidResult: DnsSuccessResult | null }
  | { status: "resolver-unavailable"; lastValidResult: DnsSuccessResult | null };
```

**Typed-error-class pattern** (lines 118-141) — one class per distinctly-handled failure mode, never a generic thrown string:
```typescript
export class RateLimitError extends Error {
  constructor() { super("Rate limited by DNS resolver"); this.name = "RateLimitError"; }
}
export class ResolverFailureError extends Error {
  status: number | null;
  constructor(status: number | null = null) {
    super(status !== null ? `DNS resolver responded with HTTP ${status}` : "DNS resolver request failed");
    this.name = "ResolverFailureError";
    this.status = status;
  }
}
```

**Apply to `lib/mac/types.ts`:** define `VendorState` as a discriminated union (`{kind: "found"; company: string} | {kind: "not-found"} | {kind: "unavailable"} | {kind: "not-applicable"}` — 4 states per RESEARCH.md Open Question 1's resolution) and a `MacLookupState` mirroring `DnsLookupState`'s idle/invalid-input/loading/success/error shape, each carrying the last-valid classification+formats per D-07.

---

### `lib/mac/vendor.ts` (service, request-response)

**Analog:** `lib/dns/query.ts` (single-resolver fetch w/ timeout composition, 63 lines) + `lib/dns/resolve.ts` (classify-response-into-typed-outcome pattern, 91 lines)

**Timeout-composition pattern** (query.ts lines 29-63) — internal `AbortController` merges caller signal + own timeout, cleans up both listeners in `.finally()`:
```typescript
export function queryResolver(name, type, resolverUrl, signal, timeoutMs) {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (signal.aborted) controller.abort();
  else signal.addEventListener("abort", onExternalAbort);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal, headers }).finally(() => {
    clearTimeout(timeoutId);
    signal.removeEventListener("abort", onExternalAbort);
  });
}
```

**Response-classification pattern** (resolve.ts lines 36-69) — one function turns a raw fetch into a typed success or a typed thrown error, no unclassified exceptions escape:
```typescript
async function queryAndClassify(...): Promise<DohResponse> {
  let response: Response;
  try { response = await queryResolver(...); }
  catch (err) { if (signal.aborted) throw err; throw new ResolverFailureError(null); }
  if (response.status === 429) throw new RateLimitError();
  if (!response.ok) throw new ResolverFailureError(response.status);
  let body: DohResponse;
  try { body = (await response.json()) as DohResponse; }
  catch { throw new ResolverFailureError(response.status); }
  return body;
}
```

**Apply to `lib/mac/vendor.ts`:** single-endpoint (no primary/fallback needed — `/api/mac-vendor` itself already never throws, per Pattern 3 in RESEARCH.md, always 200 with a `status` field), so this file is simpler than `resolve.ts` — closer to RESEARCH.md's own "Client-side session OUI cache + debounce" code example (already copy-ready). Reuse the session `Map<string, VendorState>` cache-before-fetch shape shown there; reuse `query.ts`'s AbortController-merge idiom if the caller needs its own cancellation on top of the shared `AbortController` already used by `MacTool.tsx`'s debounce.

---

### `app/api/mac-vendor/route.ts` (route, request-response + network I/O)

**Analog:** `app/api/ip/route.ts` (24 lines, read in full) — same role and Route-Handler shape, but `ip/route.ts` has no upstream fetch, so also draw the upstream-fetch-with-bounded-timeout half from `lib/dns/query.ts`.

**Full existing route for structural reference** (all 24 lines):
```typescript
import { NextRequest, NextResponse } from "next/server";
import { parseForwardedIp } from "@/lib/network/parseForwardedIp";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = parseForwardedIp(request.headers);
  return NextResponse.json(
    { ip },
    { headers: { "Cache-Control": "no-store" } }
  );
}
```

**Apply to `app/api/mac-vendor/route.ts`:** same `export const dynamic = "force-dynamic"` (per-request, no caching), same doc-comment style explaining privacy rationale up top, same `NextResponse.json(..., { headers: { "Cache-Control": "no-store" } })` response shape. RESEARCH.md's Pattern 3 section already contains the full target implementation (validate `oui` regex, fetch with `AbortSignal.timeout(4000)`, classify into `{status: "ok"|"unavailable", ...}`, always 200) — copy that directly; it is this codebase's own convention applied to the new upstream-fetch case, cross-referenced against `lib/dns/resolve.ts`'s try/catch-per-failure-mode structure above.

---

### `app/tools/mac/page.tsx` (component, server shell)

**Analog:** `app/tools/dns/page.tsx` (143 lines; first 50 read)

**Metadata + canonical URL pattern** (lines 1-28):
```typescript
import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { DnsToolLoader } from "./DnsToolLoader";
import { faqItems, sampleDomain, sampleFields, sampleRecordType, workedExampleNote } from "./faq-data";

const TITLE = "DNS Lookup (...) — Packetory";
const DESCRIPTION = "...";
const CANONICAL_URL = `${SITE_URL}/tools/dns`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CANONICAL_URL, type: "website" },
};
```

**FAQPage JSON-LD pattern** (lines 30-47) — built from the same `faqItems` array rendered on-page, `<` escaped:
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
```

**Apply to `app/tools/mac/page.tsx`:** same structure — swap `DnsToolLoader` → `MacToolLoader`, `faq-data.ts` imports, title/description copy for MAC. Server Component shell never destructures `searchParams` (Integration Points note in CONTEXT.md — matches DNS's own rationale for `ssr:false`).

---

### `app/tools/mac/MacToolLoader.tsx` (component, client boundary)

**Analog:** `app/tools/dns/DnsToolLoader.tsx` (49 lines, read in full) — copy near-verbatim:
```typescript
"use client";
import dynamic from "next/dynamic";

const DnsTool = dynamic(() => import("./DnsTool").then((mod) => mod.DnsTool), {
  ssr: false,
  loading: () => <DnsToolSkeleton />,
});

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
**Apply to `MacToolLoader.tsx`:** rename symbols (`MacTool`, `mac-tool-skeleton`), keep the `ssr:false` + fixed-height skeleton pair (both loader-level and tool-mount-level skeletons stay in sync per the DNS precedent's own internal comment about "exactly one of the two is ever present in the DOM at a time").

---

### `app/tools/mac/MacTool.tsx` (component, client island, event-driven/debounced)

**Analog:** `app/tools/dns/DnsTool.tsx` (822 lines; read lines 1-280 covering imports, URL-state read/write, debounce constant, error classification, skeleton, and a per-row copy-button component)

**Imports pattern** (lines 1-32):
```typescript
"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Clock, Copy, Inbox, Loader2, RefreshCw, SearchX, TriangleAlert, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { isValidDomainInput } from "@/lib/dns/validate";
import { resolveWithFallback } from "@/lib/dns/resolve";
import { normalizeRecords } from "@/lib/dns/parse";
import { RateLimitError, RECORD_TYPES, type DnsLookupState, ... } from "@/lib/dns/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
```

**Debounce/default constants pattern** (lines 34-49):
```typescript
const DEFAULT_DOMAIN = "cloudflare.com";
const DEFAULT_TYPE: RecordType = "A";
const DEBOUNCE_MS = 700;
const INVALID_DOMAIN_MESSAGE = "Enter a valid domain name, like cloudflare.com or example.co.uk.";
```
**Apply to MAC:** `DEFAULT_MAC` (a real recognizable OUI per D-06), `DEBOUNCE_MS` in the 400-600ms range per D-03.

**URL-state read/write pattern** (lines 67-102) — client-only, raw History API, never `router.replace()`:
```typescript
function getInitialLookupFromUrl(): { domain: string; type: RecordType } {
  if (typeof window === "undefined") return { domain: DEFAULT_DOMAIN, type: DEFAULT_TYPE };
  const params = new URLSearchParams(window.location.search);
  const rawName = params.get("name");
  const domain = rawName && isValidDomainInput(rawName) ? rawName : DEFAULT_DOMAIN;
  ...
}
function syncUrlToLookup(domain: string, type: RecordType): void {
  const params = new URLSearchParams();
  params.set("name", domain);
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", url);
}
```
**Apply to MAC:** optional per RESEARCH.md Open Question 2 (not required by any MAC-* requirement) — if implemented, use `?mac=` with the same `window.history.replaceState` idiom, and explicitly confirm `mac`/`oui` is never added to `DEFAULT_ALLOW_LIST`.

**Keep-last-valid-visible pattern** (lines 104-112):
```typescript
function lastValidResultFrom(lookup: DnsLookupState): DnsSuccessResult | null {
  if (lookup.status === "success") return lookup.result;
  if (lookup.status === "idle") return null;
  return lookup.lastValidResult;
}
```

**Typed-error classification pattern** (lines 122-130):
```typescript
function classifyError(err: unknown, lastValidResult: DnsSuccessResult | null): DnsLookupState {
  if (err instanceof RateLimitError) return { status: "rate-limited", lastValidResult };
  return { status: "resolver-unavailable", lastValidResult };
}
```
**Apply to MAC:** classify vendor-fetch outcomes into the 4-state `VendorState` union (found / not-found / unavailable / not-applicable) rather than a 2-state split — see `lib/mac/types.ts` section above.

**Per-field copy button pattern** (lines 160-259) — each copyable value owns its own `useCopyToClipboard()` instance, resets on value change, icon-swap + `aria-live="polite"` sr-only announcement, 44x44 hit target:
```typescript
function DnsRecordRow({ index, record, recordType }) {
  const { copy, copied, error, reset } = useCopyToClipboard();
  useEffect(() => { reset(); }, [record.value]);
  return (
    <div data-testid={`dns-record-row-${index}`} className="...">
      <span data-testid="dns-record-value" className="font-mono ...">{record.value}</span>
      <button
        type="button"
        onClick={() => copy(record.value)}
        aria-label={copied ? "Copied!" : "Copy record value"}
        data-testid={`dns-copy-record-${index}`}
        className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-primary outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
      </button>
      <span aria-live="polite" className="sr-only" data-testid={`dns-copy-record-${index}-status`}>
        {copied ? "Copied!" : ""}
      </span>
      {error && <span className="text-[14px] ... text-muted-foreground">Couldn&apos;t copy — select the text and copy manually.</span>}
    </div>
  );
}
```
**Apply to MAC:** one instance of this per copyable field — the 4 format variants (colon/dash/dot/none), OUI, and full result (D-05/MAC-09). Reuse `data-testid` naming convention (`mac-copy-<field>`), reuse the exact aria-label/error copy strings verbatim.

**Icon+label+explanation badge pattern:** see `NxdomainCard` (lines 261-280+, DNS's neutral-state card) for the icon/label/explanation-line layout shape referenced by D-08's U/L and I/G badges and D-09's randomization hedge — replicate the `data-testid="dns-state-nxdomain"` → icon + heading + explanatory `<span>` structure for each MAC badge.

---

### `app/tools/mac/faq-data.ts` (config)

**Analog:** `app/tools/dns/faq-data.ts` — exports `faqItems`, a `sample*`/worked-example set of constants consumed by both `page.tsx` (JSON-LD) and the tool component. Mirror the same export shape (`faqItems: {question, answer}[]`, plus MAC-specific worked-example constants like a sample MAC/vendor pair).

---

### `tools/registry.ts` (config, single-field edit)

**Analog:** itself — existing `mac` entry (lines 64-76 of `tools/registry.ts`):
```typescript
{
  slug: "mac",
  name: "MAC Address Inspector",
  shortName: "MAC",
  description: "Normalize MAC addresses as you type, look up the vendor/OUI, and detect locally/universally administered, unicast/multicast, and randomized addressing.",
  category: "network",
  keywords: ["mac", "oui", "vendor", "ethernet"],
  icon: "Cpu",
  status: "planned",   // <- flip to "active"
  clientOnly: false,   // <- already correctly false (this tool has a server-side API route, unlike UUID/Subnet/DNS which are all clientOnly: true)
  featured: false,
},
```
**Apply:** the only required edit is `status: "planned"` → `status: "active"` once the page ships. `clientOnly: false` is already correct and should NOT be changed to `true` — this is intentionally the first non-clientOnly tool (it has a genuine server-side API route).

---

## Shared Patterns

### Total-function, never-throws input validation
**Source:** `lib/dns/validate.ts` (whole file)
**Apply to:** `lib/mac/parse.ts`
Never throw on malformed/partial input; return a discriminated union or boolean; validate length/format BEFORE any regex runs, to keep parsing trivially non-backtracking (Pitfall 4 in RESEARCH.md: MAC needs no bounded-regex defensiveness at all — simpler than DNS's).

### Server-side re-validation of client-validated input (defense in depth)
**Source:** RESEARCH.md Pattern 3 / `app/api/mac-vendor/route.ts`'s planned `OUI_RE` check
**Apply to:** `app/api/mac-vendor/route.ts`
The route re-validates `oui` independently of any client-side check, since it's a public endpoint reachable directly. Mirrors `lib/dns/query.ts`'s "hardcoded upstream URL literal, only params come from user input" discipline — never string-concatenate unsanitized input into the upstream URL.

### Copy-to-clipboard with visible + accessible confirmation
**Source:** `lib/hooks/useCopyToClipboard.ts` (whole file, 70 lines) + `DnsRecordRow`'s consumption pattern (`app/tools/dns/DnsTool.tsx` lines 160-259)
**Apply to:** every copyable field in `MacTool.tsx` (4 formats + OUI + full result)
```typescript
const { copy, copied, error, reset } = useCopyToClipboard();
```
One hook instance per copyable value (never shared across fields), `reset()` on an `useEffect` keyed to the underlying value so a stale "Copied!" never lingers next to a changed value.

### Keyboard shortcuts (`/` focus, `Enter`, `Esc`)
**Source:** `lib/hooks/useKeyboardShortcut.ts` (126 lines, referenced but not read in full this pass — read directly for hookup detail during planning; already used identically by `DnsTool.tsx` line 17's import)
**Apply to:** `MacTool.tsx`'s input field, same as DNS/Subnet.

### Analytics redaction is safe-by-default — do not extend
**Source:** `lib/analytics/redact.ts` (whole file, 77 lines)
**Apply to:** MAC-10 is satisfied by NOT adding `mac`/`oui` to `DEFAULT_ALLOW_LIST` (currently `[]`). No code change needed in this file for this phase — only a regression-guard test assertion (per RESEARCH.md Wave 0 Gaps) that the allow-list still excludes `mac`/`oui`.

### Discriminated-union UI state with "last valid result" carried on every non-success variant
**Source:** `lib/dns/types.ts` lines 91-112 (`DnsLookupState`)
**Apply to:** `lib/mac/types.ts`'s `MacLookupState` — every branch besides `idle`/`success` carries the last valid classification+formats, enabling D-07's dim-don't-blank behavior.

### Bounded-timeout upstream fetch, classified into typed non-throwing outcomes
**Source:** `lib/dns/query.ts` (AbortController+timeout composition) + `lib/dns/resolve.ts`'s `queryAndClassify` (try/catch → typed result, never an unclassified throw escapes)
**Apply to:** `app/api/mac-vendor/route.ts` (server-side, `AbortSignal.timeout(4000)` per RESEARCH.md Pattern 3) and `lib/mac/vendor.ts` (client-side fetch to the internal route, with the session cache layered on top per RESEARCH.md's own code example).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `app/api/mac-vendor/route.test.ts` | test | — | First Route Handler unit test in the codebase (`app/api/ip/route.ts` has no test file yet). RESEARCH.md's "Wave 0 Gaps" section specifies the exact approach to use instead: import the exported `GET` function directly, construct a `NextRequest` via `new NextRequest("http://localhost/api/mac-vendor?oui=3C22FB")`, mock global `fetch` with `vi.stubGlobal("fetch", ...)`, assert on the returned `NextResponse`'s `.status`/`await .json()`. No new test-infra package required. |

## Metadata

**Analog search scope:** `lib/dns/`, `lib/hooks/`, `lib/analytics/`, `app/tools/dns/`, `app/api/ip/`, `tools/registry.ts` — all read directly.
**Files scanned:** 12 read in full or targeted sections (validate.ts, query.ts, resolve.ts, types.ts, DnsTool.tsx [partial, 280/822 lines], DnsToolLoader.tsx, page.tsx [partial], useCopyToClipboard.ts, redact.ts, registry.ts, app/api/ip/route.ts).
**Pattern extraction date:** 2026-07-25
