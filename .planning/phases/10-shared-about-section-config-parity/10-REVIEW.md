---
phase: 10-shared-about-section-config-parity
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - app/tools/config/ConfigExample.test.tsx
  - app/tools/config/ConfigExample.tsx
  - app/tools/config/ConfigTool.tsx
  - app/tools/config/faq-data.test.ts
  - app/tools/config/faq-data.ts
  - app/tools/config/page.tsx
  - app/tools/dns/page.tsx
  - app/tools/hash/page.tsx
  - app/tools/mac/page.tsx
  - app/tools/pages-about.test.ts
  - app/tools/subnet/page.tsx
  - app/tools/uuid/page.tsx
  - components/ToolAbout.test.tsx
  - components/ToolAbout.tsx
  - components/ToolCard.test.tsx
  - components/ToolCard.tsx
  - lib/config/token-classes.ts
  - lib/hooks/useKeyboardShortcut.test.ts
  - lib/hooks/useKeyboardShortcut.ts
  - lib/seo/jsonld.test.ts
  - lib/seo/jsonld.ts
  - tests/e2e-prod/about-prod.spec.ts
  - tests/e2e/about.spec.ts
  - tests/e2e/config-seo.spec.ts
  - tests/e2e/dns-seo.spec.ts
  - tests/e2e/hash-seo.spec.ts
  - tests/e2e/helpers/about-parity.ts
  - tests/e2e/helpers/about.ts
  - tests/e2e/subnet-seo.spec.ts
  - tests/e2e/uuid-seo.spec.ts
  - tools/registry.test.ts
  - tools/registry.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

The shared `ToolAbout` component, the single JSON-LD builder, the Config worked example and FAQ, and the registry/icon changes are sound. The JSON-LD path escapes `<`, there is exactly one raw-HTML injection point, and the FAQ prose and JSON-LD come from the same array. The Config FAQ copy matches the highlighter and clipboard behavior, which I checked against `lib/config/highlight.ts` and `ConfigTool.tsx`. No security issues found.

The main concern is a behavioral interaction. The phase puts long, selectable prose and copy-worthy values (UUIDs, CIDR fields, shell one-liners) at the bottom of every tool page. The global keyboard shortcuts in the tools are not scoped away from that area. The Enter-on-summary fix addresses only one of the resulting conflicts. A second gap is that the production-build parity spec, which SC-2 says must hold on the shipped build, is not run by CI.

## Warnings

### WR-01: Ctrl/Cmd+C on selected About text overwrites the clipboard with the tool's hero value (Subnet, UUID)

**File:** `app/tools/subnet/SubnetTool.tsx:297-302`, `app/tools/uuid/UuidTool.tsx:102-111` (surfaced by `lib/hooks/useKeyboardShortcut.ts:127-134`)
**Issue:** The hook fires `copy` for Ctrl/Cmd+C whenever focus is not in an editable field. It never checks for an active text selection and does not `preventDefault`. Phase 10 adds worked examples and FAQ answers below each tool. A user who selects a value there (for example the sample v4 UUID, `Network: 10.0.0.0`, or a `printf ... | sha256sum` line) and presses Ctrl+C triggers the tool's async copy of its own hero value, which replaces the selection on the clipboard.
- `SubnetTool` (`copy: () => copyHero(heroValue)`) and `UuidTool` (`copy(primaryValue)` when `count === 1`) have no selection guard.
- `HashTool` already guards this (`window.getSelection()?.toString() !== ""` returns early), so the problem is known and handled in one tool only.
- DNS and MAC bind no `copy` handler, so they are unaffected.

The About area makes this reachable on every page. Before this phase there was little selectable non-tool text.
**Fix:** Fix once in the hook rather than per tool:
```ts
if (isCopyChord && !editable) {
  // A native copy of selected page text must win over the tool shortcut.
  if ((window.getSelection()?.toString() ?? "") !== "") return;
  current.copy?.();
}
```
Add a hook unit test with a non-empty selection. The `HashTool` guard can then be removed.

### WR-02: Global Escape resets tool state while focus is inside the About area (Hash, MAC, Subnet)

**File:** `lib/hooks/useKeyboardShortcut.ts:119-125` (handlers: `HashTool.tsx:213-216`, `MacTool.tsx:605-608`, `SubnetTool.tsx:299`)
**Issue:** Escape has no target guard. A user who typed or pasted a value, then scrolled to the FAQ and pressed Esc (a natural way to dismiss or blur a focused `summary`, or to clear a selection), silently loses their work: Hash resets to the sample text, MAC to the demo address, Subnet to the default CIDR. The INFO-04 fix covers only Enter on a `summary`; the same self-contained-control reasoning does not extend to Escape, so the About area still interacts with a global destructive shortcut. Hash is the worst case because its input can be large pasted text.
**Fix:** Scope the destructive handlers to the tool, or have the hook ignore Escape when the event target is inside `[data-testid="about-tool"]`, for example `target.closest("[data-about]")`. Add a data attribute to `ToolAbout` for this instead of relying on the testid. Add an e2e control, in the same style as the INFO-04 tests, that Esc on a summary does not reset the tool.

### WR-03: The production-build About parity spec is not run anywhere automated

**File:** `tests/e2e-prod/about-prod.spec.ts:1-25`, `.github/workflows/ci.yml`
**Issue:** The spec exists so that SC-1/SC-2 (raw server HTML, closed `<details>`, matching JSON-LD) are proven on the build that ships. `.github/workflows/ci.yml` runs only typecheck, lint, vitest and `build`. There is no job for `npm run test:e2e` or `npm run test:e2e:prod`, and nothing else invokes them. The property the spec exists to guard can regress without any gate failing. The same applies to the `tests/e2e/*-seo.spec.ts` and `about.spec.ts` changes in this phase.
**Fix:** Add a CI job that installs Playwright browsers and runs `npm run test:e2e:prod` at least for the `about-prod` spec. If this is intentionally manual, record that in the phase verification notes rather than describing the property as guarded.

## Info

### IN-01: `FaqItem` is defined seven times

**File:** `lib/seo/jsonld.ts:11`, `app/tools/{config,dns,hash,mac,subnet,uuid}/faq-data.ts` (for example `app/tools/config/faq-data.ts:15-18`)
**Issue:** The shared `FaqItem` in `lib/seo/jsonld.ts` is the type `ToolAbout` consumes, yet each `faq-data.ts` still declares its own identical structural copy. They are compatible today, so nothing is broken, but the stated goal of INFO-05 is that structured data and visible content cannot drift, and the type contract can drift silently (for example if a field is added to one).
**Fix:** In each `faq-data.ts`, replace the local type with `import type { FaqItem } from "@/lib/seo/jsonld"` and re-export it if other modules use it.

### IN-02: FAQ summary label is ungrammatical for exactly one question

**File:** `components/ToolAbout.tsx:75`
**Issue:** `` `FAQ (${faqItems.length} questions)` `` renders "FAQ (1 questions)", and "FAQ (0 questions)" for an empty array. The unit test pins only the 4 and 6 cases, and the structural guard requires at least 4 items, so this is latent.
**Fix:** `` `FAQ (${n} ${n === 1 ? "question" : "questions"})` ``.

### IN-03: Unused generality in `ToolAbout` and `FaqJsonLd`

**File:** `components/ToolAbout.tsx:29, 44-49`
**Category:** necessity
**Issue:** `FaqJsonLd` is exported, but the only reference to it is inside `ToolAbout` (grep across `app`, `components`, `lib` and `tests`). The optional `className` prop is passed by no tool page (grep of the six `page.tsx` files) and is exercised only by `ToolAbout.test.tsx`. Neither has a second consumer. This rests on judgment: a `className` hook is cheap and harmless.
**Fix:** Drop the `export` on `FaqJsonLd` and remove `className` until a page needs it, or keep it and accept the small surface.

### IN-04: Fixed sleeps and an unguarded Enter on IME composition in the new e2e/hook paths

**File:** `tests/e2e/about.spec.ts:151, 178, 186`, `lib/hooks/useKeyboardShortcut.ts:109-117`
**Issue:**
- The negative assertions ("no regeneration", "no lookup") use `page.waitForTimeout(500/800)`. These are timing-based and slow, and can pass vacuously on a slow runner. The control assertions after them partly mitigate this.
- Separately, the Escape branch guards IME composition (`isComposing`, `keyCode 229`) but the Enter branch does not. The Enter that confirms an IME candidate in the DNS or Subnet input fires `enter()` (Subnet blurs, DNS runs an immediate lookup mid-composition).

**Fix:** Mirror the Escape guard in the Enter branch: `if (event.isComposing || event.keyCode === 229) return;`. For the e2e checks, prefer `expect.poll` or a deterministic request counter that settles on a known event rather than a fixed sleep.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
