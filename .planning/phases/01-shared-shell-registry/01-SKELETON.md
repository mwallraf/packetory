# Walking Skeleton — Packetory

**Phase:** 1
**Generated:** 2026-07-21

## Capability Proven End-to-End

> One sentence: the smallest user-visible capability that exercises the full stack.

A visitor loads the deployed homepage, sees every registered tool rendered as a card from the single `tools/registry.ts` source (one real read), and toggles light/dark mode that persists across reloads (one real interaction) — served by a Next.js App Router build that passes lint, type-check, and CI.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript 7 | Locked in `.claude/CLAUDE.md` and PROJECT.md — not open for reconsideration. Static-first rendering, RSC by default, client islands only where interaction requires. |
| Styling / UI kit | Tailwind CSS 4 + shadcn/ui (`new-york`, baseColor `slate`, radius `0.5rem`, cssVariables) + `lucide-react` icons | UI-SPEC approved contract. shadcn blocks used this phase: Button, Badge, Card, Sheet, Tooltip, Separator. |
| Fonts | Geist Sans (UI/body) + Geist Mono (copyable technical values) via `next/font` / `geist` | UI-SPEC typography contract; mono is the copyable-value convention reused for UUIDs/CIDRs/MACs in later phases. |
| Data layer | None — no database. Tool metadata is a static, compile-time-typed `ToolDefinition[]` in `tools/registry.ts` | Local-first, static-first constraint. The registry is the single source of truth for grid, nav, and sitemap (SHELL-04). The one server-side read this phase is the visitor-IP route reading a forwarded header (D-05), not a DB. |
| Theme persistence | `localStorage` (NOT a cookie), system-preference default via `prefers-color-scheme` | D-09/D-10/D-11 + QUAL-07 no-tracking-cookies constraint. |
| Analytics | Vercel Analytics (cookie-free), all tracked query params routed through a safe-by-default allow-list util `lib/analytics/redact.ts` | D-12/D-13, QUAL-06. |
| Deployment target | Vercel connected to GitHub — `main` → production, feature branches → preview deployments; PRs gated by CI (tests/type-check/lint/build) | §9 brief workflow, QUAL-09. Local full-stack run: `npm run dev`. |
| Directory layout | Root-level `app/`, `components/`, `lib/`, `tools/` (no `src/`), path alias `@/*` → repo root | Brief §8 suggested structure verbatim; `tools/registry.ts` at root is the tool-registration integration point. |

## Stack Touched in Phase 1

- [x] Project scaffold (Next.js init, Tailwind 4, shadcn init, ESLint, Vitest + Playwright test runners)
- [x] Routing — real routes: `/` (landing), `/privacy`, `app/api/ip` (route handler), `app/sitemap.ts`, `app/robots.ts`
- [x] Real read — `tools/registry.ts` iterated into the landing grid, nav, and sitemap; the visitor-IP route reads a live forwarded-IP header
- [x] UI — interactive theme toggle (localStorage) and one-click copy button (visitor IP) wired with accessible confirmation
- [x] Deployment — Vercel production auto-deploy from `main` + PR preview deployments; documented local full-stack run `npm run dev`

## Out of Scope (Deferred to Later Slices)

> Anything that is *not* in the skeleton. Be explicit — prevents later phases from re-litigating Phase 1's minimalism.

- Any tool logic (UUID / Subnet / DNS / MAC) — all four ship as `status: "planned"` "Coming soon" cards only (D-01).
- The `/` keyboard shortcut having a real focus target — the keyboard hook is built as reusable plumbing now but binds no functional target until Phase 2 (D-03).
- Command palette / quick-switcher (deferred, CONTEXT.md).
- Category-grouped landing layout — flat grid only in Phase 1 (D-02).
- Per-tool SEO/FAQ/OG pages (QUAL-01/QUAL-02) — start Phase 2 with the first real tool page.
- Bookmarkable URL state / redaction of real tool params — the allow-list util is built now but has no tool params to redact until Phase 3.

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: UUID Generator — first real tool page; establishes the Server-shell/Client-island split, per-tool metadata, worked-example/FAQ pattern.
- Phase 3: IP Subnet Calculator — introduces bookmarkable URL state and BigInt-safe domain math; first real consumer of the analytics allow-list.
- Phase 4: DNS Lookup — first external async dependency (DoH), debounce + `AbortController` race-safety, resolver attribution.
- Phase 5: MAC Address Inspector — API-route/core-logic separation ahead of a future public API; OUI vendor lookup.
