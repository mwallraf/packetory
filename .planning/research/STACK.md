# Technology Stack

**Project:** Packetory v1.4 Text Diff
**Researched:** 2026-11-26
**Confidence:** Medium for candidate APIs and integration recommendations. Performance limits require measurement on target browsers.

## Recommended stack

| Technology | Version | Purpose | Rationale |
|---|---|---|---|
| Existing Next.js App Router, React, TypeScript, and Tailwind | Repo pins Next 16.2.11, React 19.2.8, TypeScript 6.0.3, Tailwind 4.3.3 | Static tool shell with an interactive client component | The existing UI and registry already support browser-only tools. [Package manifest](../../package.json) |
| jsdiff, published as `diff` | 9.0.0, npm latest checked 2026-11-26 | Line alignment and within-line highlights | One library covers both granularities. It ships ESM exports and TypeScript declarations, has no runtime dependencies, and declares BSD-3-Clause. [npm versions](https://www.npmjs.com/package/diff?activeTab=versions) · [Tagged package manifest](https://raw.githubusercontent.com/kpdecker/jsdiff/v9.0.0/package.json) · [Tagged README](https://github.com/kpdecker/jsdiff/blob/v9.0.0/README.md) |
| Browser Web Worker | Native API | Run bounded comparison work outside the UI thread | The Hash tool already uses a dedicated worker and a message contract. Follow that pattern for job IDs and failure handling. [Hash worker](../../lib/hash/hash.worker.ts) · [Hash client](../../lib/hash/client.ts) |
| Native textareas and React-rendered result rows | Existing UI primitives | Paste, edit and inspect text | The same comparison model can drive aligned desktop rows and a single-column mobile view with Packetory styling. |

## Engine and integration

1. Normalize CRLF to LF once while preserving other whitespace. Decide how to show a missing terminal newline and cover it in fixtures. jsdiff offers different end-of-line options, so choose explicit semantics before relying on defaults. [jsdiff line options](https://github.com/kpdecker/jsdiff/blob/v9.0.0/README.md)
2. Start with `diffLines` for line alignment and `diffChars` for small, plausibly related replacement lines. If trailing-newline handling is easier to express with explicit tokens, use `diffArrays` over a line representation. The package compares Unicode code points with `diffChars`. If splitting grapheme clusters produces confusing results, test a grapheme-aware `diffArrays` pass with `Intl.Segmenter`. [jsdiff API and tokenization](https://github.com/kpdecker/jsdiff/blob/v9.0.0/README.md)
3. Give the entire operation one budget across line comparison and within-line annotation. Per-call `timeout` and `maxEditLength` help bound engine work, but do not bound result construction or DOM rendering. If detail exceeds its budget, keep whole-line changes. If line alignment exceeds the supported limit, give a clear message while preserving both snippets. Benchmark repeated logs, dissimilar multiline inputs, large equal sections, and single-line JSON before publishing limits. [jsdiff abortable API](https://github.com/kpdecker/jsdiff/blob/v9.0.0/README.md)
4. Import only the selected functions in the worker entry graph and verify the production build serves the worker chunk. Gate the result on the active job ID and invalidate that ID on Clear all, a newer comparison, or unmount. Test the package and worker with existing Vitest and Playwright tooling before depending on production bundling. [Hash client](../../lib/hash/client.ts) · [Package manifest](../../package.json)

## Alternatives considered

| Alternative | When it fits | Decision for v1.4 |
|---|---|---|
| `@codemirror/merge` | Rich editing, side-by-side and unified merge editors, and configurable collapsed regions | Prefer native textareas and a custom read-only result for Packetory's paste-and-compare flow. Revisit an editor library if editing the result becomes a product requirement. [CodeMirror merge](https://github.com/codemirror/merge) |
| `fast-diff` | String-level change tuples | Prefer jsdiff's line and character primitives. A string-only engine would need an additional line-alignment layer. [fast-diff README](https://github.com/jhchen/fast-diff) |
| Google's Diff Match Patch | General-purpose text diff, match, and patch | Its upstream repository was archived in 2024. jsdiff supplies the required line-first primitives directly. [Diff Match Patch archive](https://github.com/google/diff-match-patch) |
| Custom Myers implementation | Specialized algorithm control | jsdiff already handles common diff cases. Spend implementation effort on human-readable line pairing, safe rendering, and responsive results. [jsdiff algorithm notes](https://github.com/kpdecker/jsdiff/blob/v9.0.0/README.md) |

## Dependency change for implementation

Install the exact version after the implementation plan approves it. Keep the existing test tools and browser-only infrastructure.

```bash
npm install --save-exact diff@9.0.0
```
