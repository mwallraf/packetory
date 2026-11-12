---
phase: 14-passphrase-strength-launch
verified: 2026-11-12T01:30:00Z
status: passed
score: 7/9 must-haves verified
covered_files:
  - ".planning/phases/14-passphrase-strength-launch/14-01-PLAN.md"
  - ".planning/phases/14-passphrase-strength-launch/14-01-SUMMARY.md"
  - ".planning/phases/14-passphrase-strength-launch/14-02-PLAN.md"
  - ".planning/phases/14-passphrase-strength-launch/14-02-SUMMARY.md"
  - ".planning/phases/14-passphrase-strength-launch/14-03-PLAN.md"
  - ".planning/phases/14-passphrase-strength-launch/14-03-SUMMARY.md"
  - ".planning/phases/14-passphrase-strength-launch/14-04-PLAN.md"
  - ".planning/phases/14-passphrase-strength-launch/14-04-SUMMARY.md"
  - ".planning/phases/14-passphrase-strength-launch/14-05-PLAN.md"
  - ".planning/phases/14-passphrase-strength-launch/14-05-SUMMARY.md"
  - ".planning/phases/14-passphrase-strength-launch/14-06-PLAN.md"
  - ".planning/phases/14-passphrase-strength-launch/14-06-SUMMARY.md"
  - ".planning/phases/14-passphrase-strength-launch/14-07-PLAN.md"
  - ".planning/phases/14-passphrase-strength-launch/14-07-SUMMARY.md"
  - ".planning/phases/14-passphrase-strength-launch/14-08-PLAN.md"
  - ".planning/phases/14-passphrase-strength-launch/14-08-SUMMARY.md"
  - "app/tools/password/ModeToggle.tsx"
  - "app/tools/password/PassphraseOptionsPanel.tsx"
  - "app/tools/password/PasswordExample.tsx"
  - "app/tools/password/PasswordOutput.tsx"
  - "app/tools/password/PasswordTool.tsx"
  - "app/tools/password/PasswordToolLoader.tsx"
  - "app/tools/password/StrengthPanel.tsx"
  - "app/tools/password/faq-data.ts"
  - "app/tools/password/page.tsx"
  - "components/ToolCard.tsx"
  - "lib/password/constants.ts"
  - "lib/password/wordlist.ts"
  - "tests/e2e-prod/password-wordlist.spec.ts"
  - "tests/e2e/password-layout.spec.ts"
  - "tools/registry.ts"
covered_digest: "v4:sha256:35a040f05ff0f37a0dd055d5fc0aae0e016c994363e1bd6144fbb910c8306636"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "PREG-02 privacy and clipboard FAQ wording, plus the 'Runs locally in your browser' wording (meta description, intro)"
    expected: "Q5 (nothing sent/saved, only options in the URL) and Q6 (no clipboard clearing; OS/extension clipboard history may keep the value) are honest and approved; FAQ Q2 'Web Crypto API' reword reads correctly"
    why_human: "Legal/privacy text is a human gate (PROJECT.md automation model); only exact-equality tests pin the copy, not its honesty"
  - test: "PHR-04 EFF CC BY attribution wording (eff-large.ts header, PasswordExample About block, passphrase-panel credit line)"
    expected: "Names the work, author (EFF), licence (CC BY) with links, states the list is unmodified; the 4.0-vs-3.0 licence ambiguity on eff.org/copyright is acceptably handled"
    why_human: "Licence attribution adequacy is a legal judgment"
  - test: "PREG-03 Lighthouse 90+ in all four categories on a Vercel preview for /tools/password and /tools/subnet (mobile and desktop)"
    expected: "All categories >= 90; footer color-contrast (4.34:1) and the local-only /_vercel/insights 404 vanish or stay above 90"
    why_human: "Only a local next-start advisory exists (100/96/96/100); the roadmap contract names a Vercel preview run"
  - test: "Password managers, Chrome translate and VoiceOver in Password and Passphrase modes, including mode/separator toggles, 'Loading word list' announcement, Retry-by-reload with VoiceOver, and acceptance of the ?mode=passphrase&n>1 content shift (only plain ?mode=passphrase is CLS-gated) and loading-to-error panel no-shift at 320px and 1280px"
    expected: "No save prompt or autofill; translation leaves values identical; passphrase/password never read in names or announcements; announcements are fixed phrases only"
    why_human: "Assistive technology and browser-extension behavior cannot be asserted in Playwright"
  - test: "Seven-link nav in Safari at 640px and 700px"
    expected: "All seven links fit one row without overlapping the theme toggle (Chromium slack 23.4px at 640, 53.4px at 700)"
    why_human: "Safari font metrics differ; only Chromium was measured"
  - test: "320px visuals in light and dark, focus rings on every control, Safari Copy shows 'Copied!' (carried from 13-06 plus passphrase mode)"
    expected: "No overflow, rings visible, copy confirmation shown"
    why_human: "Visual and browser-specific backstops"
  - test: "WR-03 state-machine choice: after a ChunkLoadError, option changes keep the error panel and only Retry reloads"
    expected: "Maintainer accepts that option changes do not retry the load (no 'Loading word list' flash, no value, no fallback list) and that Retry reloads the page"
    why_human: "A product decision about recovery behavior, not a correctness question"
---

# Phase 14: Passphrase, Strength & Launch Verification Report

**Phase Goal:** The Password Generator is complete and launched. Users can switch to memorable EFF passphrases, see how strong each result is and roughly how long it would take to crack, and find the tool from the nav, the landing page, the sitemap and search.
**Verified:** 2026-11-12T01:30:00Z
**Status:** human_needed
**Re-verification:** No, initial verification

All automatable evidence supports the goal. Nothing FAILED. The status is `human_needed` because five roadmap success criteria contain a clause that is a human gate by design (approved privacy wording, Vercel-preview Lighthouse, Safari nav fit), and the user asked for these to be batched into milestone UAT.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria, with sub-claims)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Password/Passphrase toggle, 6 EFF words joined by `-` by default; word count 3-20, separator, capitalize, append-number work; bookmark restore of mode and options; Regenerate/batch/copy/Copy all/shortcuts match Password mode | VERIFIED | `PasswordTool.tsx`: `onModeChange` -> `commit`; `generatePassphraseBatch(opts, list, opts.batch)`; mount effect `requestLoad` for `?mode=passphrase` bookmarks; word/separator/capitalize/append handlers; `enter`/`slash`/`escape`/`copy` shortcuts mode-aware (`wordCountRef` in passphrase mode, Esc keeps mode). `DEFAULT_OPTIONS`: words 6, separator `-`. Tests: `PasswordTool.passphrase*.test.tsx`, `url.test.tsx`, `keyboard.test.tsx`, e2e `password-passphrase.spec.ts` (orchestrator gate green; 919 related vitest passed here) |
| 2 | Production: word list absent from initial JS, loaded on first Passphrase use (prod spec); load failure shows error + working Retry, no fallback list | VERIFIED | `lib/password/wordlist.ts`: only literal `import("./wordlist/eff-large")`, memo cleared on rejection, no fallback; grep shows no other `import(` of the list. `tests/e2e-prod/password-wordlist.spec.ts` (a) no marker chunk on load, (b) exactly one marker chunk across Passphrase/Password/Passphrase, (c) aborted first chunk -> alert "Couldn't load the word list" + Retry, no output/copy, Retry reloads and recovers. Orchestrator: `test:e2e:prod` 22 passed. Retry choice (reload on ChunkLoadError) is a human-checked decision, see item 7 |
| 3 | Both modes show strength meter + label (thresholds 40/75/100) stable across Regenerate; pool-size line; crack time with stated rate; Fast/Slow switch | VERIFIED | `StrengthPanel.tsx` is a pure function of `options` + `scenario` (no generated value passed, so Regenerate cannot change it). `strengthLevel`/`STRENGTH_THRESHOLDS` {40,75,100}; `poolLine` = "N chars · X bits" / "7,776 words × N [+ 1 digit] · X bits"; `GUESS_RATES` {1e10, 1e4} with `GUESS_RATE_LABELS` stated visibly; ToggleGroup fast/slow. `StrengthPanel.test.tsx`, `PasswordTool.strength.test.tsx`, `password-strength.spec.ts` |
| 4a | Password in nav, landing grid, sitemap with `KeyRound`; seven nav links fit at 640px | VERIFIED (Chromium); Safari -> human | `tools/registry.ts` slug `password`, `icon: "KeyRound"`, `status: "active"`; sitemap derives from registry (non-planned filter); `ToolCard.tsx` ICONS includes `KeyRound`; `navigation.spec.ts` `toHaveCount(7)` at nav/drawer, `home.spec.ts` 7 cards; seven-link fit specs at 640/700 (Chromium slack 23.4/53.4px) |
| 4b | `/tools/password` unique metadata, shared About with worked example, EFF CC BY attribution, FAQ from `lib/password` constants, hyphenated-words note | VERIFIED | `page.tsx`: unique title/description/canonical/OG, no robots noindex; `ToolAbout slug="password" faqItems` + `PasswordExample`; `faq-data.ts` every number is a template over `@/lib/password` constants (6 items; Q3 hyphenated words via `EFF_HYPHENATED_WORDS`, "no practical effect"); `PasswordExample` has attribution block with EFF + CC BY links, "unmodified"; `eff-large.ts` carries a CC BY header with SHA-256 pins. Specs: `password-seo.spec.ts` (6 items, JSON-LD 6), `password-ssr.spec.ts` |
| 4c | Privacy wording the user has explicitly approved | HUMAN NEEDED | Q5/Q6 and "Runs locally" text present and test-pinned, but approval is an explicit human gate. See human item 1 |
| 5a | Lighthouse 90+ every category on `/tools/password` and `/tools/subnet` | HUMAN NEEDED | Only local advisory: 100/96/96/100 on both, mobile and desktop (14-08 SUMMARY, not reproduced by me). Roadmap/REQ names a Vercel preview run, not yet done. See human item 3 |
| 5b | No layout shift on load (pinned skeleton) | VERIFIED | `PasswordToolLoader.tsx` text-free skeleton with per-breakpoint height ladder (WR-04); `password-layout.spec.ts` gates CLS at 320/375/412/640/768/1024/1280, bookmark < 0.05, mode switch never moves output zone; local CLS 0. Residual: `?mode=passphrase&n>1` shift is knowingly unpinned (human item 4) |
| 5c | Every hard-coded tool count 6 -> 7; `test:e2e` and `test:e2e:prod` pass | VERIFIED | Grep: `registry.test.ts` 7, `home.spec.ts` 7, `navigation.spec.ts` 7, `subnet-layout.spec.ts` 7, `ToolCard.test.tsx` 7; no remaining 6-tool counts found. Orchestrator gate: e2e 262 passed, e2e:prod 22 passed (not re-run by me) |

**Score:** 7 of 9 sub-claims verified (1, 2, 3, 4a, 4b, 5b, 5c); 2 are human-owned (4c approved privacy wording, 5a Vercel-preview Lighthouse); 0 FAILED. 4a is verified in Chromium with the Safari fit queued for UAT.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/tools/password/PasswordTool.tsx` | Mode state machine, lazy list load, sequence token, Retry | VERIFIED | 639 lines, substantive, wired from `PasswordToolLoader` (dynamic, ssr:false) |
| `app/tools/password/StrengthPanel.tsx` | Meter, pool line, crack time, scenario toggle | VERIFIED | Wired in `PasswordTool`; data from `lib/password` entropy/crack-time |
| `app/tools/password/PassphraseOptionsPanel.tsx`, `ModeToggle.tsx`, `PasswordOutput.tsx` | Passphrase options, mode toggle, output with error panel | VERIFIED | Imported and rendered by `PasswordTool` |
| `app/tools/password/page.tsx`, `faq-data.ts`, `PasswordExample.tsx`, `eff-links.ts` | Launch metadata, About, FAQ, attribution | VERIFIED | Rendered via shared `ToolAbout` |
| `lib/password/wordlist.ts` + `wordlist/eff-large.ts` | Memoized lazy loader, vendored unmodified list | VERIFIED | Single literal dynamic import; barrel does not re-export (guard) |
| `tools/registry.ts`, `components/ToolCard.tsx`, nav | Registration, KeyRound, 7 links | VERIFIED | Sitemap/nav/home derive from registry |
| `tests/e2e-prod/password-wordlist.spec.ts`, `tests/e2e/password-layout.spec.ts` | Chunk proof, CLS gates | VERIFIED | Real assertions (marker scan, abort/Retry, per-width CLS) |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| PasswordToolLoader | PasswordTool | `dynamic(import, {ssr:false})` | WIRED |
| PasswordTool | wordlist | `loadWordlist()` in `requestLoad` guarded by `seqRef` token | WIRED |
| PasswordTool | StrengthPanel | `options` + local `scenario` only | WIRED (no output string input) |
| PasswordTool | URL | `writeUrl(serializeOptions(opts))`; mount load for `?mode=passphrase` | WIRED |
| page.tsx | ToolAbout/FAQ/JSON-LD | `faqItems` from `faq-data.ts` (constants-derived) | WIRED |
| registry | nav/home/sitemap | registry-derived | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real Data | Status |
|----------|------|--------|-----------|--------|
| Passphrase hero | `gen.results` | `generatePassphraseBatch(opts, list, n)` with CSPRNG over lazily loaded 7,776-word list | Yes | FLOWING |
| StrengthPanel | `bits`, crack sentence | `passwordEntropyBits`/`passphraseEntropyBits` from options; `crackTimeLog10Seconds` | Yes | FLOWING |
| FAQ/Example | figures | `lib/password` constants and functions | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Typecheck | `npx tsc --noEmit` | exit 0 | PASS |
| Password/lib/tools/components unit tests | `npx vitest run app/tools/password lib/password tools components` | 39 files, 919 tests passed | PASS |
| Full gate (orchestrator-reported, not re-run) | typecheck/lint 0, vitest 1449, build 0, e2e 262, e2e:prod 22 | as reported | Reported, not independently reproduced |

### Probe Execution

Step 7c: SKIPPED (no probe scripts declared by the phase plans).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PHR-01 | 14-01, 14-03, 14-05, 14-06 | Password/Passphrase toggle, default 6 EFF words joined by `-` | SATISFIED | Truth 1 |
| PHR-02 | 14-05 | Word count 3-20, separator, capitalize, append number | SATISFIED | `PassphraseOptionsPanel.tsx`, handlers in `PasswordTool.tsx`, `WORDS_MIN/MAX` |
| PHR-03 | 14-01, 14-03 | Lazy list, Retry on failure, no fallback | SATISFIED | Truth 2 |
| PHR-04 | 14-02, 14-05 | EFF CC BY attribution in About; FAQ mentions 4 hyphenated words | SATISFIED in code; attribution wording needs human sign-off | `PasswordExample.tsx`, `faq-data.ts` Q3; human item 2 |
| STR-01 | 14-04 | Meter, bits, label, stable across Regenerate | SATISFIED | `StrengthPanel.tsx` pure |
| STR-02 | 14-04 | Pool-size · bits line | SATISFIED | `poolLine` |
| STR-03 | 14-04 | Crack time with stated rate | SATISFIED | `crackSentence` + `GUESS_RATE_LABELS` |
| STR-04 | 14-04 | Fast/slow scenario switch | SATISFIED | ToggleGroup, `GUESS_RATES` 1e10/1e4 |
| PREG-01 | 14-07 | Nav, landing, sitemap, KeyRound, seven links fit at 640px | SATISFIED (Chromium); Safari human | Truth 4a |
| PREG-02 | 14-02 | Unique metadata, worked example, FAQ from constants, human-approved privacy wording | PARTIAL: implemented, approval pending | Truth 4b/4c; human item 1 |
| PREG-03 | 14-08 | Lighthouse 90+ on both pages, no layout shift | PARTIAL: CLS verified; Lighthouse only local advisory | Truth 5a/5b; human item 3 |

All 11 requirement IDs in PLAN frontmatter (14-01..14-08) match the 11 IDs REQUIREMENTS.md maps to Phase 14. No orphaned requirements. REQUIREMENTS.md already ticks PREG-02/PREG-03 and PHR-04 as `[x]`; those boxes should be read as "implemented", with the human gates tracked here.

### Post-Execution Fixes (review-fix)

WR-01 (03361db), WR-02 (75eb7af), WR-03 (a3c7cf6), WR-04 (25a4842, f550f97), UI-1 (f34e2d6), UI-2 (34572ea) are present in git history. Code evidence: unmount cleanup effect bumps `seqRef` (WR-01); `commit` short-circuits to the error panel after `isChunkLoadError` (WR-03); skeleton height ladder in `PasswordToolLoader.tsx` (WR-04). Re-review converged with 0 warnings, 6 info items open (IN-01..IN-06) carried to the milestone audit; none block the goal.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (32 non-test files changed in the phase) | - | TBD/FIXME/XXX scan | none found | - |
| `.planning/phases/14-passphrase-strength-launch/deferred-items.md` | - | Site-wide footer contrast 4.34:1 (a11y 96); Vercel-only analytics 404 locally | Info | Outside Phase 14 scope; recheck on preview (human item 3) |
| 14-REVIEW IN-01..IN-06 | - | Weak privacy ariaSnapshot test, console.log in `navigation.spec.ts`, etc. | Info | Open, carried to milestone audit |

### Human Verification Required

See the frontmatter `human_verification` list: 7 items (privacy/clipboard FAQ and "Runs locally" wording; EFF CC BY attribution; Vercel-preview Lighthouse 90+ for both pages; password managers/translate/VoiceOver in both modes plus the `?mode=passphrase&n>1` shift; Safari 7-link nav at 640/700px; 320px visuals, focus rings, Safari copy; WR-03 recovery state-machine choice).

### Gaps Summary

No gaps. Every must-have is implemented, wired and data-flowing, and the automated gates are green (typecheck and 919 related unit tests re-run by me; e2e/e2e:prod/build figures are the orchestrator's). The phase cannot be marked `passed` only because the roadmap contract includes explicit human-owned clauses (approved privacy wording, Vercel-preview Lighthouse, Safari) that are queued for the batched milestone UAT.

---

_Verified: 2026-11-12T01:30:00Z_
_Verifier: Claude (gsd-verifier)_
