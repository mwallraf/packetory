---
phase: "10"
slug: "shared-about-section-config-parity"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + Testing Library 16.3.2 (jsdom by default, `// @vitest-environment node` per file for data and source guards) and Playwright 1.61.1 (Chromium) |
| **Config file** | `vitest.config.ts` (includes `**/*.test.{ts,tsx}`, excludes `tests/e2e/**`); `playwright.config.ts` (`next dev` on :3000, `tests/e2e`); `playwright.prod.config.ts` (`next build` + `next start` on :3101, `tests/e2e-prod`: hash-worker.spec.ts, 7 tests, plus about-prod.spec.ts, 6 tests, added in 10-06-03, for 13 in total) |
| **Quick run command** | `npx vitest run <files touched by the task>` |
| **Full suite command** | `npm run typecheck && npm run lint && npm run test && npm run build && npm run test:e2e && npm run test:e2e:prod` (run in that order, never two e2e suites at once: they share `.next`) |
| **Estimated runtime** | ~5 s unit suite; ~30-120 s per targeted Playwright run (dev server start included); full gate ~8-12 min |

---

## Sampling Rate

- **After every task commit:** Run that task's `<automated>` commands (targeted `npx vitest run ...` and/or `npx playwright test <spec>`, plus `npm run typecheck` after any component or page edit)
- **After every plan wave:** Run `npm run test && npm run lint`; after wave 2 (10-04) also `npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green (10-06 Task 3)
- **Max feedback latency:** 60 seconds for unit-level tasks; 120 seconds for targeted e2e tasks

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | INFO-01, INFO-02, INFO-03, INFO-05 | T-10-01 / T-10-02 | UUID page keeps no raw-HTML prop; its one JSON-LD comes from the escaped shared serializer | e2e (tracer) | `npx playwright test tests/e2e/uuid-seo.spec.ts tests/e2e/uuid.spec.ts` | ✅ spec exists (edited); helper `tests/e2e/helpers/about.ts` created in this task | ✅ green |
| 10-01-02 | 01 | 1 | INFO-02, INFO-03 | T-10-01 / T-10-03 | `</script>` in FAQ text yields no "<" in the script body and round-trips; JSON-LD order equals visible order | unit | `npx vitest run lib/seo/jsonld.test.ts components/ToolAbout.test.tsx` | ❌ W0 (both files created in this task) | ✅ green |
| 10-02-01 | 02 | 1 | INFO-04 | T-10-04 | Enter on a summary never reaches the tool's enter handler (no stray DNS lookup) | unit (tracer, TDD) | `npx vitest run lib/hooks/useKeyboardShortcut.test.ts` | ✅ file exists (case added) | ✅ green |
| 10-02-02 | 02 | 1 | CFG-03 | T-10-05 | Unknown or prototype-key icon names throw; no substitute icon | unit (TDD) | `npx vitest run components/ToolCard.test.tsx tools/registry.test.ts` | ✅ files exist (cases added; fallback case replaced) | ✅ green |
| 10-02-03 | 02 | 1 | CFG-03 | T-10-06 | Explicit-ICONS test clause preserved in amended wording; SC-4 content gate plus an ede2221 diff of the other Phase 10 goal/requirement/criteria/research-flag lines (independent of unrelated working-tree edits) | docs grep | `grep -c 'icon on its landing card' .planning/REQUIREMENTS.md .planning/ROADMAP.md` | ✅ | ✅ green |
| 10-03-01 | 03 | 1 | CFG-01 | T-10-08 / T-10-10 | Example renders via React text children only; class map from a plain (non-client) module | unit (tracer, TDD) | `npx vitest run app/tools/config/ConfigExample.test.tsx app/tools/config/ConfigTool.test.tsx` | ❌ W0 (ConfigExample.test.tsx created in this task) | ✅ green |
| 10-03-02 | 03 | 1 | CFG-01, CFG-02 | T-10-07 / T-10-09 | Sample is RFC 5737-only (plus allow-listed masks/default route) with no secrets; privacy answer is "No." + the shipped footer sentence + the strip-secrets tip, with no other processing, location or storage claim in it or in the other answers | unit (TDD) | `npx vitest run app/tools/config/faq-data.test.ts` | ❌ W0 (created in this task) | ✅ green |
| 10-04-01 | 04 | 2 | CFG-01, CFG-02, INFO-01, INFO-02, INFO-03 | T-10-11 | /tools/config emits exactly one FAQPage script matching its visible FAQ | e2e (tracer) | `npx playwright test tests/e2e/config-seo.spec.ts tests/e2e/config.spec.ts` | ❌ W0 (config-seo.spec.ts created in this task) | ✅ green |
| 10-04-02 | 04 | 2 | INFO-01, INFO-02, INFO-03, INFO-05 | T-10-11 / T-10-12 | Subnet/DNS keep no raw-HTML prop; DNS privacy copy unchanged | e2e | `npx playwright test tests/e2e/subnet-seo.spec.ts tests/e2e/dns-seo.spec.ts tests/e2e/subnet.spec.ts tests/e2e/dns-lookup.spec.ts` | ✅ specs exist (edited) | ✅ green |
| 10-04-03 | 04 | 2 | INFO-01, INFO-02, INFO-03, INFO-05 | T-10-11 / T-10-13 | No duplicate worked-example testids after migration | e2e (targeted + full dev suite) | `npx playwright test tests/e2e/hash-seo.spec.ts tests/e2e/hash-layout.spec.ts tests/e2e/hash.spec.ts tests/e2e/mac-lookup.spec.ts && npm run test:e2e` | ✅ | ✅ green |
| 10-05-01 | 05 | 3 | INFO-01, INFO-02 | — | Tool renders first; About is main's last child; both disclosures closed on load and toggled natively by click, Enter and Space; Tab moves summary to summary | e2e (tracer) | `npx playwright test tests/e2e/about.spec.ts` | ❌ W0 (created in this task) | ✅ green |
| 10-05-02 | 05 | 3 | INFO-02, INFO-03, INFO-05 | T-10-14 | Only components/ToolAbout.tsx emits an ld+json script; only lib/seo/jsonld.ts builds FAQPage (repo-relative paths compared); JS-off server HTML holds the About section last and one FAQPage script matching the visible FAQ, asserted once in tests/e2e/helpers/about-parity.ts | unit + e2e | `npx vitest run app/tools/pages-about.test.ts && npx playwright test tests/e2e/about.spec.ts` | ❌ W0 (pages-about.test.ts and helpers/about-parity.ts created in this task; about.spec.ts extended) | ✅ green |
| 10-06-01 | 06 | 4 | INFO-04 | T-10-15 | Enter on the DNS FAQ summary sends no DoH request and UUID does not regenerate (positive controls included) | e2e (tracer) | `npx playwright test tests/e2e/about.spec.ts -g "INFO-04"` | ✅ (created in 10-05, extended here) | ✅ green |
| 10-06-02 | 06 | 4 | INFO-01 | — | At 320px in light and dark: the About section adds no horizontal overflow (section scrollWidth and right edge, not documentElement; hash also keeps its page-level check), no truncation, no clipping container around the summaries | e2e | `npx playwright test tests/e2e/about.spec.ts -g "320px"` | ✅ (extended here) | ✅ green |
| 10-06-03 | 06 | 4 | INFO-01..05, CFG-01..03 | T-10-16 / T-10-17 / T-10-SC | On the production build (`next start` :3101, JS off), all six pages' server HTML has the About section last, both disclosures closed with full text, and one FAQPage script matching the visible FAQ (about-prod.spec.ts, 6 tests via the shared helper); test:e2e:prod lists 13 tests (7 hash-worker + 6 about-prod) and passes all 13; no dependency added (`git diff --quiet ede2221 -- package.json package-lock.json`) | e2e (prod) + gate | `npx playwright test -c playwright.prod.config.ts --list && npm run typecheck && npm run lint && npm run test && npm run build && npm run test:e2e && npm run test:e2e:prod` | ❌ W0 (about-prod.spec.ts created in this task) | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0 plan: the frameworks are installed, and each new test file is created by the task that first needs it. Every task's `<automated>` command runs real tests, with no MISSING sentinels.

- [x] `tests/e2e/helpers/about.ts`: shared `openAbout` helper (created in 10-01-01; used by every SEO spec and about.spec.ts)
- [x] `lib/seo/jsonld.test.ts`: builder shape, order, `<` escape, round-trip, legacy byte-identity (10-01-02; INFO-03, INFO-05)
- [x] `components/ToolAbout.test.tsx`: closed on load, collapsed content in markup, count label, one script, two p per item (10-01-02; INFO-01/02/03)
- [x] `app/tools/config/ConfigExample.test.tsx`: server render of the highlighted sample (10-03-01; CFG-01)
- [x] `app/tools/config/faq-data.test.ts`: RFC 5737 allow-list, secret deny-list, token kinds, FAQ count/order/wording (10-03-02; CFG-01, CFG-02)
- [x] `tests/e2e/config-seo.spec.ts`: Config metadata, FAQ/JSON-LD parity, worked example, 320px pane scoped to the About section (10-04-01; CFG-01, CFG-02, SC-5)
- [x] `app/tools/pages-about.test.ts`: registry-driven structural guard (10-05-02; INFO-05)
- [x] `tests/e2e/helpers/about-parity.ts`: shared `expectServerAboutParity` JS-off structure and JSON-LD parity assertions (10-05-02; used by about.spec.ts and about-prod.spec.ts; INFO-01, INFO-02, INFO-03)
- [x] `tests/e2e/about.spec.ts`: cross-tool structure, toggles, Tab order (10-05-01) and JS-disabled parity (10-05-02); Enter-on-summary (10-06-01) and 320px layout (10-06-02) appended later (INFO-01..05)
- [x] `tests/e2e-prod/about-prod.spec.ts`: the same JS-off parity on the production build, 6 tests, run by `npm run test:e2e:prod` (10-06-03; SC-1, SC-2)
- [x] New cases in existing files: `lib/hooks/useKeyboardShortcut.test.ts` (10-02-01), `components/ToolCard.test.tsx` and `tools/registry.test.ts` (10-02-02)
- Framework install: none (milestone lock: no new runtime or dev dependencies)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Safari renders exactly one chevron per summary (native marker hidden), the chevron rotates when open, and Enter/Space toggle | INFO-02 (RESEARCH A3) | The Playwright project is Chromium-only; `display:flex` on summary plus the two marker-hiding rules was not tested in Safari | In Safari on macOS, open /tools/uuid and /tools/config. Check that each summary shows one chevron and no native triangle. Click, Enter and Space each toggle it, and the chevron turns 90 degrees when open. |
| VoiceOver announces each summary as a collapsed or expanded disclosure and reads the FAQ content when open | INFO-02 | Screen-reader output is not automatable in this toolchain | With VoiceOver on (Cmd+F5) in Safari, Tab to "Worked example" and "FAQ (N questions)". Check that each is announced with its collapsed state, that VO+Space expands it, and that the content is then read. |
| CLS after the About change is re-measured and reported (not gated) | none in this phase; feeds PREG-03 (Phase 14) (RESEARCH A5, resolved by D-18) | D-18 (user-approved 2026-11-11): the CLAUDE.md "no avoidable CLS" gate is deferred to Phase 14, which owns Lighthouse/CLS; the baseline already has non-zero CLS, so Phase 10 re-measures and reports only | Run `npm run build && npm run start`. Measure layout-shift CLS for each /tools/* page at 375x800 and 1280x800 after 1.5 s. Compare with the RESEARCH Pitfall 7 baseline: uuid 0.183/0.043, subnet 0.167/0.029, dns 0.100/0.042, mac 0.067/0.020, hash 0/0, config 0/0. Record the numbers in 10-06-SUMMARY.md and flag any regression for Phase 11/14. |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s per task
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-11 (automated gate green; human checks queued for /gsd-verify-work)
