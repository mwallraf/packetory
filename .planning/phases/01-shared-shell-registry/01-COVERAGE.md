# API Capability Coverage — Phase 1 (Shared Shell + Registry)

**Generated:** 2026-07-21
**Detector result:** `detected: true` (single signal)

## Why this file exists (and why the surface is empty)

The API-coverage detector fired on one signal only:

> `{ "verb": "(surface)", "noun": "api", "snippet": "D-05: IP is determined server-side via a Vercel API route reading the incoming request's forwarded-IP header" }`

This is a **substring match on "Vercel API route"** — i.e. a Next.js App Router **Route Handler we author ourselves** (`app/api/ip/route.ts`), reading the incoming request's own forwarded-IP header. It is **not** the integration of a third-party API, SDK, or external service. Per CONTEXT.md the phase deliberately avoids third-party services:

- **D-05:** the visitor IP is read from the request's own `x-forwarded-for` / `x-real-ip` header set by the Vercel platform — explicitly "no third-party IP-echo service call."
- **D-12:** Vercel Analytics is native to the existing hosting stack (not a new vendor integration).

There is therefore **no external capability surface to enumerate** — nothing to opt in or out of. This file records that determination so the phase can seal without a hidden gap.

## Capability Matrix

The only "API"-shaped surface in this phase is our own internal route handler. Its full capability surface:

| Capability | Source | Disposition | Reason |
|------------|--------|-------------|--------|
| Read the request's forwarded-IP header (`x-forwarded-for`, fallback `x-real-ip`) and return the visitor's IP | `app/api/ip/route.ts` (D-05, Plan 03) | INTEGRATE | This is SHELL-03 — the whole point of the route. Fully covered by Plan 03. |
| Return whichever single address family (IPv4 or IPv6) the request provides | D-06 | INTEGRATE | Covered by Plan 03. |
| Signal "unavailable" (null) when no header is present so the client hides the widget | D-07 | INTEGRATE | Covered by Plan 03. |
| Any third-party / external IP-echo, geolocation, or vendor API | — | OPT-OUT | Explicitly excluded by D-05 ("no third-party requests when avoidable") and the brief's local-first / no-third-party-requests constraint. Not a gap — a locked decision. |

## Conclusion

No external API/SDK/service is integrated in Phase 1. The single internal Route Handler's capability surface is fully covered by Plan 03. No further coverage decisions are required from the user.
