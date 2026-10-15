# Phase 9: Hash Tool Page & Text Hashing - Context

**Gathered:** 2026-10-15
**Status:** Ready for planning
**Mode:** `--auto` (yolo chain) — every gray area resolved with the recommended default; review before planning if any choice looks wrong.

<domain>
## Phase Boundary

Ship `/tools/hash` as a complete **text-only** Hash Generator on top of the Phase 8 worker runtime: registry entry (nav, landing grid, sitemap), sample digests on load, live typing, per-row and copy-all output, output-encoding toggle, paste-to-verify, inline security labels, `?text=` restore and explicit "Copy link", keyboard shortcuts, SEO/FAQ, 320px + dark mode.

Requirements: TEXT-01..04, OUT-01..05, INT-01, INT-03, INTG-01, INTG-02.

**Not in this phase:** file input / drag-drop / progress (Phase 10, FILE-01..04), the full INT-02 supersede audit across file paths (Phase 10), the zero-third-party-request e2e and fragment redaction (INTG-03, Phase 10), Lighthouse/prod e2e release gate (INTG-04, Phase 10).

</domain>

<decisions>
## Implementation Decisions

### Page shell & first paint (TEXT-01)
- **D-01:** Copy the established Server-shell + Client-island split: `app/tools/hash/page.tsx` (static server shell, metadata, FAQ, JSON-LD) + `HashToolLoader.tsx` (`"use client"`, `next/dynamic(..., { ssr: false })`, fixed-height skeleton) + `HashTool.tsx`. Same as `app/tools/mac/MacToolLoader.tsx`.
- **D-02:** Sample input is `hello world` (no trailing newline). Its 10 digests are **precomputed constants** (`sampleDigests`, stored as bytes or hex in a small module) rendered immediately, so the first paint never waits for the worker. A unit test recomputes them through `lib/hash` and pins them.
- **D-03:** Focusing the textarea while it still holds the untouched sample selects all, so the first keystroke replaces the sample (same demo-on-load feel as the other tools).
- **D-04:** Empty input is valid: it shows the empty-string digests with a small "empty input" note, never blank rows or an error.

### Live hashing (TEXT-02)
- **D-05:** All text hashing goes through the Phase 8 `HashClient` (`lib/hash/client.ts`); each input change calls `start()` which supersedes the in-flight job. Results are applied only for the latest request (the client's supersede + a request sequence check in the component), so a slower older result can never overwrite a newer one.
- **D-06:** No debounce for normal input; previous digests stay visible until the new result lands (no flicker or empty rows between keystrokes). A short debounce (~150 ms) is allowed only above the soft-cap threshold in D-07 — planner's discretion on exact value.
- **D-07:** Text-mode soft cap = **1 MiB** of UTF-8. Above it, a non-blocking inline warning suggests file mode; hashing still runs. No hard cap in this phase.

### Byte count & newline hint (TEXT-03)
- **D-08:** Show `N bytes (UTF-8)` next to the input, computed with `TextEncoder` (same bytes the worker hashes).
- **D-09:** One static hint line: the textarea hashes exactly what is typed (no trailing newline); `echo` adds `\n` so use `printf '%s'` or `echo -n` to match; pasted CRLF line endings become LF in a textarea. Full explanation lives in the FAQ.

### Output rows & encoding (OUT-01, OUT-03, OUT-05)
- **D-10:** Rows render in `ALGORITHMS` order from `lib/hash/algorithms.ts` (single source of truth). SHA-256 is the **primary** digest: visually emphasized and the target of the copy shortcut.
- **D-11:** One 3-way toggle (reuse `components/ui/toggle-group.tsx`): `hex` / `HEX` / `Base64`, default lowercase hex. Toggling only reformats stored bytes via `lib/hash/format.ts` (extend it with uppercase/Base64 helpers); it never re-hashes. CRC32 always stays hex (lower or upper follows the case choice; Base64 does not apply to it).
- **D-12:** Each row has a copy button using `useCopyToClipboard` with the existing visible confirmation pattern. Copy copies the digest exactly as displayed.
- **D-13:** MD5, SHA-1 and CRC32 get an inline badge driven by `notForSecurity` in `algorithms.ts`: MD5/SHA-1 "Not for security", CRC32 "Error detection only". Text, not color alone; no modal or tooltip-only content.
- **D-14:** Long digests wrap (`break-all`/monospace) at 320px; no horizontal scroll (INT-03).

### Copy all (OUT-02)
- **D-15:** Two copy-all formats: **Labeled list** (default; `SHA-256: <digest>` per line in the current display encoding) and **Checksum lines**. No CSV or JSON in this phase.
- **D-16:** Checksum format always uses lowercase hex regardless of the display toggle (what coreutils prints), one `<hash>  -` line (two spaces, `-` for text) per algorithm, each preceded by a `# <LABEL>` comment line so the 10 lines are unambiguous.

### Paste-to-verify (OUT-04)
- **D-17:** A single "Expected checksum" input between the textarea and the rows. Normalize: trim, strip a `<algo>:` prefix (e.g. `sha256:`), take the first token of a `sha256sum` line, remove whitespace/colons/dashes, compare case-insensitively against every row's hex; also compare against each row's Base64.
- **D-18:** Every matching row is highlighted with a MATCH badge (icon + text). A non-empty value that matches nothing shows a clear "No match" state; a wrong-length or non-hex value adds a hint with expected lengths (8/32/40/56/64/96/128 hex), as a hint, not a red error. Result is announced via `aria-live`. Plain string equality (no constant-time compare).
- **D-19:** The verify value re-evaluates whenever digests change (typing) and is cleared by `Esc`.

### URL state (TEXT-04)
- **D-20:** On load, read `?text=` once and use it as the input instead of the sample. The address bar is **never** written while typing.
- **D-21:** An explicit "Copy link" button builds `/tools/hash?text=<encoded>` and copies it with the standard confirmation. It is disabled with a hint when the encoded text exceeds **2,000 characters**. A one-line notice says the link contains the typed text.
- **D-22:** `text` is never added to the analytics allow-list; add a `?text=`-stripped regression test to `lib/analytics/redact.test.ts`. `redact.ts` itself is not modified.

### Keyboard (INT-01)
- **D-23:** Use `useKeyboardShortcut` with `slash` (focus textarea and select all), `escape` (cancel in-flight job, restore sample, clear verify box) and `copy` (Ctrl/Cmd+C outside editable fields copies SHA-256 with confirmation). `enter` stays **unbound** so it inserts newlines.
- **D-24:** Textarea attributes: `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="off"`, `autoComplete="off"`, and password-manager ignore attributes (`data-1p-ignore`, `data-lpignore="true"`, `data-form-type="other"`).

### Registry & SEO (INTG-01, INTG-02)
- **D-25:** One `tools/registry.ts` entry: slug `hash`, name "Hash Generator", category `encode`, icon `Hash`, `status: "active"`, `clientOnly: true`. Add `Hash` to `ICONS` in `components/ToolCard.tsx` (a missing entry silently falls back to the UUID icon). Update the hard-coded 4-tool tests to 5: `tools/registry.test.ts`, `app/sitemap.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/navigation.spec.ts`. Nav and sitemap code are not edited directly; they derive from the registry.
- **D-26:** Page has unique title, meta description, canonical, OG tags; a worked example (`hello world` → SHA-256, plus the `echo` vs `printf` difference); FAQ in `app/tools/hash/faq-data.ts` (pattern from other tools) covering SHA3 vs Keccak-256, `echo` vs `echo -n`, MD5/SHA-1 security, a match is not authenticity, and that hashing runs in the browser. FAQPage JSON-LD is generated from the same data so content always matches.
- **D-27:** Privacy page and any new privacy/legal wording are **not** changed in this phase; any wording that implies a privacy claim beyond "runs in your browser" needs human approval.

### Claude's Discretion
- Exact layout (verify box placement relative to toggle/copy-all controls), skeleton height, debounce value above soft cap, sample-digest storage format, component split inside `HashTool.tsx`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope & requirements
- `.planning/ROADMAP.md` § Phase 9 — goal, success criteria, research flags
- `.planning/REQUIREMENTS.md` — TEXT-01..04, OUT-01..05, INT-01, INT-03, INTG-01, INTG-02 (and Future/Out of Scope lists)
- `.planning/PROJECT.md` — UX non-negotiables, privacy constraints, Key Decisions (incl. raw-bytes client decision from Phase 8)

### Domain research (v1.2)
- `.planning/research/FEATURES.md` — verify-box normalization, copy formats, keyboard fit, edge cases (echo/CRLF, empty input, equal-length algorithms)
- `.planning/research/PITFALLS.md` — known traps for the hash tool
- `.planning/research/ARCHITECTURE.md` — component/worker structure
- `.planning/research/SUMMARY.md` — synthesized v1.2 recommendations

### Phase 8 runtime (built, verified)
- `.planning/phases/08-hash-core-worker-runtime/08-VERIFICATION.md` — what the runtime guarantees
- `lib/hash/client.ts` — `createHashClient`, `HashOutcome` (raw `Uint8Array` digests), supersede/cancel
- `lib/hash/algorithms.ts` — `ALGORITHMS` order, labels, `notForSecurity`
- `lib/hash/format.ts` — hex formatting (extend for UPPER/Base64)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/tools/mac/MacToolLoader.tsx` / `page.tsx` / `faq-data.ts`: loader + skeleton + FAQ/JSON-LD pattern to copy
- `lib/hooks/useCopyToClipboard.ts`: per-row, copy-all, copy-link confirmation
- `lib/hooks/useKeyboardShortcut.ts`: `slash` / `escape` / `copy`; `copy` already skips editable targets
- `components/ui/toggle-group.tsx`: encoding toggle and copy-all format toggle (UUID tool uses the same pattern)
- `components/ui/badge.tsx`: security and MATCH badges
- `lib/hash/*`: worker client, algorithms metadata, formatting

### Established Patterns
- Server shell + `ssr:false` client island with a fixed-height skeleton (no CLS)
- Registry is the single source for nav/landing/sitemap (SHELL-04)
- Analytics redaction is allow-list only; tools never add free-text params
- Every superseding async path cancels its predecessor (Phase 4/5 lesson)

### Integration Points
- `tools/registry.ts` (+ 4 hard-coded count tests), `components/ToolCard.tsx` `ICONS`
- `lib/analytics/redact.test.ts` (new `?text=` regression case)
- `app/hash-smoke/` stays as the Phase 8 test harness; it is not the user-facing page

</code_context>

<specifics>
## Specific Ideas

- Sample `hello world`; SHA-256 is the headline digest.
- Checksum copy format mirrors `sha256sum` stdin output (`<hash>  -`).
- UAT note from Phase 8: in the browser console the client returns bytes; the UI must always format via `lib/hash/format.ts`.

</specifics>

<deferred>
## Deferred Ideas

- SRI copy format `sha384-…` (OUT-06, Future)
- Input encoding Hex/Base64 (ENC-01) and append-newline / CRLF toggle (ENC-02), Future
- HMAC (HMAC-01), Future
- JSON copy-all format — not required by OUT-02; revisit if requested
- Character-level diff highlighting in the verify box — nice-to-have

</deferred>

---

*Phase: 09-hash-tool-page-text-hashing*
*Context gathered: 2026-10-15 (auto mode)*
