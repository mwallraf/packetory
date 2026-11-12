# Phase 9: Hash Tool Page & Text Hashing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-15
**Phase:** 09-hash-tool-page-text-hashing
**Mode:** `--auto` — no user prompts; recommended option selected for each area.
**Areas discussed:** Sample & first paint, Live update strategy, Text soft cap, Output encoding control, Copy-all formats, Verify box behavior, Copy link cap, Keyboard bindings

---

[auto] Sample & first paint — Q: "Default input?" → Selected: "`hello world`, precomputed digests" (alternatives: empty input; `The quick brown fox…`)
[auto] Live update strategy — Q: "Debounce typing?" → Selected: "No debounce, worker supersede, keep previous digests until new result" (alternatives: fixed debounce; sync main-thread hashing below threshold)
[auto] Text soft cap — Q: "Where to warn?" → Selected: "1 MiB non-blocking warning" (alternatives: 5 MiB; hard cap)
[auto] Output encoding control — Q: "Case + Base64 controls?" → Selected: "One 3-way toggle hex / HEX / Base64, CRC32 stays hex" (alternatives: separate case toggle + encoding select)
[auto] Copy-all formats — Q: "Which formats?" → Selected: "Labeled list (default) + checksum lines (lowercase hex, `# LABEL` + `<hash>  -`)" (alternatives: add JSON; checksum lines only for coreutils algorithms)
[auto] Verify box behavior — Q: "How to show matches?" → Selected: "Highlight every matching row with MATCH badge, clear No match state, length hint, aria-live" (alternatives: single best match; color-only)
[auto] Copy link cap — Q: "Length cap?" → Selected: "2,000 encoded chars, disabled + hint above" (alternatives: 1 KB; 8 KB)
[auto] Keyboard bindings — Q: "Shortcuts?" → Selected: "`/` focus+select, `Esc` cancel+restore sample, Ctrl/Cmd+C copies SHA-256, Enter unbound" (alternatives: Ctrl+Enter copy)

## Claude's Discretion

Layout details, skeleton height, debounce above soft cap, sample-digest storage format, component split.

## Deferred Ideas

SRI format (OUT-06), input encodings (ENC-01), newline toggle (ENC-02), HMAC, JSON copy-all, verify diff highlighting.
