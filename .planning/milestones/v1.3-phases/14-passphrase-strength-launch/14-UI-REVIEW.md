# Phase 14 — UI Review

**Audited:** 2026-11-12
**Baseline:** 14-UI-SPEC.md (status: approved; note: its "Checker Sign-Off" checkboxes are still unticked and the footer reads "Approval: pending")
**Screenshots:** captured (static CLI 3/3, but `npx playwright screenshot` only caught the pre-hydration skeleton on `next dev`; a scripted Playwright pass then captured hydrated states: password 1440 / 320, passphrase 1440, passphrase 20-word cap+num 320 dark, passphrase batch n=5 at 320, About opened at 375, nav at 640/700) in `.planning/ui-reviews/14-20261112-005855/` (git-ignored)
**Interaction captures:** off (workflow.ui_interaction_capture is false). Interaction findings below come from the code and from computed-style measurements taken in the scripted pass. No states were driven by clicks or keys except opening `<details>`.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every rendered string checked matches the contract verbatim. Numbers come from constants (77 bits, 7,776, 3.3 bits) |
| 2. Visuals | 3/4 | Clear hierarchy. But with the `-` separator, line wraps leave a trailing `-` that looks like hyphenation, and the 320px scenario toggle stacks into two separate rows |
| 3. Color | 3/4 | Accent stays within the reserved list (measured: selected toggle = cyan-700 light, #22d3ee dark). Copy uses a hard-coded hex `bg-[#0e7490]` where the toggle uses `cyan-700`, so the same shade is written two ways |
| 4. Typography | 4/4 | Exactly 4 sizes (14/16/20/32) and 2 weights (400/600) across the island. `text-base` appears only on inputs (16px) |
| 5. Spacing | 3/4 | No banned 6/10/12px values. In passphrase mode the sm grid is unbalanced: Separator is about 70px tall next to a right column of about 180px. Switch hints also sit visually detached from their switches |
| 6. Experience Design | 3/4 | Full state coverage: loading, error with Retry, crypto error, batch, and reduced motion. But the first paint is a 960px or 1374px blank reserve, and the `?n>1` passphrase bookmark shift is still unresolved |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **The `-` separator is ambiguous at line wraps (WARNING).** In the hero and batch rows at 320px, lines end in `-` (for example `rival-fax-` / `amends`, `vividness-old-` / `carless-…`), and EFF hyphenated words such as `t-shirt` make this worse. A user who retypes from the screen can't tell a separator from a wrap. **Fix:** in passphrase mode, render the separator inside a `whitespace-nowrap` span joined to the *next* word. Alternatively emit `<wbr>` *before* the `-` so a wrapped line starts with `-`. Either way, copy is unaffected.
2. **Passphrase Options grid is unbalanced at sm and up (WARNING).** At 1440px the Separator cell ends at about y=938, and the right column (Capitalize plus hint, Append plus hint) runs to about y=1050. That leaves a large empty block under Separator. Separator's label (y=875) is also not aligned with the Capitalize row (centred at y=887), so the two columns have different baselines. **Fix:** put the Separator cell in its own row 2 at `sm:col-span-2`, and put Capitalize and Append side by side in row 3 (one per column). Or add `sm:pt-3` alignment, but use a token on the 4px scale (`pt-2`/`pt-4`, since 12px is banned).
3. **Blank first paint and unresolved batch-bookmark shift (WARNING).** `PasswordToolLoader.tsx:24,33` reserves `h-[960px] sm:h-[1374px]`, but only the top group (mode, hero, strength, about 425px at 1440px) has visible blocks. The rest of the reserve, about 600 to 900px, is empty white. On a slow dev or first-load chunk, users see a long blank page with "About this tool" pushed far down. Also, `PasswordOutput.tsx:107-108` sizes loading and error at the 1-row hero height (122/178px), so `?mode=passphrase&n=5` resolves into 590px (measured). That is the UI-SPEC E2-bookmark-batch item, which is still unresolved. **Fix:** add neutral `bg-secondary` placeholder bars for the Options heading and controls inside the skeleton, so the reserve reads as loading rather than empty. Then size the wordlist loading block from `n` (rows × measured row height), or confirm the accepted shift at UAT.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- These strings were verified against the contract in the hydrated screenshots: intro, `Mode` / `Password` / `Passphrase`, `Strength`, `Strong · 77 bits`, `7,776 words × 6 · 77 bits`, `About 350 thousand years to crack, on average`, the fast-hash assumption verbatim, `Attack scenario` / `Fast hash` / `Slow hash (bcrypt)`, `Capital first letter on every word. Adds 0 bits.`, `A random digit after the last word. Adds about 3.3 bits.`, the EFF credit line, the passphrase shortcut line, `5 passphrases`, `Copy all`, and `FAQ (6 questions)`.
- The less/more-than exception works: the 20-word state reads `More than a trillion years to crack, on average` with no "About".
- The append-number pool line `7,776 words × 20 + 1 digit · 261 bits` matches the contract template.
- Copy failure keeps the contract wording (`PasswordRow.tsx:10`).
- Minor: at 320px the shortcut line wraps between a `<kbd>` and its verb (`Enter` / `regenerate`). This is cosmetic. Consider `whitespace-nowrap` per shortcut pair.

### Pillar 2: Visuals (3/4)
- The focal point is correct. The mono hero value sits in `bg-secondary`, the filled accent Copy pill is under it, then neutral Regenerate, then the quiet bordered strength card where only the 8px strip is colored.
- WARNING: wrap ambiguity with the `-` separator (Fix 1).
- WARNING: at 320px the Attack scenario `ToggleGroup` wraps to two rows, each item on its own line (`Fast hash` above `Slow hash (bcrypt)`). The spec allows this, but it reads as two unrelated buttons. Consider shortening to `Slow (bcrypt)` / `Fast` at narrow widths, or a `grid-cols-2` group that fills the 254px width.
- Icon-only row copy buttons have accessible names (`Copy passphrase {i}`) per spec. Not re-verified in the a11y tree because interaction capture was off.
- The nav at 640px shows 7 links on one line with the logo and theme toggle visible (nav640.png). At 1440px the active `Password` link is underlined in the accent.

### Pillar 3: Color (3/4)
- Accent usage counts in the island: `accent-primary` ×1 (range), filled copy ×2 (`PasswordOutput.tsx:200,268`), row icon `text-primary` ×1 (`PasswordRow.tsx:76`), toggle selected ×1 class (`toggle-classes.ts:8`). All are on the reserved list. Regenerate and Retry are neutral. Links are `text-foreground underline`.
- Measured computed styles: the selected toggle is `lab(44.7…)` (cyan-700) on `primary/10` in light mode and `rgb(34,211,238)` in dark mode. Unselected toggles are foreground. This conforms.
- Meter: `bg-emerald-700/300` for Strong and Very strong, visible in light (3/4) and dark (4/4) screenshots. The label text stays foreground.
- WARNING: `bg-[#0e7490] hover:bg-[#155e75]` are raw hex values (`PasswordOutput.tsx:200,268`), while `toggle-classes.ts` uses the equivalent `text-cyan-700`. Replace them with `bg-cyan-700 hover:bg-cyan-800` so one palette expression is used.
- Note (not Phase 14 surface): the Lighthouse advisory measured the site-wide footer muted text at 4.34:1, which fails AA for normal text. This belongs to `components/SiteFooter.tsx`.

### Pillar 4: Typography (4/4)
- Size distribution (non-test files): `text-[14px]` ×32, `text-[16px]` ×6, `text-[20px]` ×3, `text-[32px]` ×1, `text-base` ×6 (16px inputs). That is exactly the contract's 4 sizes.
- Weights: `font-normal` ×20, `font-semibold` ×21. No `font-medium` or `font-bold` leaks, and the toggle overrides the base `font-medium`.
- Separator captions are mono for `- _ .` and sans for `Space`, as the screenshot shows. Figures use `tabular-nums`.

### Pillar 5: Spacing (3/4)
- No banned spacing values: grep for `gap-1.5`, `px-2.5`, `py-2.5`, `gap-3`, `mt-3`, `px-3`, `p-3` returns no matches under `app/tools/password`.
- All 44px targets were measured at 44px tall (mode, scenario and separator items) with 16px horizontal padding (`px-4`).
- Arbitrary values appear only as pinned heights (`h-[122px]`, `h-[178px]`, `h-[225px]`, `h-[348px]`, `h-[960px]`, `h-[1374px]`) and `ring-[3px]`, all sanctioned by the spec. Of these, 122, 178, 348, 960 and 1374 are not multiples of 4. They are measurements, so this is acceptable, but they will drift as soon as any copy changes.
- WARNING: the column imbalance and baseline mismatch in the passphrase grid (Fix 2).
- WARNING: switch rows are `min-h-11` followed by `gap-2`, so the hint lands about 30px below the label's baseline (for example `Capitalize words` at y=887 and the hint at y=927 at 1440px). The hint reads as belonging to the next control as much as to its own. Consider putting the hint inside the label column (`flex-col` next to the switch) so it indents under the label text.

### Pillar 6: Experience Design (3/4)
- State coverage in code: the wordlist loading block has `animate-pulse` and `motion-reduce:animate-none` (`PasswordOutput.tsx:116`). The error panel with Retry uses the same min-height as loading (`PasswordOutput.tsx:107-108`). The crypto error panel, batch all-or-nothing, the strength panel rendered in every state, and the skeleton pulse respecting reduced motion (`PasswordToolLoader.tsx:37`) are all present. Destructive confirmation is not applicable.
- No horizontal overflow (`scrollWidth − clientWidth = 0`) in any captured state, including the 20-word, space-separated, capitalized passphrase with a number at 320px in dark mode, and the 5-row batch at 320px.
- The skeleton strength block (225 sm / 348 base) matches the measured island (224.8 / 348.0). The hero (122) matches as well.
- WARNING: the blank reserve and the batch bookmark shift (Fix 3).
- WARNING: the URL `?mode=passphrase&n=5&sep=_` rendered with `-` selected, so the `_` value was not honored. Either the param uses another token (for example `underscore`) or invalid values fall back silently. That fallback follows the contract (E3-partial), but a hand-edited bookmark gives no feedback. Confirm the canonical `sep` token is documented in the About or FAQ, or accept the literal `_`.
- Keyboard flows (`/`, Enter, Esc, Ctrl/Cmd+C, roving focus) were not exercised because interaction capture was off. The evidence for them is the test suites (`PasswordTool.keyboard.test.tsx` and the others), not this audit.

Registry audit: 0 third-party blocks (`components.json` `registries: {}`), no flags.

---

## Files Audited
- app/tools/password/{page,PasswordTool,PasswordToolLoader,PasswordOutput,PasswordRow,ModeToggle,PassphraseOptionsPanel,PasswordOptionsPanel,option-controls,StrengthPanel,PasswordExample,ColoredPassword}.tsx, toggle-classes.ts, faq-data.ts, eff-links.ts
- components/ToolCard.tsx, components/SiteHeader.tsx (nav at 640/700), tools/registry.ts
- .planning/phases/14-passphrase-strength-launch/14-UI-SPEC.md
- Screenshots: .planning/ui-reviews/14-20261112-005855/*.png
