# Phase 14 deferred items

## From 14-04 (found, out of scope, not fixed)

- `lib/password/boundaries.test.ts` fails 5 tests ("only random.ts names the Web Crypto sampling method" and four in-memory mutant tests). Cause: `app/tools/password/faq-data.ts` line 107 (added by 14-02, commit e5bab08) contains the literal text `crypto.getRandomValues` inside an FAQ answer string, which the boundary guard treats as a call outside `lib/password/random.ts`. Reproduces without any 14-04 change. Fix options: reword the FAQ answer (for example "the browser's Web Crypto random source") or teach the guard to ignore string content. Owner: 14-02 follow-up or the phase verification plan (14-08).

**RESOLVED in 14-05 (pre-step, Rule 1):** FAQ Q2 reworded to "your browser's cryptographically secure random number generator (the Web Crypto API)"; `faq-data.test.ts` updated; the boundary guard is untouched. Full `npx vitest run` green (78 files, 1403 tests). The wording is a UAT human-check.
  status: acknowledged

## From 14-08 (found by the local Lighthouse advisory, out of scope, not fixed)

- Accessibility 96 on /tools/password and /tools/subnet (local `next start`): `color-contrast` fails on the shared site footer (muted-foreground #64748b on #f1f5f9 measures 4.34:1, 4.5:1 required) for the footer paragraph and the Privacy link. Site-wide component, not introduced in Phase 14. Re-check on the Vercel preview before the 90+ capture (the score is already above 90).
- Best-practices 96: `errors-in-console` is a 404 for `/_vercel/insights/...` (Vercel Analytics script), which only exists on a Vercel deployment. Expected locally; should vanish on the preview.
  status: acknowledged
