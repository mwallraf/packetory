---
phase: 03-ip-subnet-calculator
fixed_at: 2026-07-24T16:21:00Z
review_path: .planning/phases/03-ip-subnet-calculator/03-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-07-24T16:21:00Z
**Source review:** .planning/phases/03-ip-subnet-calculator/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (fix_scope: critical_warning — REVIEW.md reported 0 critical findings, so only the 2 Warning findings were in scope; the 5 Info findings were excluded)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Reverse-DNS zone has a leading "." for very short prefixes (IPv4 /0-/7, IPv6 /0-/3)

**Files modified:** `lib/subnet/reverse-dns.ts`, `lib/subnet/reverse-dns.test.ts`
**Commit:** 67ed150
**Applied fix:** Guarded the zero-covered-labels case in both `ipv4ReverseZone` and `ipv6ReverseZone`: when `zoneLabels` is empty (prefix shorter than one octet/nibble), the zone now resolves to the bare `"in-addr.arpa."` / `"ip6.arpa."` suffix instead of a string with a stray leading `.`. Added four regression tests (`0.0.0.0/0`, `10.0.0.0/4`, `::/0`, `2001:db8::/3`) confirming no leading dot. Verified via `npx vitest run lib/subnet/reverse-dns.test.ts` — all 8 tests pass (4 pre-existing + 4 new).

### WR-02: Valid IPv4-mapped/IPv4-compatible IPv6 literals are rejected by `parseCidr`

**Files modified:** `lib/subnet/parse.ts`, `lib/subnet/parse.test.ts`
**Commit:** d2098c9
**Applied fix:** Applied REVIEW.md's recommended option (a) — the smaller, more consistent fix. `isValidIpv6Address` now explicitly rejects any candidate containing a `.` (IPv4-embedded IPv6 notation, RFC 4291 §2.5.5/§2.5.6), so the syntax-validation stage and the hextet-expansion stage (`expandIpv6Groups`/`ipv6ToBigInt`) agree — both now reject `::ffff:192.168.1.1` and `::1.2.3.4` with the same generic error, instead of the validator accepting and the expander silently failing. This matches `RESEARCH.md`'s framing that IPv4-mapped addresses aren't explicitly in scope for this phase. Added two regression test cases to `parse.test.ts`. Verified via `npx vitest run lib/subnet/parse.test.ts lib/subnet/ipv6.test.ts` — all 21 tests pass; full `lib/subnet` suite (49 tests) also passes; `tsc --noEmit` reports no errors in either modified file.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-07-24T16:21:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
