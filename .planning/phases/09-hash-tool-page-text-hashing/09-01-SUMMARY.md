---
phase: 09-hash-tool-page-text-hashing
plan: 01
subsystem: ui
tags: [nextjs, react, web-worker, hashing, rtl, playwright, textarea]
requires:
  - phase: 08-hash-core-worker-runtime
    provides: createHashClient (supersede funnel), ALGORITHMS, toHex, encodeText
provides:
  - "/tools/hash static server shell + ssr:false loader + HashTool island"
  - "lib/hash/sample.ts first-paint constants pinned to engine and node oracle"
  - "Textarea primitive (components/ui/textarea.tsx)"
  - "Shared RTL harness (hash-test-utils.ts) with deferred fake HashClient"
  - "Input meta: UTF-8 byte count, echo/CRLF hint, empty note, 1 MiB soft cap with debounce"
affects: [09-02, 09-03, 09-04, 09-05, 09-06, 09-07, 09-08, 09-09]
actuals:
  tokens: 9000
  tasks: 3
  commits: 5
plan_head_before: 631c8e1c5f2819f0f32ad7e8baa2f70cdd243f96
plan_head_after: 29718230cfac10ed78e299363273dae29f01a99d
tech-stack:
  added: []
  patterns:
    - "HashClient created inside the mount effect and disposed in cleanup (StrictMode-safe)"
    - "Handler-driven hashing with a seqRef latest-wins guard; cancelled outcomes ignored"
    - "Lazy useState seeding from precomputed constants (no setState in effects)"
    - "Debounce only above a soft cap, cancelPending() supersedes the in-flight job"
key-files:
  created:
    - components/ui/textarea.tsx
    - lib/hash/sample.ts
    - lib/hash/sample.test.ts
    - app/tools/hash/page.tsx
    - app/tools/hash/HashToolLoader.tsx
    - app/tools/hash/HashTool.tsx
    - app/tools/hash/hash-test-utils.ts
    - app/tools/hash/HashTool.test.tsx
    - tests/e2e/hash.spec.ts
  modified: []
key-decisions:
  - "Sample digests stored as hex strings, converted to fresh Uint8Arrays by sampleDigests(); format.ts untouched"
  - "150 ms debounce only above 1,048,576 UTF-8 bytes; none at or below"
  - "Soft-cap copy follows D-07a (no file-mode pointer); Phase 10 adds the suggestion"
  - "Textarea primitive hand-authored to the radix-nova shape; package.json unchanged"
  - "Select-on-focus selects synchronously and again next frame, plus an onMouseUp guard while the untouched sample is fully selected"
requirements-completed: [TEXT-01, TEXT-02, TEXT-03]
coverage:
  - id: D1
    description: "/tools/hash paints the 10 digests of hello world from constants on first paint with zero worker calls"
    requirement: TEXT-01
    verification:
      - kind: unit
        ref: "app/tools/hash/HashTool.test.tsx#TEXT-01: shows the sample and its 10 digests on mount without calling the worker"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash.spec.ts#renders all 10 sample digests on load"
        status: pass
      - kind: unit
        ref: "lib/hash/sample.test.ts (constants == runHashJob == node:crypto/zlib)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Typing hashes live through the worker; stale and cancelled results never overwrite newer digests; error/rejection shows an inline alert; StrictMode-safe"
    requirement: TEXT-02
    verification:
      - kind: unit
        ref: "app/tools/hash/HashTool.test.tsx#HashTool live hashing (TEXT-02)"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash.spec.ts#typing hashes in the worker and updates every digest"
        status: pass
    human_judgment: false
  - id: D3
    description: "Exact UTF-8 byte count, newline/CRLF hint, empty-input note, 1 MiB soft cap notice with 150 ms debounce above the cap, select-on-focus"
    requirement: TEXT-03
    verification:
      - kind: unit
        ref: "app/tools/hash/HashTool.test.tsx#HashTool input meta (TEXT-03) and 1 MiB soft cap"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash.spec.ts#select-on-focus replaces the sample (D-03); pasted CRLF is hashed as LF (TEXT-03)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Visual fit (skeleton height vs settled island, dimmed stale rows, notice styling) at 320/1280 widths in light and dark"
    verification: []
    human_judgment: true
    rationale: "Skeleton heights are UI-SPEC estimates; 09-09 measures and pins them. Visual theme/width checks are not asserted here."
duration: 4min
completed: 2026-10-15
status: complete
---

# Phase 9 Plan 01: Hash tool page, live text hashing Summary

**`/tools/hash` paints the 10 digests of `hello world` from precomputed constants with zero worker calls, then hashes typed text live in the Phase 8 Web Worker with a latest-wins guard, exact UTF-8 byte count, newline hint, empty note and a 1 MiB soft cap debounced at 150 ms.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-10-15T17:47:11Z
- **Completed:** 2026-10-15T17:51:20Z
- **Tasks:** 3 (tracer + 2 TDD expansion tasks)
- **Files created:** 9

## Accomplishments

- Tracer: route, loader (fixed-height skeleton), island, Textarea primitive and sample constants; dev-server e2e proves the real worker produces the node oracle digests for the sample and for typed `abc`. Tracer verified end-to-end before expansion.
- Race, cancel, error, rejection and StrictMode contract locked by an RTL suite using a deferred fake HashClient; sample constants pinned to the engine and the node:crypto/zlib oracle.
- Input meta: exact UTF-8 byte count (é=2, €=3, 🚀=4, lone surrogate=3), static echo/printf/CRLF hint wired via `aria-describedby`, empty-input note, soft-cap notice strictly above 1,048,576 bytes with 150 ms debounce above the cap only, select-on-focus replacing the sample, CRLF normalized to LF in a real browser.

## Task Commits

1. Task 1 (tracer): `3510aaa` feat
2. Task 2: `f2b49cc` test (RED), `16b0fa1` feat (GREEN)
3. Task 3: `af6dfe9` test (RED), `2971823` feat (GREEN)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Select-on-focus lost to the click and to a fast first keystroke**
- **Found during:** Task 3 (e2e)
- **Issue:** `requestAnimationFrame(() => el.select())` alone left the value `hello worldz` after click then type (all 5 repeats failed).
- **Fix:** select synchronously in `onFocus`, again in rAF, and add the plan's contingency `onMouseUp` guard (preventDefault only while the untouched sample is fully selected). 5/5 repeats pass.
- **Files modified:** app/tools/hash/HashTool.tsx
- **Commit:** 2971823

**2. [Rule 3 - Blocking] Corrupted `.next` cache blocked typecheck and the Playwright dev server**
- **Found during:** Task 1 and Task 3
- **Issue:** the repo lives under an iCloud-synced `~/Documents`; sync created duplicate " 2"/" 3" files in `.next/dev` (`CURRENT 2`, `routes.d 2.ts`), making `tsc` and Turbopack fail.
- **Fix:** removed the gitignored `.next` build output (`rm -rf .next`, `.next/dev` before later runs). No tracked files affected.
- **Commit:** none (untracked build artifact)

**3. [Rule 1 - Bug] Typing the sample back left a stale error notice**
- **Found during:** Task 3 implementation
- **Fix:** the instant sample path also clears `hashError` (digests are exact constants).
- **Files modified:** app/tools/hash/HashTool.tsx
- **Commit:** 2971823

**4. Plan wording note:** the error copy is held in a `HASH_ERROR_COPY` constant (rather than inline JSX) so the acceptance grep for the exact string matches.

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking). **Impact:** none on scope.

## Issues Encountered

- `npm run lint` reports one pre-existing warning in `lib/mac/vendor.ts` (unused `MacVendorRouteResponse`); out of scope, untouched.
- A stale `next-server` (pid 38202, started 18:13, port 3101, from the earlier prod e2e) was already running in this repo before execution; not started by this plan and left running. The `.next` removal above may have invalidated its build output.

## Known Stubs

None. The skeleton heights (`h-[1960px] sm:h-[1600px]`) are UI-SPEC estimates, intentionally pinned by 09-09.

## Threat Flags

None. T-09-01 (no console/Web Storage/cookie access in HashTool.tsx, error copy never interpolates the text), T-09-02 (debounce + cancelPending above 1 MiB), T-09-03 (seq guard, out-of-order test), T-09-04 (autofill-ignore attributes asserted) and T-09-SC (package.json/lock unchanged) are mitigated and tested.

## Verification

- `npx vitest run lib/hash app/tools/hash`: 11 files, 227 tests pass (includes boundaries.test.ts).
- `npx playwright test tests/e2e/hash.spec.ts`: 4 pass.
- `npm run typecheck`: clean. `npm run lint`: 0 errors (1 pre-existing warning).
- Acceptance greps (sample constants, import type only, no searchParams, ssr:false, autofill attributes, forbidden primitives and storage APIs, useMemo byte count): all pass; `git diff --quiet -- package.json package-lock.json` exits 0.

## Next Phase Readiness

Island state shape, refs (`clientRef`, `seqRef`, `debounceRef`, `textareaRef`), `cancelPending()` and the test harness are in place for 09-02 onward (09-02 owns `lib/hash/client.ts` hardening; 09-07 wires Esc via `cancelPending()`).

## Self-Check: PASSED

All 9 created files exist; commits 3510aaa, f2b49cc, 16b0fa1, af6dfe9, 2971823 are ancestors of HEAD.
