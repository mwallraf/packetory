# Phase 13 — UI Review

**Audited:** 2026-11-11
**Baseline:** 13-UI-SPEC.md (approved design contract)
**Screenshots:** captured (desktop 1440x900, mobile 375x812, 320x900, batch `?n=5` at 1440x900) in `.planning/ui-reviews/13-20261111-232324/` (gitignored)
**Interaction captures:** off (workflow.ui_interaction_capture is false). Interaction findings below come from reading the code.

Out of scope (Phase 14): the final CLS gate and skeleton pin, removing `noindex`, the nav/registry entry, ToolAbout/FAQ. Their absence is not scored.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every contract string matches word for word, and the numbers come from constants |
| 2. Visuals | 3/4 | The borderless "Copy" looks weaker than the outlined "Regenerate", and the slider scale floats far from its track |
| 3. Color | 4/4 | The accent is used only on the reserved elements, the contrast rules are followed and no hex values are hardcoded |
| 4. Typography | 4/4 | Exactly 4 sizes (14/16/20/32) and 2 weights (400/600). The shadcn defaults are overridden |
| 5. Spacing | 3/4 | `px-2.5` (10px), which the contract forbids, is used on the row copy button. The `h-11` slider leaves an oversized gap |
| 6. Experience Design | 3/4 | All the states are covered, but the row copy button can wrap onto its own line when "Copied!" shows (layout jump) |

**Overall: 21/24**

---

## Top 3 Priority Fixes

1. **Row copy button uses `px-2.5` (10px)** (WARNING), `PasswordRow.tsx:54`. This breaks the contract rule "Do not use 10px (`py-2.5`) … anywhere on this page". It also changes the button's width compared with the hero and Copy all buttons (`px-4`). Fix: change it to `px-2` (8px, icon-only resting state stays at 44px through `min-w-11`) or to `px-4`, so it matches the other copy controls.
2. **Copy and Regenerate look the wrong way round** (WARNING), `PasswordOutput.tsx:87` vs `:109` (and `:148` vs `:170` in batch). In the screenshots, the outlined Regenerate pill has more visual weight than the ghost, borderless Copy. The primary CTA reads as secondary until it is hovered. Fix: keep the accent on Copy, but give it a visible resting container, for example `border border-primary/40` or `bg-background`, so it outweighs the neutral Regenerate outline. Another option is to make Regenerate a ghost button too.
3. **Row reflows when "Copied!" shows** (WARNING), `PasswordRow.tsx:39`. The `<li>` uses `flex flex-wrap`. When the icon-only button grows to `Check` + "Copied!" (about 100px), the button can wrap below the value at 320px and jump back after 2s. This layout jump happens in the middle of the user's action. Fix: remove `flex-wrap` from the row, put the copy-error `<p>` outside the flex row (or in a wrapping column), and give the button a fixed `w-[…]`/`min-w` that fits "Copied!". The other option is to keep the row copy icon-only in the confirmed state (`Check` only, with the `aria-label` "Copied!").

Further recommendations (minor):
4. **The slider scale is visually detached from the track** (`PasswordOptionsPanel.tsx:160-165`). With `h-11` on the range input, the track sits in the middle of 44px, so "4" and "128" end up about 40px below it (desktop screenshot). Fix: move the scale numbers closer with `-mt-2`, or wrap the input in an `h-11` flex container and give the input itself a smaller height. Either way the 44px hit area stays.
5. **Unbalanced options grid**: the Character sets column (4 rows of `min-h-11`) is much taller than Symbol set, which leaves about 120px of empty right column on desktop. Avoid look-alikes and Batch count then line up with that empty space. It is acceptable under Decision 7, but consider moving Batch count into the empty space next to the lower switches.
6. **The copy-failure text in the batch toolbar uses `text-muted-foreground`** (`PasswordOutput.tsx:179`). This is allowed because it sits on `bg-background`, but the hero and row failure lines use `text-foreground`, so the same message has two different emphasis levels. Make them consistent.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)
- The h1, CTAs ("Copy", "Regenerate", "Copy all"), accessible names (`Copy password`, `Copy password {n}`, `Copy all passwords`, "Copied!"), the three symbol-hint states (`PasswordOptionsPanel.tsx:83-85`), the lock hint (`:227`), the validation lines (`:176`, `:309`) and both error sentence pairs (`PasswordOutput.tsx:26-32`) all match the Copywriting Contract exactly.
- Live-region phrases are typed as a union (`PasswordTool.tsx:32-38`), so a stray phrase would not compile. This is good practice.
- The numbers come from constants (`LENGTH_MIN/MAX`, `BATCH_MIN/MAX`, `SYMBOL_SET_MAX`), and the look-alikes hint is built from `LOOK_ALIKES`.
- Observation (no deduction): "copy (single password)" in the shortcut line reads awkwardly, but the contract locks this wording.

### Pillar 2: Visuals (3/4)
- The focal point is correct. The 20px/600 mono password is the first element under the h1 at 320px and at 1440px (screenshots), and the options sit below it.
- WARNING: the CTA hierarchy is inverted visually. Copy is a ghost button with accent text, and Regenerate is an outlined pill (Fix 2).
- WARNING: the slider's min/max scale is detached from the track (Fix 4).
- Minor: the right column of the options grid is unbalanced on desktop (Fix 5).
- The icon-only row copy has an `aria-label`, and all icons are `aria-hidden`. The batch view (toolbar count, Copy all, Regenerate, divided list) reads clearly.

### Pillar 3: Color (4/4)
- Accent use: `text-primary` appears only on the hero Copy, Copy all and row copy (3 sites). The other accent uses are `accent-primary` on the range input and the stock `data-checked:bg-primary` on the Switch. There is no accent on Regenerate, hints or borders, as the reserved list requires.
- No hex or `rgb()` literals appear. The only palette classes are the sanctioned `sky-700/sky-300` and `amber-700/amber-300` in `ColoredPassword.tsx:3-7`.
- Contrast rules are followed. Text inside the hero and rows (copy errors) is `text-foreground` (`PasswordOutput.tsx:118`, `PasswordRow.tsx:68`). The error panel is `bg-background` (`PasswordOutput.tsx:41`). The muted batch count sits on the background toolbar.
- Distribution is about 60/30/10 in the screenshots: a white page, a slate-50 hero/list and sparse cyan.

### Pillar 4: Typography (4/4)
- Sizes used: `text-[14px]` ×18, `text-[16px]` ×2, `text-[20px]` ×2, `text-[32px]` ×1, plus `text-base` on inputs (16px). Weights used: `font-normal` ×10 and `font-semibold` ×13. There is no `font-medium` or `font-bold`.
- The shadcn `Label` defaults (`text-sm leading-none font-medium`) are overridden by `LABEL_CLASS` (`PasswordOptionsPanel.tsx:53`) through tailwind-merge. `SET_LABEL_CLASS` keeps the label at full contrast when a switch is disabled (`peer-disabled:opacity-100`), as the contract requires.
- The hero uses line height 1.4, and the 128-character wrap stays clean in the 320px proof cited in 13-06.

### Pillar 5: Spacing (3/4)
- Spacing classes used: `gap-2` ×17, `gap-4` ×3, `gap-6`, `gap-8`, `p-4` ×2, `px-4` ×6, `py-1`, `py-2`, `mt-4`, `mt-6`, `mt-8`, `mt-1` (icon optical offset, 4px) and `px-1` (kbd). All of these are on the 4px scale.
- WARNING: `px-2.5` at `PasswordRow.tsx:54` is an explicitly forbidden 10px value (Fix 1).
- WARNING: the `h-11` range input adds about 18px of empty space above and below the track inside `gap-2`, so the Length block looks loosely spaced (Fix 4).
- The arbitrary skeleton heights `h-[980px] sm:h-[712px]` and `h-[124px] sm:h-[124px]` (`PasswordToolLoader.tsx:31-33`) are the sanctioned provisional pins. `sm:h-[124px]` is redundant but harmless. The final pin belongs to Phase 14.

### Pillar 6: Experience Design (3/4)
- State coverage is strong:
  - Skeleton during the `ssr:false` load, with no text.
  - Fail-closed error panel with `role="alert"` that replaces all output and actions.
  - Lock hint plus a disabled last switch.
  - Inline validation with `aria-invalid` and `aria-describedby`, and blur-clamp.
  - Copy-failure text for every copy target.
  - A live region with fixed phrases that clears and re-sets so repeated messages are announced again.
  - Esc reset that needs no confirmation (only options are reset, which the contract allows).
- The autofill opt-out attributes are present (`PasswordOptionsPanel.tsx:47-50`), and nothing sits inside a `<form>`.
- WARNING: the batch row reflows while the copy confirmation shows (Fix 3).
- Observation: Ctrl/Cmd+C does nothing in batch mode (by design, D-14). The shortcut hint says "(single password)", so this is disclosed.
- Interaction states such as the focus ring and the Copied! visuals were not captured (capture is off). Those findings come from the code.

---

## Registry Safety

Registry audit: 0 third-party blocks checked, no flags (`components.json` `registries: {}`, no new shadcn components this phase).

---

## Files Audited
- app/tools/password/page.tsx
- app/tools/password/PasswordToolLoader.tsx
- app/tools/password/PasswordTool.tsx
- app/tools/password/PasswordOptionsPanel.tsx
- app/tools/password/PasswordOutput.tsx
- app/tools/password/PasswordRow.tsx
- app/tools/password/ColoredPassword.tsx
- components/ui/label.tsx
- lib/password/constants.ts
- .planning/phases/13-password-generator-page/13-UI-SPEC.md, 13-06-SUMMARY.md
