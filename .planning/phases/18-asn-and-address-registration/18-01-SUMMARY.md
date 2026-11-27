---
phase: 18-asn-and-address-registration
plan: "01"
subsystem: ui
requirements-completed: [BGP-04, BGP-05]
completed: 2026-11-27
---

# Phase 18 Plan 01 Summary

The BGP tool shows registered holder names alongside observed origin ASNs. Each route summary offers an address registration disclosure that fetches RIR records on open. The UI preserves missing fields, distinguishes the registered range from the announced prefix, and supports manual retry.

The route, holder, and registration endpoints now share one browser transport. It prioritizes user route lookups, cancels obsolete work, applies shared cooldowns, and uses bounded in-memory caches. The transport is in a separate module to keep format-specific parsing in the route and enrichment modules.

Implementation commit `d021b4b`. The production build, lint, type checking, 1,518 unit tests, and nine production Chromium checks passed. Live tests verified IPv4 and IPv6 routes, AS1205’s registered holder, and on-demand registration for the sample prefix. An initial live run failed at the upstream route lookup and passed on rerun. Lint and build still emit the existing MAC vendor and CSS warnings.
