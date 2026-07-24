# Phase 3: IP Subnet Calculator - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-24
**Phase:** 3-IP Subnet Calculator
**Areas discussed:** Analytics/URL privacy for ?cidr=, CIDR math implementation, Boundary CIDR display (/31, /32, /127, /128), IPv6 subdivision options (/48–/64)

---

## Analytics/URL privacy for ?cidr=

| Option | Description | Selected |
|--------|-------------|----------|
| Never add it | cidr stays permanently excluded from the allow-list; safest given §8.2 | ✓ |
| Track that a lookup happened, not the value | Generic event without the actual cidr value | |
| Add cidr to the allow-list as-is | Simplest, but reports private ranges directly | |

**User's choice:** Never add it (Recommended option accepted)
**Notes:** None — locked as D-01.

| Option | Description | Selected |
|--------|-------------|----------|
| Private example | e.g. 192.168.1.0/24 or the brief's 10.20.0.0/20 | ✓ |
| Public/documentation example | e.g. IANA TEST-NET 192.0.2.0/24 | |
| IPv6 example | Leads with 2001:db8::/48 | |

**User's choice:** Private example (Recommended option accepted)
**Notes:** Locked as D-02. Confirmed this default is never reported to analytics regardless of D-01.

---

## CIDR math implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Native BigInt, no dependency | Bit math by hand in lib/subnet/, zero new dependency | ✓ |
| npm library (e.g. ip-address, netmask) | Offloads parsing/arithmetic, adds a dependency | |

**User's choice:** Native BigInt, no dependency (Recommended option accepted)
**Notes:** Locked as D-03. Follows the `lib/{tool}/` framework-agnostic pattern established in Phase 1/2.

---

## Boundary CIDR display (/31, /32, /127, /128)

| Option | Description | Selected |
|--------|-------------|----------|
| Show correct RFC values + short note | Accurate values with a brief explanation, no hidden rows | ✓ |
| Show 'N/A' for non-applicable fields | Simpler but less informative | |
| Omit non-applicable rows entirely | Cleanest UI but inconsistent output shape | |

**User's choice:** Show correct RFC values + short note (Recommended option accepted)
**Notes:** Locked as D-04.

---

## IPv6 subdivision options (/48–/64)

| Option | Description | Selected |
|--------|-------------|----------|
| Clickable, recomputes tool | Updates URL/result to the sub-block | ✓ |
| Informational text only | Read-only math, no interaction | |

**User's choice:** Clickable, recomputes tool (Recommended option accepted)
**Notes:** Locked as D-05.

| Option | Description | Selected |
|--------|-------------|----------|
| Replaces it entirely | Sub-block becomes the new top-level CIDR | ✓ |
| Drill-down with breadcrumb back | Preserves parent context, adds new UI state | |

**User's choice:** Replaces it entirely (Recommended option accepted)
**Notes:** Locked as D-06.

---

## Claude's Discretion

None — all four discussed areas reached explicit user decisions.

## Deferred Ideas

None — discussion stayed within phase scope.
