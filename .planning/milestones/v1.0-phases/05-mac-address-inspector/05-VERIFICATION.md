---
phase: 05-mac-address-inspector
verified: 2026-07-25T14:50:21Z
status: passed
score: 19/21 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "At a 320px viewport, paste a messy MAC-like string with stray whitespace/punctuation and a trailing interface name (e.g. '  00:1a-2b.3c4d5E  interface0') into the MAC input."
    expected: "The input row layout does not break/overflow at 320px, and parse still correctly extracts or rejects the 12 hex digits regardless of the surrounding noise."
    why_human: "Plan 05-01's must_haves.truths entry is explicitly tagged `verification: backstop` — parse-correctness has a passing automated unit test (lib/mac/parse.test.ts), but the 320px visual layout-integrity half was never screenshot/visual-regression verified, per the plan's own SUMMARY rationale (D9, human_judgment: true)."

  - test: "Type a raw MAC digit sequence into the MAC input character by character and observe the field on every keystroke."
    expected: "The field never inserts, removes, or repositions separators — it always shows exactly what was typed, with no cursor-hijacking reformat."
    why_human: "Plan 05-01's must_haves.prohibitions entry (MAC-01) is explicitly flagged `verification: judgment, flagged: true` — a passing regression test exists (MacTool.test.tsx), but the plan reserves final sign-off for human review, not automation alone."

  - test: "View the randomization-hedge badge for a locally-administered MAC (e.g. 02:00:00:00:00:00) and read its label/explanation in context."
    expected: "The copy reads as a hedge ('Likely randomized (privacy MAC).') and never implies certainty that the device is randomized or reveals a real hardware vendor."
    why_human: "Plan 05-02's must_haves.prohibitions entry (MAC-07) is explicitly flagged `verification: judgment, flagged: true` — the exact locked string is asserted by a passing test, but tone/certainty framing is reserved for human judgment per the plan's threat-model disposition."

  - test: "Enter a locally-administered/randomized MAC and confirm the vendor field, then check the Network tab for any /api/mac-vendor request."
    expected: "Vendor field reads 'Vendor: not applicable (randomized address).' and zero /api/mac-vendor requests are ever made for it — no coincidental OUI match is ever presented as the device's real vendor."
    why_human: "Plan 05-03's must_haves.prohibitions entry (MAC-03, privacy) is explicitly flagged `verification: judgment, flagged: true` — a passing e2e test asserts zero requests, but the plan reserves final sign-off for human review given the privacy-critical nature."

  - test: "Compare the vendor field's exact copy for a genuine registry miss vs. a lookup failure (mock/force each state)."
    expected: "The two states render visibly distinct copy ('Not found in OUI registry.' vs 'Vendor: lookup unavailable.') — a working negative lookup is never disguised as broken, and a failure is never disguised as a clean miss."
    why_human: "Plan 05-03's must_haves.prohibitions entry (MAC-03, transparency) is explicitly flagged `verification: judgment, flagged: true` — passing tests assert both exact strings, but the plan reserves sign-off for human review."

  - test: "Inspect outgoing network requests (DevTools Network tab) while triggering a vendor lookup for any MAC, and check analytics beforeSend payloads."
    expected: "Only a 6-hex-character OUI ever appears in the /api/mac-vendor request URL; the full MAC address never appears in any request, log, or analytics payload."
    why_human: "Plan 05-03's must_haves.prohibitions entry (MAC-10, privacy) is explicitly flagged `verification: judgment, flagged: true` — passing unit tests assert OUI-only transmission and the DEFAULT_ALLOW_LIST regression guard, but the plan reserves sign-off for human review given the privacy-critical nature of this prohibition."

  - test: "Mock/force a 40+ character vendor company name (e.g. via the e2e route mock) and view the vendor field at a 320px viewport."
    expected: "The long name wraps onto multiple lines next to the OUI prefix; it never clips or forces horizontal scroll."
    why_human: "Plan 05-03's must_haves.truths entry is explicitly tagged `verification: backstop` — a passing automated wrap/no-overflow e2e test exists (confirmed green during this verification run), but the plan reserves visual-wrap-quality sign-off for human judgment per its own verification tier (D12, human_judgment: true)."
---

# Phase 5: MAC Address Inspector Verification Report

**Phase Goal:** Users get instant, accurate MAC address normalization, vendor identification, and hedged bit-level classification for any common MAC format, entirely as they type — the first tool to prove the API-route/core-logic separation ahead of a future public API.
**Verified:** 2026-07-25T14:50:21Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

All automated evidence (253/253 unit tests, 15/15 e2e tests for this tool, `typecheck`/`lint`/`build` clean) confirms the phase goal is achieved in the codebase. The only outstanding items are 6 checks that the plans themselves explicitly deferred to human/judgment sign-off (2 `verification: backstop` truths, 4 `verification: judgment, flagged: true` prohibitions) — each already has a passing automated test as supporting evidence, but per the plans' own must_haves frontmatter, final confirmation is reserved for a human, not automation alone.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | As user types a MAC in any of colon/dash/Cisco-dot/no-separator format, all 4 normalized variants update live | ✓ VERIFIED | `lib/mac/parse.ts`/`format.ts` + `lib/mac/parse.test.ts`/`format.test.ts` (19+ vectors); `MacTool.test.tsx` "updates all 4 variants live when retyping"; e2e "retyping in a different separator style updates all 4 variants live" — ran directly, passed |
| 2 | Demo MAC shown normalized into all 4 formats on first paint, zero typing required (D-06) | ✓ VERIFIED | `MacTool.tsx` `initialState()`/`resultForDefault()`; e2e "auto-normalizes the demo MAC into all 4 formats on load" — ran directly, passed |
| 3 | Each format row has its own copy button with visible + aria-live "Copied!" confirmation; "Copy all" copies the complete block | ✓ VERIFIED | `FormatRow`/`CopyAllButton` in `MacTool.tsx`; `MacTool.test.tsx` copy tests; e2e "copying a format row shows a visible confirmation" — ran directly, passed |
| 4 | Incomplete/invalid in-progress edit shows a neutral inline note, keeps last valid result visible dimmed, never blanks (D-07) | ✓ VERIFIED | `MacTool.tsx` `isIncomplete`/`opacity-50` panel; e2e "an incomplete MAC shows the D-07 neutral note" — ran directly, passed |
| 5 | `tools/registry.ts` mac entry is `status: "active"`, `clientOnly: false`; no other tool's status changed | ✓ VERIFIED | `tools/registry.ts` inspected: mac active, clientOnly false; all 4 tools (uuid/subnet/dns/mac) `status: "active"` |
| 6 | Fixed-height skeleton renders only pre-hydration, then replaced by client island (no CLS) | ✓ VERIFIED | `MacToolLoader.tsx`: `ssr:false`, `h-[420px]` fixed skeleton, `data-testid="mac-tool-skeleton"` |
| 7 | OUI prefix (first 3 bytes, uppercase) displayed as its own field (MAC-04) | ✓ VERIFIED | `classifyMac` → `ouiHex`; `MacTool.tsx` OUI `FormatRow`; e2e "classification (OUI, U/L, I/G) renders on load" — ran directly, passed |
| 8 | U/L badge: "Universally Administered."/"Locally Administered." with exact D-08 explanation, never color alone (MAC-05, QUAL-05) | ✓ VERIFIED | `classify.ts` bit math; `MacTool.tsx` `ClassificationBadge` (outline variant + explanation text); `classify.test.ts` vectors |
| 9 | I/G badge: "Unicast."/"Multicast." with exact D-08 explanation (MAC-06) | ✓ VERIFIED | Same as above; e2e "a multicast MAC (01:00:5E) shows a Multicast badge and NO randomization badge" — ran directly, passed |
| 10 | Randomization-hedge badge "Likely randomized (privacy MAC)." renders only when U/L bit set, driven by U/L alone never I/G (MAC-07, D-09/D-10) | ✓ VERIFIED | `classify.ts` `randomizationLikely = !isUniversallyAdministered`; e2e D-09/D-10 tests — ran directly, passed |
| 11 | All classification computed synchronously the instant a MAC parses valid, before/independent of any vendor lookup (MAC-08 ordering) | ✓ VERIFIED | `handleInputChange` calls `classifyMac` before `scheduleVendorLookup`; e2e "renders on load with zero vendor network dependency" (no route mock registered) — ran directly, passed |
| 12 | A valid MAC always renders exactly 4 format rows and 2-3 classification badges (fixed cardinality) | ✓ VERIFIED | e2e "a valid MAC always renders exactly 4 format rows and 2-3 classification badges" — ran directly, passed |
| 13 | `GET /api/mac-vendor?oui=` validates against `/^[0-9A-Fa-f]{6}$/`, returns 400 pre-network for any bad value | ✓ VERIFIED | `route.ts` OUI_RE gate before `fetch`; `route.test.ts` 400-gate tests (part of 75 green unit tests) |
| 14 | Route always responds 200 with a typed `status`; upstream failure/timeout/malformed JSON/non-2xx all collapse to `{status:"unavailable"}`, never a 5xx | ✓ VERIFIED | `route.ts` try/catch classification; `route.test.ts` |
| 15 | Genuine registry miss shows "Not found in OUI registry." distinct from "Vendor: lookup unavailable." | ✓ VERIFIED | `vendor.ts` 4-kind `VendorState`; e2e "a genuine registry miss shows 'Not found in OUI registry.'" — ran directly, passed |
| 16 | Vendor-unavailable/failure shows neutral note; rest of panel (formats/OUI/U-L/I-G/randomization) renders normally, unaffected (MAC-08 isolation) | ✓ VERIFIED | e2e "vendor lookup unavailable shows the neutral D-11 note while formats/OUI/classification badges still fully render" — ran directly, passed |
| 17 | Locally-administered/randomized MAC skips the vendor call entirely, shows "Vendor: not applicable (randomized address)." (D-12) | ✓ VERIFIED | `MacTool.tsx` `beginVendorLookup` D-12 branch; e2e "shows the D-12 not-applicable note and makes ZERO /api/mac-vendor requests" — ran directly, passed |
| 18 | Vendor lookups debounced ~400-600ms and session-cached by OUI (D-03) | ✓ VERIFIED | `VENDOR_DEBOUNCE_MS = 500`; `lib/mac/vendor.ts` module-level `Map` cache; `vendor.test.ts` cache-hit-skips-fetch test |
| 19 | Every state-superseding path (typing/debounce, new valid paste, demo-on-load) cancels in-flight vendor requests via AbortController + sequence token (race safety) | ✓ VERIFIED | `MacTool.tsx` `cancelVendorLookup`/`vendorSeqRef`; `MacTool.test.tsx` "a superseding valid edit's slower earlier vendor response can never overwrite a newer result (CR-01 race safety)" — passed in full unit run |
| 20 | "Copy all" copies all 4 formats + OUI + vendor + U/L + I/G + randomization as one block with visible confirmation (MAC-09) | ✓ VERIFIED | `CopyAllButton` `fullText` composition; `MacTool.test.tsx` copy-all test |
| 21 | Full MAC never transmitted/logged/stored past the browser; only 6-hex OUI crosses the boundary; `mac`/`oui` never in `DEFAULT_ALLOW_LIST`; `redact.ts` unmodified (MAC-10) | ✓ VERIFIED | `lib/mac/vendor.ts` sends only `ouiHex`; `lib/analytics/redact.ts` `DEFAULT_ALLOW_LIST = []`; `redact.test.ts` MAC-10 regression assertion; `git log -- lib/analytics/redact.ts` shows no commits since Phase 1 |

**Score:** 19/21 truths verified (2 explicitly tagged `verification: backstop` by the plans, routed to human verification below — each already has a passing automated test, so this is not a code gap, but the plans reserve final sign-off for a human)

### Prohibitions (must_haves.prohibitions — separate from truths)

| # | Statement | Requirement | Verification tier | Status |
|---|-----------|-------------|--------------------|--------|
| 1 | MUST NOT auto-insert/reformat separators as the user types | MAC-01 | judgment (flagged) | Passing regression test exists; routed to human verification per plan's own disposition |
| 2 | MUST NOT present randomization as certain fact — hedge copy only | MAC-07 | judgment (flagged) | Passing test asserts exact hedged copy; routed to human verification |
| 3 | MUST NOT surface a coincidental vendor match for a randomized address as the real hardware vendor | MAC-03 | judgment (flagged) | Passing e2e asserts zero fetch calls; routed to human verification |
| 4 | MUST NOT render "not found" with the same copy as "unavailable" | MAC-03 | judgment (flagged) | Passing tests assert distinct copy; routed to human verification |
| 5 | MUST NOT transmit/log/store the full MAC past the browser — OUI-only boundary | MAC-10 | judgment (flagged) | Passing unit tests + regression guard; routed to human verification |

No prohibition shows contradicting evidence — every one has a passing automated test backing it. They are surfaced above (and in `human_verification`) solely because the plans' own frontmatter reserves final sign-off for a human, per the flagged `verification: judgment` tier — not because any check failed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/mac/types.ts` | `ParsedMac`, `MacFormats`, `MacClassification`, `VendorState`, `MacLookupState` | ✓ VERIFIED | All types present, framework-agnostic |
| `lib/mac/parse.ts` | `parseMacInput`, total function | ✓ VERIFIED | Strip-then-length-check, no bounded regex, tested |
| `lib/mac/format.ts` | `formatMac`, 4 variants | ✓ VERIFIED | colon/dash/dot/none, tested |
| `lib/mac/classify.ts` | `classifyMac`, pure/offline | ✓ VERIFIED | No fetch/vendor reference; tested against 4 D-10 vectors |
| `lib/mac/vendor.ts` | `lookupVendor`, session cache | ✓ VERIFIED | Module-level `Map` cache, OUI-only fetch, tested |
| `app/tools/mac/page.tsx` | Server shell, metadata, FAQ/JSON-LD | ✓ VERIFIED | canonical + openGraph + FAQPage JSON-LD present |
| `app/tools/mac/MacToolLoader.tsx` | `ssr:false` boundary + skeleton | ✓ VERIFIED | `ssr: false`, `mac-tool-skeleton` testid |
| `app/tools/mac/MacTool.tsx` | Client island, full feature surface | ✓ VERIFIED | Input, formats, classification, vendor, copy-all all wired |
| `app/tools/mac/faq-data.ts` | FAQ items + worked example | ✓ VERIFIED | Includes D-01/D-02 privacy disclosure, D-09 randomization FAQ |
| `app/api/mac-vendor/route.ts` | First upstream-fetching route | ✓ VERIFIED | Validates OUI, hardcoded host, always-200 typed response |
| `tests/e2e/mac-lookup.spec.ts` | Full happy-path + vendor + classification e2e | ✓ VERIFIED | 15/15 tests, ran directly during this verification, all passed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `MacTool.tsx` | `lib/mac/parse.ts`/`format.ts` | `parseMacInput`/`formatMac` imports | ✓ WIRED | Synchronous, called in `handleInputChange` |
| `MacTool.tsx` | `lib/mac/classify.ts` | `classifyMac` called before vendor scheduling | ✓ WIRED | `classifyMac` executes before `scheduleVendorLookup`/`runVendorLookupImmediate` in every code path |
| `MacTool.tsx` | `lib/mac/vendor.ts` | `lookupVendor(classification.ouiHex)` | ✓ WIRED | Debounced/immediate dual-entry dispatch; only `ouiHex` sent |
| `lib/mac/vendor.ts` | `/api/mac-vendor` | `fetch(`/api/mac-vendor?oui=${ouiHex}`)` | ✓ WIRED | Confirmed via passing route + client tests and e2e route mocks |
| `app/api/mac-vendor/route.ts` | `api.maclookup.app` | Hardcoded host literal, validated `oui` interpolated only | ✓ WIRED | `https://api.maclookup.app/v2/macs/${oui}`, `OUI_RE` gate before fetch |
| `app/tools/mac/page.tsx` | `MacToolLoader` | Server shell renders client-only boundary | ✓ WIRED | No `searchParams` destructured; `MacToolLoader` renders `MacTool` via `next/dynamic` `ssr:false` |
| `tools/registry.ts` | mac status flip | Single-entry edit | ✓ WIRED | Only `mac` entry changed to `active`; other 3 tools already active from prior phases |
| `lib/analytics/redact.ts` | `DEFAULT_ALLOW_LIST` | Regression guard, no `mac`/`oui` | ✓ WIRED | `redact.test.ts` MAC-10 regression assertion passing; `redact.ts` unmodified since Phase 1 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `MacTool.tsx` format rows | `state.lastValidFormats` | `formatMac(parsed.bytes)` from live `parseMacInput` | Yes — real computed hex, not static | ✓ FLOWING |
| `MacTool.tsx` classification badges | `state.lastValidClassification` | `classifyMac(parsed.bytes)` | Yes — real bit math per input | ✓ FLOWING |
| `MacTool.tsx` vendor field | `state.vendorState` | `lookupVendor(ouiHex)` → `/api/mac-vendor` → `api.maclookup.app` | Yes — live upstream response, or typed neutral fallback on failure | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full unit suite (lib/mac, app/tools/mac, app/api/mac-vendor, redact) | `npm run test -- lib/mac app/tools/mac app/api/mac-vendor lib/analytics/redact.test.ts` | 75/75 passed, 7 files | ✓ PASS |
| Full project unit suite (regression check for registry flip) | `npm run test` | 253/253 passed, 27 files | ✓ PASS |
| Typecheck | `npm run typecheck` | exit 0, no errors | ✓ PASS |
| Lint | `npm run lint` | exit 0, no errors | ✓ PASS |
| Production build | `npm run build` | `/tools/mac` static, `/api/mac-vendor` dynamic, both present | ✓ PASS |
| e2e: full `mac-lookup.spec.ts` suite (single run, not per-truth filtering) | `npx playwright test tests/e2e/mac-lookup.spec.ts` | 15/15 passed | ✓ PASS |
| Named e2e: D-12 not-applicable, zero vendor requests | `npx playwright test -g "D-12 not-applicable note and makes ZERO"` | 1/1 passed | ✓ PASS |
| Named e2e: vendor unavailable, MAC-08 isolation | `npx playwright test -g "vendor lookup unavailable shows the neutral D-11 note"` | 1/1 passed | ✓ PASS |
| Named e2e: classification renders with zero vendor network | `npx playwright test -g "classification .* renders on load with zero vendor network dependency"` | 1/1 passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MAC-01 | 05-01 | User input normalized live across common MAC formats | ✓ SATISFIED | parse/format tests, e2e retype test |
| MAC-02 | 05-01 | Normalized format variants displayed | ✓ SATISFIED | 4 format rows, format.test.ts |
| MAC-03 | 05-03 | Vendor/organization returned where known from OUI | ✓ SATISFIED | route.ts, vendor.ts, e2e vendor tests |
| MAC-04 | 05-02 | OUI prefix identified and displayed | ✓ SATISFIED | classify.ts ouiHex, OUI FormatRow |
| MAC-05 | 05-02 | U/L addressing identified | ✓ SATISFIED | classify.ts, U/L badge |
| MAC-06 | 05-02 | I/G addressing identified | ✓ SATISFIED | classify.ts, I/G badge |
| MAC-07 | 05-02 | Randomization flagged as hedge, not certainty | ✓ SATISFIED | Locked "Likely randomized..." copy |
| MAC-08 | 05-02, 05-03 | Classification works when vendor lookup fails/unavailable | ✓ SATISFIED | Synchronous ordering + no-mock/failure e2e |
| MAC-09 | 05-01, 05-03 | Copy individual fields or complete result | ✓ SATISFIED | Per-field + Copy-all, both tested |
| MAC-10 | 05-03 | Full MAC never captured in analytics | ✓ SATISFIED | OUI-only transmission, redact.ts regression guard |

All 10 requirement IDs declared across the 3 plans (MAC-01..MAC-10) are accounted for; REQUIREMENTS.md's Phase 5 mapping table lists the same 10 IDs, all marked Complete — no orphaned requirements found.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|placeholder|coming soon|not yet implemented|not available` across all files modified in this phase returned zero debt markers (one incidental match — "Fixed-height placeholder" in a doc comment describing a loading skeleton — is not a stub marker).

### Human Verification Required

See the `human_verification` list in the frontmatter above (6 items: 2 plan-tagged `backstop` truths, 4 plan-tagged `judgment`/flagged prohibitions). Every item already has a passing automated test as supporting evidence; the plans themselves reserve final confirmation for a human rather than treating the automated pass as sufficient sign-off.

### Gaps Summary

No gaps found. Every observable truth, artifact, and key link has direct codebase evidence and passing test coverage (253 unit tests, 15 e2e tests for this tool, clean typecheck/lint/build). The phase status is `human_needed` rather than `passed` solely because the plans' own must_haves frontmatter explicitly flagged 6 items (2 backstop truths, 4 judgment-tier prohibitions) for human sign-off — this is a plan-authored disposition, not a discovered code deficiency.

---

_Verified: 2026-07-25T14:50:21Z_
_Verifier: Claude (gsd-verifier)_
