# Milestones

## v1.2 Hash Generator (Shipped: 2026-10-17)

**Phases completed:** 2 phases, 14 plans, 26 tasks
**Delivered:** a sixth tool, the text-only Hash Generator at `/tools/hash` (10 algorithms, in-browser Web Worker), merged together with the externally contributed Config Syntax Highlighter (PRs #14/#15) via PR #16.
**Git range:** v1.1..34995af — 126 commits, 80 non-planning files changed (+8,362 / −49)
**Closeout:** override_closeout — Phase 8 and 9 VERIFICATION.md reports were stale at close (source changed after the last verifier run: the origin/main merge and quick task 261017-f4s). User chose to close without re-verifying; UAT 5/5 passed and all local checks were green on the merged code. No milestone audit was run.
Known verification overrides: 2 newly acknowledged, 0 carried forward

**Key accomplishments:**
- All 10 hash digests (MD5 through CRC32) computed by a Turbopack-bundled module Web Worker in a Next 16.2.11 production build, with `@noble/hashes@2.4.0` provably absent from main-thread JS
- Published-vector, padding-boundary, SHA3-not-Keccak, UTF-8, and chunk-split-invariance gate for all 10 hash algorithms against mandatory node:crypto / zlib.crc32 oracles, plus the noble-free `algorithms.ts` and `format.ts` modules Phase 9 renders from
- Deterministic Node tests (FakeWorker plus a real-hashing loopback worker) proving "the latest request wins and nothing stale is ever delivered" for the hash client and worker handler, with the HASH-02 no-echo privacy sentinel
- ESLint `no-restricted-imports` plus a source-walk import-graph test (with in-memory mutation proofs) keep @noble/hashes and the engine chain out of initial page JS, and unit plus dev-server tests prove /hash-smoke is 404 without HASH_SMOKE=1.
- Production-build Playwright proof that the hash worker handles chunked Blobs against node oracles, abandons a superseded 96 MiB job in well under 2 s, treats dispose as final and stays same-origin (`npm run test:e2e:prod`; run locally since the CI e2e job was removed 2026-10-17).
- `/tools/hash` paints the 10 digests of `hello world` from precomputed constants with zero worker calls, then hashes typed text live in the Phase 8 Web Worker with a latest-wins guard, exact UTF-8 byte count, newline hint, empty note and a 1 MiB soft cap debounced at 150 ms.
- `createHashClient.start()` can no longer reject or hang: a throwing start `postMessage` resolves an error outcome, and a worker `messageerror` settles the job, terminates the worker and rebuilds on the next start (WR-01, WR-02).
- Hash digest rows now have per-row copy with visible confirmation, a display-only hex / HEX / Base64 toggle (CRC32 stays hex), copy-all as a labeled list or sha256sum checksum lines, inline not-for-security badges and a primary SHA-256 row.
- Paste-to-verify for the Hash Generator: a tolerant checksum normalizer (case, spaces, colons, alias prefixes, 0x, BSD tags, sha256sum lines, Base64/base64url) that highlights every equal digest row, hints neutrally on malformed input, and never asserts a match against stale digests.
- `/tools/hash?text=...` restores its text with pending rows (never sample digests), typing never touches the address bar, and an explicit absolute 2,000-encoded-character-capped "Copy link" is the only way text enters a URL; analytics redaction of `text` is regression-tested.
- Keyboard-first Hash Generator: '/' focuses and selects, Esc resets to the sample with a "Restore your text" safety net, Ctrl/Cmd+C copies the SHA-256 guarded against selections and Shift/Alt chords (shared hook fix), Enter left unbound for newlines.
- /tools/hash gains a five-item FAQ with FAQPage JSON-LD generated from the same array, a worked example built from the pinned sample constants (including the echo-appends-newline digest), query-free canonical metadata e2e, and a root description listing the hash generator.

**Scope changes:**
- Phase 10 (File Hashing & Release Hardening) removed 2026-10-17 by user decision — file hashing was never wanted. FILE-01..05, INT-02, INTG-03 and INTG-04 moved to Out of Scope (not deferred).
- Accepted: Lighthouse on `/tools/hash` unmeasured; analytics redaction still ignores `#fragments` (no tool uses them).
- CI e2e job removed 2026-10-17 to save GitHub Actions minutes; the merge gate is typecheck/lint/test/build, and both Playwright suites are local-only.

---

## v1.1 Production Domain & Landing Page Polish (Shipped: 2026-07-25)

**Phases completed:** 2 phases, 3 plans, 7 tasks

**Key accomplishments:**

- ToolCard now uses the stretched-link pattern (Link + after:inset-0 inside CardTitle, relative on Card) so clicking anywhere on an active card navigates to its /tools/{slug} page, with a full-card hover/focus-visible ring; planned cards stay fully inert.
- Human-approved visual confirmation that the full-card hover/focus-visible accent ring built in plan 06-01 geometrically encloses the entire Card boundary — at desktop, at 320px, for active and featured states — with keyboard Enter navigation and planned-inert both confirmed.
- Docs-only reconciliation: DOM-03 confirmed complete via repo-wide audit (zero code changes needed — `SITE_URL` already the single origin source of truth), DOM-01 recorded verified-live, and DOM-02/DOM-04 explicitly recorded as descoped (not silently dropped) across REQUIREMENTS.md, ROADMAP.md, and PROJECT.md.

---

## v1.0 MVP (Shipped: 2026-07-25)

**Phases completed:** 5 phases, 21 plans, 60 tasks

**Key accomplishments:**

- Next.js 16 App Router walking skeleton: registry-driven "Coming soon" card grid for all four v1 tools, plus a no-flash light/dark theme toggle persisted to localStorage via `useSyncExternalStore`.
- Registry-driven `SiteHeader` (desktop nav + logo + theme-toggle mount) rendered on every route, a Radix-Dialog-based `MobileNav` Sheet drawer at 320px, and a reusable `useKeyboardShortcut` hook covering slash/enter/escape/copy — all unbound-safe until Phase 2 tool pages consume them.
- Server-side forwarded-IP parser with anti-spoof leftmost-entry selection, a `/api/ip` Route Handler, and a reusable `useCopyToClipboard` hook powering a secondary visitor-IP pill on the landing hero.
- Safe-by-default query-param redaction (allow-list, not block-list) wired through cookie-free Vercel Analytics, plus a human-approved privacy notice at /privacy linked from every page's footer
- Registry-derived `sitemap.xml`/`robots.txt`, a five-job GitHub Actions merge gate (typecheck/lint/test/build/e2e, no continue-on-error), and an end-to-end-verified Vercel production deploy + branch-protection merge gate at packetory.vercel.app.
- First tool page shipped: /tools/uuid renders a v4 UUID instantly via a next/dynamic(ssr:false) client-only boundary, with a one-click copy button reusing Phase 1's useCopyToClipboard, and the registry-driven nav/sitemap now surface the tool automatically.
- Extended the read-only UUID hero into a full generator: v4/v7 version toggle, a live 1-100 batch count with inline validation, an always-visible Regenerate control, and case/hyphen switches that reformat in place — with `lib/uuid/format.ts` locking the regenerate-vs-reformat distinction (D-01/D-02) as a pure, order-independent, round-trip-safe transform.
- `/tools/uuid` now has a full SEO/discovery layer: unique title/description mentioning both v4 and v7, a canonical URL and Open Graph tags built from the shared `SITE_URL` constant, a worked example showing a real v4 and v7 side by side, and 4 practical FAQ items backed by a server-rendered, non-drifting FAQPage JSON-LD block.
- Single export-format ToggleGroup (plain text / CSV / JSON) drives both Copy All and a Blob-based Download, completing UUID-05/UUID-06 via a new framework-agnostic `lib/uuid/export.ts` serializer with zero CSV-escaping dependency.
- IPv4 CIDR breakdown (network/broadcast/host range/mask/wildcard/binary) via a hand-rolled BigInt `lib/subnet/` module, rendered through the project's first client-only bookmarkable-URL tool (`?cidr=`) at `/tools/subnet`.
- RFC-5952 IPv6 compression/expansion and both-family reverse-DNS zone construction (`lib/subnet/format.ts` + `lib/subnet/reverse-dns.ts`), with the IPv4 grid's 8th field — the reverse-DNS zone — wired into `SubnetTool.tsx` complete with a boundary-truncation note.
- 128-bit BigInt `lib/subnet/ipv6.ts` math module plus the IPv6 field grid in `SubnetTool.tsx`, so an IPv6 CIDR now yields the same full, copyable, boundary-correct breakdown the IPv4 walking skeleton already had.
- Bounded `lib/subnet/subdivide.ts` next-step prefix list ({48,56,64}) plus a clickable "Subdivide this block" pill row in `SubnetTool.tsx` that replaces the top-level CIDR + URL and recomputes on click, closing SUBNET-05's interactive surface.
- Subnet tool page now has unique metadata, canonical/OG tags, a worked IPv4 + IPv6 example, and genuine FAQ content, all sourced from a single `faq-data.ts` feeding a drift-free FAQPage JSON-LD — while `/tools/subnet` stays a statically prerendered route.
- Client-side DNS-over-HTTPS lookup tool with Cloudflare-primary/Google-fallback resolution, debounce+AbortController+sequence-token race safety, and a bookmarkable `?name=&type=` URL, built entirely on `lib/dns/` framework-agnostic core logic with zero new dependencies.
- Full QUAL-08 5-state error matrix (invalid-input, NXDOMAIN, empty-NOERROR, rate-limited, resolver-unavailable) with distinct icons/copy/color roles and inline Try-again buttons, MX record display completeness, and an end-to-end proof of DNS-04's race-safety guarantee.
- Unique SEO metadata, a hand-verified cloudflare.com worked example, a genuine FAQ (including the D-02 Cloudflare/Google resolver disclosure and a DNS-09 transparency explanation), non-drifting FAQPage JSON-LD, and a matching disclosure line added to the published privacy notice.
- Closed the last DNS-04 race-safety gap by wiring `cancelInFlightLookup()` into `handleDomainChange`'s valid branch (one line) and proving it with a regression test that reproduces the exact typed-debounce-vs-in-flight sub-case 04-VERIFICATION.md identified as unfixed.
- Pure client-side MAC parse/format core (`lib/mac/`) plus the live `/tools/mac` page: demo MAC normalized into colon/dash/Cisco-dot/no-separator formats on load, live-updates on retype, per-field + copy-all clipboard confirmation, and a neutral dim-and-keep note on incomplete input — registry flipped to active.
- Pure, offline `classifyMac(bytes)` (`lib/mac/classify.ts`) deriving OUI/U-L/I-G/randomization from a MAC's first octet, wired synchronously into `MacTool.tsx` as a live OUI field + Lock/Unlock, User/Radio, and conditional ShieldAlert badge row with the locked D-08/D-09 copy — proven independent of any vendor network via a no-mock e2e (MAC-08).
- First upstream-fetching Route Handler (`/api/mac-vendor`) proxying OUI-only lookups to maclookup.app, wired into `MacTool.tsx` via a debounced, session-cached, race-safe client (`lib/mac/vendor.ts`) with all 4 neutral vendor states, the D-12 randomized-address skip, and MAC-08/MAC-09/MAC-10 guarantees proven by 47 new/updated tests.

---
