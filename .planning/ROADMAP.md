# Roadmap: Packetory

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-07-25)
- ✅ **v1.1 Production Domain & Landing Page Polish** — Phases 6-7 (shipped 2026-07-25)
- ✅ **v1.2 Hash Generator** — Phases 8-9 (shipped 2026-10-17)
- ✅ **v1.3 Password Generator & Tool Page Polish** — Phases 10-14 (shipped 2026-11-12)
- 🚧 **v1.4 Text Diff** — Phases 15-16 (in planning)

## Phases

- [x] **Phase 15: Text Comparison Engine** — Compare plain text in a browser worker and return aligned changes. (completed 2026-11-26)
- [ ] **Phase 16: Text Diff Workspace & Release** — Deliver and verify the paste-and-compare workflow in Packetory.

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-07-25</summary>

- [x] Phase 1: Shared Shell + Registry (5/5 plans) — completed 2026-07-23
- [x] Phase 2: UUID Generator (4/4 plans) — completed 2026-07-24
- [x] Phase 3: IP Subnet Calculator (5/5 plans) — completed 2026-07-24
- [x] Phase 4: DNS Lookup (4/4 plans) — completed 2026-07-25
- [x] Phase 5: MAC Address Inspector (3/3 plans) — completed 2026-07-25

Full phase details archived at `.planning/milestones/v1.0-ROADMAP.md`.

</details>

<details>
<summary>✅ v1.1 Production Domain & Landing Page Polish (Phases 6-7) — SHIPPED 2026-07-25</summary>

- [x] Phase 6: Landing Page Card Navigation (2/2 plans) — completed 2026-07-25
- [x] Phase 7: Production Domain Cutover (packetory.dev) (1/1 plans) — completed 2026-07-25

Full phase details archived at `.planning/milestones/v1.1-ROADMAP.md`.

</details>

<details>
<summary>✅ v1.2 Hash Generator (Phases 8-9) — SHIPPED 2026-10-17</summary>

- [x] Phase 8: Hash Core & Worker Runtime (5/5 plans) — completed 2026-10-15
- [x] Phase 9: Hash Tool Page & Text Hashing (9/9 plans) — completed 2026-10-17

Phase 10 (File Hashing & Release Hardening) was removed 2026-10-17 by user decision; text-only is the intended scope. Full phase details archived at `.planning/milestones/v1.2-ROADMAP.md`.

</details>

<details>
<summary>✅ v1.3 Password Generator & Tool Page Polish (Phases 10-14) — SHIPPED 2026-11-12</summary>

- [x] Phase 10: Shared About Section & Config Parity (6/6 plans) — completed 2026-11-11
- [x] Phase 11: Subnet Calculator Compaction (1/1 plans) — completed 2026-11-12
- [x] Phase 12: Password Core Library (5/5 plans) — completed 2026-11-12
- [x] Phase 13: Password Generator Page (6/6 plans) — completed 2026-11-12
- [x] Phase 14: Passphrase, Strength & Launch (8/8 plans) — completed 2026-11-12

Full phase details archived at `.planning/milestones/v1.3-ROADMAP.md`.

</details>

## Phase Details

### Phase 15: Text Comparison Engine

**Goal**: The browser can produce a faithful comparison that identifies both changed lines and edits within them.

**Depends on**: Nothing (first phase of v1.4)

**Requirements**: DIFF-01, DIFF-02

**Success Criteria** (what must be TRUE):

1. A browser worker comparison treats Windows and Unix line endings as equivalent while detecting meaningful changes to indentation, trailing spaces, internal blank lines, and the final newline.
2. Results distinguish additions, removals, and related replacements with original and modified line numbers. A small edit, such as one digit in an IP address, is marked within its changed line.
3. Repeated lines and unequal replacement groups produce stable, ordered results with no dropped or duplicated source text.

**Plans**: 1/1 plans complete

- [x] 15-01-PLAN.md — Implement and verify the browser text comparison engine.

### Phase 16: Text Diff Workspace & Release

**Goal**: Users can paste two snippets, compare and review changes privately on desktop or mobile, and clear the workspace for the next comparison.

**Depends on**: Phase 15

**Requirements**: DIFF-03, DIFF-04, WORK-01, WORK-02, WORK-03, WORK-04, VIEW-01, VIEW-02, VIEW-03, VIEW-04

**Success Criteria** (what must be TRUE):

1. Text Diff opens from Packetory’s landing page and navigation. Users can paste or edit each field and compare by button or Ctrl/Command+Enter once both fields contain a non-whitespace character. Editing marks the previous result as out of date.
2. Users see aligned, numbered columns on desktop and a single-column diff on narrow screens. Changes have visual markers and accessible labels. The tool announces comparison status and shows a clear summary or identical-text message.
3. Keyboard users can expand collapsed unchanged lines with nearby context visible by default. From an empty workspace, Try an example demonstrates an inline edit and a whole-line addition.
4. Clear all empties both fields, clears results and status, and focuses Original. An in-flight comparison cannot restore a cleared result. Users can keep interacting during comparison, and inputs beyond verified processing or rendering limits show a recoverable message and remain editable.
5. Production browser verification shows that pasted snippets and comparison results stay out of network requests, URLs, telemetry, logs, and app-managed storage.

**Plans**: TBD

**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 15. Text Comparison Engine | 1/1 | Complete    | 2026-11-26 |
| 16. Text Diff Workspace & Release | 0/TBD | Not started | — |
