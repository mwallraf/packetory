---
quick_id: 261017-f4s
status: complete
date: 2026-10-17
commits:
  - 94bf1d4
  - ab869bc
---

# Quick Task 261017-f4s: Fix PR #16 CI hash-layout failure and drop e2e job from CI

## Problem

PR #16's `e2e` job failed on `tests/e2e/hash-layout.spec.ts:24`: at 320px the
hash island measured 2286px on ubuntu vs the 2240px skeleton pin (measured on
macOS). Reproduced in `mcr.microsoft.com/playwright:v1.61.1-noble`.

Root cause: Linux Chromium rounds Geist Mono glyph advances (~9.6px -> 10px),
so the 128-char SHA-512 / SHA3-512 digests fit 25 chars per line instead of 26
and wrap to 6 lines instead of 5 (+48px).

## Changes

1. `94bf1d4` — `app/tools/hash/DigestRow.tsx`: digest span gets
   `[text-rendering:geometricPrecision]`, which keeps fractional advances on
   Linux. Linux island now 2237.9px, identical to macOS. Skeleton pins in
   `HashToolLoader.tsx` unchanged.
2. `ab869bc` — `.github/workflows/ci.yml`: `e2e` job removed (user decision,
   save GitHub Actions minutes; user explicitly approved after an auto-mode
   "CI Bypass" denial for the executor). `DEPLOY.md` §2–§4 updated: four CI
   jobs, e2e suites local-only. The `protect-main` ruleset requires only
   typecheck/lint/test/build, so no settings change was needed.

## Verification

With 94bf1d4 (local, macOS): typecheck, lint, unit tests, build pass; built
CSS contains the geometricPrecision rule; `test:e2e` 106/106;
`test:e2e:prod` 7/7. `hash-layout.spec.ts` 4/4 in the Linux container.
ab869bc touches only CI config and docs; the remaining jobs list parses as
typecheck, lint, test, build.
