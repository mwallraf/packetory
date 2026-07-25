---
status: complete
phase: 05-mac-address-inspector
source: [05-VERIFICATION.md]
started: 2026-07-25T14:52:00Z
updated: 2026-07-25T17:32:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Messy-input layout integrity at 320px
expected: At a 320px viewport, paste a messy MAC-like string with stray whitespace/punctuation and a trailing interface name (e.g. '  00:1a-2b.3c4d5E  interface0') into the MAC input. The input row layout does not break/overflow at 320px, and parse still correctly extracts or rejects the 12 hex digits regardless of the surrounding noise.
result: pass

### 2. No auto-reformatting while typing
expected: Type a raw MAC digit sequence into the MAC input character by character and observe the field on every keystroke. The field never inserts, removes, or repositions separators — it always shows exactly what was typed, with no cursor-hijacking reformat.
result: pass

### 3. Randomization-hedge wording reads as a hedge, not certainty
expected: View the randomization-hedge badge for a locally-administered MAC (e.g. 02:00:00:00:00:00) and read its label/explanation in context. The copy reads as a hedge ("Likely randomized (privacy MAC)."), and never implies certainty that the device is randomized or reveals a real hardware vendor.
result: pass

### 4. No coincidental vendor match for randomized addresses
expected: Enter a locally-administered/randomized MAC and confirm the vendor field, then check the Network tab for any /api/mac-vendor request. Vendor field reads "Vendor: not applicable (randomized address)." and zero /api/mac-vendor requests are ever made for it — no coincidental OUI match is ever presented as the device's real vendor.
result: pass

### 5. Distinct copy for "not found" vs "unavailable"
expected: Compare the vendor field's exact copy for a genuine registry miss vs. a lookup failure (mock/force each state). The two states render visibly distinct copy ("Not found in OUI registry." vs "Vendor: lookup unavailable.") — a working negative lookup is never disguised as broken, and a failure is never disguised as a clean miss.
result: pass

### 6. Full MAC never transmitted past the browser
expected: Inspect outgoing network requests (DevTools Network tab) while triggering a vendor lookup for any MAC, and check analytics beforeSend payloads. Only a 6-hex-character OUI ever appears in the /api/mac-vendor request URL; the full MAC address never appears in any request, log, or analytics payload.
result: pass

### 7. Long vendor-name wrap at 320px
expected: Mock/force a 40+ character vendor company name (e.g. via the e2e route mock) and view the vendor field at a 320px viewport. The long name wraps onto multiple lines next to the OUI prefix; it never clips or forces horizontal scroll.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
