---
phase: 09
review: 09-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "Focus-time `requestAnimationFrame(() => el.select())` is unconditional and can select typed text"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "Escape during IME composition resets the tool"
  - id: WR-03
    severity: warning
    disposition: fixed
    title: "`?text=` with CR/CRLF is hashed as-is while the textarea shows LF"
  - id: WR-04
    severity: warning
    disposition: fixed
    title: "Digests of the previous text stay copyable while the displayed text has changed (and permanently after an engine error)"
  - id: WR-05
    severity: warning
    disposition: fixed
    title: "The global `/` shortcut fires for Ctrl/Cmd/Alt + `/`"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "Esc on empty text offers a pointless \"Restore your text\""
  - id: IN-02
    severity: info
    disposition: fixed
    title: "Verify shows \"Comparing...\" forever when hashing failed"
  - id: IN-03
    severity: info
    disposition: open
    title: "No-match hint talks about hex length for a Base64-shaped paste"
  - id: IN-04
    severity: info
    disposition: open
    title: "Redundant per-keystroke work and stale doc comments"
  - id: IN-05
    severity: info
    disposition: open
    title: "Meta description is long and the layout e2e polls with a fixed sleep"
open: 3
total: 10
recorded: 2026-10-15T18:26:58.973Z
---

# Phase 09: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | commit a8530e5 (09-REVIEW-FIX.md) |
| WR-02 | warning | fixed | commit c316d1b (09-REVIEW-FIX.md) |
| WR-03 | warning | fixed | commit 730c996 (09-REVIEW-FIX.md) |
| WR-04 | warning | fixed | commit 89ee8e7 (09-REVIEW-FIX.md) |
| WR-05 | warning | fixed | commit c90bd32 (09-REVIEW-FIX.md) |
| IN-01 | info | fixed | commit daee116 (09-REVIEW-FIX.md) |
| IN-02 | info | fixed | commit 7d69a04 (09-REVIEW-FIX.md) |
| IN-03 | info | open | deferred - low-impact info, left for a later cleanup pass |
| IN-04 | info | open | deferred - low-impact info, left for a later cleanup pass |
| IN-05 | info | open | deferred - low-impact info, left for a later cleanup pass |
