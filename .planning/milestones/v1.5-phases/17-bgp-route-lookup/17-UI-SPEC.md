---
phase: "17"
slug: "bgp-route-lookup"
status: approved
shadcn_initialized: true
preset: radix-nova
created: "2026-11-27"
---

# Phase 17 — UI Design Contract

## Design System

| Property | Value |
|---|---|
| Tool | shadcn with Packetory's existing semantic Tailwind tokens |
| Preset | radix-nova |
| Component library | Radix and native HTML |
| Icon library | Lucide |
| Font | Geist Sans and Geist Mono |

## Component Inventory

Enumerated by `ls components/ui` — 13 local components — repository-owned shadcn source — 2026-11-27. The table lists the components relevant to this tool.

| Component | Import path | Purpose |
|---|---|---|
| Button | `@/components/ui/button` | Submit and copy |
| Input | `@/components/ui/input` | Address or prefix |
| Label | `@/components/ui/label` | Visible input label |
| Card | `@/components/ui/card` | Route summary, following existing tool styles |
| Native details and summary | HTML | Collector and peer disclosures |
| ToolAbout | `@/components/ToolAbout` | Worked example and FAQ below the tool |

## Layout and Interaction

Use the shared tool page width, heading, and Related tools pattern. Put the form first, the route summary below it, and AS paths by collector below the summary. Keep the example available on first render without a live request. An example action fills the field and gives it focus. Submit using the button or Enter.

Show matched prefix, first and last address, observed origin ASNs, collector count, and observation time in a definition list. Use UTC and label examples and cached results appropriately. Missing timestamps have an explicit unavailable value. If observations contain multiple matching prefixes, associate each address range and origin set with its own prefix.

Collector rows show location, collector ID, and an example AS path. Expanded rows reveal all peer observations, with copyable paths. Preserve repeated ASNs and expose their order. Each peer's disclosure shows Peer IP, Next hop, Last changed, and Last confirmed. Expand and copy actions use data already returned by the lookup. Keep focus on the triggering action and announce copy feedback.

On narrow screens the form stacks and long IPv6 addresses and AS paths wrap. Peer details use a vertical label/value layout. Native disclosure controls expose their expanded state to assistive technology. Announce loading and results politely and associate validation errors with the input.

## Spacing Scale

| Token | Value | Usage |
|---|---|---|
| xs | 4px | Label and icon gap |
| sm | 8px | Compact row gaps |
| md | 16px | Form gaps and mobile gutters |
| lg | 24px | Panel padding and tablet gutters |
| xl | 32px | Title-to-form gap and desktop gutters |
| 2xl | 48px | Page padding |

## Typography

| Role | Size | Weight | Line Height |
|---|---|---|---|
| Body and route values | 16px | 400 | 1.5 |
| Label and supporting text | 14px | 500 | 1.4 |
| Section heading | 20px | 600 | 1.3 |
| Page heading | 32px | 600 | 1.2 |

Use Geist Mono for prefixes, addresses, AS paths, and collector IDs.

## Color

| Role | Token | Light / Dark | Usage |
|---|---|---|---|
| Dominant | background | #ffffff / #020617 | Page |
| Secondary | card | #f1f5f9 / #0f172a | Result surface |
| Accent | primary | #0891b2 / #22d3ee | Primary lookup action |
| Destructive | destructive | #dc2626 / #ef4444 | Error emphasis paired with text |

Use existing foreground, border, and focus ring tokens. Status always has a text label.

## Copywriting Contract

| Element | Copy |
|---|---|
| Page title | BGP Looking Glass |
| Input label | Public IP address or CIDR prefix |
| Primary CTA | Look up |
| Example action | Use example |
| Attribution | Routes observed by RIPE RIS. Your lookup is sent to RIPEstat. |
| Loading | Looking up routes… |
| Invalid input | Enter a public IPv4 or IPv6 address or a CIDR prefix. |
| No route heading | No route observed |
| No route body | RIPE RIS returned no matching route. Check the address or try a different prefix. |
| Failure | Couldn’t load routes from RIPEstat. Try again. |
| Rate limit | RIPEstat is limiting requests. Try again when the cooldown ends. |
| Copy feedback | AS path copied |
| Destructive confirmation | None |

## UI Considerations

Applicable state considerations resolved: 10 covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|---|---|---|---|
| empty | Lookup form | ✅ covered | The initial example is available without a live request. |
| loading | Lookup form | ✅ covered | The form announces loading and repeated submissions create no additional requests. |
| error | Lookup input | ✅ covered | Invalid input receives the documented field error and sends no request. |
| empty | Route results | ✅ covered | A successful response with no matching route shows the documented No route observed state. |
| error | Route request | ✅ covered | Request failure displays the documented retry guidance. |
| error | Rate limit | ✅ covered | The cooldown state shows the documented rate-limit message and prevents another network request until it ends. |
| populated | Cached results | ✅ covered | Reused results retain their original observation timestamp and are identified as cached. |
| partial | Route and peer timestamps | ✅ covered | Missing timestamps are labeled unavailable. |
| zero-one-many | Prefix and collector results | ✅ covered | Multiple matched prefixes keep their own ranges and origins, and collector rows expose their peer observations on demand. |
| overflow | Address and AS path values | ✅ covered | Long IPv6 addresses and AS paths wrap without horizontal page overflow at 320px. |

## Registry Safety

Use existing local components. No external registry blocks.

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS

**Approval:** Approved 2026-11-27 after inline contract review and user confirmation of UI state coverage.
