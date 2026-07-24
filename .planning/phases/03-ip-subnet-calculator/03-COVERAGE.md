# API Capability Coverage — Phase 3 (IP Subnet Calculator)

**Generated:** 2026-07-24
**Detector result:** `detected: true` (two signals, both false positives)

## Why this file exists (and why the surface is empty)

The API-coverage detector fired on two signals, both substring matches on the word "API" referring to browser/framework-internal concepts, not an external service:

1. `{ "verb": "wrapping", "noun": "api", "snippet": "…nt takes no props and reads no request-time query API, so the route stays statically prerendered (RESEA…" }` — this is 03-01-PLAN.md describing that `page.tsx` deliberately does **not** read Next.js's `searchParams` **prop** (referred to in RESEARCH.md as a "Request-time API" per Next's own docs), specifically so the route stays statically prerendered. It is a framework rendering-model term, not an external integration.
2. `{ "verb": "(surface)", "noun": "api", "snippet": "<action>Create page.tsx as a plain static Server Component mirroring UuidPage…" }` — a broad co-occurrence match inside the same task block, which goes on to describe writing URL state via `window.history.replaceState` — the browser's native **History API**.

Per CLAUDE.md's project-wide constraint ("No third-party requests for tools that can operate fully locally") and RESEARCH.md's explicit architecture decision, this phase performs all subnet/CIDR math client-side with **zero network calls**:

- **Pattern 1 (RESEARCH.md):** `page.tsx` never reads `searchParams`, keeping the route statically prerendered — no server-side request-time API involved.
- **Pattern 2 (RESEARCH.md):** URL state (`?cidr=`) is read/written entirely via the browser's native `window.location.search` / `window.history.replaceState` — not a network API, not a third-party service, not even Next.js's router.

There is therefore **no external capability surface to enumerate** — nothing to opt in or out of. This file records that determination so the phase can seal without a hidden gap.

## Capability Matrix

The only "API"-shaped terms in this phase's docs are browser-native/framework-internal, not services we integrate with (strict 3-column schema required by the `api-coverage` gate parser):

| capability | decision | reason |
|------------|----------|--------|
| Next.js `searchParams` request-time prop | OPT-OUT | Deliberately never read (RESEARCH Pattern 1) — would force per-request dynamic rendering, regressing static-first. Framework feature, not a service. |
| Browser History API (`window.history.replaceState`, `window.location.search`) | INTEGRATE | Native browser API, zero third-party dependency. Used for `?cidr=` URL bookmark state (SUBNET-07, Plan 03-01). Not an external service. |
| Any third-party / external network API, SDK, or service | OPT-OUT | Excluded by CLAUDE.md's "no third-party requests for tools that can operate fully locally" constraint. All computation is client-side BigInt math (`lib/subnet/*.ts`). Locked project decision. |

## Conclusion

No external API/SDK/service is integrated in Phase 3. Both detector signals resolve to browser-native (History API) or Next.js framework-internal (`searchParams` prop) terms, not third-party integrations. No further coverage decisions are required from the user.
