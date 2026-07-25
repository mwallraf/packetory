# Phase 1: Shared Shell + Registry - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 1-Shared Shell + Registry
**Areas discussed:** Landing page & tool status, Visitor IP widget, Theming (light/dark), Analytics & privacy notice

---

## Landing page & tool status

| Option | Description | Selected |
|--------|-------------|----------|
| Show all, "Coming soon" badge | All 5 tools appear now; planned ones show a muted badge and aren't clickable | ✓ |
| Only show active/beta tools | Registry can hold planned entries but landing page filters to active+beta only | |
| You decide | Claude picks | |

**User's choice:** Show all, "Coming soon" badge

---

| Option | Description | Selected |
|--------|-------------|----------|
| Flat grid, featured first | Single responsive grid sorted by featured flag then alphabetically | ✓ |
| Grouped by category | Cards grouped under category headers | |
| You decide | Claude picks | |

**User's choice:** Flat grid, featured first

---

| Option | Description | Selected |
|--------|-------------|----------|
| No landing-page target yet | Keyboard-hook framework built as plumbing; `/` inactive until tool pages exist | ✓ |
| Add a quick-switcher now | `/` opens a command-palette-style tool search using registry keywords | |
| You decide | Claude picks | |

**User's choice:** No landing-page target yet
**Notes:** Command palette explicitly deferred — see Deferred Ideas below.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hamburger menu | Logo + theme toggle visible, tool links collapse behind hamburger icon | ✓ |
| Home link only, no menu | No separate nav menu; landing page grid serves as the switcher | |
| You decide | Claude picks | |

**User's choice:** Hamburger menu

---

## Visitor IP widget

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel API route, request headers | Server route reads forwarded-IP header, no third-party call | ✓ |
| External IP-echo service | Client calls a public API like ipify | |
| You decide | Claude picks | |

**User's choice:** Vercel API route, request headers

---

| Option | Description | Selected |
|--------|-------------|----------|
| Whichever the request has | Display whatever address family the request provides | ✓ |
| Show both when available | Show IPv4 and IPv6 with separate copy buttons | |
| You decide | Claude picks | |

**User's choice:** Whichever the request has

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hide the widget | Widget doesn't render if no IP resolved | ✓ |
| Show a muted placeholder | Widget stays visible with an "unavailable" message | |
| You decide | Claude picks | |

**User's choice:** Hide the widget

---

| Option | Description | Selected |
|--------|-------------|----------|
| Small badge in header/hero | Compact pill near the top of the page, secondary to tool grid | ✓ |
| Its own card in the grid | Equal visual weight to tool cards | |
| You decide | Claude picks | |

**User's choice:** Small badge in header/hero

---

## Theming (light/dark)

| Option | Description | Selected |
|--------|-------------|----------|
| Match system preference | Respect prefers-color-scheme on first load | ✓ |
| Always light by default | Everyone starts light regardless of system setting | |
| You decide | Claude picks | |

**User's choice:** Match system preference

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, remember it (localStorage) | Explicit choice saved, overrides system preference on future visits | ✓ |
| No, always re-derive from system | Manual toggle only affects current session | |
| You decide | Claude picks | |

**User's choice:** Yes, remember it (localStorage)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Simple light/dark toggle | One icon button that flips between light and dark | ✓ |
| 3-way: light/dark/system | Small control with explicit system option | |
| You decide | Claude picks | |

**User's choice:** Simple light/dark toggle

---

## Analytics & privacy notice

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Analytics | Native to existing Vercel/Next.js stack, cookie-free by design | ✓ |
| Plausible | Dedicated privacy-first product, EU-hosted option available | |
| You decide | Claude picks | |

**User's choice:** Vercel Analytics

---

| Option | Description | Selected |
|--------|-------------|----------|
| Central redaction util in lib/ | Shared util every page routes through; safe-by-default allow-list | ✓ |
| Per-tool config in registry | Each ToolDefinition declares its own allowed params | |
| You decide | Claude picks | |

**User's choice:** Central redaction util in lib/

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated /privacy page + footer link | Standalone route linked from site footer | ✓ |
| Inline footer summary + link | Short summary in footer plus link to full page | |
| You decide | Claude picks | |

**User's choice:** Dedicated /privacy page + footer link

---

| Option | Description | Selected |
|--------|-------------|----------|
| Draft it, flag for review | Claude writes a real first-pass notice, flagged as needing sign-off | ✓ |
| Placeholder stub only | Route exists but content is a literal TODO | |
| You decide | Claude picks | |

**User's choice:** Draft it, flag for review

---

## Mobile responsiveness (raised via free-text)

User raised mobile-friendliness as a concern after the four planned areas were discussed. Confirmed it's already locked in as SHELL-06 (usable at 320px, no cumulative layout shift) and partially addressed via the Landing page area's hamburger-nav decision — treated as a baseline constraint across the whole phase rather than a new discussion area.

---

## Claude's Discretion

None — every discussed question reached an explicit user selection (no "you decide" choices this round).

## Deferred Ideas

- Command palette / `/`-triggered quick tool switcher using registry keywords — future phase, once tool count justifies it.
- Category-grouped landing page layout — revisit once more tools exist across more categories.
