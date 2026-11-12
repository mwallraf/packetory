---
phase: 09-hash-tool-page-text-hashing
plan: 08
subsystem: ui
tags: [hash, seo, faq, json-ld, worked-example, playwright, vitest]
status: complete
requires:
  - phase: 09-hash-tool-page-text-hashing
    provides: "09-01 page metadata and lib/hash/sample.ts; 09-03 page shell"
provides:
  - "app/tools/hash/faq-data.ts: FaqItem, faqItems (5 items), ECHO_HELLO_WORLD_SHA256"
  - "/tools/hash FAQ section plus FAQPage JSON-LD generated from the same faqItems array"
  - "/tools/hash worked example (hello world SHA-256, printf vs echo) built from SAMPLE_DIGEST_HEX"
  - "Root layout description lists the hash generator"
  - "tests/e2e/hash-seo.spec.ts: metadata, query-free canonical, worked example, FAQ/JSON-LD parity"
affects: [09-09]
actuals:
  tokens: 7500
  tasks: 2
  commits: 4
plan_head_before: fde24530aaf878f03efe547086ae757bac8da50e
plan_head_after: 0435e7f381339b53fde80e53e76fc0dc563c2d25
tech-stack:
  added: []
  patterns:
    - "One faqItems array feeds both the visible FAQ and the FAQPage JSON-LD (MAC/DNS pattern), with the less-than sign escaped"
    - "Worked-example digest is read from SAMPLE_DIGEST_HEX, never hand-typed in the page"
    - "D-27 wording guarded by an exact-equality test on the 'where' answer plus a forbidden-phrase scan"
key-files:
  created:
    - app/tools/hash/faq-data.ts
    - app/tools/hash/faq-data.test.ts
    - tests/e2e/hash-seo.spec.ts
  modified:
    - app/tools/hash/page.tsx
    - app/layout.tsx
key-decisions:
  - "The privacy-adjacent FAQ answer is exactly 'Hashing runs in your browser. If you use Copy link, the link contains your text.' and nothing more (D-27)"
  - "Digest lines in the worked example use whitespace-pre-wrap so the two-space sha256sum separator survives HTML whitespace collapsing"
requirements-completed: [INTG-02]
coverage:
  - id: D1
    description: "Five-item FAQ whose FAQPage JSON-LD is text-identical to the visible FAQ"
    requirement: INTG-02
    verification:
      - kind: unit
        ref: "app/tools/hash/faq-data.test.ts#covers the five required topics in order"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-seo.spec.ts#FAQ is present and the FAQPage JSON-LD matches it exactly"
        status: pass
    human_judgment: false
  - id: D2
    description: "Worked example from pinned sample constants explaining echo vs printf, no horizontal overflow at 320px"
    requirement: INTG-02
    verification:
      - kind: unit
        ref: "app/tools/hash/faq-data.test.ts#ECHO_HELLO_WORLD_SHA256"
        status: pass
      - kind: e2e
        ref: "tests/e2e/hash-seo.spec.ts#worked example shows the pinned digests and the echo difference"
        status: pass
    human_judgment: false
  - id: D3
    description: "Unique title/description, one query-free canonical (also with ?text=), og tags, root description refresh"
    requirement: INTG-02
    verification:
      - kind: e2e
        ref: "tests/e2e/hash-seo.spec.ts#canonical has no query string when opened with ?text="
        status: pass
    human_judgment: false
  - id: D4
    description: "D-27 wording limit: no privacy/legal claims beyond the two approved statements"
    requirement: INTG-02
    verification:
      - kind: unit
        ref: "app/tools/hash/faq-data.test.ts#limits the 'where' answer to exactly the two approved D-27 statements"
        status: pass
    human_judgment: true
    rationale: "Descriptor-less prohibition; automated forbidden-phrase and exact-equality checks support but do not replace judgment review"
---

# Phase 9 Plan 08: Hash page SEO, FAQ and worked example Summary

**/tools/hash gains a five-item FAQ with FAQPage JSON-LD generated from the same array, a worked example built from the pinned sample constants (including the echo-appends-newline digest), query-free canonical metadata e2e, and a root description listing the hash generator.**

## Performance

- **Tasks:** 2 (1 tracer + 1 auto, both TDD)
- **Files:** 5 (3 created, 2 modified)
- **Commits:** 4 (2 RED test commits, 2 GREEN feature commits)

## Accomplishments

- Tracer: `faqItems` module renders both the visible FAQ and the FAQPage JSON-LD; Playwright proves the question/answer texts are identical per index.
- Worked example uses `SAMPLE_TEXT` and `SAMPLE_DIGEST_HEX.sha256`; `ECHO_HELLO_WORLD_SHA256` is pinned against `node:crypto`.
- Metadata e2e asserts title, description (no "tracking"), exactly one canonical with no query string even for `?text=secret`, and the og tags.
- Root layout description now ends "MAC address inspector, and hash generator."

## Task Commits

1. Task 1 RED: `dd40a5a` test(09-08) FAQ/D-27/JSON-LD contract
2. Task 1 GREEN: `9273664` feat(09-08) FAQ and FAQPage JSON-LD from one source
3. Task 2 RED: `855fd07` test(09-08) worked example, metadata and echo pin
4. Task 2 GREEN: `0435e7f` feat(09-08) worked example and root description

## Deviations from Plan

None - plan executed exactly as written. (Minor implementation detail: `whitespace-pre-wrap` added to the `sha256sum` output lines so the double-space separator renders; not a behavior deviation.)

## Verification

- `npx vitest run app/tools/hash/faq-data.test.ts`: 9 passed; full suite 45 files / 632 tests passed.
- `npx playwright test tests/e2e/hash-seo.spec.ts`: 6 passed.
- `npm run typecheck` clean; `npx eslint` on touched files clean; `npm run lint` only a pre-existing unrelated warning in `lib/mac/vendor.ts`.
- `git diff --quiet` on app/privacy, SiteHeader, MobileNav, app/sitemap.ts, lib/analytics/redact.ts, package.json, package-lock.json: clean.
- `grep -c "b94d27b9934d3e08" app/tools/hash/page.tsx` = 0; `grep -c "hash generator" app/layout.tsx` = 1.

## Known Stubs

None.

## Threat Flags

None. T-09-08 (escaped JSON-LD), T-09-09 (D-27 guard) and T-09-10 (static canonical, asserted with `?text=`) are mitigated as planned; no package installs.

## Self-Check: PASSED

Created files exist (faq-data.ts, faq-data.test.ts, hash-seo.spec.ts); commits dd40a5a, 9273664, 855fd07, 0435e7f are ancestors of HEAD.
