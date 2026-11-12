---
phase: "14"
slug: "passphrase-strength-launch"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-12"
---

# Phase 14 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (14-01..14-08 PLAN.md `<threat_model>` blocks); verified against the implementation on 2026-11-12 at ASVS level 1 with `block_on: high`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| page load -> CDN chunk | The EFF word-list chunk is requested only after the user chooses Passphrase (or opens a passphrase bookmark) | Static public word list (no user data) |
| island -> lib/password internals | Only the loader module `@/lib/password/wordlist` may be reached outside the barrel, and only from `PasswordTool.tsx` | Module imports (build-time) |
| async load -> island state | A word-list load settles later than the action that started it | Load result vs. current options and mode |
| network -> word-list chunk | The chunk can fail or be blocked; the page must fail closed | Chunk bytes, ChunkLoadError |
| static HTML -> crawlers and caches | Anything in the server HTML is public and long-lived | About area, FAQ, JSON-LD, skeleton (must hold no generated secret) |
| page -> eff.org | Outbound credit links could carry the options URL in the Referer header | Referer (options query string) |
| URL query -> island options | A crafted link sets `mode`, `words`, `sep`, `cap`, `num` | Untrusted query string |
| user input -> word-count draft | Free text in the number inputs | Untrusted text |
| settings -> displayed security claims | Users rely on the strength label and crack time to judge a secret | Entropy figures, label, crack-time sentence |
| page -> network, storage, history | Exit surfaces a regression could use to carry a passphrase away | Generated passphrase (sensitive) |
| page -> assistive technology and extensions | Accessible names, live region, password managers, translation | Generated passphrase (sensitive) |
| registry -> public surfaces | One registry entry feeds nav, landing grid, sitemap and the About enrolment | Tool metadata, icon name |
| local release -> production deploy | CI runs no Playwright, so the local gate is the only e2e proof | Release evidence |
| npm registry -> local machine | The optional Lighthouse advisory downloads a package at run time | Third-party package |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation (evidence) | Status |
|-----------|----------|-----------|----------|-------------|-----------------------|--------|
| T-14-01 | Information Disclosure | word-list delivery | medium | mitigate | Literal dynamic import `import("./wordlist/eff-large")` is the only reference to the list outside `lib/password/wordlist/` (`lib/password/wordlist.ts:16`); no `prefetch` anywhere in app/components/lib/tools; prod spec scans every JS chunk body for the EFF marker before and after the toggle and requires exactly one marker chunk (`tests/e2e-prod/password-wordlist.spec.ts` (a)/(b)); marker is non-vacuous (1 match in `eff-large.ts`; exactly one built chunk `.next/static/chunks/3cxtvbdyb3mnp.js` holds it; prerendered `password.html` references neither marker nor chunk) | closed |
| T-14-02 | Tampering | island imports | high | mitigate | `page-guards.test.ts:302` allows exactly `@/lib/password/wordlist` from `PasswordTool.tsx` (`:379` asserts it is imported exactly once); mutants catch the loader from OUTPUT, PAGE, faq-data, PasswordExample (`:531-551`) and the eff-large module static or dynamic from the island (`:555-562`); `lib/password/boundaries.test.ts:390` island static-import mutant; vitest run green (40 files, 914 tests) | closed |
| T-14-03 | Tampering | requestLoad continuation | high | mitigate | `PasswordTool.tsx:288` `const token = ++seqRef.current`; success continuation returns unless `token === seqRef.current` and mode is passphrase (`:293`); rejection continuation checks the token (`:301`); `commit()` bumps the token (`:351`); mount cleanup bumps it (`:268`); refs, not closures (`:196-199`). RTL matrix in `PasswordTool.passphrase.test.tsx` "sequence token" block (mode switch, option change, stale rejection) passes | closed |
| T-14-04 | Information Disclosure | URL | high | mitigate | URL written only by `writeUrl()` via `serializeOptions(opts)` which accepts `ToolOptions` only (`PasswordTool.tsx:137-149`, `lib/password/url-state.ts:117`); page-guards ban router/push/hash/data exits; e2e asserts search is exactly `?mode=passphrase` after the toggle (`tests/e2e/password-passphrase.spec.ts:30`); Playwright run on :3000 green | closed |
| T-14-05 | Information Disclosure | PasswordExample, faq-data | high | mitigate | `PasswordExample.tsx` shows a structural `word-word-...` shape only (`PasswordExample.tsx:32`); no generator call in server files (page-guards `generationOutsideIsland` and "detects ... generation in the server page" mutants `:500-515`); faq-data is constants and formatters only; prod SSR spec scans raw HTML and every flight payload for all-sets runs and the EFF marker (`tests/e2e-prod/password-ssr.spec.ts:182-191`, with positive/negative controls `:195-215`) | closed |
| T-14-06 | Tampering | FAQPage JSON-LD | medium | mitigate | JSON-LD emitted only by `components/ToolAbout.tsx` `FaqJsonLd` via `serializeJsonLd(buildFaqJsonLd(items))`; `lib/seo/jsonld.ts:25` `JSON.stringify(data).replace(/</g, "\\u003c")` escapes every `<` (canon XSS item confirmed); password `page.tsx` has no `dangerouslySetInnerHTML` and no page-local JSON-LD; `pages-about.test.ts:61,88` enforces only ToolAbout emits a script and only `lib/seo/jsonld.ts` builds FAQPage; `faq-data.ts` answers are plain strings; `password-seo.spec.ts` parity run green | closed |
| T-14-07 | Information Disclosure | EFF links | medium | mitigate | `rel="noreferrer"` on both links in `PasswordExample.tsx:61,65`; spec asserts it (`tests/e2e/password-seo.spec.ts:101-102`) | closed |
| T-14-08 | Repudiation | privacy and clipboard wording | medium | mitigate | Q5 and Q6 are fact-only D-15 drafts in `faq-data.ts` (no auto-clear claim; Q6 states OS or extension history cannot be cleared) pinned by exact equality (`faq-data.test.ts:96-97`); human wording approval recorded as a queued human check (14-02-SUMMARY "Human Checks Queued" 1, 14-08-SUMMARY item 1). Residual: the approval itself is deferred to the batched milestone UAT | closed |
| T-14-09 | Information Disclosure | robots/noindex | low | accept | Removing noindex is the launch decision (D-12). Implementation consistent: no `robots` entry in `app/tools/password/page.tsx`, `app/robots.ts` allows `/`, prerendered `password.html` has no `noindex` or robots meta, prod SSR spec asserts it. Logged as R-14-01 | closed |
| T-14-10 | Tampering | requestLoad continuations | high | mitigate | Token check before applying (`PasswordTool.tsx:293,301`); RTL matrix covers mode switch, option change, unmount ("unmounting before the load settles causes no state update", `PasswordTool.passphrase.test.tsx:204`), stale rejection (`:214`) and StrictMode double mount (`:147`); all pass | closed |
| T-14-11 | Denial of Service | Retry in a production build | medium | mitigate | `retryLoad()` calls `reloadPage()` when the last error name is `ChunkLoadError` (`PasswordTool.tsx:318-330`, `reload.ts`); RTL "a ChunkLoadError makes Retry reload the page and not call the loader" (`PasswordTool.passphrase.test.tsx:304`); prod spec (c) aborts the first marker chunk and proves recovery (`tests/e2e-prod/password-wordlist.spec.ts:90-148`) | closed |
| T-14-12 | Tampering | word source on failure | high | mitigate | No fallback list: rejection sets `results: []`, `status: "wordlist-error"` (`PasswordTool.tsx:300-309`); `generate()` catches every throw into an empty result (`:104-112`), so a wrong-length list (`WordlistIntegrityError`, `lib/password/passphrase.ts:21-26`) maps to the neutral error panel; `PasswordOutput.tsx:126-160,340-343` error panel renders no copy, copy-all or regenerate control and no previous value; RTL "a plain failure shows the D-04 copy and Retry, and no controls or value" (`PasswordTool.passphrase.test.tsx:260`) and prod spec (c) assert it. Observation: no island-level test feeds a wrong-length list (library throw is unit-tested in `passphrase.test.ts:177`); not blocking at L1 | closed |
| T-14-13 | Information Disclosure | reload | low | accept | `reload.ts` is `window.location.reload()` only, carrying the options URL already in the address bar; nothing generated is in it. Logged as R-14-02 | closed |
| T-14-14 | Tampering | StrengthPanel figures | high | mitigate | `StrengthPanel.tsx:107-116` derives bits purely from options via `passwordEntropyBits`/`passphraseEntropyBits`, level via `strengthLevel(bits)` on raw bits, sentence via `crackTimeLog10Seconds`/`formatCrackTime`; `lib/password` unchanged since ec3f160 (diff gate exit 0); `StrengthPanel.test.tsx` and `PasswordTool.strength.test.tsx` pass; e2e stability over five Regenerates green (`password-strength.spec.ts:10`) | closed |
| T-14-15 | Information Disclosure | strength panel | medium | mitigate | Props are `options`, `scenario`, `onScenarioChange` only (`StrengthPanel.tsx:95-99`), so a generated value cannot reach it; no `aria-live` or `role="status"` in the file; e2e "the strength panel is not a live region" green (`password-strength.spec.ts:86`) | closed |
| T-14-16 | Repudiation | crack-time wording | low | mitigate | `crackSentence()` always ends "to crack, on average" (`StrengthPanel.tsx:88-93`); `GUESS_RATE_LABELS[scenario]` rendered verbatim in `password-crack-assumption` (`:162`); tests pass | closed |
| T-14-17 | Tampering | parseOptions for passphrase keys | medium | mitigate | Phase 12 codec whitelists keys, bounds counts and enums, drops over-long searches (`lib/password/url-state.ts:30-60`); e2e "hostile ?mode=passphrase&words=99&sep=evil loads canonical with no error" green (`password-url.spec.ts:163`) | closed |
| T-14-18 | Tampering | word-count draft | low | mitigate | `parseIntInRange` accepts `^\d+$` ASCII digits within 3-20 only (`PasswordTool.tsx:122-128`); blur clamps via `clampInt` (`:410-418`); RTL `it.each(["2","21","abc"])` rejects with hint, aria-invalid, no regeneration, no URL write (`PasswordTool.passphrase-options.test.tsx:140`) | closed |
| T-14-19 | Information Disclosure | EFF credit links | medium | mitigate | `rel="noreferrer"` on both credit-line links (`PassphraseOptionsPanel.tsx:202,206`); e2e asserts rel and records no eff.org request unless a link is followed (`password-passphrase.spec.ts:186-206`); RTL `:229` | closed |
| T-14-20 | Information Disclosure | passphrase exit surfaces | high | mitigate | Session-wide e2e sweep "no passphrase reaches any exit surface (D-20c)" over requests, URL, history.state, localStorage, sessionStorage, cookies and document.title, matching the full joined passphrase (`tests/e2e/password-privacy.spec.ts:303-425`); page-guards ban storage, cookies, router push, beacons, console and data exits; both privacy specs green on :3000 | closed |
| T-14-21 | Information Disclosure | live region and names | high | mitigate | `StatusPhrase` is a closed union of fixed phrases plus a numeric template (`PasswordTool.tsx:42-53`) and `announce()` accepts only it (`:203`); names are fixed templates with an index only (`PasswordOutput.tsx:198,266`, `PasswordRow.tsx:74`); e2e "passphrase accessible names, snapshot and live region never carry the passphrase" green (`password-privacy.spec.ts:427`) | closed |
| T-14-22 | Information Disclosure | OS or extension clipboard history | medium | accept | The page cannot clear other apps' clipboard history; FAQ Q6 says so honestly (`faq-data.ts`, "Does Packetory clear my clipboard?", pinned by `faq-data.test.ts:97`). Logged as R-14-03 | closed |
| T-14-23 | Tampering | ToolCard icon resolution | low | mitigate | Explicit `ICONS` map including `KeyRound` (`components/ToolCard.tsx:29-37`); `assertToolIcon` throws for unknown and prototype keys via `Object.hasOwn` (`:43-47`) and is called before resolution (`:60`); `ToolCard.test.tsx:134-150` | closed |
| T-14-24 | Denial of Service | nav at 640px | low | mitigate | Nav links use `px-2` (`components/SiteHeader.tsx:70`); e2e "seven nav links share one row, nothing overflows and the theme toggle keeps 8px clearance" green at 640px (slack 23.4px) and 700px (`navigation.spec.ts:94`) | closed |
| T-14-25 | Tampering | release without e2e | medium | mitigate | Sequential gate with exit codes and summary lines quoted in 14-08-SUMMARY "Release gate" (typecheck 0, lint 0, `npm test` 79 files / 1440 tests, build 0, `test:e2e` 246 passed, `test:e2e:prod` 22 passed). Independently re-run in this audit: vitest 40 files / 914 tests passed; Playwright on :3000, 54 tests passed. Prod suite not re-run (audit constraint: existing :3000 dev server only) | closed |
| T-14-26 | Tampering | Phase 12 library and dependencies | high | mitigate | Re-ran the plan gate: `git diff --quiet ec3f160 -- lib/password ':!lib/password/boundaries.test.ts' lib/hooks lib/analytics package.json package-lock.json` exits 0. The only change under `lib/password` since ec3f160 is the plan-excepted 12-line mutant in `boundaries.test.ts`; `lib/hooks`, `lib/analytics`, `package.json` and `package-lock.json` have no diff | closed |
| T-14-27 | Denial of Service | layout shift regressions | low | mitigate | `tests/e2e/password-layout.spec.ts` gates default, passphrase bookmark and toggle shift (CLS and output-zone position) at 320px and 1280px; 9 cases green on :3000 | closed |
| T-14-SC | Tampering | npm installs (plans 14-01..14-07) | low | mitigate | No package installed: `git diff ec3f160 HEAD -- package.json package-lock.json` is empty and `git log ec3f160..HEAD` shows no commit touching either file; `lib/hooks` diff gate clean | closed |
| T-14-SC (14-08) | Tampering | npx lighthouse one-off | medium | mitigate | `lighthouse` appears in neither `package.json` nor `package-lock.json` (0 matches) and no tracked file references it, so it was never added; exact version 13.6.0 with registry provenance check (`repository.url` = github.com/GoogleChrome/lighthouse) recorded in 14-08-SUMMARY "Local Lighthouse advisory"; non-gating | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

*Register note: T-14-SC appears in every plan; plans 14-01..14-07 share one low-severity "no package installed" mitigation (one row), and 14-08 declares a distinct medium-severity mitigation for the Lighthouse one-off (second row). 28 unique IDs, 29 rows.*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-14-01 | T-14-09 | Removing `noindex` is the launch decision (D-12). The tool is fully built by the end of this phase and the branch deploys only after the release gate. Implementation confirms the page is indexable and the sitemap and robots allow it. | Plan-time acceptance (14-02-PLAN.md threat_model); recorded by gsd-security-auditor | 2026-11-12 |
| R-14-02 | T-14-13 | Retry-by-reload carries only the options URL already in the address bar; nothing generated is in it (`reload.ts`). | Plan-time acceptance (14-03-PLAN.md threat_model); recorded by gsd-security-auditor | 2026-11-12 |
| R-14-03 | T-14-22 | The page cannot clear an operating-system or extension clipboard history; the FAQ states this honestly and the page makes no auto-clear claim. | Plan-time acceptance (14-06-PLAN.md threat_model); recorded by gsd-security-auditor | 2026-11-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags

None. All eight SUMMARY.md `## Threat Flags` sections state "None" and map to registered IDs (T-14-01..T-14-27, T-14-SC).

## Audit Notes (non-blocking)

- T-14-08: the code-level mitigation (fact-only drafts pinned by exact equality) is present. The explicit human approval of FAQ Q5/Q6, the page description, the intro and the EFF attribution wording is queued for the batched milestone UAT (14-02-SUMMARY, 14-08-SUMMARY), not yet given.
- T-14-12: no island-level RTL test feeds a wrong-length word list; the code path (`generate()` catch to the error panel) is present and the library throw is unit-tested.
- Prod-only specs (`tests/e2e-prod/*`) were inspected and their targets cross-checked against the existing `.next` build artefacts, but not re-executed in this audit; the 14-08 release gate records them passing (22 passed).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-12 | 29 | 29 | 0 | gsd-security-auditor (ASVS L1, block_on high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-12
