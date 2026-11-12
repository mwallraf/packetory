# Phase 10: Shared About Section & Config Parity - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning

<domain>
## Phase Boundary

On all six tool pages (UUID, Subnet, DNS, MAC, Hash, Config) the tool renders first. Below it, one shared server component renders a muted "About this tool" area: two native `<details>` disclosures (Worked example, FAQ), closed on load, with the full content in the server HTML and exactly one FAQPage JSON-LD script built by one shared builder from the same FAQ data. Config gets a worked example, a 4–6 item FAQ and JSON-LD, plus its own `FileTerminal` icon with no silent icon fallback. Enter on a focused `<summary>` toggles only that disclosure and never fires a tool's global Enter shortcut. The SEO e2e specs open the disclosures through a shared helper, and a Config SEO spec is added.

Requirements: INFO-01..05, CFG-01..03. Success criteria are in `.planning/ROADMAP.md` (Phase 10).

**Already locked at milestone level (do not reopen):** native `<details>/<summary>` in a server component (no Radix Collapsible/Accordion); closed by default; one JSON-LD builder that keeps the `<` → `<` escape; Config icon = `FileTerminal`; no new runtime or dev dependencies; `openAbout` shared e2e helper; don't promise find-in-page into closed `<details>`; the release gate needs `npm run test:e2e` and `npm run test:e2e:prod` to pass locally.

</domain>

<decisions>
## Implementation Decisions

### About area look
- **D-01:** The area is set off from the tool by a thin top border (separator). After it comes a small, muted (`text-muted-foreground`, 14px) "About this tool" heading, then the two disclosures. No tinted panel and no new surface color.
- **D-02:** The "About this tool" heading is a real `<h2>` (outline: h1 = tool name, h2 = About), styled small and muted rather than in the current 20px section-heading style.
- **D-03:** Summary rows look muted and secondary. Open content uses today's readable styling: normal foreground colors, 16px body, and the existing Q (14px semibold) / A (16px muted) typography.
- **D-04:** The About area starts `mt-16` below the tool (more than the current `mt-12` section spacing).

### Disclosure structure
- **D-05:** Summary labels are plain, with a count: "Worked example" and "FAQ (N questions)", where N is derived from `faqItems.length`, never hard-coded.
- **D-06:** The FAQ is one `<details>` holding a flat Q/A list, like today's layout. Individual questions are not nested `<details>`.
- **D-07:** Hide the native marker and use lucide `ChevronRight` (already installed), rotated 90° via CSS when `[open]`. It must look the same in all browsers.
- **D-08:** Each `<summary>` gets the existing focus-visible ring style (reuse the Button component's focus-visible classes). Hover darkens the text toward the foreground color.

### Config worked example
- **D-09:** Use a small mixed Cisco IOS snippet (~11 lines) that exercises every highlighter token kind. Only RFC 5737 addresses (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24), and no secrets, passwords, keys or community strings. Baseline, agreed with the user:
  ```
  hostname edge-rtr-01
  !
  interface GigabitEthernet0/1
   description Uplink to ISP
   ip address 192.0.2.1 255.255.255.252
  !
  ip access-list extended MGMT-IN
   remark allow SSH from docs net
   permit tcp 198.51.100.0 0.0.0.255 any eq 22
  !
  ip route 0.0.0.0 0.0.0.0 192.0.2.2
  ```
- **D-10:** Show the highlighted output only, rendered like the tool's preview pane. No separate plain-input block.
- **D-11:** Render it at build time in the server component by calling the real `highlightConfig` from `lib/config/highlight.ts`, so the example can't drift from the tool. Fallback, only if that proves not to be server-safe: a static pre-highlighted sample. (Scout note: `highlight.ts` is pure TS with no browser APIs, so the server path is expected to work.)
- **D-12:** Add one short sentence under the example: rich copy keeps these colors and monospace formatting when pasted into email/docs, and plain copy gives the raw text. No buttons inside the example.

### Config FAQ & page layout
- **D-13:** The Config FAQ covers these four topics, which the user selected (meets the 4–6 minimum):
  1. Privacy: is my config uploaded? (No; all local in the browser. Add a gentle tip to strip secrets before sharing anyway.)
  2. Pasting into Outlook/Word/Google Docs: how rich copy keeps colors and monospace, and when to use plain copy or monochrome.
  3. Supported syntax/vendors: Cisco IOS-style profile plus the "plain" profile, and what happens with other vendors' configs.
  4. Monochrome/printing: what the monochrome option is for (print, grayscale docs, accessibility).
- **D-14:** Keep Config's intro paragraph under the h1 and the page's `max-w-6xl` width (the editor/preview needs it). Constrain only the About area to `max-w-3xl` so its line length matches the other tools.

### Planning-time decisions (user-approved during /gsd-plan-phase, 2026-11-11)
- **D-15:** Config privacy wording uses ONLY the shipped claim "never uploaded or saved". The UI-SPEC draft's stronger wording ("never uploaded, stored or sent... gone when you close or reload") is not used. Hash's forbidden-phrase list does not apply to Config.
- **D-16:** Icons appear only on landing cards. CFG-03 and ROADMAP Phase 10 SC-4 are amended to say Config's `FileTerminal` icon shows on its landing card. The rule that every registered icon resolves explicitly, with no silent fallback, stays.
- **D-17 (amends D-12 and D-13 item 2):** The rich-copy claim is softened: rich copy *should keep* colors and monospace formatting when pasted into email/docs. Nobody has checked this in Outlook, Word or Google Docs, so the firm "keeps" claim does not ship.
- **D-18:** The CLAUDE.md "no avoidable CLS" constraint is deferred to Phase 14, which owns the Lighthouse/CLS gate. The baseline already has non-zero CLS (up to 0.183 at 375px on UUID, Subnet, DNS and MAC) before Phase 10. Phase 10 re-measures CLS after the change and reports it; it does not gate on it.

### Claude's Discretion
- Exact FAQ answer wording for Config, accurate to the shipped `ConfigTool`/`lib/config` behavior. Claude may add at most 2 more items (to a 6 maximum) if a clearly useful topic appears while writing.
- How per-tool worked-example markup is shared: a children/slot in `ToolAbout` vs a data-driven `ExampleFields` helper. Existing worked-example bodies should be preserved, not redesigned.
- Whether to keep the existing `data-testid`s (`{slug}-worked-example`, `{slug}-worked-example-*`, `{slug}-faq-item`). Keep them where possible, to minimize e2e churn.
- Where `faq-data.ts` lives for Config (follow the `app/tools/<slug>/faq-data.ts` convention).
- Exact separator/border token, chevron size, and summary padding, consistent with the existing Tailwind scale.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 10 goal, success criteria 1–5, research flags, milestone-level locked decisions
- `.planning/REQUIREMENTS.md` — INFO-01..05, CFG-01..03

### Research
- `.planning/research/SUMMARY.md` — Phase A deliverables (ToolAbout, FaqJsonLd + `lib/seo/jsonld.ts`, `summary` keyboard guard), pitfall #4 (toBeVisible on collapsed content), pitfall #5 (Enter on `<summary>`)
- `.planning/research/ARCHITECTURE.md` — shared About component / JSON-LD builder architecture
- `.planning/research/PITFALLS.md` — disclosure rollout and keyboard pitfalls
- `.planning/research/FEATURES.md` — About/Config parity feature expectations
- `.planning/research/STACK.md` — native `<details>` vs Radix rationale; `FileTerminal` in lucide-react 1.25.0

### Project
- `.planning/PROJECT.md` — core value, UX non-negotiables (keyboard-first, one-click copy)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/config/highlight.ts` — `highlightConfig(config, profile)` → tokens and `buildConfigHtml(...)`; pure TS, usable from a server component for the Config worked example (D-11).
- `app/tools/{uuid,subnet,dns,mac,hash}/faq-data.ts` — existing `faqItems` plus worked-example constants; feed the shared component and JSON-LD builder.
- `components/ui/button.tsx` — source of the focus-visible ring classes to reuse on `<summary>` (D-08).
- `lucide-react` — `ChevronRight` (D-07), `FileTerminal` (CFG-03).

### Established Patterns
- Every tool page is a Server Component shell (`page.tsx`) plus a client `*ToolLoader` (`ssr:false`). The About area belongs in the server shell.
- Each of the five pages currently duplicates a `faqJsonLd` object plus a `<script type="application/ld+json" dangerouslySetInnerHTML=...replace(/</g, "\\u003c")>`. These are replaced by the one shared builder (INFO-05).
- Section typography today: h2 `text-[20px] font-semibold`, question `text-[14px] font-semibold`, answer `text-[16px] text-muted-foreground`.
- Pages use `max-w-3xl`, except Config (`max-w-6xl` with an inner `max-w-3xl` intro).

### Integration Points
- `lib/hooks/useKeyboardShortcut.ts:62` — the `isInteractiveTarget` selector `'button, [role="button"], [role="radio"], a[href]'` lacks `summary`. Add it and a unit test (INFO-04).
- `components/ToolCard.tsx:26-43` — `ICONS` map lacks `FileTerminal`, and `ICONS[tool.icon] ?? Fingerprint` is the silent fallback to remove. Add a test that fails when any registry icon lacks an explicit entry (CFG-03).
- `tools/registry.ts:98` — Config currently has `icon: "Network"` (same as Subnet). Change it to `"FileTerminal"`.
- Only `ToolCard` renders registry icons today. The planner must check how "nav" and "on its page" icon display (roadmap SC-4) maps onto `SiteHeader`/`MobileNav` and the Config page, and whether other tool pages show an icon there.
- `tests/e2e/{uuid,subnet,dns,hash}-seo.spec.ts` — use `toBeVisible()` on content that will be collapsed. Add a shared `openAbout` helper. There is no MAC SEO spec today; add `config-seo.spec.ts` (required by SC-5).
- `app/tools/config/page.tsx` — has no JSON-LD or About yet.

</code_context>

<specifics>
## Specific Ideas

- Visual reference agreed with the user:
  ```
  [ tool output ............ ]

  ────────────────────────────
  ABOUT THIS TOOL   (muted, 14px, <h2>)
  ▸ Worked example
  ▸ FAQ (5 questions)
  ```
- Config example snippet: see D-09 (baseline, agreed with the user).

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within phase scope.

</deferred>

---

*Phase: 10-shared-about-section-config-parity*
*Context gathered: 2026-11-11*
