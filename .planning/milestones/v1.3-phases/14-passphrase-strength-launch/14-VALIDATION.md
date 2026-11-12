---
phase: "14"
slug: "passphrase-strength-launch"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
validated: "2026-11-12"
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + Testing Library (jsdom) + fast-check; Playwright (dev :3000, prod :3101) |
| **Config file** | vitest.config.ts, playwright.config.ts, playwright.prod.config.ts |
| **Quick run command** | `npx vitest run app/tools/password lib/password` |
| **Full suite command** | `npm test && npm run test:e2e && npm run test:e2e:prod` |
| **Estimated runtime** | ~4s quick; several minutes full |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Before `/gsd-verify-work`:** Full suite must be green (vitest 1440, e2e 246, e2e:prod 22)
- **Max feedback latency:** 14 seconds (quick)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | PHR-01, PHR-03 | Word list not in initial JS; lazy load | unit + e2e | `npx vitest run app/tools/password` / `npx playwright test tests/e2e/password-passphrase.spec.ts` | ✅ | ✅ green |
| 14-01-02 | 01 | 1 | PHR-03 | Unmodified 7,776-word list served; boundaries | unit + e2e:prod | `npx vitest run lib/password/boundaries.test.ts app/tools/password/page-guards.test.ts` / `npx playwright test -c playwright.prod.config.ts password-wordlist` | ✅ | ✅ green |
| 14-02-01 | 02 | 1 | PREG-02, PHR-04 | FAQ numbers from lib/password constants; 4 hyphenated words | unit | `npx vitest run app/tools/password/faq-data.test.ts app/tools/password/page-guards.test.ts` | ✅ | ✅ green |
| 14-02-02 | 02 | 1 | PREG-02 | Unique metadata, worked example, SSR | e2e + e2e:prod | `npx playwright test tests/e2e/password-seo.spec.ts` / `-c playwright.prod.config.ts password-ssr` | ✅ | ✅ green |
| 14-03-01 | 03 | 2 | PHR-01, PHR-02 | Default 6 words, `-`; options 3–20, separators, caps, number | unit + e2e | `npx vitest run app/tools/password` / `npx playwright test tests/e2e/password-passphrase.spec.ts tests/e2e/password-url.spec.ts` | ✅ | ✅ green |
| 14-03-02 | 03 | 2 | PHR-03 | Load failure → error + Retry, no value/controls, no fallback list | unit + e2e:prod | `npx vitest run app/tools/password/PasswordTool.passphrase.test.tsx` / `-c playwright.prod.config.ts password-wordlist` | ✅ | ✅ green |
| 14-04-01 | 04 | 2 | STR-01..04 | Meter thresholds, pool · bits line, crack time + stated rate, fast/slow switch | unit | `npx vitest run app/tools/password/StrengthPanel.test.tsx` | ✅ | ✅ green |
| 14-04-02 | 04 | 2 | STR-01 | Stable across Regenerate (settings-derived) | unit + e2e | `npx vitest run app/tools/password/PasswordTool.strength.test.tsx` / `npx playwright test tests/e2e/password-strength.spec.ts` | ✅ | ✅ green |
| 14-05-01 | 05 | 3 | PHR-01, PHR-02 | Mode toggle / options keyboard + URL state | unit | `npx vitest run app/tools/password` | ✅ | ✅ green |
| 14-05-02 | 05 | 3 | PHR-01 | Keyboard/URL e2e both modes | e2e | `npx playwright test tests/e2e/password-keyboard.spec.ts tests/e2e/password-url.spec.ts` | ✅ | ✅ green |
| 14-06-01 | 06 | 3 | PHR-01..02 | Output rendering, analytics redaction | unit | `npx vitest run app/tools/password` | ✅ | ✅ green |
| 14-06-02 | 06 | 3 | PREG-03 | No secret in URL/analytics; responsive 320px | e2e | `npx playwright test tests/e2e/password-privacy.spec.ts tests/e2e/password-responsive.spec.ts` | ✅ | ✅ green |
| 14-07-01 | 07 | 4 | PREG-01 | Seven nav links fit at 640px | unit + e2e | `npx vitest run components` / `npx playwright test tests/e2e/navigation.spec.ts` | ✅ | ✅ green |
| 14-07-02 | 07 | 4 | PREG-01 | Registry, sitemap, about | unit | `npx vitest run tools components app/sitemap.test.ts app/tools/pages-about.test.ts` | ✅ | ✅ green |
| 14-07-03 | 07 | 4 | PREG-01, PREG-02 | Landing card with KeyRound icon; SEO | e2e | `npx playwright test tests/e2e/home.spec.ts tests/e2e/navigation.spec.ts tests/e2e/password-seo.spec.ts` | ✅ | ✅ green |
| 14-08-01 | 08 | 5 | PREG-03 | Pinned skeleton; no layout shift on load | e2e | `npx playwright test tests/e2e/password-layout.spec.ts --repeat-each=5` | ✅ | ✅ green |
| 14-08-02 | 08 | 5 | all | Release gate; lib/password untouched | full | `npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e && npm run test:e2e:prod` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Privacy wording human-approved | PREG-02 | Editorial sign-off | Read About/FAQ privacy copy on /tools/password; confirm approved wording |
| EFF attribution wording (CC BY) | PHR-04 | Legal/editorial | Confirm attribution text and links in About area |
| Lighthouse 90+ on Vercel | PREG-03 | Needs production deployment | Run Lighthouse (mobile + desktop) on /tools/password and /tools/subnet on the Vercel URL |
| Password managers, browser translate, VoiceOver — both modes | PHR-01, STR-01 | Real AT/extension behavior | Check no autofill capture, translate does not mangle output, VoiceOver announces value/strength in Password and Passphrase modes |
| Safari nav at 640px | PREG-01 | WebKit font metrics | Open in Safari at 640px; all seven links on one row |
| 320px visuals | PREG-03 | Visual judgement | Inspect both modes at 320px for wrap/overflow |
| Focus rings | PHR-01 | Visual | Tab through toggle, options, strength switch; rings visible |
| Safari copy | PHR-01 | Clipboard permissions differ | Copy in Safari both modes; confirmation shows, clipboard correct |

---

## Validation Audit 2026-11-12

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All PHR-01..04, STR-01..04, PREG-01..03 map to existing green automated tests (quick subset re-run: 914/914 passed).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 14s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-12
