# Phase 4: DNS Lookup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 4-DNS Lookup
**Areas discussed:** Resolver choice & privacy posture, Error/loading state design, In-flight / debounce UX, Record-type selector & demo domain

---

## Resolver choice & privacy posture

| Option | Description | Selected |
|--------|-------------|----------|
| Ship with Cloudflare + Google, note it transparently | Use the verified, ready pair now; add a plain-language FAQ/privacy-notice disclosure | ✓ |
| Ship with Cloudflare + Google, no special callout | Same technical choice, no extra privacy messaging | |
| Research a privacy-focused resolver first | Investigate Quad9's actual DoH JSON endpoint before committing; delays the phase | |

**User's choice:** Ship with Cloudflare + Google, note it transparently
**Notes:** Cloudflare primary / Google fallback are both live-verified and CORS-open per `.planning/research/STACK.md`; Quad9 was tested during research but its DoH JSON endpoint didn't respond, so it wasn't a real option without more work.

| Option | Description | Selected |
|--------|-------------|----------|
| Never report type either | Keep DNS lookups fully out of analytics, same posture as Subnet's `cidr` | ✓ |
| Allow-list `type` only, never `name` | Report record-type popularity while keeping the domain excluded | |

**User's choice:** Never report type either
**Notes:** Consistency with Subnet's `cidr` precedent won out over the minor product-analytics value of record-type popularity.

---

## Error/loading state design

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct icon + short label + one-line explanation | Each of the 5 states gets its own icon, label, and plain-language sentence | ✓ |
| Color-coded banner only | Banner color distinguishes states, text message | |
| Plain text only, no icons/color coding | Minimal visual weight, most accessible by default | |

**User's choice:** Distinct icon + short label + one-line explanation
**Notes:** Matches Subnet's scannable inline-validation style.

| Option | Description | Selected |
|--------|-------------|----------|
| Spell out the distinction explicitly | e.g. "No such domain" vs "No MX records — domain exists but has none" | ✓ |
| Keep both terse, trust the record-type context | Shorter messages, relies on user inference | |

**User's choice:** Spell out the distinction explicitly

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit retry button in the error message | "Try again" button in the error card itself | ✓ |
| Just explain, reuse the existing refresh control | No dedicated button, rely on DNS-05's general refresh | |

**User's choice:** Explicit retry button in the error message

---

## In-flight / debounce UX

| Option | Description | Selected |
|--------|-------------|----------|
| Keep previous result visible, dimmed + subtle spinner | Last valid result stays on screen at reduced opacity with a loading indicator | ✓ |
| Clear immediately, show a loading skeleton | Result area empties instantly, shows skeleton | |
| No visual change until the new result lands | No feedback during debounce/network wait | |

**User's choice:** Keep previous result visible, dimmed + subtle spinner
**Notes:** Mirrors Subnet's "keep last valid grid visible" pattern for invalid input, extended to network-latency states.

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed-height skeleton placeholder | Reserves exact result-panel height, CLS-free | ✓ |
| Blank space until the result appears | Simpler but risks layout shift | |

**User's choice:** Fixed-height skeleton placeholder

---

## Record-type selector & demo domain

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented control / tab row, single-select | All 6 types visible as toggle buttons, one click to switch | ✓ |
| Dropdown select, single-select | Compact but requires a click to open | |

**User's choice:** Segmented control / tab row, single-select
**Notes:** Reuses UUID's existing toggle-group pattern (case/hyphen controls).

| Option | Description | Selected |
|--------|-------------|----------|
| cloudflare.com | Rich, stable record set across A/AAAA/MX/TXT/NS; thematically fits the primary resolver | ✓ |
| example.com | RFC 2606 reserved domain, stable but sparse MX/TXT records | |
| Something else — I'll specify | User-provided alternative | |

**User's choice:** cloudflare.com

| Option | Description | Selected |
|--------|-------------|----------|
| A | Most familiar/expected default | ✓ |
| NS | Shows off Cloudflare's own nameservers, less intuitive | |

**User's choice:** A

---

## Claude's Discretion

None — all four discussed areas reached explicit user decisions (recommended option accepted every round).

## Deferred Ideas

None — discussion stayed within phase scope. A more privacy-focused DNS resolver (verifying Quad9's actual DoH JSON endpoint, or another EU-based alternative) was considered under "Resolver choice & privacy posture" and explicitly not pursued this phase — worth revisiting only if Cloudflare/Google reliability or privacy concerns become a real problem in production.
