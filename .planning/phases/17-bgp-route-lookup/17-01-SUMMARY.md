---
phase: 17-bgp-route-lookup
plan: "01"
subsystem: ui
requirements-completed: [BGP-01, BGP-02, BGP-03, BGP-06, BGP-07]
completed: 2026-11-27
---

# Phase 17 Plan 01 Summary

Added the BGP Looking Glass at `/tools/bgp`. A static shell serves the form and worked example. The browser sends explicit lookups to RIPEstat and renders route summaries and expandable collector and peer observations. The client normalizes addresses, caches successful responses in memory for 30 seconds, allows one outstanding lookup, and applies a cooldown on HTTP 429.

Integrated the ninth tool into the landing page, navigation, sitemap, and shared About section. Tightened header spacing below 700px after the 640px regression test detected overflow.

**Implementation commit:** `96fa2ea`

**Verification:** 1,514 unit tests, six production browser checks including live RIPEstat IPv4 and IPv6, and 14 landing and navigation checks passed. Type checking and lint passed with one existing MAC vendor warning. A password timing assertion failed on one full run and passed on rerun.
