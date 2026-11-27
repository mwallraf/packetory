# Project Research Summary

**Project:** Packetory v1.4 Text Diff

**Researched:** 2026-11-26

**Confidence:** High for documented browser behavior and repository integration. Medium for library fit, readability, and performance until tested with representative snippets.

## Executive Summary

Text Diff should start with two empty textareas labeled **Original** and **Modified**. **Compare** becomes available when both contain text. **Clear all** empties both fields, removes the result, invalidates active computation, and returns focus to Original. **Try an example** can demonstrate a changed value and a whole-line addition. File import is deferred. [Feature research](./FEATURES.md)

Desktop results should align and number the source lines, while narrow screens use one column. Both layouts should show additions and removals with clear signs and highlight the exact changes within related lines. Diffchecker's public text tool already offers a split view and browser comparison. Packetory can offer a shorter path from pasting a pair to spotting the edit and starting the next comparison. [Feature research](./FEATURES.md) · [Diffchecker](https://www.diffchecker.com/)

## Key Findings

- **Stack.** Prototype with `diff@9.0.0` (jsdiff) for line alignment and bounded character-level highlighting. Keep the existing Next.js, React, and Tailwind stack. [Stack research](./STACK.md)
- **Architecture.** Use a static-first tool route, a client workspace, and a dedicated module worker created on first comparison. Reuse the Hash worker construction pattern and the shared tool registry. Produce one canonical result model for both layouts. [Architecture research](./ARCHITECTURE.md)
- **Correctness and privacy.** Compare the text exactly within the browser's normalized newline model. Preserve indentation, trailing spaces, internal blank lines, and final-newline distinctions. Render snippets literally and keep comparison content and derived data out of requests, URLs, app-managed storage, telemetry, and logs. [Pitfalls research](./PITFALLS.md)
- **Responsiveness.** Bound input and output as well as engine work. Prefer whole-line emphasis when within-line detail exceeds its budget. Handle an incomplete line comparison as a recoverable error and retain the snippets for retry. Ignore stale replies after edits, clear, or another comparison. [Stack research](./STACK.md) · [Pitfalls research](./PITFALLS.md)

## Implications for Roadmap

1. **Comparison engine and browser worker.** Define newline and whitespace semantics, line numbering, replacement pairing, and a shared result model. Prove behavior with repeated lines, unequal replacement groups, indentation changes, final-newline changes, IP address edits, and long single-line input. Verify job cancellation and worker startup in a production build. Benchmark candidate compute and rendering limits before setting public limits.
2. **Text Diff workspace, results, and release verification.** Wire the paste-and-compare flow, Clear all, Try an example, and desktop and mobile presentation into the Packetory shell. Verify recognizable changes, keyboard focus and status announcements, theme contrast, errors and identical inputs, clear during computation, and a browser test that checks whether synthetic comparison text enters requests, URLs, app storage, or logs.

The engine and worker establish a result contract that both layouts can use. Page verification then covers the end-to-end workflow and the main thread cost of rendering. These are suggested phase boundaries for roadmap review.

## Gaps to Address

- Confirm what **Compare** should do when a field contains only whitespace. Preserve pasted whitespace in comparisons that are accepted.
- Measure limits and tune related-line matching using configs, repeated logs, long JSON, and a representative slower device. Check whether character-level highlights need grapheme-aware segmentation.
- Confirm whether v1.4 includes context folding, **Copy diff**, **Swap sides**, and a keyboard shortcut. Keep the core UI usable without those conveniences.

## Sources

- [Technology stack](./STACK.md) · [Feature landscape](./FEATURES.md) · [Architecture](./ARCHITECTURE.md) · [Pitfalls](./PITFALLS.md)
- [jsdiff v9 documentation](https://github.com/kpdecker/jsdiff/blob/v9.0.0/README.md) · [HTML Standard textarea behavior](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element) · [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
