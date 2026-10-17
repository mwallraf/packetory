---
phase: 09-hash-tool-page-text-hashing
plan: 06
subsystem: ui
tags: [hash, share-link, url-state, privacy, analytics-redaction, fast-check, vitest, playwright]
status: complete
requires:
  - phase: 09-hash-tool-page-text-hashing
    provides: "09-05 HashTool with verify wiring; 09-04 DigestRow and OutputToolbar; 09-01 sample digests and hash-test-utils"
provides:
  - "HashTool restores ?text= (first occurrence) once at mount; read-only, never writes the URL"
  - "DigestRow pending variant (same-height transparent placeholder, sr-only Computing, copy disabled)"
  - "OutputToolbar digests: Digests | null (Copy all disabled while null)"
  - "lib/hash/share-link.ts: SHARE_TEXT_MAX_ENCODED, ShareLink, buildShareLink (pure, total)"
  - "Copy link button (absolute URL, Copied! confirmation, inline disabled reasons) and the always-visible 'The link contains your text.' line"
  - "HASH-TEXT regression in lib/analytics/redact.test.ts"
affects: [09-07, 09-09]
actuals:
  tokens: 14500
  tasks: 3
  commits: 4
plan_head_before: 399ecb30fdb982f1be53002d821f75d20d5d87a8
plan_head_after: 9ee8809c18db242de09d9b3af5b613945336b806
tech-stack:
  added: []
  patterns:
    - "URL is read once in a lazy useState initializer and never written: no History API write, router or search-params hook in any hash source file"
    - "result is Settled | null; null means a restore is hashing, so sample digests are never shown beside non-sample text"
    - "Share link derived at render from the current text (never result.text) and copied only on an explicit click"
    - "Cap measured on the encodeURIComponent output; encoding wrapped in try/catch so a lone surrogate disables the button instead of throwing"
key-files:
  created:
    - lib/hash/share-link.ts
    - lib/hash/share-link.test.ts
    - app/tools/hash/HashTool.url.test.tsx
    - tests/e2e/hash-url.spec.ts
  modified:
    - app/tools/hash/HashTool.tsx
    - app/tools/hash/DigestRow.tsx
    - app/tools/hash/OutputToolbar.tsx
    - lib/analytics/redact.test.ts
key-decisions:
  - "Copy link is absolute (window.location.origin + /tools/hash?text=...) so pasted links work on any origin including previews"
  - "Copy link is disabled for empty text because an empty ?text= loads the sample and would not reproduce the state"
  - "The 2,000 cap is inclusive: encoded length 2,000 is allowed, 2,001 is not"
  - "The mount effect that starts the restore hash sits after runHash/cancelPending in the component body (react-hooks/immutability forbids using the function before its declaration)"
requirements-completed: [TEXT-04]
coverage:
  - id: D1
    description: "/tools/hash?text=... restores the text on load with pending placeholder rows (never the sample's digests) until the worker result lands; missing or empty ?text= loads the sample; first occurrence wins"
    requirement: TEXT-04
    verification:
      - kind: unit
        ref: "app/tools/hash/HashTool.url.test.tsx#TEXT-04 ?text=abc restores the text, hashes it, and shows pending rows until the result lands"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-url.spec.ts#a non-ASCII ?text= restores the text and its real digests (TEXT-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Typing never writes the address bar, history or router; window.location and history.length stay identical"
    requirement: TEXT-04
    verification:
      - kind: unit
        ref: "app/tools/hash/HashTool.url.test.tsx#TEXT-04 typing never writes the address bar or history (D-20)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-url.spec.ts#typing never changes the URL or the history length (TEXT-04, D-20)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Copy link copies the exact absolute link with Copied! confirmation, twice-identical, round-trips exactly in a real browser; disabled with inline reason for empty, over 2,000 encoded characters or unencodable text"
    requirement: TEXT-04
    verification:
      - kind: unit
        ref: "lib/hash/share-link.test.ts#cap boundary, lone surrogate, empty, idempotency, round-trip property"
        status: pass
      - kind: unit
        ref: "app/tools/hash/HashTool.url.test.tsx#HashTool Copy link (TEXT-04)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-url.spec.ts#a copied link restores the exact text and never changes the page URL (TEXT-04, D-21)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The text parameter is stripped by analytics redaction and never allow-listed; redact.ts and PacketoryAnalytics.tsx are unchanged"
    requirement: TEXT-04
    verification:
      - kind: unit
        ref: "lib/analytics/redact.test.ts#HASH-TEXT regression"
        status: pass
    human_judgment: false
  - id: D5
    description: "Visual quality of the pending placeholder rows and the Copy link button placement at 320px"
    requirement: TEXT-04
    human_judgment: true
    rationale: "Layout equality with settled rows (no CLS) and 320px non-overflow are visual; 09-09 measures the settled island and pins heights"
---

# Phase 9 Plan 06: Shareable ?text= Restore and Capped Copy Link Summary

**`/tools/hash?text=...` restores its text with pending rows (never sample digests), typing never touches the address bar, and an explicit absolute 2,000-encoded-character-capped "Copy link" is the only way text enters a URL; analytics redaction of `text` is regression-tested.**

## Performance

- **Tasks:** 3 (1 tracer, 1 TDD, 1 auto)
- **Files:** 4 created, 4 modified (plus the new RED test commit)

## Accomplishments

- Tracer: URL -> textarea -> worker -> digests proven end to end in RTL and a real browser. `readTextParam()` runs once in the lazy `useState` initializer; the mount effect starts the hash for a non-sample restore, so only the async continuation sets state.
- `result` widened to `Settled | null`; null renders 10 same-height pending rows (copy disabled, sr-only "Computing"), disables Copy all, and shows "Comparing..." for a non-empty verify value.
- `buildShareLink` is pure and total: empty, too-long (inclusive 2,000 on the encoded output) and unencodable (lone surrogate, caught URIError) are explicit results, never exceptions.
- Copy link UI under the textarea (content-width, Check icon + "Copied!", aria-live), the always-visible "The link contains your text." line, and the inline notice with `aria-describedby` wiring.
- HASH-TEXT redact regression added; `lib/analytics/redact.ts` and `PacketoryAnalytics.tsx` untouched; no package changes.

## Task Commits

1. Task 1 (tracer): `d08b814` feat - ?text= restore, pending rows, read-only URL handling
2. Task 2 RED: `e3aba27` test - share-link and Copy link contract
3. Task 2 GREEN: `782db0a` feat - explicit capped Copy link
4. Task 3: `9ee8809` test - redact regression and Copy link e2e round trip

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] react-hooks/immutability lint error on the mount effect**
- **Found during:** Task 1
- **Issue:** Calling `runHash` from the mount effect placed above its declaration fails eslint.
- **Fix:** Moved the client-creating effect below `runHash`/`cancelPending` in the component body; behavior unchanged.
- **Files modified:** app/tools/hash/HashTool.tsx
- **Commit:** d08b814

**2. [Rule 1 - Bug] e2e typing appended at the caret start**
- **Found during:** Task 1
- **Issue:** `pressSequentially` on a click-focused textarea inserted before the restored text.
- **Fix:** Press End before typing in the e2e test.
- **Files modified:** tests/e2e/hash-url.spec.ts
- **Commit:** d08b814

**3. [Rule 3 - Blocking] A source comment matched the acceptance grep**
- **Found during:** Task 1
- **Issue:** The doc comment word "router." matched the no-router acceptance grep.
- **Fix:** Reworded the comment.
- **Files modified:** app/tools/hash/HashTool.tsx
- **Commit:** d08b814

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking). **Impact:** none on scope.

Environment note: iCloud-created `.next/dev/CURRENT 2` once broke the Playwright dev server; `rm -rf .next/dev` resolved it (gitignored, no code change).

## Known Stubs

None. The pending placeholder is an intentional transient loading state, not a stub.

## Threat Flags

None. No new network endpoints, auth paths or storage; the only new URL surface is the explicit user-click Copy link, covered by T-09-21.

## Next Phase Readiness

Ready for 09-07. 09-09 should pin the skeleton heights including the new Copy link row. Phase 10 (INTG-03) still owns the zero-third-party-request e2e and fragment redaction.

## Self-Check: PASSED

- Created files exist: lib/hash/share-link.ts, lib/hash/share-link.test.ts, app/tools/hash/HashTool.url.test.tsx, tests/e2e/hash-url.spec.ts
- Commits d08b814, e3aba27, 782db0a, 9ee8809 are ancestors of HEAD
- `npx vitest run lib/hash app/tools/hash lib/analytics` 386 passed; `npm run typecheck` clean; `npm run lint` 0 errors; `npx playwright test tests/e2e/hash` 22 passed
- `git diff --quiet -- lib/analytics/redact.ts lib/analytics/PacketoryAnalytics.tsx package.json package-lock.json` exits 0
- No History API write, useRouter or useSearchParams in app/tools/hash non-test sources
