# Pitfalls Research

**Milestone:** Packetory v1.4 Text Diff
**Researched:** 2026-11-26
**Confidence:** High for documented browser behavior and repository boundaries. Medium for performance budgets and alignment heuristics pending representative benchmarks.

## Critical pitfalls

### Stale jobs repopulate results after Clear all

A slow result can arrive after a second comparison, an edit, navigation, or reset. Tie every result to a job ID and immutable submitted snapshot. Make reset invalidate the ID and clear both fields, output, summary, and errors in one transition. Restore focus to Original. If edits retain a prior result, label it stale and disable Copy diff until a current result exists. Packetory's Hash client already rejects stale worker messages by job ID. [Hash client](../../lib/hash/client.ts)

**Verify:** Deliver responses out of order in tests. Clear while a job runs, then deliver its response. Start a new comparison immediately and confirm it succeeds.

### Browser-only processing is broader than the algorithm

Comparison content can escape through share URLs, page submissions, app-managed storage, analytics payloads, copy telemetry, or exception messages. Pass snippets only through in-memory component state and worker messages. Render snippets as React text children, including when drawn as marked spans. Avoid HTML interpolation, automatic linking, and rich content processing. Keep generic errors free of snippets and fragments. Adapt the password route's boundary checks and retain site-level analytics redaction. [React DOM rendering guidance](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html) · [Analytics redaction](../../lib/analytics/redact.ts) · [Password boundary tests](../../app/tools/password/page-guards.test.ts)

**Verify:** Use synthetic sentinel text and inspect request URLs and bodies, browser URL, storage, and logs through compare and reset. Include HTML-shaped text and verify it renders literally.

### Partial or misleading comparisons

A line diff can represent a replacement as adjacent deletions and insertions. Pairing all rows by position may visually assert a relationship between unrelated lines, especially when a block grows or shrinks. Keep exact matching and source line numbering at the line layer. Highlight at the character layer only for plausibly paired replacements, with unpaired lines shown as additions or removals. Derive the summaries and responsive layouts from the same result. [jsdiff algorithms and options](https://github.com/kpdecker/jsdiff)

Browser textarea values normalize newline representations to LF. Define the comparison around that text model and preserve final line breaks, tabs, indentation, and trailing spaces in accepted input. If validation treats whitespace-only input as empty, validate with a derived value and compare the original text. Establish a deterministic policy for repeated lines and ensure both inputs can be reconstructed from unfurled result rows. [HTML Standard textarea value](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element)

**Verify:** Use repeated lines, unequal replacement blocks, inserted and removed blank lines, a missing final newline, tiny IP address edits, and emoji with combining or joined characters. Exercise split and unified renderers against the same fixtures.

## Performance and accessibility pitfalls

| Risk | Mitigation | Verification |
| --- | --- | --- |
| Expensive diff freezes the page | Run diffing in a dedicated worker when the route's performance plan calls for it. Bound raw input size and line count before dispatch, set a computation budget, and cap intraline work per row and per job. A worker processing a synchronous task cannot observe a queued cancellation message until it yields. Ignore superseded IDs and terminate/recreate if computation itself must stop. [jsdiff abortable options](https://github.com/kpdecker/jsdiff) · [HTML worker termination](https://html.spec.whatwg.org/multipage/workers.html#dom-worker-terminate) | Profile all-different and repeated content, very long individual lines, and over-limit input. Clear stays usable and timeout produces a clear message rather than an identical-result state. |
| Rendering blocks despite worker completion | Cap or progressively reveal rendered rows and intraline tokens. Folding unchanged context helps only when unchanged lines dominate. Verify an all-changed case separately. Keep exact numeric limits provisional until device and fixture benchmarks. | Use browser performance traces on narrow/low-power targets and record API-to-paint latency. Guard against silent truncation. |
| Split output requires page-wide horizontal scroll | Use a readable unified layout when space is limited. Contain overflowing text within the result and consider wrapping with preserved whitespace. Ensure wrapped split rows stay aligned, ideally through one shared row grid instead of independent scroll panes. [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Check at 320 CSS px, enlarged text, and with long unbroken JSON or URLs. |
| Color and visual layout carry essential meaning | Pair color with visible signs and accessible row labels. Give intraline differences a non-color cue. Expose concise result/error status without announcing the complete diff. Make reveal controls keyboard-operable if folding is included. [WCAG use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) · [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Check keyboard-only operation, contrast in both themes, and a screen-reader pass for results and reset. |

## Roadmap checks

1. Establish exact comparison behavior and boundaries with core fixtures before committing to result formatting.
2. Exercise Compare, Clear all, stale responses, labels, and both viewport layouts through the actual route.
3. Measure compute and rendering separately with representative configs, lengthy logs, a long single-line snippet, and a pathological all-changed pair.
