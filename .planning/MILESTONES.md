# Milestones

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
