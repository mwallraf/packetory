---
phase: "18"
slug: "asn-and-address-registration"
status: approved
shadcn_initialized: true
preset: radix-nova
created: "2026-11-27"
---

# Phase 18 — UI Design Contract

## Design System

| Property | Value |
|---|---|
| Tool | shadcn with Packetory semantic Tailwind tokens |
| Preset | radix-nova |
| Component library | Radix and native HTML |
| Icon library | Lucide |
| Font | Geist Sans and Geist Mono |

## Component Inventory

Enumerated by `ls components/ui` — 13 repository-owned shadcn components — 2026-11-27. The table lists the relevant controls and existing result component.

| Component | Import path | Use |
|---|---|---|
| Button | `@/components/ui/button` | Manual retry for address registration |
| BgpResults | `app/tools/bgp/BgpResults.tsx` | Extend the existing route summary |
| Native details and summary | HTML | On-demand address registration |

## Layout and Interaction

In each route summary, render one entry per observed origin ASN under **Origin ASNs**. Put the registered holder beside its ASN on the same entry, with wrapping where needed. Keep ASNs in Geist Mono and holder names in Geist Sans. Render the base summary and collector paths as soon as route data arrives. Enrich origin entries independently and reuse results for the same ASN across matched prefixes. Keep unresolved ASNs visible and associate each response with its own ASN and active lookup.

Place a collapsed **Address registration** disclosure between the summary and **AS paths by collector**. Opening it requests registration for that matched prefix. Reopening populated details for the same result reuses the response. While pending, keep the disclosure operable and announce loading politely. Show **Regional registry** and **Registered block** as separately labeled fields. When multiple records apply, group values by record. Use the same treatment whether the registered block matches the announced prefix or covers a different range. Retain whichever fields are available when the source returns partial data.

For a failed address registration request, show a manual **Retry registration lookup** action inside the disclosure. Keep focus stable and prevent duplicate requests. During a cooldown, explain the wait and let the user retry when the cooldown ends. Route data and collector controls stay usable during enrichment, empty results, and errors.

## Spacing Scale

| Token | Value | Use |
|---|---|---|
| xs | 4px | Inline label and value gaps |
| sm | 8px | Stacked origin and registration rows |
| md | 16px | Gap above disclosure and mobile panel padding |
| lg | 24px | Collector heading separation and desktop panel padding |

## Typography

| Role | Size | Weight | Line height |
|---|---|---|---|
| Body, holder, address block | 16px | 400 | 1.5 |
| Status | 14px | 400 | 1.4 |
| Disclosure label | 16px | 500 | 1.5 |
| Existing results headings | 20px | 600 | 1.3 |

## Color

| Role | Token | Light / Dark | Use |
|---|---|---|---|
| Dominant | background | #ffffff / #020617 | Page |
| Secondary | card | #f1f5f9 / #0f172a | Existing results surface |
| Accent | primary | #0891b2 / #22d3ee | Existing lookup action |
| Destructive | destructive | #dc2626 / #ef4444 | Error emphasis paired with explanatory text |

Use existing foreground, muted foreground, border, and focus ring tokens. Retry uses the existing secondary button treatment.

## Copywriting Contract

| Element | Copy |
|---|---|
| Holder loading | Looking up holder… |
| Successful holder lookup with no name | Holder unavailable |
| Holder request failure | Couldn’t load holder |
| Disclosure label | Address registration |
| Registration labels | Regional registry · Registered block |
| Registration loading | Looking up address registration… |
| Registration record missing | No registration details returned for this prefix. |
| Partial field unavailable | Unavailable |
| Registration failure | Couldn’t load address registration from RIPEstat. |
| Retry action | Retry registration lookup |
| Cooldown | RIPEstat is limiting requests. Try again when the cooldown ends. |
| Destructive confirmation | None |

## UI Considerations

Applicable state considerations resolved: 9 covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|---|---|---|---|
| loading | Origin ASN entries | ✅ covered | The route summary and collector paths are usable while holder names load. |
| zero-one-many | Origin ASN entries | ✅ covered | Each observed origin remains visible with the holder or status for that ASN, even when the same origin appears under multiple prefixes. |
| partial | Origin ASN entries | ✅ covered | Missing or failed holder lookups show the documented status and preserve available holder names and all route data. |
| empty | Address registration disclosure | ✅ covered | A collapsed disclosure makes no registration request; opening it loads registration for its matched prefix. |
| loading | Address registration disclosure | ✅ covered | Loading is announced politely, repeated openings do not duplicate an in-flight request, and reopening populated details reuses the result. |
| partial | Registration fields | ✅ covered | Available fields stay visible, missing fields use the documented unavailable label, and the registered block is labeled separately from the announced prefix. |
| empty | Registration fields | ✅ covered | When the source returns no registration details, the disclosure shows the documented empty state. |
| error | Registration retry | ✅ covered | Failed registration exposes a manual retry, and cooldown explains when retry becomes available while base route controls remain usable. |
| overflow | Holder names and registered blocks | ✅ covered | Long names and address blocks wrap without horizontal page overflow at 320px. |

## Registry Safety

Reuse local components. No external registry blocks.

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS

**Approval:** Approved 2026-11-27 after inline contract review and user confirmation of UI state coverage.
