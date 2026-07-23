---
phase: 02-uuid-generator
plan: 04
subsystem: ui
tags: [nextjs, uuid, export, clipboard, blob-download, playwright, vitest]

requires:
  - phase: 02-uuid-generator
    provides: "02-02: UuidTool.tsx state shape ({rawUuids, version, count, case, hyphens}), formatUuids display derivation, useCopyToClipboard hook, uuid-batch-count/uuid-version-toggle testids"
provides:
  - "lib/uuid/export.ts: framework-agnostic toPlainText/toCsv/toJson pure serializers, serializeUuids(uuids, format) dispatcher, EXPORT_FILE filename+mime metadata map — no DOM/React/Next import"
  - "UuidTool.tsx: format state (text/csv/json, D-07 single selector), export-format ToggleGroup, Copy All button (batch mode, dedicated useCopyToClipboard instance), Download button (inline Blob+anchor helper with revokeObjectURL cleanup)"
  - "tests/e2e/uuid.spec.ts: copy-all CSV/JSON clipboard-content assertions, download suggestedFilename() assertions for all three formats"
affects: []

tech-stack:
  added: []
  patterns:
    - "Second independent useCopyToClipboard() instance per distinct copy affordance on a page (hero copy vs. Copy All) — keeps confirmation/error state from colliding when both controls exist simultaneously"
    - "Browser-only Blob/anchor download helper stays inline in the client component, never in framework-agnostic lib/ — mirrors the project's existing client/lib split"

key-files:
  created:
    - lib/uuid/export.ts
    - lib/uuid/export.test.ts
  modified:
    - app/tools/uuid/UuidTool.tsx
    - tests/e2e/uuid.spec.ts

key-decisions:
  - "One `format` state value drives both Copy All and Download (D-07) — implemented as a single ToggleGroup with no second picker anywhere in the component."
  - "Copy All button is conditionally rendered only when state.count > 1 (batch mode), per the plan's literal instruction and the UI-SPEC Copywriting Contract's 'Secondary CTA — batch mode' framing; Download has no such gate and is always visible, satisfying the must_haves truth that count=1 exports are still reachable via Download."
  - "toCsv/toJson/toPlainText ship with no CSV-escaping library — the UUID alphabet (hex + hyphen) cannot produce a comma/quote/newline/formula-trigger character, so threat T-02-06 is accepted with a code comment citing the rationale rather than adding a dependency."

patterns-established:
  - "Export-format-driven Copy/Download pairing: any future tool needing multi-format output (e.g. Subnet's breakdown table) can reuse this exact shape — one format selector, a pure serializeUuids-style dispatcher in lib/, and an inline Blob/anchor download helper in the client component."

requirements-completed: [UUID-05, UUID-06]

coverage:
  - id: D1
    description: "toPlainText/toCsv/toJson produce exact newline-joined text, uuid-header CSV, and 2-space-indented bare JSON array output respectively, with no metadata columns/fields (D-08); all three are total for a single-element array (count=1)."
    requirement: "UUID-05"
    verification:
      - kind: unit
        ref: "lib/uuid/export.test.ts#toPlainText/toCsv/toJson (12 tests total incl. single-element and EXPORT_FILE map)"
        status: pass
    human_judgment: false
  - id: D2
    description: "One export-format ToggleGroup (text/csv/json) drives both Copy All and Download — no second format picker exists (D-07)."
    requirement: "UUID-05"
    verification:
      - kind: unit
        ref: "grep confirms UuidTool.tsx has a single `format` state field read by both handleCopyAll and handleDownload"
        status: pass
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#download triggers a file named per the selected format (asserts the same selector drives all three downloaded filenames)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Copy All copies every visible batch value, in order, in the selected format, with a visible + announced ('Copied!' + aria-live) confirmation."
    requirement: "UUID-06"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#copy all in CSV format copies a uuid-header CSV of every batch value"
        status: pass
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#copy all in JSON format copies a raw-string array of every batch value"
        status: pass
    human_judgment: false
  - id: D4
    description: "Download saves uuids.txt/uuids.csv/uuids.json (per selected format) with a Blob built from the correct MIME type, and revokes the object URL after the synthetic click (Pitfall 3 / T-02-07 mitigation)."
    requirement: "UUID-06"
    verification:
      - kind: e2e
        ref: "tests/e2e/uuid.spec.ts#download triggers a file named per the selected format"
        status: pass
      - kind: unit
        ref: "grep -q revokeObjectURL app/tools/uuid/UuidTool.tsx"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-23
status: complete
---

# Phase 2 Plan 04: UUID Export (Copy All, Download, Format Selector) Summary

**Single export-format ToggleGroup (plain text / CSV / JSON) drives both Copy All and a Blob-based Download, completing UUID-05/UUID-06 via a new framework-agnostic `lib/uuid/export.ts` serializer with zero CSV-escaping dependency.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-23T18:15:04+02:00
- **Completed:** 2026-07-23T18:17:44+02:00
- **Tasks:** 3 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Shipped `lib/uuid/export.ts` — `toPlainText`/`toCsv`/`toJson` pure serializers, a `serializeUuids(uuids, format)` dispatcher, and an `EXPORT_FILE` filename+MIME metadata map, with zero DOM/React/Next imports and zero CSV-escaping library (UUID alphabet can never contain a comma/quote/newline).
- Wired a single `format` state field into `UuidTool.tsx` that drives BOTH Copy All and Download (D-07) via one `ToggleGroup` — no second format picker exists.
- Added "Copy all" (accent, batch mode only, dedicated `useCopyToClipboard` instance so its confirmation state never collides with the hero single-copy button) and "Download" (neutral/outline styling per UI-SPEC, inline `Blob`+anchor helper that calls `URL.revokeObjectURL` immediately after the synthetic click — Pitfall 3 / T-02-07).
- Extended `tests/e2e/uuid.spec.ts` with 3 new tests covering CSV/JSON clipboard content and download filenames for all three formats; the full 13-test uuid.spec.ts suite and the full 27-test e2e suite both pass.

## Task Commits

Each task was committed atomically:

1. **Task 1: lib/uuid/export.ts — text/CSV/JSON serializers + file metadata (TDD)**
   - RED - `3b2441c` (test)
   - GREEN - `a1f9a25` (feat)
2. **Task 2: Export-format selector + Copy All + Download wired into UuidTool** - `584e44f` (feat)
3. **Task 3: Extend e2e spec — export formats, copy-all, download** - `efc01ba` (test)

**Plan metadata:** (pending — final `docs(02-04)` commit, see below)

## Files Created/Modified

- `lib/uuid/export.ts` - Pure `toPlainText`/`toCsv`/`toJson`/`serializeUuids`/`EXPORT_FILE`; no React/Next/DOM import
- `lib/uuid/export.test.ts` - Vitest exact-output assertions (12 tests: per-format output, single-element input, EXPORT_FILE map)
- `app/tools/uuid/UuidTool.tsx` - Added `format` state, export-format `ToggleGroup`, "Copy all" button (batch mode, accent), "Download" button (neutral, inline Blob/anchor helper with `revokeObjectURL` cleanup)
- `tests/e2e/uuid.spec.ts` - Added 3 tests: copy-all CSV clipboard content, copy-all JSON clipboard content, download filename per format

## Decisions Made

- **Single `format` state drives both Copy All and Download (D-07):** implemented as one `ToggleGroup` read by both `handleCopyAll` and `handleDownload` — satisfies the plan's `key_links` requirement literally, verified by the e2e test asserting all three downloaded filenames follow the one selected format.
- **Copy All gated to batch mode (`state.count > 1`), Download always visible:** matches the plan's literal instruction ("shown in batch mode") and the UI-SPEC Copywriting Contract's "Secondary CTA — batch mode" framing for Copy All, while Download stays reachable at count=1 to satisfy the must_haves truth that single-value exports are valid and non-empty.
- **No CSV-escaping library:** `toCsv` joins raw values directly; the UUID alphabet (hex digits + hyphen) structurally cannot produce a comma, quote, newline, or formula-trigger character (`=`,`+`,`@`), so threat T-02-06 is accepted with rationale rather than adding a dependency — matches RESEARCH.md's "Don't Hand-Roll" guidance in reverse (this is the one case where NOT using a library is correct).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- UUID-05 and UUID-06 are both complete; the UUID Generator tool (Phase 2) now has all planned requirements (UUID-01 through UUID-06, QUAL-01/QUAL-02) implemented and verified.
- No blockers for Phase 2 sign-off/transition. `lib/uuid/export.ts`'s serializer/dispatcher/file-metadata pattern is a reusable template for any future tool needing multi-format Copy/Download (e.g. Subnet Calculator's breakdown export).

---
*Phase: 02-uuid-generator*
*Completed: 2026-07-23*

## Self-Check: PASSED

Verified `lib/uuid/export.ts`, `lib/uuid/export.test.ts`, `app/tools/uuid/UuidTool.tsx`, `tests/e2e/uuid.spec.ts` all present on disk; all 4 task commit hashes (`3b2441c`, `a1f9a25`, `584e44f`, `efc01ba`) verified present in `git log`.
