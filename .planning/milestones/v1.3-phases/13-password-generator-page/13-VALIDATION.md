---
phase: "13"
slug: "password-generator-page"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
audited: "2026-11-11"
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + Testing Library (jsdom) + fast-check; Playwright (dev :3000 and prod :3101) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `playwright.prod.config.ts` |
| **Quick run command** | `npx vitest run app/tools/password lib/password` |
| **Full suite command** | `npm test && npm run typecheck && npm run lint` then `npm run test:e2e` then `npm run test:e2e:prod` |
| **Estimated runtime** | ~3 s quick (589 tests); full unit ~13 s; e2e several minutes |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run app/tools/password lib/password`
- **After every plan wave:** Run `npm test && npm run typecheck && npm run lint` plus the plan's Playwright spec(s)
- **Before `/gsd-verify-work`:** Full suite (incl. `test:e2e` and `test:e2e:prod`) must be green
- **Max feedback latency:** 13 seconds (unit)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | PWD-01, PWD-07 | D-01..D-04 | Server HTML is a text-free skeleton with no password; client shows one fresh all-sets password | e2e (prod) | `npx playwright test -c playwright.prod.config.ts password-ssr` | ✅ | ✅ green |
| 13-01-02 | 01 | 1 | PWD-08 | D-09 | Digits/symbols in distinct runs; copied text is raw string | unit | `npx vitest run app/tools/password/runs.test.ts` | ✅ | ✅ green |
| 13-01-03 | 01 | 1 | PWD-01, PWD-07, PWD-08, POUT-01, POUT-05 | D-10 | Fail closed without getRandomValues; two loads differ; copy plain; translate=no/spellcheck off | unit + e2e | `npx vitest run app/tools/password && npx playwright test tests/e2e/password.spec.ts` | ✅ | ✅ green |
| 13-02-01 | 02 | 2 | PWD-02, PWD-03 | D-05, D-06 | Length 4–128 slider/input in sync; last enabled set locked | unit + e2e | `npx vitest run app/tools/password/PasswordTool.options.test.tsx` | ✅ | ✅ green |
| 13-02-02 | 02 | 2 | PWD-05, PWD-06 | D-08 | Symbol set deduped/printable/default on empty; look-alikes removed from output | unit + e2e | `npx vitest run app/tools/password/PasswordTool.options.test.tsx && npx playwright test tests/e2e/password-options.spec.ts` | ✅ | ✅ green |
| 13-02-03 | 02 | 2 | POUT-03 | D-07, D-13 | Options-only URL, hostile params clamped and canonicalised, no password in history.state | unit + e2e | `npx vitest run app/tools/password/PasswordTool.url.test.tsx lib/analytics/redact.test.ts && npx playwright test tests/e2e/password-url.spec.ts` | ✅ | ✅ green |
| 13-03-01 | 03 | 3 | PWD-07 | D-15 | No Math.random / direct Web Crypto use outside audited lib; non-vacuous page walk | unit (guard) | `npx vitest run lib/password/boundaries.test.ts` | ✅ | ✅ green |
| 13-03-02 | 03 | 3 | PWD-01, POUT-03, POUT-05 | D-01, D-02, D-12, D-13 | No persistence, router, analytics, data exits or output surfaces in page; guard teeth proven | unit (guard) | `npx vitest run app/tools/password/page-guards.test.ts` | ✅ | ✅ green |
| 13-04-01 | 04 | 4 | POUT-01, POUT-02 | D-10 | Batch 1–20, per-row copy, Copy all joined by newline | unit + e2e | `npx vitest run app/tools/password/PasswordTool.output.test.tsx` | ✅ | ✅ green |
| 13-04-02 | 04 | 4 | POUT-01, POUT-05 | D-11 | Live region announces fixed phrases only, never the password | unit + e2e | `npx vitest run app/tools/password/PasswordTool.output.test.tsx && npx playwright test tests/e2e/password.spec.ts` | ✅ | ✅ green |
| 13-05-01 | 05 | 5 | POUT-04 | D-14 | `/` focuses length, Enter regenerates, Esc resets, Ctrl/Cmd+C single-only | unit | `npx vitest run app/tools/password/PasswordTool.keyboard.test.tsx` | ✅ | ✅ green |
| 13-05-02 | 05 | 5 | POUT-04 | — | Enter on focused button/switch never double-fires (Web Crypto call counts) | e2e | `npx playwright test tests/e2e/password-keyboard.spec.ts` | ✅ | ✅ green |
| 13-06-01 | 06 | 6 | POUT-03, POUT-05, PWD-01 | E1/E2/E7 | No exit surface, attribute, field, a11y name or live region holds the password; 320px no overflow | e2e | `npx playwright test tests/e2e/password-privacy.spec.ts tests/e2e/password-responsive.spec.ts` | ✅ | ✅ green |
| 13-06-02 | 06 | 6 | SC-5 | D-16, D-17 | Skeleton pinned to measured heights; full release gate | gate | `npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e && npm run test:e2e:prod` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Note: the "Enter not on a `<summary>`" clause of SC-3 has no page-level test because `/tools/password` renders no `<details>` yet (About section arrives in Phase 14); the guard itself is covered by the Phase 10 `useKeyboardShortcut` unit and e2e tests.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Password managers (1Password, Bitwarden, iCloud Keychain) do not offer to save/autofill the output or inputs | POUT-05 | Third-party extension behavior not reproducible in Playwright | Open `/tools/password` with each manager enabled; confirm no save/fill prompts on output, Length, batch or Symbol set |
| Safari clipboard copy and confirmation | POUT-01 | WebKit clipboard permissions differ from headless Chromium | In Safari, click Copy, row Copy and Copy all; paste into a text editor; confirm plain text and visible "Copied!" |
| Browser translate leaves the password untouched | POUT-05 | Translation services are external | Chrome "Translate page" / Safari translate; confirm the password and batch rows are unchanged |
| VoiceOver never reads the password via names, descriptions or live region | POUT-05 | Real screen-reader behavior beyond ariaSnapshot | macOS VoiceOver: navigate the tool, Regenerate, copy; confirm only fixed phrases are spoken |
| 320px visual wrapping and switch centering in light and dark | PWD-01 | Automated test only checks overflow geometry | DevTools 320×800, both themes; inspect 128-char hero and 20×128 batch visually |
| Visible focus rings on all controls | POUT-04 | Visual judgment | Tab through every control in light and dark; confirm a clearly visible ring |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 13s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-11

---

## Validation Audit 2026-11-11

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
