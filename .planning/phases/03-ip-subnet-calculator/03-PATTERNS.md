# Phase 3: IP Subnet Calculator - Pattern Map

**Mapped:** 2026-07-24
**Files analyzed:** 14
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|----------------|
| `lib/subnet/parse.ts` | utility (pure logic) | transform | `lib/network/parseForwardedIp.ts` | role-match (validation + parse, no framework deps) |
| `lib/subnet/parse.test.ts` | test | transform | `lib/network/parseForwardedIp.test.ts` | role-match |
| `lib/subnet/ipv4.ts` | utility (pure logic) | transform | `lib/uuid/generate.ts` (structure) + RESEARCH.md Pattern 3 (math) | role-match (framework-agnostic module, total function contract) |
| `lib/subnet/ipv4.test.ts` | test | transform | `lib/uuid/generate.test.ts` | role-match (+ needs fast-check, see below) |
| `lib/subnet/ipv6.ts` | utility (pure logic) | transform | `lib/subnet/ipv4.ts` (sibling, once built) / `lib/uuid/generate.ts` | role-match |
| `lib/subnet/ipv6.test.ts` | test | transform | `lib/uuid/generate.test.ts` | role-match |
| `lib/subnet/format.ts` | utility (pure logic) | transform | `lib/uuid/format.ts` | exact (pure reformat module, no side effects, total function) |
| `lib/subnet/format.test.ts` | test | transform | `lib/uuid/format.test.ts` | exact |
| `lib/subnet/reverse-dns.ts` | utility (pure logic) | transform | `lib/uuid/format.ts` | role-match (pure string-formatting derivation) |
| `lib/subnet/reverse-dns.test.ts` | test | transform | `lib/uuid/format.test.ts` | role-match |
| `lib/subnet/subdivide.ts` | utility (pure logic) | transform | `lib/uuid/generate.ts` (bounded/clamped output contract) | role-match |
| `lib/subnet/subdivide.test.ts` | test | transform | `lib/uuid/generate.test.ts` | role-match |
| `app/tools/subnet/page.tsx` | route (server shell) | request-response (static) | `app/tools/uuid/page.tsx` | exact |
| `app/tools/subnet/SubnetToolLoader.tsx` | provider (client boundary) | event-driven | `app/tools/uuid/UuidToolLoader.tsx` | exact |
| `app/tools/subnet/SubnetTool.tsx` | component (client island) | event-driven / CRUD-like (parse-then-render pipeline) | `app/tools/uuid/UuidTool.tsx` | exact (state shape, copy wiring, keyboard shortcuts) |
| `app/tools/subnet/faq-data.ts` | config/content | transform | `app/tools/uuid/faq-data.ts` | exact |
| `tools/registry.ts` (status flip only) | config | CRUD (single field update) | itself, prior Phase 2 flip | exact (no new pattern needed) |

## Pattern Assignments

### `lib/subnet/parse.ts` (utility, transform)

**Analog:** `lib/network/parseForwardedIp.ts` (full file read, 64 lines)

**Framework-agnostic module shape** (lines 1-8):
```typescript
/**
 * Minimal Headers-like accessor so this module stays framework-agnostic
 * ... project-brief.md §8 requires core logic to be independently testable
 */
export type HeaderReader = { get(name: string): string | null };
```
Copy the doc-comment convention (cite the requirement/decision driving the design) and the "no React/Next import" constraint for `lib/subnet/parse.ts`.

**Validation-without-throwing pattern** (lines 27-39, `parseForwardedIp` + `isPlausibleIpLiteral`):
```typescript
export function parseForwardedIp(headers: HeaderReader): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  const candidate = forwardedFor
    ? forwardedFor.split(",")[0]?.trim()
    : headers.get("x-real-ip")?.trim();

  if (!candidate) return null;
  return isPlausibleIpLiteral(candidate) ? candidate : null;
}
```
Apply this shape to `parse.ts`: return `{ family, address: bigint, prefixLength } | ParseError` (a typed error object, per RESEARCH.md's "Pitfall 5-safety" note), never throw for malformed input — mirrors this file's `null`-on-failure contract but with a richer typed-error result per SUBNET-03 (inline validation, no exceptions bubbling to the UI).

**IPv6 syntax validation building block** (lines 53-63, `isValidIpv6`):
```typescript
function isValidIpv6(candidate: string): boolean {
  if (!candidate.includes(":")) return false;
  try {
    new URL(`http://[${candidate}]`);
    return true;
  } catch {
    return false;
  }
}
```
RESEARCH.md's "Don't Hand-Roll" section explicitly calls this out for reuse — `lib/subnet/parse.ts` should call this exact bracket-wrap trick to validate the address portion of a CIDR string before doing prefix-length/BigInt work, rather than writing a new regex.

**IPv4 octet validation** (lines 41-51, `isValidIpv4`): reuse the leading-zero-rejection and per-octet bounds-check idiom (`num >= 0 && num <= 255 && String(num) === part`) when validating the address portion of an IPv4 CIDR before parsing to BigInt.

---

### `lib/subnet/ipv4.ts` / `lib/subnet/ipv6.ts` (utility, transform)

**Analog:** `lib/uuid/generate.ts` (full file read, 45 lines) for module shape/contract; RESEARCH.md's own "Pattern 3" code block for the BigInt math itself (already vetted, illustrative-only per Assumptions Log A2 — still needs first-party tests).

**Total-function contract with defensive normalization** (lines 26-39, `generateBatch`):
```typescript
export function generateBatch({
  version,
  count,
}: GenerateBatchOptions): string[] {
  const safeCount = Number.isFinite(count) ? count : 1;
  const clampedCount = Math.min(100, Math.max(1, Math.trunc(safeCount)));
  const generate = version === "v7" ? uuidv7 : uuidv4;
  return Array.from({ length: clampedCount }, () => generate());
}
```
Apply the same "never trust the caller, never throw, always return a real value" discipline to `ipv4.ts`/`ipv6.ts` host-count/boundary branching (D-04's `/31`/`/32`/`/127`/`/128` cases) — branch explicitly on `bitWidth - prefix` per RESEARCH.md Pitfall 3, always return real values plus a `note` field, never `null`/`"N/A"`.

**BigInt mask arithmetic** (RESEARCH.md Architecture Patterns, Pattern 3 — copy as starting point, then add first-party tests):
```typescript
function maskFor(bitWidth: bigint, prefixLength: bigint): bigint {
  const hostBits = bitWidth - prefixLength;
  const allOnes = (1n << bitWidth) - 1n;
  return hostBits === 0n ? allOnes : allOnes ^ ((1n << hostBits) - 1n);
}
function networkAddress(address: bigint, mask: bigint): bigint {
  return address & mask;
}
function broadcastAddress(address: bigint, mask: bigint, bitWidth: bigint): bigint {
  const allOnes = (1n << bitWidth) - 1n;
  return address | (mask ^ allOnes);
}
```
Never mix `Number` bitwise ops with these — TypeScript's own `bigint`/`number` mismatch error is the safety net (RESEARCH.md Pitfall 4).

---

### `lib/subnet/format.ts` (utility, transform)

**Analog:** `lib/uuid/format.ts` (full file read, 47 lines) — closest exact match in the whole codebase for this file's role.

**Pure reformat module doc-comment convention** (lines 1-28): copy the "NEVER imports X (all Y lives in Z), no React/Next import (framework-agnostic)" phrasing pattern, and the "total for all valid input, commutes/round-trips" style of correctness claim — apply the same rigor to RFC-5952 compress/expand round-trip guarantees.

**Total, pure map-based transform shape** (lines 29-46):
```typescript
export function formatUuids(uuids: string[], opts: FormatUuidsOptions): string[] {
  return uuids.map((uuid) => applyHyphens(applyCase(uuid, opts.case), opts.hyphens));
}
```
`lib/subnet/format.ts`'s `compressIpv6`/`expandIpv6` functions should follow this same "small named helper, composed, no side effects" shape. Use RESEARCH.md's own `compressIpv6` code example (RFC 5952 rules) as the starting implementation, with first-party tests added per D-03.

---

### `lib/subnet/reverse-dns.ts` (utility, transform)

**Analog:** `lib/uuid/format.ts` (pure derivation shape) + RESEARCH.md's own `ipv6ReverseZone` code example (RFC 3596 nibble construction) as the starting implementation.

```typescript
function ipv6ReverseZone(addressBigInt: bigint, prefixLength: number): string {
  const fullNibbles: string[] = [];
  for (let i = 0n; i < 32n; i++) {
    const shift = i * 4n;
    const nibble = (addressBigInt >> shift) & 0xfn;
    fullNibbles.push(nibble.toString(16));
  }
  const coveredNibbles = Math.floor(prefixLength / 4);
  return `${fullNibbles.slice(32 - coveredNibbles).join(".")}.ip6.arpa.`;
}
```
For IPv4, use the conventional octet-reversal (`in-addr.arpa`) with the same "truncate to nearest fully-covered boundary + note" convention from RESEARCH.md Pitfall 2 / Assumption A1 for non-aligned prefixes.

---

### `lib/subnet/subdivide.ts` (utility, transform)

**Analog:** `lib/uuid/generate.ts`'s bounded/clamped-output contract (never produce an unbounded array).

**Anti-pattern explicitly flagged in RESEARCH.md** — do NOT enumerate all children of a wide prefix. Follow RESEARCH.md's Open Question 2 recommendation: offer a small fixed list of standard next-step prefixes (e.g. `/56`, `/64`) strictly greater than the current prefix and ≤ `/64`, mirroring `generateBatch`'s clamp-not-throw discipline (`Math.min`/`Math.max` style bounding) but applied to prefix-length selection instead of count.

---

### `app/tools/subnet/page.tsx` (route, request-response/static)

**Analog:** `app/tools/uuid/page.tsx` (full file read, 117 lines) — exact structural match.

**Static metadata + JSON-LD shell pattern** (lines 1-39):
```typescript
import type { Metadata } from "next";
import { SITE_URL } from "@/app/sitemap";
import { UuidToolLoader } from "./UuidToolLoader";
import { faqItems, sampleV4, sampleV7, whenToUseEachNote } from "./faq-data";

const TITLE = "UUID Generator (v4 & v7) — Packetory";
...
export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, alternates: { canonical: CANONICAL_URL }, openGraph: {...} };

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
Copy verbatim structure for `app/tools/subnet/page.tsx`: metadata block, `faqJsonLd` built from the same `faqItems` array rendered on-page (no drift), `<` → `<` JSON-LD escape.

**CRITICAL constraint (RESEARCH.md Pitfall 1):** Do NOT destructure `searchParams` in this Server Component — it must stay a plain static shell exactly like `UuidPage`, with `<SubnetToolLoader />` as the only dynamic subtree (lines 47-62 show the exact `export default function UuidPage()` shape to mirror, swapping `UuidToolLoader` for `SubnetToolLoader`).

---

### `app/tools/subnet/SubnetToolLoader.tsx` (provider, event-driven)

**Analog:** `app/tools/uuid/UuidToolLoader.tsx` (full file read, 43 lines) — exact match, same `ssr:false` reasoning generalizes (RESEARCH.md: URL-state reasons here, not hydration-mismatch reasons, but identical mechanism).

```typescript
"use client";
import dynamic from "next/dynamic";

const UuidTool = dynamic(
  () => import("./UuidTool").then((mod) => mod.UuidTool),
  { ssr: false, loading: () => <UuidToolSkeleton /> }
);

function UuidToolSkeleton() {
  return (
    <div aria-hidden="true" data-testid="uuid-hero-skeleton"
      className="h-[76px] animate-pulse rounded-md border border-border bg-secondary" />
  );
}

export function UuidToolLoader() {
  return <UuidTool />;
}
```
Copy this exact shape for `SubnetToolLoader.tsx`, renaming to `SubnetTool`/`SubnetToolSkeleton`, adjusting the skeleton's fixed height to match Subnet's actual result-panel height (avoid CLS, SHELL-06 equivalent). Update the doc-comment to cite RESEARCH.md Pattern 1's *static-rendering* rationale (not hydration-mismatch) as this phase's reason for `ssr:false`.

---

### `app/tools/subnet/SubnetTool.tsx` (component, event-driven)

**Analog:** `app/tools/uuid/UuidTool.tsx` (full file read, 479 lines) — exact match for state-management, copy-button wiring, and keyboard-shortcut integration patterns.

**Imports pattern** (lines 1-18):
```typescript
"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, RefreshCw } from "lucide-react";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { useKeyboardShortcut } from "@/lib/hooks/useKeyboardShortcut";
import { generateBatch, type UuidVersion } from "@/lib/uuid/generate";
import { formatUuids, type UuidCase } from "@/lib/uuid/format";
import { EXPORT_FILE, serializeUuids, type ExportFormat } from "@/lib/uuid/export";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
```
Swap `lib/uuid/*` imports for `lib/subnet/*` (`parse`, `ipv4`/`ipv6`, `format`, `reverse-dns`, `subdivide`).

**Single-source-of-truth state object + derived display values** (lines 22-34, 62-89):
```typescript
type UuidToolState = {
  rawUuids: string[];
  version: UuidVersion;
  count: number;
  case: UuidCase;
  hyphens: boolean;
  format: ExportFormat;
};
...
const displayValues = formatUuids(state.rawUuids, { case: state.case, hyphens: state.hyphens });
```
For `SubnetTool.tsx`, the state object should hold the raw CIDR input string + parsed result (or `ParseError`); the derived "display fields" (network, broadcast, mask, etc.) are a pure function of the parsed result, exactly mirroring the "raw value in state, formatted value derived on render" split.

**Multiple independent `useCopyToClipboard` instances per field** (lines 74-83): SUBNET-06 needs *many* copy targets (network, broadcast, first/last host, mask, wildcard, binary, reverse DNS, etc.) — instantiate one `useCopyToClipboard()` hook per output field (or a small reusable `<CopyableField />` wrapper component that itself calls the hook), following the "independent hook instance so confirmation states never collide" comment at line 75-76.

**Reset-confirmation-on-change effect** (lines 91-100):
```typescript
useEffect(() => {
  resetCopy();
  resetCopyAll();
}, [state.rawUuids, state.case, state.hyphens, state.format]);
```
Apply the same pattern: any change to the parsed CIDR result must clear all per-field copy confirmations immediately.

**Keyboard shortcut wiring** (lines 102-111):
```typescript
useKeyboardShortcut({
  slash: () => countInputRef.current?.focus(),
  enter: () => regenerate(),
  copy: state.count === 1 ? () => copy(primaryValue) : undefined,
});
```
For Subnet: `/` → focus CIDR input, `Enter` → re-validate/recompute (already live-typing driven, so this may be a no-op or "confirm" action), no direct v4/v7-style toggle equivalent — adapt per actual SubnetTool UI needs.

**Inline validation-error UI convention** (lines 41-47, 222-251 `countError`/`BATCH_COUNT_HINT` pattern): reuse this exact inline-hint-below-input shape (`aria-invalid`, `aria-describedby`, a `data-testid`'d hint `<span>`) for SUBNET-03's invalid-CIDR inline message — never a popup/`alert()`.

**Copy button with icon+label swap + `aria-live` sr-only status** (lines 420-454): reuse this exact accessible confirmation pattern (icon swap is primary signal, `aria-live="polite"` sr-only span mirrors it for screen readers) for every one of Subnet's per-field copy buttons.

**NEW pattern not present in UuidTool (must be added, no direct analog in codebase — build per RESEARCH.md Pattern 1/2):**
```typescript
// Read initial CIDR from URL on mount (client-only, never useSearchParams())
function getInitialCidrFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("cidr");
}

// Write URL updates via raw History API, not router.replace()
function syncCidrToUrl(cidr: string) {
  const url = `${window.location.pathname}?cidr=${encodeURIComponent(cidr)}`;
  window.history.replaceState(null, "", url);
}
```
This is genuinely new architecture for the codebase (Phase 3 is "the first URL-state tool" per CONTEXT.md) — RESEARCH.md's Pattern 1/2 code blocks are the authoritative source here since no existing file does this yet.

---

### `app/tools/subnet/faq-data.ts` (config/content, transform)

**Analog:** `app/tools/uuid/faq-data.ts` (first 40 lines read) — exact match.

```typescript
export type FaqItem = { question: string; answer: string };
export const faqItems: FaqItem[] = [
  { question: "...", answer: "..." },
  ...
];
```
Copy this exact shape/type for Subnet's FAQ content (reverse-DNS boundary explanation, `/31`/`/127` note content per D-04, subdivision behavior per D-05/D-06). Keep the doc-comment convention of citing which decision/requirement each content rule maps to (this file cites D-09/D-10/D-11 and RESEARCH.md prohibitions).

---

### `tools/registry.ts` (status flip)

No new pattern — this phase only flips the existing `subnet` entry's `status: "planned"` to `status: "active"` (lines 39-50 already read, entry pre-exists with `clientOnly: true` already set). Same mechanical edit as Phase 2's UUID entry flip; no analog code excerpt needed beyond the existing entry shown above.

## Shared Patterns

### Copy-to-clipboard
**Source:** `lib/hooks/useCopyToClipboard.ts` (full file, 71 lines)
**Apply to:** Every copyable output field in `SubnetTool.tsx` (SUBNET-06)
```typescript
export function useCopyToClipboard(revertMs: number = DEFAULT_REVERT_MS) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  ...
  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setError(false); setCopied(true);
      revertTimeoutRef.current = setTimeout(() => setCopied(false), revertMs);
    } catch {
      setCopied(false); setError(true);
    }
  }, [revertMs]);
  const reset = useCallback(() => { ...; setCopied(false); setError(false); }, []);
  return { copy, copied, error, reset };
}
```
Reuse as-is, unmodified — no new copy hook needed.

### Client-only URL-state boundary (new for this phase)
**Source:** RESEARCH.md Architecture Patterns, Pattern 1 & 2 (no existing codebase file does this yet — Phase 3 is the first)
**Apply to:** `SubnetToolLoader.tsx` (dynamic ssr:false boundary) + `SubnetTool.tsx` (read via `window.location.search`, write via `window.history.replaceState`)
- Never destructure `searchParams` in `page.tsx`.
- Never use `useRouter().replace()`/`push()` for per-keystroke URL sync.

### Analytics redaction (explicitly NOT extended)
**Source:** `lib/analytics/redact.ts` (first 40 lines read)
**Apply to:** N/A — per D-01, `cidr` must NOT be added to `DEFAULT_ALLOW_LIST`. No code change to this file is expected from this phase; flagging here only so the planner doesn't mistakenly add it.
```typescript
export const DEFAULT_ALLOW_LIST: readonly string[] = [];
```

### Framework-agnostic `lib/` module convention
**Source:** `lib/network/parseForwardedIp.ts`, `lib/uuid/generate.ts`, `lib/uuid/format.ts`
**Apply to:** All of `lib/subnet/*.ts`
- No React/Next.js imports.
- Total functions (never throw for well-typed input; malformed input returns a typed error/null, not an exception).
- Doc-comments cite the specific decision (D-xx) or requirement (SUBNET-xx) driving each design choice.

## No Analog Found

None — every file to be created has at least a role-match or exact analog in the existing codebase. The only genuinely new sub-pattern (client-only URL read/write via History API) has no codebase analog but is fully specified in RESEARCH.md Patterns 1 and 2, which serve as the authoritative source for that piece.

## Metadata

**Analog search scope:** `app/tools/uuid/`, `lib/uuid/`, `lib/network/`, `lib/hooks/`, `lib/analytics/`, `tools/registry.ts`
**Files scanned:** `app/tools/uuid/page.tsx`, `app/tools/uuid/UuidToolLoader.tsx`, `app/tools/uuid/UuidTool.tsx`, `app/tools/uuid/faq-data.ts`, `lib/uuid/generate.ts`, `lib/uuid/format.ts`, `lib/hooks/useCopyToClipboard.ts`, `lib/network/parseForwardedIp.ts`, `lib/analytics/redact.ts`, `tools/registry.ts`
**Pattern extraction date:** 2026-07-24
