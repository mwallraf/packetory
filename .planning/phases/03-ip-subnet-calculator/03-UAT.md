---
status: testing
phase: 03-ip-subnet-calculator
source: [03-VERIFICATION.md]
started: 2026-07-24T16:10:00Z
updated: 2026-07-24T16:10:00Z
---

## Current Test

number: 1
name: 320px viewport overflow check (IPv4 masks/binary, IPv6 expanded notation, both families' reverse-DNS zones)
expected: |
  Resize the browser (or use devtools device emulation) to a 320px-wide viewport and load /tools/subnet with the default IPv4 CIDR, then a wide IPv6 CIDR (e.g. 2001:db8::/32). The subnet mask, wildcard mask, ~35-char dot-grouped binary field (IPv4), the 39-char expanded IPv6 notation, and the up-to-~72-char reverse-DNS zone string (both families) all wrap onto multiple lines inside their field card and never clip or trigger horizontal page scroll.
awaiting: user response

## Tests

### 1. 320px viewport overflow check (IPv4 masks/binary, IPv6 expanded notation, both families' reverse-DNS zones)
expected: Resize to a 320px-wide viewport (or devtools mobile emulation) and load /tools/subnet with the default IPv4 CIDR, then with a wide IPv6 CIDR (e.g. 2001:db8::/32). The subnet mask, wildcard mask, ~35-char dot-grouped binary (IPv4), the 39-char expanded IPv6 notation, and the up-to-~72-char reverse-DNS zone strings all wrap onto multiple lines within their card and never clip or trigger horizontal page scroll.
result: [pending]

### 2. Reverse-DNS non-aligned-prefix display convention (A1, unresolved product decision)
expected: Review the truncated-nearest-boundary zone + note behavior for a non-aligned IPv4 prefix (e.g. /20) and IPv6 prefix (e.g. /54). Confirm this convention (vs. a full RFC 2317 classless-delegation name) is the desired long-term UX.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
