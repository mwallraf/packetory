# Feature Research

**Domain:** Browser-based text comparison for Packetory v1.4
**Researched:** 2026-11-26
**Confidence:** Medium. Product and accessibility patterns are documented by their maintainers. Packetory's proposed defaults still need usability and accessibility checks with real snippets.

## What existing tools establish

| Reference | Documented behavior | Implication for Packetory |
| --- | --- | --- |
| [Diffchecker](https://www.diffchecker.com/) | Two text inputs, split results, intraline precision, and controls for unchanged text. Its product extends into saving, merging, and document comparison. Its text comparison FAQ describes browser-side calculation. | Keep the familiar original-to-modified direction and invest in readable output. Browser-side calculation is table stakes. Content stays ephemeral by design. |
| [GitHub pull request review](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request) | Unified and split formats, with optional whitespace filtering. | Both result layouts will feel familiar. Keep whitespace visible by default because indentation and spacing may be meaningful. |
| [VS Code diff editor](https://code.visualstudio.com/docs/sourcecontrol/staging-commits) | Automatic inline layout at narrow widths and collapsible unchanged regions. | Use available width to select a layout. Consider retaining context around changes and expanding unchanged text on demand. |

## Confirmed milestone scope

| Capability | Recommended behavior | Relative effort |
| --- | --- | --- |
| Paste and compare | Start with labeled Original and Modified textareas. Enable Compare only when both contain text. Treat whitespace-only submissions as an open edge case. Preserve whitespace in accepted snippets. | Low |
| Reset | Clear all empties both inputs, clears the result, and returns focus to Original. A pending comparison must be invalidated as part of reset. | Low |
| Example | Offer Try an example in the empty state. Use a short, fictitious configuration with a one-digit value edit and a whole-line addition. Preload the pair and its result for a quick demonstration. | Low |
| Read changes | Display aligned, numbered lines on desktop and one column at narrow widths. Use clear additions and removals, with word or character emphasis for paired changed lines. Preserve the mapping back to source line numbers. | Medium |
| Privacy | Keep compared text and derived results in browser memory. Exclude content from URLs, app-managed storage, telemetry, logs, and network requests. | Medium |

## Recommended details for scope confirmation

- Use a concise result summary and a clear identical state. Announce result or error status without forcing screen-reader users to move focus or listening to every diff row. [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- Pair change backgrounds with visible signs and accessible change labels. Give intraline emphasis a non-color cue such as underlining or strikethrough with sufficient contrast. [WCAG use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- While inputs change, retain the current result only with a visible out-of-date indicator, or clear it immediately. Let Ctrl/Command+Enter trigger Compare from the input area without overriding normal paste, selection, or IME behavior.
- Consider folding long unchanged regions after the basic result works. Show the number of hidden lines, preserve nearby context, and use a keyboard-operable reveal control. Validate long lines and enlarged text on a narrow viewport. [VS Code diff editor](https://code.visualstudio.com/docs/sourcecontrol/staging-commits) · [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- Consider Copy diff as the single result action if the format is easy to explain. Copy the full current comparison even with context folded, and provide confirmation. Swap sides is a lower-priority convenience.
- Verify repeated config lines, single-digit IP changes, tab/space differences, final newlines, lengthy JSON lines, and small screens. These fixtures will inform intraline pairing, wrapping, and the size limit.

## Deferred features

| Feature | Rationale |
| --- | --- |
| Local file picker and drag-and-drop | The user confirmed paste as the primary use case and file import is outside v1.4. |
| Whitespace and case options | Measure demand first. Exact comparison with a documented line-ending policy preserves useful signal. |
| Save, share, history, merge, document formats, syntax modes | These add controls, dependencies, or persistence beyond the two-snippet review flow. |

## Roadmap implications

Prove the aligned line model and readable intraline output with config and log fixtures before wiring the full route. The page can then share that model between desktop and mobile, with reset, status, example, and privacy checks in the same user journey. Test keyboard behavior and light/dark readability before release. Treat folding and copy as candidates until scope is confirmed.
