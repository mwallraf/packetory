# Architecture Research

**Domain:** Packetory v1.4 Text Diff

**Researched:** 2026-11-26

**Confidence:** High for repository integration and browser APIs. Medium for rendering and computation budgets pending production-build measurements.

## Recommended architecture

Use a static-first Next.js page at the proposed `/tools/diff` route and a small client component for the comparison workspace. Start a dedicated module worker on the first comparison. Keep the engine and library adapter in a framework-independent `lib/diff/` module reached through the worker. Reuse the Hash tool's worker construction pattern without depending on Hash's job protocol, URL state, or share links. Keep the input form prerenderable by creating the worker in an event handler rather than at module evaluation. [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) · [Webpack Web Workers](https://webpack.js.org/guides/web-workers/)

| Component | Responsibility | Repository integration |
|---|---|---|
| Page | Title and metadata, static copy, and public FAQ or worked example | Follow `app/tools/hash/page.tsx` and shared `components/ToolAbout.tsx` |
| Workspace | Own two controlled textareas, submit and keyboard path, Clear all, example, focus, and job state | New client component under `app/tools/diff/` |
| Worker client | Create the worker with a static `new Worker(new URL(..., import.meta.url))` expression, issue typed messages, handle errors and termination | Use `lib/hash/client.ts` as the reference |
| Diff engine | Compare lines, pair changed lines conservatively for inline highlights, return line numbers and typed segments | New pure logic reachable from the diff worker |
| Result | Project one result model to aligned desktop and unified mobile views | Render ordinary React text nodes and semantic addition/removal markers |
| Discovery | Expose the tool through the landing page, navigation, and sitemap | Add a tool entry in `tools/registry.ts` and use a registered icon in `components/ToolCard.tsx` |

## Data flow

1. Accept a comparison only when both fields have text. Check eligibility separately from preprocessing, so a blankness check cannot trim the content sent to the engine.
2. Snapshot both fields and send a request identifier with the text to the worker. Worker messages are copied or transferred within the browser. The same-origin worker bundle may be fetched on first use, while the snippets travel only through the browser's worker message channel. [MDN worker messaging](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage)
3. Normalize line endings only and run a bounded line-level comparison. Preserve indentation, trailing spaces, casing, internal blank lines, and final-newline distinctions. Spend a separate limited budget on inline highlights, with whole-line highlighting as the fallback. Represent a replacement as a presentation pairing over the edit script so unequal-sized runs and repeated lines can render without implying every deletion matches the next insertion.
4. Accept results and errors only for the active job and input revision. Clear all invalidates that job, terminates active computation, resets inputs and output, and focuses Original. Handle worker errors and timeouts with recoverable copy and retain the two texts for retry. Edits during an active comparison must never let an older result appear current. Termination works even when the worker is too busy to process a cancel message. [MDN worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
5. Render a single result model with responsive presentation. Include line numbers and signs or accessible text in addition to color. Preserve context around changes and expand collapsed unchanged runs from the same model, without recomputing the diff. If Copy diff enters scope, use the existing `lib/hooks/useCopyToClipboard.ts` hook and generate clipboard text from the full result model, independent of the screen layout and collapsed ranges.

## Privacy and performance boundaries

- Keep user input, result, and errors that could contain snippets in the component and worker. Avoid URL state, browser storage, analytics payloads, console output, and form submission to an endpoint. The app already mounts site analytics in `app/layout.tsx`. Verify the content boundary with a sentinel string in a production-mode browser test while allowing ordinary route and worker asset requests.
- Render arbitrary snippets as text with ordinary React interpolation. Keep static FAQ JSON-LD and metadata independent of comparison state. Include a literal-markup test using harmless sample tags.
- Gate input length and line count before copying strings to the worker. Cap engine time, per-line highlight effort, and mounted row/segment count independently. The worker only addresses computation. Structured cloning and a large DOM can still add work on the main thread. Benchmark repeated lines, large unrelated snippets, and a long single-line input on mobile hardware or a representative throttled browser.
- Verify a production `next build` and actual browser worker startup. The existing Hash pattern provides in-repository precedent, and the production smoke test confirms that the chosen bundler emits and serves the new worker chunk.

## Suggested build order

1. Define comparison semantics and result-model invariants, then implement and test the engine, cancellation, and resource limits against representative fixtures.
2. Wire the workspace and result presentation into the shared Packetory shell. Test clear while busy, stale replies, mobile layout, keyboard focus, identical inputs, and the production privacy boundary.
