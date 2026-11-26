# Requirements: Packetory

**Milestone:** v1.4 Text Diff
**Defined:** 2026-11-26
**Core Value:** Paste two snippets and see exactly what changed.

## v1.4 Requirements

### Comparison

- [ ] **DIFF-01**: Users can compare plain text with indentation, trailing spaces, internal blank lines, and a final newline preserved. Windows and Unix line endings are equivalent.
- [ ] **DIFF-02**: Users can distinguish added, removed, and modified lines, with exact edits highlighted within related lines.
- [ ] **DIFF-03**: Users can keep interacting with the workspace during comparison. Inputs that exceed verified processing or rendering limits produce a recoverable message and leave the snippets available to edit.
- [ ] **DIFF-04**: Users can compare snippets entirely in their browser. Comparison contents and results stay out of network requests, URLs, telemetry, logs, and app-managed storage.

### Workspace

- [ ] **WORK-01**: Users can paste or edit plain text in Original and Modified. Compare is available only when both fields contain at least one non-whitespace character.
- [ ] **WORK-02**: Users can compare with the Compare button or Ctrl/Command+Enter. Editing after comparison marks the prior result as out of date.
- [ ] **WORK-03**: Clear all empties both fields, removes the result and its status, and returns focus to Original. Pending work cannot restore a cleared result.
- [ ] **WORK-04**: Try an example is available from the empty workspace and demonstrates an inline edit and a whole-line addition.

### Results and integration

- [ ] **VIEW-01**: Users see aligned, numbered lines side by side on desktop and a single-column diff on narrow screens. Symbols and accessible labels convey changes alongside color.
- [ ] **VIEW-02**: Users see a concise change summary or a clear identical-text message. Comparison status is available to assistive technology.
- [ ] **VIEW-03**: Long stretches of unchanged text are initially collapsed, with nearby context visible and a keyboard-accessible way to expand the rest.
- [ ] **VIEW-04**: Users can open Text Diff through Packetory's landing page and site navigation. The tool uses the shared page conventions.

## Future Requirements

- Local plain-text file import, if demand warrants it.
- Copy diff and Swap sides.
- Optional whitespace filtering.

## Out of Scope

- Shared or saved comparisons, accounts, merge editing, and non-text comparison.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DIFF-01 | Phase 15 | Pending |
| DIFF-02 | Phase 15 | Pending |
| DIFF-03 | Phase 16 | Pending |
| DIFF-04 | Phase 16 | Pending |
| WORK-01 | Phase 16 | Pending |
| WORK-02 | Phase 16 | Pending |
| WORK-03 | Phase 16 | Pending |
| WORK-04 | Phase 16 | Pending |
| VIEW-01 | Phase 16 | Pending |
| VIEW-02 | Phase 16 | Pending |
| VIEW-03 | Phase 16 | Pending |
| VIEW-04 | Phase 16 | Pending |
