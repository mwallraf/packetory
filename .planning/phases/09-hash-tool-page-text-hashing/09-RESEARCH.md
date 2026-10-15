# Phase 9: Hash Tool Page & Text Hashing - Research

**Researched:** 2026-10-15
**Domain:** Next.js 16 App Router tool page (server shell + `ssr:false` client island) on top of the Phase 8 Web Worker hash runtime; pure-TS formatting, verification-normalization and export helpers
**Confidence:** HIGH (every integration point was read in this repo this session; no new dependencies; the only LOW items are browser-behavior assumptions listed in the Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page shell & first paint (TEXT-01)**
- **D-01:** Copy the established Server-shell + Client-island split: `app/tools/hash/page.tsx` (static server shell, metadata, FAQ, JSON-LD) + `HashToolLoader.tsx` (`"use client"`, `next/dynamic(..., { ssr: false })`, fixed-height skeleton) + `HashTool.tsx`. Same as `app/tools/mac/MacToolLoader.tsx`.
- **D-02:** Sample input is `hello world` (no trailing newline). Its 10 digests are **precomputed constants** (`sampleDigests`, stored as bytes or hex in a small module) rendered immediately, so the first paint never waits for the worker. A unit test recomputes them through `lib/hash` and pins them.
- **D-03:** Focusing the textarea while it still holds the untouched sample selects all, so the first keystroke replaces the sample (same demo-on-load feel as the other tools).
- **D-04:** Empty input is valid: it shows the empty-string digests with a small "empty input" note, never blank rows or an error.

**Live hashing (TEXT-02)**
- **D-05:** All text hashing goes through the Phase 8 `HashClient` (`lib/hash/client.ts`); each input change calls `start()` which supersedes the in-flight job. Results are applied only for the latest request (the client's supersede + a request sequence check in the component), so a slower older result can never overwrite a newer one.
- **D-06:** No debounce for normal input; previous digests stay visible until the new result lands (no flicker or empty rows between keystrokes). A short debounce (~150 ms) is allowed only above the soft-cap threshold in D-07 — planner's discretion on exact value.
- **D-07:** Text-mode soft cap = **1 MiB** of UTF-8. Above it, a non-blocking inline warning suggests file mode; hashing still runs. No hard cap in this phase.

**Byte count & newline hint (TEXT-03)**
- **D-08:** Show `N bytes (UTF-8)` next to the input, computed with `TextEncoder` (same bytes the worker hashes).
- **D-09:** One static hint line: the textarea hashes exactly what is typed (no trailing newline); `echo` adds `\n` so use `printf '%s'` or `echo -n` to match; pasted CRLF line endings become LF in a textarea. Full explanation lives in the FAQ.

**Output rows & encoding (OUT-01, OUT-03, OUT-05)**
- **D-10:** Rows render in `ALGORITHMS` order from `lib/hash/algorithms.ts` (single source of truth). SHA-256 is the **primary** digest: visually emphasized and the target of the copy shortcut.
- **D-11:** One 3-way toggle (reuse `components/ui/toggle-group.tsx`): `hex` / `HEX` / `Base64`, default lowercase hex. Toggling only reformats stored bytes via `lib/hash/format.ts` (extend it with uppercase/Base64 helpers); it never re-hashes. CRC32 always stays hex (lower or upper follows the case choice; Base64 does not apply to it).
- **D-12:** Each row has a copy button using `useCopyToClipboard` with the existing visible confirmation pattern. Copy copies the digest exactly as displayed.
- **D-13:** MD5, SHA-1 and CRC32 get an inline badge driven by `notForSecurity` in `algorithms.ts`: MD5/SHA-1 "Not for security", CRC32 "Error detection only". Text, not color alone; no modal or tooltip-only content.
- **D-14:** Long digests wrap (`break-all`/monospace) at 320px; no horizontal scroll (INT-03).

**Copy all (OUT-02)**
- **D-15:** Two copy-all formats: **Labeled list** (default; `SHA-256: <digest>` per line in the current display encoding) and **Checksum lines**. No CSV or JSON in this phase.
- **D-16:** Checksum format always uses lowercase hex regardless of the display toggle (what coreutils prints), one `<hash>  -` line (two spaces, `-` for text) per algorithm, each preceded by a `# <LABEL>` comment line so the 10 lines are unambiguous.

**Paste-to-verify (OUT-04)**
- **D-17:** A single "Expected checksum" input between the textarea and the rows. Normalize: trim, strip a `<algo>:` prefix (e.g. `sha256:`), take the first token of a `sha256sum` line, remove whitespace/colons/dashes, compare case-insensitively against every row's hex; also compare against each row's Base64.
- **D-18:** Every matching row is highlighted with a MATCH badge (icon + text). A non-empty value that matches nothing shows a clear "No match" state; a wrong-length or non-hex value adds a hint with expected lengths (8/32/40/56/64/96/128 hex), as a hint, not a red error. Result is announced via `aria-live`. Plain string equality (no constant-time compare).
- **D-19:** The verify value re-evaluates whenever digests change (typing) and is cleared by `Esc`.

**URL state (TEXT-04)**
- **D-20:** On load, read `?text=` once and use it as the input instead of the sample. The address bar is **never** written while typing.
- **D-21:** An explicit "Copy link" button builds `/tools/hash?text=<encoded>` and copies it with the standard confirmation. It is disabled with a hint when the encoded text exceeds **2,000 characters**. A one-line notice says the link contains the typed text.
- **D-22:** `text` is never added to the analytics allow-list; add a `?text=`-stripped regression test to `lib/analytics/redact.test.ts`. `redact.ts` itself is not modified.

**Keyboard (INT-01)**
- **D-23:** Use `useKeyboardShortcut` with `slash` (focus textarea and select all), `escape` (cancel in-flight job, restore sample, clear verify box) and `copy` (Ctrl/Cmd+C outside editable fields copies SHA-256 with confirmation). `enter` stays **unbound** so it inserts newlines.
- **D-24:** Textarea attributes: `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="off"`, `autoComplete="off"`, and password-manager ignore attributes (`data-1p-ignore`, `data-lpignore="true"`, `data-form-type="other"`).

**Registry & SEO (INTG-01, INTG-02)**
- **D-25:** One `tools/registry.ts` entry: slug `hash`, name "Hash Generator", category `encode`, icon `Hash`, `status: "active"`, `clientOnly: true`. Add `Hash` to `ICONS` in `components/ToolCard.tsx` (a missing entry silently falls back to the UUID icon). Update the hard-coded 4-tool tests to 5: `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts`. Nav and sitemap code are not edited directly; they derive from the registry.
- **D-26:** Page has unique title, meta description, canonical, OG tags; a worked example (`hello world` → SHA-256, plus the `echo` vs `printf` difference); FAQ in `app/tools/hash/faq-data.ts` (pattern from other tools) covering SHA3 vs Keccak-256, `echo` vs `echo -n`, MD5/SHA-1 security, a match is not authenticity, and that hashing runs in the browser. FAQPage JSON-LD is generated from the same data so content always matches.
- **D-27:** Privacy page and any new privacy/legal wording are **not** changed in this phase; any wording that implies a privacy claim beyond "runs in your browser" needs human approval.

### Claude's Discretion
- Exact layout (verify box placement relative to toggle/copy-all controls), skeleton height, debounce value above soft cap, sample-digest storage format, component split inside `HashTool.tsx`.

### Deferred Ideas (OUT OF SCOPE)
- SRI copy format `sha384-…` (OUT-06, Future)
- Input encoding Hex/Base64 (ENC-01) and append-newline / CRLF toggle (ENC-02), Future
- HMAC (HMAC-01), Future
- JSON copy-all format — not required by OUT-02; revisit if requested
- Character-level diff highlighting in the verify box — nice-to-have
- (Phase 10, not this phase: file input / drag-drop / progress FILE-01..04, full INT-02 supersede audit, INTG-03 zero-third-party e2e + fragment redaction, INTG-04 Lighthouse/prod e2e)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEXT-01 | All 10 digests for a sample on load, precomputed, no CLS | `lib/hash/sample.ts` constants (values verified below), island seeds state from them synchronously, responsive fixed-height skeleton + CLS e2e |
| TEXT-02 | Live updates, no stale overwrite | Handler-driven `client.start()` + sequence ref + `cancelled` outcome ignored; deferred-promise out-of-order unit test |
| TEXT-03 | UTF-8 byte count + CRLF/newline hint | `encodeText(text).length` from `lib/hash/source.ts` (import-boundary safe); static hint copy |
| TEXT-04 | `?text=` restore on load; explicit capped "Copy link"; never auto-written; never in analytics | `window.location.search` read in lazy init; `encodeURIComponent` in try/catch (lone surrogates throw); `redact.test.ts` regression; history-spy test |
| OUT-01 | Per-digest copy with visible confirmation | `useCopyToClipboard` per row (FormatRow pattern from MacTool) |
| OUT-02 | Copy all: labeled list / `sha256sum` lines | Pure `lib/hash/export.ts` (`formatLabeledList`, `formatChecksumLines`) |
| OUT-03 | hex / HEX / Base64 toggle without re-hashing; CRC32 stays hex | `lib/hash/format.ts` additions (`formatDigest`), derived at render from stored bytes |
| OUT-04 | Paste-to-verify, tolerant normalization, highlight matches, clear non-match | Pure `lib/hash/verify.ts` with the disambiguation rules below |
| OUT-05 | MD5/SHA-1/CRC32 inline "not for security" label | Driven by `notForSecurity` in `ALGORITHMS`; text badge, no modal |
| INT-01 | `/`, `Esc`, copy shortcut; Enter never bound | `useKeyboardShortcut({ slash, escape, copy })` — omit `enter`; selection guard on `copy` |
| INT-03 | 320px light/dark, long digests wrap, no h-scroll | `break-all` mono rows, `min-w-0`, e2e at 320px in both themes |
| INTG-01 | Registry entry -> nav/grid/sitemap; tests 4 -> 5; `Hash` icon | One `tools/registry.ts` entry; `ToolCard` `ICONS`; fallout list below |
| INTG-02 | Unique SEO, worked example, FAQ + matching FAQPage JSON-LD | `page.tsx` + `faq-data.ts` mirroring MAC; `hash-seo.spec.ts` |
</phase_requirements>

## Summary

Phase 9 is a standard-pattern UI phase. Nothing new needs to be installed: the hash engine, worker, client (`createHashClient`), algorithm metadata, hex formatter, copy hook, keyboard hook, toggle group and badge all exist. The work is (a) a server-shell page + `ssr:false` island copied from the MAC tool, (b) three small pure libraries (`format` extensions, `verify`, `export`) plus a `sample` constants module, each Vitest-testable under `// @vitest-environment node`, (c) registry/ToolCard/test fallout, and (d) SEO/FAQ content.

The risk is concentrated in a handful of details the CONTEXT decisions do not spell out, all researched below: (1) the verify-box normalization has genuine ambiguities (spaced hex vs `sha256sum` line, `ab:cd:` colon hex vs `sha256:` prefix) that need a deterministic rule set; (2) `HashClient.dispose()` is final and React StrictMode double-runs effects, so the client must be created inside the mount effect, not in `useState`; (3) the project's lint rule forbids synchronous `setState` in effects (Phase 8 STATE note), so initial state must come from lazy `useState` initializers and async continuations; (4) `encodeURIComponent` throws on lone surrogates, which would crash "Copy link"; (5) the global `copy` shortcut will clobber a user's text selection unless the handler guards on `window.getSelection()`; (6) the Phase 8 review left WR-01/WR-02 open in `lib/hash/client.ts` and this phase is the first consumer.

**Primary recommendation:** Build `lib/hash/{sample,format,verify,export}.ts` first (pure, fully unit-tested, TDD), then the island with handler-driven hashing (`seqRef` + `clientRef` created in a mount effect), then registry/test fallout, then page/SEO/FAQ, then e2e (dev server for interaction/SEO/320px; CLS measured against the skeleton-to-island swap).

## Project Constraints (from CLAUDE.md)

Source: `/Users/mwallraf/Documents/dev/packetory.dev/.claude/CLAUDE.md` [VERIFIED: read via system context this session]
- Stack is fixed: Next.js App Router + TypeScript + Tailwind, Vercel. Not open for reconsideration.
- **Static-first**; client components only where interaction requires; no API route is needed here (all local).
- **Local-first / no third-party requests** for tools that can run locally. Hash is fully local.
- **Performance:** 90+ Lighthouse in all categories; minimal JS per page; no avoidable CLS. The engine must stay out of the initial bundle (HASH-04, enforced by `lib/hash/boundaries.test.ts`).
- **Privacy:** no tracking, no PII; sensitive query params (here `text`) excluded from analytics. Any new privacy/legal wording needs human approval (also D-27).
- **UX non-negotiables:** zero-effort default result on load, minimum input, one-click copy with visible confirmation everywhere, keyboard-first, **no modal ads/popups/interstitials** (also: no modal for the security labels).
- **Testing:** Vitest + fast-check for `lib/` modules, Vitest + Testing Library for client components, Playwright for real keyboard flows / URL-state / races.
- **GSD workflow enforcement:** file edits go through a GSD command (`/gsd-execute-phase`), not ad-hoc.
- Conventions/Architecture sections of CLAUDE.md are empty ("follow existing patterns").
- Note: CLAUDE.md lists TypeScript 7.0.2 / ESLint 10.7.0 as "observed latest"; the repo's `package.json` actually pins `typescript 6.0.3`, `eslint 9.39.5`. Follow `package.json` [VERIFIED: package.json read this session].

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Page chrome, metadata, canonical/OG, worked example, FAQ, JSON-LD | Frontend Server (static prerender) | — | Static shell, no `searchParams` read (keeps route static; matches MAC/UUID/DNS pages) |
| Sample digests first paint | CDN / Static + Browser | — | Constants in a module; island renders them synchronously on mount, no worker round-trip |
| Text input, live hashing orchestration, state | Browser / Client | — | `ssr:false` island; local-first |
| SHA/MD5/RIPEMD/CRC32 computation | Browser (Web Worker) | — | Phase 8 runtime; main thread never imports the engine |
| Digest formatting (hex/HEX/Base64), copy-all text, verify matching | Browser (pure `lib/hash/*`) | — | Framework-agnostic pure functions; no network |
| `?text=` restore / "Copy link" | Browser | — | `window.location.search` read once; link copy via clipboard; never `history.*` writes |
| Registry -> nav / landing grid / sitemap | Frontend Server (build-time derivation) | Browser (SiteHeader client) | Single `tools/registry.ts` source (SHELL-04) |
| Analytics redaction of `text` | Browser (`PacketoryAnalytics` beforeSend) | — | Already allow-list-only; only a regression test is added |

## Standard Stack

### Core (all already installed — no new packages this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.11 (exact pin) | App Router, `next/dynamic` | Project-confirmed [VERIFIED: package.json] |
| react / react-dom | 19.2.8 | UI | Project-confirmed [VERIFIED: package.json] |
| `@noble/hashes` | 2.4.0 (exact pin) | Engine — **never imported by Phase 9 UI code** (only `lib/hash/engine.ts`) | Phase 8 [VERIFIED: package.json] |
| lucide-react | ^1.25.0 | `Hash`, `Check`, `Copy`, `Link`, `AlertTriangle`/`TriangleAlert`, `ShieldAlert` icons | Already used by every tool; `Hash` export exists [VERIFIED: `declare const Hash` in node_modules/lucide-react/dist/lucide-react.d.ts] |
| radix-ui (toggle-group via `components/ui/toggle-group.tsx`) | ^1.6.4 | Encoding + copy-all format toggles | UUID tool precedent |
| tailwindcss | 4.3.3 | Styling | Project-confirmed |

### Supporting (existing project modules to reuse)

| Module | Purpose | Notes |
|--------|---------|-------|
| `lib/hash/client.ts` `createHashClient` | Worker lifecycle + supersede funnel | Imports only `./types`; do not add other imports (boundaries test) |
| `lib/hash/algorithms.ts` `ALGORITHMS` | Row order, labels, bits, `notForSecurity` | Single source of truth |
| `lib/hash/source.ts` `encodeText` | UTF-8 byte count (same encoder the worker uses) | Safe to import from UI: it does not import the engine |
| `lib/hash/format.ts` `toHex` | Extend with uppercase/Base64 | Currently lowercase only |
| `lib/hooks/useCopyToClipboard.ts` | `{copy, copied, error, reset}` | One instance per row/button |
| `lib/hooks/useKeyboardShortcut.ts` | `slash` / `escape` / `copy` / `enter` handlers | Leave `enter` undefined |
| `components/ui/{toggle-group,badge,input,label,button}.tsx` | Controls | **No `Textarea` primitive exists** — add `components/ui/textarea.tsx` (shadcn style, copy `Input` classes) or style a native `<textarea>` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Handler-driven hashing (`onChange` -> `start()`) | Effect on `[text]` | Effect form double-fires under StrictMode and tempts sync `setState` in effects (lint-forbidden); handler form is explicit and mirrors UUID/MAC tools |
| `encodeText(text).length` | Hand-rolled `utf8ByteLength` loop | D-08 says TextEncoder; the allocation cost at the 1 MiB soft cap is ~ms. Keep `encodeText` |
| New client-side `Uint8Array.toBase64` | `btoa(String.fromCharCode(...bytes))` | `toBase64` is not universally available yet [ASSUMED]; digests are <= 64 bytes so `btoa` is trivial and safe |

**Installation:** none. **Version verification:** versions read from `package.json` this session; no registry lookup needed because no package is added.

## Package Legitimacy Audit

No external packages are installed in this phase. Legitimacy gate not applicable.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 request /tools/hash[?text=...]
        |
        v
 +-------------------------------+   static prerender (no searchParams read)
 | app/tools/hash/page.tsx       |   metadata + canonical (no ?text) + OG
 |  (server shell)               |   FAQPage JSON-LD <- faq-data.ts (same array as visible FAQ)
 |  h1, worked example, FAQ      |   worked example <- sample.ts constants
 +---------------+---------------+
                 | renders
                 v
 +-------------------------------+   "use client": next/dynamic(..., {ssr:false})
 | HashToolLoader.tsx            |   fixed responsive-height skeleton (no CLS)
 +---------------+---------------+
                 | mount (client only)
                 v
 +--------------------------------------------------------------+
 | HashTool.tsx (island)                                        |
 |  lazy init: text = ?text= (first value) ?? SAMPLE_TEXT       |
 |             result = {text: SAMPLE_TEXT, digests: sample}    |
 |  mount effect: client = createHashClient()  --> clientRef    |
 |       (cleanup: client.dispose()); if text != sample: run()  |
 |                                                              |
 |  textarea onChange -> setText(v)                             |
 |        |                                                     |
 |        +-- v === SAMPLE_TEXT? -> seq++, client.cancel(),     |
 |        |       setResult(sample)           (instant, no worker)
 |        +-- else seq++ ; id=seq ;                             |
 |             client.start({kind:"text",text:v}).then(o =>     |
 |               o.status==="done" && id===seqRef.current       |
 |                  -> setResult({text:v, digests:o.digests})   |
 |               "cancelled" -> ignore ; "error" -> inline msg) |
 |                                                              |
 |  render (pure derivations, never re-hash):                   |
 |   bytes = encodeText(text).length  -> "N bytes (UTF-8)"      |
 |   rows  = ALGORITHMS.map(a => formatDigest(a.id, digest, enc))|
 |   verify = matchExpected(expectedInput, result.digests)      |
 |   copyAll = labeledList(...) | checksumLines(...)            |
 |   copyLink = origin + /tools/hash?text= + encodeURIComponent |
 |                                                              |
 |  keyboard: slash -> focus+select ; escape -> cancel+sample+  |
 |            clear verify ; copy -> SHA-256 (if no selection)  |
 |            enter -> UNBOUND                                  |
 +----------------------+---------------------------------------+
                        | postMessage({type:"start", jobId, input})
                        v
        lib/hash/client.ts --> hash.worker.ts --> worker-core --> job --> engine (@noble)
        (worker chunk only; never in main bundle)
```

### Recommended Project Structure

```
lib/hash/
├── sample.ts            # NEW: SAMPLE_TEXT, SAMPLE_DIGEST_HEX (Record<AlgorithmId,string>), sampleDigests(): Digests
├── sample.test.ts       # NEW (node env): pins constants to runHashJob + node:crypto oracle
├── format.ts            # EXTEND: toHexUpper, toBase64, formatDigest(id, bytes, enc), hexToBytes
├── format.test.ts       # EXTEND
├── verify.ts            # NEW: normalizeExpected(), matchExpected(), VALID_HEX_LENGTHS
├── verify.test.ts       # NEW (+ fast-check)
├── export.ts            # NEW: formatLabeledList(), formatChecksumLines()
├── export.test.ts       # NEW
└── client.ts            # OPTIONAL hardening (WR-01/WR-02) — imports must stay type-only from ./types
app/tools/hash/
├── page.tsx             # server shell, metadata, worked example, FAQ, JSON-LD
├── faq-data.ts          # faqItems (+ worked-example constants re-exported from lib/hash/sample)
├── faq-data.test.ts     # FAQ coverage (SHA3 vs Keccak, echo -n, MD5/SHA-1, match != authenticity, in-browser)
├── HashToolLoader.tsx   # "use client" + dynamic ssr:false + skeleton
├── HashTool.tsx         # island (split HashRow / VerifyBox / CopyAllControls inside or as siblings)
└── HashTool.test.tsx    # RTL, vi.mock("@/lib/hash/client")
components/ui/textarea.tsx   # NEW primitive (none exists)
components/ToolCard.tsx      # add Hash to ICONS
tools/registry.ts            # + hash entry
lib/analytics/redact.test.ts # + ?text= regression
tests/e2e/hash.spec.ts, hash-seo.spec.ts   # NEW
```

### Pattern 1: Server shell + `ssr:false` loader (copy of MAC)
**What:** `page.tsx` is a plain Server Component (no props, no `searchParams`); `HashToolLoader.tsx` is `"use client"` and wraps `dynamic(() => import("./HashTool").then(m => m.HashTool), { ssr: false, loading: () => <HashToolSkeleton/> })`. `ssr:false` is only legal inside a `"use client"` file.
**Example (existing, verbatim shape):**
```tsx
// Source: app/tools/mac/MacToolLoader.tsx (read this session)
const MacTool = dynamic(
  () => import("./MacTool").then((mod) => mod.MacTool),
  { ssr: false, loading: () => <MacToolSkeleton /> }
);
```
Skeleton: `aria-hidden`, `data-testid="hash-tool-skeleton"`, `animate-pulse rounded-md border border-border bg-secondary`. **Make heights responsive** (`h-[Apx] sm:h-[Bpx]`): the real island is much taller at 320px (SHA-512/SHA3-512 = 128 hex chars wrap to ~5 lines) than at desktop. Measure the real island at 320/375/768/1280 in Playwright and pin the skeleton heights to those numbers (see CLS test below).

### Pattern 2: Handler-driven hashing with sequence guard
**What:** `onChange` sets text and starts a job; the component ignores any outcome that is not the latest, in addition to the client's own supersede. `cancelled` is a normal outcome (the client resolves the superseded job as `cancelled` immediately) and must **not** be shown as an error.
```tsx
// Source: lib/hash/client.ts HashOutcome [VERIFIED: Read client.ts:27-30]
// export type HashOutcome =
//   | { status: "done"; digests: Digests }
//   | { status: "cancelled" }
//   | { status: "error"; name: string; message: string };

function runHash(value: string) {
  const client = clientRef.current;
  if (!client) return;
  const id = ++seqRef.current;
  void client
    .start({ kind: "text", text: value })
    .then((o) => {
      if (id !== seqRef.current) return;              // stale: superseded or reset
      if (o.status === "done") setResult({ text: value, digests: o.digests });
      else if (o.status === "error") setHashError(true);
      // "cancelled": ignore
    })
    .catch(() => { if (id === seqRef.current) setHashError(true); }); // WR-01 insurance
}
```
Sample short-circuit: `if (value === SAMPLE_TEXT) { seqRef.current++; clientRef.current?.cancel(); setResult(SAMPLE_RESULT); return; }` — typing the sample (or Esc) is instant and also cancels in-flight work.

### Pattern 3: Client lifecycle under StrictMode (critical)
`dispose()` is **final** (`disposed = true`; later `start()` resolves `cancelled`) [VERIFIED: client.ts read this session]. React StrictMode runs mount effect -> cleanup -> mount effect in dev. A client created in `useState(() => createHashClient())` would be disposed by the first cleanup and never work again. Create it **inside** the effect:
```tsx
const clientRef = useRef<HashClient | null>(null);
useEffect(() => {
  const client = createHashClient();      // Worker is created lazily on first start()
  clientRef.current = client;
  if (initialText !== SAMPLE_TEXT) runHash(initialText); // async continuation -> setState is lint-safe
  return () => { client.dispose(); clientRef.current = null; seqRef.current++; };
}, []); // eslint-disable-next-line react-hooks/exhaustive-deps (initialText is a mount-time constant)
```
Phase 8 STATE note: "lint forbids setState in effect" (`react-hooks/set-state-in-effect` from `eslint-config-next`). All state seeding therefore happens in lazy `useState` initializers (`useState(() => readTextParam() ?? SAMPLE_TEXT)`), never `setX()` synchronously in an effect. `useRef` writes must also not happen during render (`react-hooks/refs`) — write refs only in effects/handlers.

### Pattern 4: Derived display, stored bytes
Store `result = { text, digests: Digests }` (raw `Uint8Array`). Everything shown is derived per render: `formatDigest(id, bytes, enc)`. The encoding toggle is a `useState<"hex"|"HEX"|"base64">`; changing it re-renders only. Mark `isStale = result.text !== text` to show an "updating" affordance (dimmed rows, `aria-busy`) and to **block copy-all/copy-shortcut semantics from implying freshness** — see Pitfall 3.

### Pattern 5: `?text=` read once, never write
```tsx
// Mirrors app/tools/subnet/SubnetTool.tsx:getInitialCidrFromUrl [VERIFIED: read this session]
function readTextParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("text"); // first occurrence; never throws on bad %
}
```
**Never** call `history.replaceState/pushState` or `router.*` in this tool (Subnet/DNS do — Hash must not). A unit test spies on `window.history.replaceState/pushState` and asserts zero calls while typing.

### Pattern 6: One copy-state per control; shortcut feeds the primary row
Each row owns `useCopyToClipboard()` (MacTool `FormatRow` precedent, including the `useEffect(() => reset(), [value])` with the repo's `eslint-disable-next-line react-hooks/exhaustive-deps` comment). The SHA-256 row additionally accepts a parent-level `shortcutCopied` flag/state from a separate parent `useCopyToClipboard()` so the Ctrl/Cmd+C shortcut produces the same visible "Copied!" on the SHA-256 row (`copied = own.copied || shortcut.copied`).

### Anti-Patterns to Avoid
- **Creating the HashClient in `useState`/module scope:** breaks under StrictMode (disposed client is dead).
- **Binding `enter`:** the hook fires `enter` for any non-button target, including the textarea (`isInteractiveTarget` is only button/role=button/role=radio/`a[href]`) [VERIFIED: useKeyboardShortcut.ts read this session]. Omit it entirely.
- **Importing `lib/hash/job`, `engine`, `worker-core` from UI:** `boundaries.test.ts` fails (only `worker-core` may import `job`, only `job` may import `engine`). `source.ts`, `format.ts`, `algorithms.ts`, `types.ts`, `client.ts` are safe.
- **Adding non-type imports to `client.ts`:** `boundaries.test.ts` asserts every `client.ts` import resolves to `lib/hash/types`.
- **Reading `searchParams` in `page.tsx`:** opts the route out of static prerendering.
- **Re-hashing on toggle change** or putting the encoding in the hash effect's inputs.
- **Writing the typed text into any URL, log, `console.*`, or error message.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hashing / CRC32 / UTF-8 | Any digest or encoder in UI code | `HashClient` + `encodeText` | Phase 8-verified, worker-isolated; one UTF-8 choke point |
| Copy + confirmation timing | Custom clipboard logic | `useCopyToClipboard` | Existing semantics incl. error state and `reset` |
| Global shortcuts | Own `keydown` listeners | `useKeyboardShortcut` | Existing, tested; handler-ref pattern |
| Toggle control | Custom radio group | `components/ui/toggle-group.tsx` (`type="single"`, ignore `""` on deselect like UUID) | Radix a11y; UUID precedent (`handleVersionChange` ignores empty-string) |
| FAQ + JSON-LD | Separate FAQ and schema copies | `faqItems` array mapped for both | Prevents content/JSON-LD drift (MAC/DNS/UUID pattern, `<` -> `<` escape) |
| Registry derivation | Hard-coded nav/sitemap entries | `tools/registry.ts` entry only | SHELL-04; `sitemap.test.ts` asserts no slug literals in `sitemap.ts` |
| Base64 of digest bytes | Manual base64 tables | `btoa` over `String.fromCharCode` loop (<=64 bytes) | Trivial; safe |
| Verify normalization | Ad-hoc `.replace()` at the call site | `lib/hash/verify.ts` pure module with a test table | Ambiguity rules below need to be tested once, not re-derived |

**Key insight:** every hard problem (correctness, cancellation, UTF-8, clipboard, keyboard) already has a tested primitive. This phase is composition plus three small pure modules whose only real difficulty is edge-case rules, which are specified below so they can be implemented TDD.

## Verify-box normalization rules (OUT-04) — prescriptive

D-17 leaves ambiguities. Implement `normalizeExpected(raw)` / `matchExpected(raw, digests)` in `lib/hash/verify.ts` with this deterministic order:

1. Strip zero-width/BOM characters the zero-width class U+200B to U+200D, U+2060 and U+FEFF (use backslash-u escapes in source, not literal characters), then `trim()`. (Copy-pasting from web pages often includes them; `\s` does not cover ZWSP.)
2. **BSD tag form** `^[A-Za-z0-9_-]+\s*\(.*\)\s*=\s*(\S+)$` (`shasum --tag`, `openssl dgst`) -> take group 1.
3. **Algorithm prefix**: strip only if the prefix is a **known algorithm alias** (case-insensitive, then `\s*[:=]\s*`): `md5`, `sha-?1`, `sha-?224`, `sha-?256`, `sha-?384`, `sha-?512`, `sha3[-_]?256`, `sha3[-_]?512`, `ripemd-?160`, `crc-?32`. **Do not use a generic `\w+:` prefix strip** — it would eat the first octet of colon-separated hex (`ab:cd:...`). Also strip a leading `0x`.
4. Split on whitespace into tokens. Compute `joined = tokens.join("")` with `:`, `-`, `_` removed.
   - If `joined` is all hex **and** its length is in `VALID_HEX_LENGTHS = [8,32,40,56,64,96,128]` -> candidate = `joined` (covers spaced hex `e3b0 c442 ...`, colon hex, and `<hash>  -` because `-` is stripped).
   - else if `tokens.length > 1` and the first token (separators removed) is all hex of a valid length -> candidate = first token (a `sha256sum` line `<hash>  <filename>` / `<hash> *<filename>`).
   - else candidate = `joined` (will fail the length/hex hint path).
   Rationale: a spaced hex whose first group is 8 chars (CRC32-length) must not be misread as "CRC32 + filename"; the "joined is a valid length" test runs first. A filename that is itself hex-only still works because `hash + filenameHex` is not a valid length.
5. **Hex compare:** `candidate.toLowerCase() === rowLowerHex` for every row (all rows, no algorithm restriction; equal-length algorithms 40/64/128 simply compare to their own row).
6. **Base64 compare (separate, case-sensitive):** `b64Candidate = tokens.join("")` (no separator stripping — `-`/`_` are legal base64url), compare to each non-CRC32 row's Base64 ignoring trailing `=` padding on both sides.
7. Result union: `{ state: "idle" }` (empty after trim) | `{ state: "match"; ids: AlgorithmId[] }` | `{ state: "no-match"; hint?: string }` where `hint` is set when the hex candidate is non-hex or its length is not in `VALID_HEX_LENGTHS` (text: "Expected 8, 32, 40, 56, 64, 96 or 128 hex characters; got N."). A length hint is a hint, never a red error (D-18). No partial/prefix matching (false confidence).
8. Compare only against **settled** digests (`result.digests`), and re-evaluate on every digest change (D-19). When `result.text !== text` (stale), show verify as pending rather than asserting a match on stale digests.

Required unit-test cases (table-driven): upper-case; `sha256:` prefix; `SHA256: <hash>`; colon-separated hex; space-grouped hex (groups of 2, 4, 8); `<hash>  -`; `<hash>  file.iso`; `<hash> *file.iso`; BSD tag; Base64 match for SHA-256; 40-hex matching only SHA-1 xor RIPEMD-160 (use real digests of one input, assert exactly one row); 64-hex matching SHA-256 vs SHA3-256 independently; CRC32 `0D4A1185`; 8-hex "no match"; non-hex; wrong length hint; ZWSP/NBSP-wrapped paste; empty -> idle; fast-check property: for any digest row, formatting it in each supported shape round-trips to a match on exactly that row.

## Output helper rules

`lib/hash/format.ts` additions (keep type-only imports; no engine):
```ts
export type DigestEncoding = "hex" | "HEX" | "base64";
export function toHexUpper(bytes: Uint8Array): string { return toHex(bytes).toUpperCase(); }
export function toBase64(bytes: Uint8Array): string {
  let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}
export function hexToBytes(hex: string): Uint8Array { /* even-length, [0-9a-f]; used by sample.ts */ }
/** CRC32 ignores base64: stays hex (lower/UPPER follows the case choice). */
export function formatDigest(id: AlgorithmId, bytes: Uint8Array, enc: DigestEncoding): string {
  if (id === "crc32") return enc === "HEX" ? toHexUpper(bytes) : toHex(bytes);
  return enc === "base64" ? toBase64(bytes) : enc === "HEX" ? toHexUpper(bytes) : toHex(bytes);
}
```
`lib/hash/export.ts` (pure; takes `Digests` + `DigestEncoding`):
- `formatLabeledList(digests, enc)` -> `ALGORITHMS.map(a => \`${a.label}: ${formatDigest(a.id, digests[a.id], enc)}\`).join("\n")`
- `formatChecksumLines(digests)` -> for each algorithm: `# ${a.label}\n${toHex(digests[a.id])}  -`, joined by `\n`. **Always lowercase hex**, two spaces, `-` (D-15/D-16). Note CRC32's "checksum line" is `<8 hex>  -` — fine per D-16.
- Both snapshot at click time (UUID precedent: "no torn/partial copy"). Expose copy-all format as a second `ToggleGroup` (labeled list default / checksum lines).

## Common Pitfalls

### Pitfall 1: StrictMode kills the client
**What goes wrong:** Hashing never produces results in dev (or intermittently) because `dispose()` is final and the cleanup ran once.
**Why:** `createHashClient` in `useState`/`useMemo`/module scope + effect cleanup `dispose()`.
**How to avoid:** Pattern 3 (create inside the mount effect, null the ref in cleanup). **Warning sign:** works in prod build, "stuck on old digests" in `next dev`.

### Pitfall 2: `encodeURIComponent` throws on lone surrogates
**What goes wrong:** "Copy link" (or render of the link cost) crashes with `URIError` when the text contains an unpaired surrogate (e.g. truncated emoji paste). [VERIFIED: `node -e 'encodeURIComponent("\ud800")'` -> `URIError` this session]
**How to avoid:** wrap link construction in try/catch; on failure disable "Copy link" with a hint ("Text can't be encoded into a link"). Note the hashed bytes are still well-defined: `TextEncoder` turns it into `ef bf bd` (U+FFFD) [VERIFIED: node run this session; documented in `source.ts`]. Reading `?text=` is safe: `URLSearchParams.get` never throws on malformed escapes (`%E0%A4%A` -> `�%A`) [VERIFIED: node run].
**Also:** `URLSearchParams` decodes `+` as space; the tool's own links use `encodeURIComponent` (`%2B`, `%20`) so round-trips are exact. Count the 2,000-char cap on the **encoded** value (newlines cost 3 chars each: `%0A`).

### Pitfall 3: Stale digests next to new text
**What goes wrong:** D-06 keeps previous digests visible until the new result lands. During that window Copy / Copy all / verify operate on digests that belong to the *previous* text.
**How to avoid:** track `result.text`; `isStale = result.text !== text`. While stale: dim rows (`opacity`, no layout change), set `aria-busy`, and run verify against pending state. Copy still works (it copies what is displayed — D-12 — and the window is milliseconds), but the "Copy link" must use `text` (not `result.text`). Cover with a deferred-promise unit test.

### Pitfall 4: `?text=` first paint shows the *sample's* digests for different text
**What goes wrong:** Seeding `result` with sample digests while `text` came from the URL displays wrong digests until the worker returns.
**How to avoid:** when the initial text is not the sample, render rows in a **pending** state (monospace placeholder of the exact hex length per algorithm = `bits/4` chars, so height is identical -> no CLS), then fill on `done`. Never show sample digests next to non-sample text.

### Pitfall 5: Global `copy` shortcut clobbers a text selection
**What goes wrong:** The hook fires on Ctrl/Cmd+C whenever focus is not in an editable field and does not `preventDefault`. A user who double-clicks a digest and presses Ctrl+C gets the native copy and then an async `clipboard.writeText(SHA-256)` overwrites it.
**How to avoid:** in the `copy` handler, `if (window.getSelection()?.toString()) return;` (and optionally `if (document.activeElement` is a button)). Add a unit test.

### Pitfall 6: Esc destroys pasted input (D-23 locked) and fires while a dialog is open
**What goes wrong:** Esc restores the sample unconditionally (hook fires `escape` from any target). A long paste is lost with no undo; React-driven value changes are not in the textarea's native undo stack. Also, on mobile the nav `Sheet` closes on Esc *and* the window listener resets the tool.
**How to avoid:** keep D-23 as locked, but (a) in the handler return early when an open dialog exists (`document.querySelector('[role="dialog"][data-state="open"]')`), (b) strongly consider a tiny "Restore your text" affordance after an Esc reset of non-sample text (store `previousTextRef`) — see Open Question 2. Esc also: `seqRef.current++`, `client.cancel()`, `setText(SAMPLE)`, `setResult(SAMPLE_RESULT)`, `setExpected("")`, clear `hashError`. Do **not** reset the encoding/format toggles.

### Pitfall 7: Select-on-focus is undone by mouseup
**What goes wrong:** D-03 `onFocus={e => e.currentTarget.select()}` — in Safari/Chrome the subsequent mouseup collapses the selection on click-to-focus.
**How to avoid:** select in `onFocus` via `requestAnimationFrame`/`setTimeout(0)`, or `preventDefault` the first `mouseup`. Only when `text === SAMPLE_TEXT`. The `/` shortcut always focuses then selects all (keyboard-initiated; no mouseup problem). Verify in Playwright (`page.keyboard.press("/")`, type `a`, expect value `a`). [ASSUMED: browser-specific behaviour, Assumption A2]

### Pitfall 8: iOS zoom and CLS from textarea
Use `text-base` (16px) on the textarea at mobile (the shared `Input` uses `text-base md:text-sm`) to avoid iOS focus-zoom; set a fixed `rows`/`min-h` and `resize-y` with a max so the island height is deterministic (CLS). Reserved-height slots for: byte-count line, hint line, soft-cap warning, error message, verify result line. Never insert these into flow conditionally without reserved space (use `min-h` or always-render with empty text) — the skeleton must match the *rest* height.

### Pitfall 9: Phase 8 client WR-01 / WR-02 are still open
**What goes wrong:** `start()` can reject if `postMessage` throws (`DataCloneError`) and leave `current` dangling; a worker `messageerror` is not handled so a promise can hang forever [VERIFIED: 08-VERIFICATION.md advisory + client.ts read this session].
**How to avoid:** minimum: `.catch()` on every `start()` call in the component (Pattern 2). Recommended: a small task fixing both in `client.ts` (try/catch around `postMessage` -> `settle({status:"error",...})`; `w.onmessageerror` -> settle error) with `client.test.ts` cases, keeping imports type-only from `./types`. The text path (plain string) is a very unlikely trigger, so this is robustness, not a blocker.

### Pitfall 10: Hard-coded 4-tool fallout and ordering
Sorting is `featured` desc then name asc [VERIFIED: tools/registry.ts]. With `featured: false` and name "Hash Generator", order becomes **Subnet, UUID, DNS, Hash, MAC**. Every test asserting the list, counts or order must be updated (list in Registry Fallout below). Also verify the desktop nav (hidden below `sm`) still fits 5 links at 640px — add a width check.

### Pitfall 11: `ICONS` silent fallback
`const Icon = ICONS[tool.icon] ?? Fingerprint;` [VERIFIED: components/ToolCard.tsx read this session]. A missing `Hash` entry renders the UUID icon with no error. Add the import + entry **and** a test that the rendered SVG is the Hash icon (lucide renders a `lucide-hash` class [ASSUMED], or compare against the Fingerprint render).

### Pitfall 12: Textarea CRLF and byte count
`textarea.value` returns LF-normalized text (browser "API value" semantics) so pasted CRLF becomes LF; the byte count and digest reflect the normalized text. This is documented behavior, hinted in D-09 and explained in FAQ; file mode (Phase 10) is the byte-exact path. [ASSUMED: HTML spec behavior, not run in a browser this session — Assumption A1; add a Playwright check that pasting `a\r\nb` yields 3 bytes.]

### Pitfall 13: Analytics
`PacketoryAnalytics.redactBeforeSend` already strips all query params unless allow-listed, and `DEFAULT_ALLOW_LIST` is `[]` [VERIFIED: lib/analytics/redact.ts + PacketoryAnalytics.tsx read this session]. Phase 9 must add only the regression test (e.g. `redactParams("?text=secret", DEFAULT_ALLOW_LIST)` -> `{}` and `DEFAULT_ALLOW_LIST` not containing `"text"`). Do not edit `redact.ts`. Fragment redaction is Phase 10 (INTG-03).

## Code Examples

### sample.ts and its pin test
Values below were computed this session with `node:crypto` / `zlib.crc32` (Node v22.13.1) [VERIFIED: node run this session]:
```ts
// lib/hash/sample.ts  (no engine import)
export const SAMPLE_TEXT = "hello world";
export const SAMPLE_DIGEST_HEX: Record<AlgorithmId, string> = {
  md5: "5eb63bbbe01eeed093cb22bb8f5acdc3",
  sha1: "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed",
  sha224: "2f05477fc24bb4faefd86517156dafdecec45b8ad3cf2522a563582b",
  sha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  sha384: "fdbd8e75a67f29f701a4e040385e2e23986303ea10239211af907fcbb83578b3e417cb71ce646efd0819dd8c088de1bd",
  sha512: "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f",
  "sha3-256": "644bcc7e564373040999aac89e7622f3ca71fba1d972fd94a31c3bfbf24e3938",
  "sha3-512": "840006653e9ac9e95117a15c915caab81662918e925de9e004f774ff82d7079a40d4d27b1b372657c61d46d470304c88c788b3a4527ad074d1dccbee5dbaa99a",
  ripemd160: "98c615784ccb5fe5936fbc0cbe9dfdb408d92f0f",
  crc32: "0d4a1185",
};
```
Pin test (`// @vitest-environment node`): hash `SAMPLE_TEXT` through `runHashJob(bytesChunks(encodeText(SAMPLE_TEXT)))` (tests may import `job`) **and** compare to `node:crypto` for the 9 crypto algorithms and `zlib.crc32` (needs Node >= 22.2; same oracle Phase 8 uses), asserting `toHex(digest) === SAMPLE_DIGEST_HEX[id]` for all `ALGORITHM_IDS`, and that the record has exactly the 10 ids in `ALGORITHM_IDS`. The empty-string digests (SHA-256 `e3b0c442...b855`, CRC32 `00000000`, SHA3-256 `a7ffc6f8...f8434a`) are already pinned by Phase 8; the empty-input UI test can rely on a mocked client.

### Registry entry
```ts
// tools/registry.ts — shape per ToolDefinition [VERIFIED: Read this session]
{
  slug: "hash",
  name: "Hash Generator",
  shortName: "Hash",
  description:
    "Compute MD5, SHA-1, SHA-2, SHA-3, RIPEMD-160 and CRC32 digests of any text as you type, copy them as hex or Base64, and verify a checksum — all in your browser.",
  category: "encode",
  keywords: ["hash", "sha256", "md5", "sha1", "checksum", "crc32", "sha3"],
  icon: "Hash",
  status: "active",
  clientOnly: true,
  featured: false,
},
```
(`ToolCard` clamps description to 2 lines; keep it concise. `featured:false` keeps sitemap priority 0.7 and the order above. Tests that assert the "category" label: `CATEGORY_LABELS.encode = "Encode"` already exists.)

### Textarea attributes (D-24)
```tsx
<Textarea
  id="hash-input" ref={textareaRef} data-testid="hash-input"
  value={text} onChange={(e) => handleTextChange(e.target.value)}
  spellCheck={false} autoCorrect="off" autoCapitalize="off" autoComplete="off"
  data-1p-ignore data-lpignore="true" data-form-type="other"
  aria-describedby="hash-input-meta" rows={4} className="font-mono ..."
/>
```
Do **not** pass an `onKeyDown` that touches Enter. Include `aria-label`/visible `Label`.

### Keyboard wiring
```tsx
useKeyboardShortcut({
  slash: () => { const el = textareaRef.current; if (el) { el.focus(); el.select(); } },
  escape: () => { if (dialogOpen()) return; resetToSample(); },
  copy: () => { if (window.getSelection()?.toString()) return; primaryCopy.copy(primaryDisplayedValue); },
  // enter: intentionally omitted (INT-01) — Enter inserts a newline in the textarea
});
```

### Redact regression (D-22)
```ts
it("HASH-TEXT regression: ?text= is stripped and 'text' is never allow-listed", () => {
  expect(redactParams("?text=hunter2%0Asecret", DEFAULT_ALLOW_LIST)).toEqual({});
  expect(DEFAULT_ALLOW_LIST).not.toContain("text");
});
```
Optional: an RTL test of `PacketoryAnalytics`'s `beforeSend` is not required (Phase 1 covers it); Phase 10 adds the fragment/network proof.

### Registry fallout (D-25) — complete list found this session
| File | Change |
|------|--------|
| `tools/registry.ts` | add entry |
| `components/ToolCard.tsx` | `import { Hash } from "lucide-react"`; add to `ICONS` |
| `tools/registry.test.ts` | `toHaveLength(5)`; sorted slugs `["dns","hash","mac","subnet","uuid"]`; `getSortedTools()` order `["subnet","uuid","dns","hash","mac"]`; statuses object adds `hash: "active"`; update test titles mentioning "four" |
| `app/sitemap.test.ts` | add `${BASE_URL}/tools/hash` to the expected list; add `"hash"` to `registrySlugs` literal guard |
| `tests/e2e/home.spec.ts` | `toHaveCount(5)` x2, loop bound 5, expected name order `[IP Subnet Calculator, UUID Generator, DNS Lookup, Hash Generator, MAC Address Inspector]`, update test titles ("four") |
| `tests/e2e/navigation.spec.ts` | `drawer.locator("a")` count 5; add `"Hash"` to the shortName loop; add a `mobile-nav-link` visibility assertion for Hash |
| `components/ToolCard.test.tsx` | optional: Hash icon assertion (Pitfall 11) |
| `app/layout.tsx` root `description` | lists four tools by name — optional copy refresh; not required by INTG-01 (flag to user; it is not privacy wording) |
`components/SiteHeader.tsx`, `MobileNav.tsx`, `app/sitemap.ts` derive from the registry and need **no edits**.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Debounced "Hash" submit button | Live, all-algorithms-at-once, worker-backed | Zero-effort default; matches brief |
| Live URL sync of input (DNS/Subnet) | Read-on-load + explicit capped "Copy link" for the Hash tool | Avoids leaking secrets into history/bookmarks (milestone research Pitfall 9) |
| Web Crypto `subtle.digest` | `@noble/hashes` in a worker | `subtle` lacks MD5/SHA-3/RIPEMD/CRC32 and is async-only (Phase 8 decision) |

**Deprecated/outdated:** none relevant.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `textarea.value` normalizes pasted CRLF to LF in Chrome/Firefox/Safari | Pitfall 12 | Byte count/hint wording would be wrong; add e2e check to confirm |
| A2 | `select()` in `onFocus` is undone by the following `mouseup` in some browsers | Pitfall 7 | Over-engineering only (a `setTimeout` select is harmless) |
| A3 | lucide renders a `lucide-hash` class on the SVG | Pitfall 11 | The ToolCard icon test would need a different assertion; planner verifies in Wave 0 |
| A4 | `Uint8Array.prototype.toBase64` not yet universally available | Standard Stack | None — `btoa` approach works either way |
| A5 | 5 links fit in the desktop nav between 640px and 768px | Pitfall 10 | Header overflow at narrow desktop widths; add a 640px assertion |
| A6 | Firefox/Safari run the module Worker like Chrome (Phase 8 UAT recorded a manual pass in STATE.md, but 08-VERIFICATION flagged it as unrecorded) | Pattern 3 | Hash never computes in that browser; client degrades to `error` outcome — surface an inline message |

## Open Questions (RESOLVED)

All five questions were resolved on 2026-10-15 as autonomous decisions under user delegation: the user was away and authorized the orchestrator to make the remaining decisions per best practice and best user experience. The numbers below match "autonomous decision N" in the Phase 9 plans.

1. **What happens to the Phase 8 `app/hash-smoke` harness?**
   - What we know: its page comment says it "is deleted and replaced by `/tools/hash` in Phase 9"; CONTEXT says it "stays as the Phase 8 test harness"; `tests/e2e-prod/hash-worker.spec.ts`, `tests/e2e/hash-smoke-gate.spec.ts` and the CI step depend on it. Phase 10 owns the prod e2e (INTG-04).
   - Recommendation: **keep it** (follow CONTEXT, lowest risk); defer deletion/migration of the prod worker proof to Phase 10. Do not register it anywhere.
   - **RESOLVED:** Keep `app/hash-smoke` unchanged in Phase 9 and do not register it anywhere; migration or deletion moves to Phase 10. Autonomous decision under user delegation, 2026-10-15 (autonomous decision 1). 09-07 asserts that `app/hash-smoke`, `tests/e2e-prod` and `playwright.prod.config.ts` are unchanged.

2. **Esc data loss (Pitfall 6).**
   - D-23 is locked (Esc restores sample). Recommendation (needs a quick user OK since it adds UI): after an Esc reset of non-sample text, show a one-line "Restore your text" button until the next edit. Costs ~10 lines; otherwise accept data loss as specified.
   - **RESOLVED:** Add "Restore your text" after an Esc reset of non-sample text, cleared on the next edit. This adds to D-23 and does not replace it: Esc still cancels, restores the sample and clears verify. Autonomous decision under user delegation, 2026-10-15 (autonomous decision 2), standing in for the user OK this question asked for. Implemented in 09-07.

3. **Fix WR-01/WR-02 in `client.ts` now or only guard in the component?**
   - Recommendation: do both — component `.catch()` (mandatory) and a tiny hardened `client.ts` + tests (one small task, no new imports).
   - **RESOLVED:** Do both. 09-02 hardens WR-01/WR-02 in `lib/hash/client.ts` with tests, and `client.ts` keeps a single type-only import block (boundary guard stays green). The 09-01 island adds the component `.catch()`. Autonomous decision under user delegation, 2026-10-15 (autonomous decision 3).

4. **"Copy link" absolute vs relative.**
   - D-21 says `/tools/hash?text=<encoded>`. Recommendation: copy `window.location.origin + "/tools/hash?text=" + encoded` so the pasted link is clickable anywhere (preview deployments get their own origin). The 2,000 cap applies to the encoded text value only.
   - **RESOLVED:** Copy link copies the absolute URL `window.location.origin + "/tools/hash?text=" + encoded`. The 2,000-character cap applies to the encoded `text` value only. Autonomous decision under user delegation, 2026-10-15 (autonomous decision 4). Implemented in 09-06.

5. **Verify restricted by algorithm prefix?** If the user pastes `sha256:<sha3-256 digest>` we still highlight the SHA3-256 row (true match). Recommendation: keep D-18 behavior (match any row); do not add restriction.
   - **RESOLVED:** Keep D-18: match any row regardless of algorithm prefix, with no prefix-based restriction. Autonomous decision under user delegation, 2026-10-15 (autonomous decision 5). Implemented in 09-05.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest, build, `zlib.crc32` oracle (needs >= 22.2) | yes | v22.13.1 | — |
| npm / installed deps | all | yes (node_modules present) | per package.json | — |
| Playwright Chromium | e2e | Phase 8 ran it | 1.61.1 | — (Firefox/Safari manual only) |
| `next dev` worker support | e2e interaction tests in `tests/e2e` | yes — Phase 8 research verified dev + prod in Chrome | Next 16.2.11 | If dev e2e flakes, put the interaction specs under `tests/e2e-prod` (builds + serves) |
| `next build` | prod e2e | yes (CI step exists) | — | — |

No missing dependencies. Do not run the dev e2e config and the prod config concurrently in one checkout (shared `.next`); prod config uses port 3101 [VERIFIED: playwright.prod.config.ts].

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 + fast-check 4.9.0 / @fast-check/vitest 0.4.1 + Testing Library 16.3.2 (jsdom); Playwright 1.61.1 |
| Config file | `vitest.config.ts` (jsdom default; pure modules use `// @vitest-environment node`; excludes `tests/e2e/**`); `playwright.config.ts` (dev server :3000); `playwright.prod.config.ts` (build+start :3101, `tests/e2e-prod`) |
| Quick run command | `npx vitest run lib/hash app/tools/hash tools app/sitemap.test.ts components lib/analytics` |
| Full suite command | `npm run typecheck && npm run lint && npm test && npx playwright test && npm run test:e2e:prod` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEXT-01 | sample constants == engine == node oracle; island renders 10 rows with zero worker calls on mount; no CLS on skeleton->island swap | unit + RTL + e2e | `npx vitest run lib/hash/sample.test.ts app/tools/hash/HashTool.test.tsx`; `npx playwright test tests/e2e/hash.spec.ts -g CLS` | ❌ Wave 0 |
| TEXT-02 | out-of-order results (deferred promises) never overwrite newer; `cancelled` ignored; error shows inline, keeps last digests; StrictMode remount works | RTL (`vi.mock("@/lib/hash/client")`) | `npx vitest run app/tools/hash/HashTool.test.tsx` | ❌ Wave 0 |
| TEXT-03 | byte count for `é`=2, `€`=3, `🚀`=4, lone surrogate=3; hint text present; soft-cap warning > 1 MiB; debounce only above cap | RTL | same | ❌ Wave 0 |
| TEXT-04 | `?text=` restore (client.start called with it); typing never calls `history.replaceState/pushState` and `location.search` unchanged; Copy link builds encoded URL; disabled > 2000 encoded chars; lone-surrogate does not throw; redact regression | RTL + unit + e2e | `npx vitest run app/tools/hash lib/analytics/redact.test.ts`; `npx playwright test tests/e2e/hash.spec.ts -g "text="` | ❌ Wave 0 (redact.test.ts exists, add case) |
| OUT-01 | per-row copy writes displayed value; "Copied!" confirmation + `aria-live` | RTL (stub `navigator.clipboard`) | HashTool.test.tsx | ❌ |
| OUT-02 | labeled list and checksum-line text exact (`<hash>  -`, `# LABEL`, lowercase regardless of toggle) | unit (pure) + RTL | `npx vitest run lib/hash/export.test.ts` | ❌ |
| OUT-03 | `formatDigest` hex/HEX/Base64 incl. CRC32 stays hex; toggle does not call `client.start` | unit + fast-check (base64 round-trip vs `Buffer`) + RTL | `npx vitest run lib/hash/format.test.ts` | ✅ extend |
| OUT-04 | normalization table + equal-length algorithm cases + no-match + hint + idle; re-evaluates on digest change; Esc clears | unit (+fast-check) + RTL | `npx vitest run lib/hash/verify.test.ts` | ❌ |
| OUT-05 | MD5/SHA-1/CRC32 rows show text badge, others do not; driven by `notForSecurity` | RTL | HashTool.test.tsx | ❌ |
| INT-01 | `/` focuses+selects; Esc cancels (`client.cancel` called) + restores sample + clears verify; copy shortcut copies SHA-256 and is skipped when text is selected; Enter in textarea is not default-prevented and inserts newline (e2e) | RTL + e2e | HashTool.test.tsx; `npx playwright test tests/e2e/hash.spec.ts -g keyboard` | ❌ |
| INT-03 | 320px: `scrollWidth <= clientWidth`, long SHA-512 row wraps; light and dark | e2e | `npx playwright test tests/e2e/hash.spec.ts -g 320px` | ❌ |
| INTG-01 | registry/sitemap/nav/grid counts + order; Hash icon not the fallback | unit + e2e | `npx vitest run tools app/sitemap.test.ts components/ToolCard.test.tsx`; `npx playwright test tests/e2e/home.spec.ts tests/e2e/navigation.spec.ts` | ✅ update |
| INTG-02 | title/description/canonical (no `?text`)/OG; worked example; FAQ topics; JSON-LD parsed equals visible FAQ | e2e + unit | `npx playwright test tests/e2e/hash-seo.spec.ts`; `npx vitest run app/tools/hash/faq-data.test.ts` | ❌ |

CLS test recipe (no existing precedent): `page.goto("/tools/hash")`; record `boundingBox().y` of the "Worked example" heading as soon as the skeleton is visible and again after `hash-tool` (island root) is visible; assert the difference is within 1px at 320 and 1280 widths. Alternatively add a `PerformanceObserver({type:"layout-shift"})` via `page.addInitScript` and assert cumulative value ~0. Phase 10 owns the Lighthouse 90+ gate.

### Sampling Rate
- **Per task commit:** `npx vitest run lib/hash app/tools/hash` (< 5 s)
- **Per wave merge:** `npm run typecheck && npm run lint && npm test`
- **Phase gate:** full suite incl. `npx playwright test` green; `npm run build` succeeds; `test:e2e:prod` still green (the smoke harness is untouched) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/hash/sample.ts` + `sample.test.ts` — TEXT-01 pin
- [ ] `lib/hash/verify.ts` + `verify.test.ts`; `lib/hash/export.ts` + `export.test.ts`; `format.ts`/`format.test.ts` extensions
- [ ] `components/ui/textarea.tsx`
- [ ] `app/tools/hash/HashTool.test.tsx` (hoisted `vi.mock("@/lib/hash/client")` returning a controllable fake `{start, cancel, dispose}` with deferred promises; `navigator.clipboard` stub)
- [ ] `tests/e2e/hash.spec.ts`, `tests/e2e/hash-seo.spec.ts`
- [ ] Update the four hard-coded-count tests + `redact.test.ts` case
- Framework install: none.

## Security Domain

`security_enforcement` is enabled (absent/true), `security_asvs_level: 1`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | no accounts |
| V3 Session Management | no | no sessions |
| V4 Access Control | no | no protected resources |
| V5 Input Validation | yes | `?text=` and the verify box are untrusted strings: only ever rendered through React (auto-escaped) or compared as strings; never `dangerouslySetInnerHTML` except the static, author-controlled JSON-LD with `<` -> `<`; length-cap Copy link; try/catch `encodeURIComponent` |
| V6 Cryptography | yes | Never hand-roll: use Phase 8 engine; copy hints state MD5/SHA-1/CRC32 are not for security; no password-hashing guidance beyond a FAQ note |
| V8 Data Protection / privacy | yes | typed text never in URL (until explicit Copy link), analytics (`text` not allow-listed), `console`, errors, or storage (no localStorage); worker messages already exclude text (Phase 8 `worker-core.ts` header) |
| V13/V14 Config | yes | no new network origin; no new packages |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret typed into the tool leaks via URL/history/analytics | Information Disclosure | read-only `?text=`; explicit capped "Copy link" with "link contains your text" notice; `redact.ts` allow-list stays empty; regression test |
| Reflected `?text=` rendered as HTML | Tampering / XSS | React escaping only; value goes into a controlled textarea `value`; no HTML sinks |
| JSON-LD injection via FAQ strings | Tampering | static data + `.replace(/</g, "\\u003c")` (existing pattern) |
| Misleading "MATCH" read as authenticity | Spoofing (user trust) | neutral wording "Matches the expected SHA-256"; FAQ entry that a match != authenticity (D-26) |
| Password-manager / autofill capturing the textarea | Information Disclosure | D-24 attributes |
| Clipboard overwrite surprise | Tampering | selection guard on the `copy` shortcut; copy only on explicit action |
| ReDoS in verify normalization on 1 MiB paste | DoS | all regexes anchored/linear; cap the verify input `maxLength` (e.g. 4096 chars) |

## Sources

### Primary (HIGH confidence — read/run this session)
- Repo files read this session: `lib/hash/{client,algorithms,format,types,source,job,worker-core,boundaries.test}.ts`, `lib/hooks/{useCopyToClipboard,useKeyboardShortcut}.ts`, `lib/analytics/{redact,PacketoryAnalytics,redact.test}`, `app/tools/mac/{MacToolLoader,page,faq-data,MacTool(.test)}.tsx`, `app/tools/subnet/SubnetTool.tsx` (URL helpers), `app/tools/uuid/UuidTool.tsx`, `app/hash-smoke/*`, `app/layout.tsx`, `app/sitemap(.test).ts`, `tools/registry(.test).ts`, `components/{ToolCard,SiteHeader}.tsx`, `components/ui/{toggle-group,badge,input}.tsx`, `tests/e2e/{home,navigation,mac-lookup,uuid-seo,hash-smoke-gate}.spec.ts`, `playwright*.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `package.json`
- Planning docs: `09-CONTEXT.md`, `REQUIREMENTS.md`, `STATE.md`, `ROADMAP.md` (Phase 9), `08-VERIFICATION.md`, `08-REVIEW(-DISPOSITION).md`, `08-RESEARCH.md` (dev/prod worker verification), `.planning/research/{FEATURES,PITFALLS,ARCHITECTURE}.md`
- Node runs: digests of `hello world` / empty string via `node:crypto` + `zlib.crc32`; `encodeURIComponent` lone-surrogate behavior; `URLSearchParams` malformed-escape and `+` behavior; `TextEncoder` lone-surrogate output; `"é€🚀"` = 9 bytes

### Secondary / Tertiary
- None. No web research was needed: no new libraries, and browser-behavior items are tagged `[ASSUMED]` in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all modules read in this repo.
- Architecture: HIGH — direct copies of three shipped tool patterns; lifecycle/StrictMode and lint constraints derived from read code.
- Pitfalls: HIGH for repo-derived ones (client dispose, boundaries test, ICONS fallback, hook behavior, URIError); MEDIUM for browser-behavior ones (A1, A2).
- Verify-normalization rules: MEDIUM-HIGH — deterministic design resolving CONTEXT ambiguities; must be locked by the table-driven tests above.

**Research date:** 2026-10-15
**Valid until:** 2026-11-14 (re-run the worker smoke on any Next.js bump, per Phase 8 research)
