# Phase 7: Production Domain Cutover (packetory.dev) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 7-Production Domain Cutover (packetory.dev)
**Areas discussed:** Gray-area selection (redirect rollout safety, redirect behavior & www handling, runbook location & depth, packetory.vercel.app long-term fate) — superseded by a scope-changing free-text answer; then Redirects, Runbook, Done-check

---

## Gray Area Selection

Presented 4 candidate areas based on codebase scouting (no redirect rule found in `next.config.ts`/`vercel.json`; site confirmed live with real traffic at `packetory.vercel.app`):
- Redirect rollout safety
- Redirect behavior & www handling
- Runbook location & depth
- packetory.vercel.app long-term fate

**User's response (free text, not a selection):** "Actually I have registered the domain packetory.dev and linked it in vercel, everything is working, I don't need redirects or anything. So I don't think anything else should be done, right?"

This reframed the whole phase — the premise (domain not yet registered) was out of date. Live verification was run in response.

**Live verification performed:**
| Check | Result |
|---|---|
| `curl -sI https://packetory.dev` | `HTTP/2 200`, valid TLS (`CN=packetory.dev`) |
| `curl -sI https://packetory.vercel.app` | `HTTP 200` — serves content directly, does NOT redirect |
| `curl https://www.packetory.dev` | TLS handshake fails — cert doesn't cover `www` |

---

## Redirects (DOM-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Still do the redirect work | Add the redirect rule now; note the www cert gap for the user to fix | |
| Skip redirects, close the phase as-is | Accept vercel.app staying live independently and www staying unconfigured; record as deliberate decision | ✓ |
| Let me clarify what I meant | User wanted to explain further before deciding | |

**User's choice:** Skip redirects, close the phase as-is.
**Notes:** Made with full knowledge that `packetory.vercel.app` currently serves duplicate content (no redirect) and `www.packetory.dev` currently fails TLS — evidence was shown before the choice was made.

---

## Runbook (DOM-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Skip it, no runbook needed | Already completed the manual steps by hand; phase becomes confirm-DOM-03 + record DOM-01 verified + DOM-02/DOM-04 descoped | ✓ |
| Still write a short retroactive runbook | Useful for future re-setup or as a template reference | |

**User's choice:** Skip it, no runbook needed.

---

## Done Check

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Lock in DOM-01 verified, DOM-03 confirmed correct, DOM-02/DOM-04 descoped | ✓ |
| Explore more gray areas | Something else worth discussing first | |

**User's choice:** I'm ready for context.

---

## Claude's Discretion

- Exact wording/placement of PROJECT.md/ROADMAP.md updates recording the new DOM-01/DOM-02/DOM-04 status.
- Whether the DOM-03 audit runs as its own plan step or folds into phase verification.

## Deferred Ideas

- `packetory.vercel.app` → `packetory.dev` redirect (not implemented; revisit if duplicate-content SEO or user confusion becomes a problem)
- `www.packetory.dev` TLS/domain fix in Vercel dashboard (not implemented; needs user to add `www` as a domain)
- Retroactive or reproducibility runbook for domain/DNS/SSL setup (not written; only worth doing if this becomes a template project or setup needs reproducing later)
