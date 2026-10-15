---
phase: 09-hash-tool-page-text-hashing
verified: 2026-10-15T20:45:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/09-hash-tool-page-text-hashing/09-01-PLAN.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-01-SUMMARY.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-02-PLAN.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-02-SUMMARY.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-03-PLAN.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-03-SUMMARY.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-04-PLAN.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-04-SUMMARY.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-05-PLAN.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-05-SUMMARY.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-06-PLAN.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-06-SUMMARY.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-07-PLAN.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-07-SUMMARY.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-08-PLAN.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-08-SUMMARY.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-09-PLAN.md"
  - ".planning/phases/09-hash-tool-page-text-hashing/09-09-SUMMARY.md"
  - "app/tools/hash/DigestRow.tsx"
  - "app/tools/hash/HashTool.tsx"
  - "app/tools/hash/HashToolLoader.tsx"
  - "app/tools/hash/OutputToolbar.tsx"
  - "app/tools/hash/VerifyBox.tsx"
  - "app/tools/hash/faq-data.ts"
  - "app/tools/hash/page.tsx"
  - "lib/hash/export.ts"
  - "lib/hash/sample.ts"
  - "lib/hash/share-link.ts"
  - "lib/hash/verify.ts"
  - "lib/hooks/useKeyboardShortcut.ts"
  - "tools/registry.ts"
covered_digest: "v3:sha256:b8ceafa7f3c3d43de4fdca667f516f854b9d5a8b6c06ccf6d630937919f018f0"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Type with a real IME (Japanese/Chinese/Korean) in the Text box, compose a candidate, then press Esc to cancel the composition"
    expected: "The composition is cancelled and the tool is NOT reset to the sample; a second Esc outside composition resets (WR-02 fix is covered only by a synthetic isComposing/keyCode 229 unit test)"
    why_human: "Real IME event sequencing (Chrome vs Safari isComposing/keyCode 229) cannot be reproduced by jsdom or Playwright keyboard events"
  - test: "Open /tools/hash at 320px and at desktop width in light and dark theme; select Base64; paste a matching checksum"
    expected: "Layout looks intentional (row badges, Match badge, toggles wrap cleanly, primary SHA-256 row emphasis, contrast of muted/no-match text, skeleton-to-island swap looks smooth)"
    why_human: "Automated checks prove no horizontal scroll, CLS < 0.01 and height pins; they do not judge visual polish or contrast"
  - test: "Review the page copy for D-27 (privacy/legal wording): registry description, metadata, worked example, FAQ answer 'Where does the hashing happen?', 'The link contains your text.' line, the 5 FAQ answers"
    expected: "No privacy or legal claim beyond 'runs in your browser' / 'the link contains your text'; the extra FAQ advice (password hashing, 'use SHA-256 or stronger') is acceptable wording"
    why_human: "Judgment-tier prohibition (D-27); only an LLM judge ran grep/exact-equality tests. Non-authoritative verdict: PASS (flag: unverified-prohibition, human review recommended)"
  - test: "Confirm the OUT-04 match wording ('Matches SHA-256.', 'No match. ...') and the neutral no-match presentation read as equality-only, not authenticity"
    expected: "No word implies verified/authentic/safe; no-match is informational, not an error"
    why_human: "Judgment-tier prohibition (OUT-04 transparency). Non-authoritative verdict: PASS (flag: unverified-prohibition, human review recommended)"
  - test: "On a real device/browser (Safari and Firefox), press Ctrl/Cmd+C with no selection and use Copy link / per-row copy"
    expected: "SHA-256 digest is copied with a 'Copied!' confirmation; Copy link pastes into a new tab and restores the text"
    why_human: "Real clipboard permission and OS keyboard behaviour differ from Playwright's granted-clipboard context"
---

# Phase 9: Hash Tool Page & Text Hashing Verification Report

**Phase Goal:** A visitor finds the Hash Generator from the nav, landing grid, sitemap, or search, sees all 10 digests of a sample immediately, and can type or paste text to get live, copyable, verifiable digests, a complete, shippable text-only tool.
**Verified:** 2026-10-15
**Status:** human_needed (all automated truths verified; judgment/visual/IME items routed to a human)
**Re-verification:** No, initial verification

## Goal Achievement

Verified independently in this session (not from SUMMARY claims): `npm test` 48 files / 686 tests pass; `npm run typecheck` clean; `npm run lint` 0 errors (1 pre-existing unrelated warning in `lib/mac/vendor.ts`); `npm run build` prerenders `/tools/hash` as static (○); `npx playwright test tests/e2e/hash* home.spec navigation.spec` 41/41 pass. `app/hash-smoke`, `tests/e2e-prod`, `playwright.prod.config.ts`, `app/privacy`, `components/SiteHeader.tsx`, `components/MobileNav.tsx`, `app/sitemap.ts` show no diff against 8b25e1a.

### Observable Truths (ROADMAP Success Criteria)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | Hash Generator in nav, landing grid (Hash icon), sitemap; `/tools/hash` shows 10 sample digests immediately with no CLS; typing/pasting updates every digest live, stale result never overwrites newer; UTF-8 byte count + trailing-newline/CRLF hint | ✓ VERIFIED | `tools/registry.ts` slug `hash`, icon `Hash`, category `encode`; built `index.html` links `/tools/hash`; `sitemap.xml` has `<loc>https://packetory.dev/tools/hash`; e2e home/navigation (5 cards in order Subnet, UUID, DNS, Hash, MAC; 5 nav links fit at 640px; sitemap lists hash; card opens page) pass. `HashTool.tsx`: initial state `sampleResult()` from `lib/hash/sample.ts` constants (no worker call), `runHash` uses `seqRef` guard (`id !== seqRef.current` discards), `cancelled` outcome ignored; unit test "an older result resolving after a newer one is discarded" passes; e2e layout spec CLS < 0.01 and skeleton heights pinned. Byte count `hash-bytes` + hint paragraph (echo vs printf, CRLF to LF) rendered. Behavior-dependent race invariant has an exercising passing test. |
| 2 | Copy any digest with confirmation; copy all as labeled list or `sha256sum` lines (`<hash>  -`); hex/HEX/Base64 without re-hashing (CRC32 stays hex); MD5/SHA-1/CRC32 labeled inline, no modal | ✓ VERIFIED | `DigestRow.tsx` per-row 44px copy with Check swap, aria-live "Copied!"; `OutputToolbar.tsx` encoding is display-only (`formatDigest` on stored bytes; `onEncodingChange` never calls `runHash`); `lib/hash/export.ts` `formatChecksumLines` emits `# LABEL` + `hex  -` (two spaces) and labeled list; `DigestRow` renders inline Badge "Not for security" (MD5, SHA-1) / "Error detection only" (CRC32) + "Always hex" under Base64; unit test asserts exact badge text; e2e hash-output passes. Note: checksum lines add `# LABEL` comment lines (GNU `sha256sum -c` ignores `#` lines), a deliberate D-16 choice. |
| 3 | Pasting an expected checksum (any case, spaces/colons, `sha256:` prefix, whole sha256sum line) highlights every matching row; non-match clearly shown | ✓ VERIFIED | `lib/hash/verify.ts` (`normalizeExpected`, `matchExpected`, `describeMatch`), `VerifyBox.tsx` (aria-live result, neutral no-match), `matched` prop drives border/`Match` badge in `DigestRow`; derived against settled digests with `pending` while stale and idle after engine error (IN-02 fix). verify.test.ts + HashTool.verify.test.tsx + e2e hash-verify (prefixed upper-case match, non-match, follows text after worker result, clear to idle) pass. |
| 4 | `?text=` restores input on load; explicit length-capped Copy link is the only way text enters a URL; address bar never changes while typing; `text` never reaches analytics; `/` focuses, `Esc` cancels + restores sample, copy shortcut copies SHA-256, Enter inserts newline | ✓ VERIFIED | `readTextParam()` read-only at mount (also normalises CR/CRLF, WR-03); pending rows until worker result (sample digests never shown beside restored text); `buildShareLink` 2,000-char cap on encoded text, never throws; grep: no `history`/`pushState`/`replaceState`/router in `HashTool.tsx`. `lib/analytics/redact.ts` allow-list is empty (`DEFAULT_ALLOW_LIST = []`) and `redact.test.ts` has the `?text=` regression. e2e hash-url (empty param loads sample, non-ASCII restore, typing never changes URL/history length, copied link restores exact text, over-2000 disables with reason) and hash-keyboard (`/` select-all, Esc restores sample + clears verify, Esc keeps encoding, Enter newline hashed) pass. `useKeyboardShortcut` has no Enter binding in HashTool; Esc ignored while a dialog is open and during IME composition; `/` ignored with Ctrl/Meta/Alt; copy yields to a text selection and is disabled while stale/after error (WR-04). |
| 5 | Unique title/meta/canonical/OG, worked example, FAQ (SHA3 vs Keccak, echo vs echo -n, MD5/SHA-1 security, match != authenticity) with content-matched FAQPage JSON-LD; usable at 320px light and dark, long digests wrap, no horizontal scroll | ✓ VERIFIED | Built `tools/hash.html`: `<title>Hash Generator (MD5, SHA-1, SHA-256, SHA-3, CRC32) ...`, canonical `https://packetory.dev/tools/hash`, og:title/description/url/type, FAQPage present. `page.tsx` builds JSON-LD from the same `faqItems` array rendered visibly (5 items, all four required topics plus "where does hashing happen"); worked example uses `SAMPLE_DIGEST_HEX.sha256` and `ECHO_HELLO_WORLD_SHA256` (pinned by tests). e2e hash-seo (metadata, canonical with `?text=`, FAQ vs JSON-LD exact match, worked example, 320px no overflow) and hash-layout (no horizontal scroll at 320px in light and dark, skeleton heights, CLS) pass. Digest values use `break-all min-w-0`. |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `app/tools/hash/page.tsx` | Static server shell, metadata, JSON-LD, worked example, FAQ | ✓ VERIFIED | Exists, substantive, wired to `HashToolLoader` and `faq-data`; route prerendered static |
| `app/tools/hash/HashToolLoader.tsx` | `ssr:false` dynamic loader + measured skeleton | ✓ VERIFIED | Skeleton `h-[2240px] sm:h-[1612px]`, CLS test passes |
| `app/tools/hash/HashTool.tsx` | Island: live hashing, sample, URL restore, shortcuts, verify | ✓ VERIFIED | 505 lines, wired to `createHashClient`, DigestRow, OutputToolbar, VerifyBox, shortcuts |
| `app/tools/hash/DigestRow.tsx`, `OutputToolbar.tsx`, `VerifyBox.tsx` | Output controls and verify | ✓ VERIFIED | Imported and rendered by HashTool; no stubs |
| `app/tools/hash/faq-data.ts` | Single FAQ source | ✓ VERIFIED | Consumed by page and JSON-LD |
| `lib/hash/sample.ts`, `export.ts`, `share-link.ts`, `verify.ts` | Pure helpers | ✓ VERIFIED | Each imported by the island; unit tests pass (sample pinned to engine output) |
| `lib/hooks/useKeyboardShortcut.ts` | Shared hook hardening (WR-02, WR-05) | ✓ VERIFIED | Modifier and IME guards present; unit tests pass; other tools' suites still pass |
| `tools/registry.ts` | `hash` entry | ✓ VERIFIED | Single entry drives nav, drawer, grid, sitemap |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `page.tsx` | `HashTool.tsx` | `HashToolLoader` dynamic import | WIRED | Built page prerenders skeleton; e2e shows island |
| `HashTool.tsx` | Phase 8 worker | `createHashClient().start({kind:"text"})` | WIRED | Created inside effect (StrictMode-safe), disposed on cleanup; typing e2e proves worker digests |
| `HashTool.tsx` | `OutputToolbar`/`DigestRow` | `digests`, `encoding`, `copyBlocked` props | WIRED | Encoding toggle formats stored bytes only |
| `HashTool.tsx` | `VerifyBox` | `matchExpected(expected, digests)` | WIRED | Match ids feed `matched` row prop |
| `tools/registry.ts` | nav, grid, sitemap | registry iteration | WIRED | e2e home/navigation + sitemap |
| `faq-data.ts` | visible FAQ + JSON-LD | same array | WIRED | e2e exact-match |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `DigestRow` values (sample) | `result.digests` | `sampleDigests()` constants, pinned to engine by `sample.test.ts` | Yes (node-verified constants) | ✓ FLOWING |
| `DigestRow` values (typed) | `result.digests` | `HashClient.start` -> worker -> `@noble/hashes` engine | Yes (e2e typed-text digests) | ✓ FLOWING |
| `VerifyBox` result | `verifyMatch` | `matchExpected(expected, digests)` | Yes | ✓ FLOWING |
| Copy link | `link.url` | `buildShareLink(origin, text)` from current `text` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full unit suite | `npm test` | 48 files / 686 tests passed | ✓ PASS |
| Typecheck / lint | `npm run typecheck`; `npm run lint` | clean; 0 errors | ✓ PASS |
| Production build | `npm run build` | `/tools/hash` static prerendered | ✓ PASS |
| Hash + home + navigation e2e (dev server) | `npx playwright test tests/e2e/hash tests/e2e/home.spec.ts tests/e2e/navigation.spec.ts` | 41 passed | ✓ PASS |
| Built HTML metadata | grep `.next/server/app/tools/hash.html` | title, canonical, OG, FAQPage present; no noble code in initial page JS | ✓ PASS |

Production e2e (`test:e2e:prod`, 7 tests) was not re-run by the verifier; the orchestrator reports it green and the guarded files are unchanged since 8b25e1a.

### Probe Execution

Step 7c: SKIPPED (no probe scripts declared by this phase).

### Requirements Coverage

All 13 phase IDs appear in plan frontmatter and are marked Complete in REQUIREMENTS.md; none orphaned. INT-02, INTG-03, INTG-04 are mapped to Phase 10 (out of scope here).

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| TEXT-01 | 09-01, 09-09 | 10 sample digests on load, no CLS | ✓ SATISFIED | Constants-based first render; CLS e2e < 0.01 |
| TEXT-02 | 09-01, 09-02 | Live updates, no stale overwrite | ✓ SATISFIED | `seqRef` guard + test; HashClient hardening |
| TEXT-03 | 09-01 | Byte count + newline/CRLF hint | ✓ SATISFIED | `hash-bytes`, hint paragraph |
| TEXT-04 | 09-06 | `?text=` restore, explicit Copy link only, no analytics | ✓ SATISFIED | See truth 4 |
| OUT-01 | 09-04 | Copy single digest with confirmation | ✓ SATISFIED | DigestRow + e2e |
| OUT-02 | 09-04 | Copy all labeled / sha256sum format | ✓ SATISFIED | export.ts + tests |
| OUT-03 | 09-04 | hex/HEX/Base64 no re-hash | ✓ SATISFIED | display-only formatting |
| OUT-04 | 09-05 | Paste-to-verify tolerant matching | ✓ SATISFIED | verify.ts + e2e |
| OUT-05 | 09-04 | Inline not-for-security labels | ✓ SATISFIED | Badge text asserted |
| INT-01 | 09-07 | `/`, Esc, copy shortcut, Enter unbound | ✓ SATISFIED | keyboard tests + e2e |
| INT-03 | 09-09 | 320px light/dark, no horizontal scroll | ✓ SATISFIED | hash-layout e2e |
| INTG-01 | 09-03 | Registry -> nav, grid, sitemap, 5-tool tests | ✓ SATISFIED | home/navigation e2e |
| INTG-02 | 09-08 | Metadata, worked example, FAQ + JSON-LD | ✓ SATISFIED | hash-seo e2e + built HTML |

### Prohibitions (ADR-550)

| Prohibition | Tier | Status | Evidence |
| ----------- | ---- | ------ | -------- |
| No modal/popup/tooltip-only content (09-01) | test | Satisfied | All notices inline; no dialog/tooltip in tool; tests present |
| MD5/SHA-1/CRC32 never without inline label (09-04) | test | Satisfied | Unit test asserts exact badge text |
| No automatic URL writes of typed text (09-06) | test | Satisfied | No History/router code in island; unit + e2e URL/history-length tests |
| `text` never to analytics/storage (09-06) | test | Satisfied | Empty allow-list + redact regression test |
| No clipboard overwrite without explicit action (09-07) | test | Satisfied | Keyboard tests (selection yields, modifiers) |
| Esc must not discard typed text irrecoverably (09-07) | test | Satisfied | Restore notice + tests (IN-01 fix keeps empty text out) |
| D-27 no privacy/legal claims beyond approved (09-03, 09-08) | judgment | Flagged: unverified-prohibition, human review recommended | LLM judge: grep of forbidden phrases in tool/page/registry/layout finds none; FAQ answer pinned by exact-equality test. Non-authoritative |
| OUT-04 match copy not authenticity wording (09-05) | judgment | Flagged: unverified-prohibition, human review recommended | LLM judge: copy is "Matches SHA-256." / neutral no-match. Non-authoritative |

### Anti-Patterns Found

None. No TBD/FIXME/XXX/TODO/HACK markers in phase files. The "Encountered a script tag" dev-console warning comes from the JSON-LD `<script>` in a Server Component (same pattern as `app/tools/mac/page.tsx`); informational only.

### Review Findings Disposition

WR-01..WR-05, IN-01, IN-02 are fixed in code (verified present in `HashTool.tsx` and `useKeyboardShortcut.ts`; regression tests pass). IN-03 (no-match hint speaks of hex length for Base64-shaped paste), IN-04 (redundant per-keystroke work, stale doc comments), IN-05 (long meta description, fixed-sleep layout e2e) remain open by decision. All are info-level, not blockers.

### Human Verification Required

See frontmatter `human_verification` (5 items): real-IME Esc behaviour (WR-02), visual polish at 320px/desktop in light and dark, D-27 wording review, OUT-04 wording review, and real-browser clipboard/shortcut behaviour.

### Gaps Summary

No gaps. Every ROADMAP success criterion and all 13 requirement IDs are backed by code that exists, is substantive, wired, and has passing tests I re-ran. The status is `human_needed` solely because two judgment-tier prohibitions are flagged for human review and visual/IME/real-clipboard behaviour cannot be proven programmatically. Open info findings IN-03..IN-05 may be handled in a cleanup pass or Phase 10.

---

_Verified: 2026-10-15_
_Verifier: Claude (gsd-verifier)_
