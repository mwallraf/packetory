---
phase: "13"
slug: "password-generator-page"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-11"
---

# Phase 13 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (13-01..13-06 `<threat_model>` blocks) and verified against the implemented code by gsd-security-auditor on 2026-11-11. block_on = high.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| server prerender -> CDN/static HTML | Anything rendered on the server is cached and served to every visitor | Generated passwords (must never cross; the island is client-only) |
| browser Web Crypto -> island | The only acceptable randomness source; it may be missing or broken | Random bytes (fail closed when absent) |
| island -> clipboard | The copied string (one password, or up to 20 via Copy all, or the Ctrl/Cmd+C chord) leaves the page through the OS clipboard | Secrets (passwords) |
| URL query -> island | Bookmarked or shared links are attacker-controllable input read on mount | Untrusted option parameters |
| island options -> address bar / history / analytics | The options query is visible in history and referrers and passes (redacted) through analytics | Options only (length, sets, symbol set, batch), never output |
| option inputs -> browser autofill / password managers | Text inputs on a "password" page attract save and fill prompts | Option values (low sensitivity) |
| island -> assistive technology | The live region and accessible names are read aloud and logged by assistive tools | Fixed phrases only |
| global keydown -> island | Window-level shortcuts can collide with native control behavior and user selections | Key events, user text selection |
| source tree -> CI | Later plans and phases edit the page; the guards are the regression net CI actually runs (e2e is local-only) | Source code |
| page -> network / storage / history | Any exit surface a regression could use to carry a password off the page | Generated passwords (must never cross) |
| page -> browser extensions and OS features | Password managers, translation and clipboard history read the page outside the app's control | Displayed passwords, copied strings |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-13-01 | Information Disclosure | page.tsx / PasswordToolLoader.tsx (password in prerendered HTML or CDN cache) | high | mitigate | `ssr: false` dynamic import in the "use client" loader (`app/tools/password/PasswordToolLoader.tsx:14`); `page.tsx` is a Server Component that never imports the island; generation only in the lazy `initialState()` / handlers with no `typeof window` guard (`PasswordTool.tsx:108-117`). Guards: `page-guards.test.ts` (pageIsClient, pageImportsIsland, loaderMissingSsrFalse, windowGuard, generationOutsideIsland, useMemoUsers + mutants). Prod HTML spec `tests/e2e-prod/password-ssr.spec.ts` (exactly one `password-skeleton`, 7 forbidden testids absent, script-stripped all-sets detector with positive control). Auditor re-ran the same checks on the prerendered `.next/server/app/tools/password.html` and the :3000 dev HTML: skeleton x1, forbidden testids x0, no all-sets run. | closed |
| T-13-02 | Spoofing | PasswordTool.tsx generate() (weaker RNG or stale password on failure) | high | mitigate | `generate()` try/catch returns `results: []` plus `error: "exhausted" \| "crypto"` on every throw (`PasswordTool.tsx:53-67`); `PasswordOutput.tsx:213-219` renders only `ErrorPanel` (no hero, no copy control) on error or empty results; no Math.random / `crypto.` / `getRandomValues` in any non-test file under `app/tools/password` (grep: 0 hits); randomness only via `lib/password/random.ts` `resolveFill` (throws `CryptoUnavailableError`, no fallback). RTL `PasswordTool.test.tsx` "fails closed" block (crypto undefined, `{}`, exhaustion, loss after mount removes old value); e2e `password.spec.ts` "fails closed without Web Crypto" (pass). | closed |
| T-13-03 | Information Disclosure | page metadata (unfinished page indexed, unapproved privacy claim) | low | mitigate | `robots: { index: false, follow: false }` (`page.tsx:21`), exact UI-SPEC description with no privacy claim (`page.tsx:6-7`). Rendered HTML (prerendered artifact and dev) holds `<meta name="robots" content="noindex, nofollow"/>`; asserted on production HTML in `password-ssr.spec.ts:90-99`. Tool is absent from registry, sitemap and nav (grep: no references outside `app/tools/password`, `lib/password`, `tests`). | closed |
| T-13-04 | Information Disclosure | PasswordOutput.tsx value element (translation, spellcheck, form capture) | medium | mitigate | Hero and row values are `div` with `translate="no"` and `spellCheck={false}` (`PasswordOutput.tsx:73-77`, `PasswordRow.tsx:41-45`); value is span text only (`ColoredPassword.tsx`, `data-kind` holds letter/digit/symbol only); no form/output/tabindex/contenteditable in any non-test file (grep: 0 hits; `outputSurfaces` guard). RTL attribute assertions (`PasswordTool.test.tsx:109-137`); e2e `password-privacy.spec.ts:131-205` (DIV, translate=no, spellcheck=false, no form ancestor). | closed |
| T-13-05 | Denial of Service | initialState / commit (hostile len=999, n=1e9, 10 KB sym) | high | mitigate | `parseOptions` drops any search over `MAX_SEARCH_LENGTH` 2048, counts must match `/^\d{1,4}$/`, `sym` capped at 64 decoded chars (`lib/password/url-state.ts:46-53,78,114`); `normalizeToolOptions` clamps length to [4,128] and batch to [1,20] on mount (`PasswordTool.tsx:109`) and on every commit (`PasswordTool.tsx:188`); `parseIntInRange` gates drafts (`PasswordTool.tsx:76`); `resolveFill` byte cap `MAX_FILL_BYTES` (`random.ts:29`). RTL `PasswordTool.url.test.tsx:74` and e2e `password-url.spec.ts:40` (hostile URL loads clamped to len=128, no error, canonical rewrite) pass. | closed |
| T-13-06 | Information Disclosure | writeUrl (output in URL, fragment, history.state or router tree) | high | mitigate | `writeUrl` serializes `ToolOptions` only via `serializeOptions` and calls `window.history.replaceState(null, "", path)` with no fragment (`PasswordTool.tsx:91-97`); no router, pushState, hash or location writes anywhere (grep: 0 hits; `routerUrl` guard). RTL `PasswordTool.url.test.tsx:164-203` (every replaceState call has null state and no output/`#`, never pushes, history.length unchanged); e2e `password-url.spec.ts:110` and `password-privacy.spec.ts:34` (page.url(), history.state, hash) pass. | closed |
| T-13-07 | Information Disclosure | PasswordOptionsPanel inputs (autofill and password-manager capture) | medium | mitigate | `TEXT_INPUT_GUARDS` spread on Length, Symbol set and Batch count (`PasswordOptionsPanel.tsx:42-51,147,246,300`): autoComplete off, spellCheck false, autoCorrect/autoCapitalize off, data-1p-ignore, data-lpignore, data-bwignore, data-form-type other; no `name`, no form, no `type="password"`; slider has autoComplete off (`:159`). RTL `PasswordTool.options.test.tsx:548-560`; e2e `password-privacy.spec.ts:207-243` (pass). | closed |
| T-13-08 | Information Disclosure | analytics events carrying option params | medium | mitigate | `DEFAULT_ALLOW_LIST: readonly string[] = []` (`lib/analytics/redact.ts:146`) and `PacketoryAnalytics` routes every URL through `redactParams` (`lib/analytics/PacketoryAnalytics.tsx`); `git diff 65fd17d^ HEAD -- lib/analytics lib/hooks package.json package-lock.json` is empty (unchanged across Phase 13); Phase 12 regression `lib/analytics/redact.test.ts:105-121` (serialized password options redact to `{}`, allow-list equals `[]`) passes (vitest run: 21 files, 621 tests pass). | closed |
| T-13-09 | Tampering | app/tools/password (Math random or Web Crypto outside random.ts, static word-list import) | high | mitigate | `WALK_DIRS = ["lib/password", "app/tools/password"]` (`lib/password/boundaries.test.ts:26`); page walk test (`:316-328`) and page-file mutants (Math random appended to the real island, getRandomValues in a non-test helper, static word-list import in `page.tsx`) at `:474-506`. CI runs `npm run test` (`.github/workflows/ci.yml:61`); suite passes. | closed |
| T-13-10 | Information Disclosure | app/tools/password (storage, router, fragment, analytics track, console, network, download) | high | mitigate | `app/tools/password/page-guards.test.ts` rules `PERSISTENCE_RULES`, `ROUTER_URL_RULES` (+ next/navigation, next/router specifiers), `DATA_EXIT_RULES` (+ @vercel/analytics specifier) asserted empty on real sources (`:319-329`) with one in-memory mutant per rule family (`:372-452`) and comment/test-file exemption checks. Independent grep of non-test sources: 0 hits for storage, cookie, fetch, XHR, sendBeacon, console, router, pushState, hash, createObjectURL, WebSocket, EventSource. Runs in CI via `npm run test`. | closed |
| T-13-11 | Information Disclosure | app/tools/password (form, output, textarea, title, dangerouslySetInnerHTML surfaces) | medium | mitigate | `OUTPUT_SURFACE_RULES` (dangerouslySetInnerHTML, form/output/fieldset/textarea, `type="password"`, contentEditable, title attribute) asserted empty (`page-guards.test.ts:331-333`) with mutants (`:455-483`); independent grep of non-test sources: 0 hits. | closed |
| T-13-12 | Tampering | generation location (server or render-time generation, deep imports of loader or test helpers) | high | mitigate | Rules `generationOutsideIsland`, `useMemoUsers`, `windowGuard`, `deepLibImports`, `testHelperImporters`, `pageImportsIsland`, `pageIsClient`, `loaderMissingSsrFalse` asserted on real sources (`page-guards.test.ts:335-356`) with a mutant per rule (`:486-547`). Only `PasswordTool.tsx` calls `generateBatch`; island and `PasswordToolLoader` are the sole consumers of the island (repo-wide grep). Auditor ran `npx vitest run app/tools/password lib/password lib/analytics lib/hooks`: 21 files, 621 tests, all pass. | closed |
| T-13-13 | Information Disclosure | PasswordRow/PasswordOutput (value in aria-label, title, data-*, key) | high | mitigate | Fixed accessible names: `"Copy password"` / `"Copy all passwords"` / `"Copied!"` / `` `Copy password ${index + 1}` `` (`PasswordOutput.tsx:85,146`, `PasswordRow.tsx:52`); keys `${gen.generation}-${index}` (`PasswordOutput.tsx:189`) and index keys in `ColoredPassword.tsx`; no title attribute (guard). RTL "POUT-05 attribute scan" (`PasswordTool.output.test.tsx:404-433`) and `PasswordTool.test.tsx:139`; e2e `password-privacy.spec.ts:131,246` (every attribute, field value, placeholder, button names match a fixed vocabulary) pass. | closed |
| T-13-14 | Information Disclosure | live region (value announced) | high | mitigate | `StatusPhrase` union admits only fixed phrases and a numeric template (`PasswordTool.tsx:30-35`); `announce()` takes `StatusPhrase` only; copy announcements driven by the hook's `copied` flag, never by the value (`:148-158`); live region is `aria-live="polite"` sr-only (`:337-343`). RTL "Live region" block (`PasswordTool.output.test.tsx:435-557`, incl. "never holds a displayed password after any action"); e2e `password-privacy.spec.ts:246-301` (status text and ariaSnapshot) pass. | closed |
| T-13-15 | Spoofing | copy confirmation shown for a value that was not copied | low | mitigate | `applyGenerated` resets hero and Copy all hooks in the same handler as the new generation (`PasswordTool.tsx:170-174`); rows keyed by generation and index so they remount per generation (`PasswordOutput.tsx:189`); announcements only after the hook sets `copied` (post-`writeText` resolution, `useCopyToClipboard.ts`). Residual in-flight write race accepted (AR-13-01). RTL "Regenerate right after Copy all / row copy" (`PasswordTool.output.test.tsx:318-345`). | closed |
| T-13-16 | Denial of Service | batch of 20 x 128 characters | low | accept | Accepted (AR-13-02). Supporting controls verified: `generateBatch` clamps count via `clampBatchCount` (`lib/password/generate.ts:67`), `resolveFill` byte cap (`random.ts:29`); e2e `password-responsive.spec.ts` (20 x 128 batch fits 320px, list is not an inner scroller; 4 tests pass). | closed |
| T-13-17 | Tampering | copy chord (overwrites a user's partial selection, or silently copies in batch view) | medium | mitigate | `window.getSelection()?.toString()` guard (`PasswordTool.tsx:303`); `copy` handler is `undefined` unless exactly one result and no error (`:289-306`); hook skips editable targets and requires Ctrl/Cmd without Shift/Alt (`lib/hooks/useKeyboardShortcut.ts`, unchanged in Phase 13). RTL `PasswordTool.keyboard.test.tsx:208-292` (Shift/Alt chords, batch 3, non-empty selection, focus in Length, error state); e2e `password-keyboard.spec.ts:132-181` (pass). | closed |
| T-13-18 | Tampering | Enter double fire (native click plus global handler) | low | mitigate | Hook guard `isInteractiveTarget` (button, role=button/radio, a[href], summary) unchanged (`lib/hooks/useKeyboardShortcut.ts`; empty Phase 13 diff). RTL `PasswordTool.keyboard.test.tsx:108-160`; e2e `password-keyboard.spec.ts:56-111` asserts Web Crypto call-count delta in [20, 39] (pass). | closed |
| T-13-19 | Denial of Service | Esc inside inputs resets work in progress | low | accept | Accepted (AR-13-03). Verified `resetAll()` touches options, drafts and hints only (`PasswordTool.tsx:277-285`); locked by D-14, UI-SPEC "Destructive confirmation: None". | closed |
| T-13-20 | Information Disclosure | whole page (residual exit surfaces) | high | mitigate | `tests/e2e/password-privacy.spec.ts` session sweep over every request URL and body, `page.url()`, `history.state`, localStorage, sessionStorage, `document.cookie`, context cookies, title, location/hash, every attribute, input values and placeholders, accessible names and the live region, raw and percent-encoded, with a distinct-passwords sanity check (`:34-301`). Auditor re-ran against the existing :3000 dev server: 31 password e2e tests pass (6 spec files). | closed |
| T-13-21 | Information Disclosure | password managers and page translation | medium | mitigate | Automated controls present: no form, `TEXT_INPUT_GUARDS` opt-outs (T-13-07), `translate="no"` on value elements (T-13-04). Real-browser verification (Chrome/Safari/1Password/Bitwarden managers, Chrome translate, VoiceOver) is queued as REQUIRED batched milestone UAT (`13-06-SUMMARY.md` "Human Checks Queued", items 1-3); not yet performed. | closed |
| T-13-22 | Information Disclosure | OS or extension clipboard history | medium | accept | Accepted (AR-13-04). Verified no auto-clear timer or clipboard-clearing write exists (only `writeText` of the displayed value in `useCopyToClipboard.ts`); honest FAQ wording handed off to Phase 14 (PREG-02). | closed |
| T-13-23 | Tampering | release without e2e (CI runs no Playwright) | medium | mitigate | `13-06-SUMMARY.md` "Release Gate (SC-5)" quotes the sequential local gate with exit codes and summary lines (typecheck, lint, `npm test` 1333 passed, build, `test:e2e` 194 passed, `test:e2e:prod` 17 passed). Auditor re-ran the unit subset (621 pass) and password dev e2e (31 pass). `test:e2e:prod` not re-run by the auditor (needs a build and a server on :3101); its assertions were reproduced against the prerendered production artifact (see T-13-01). CI itself runs typecheck, lint, test and build (`.github/workflows/ci.yml`). | closed |
| T-13-SC | Tampering | npm installs (all six plans) | low | mitigate | No package installed in Phase 13: `git diff 65fd17d^ HEAD -- package.json package-lock.json` is empty (65fd17d is the first Phase 13 commit); files changed by Phase 13 are limited to `app/tools/password/*`, `lib/password/boundaries.test.ts` and `tests/e2e*/password*.spec.ts`. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-13-01 | T-13-15 (residual) | A clipboard write that resolves after a Regenerate can briefly show "Copied!" next to the new value on the hero or Copy all control (RESEARCH Pitfall 5). Rows remount per generation and `writeText` resolves in milliseconds; the confirmation auto-reverts in about 2 s and the copied text is never wrong, only the label. Recorded in 13-04-SUMMARY.md as an accepted gap. | Plan-time disposition (13-04-PLAN.md), recorded by gsd-security-auditor; owner confirmation pending | 2026-11-11 |
| AR-13-02 | T-13-16 | Batch of 20 x 128 characters (2,560 characters) renders in-page with no inner scroller. `generateBatch` clamps the count and the fill is byte-capped (Phase 12), so the cost is bounded and cannot be raised by a URL or input. | Plan-time disposition (13-04-PLAN.md), recorded by gsd-security-auditor; owner confirmation pending | 2026-11-11 |
| AR-13-03 | T-13-19 | Esc fires from inside inputs by locked decision D-14 and resets options only (never user content), so no confirmation is shown (UI-SPEC "Destructive confirmation: None"). | Locked decision D-14 (13-CONTEXT.md), recorded by gsd-security-auditor; owner confirmation pending | 2026-11-11 |
| AR-13-04 | T-13-22 | The page cannot clear OS or browser-extension clipboard history. An auto-clear timer was rejected (RESEARCH Pitfall 6). Honest FAQ wording is a Phase 14 deliverable (PREG-02) and needs human approval. | Plan-time disposition (13-06-PLAN.md), recorded by gsd-security-auditor; owner confirmation pending | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 24 | 24 | 0 | gsd-security-auditor |

Notes:
- Total counts T-13-01 through T-13-23 plus the shared T-13-SC (declared once per plan, six times in total). Dispositions: 21 mitigate, 3 accept, 0 transfer.
- SUMMARY.md `## Threat Flags` for 13-01 through 13-06 all report none; no unregistered attack surface.
- Verification depth is ASVS L1 (presence in the cited files plus passing tests). Not independently re-run: `npm run test:e2e:prod` (no server may be started during audit); the equivalent raw-HTML assertions were reproduced on `.next/server/app/tools/password.html`.
- Non-blocking follow-ups: batched milestone UAT for password managers, page translation and VoiceOver (T-13-21); Phase 14 hand-offs for removing `noindex`, the final skeleton pin and the clipboard-history FAQ wording (T-13-03, T-13-22).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
