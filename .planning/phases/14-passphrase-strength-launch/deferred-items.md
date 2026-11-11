# Phase 14 deferred items

## From 14-04 (found, out of scope, not fixed)

- `lib/password/boundaries.test.ts` fails 5 tests ("only random.ts names the Web Crypto sampling method" and four in-memory mutant tests). Cause: `app/tools/password/faq-data.ts` line 107 (added by 14-02, commit e5bab08) contains the literal text `crypto.getRandomValues` inside an FAQ answer string, which the boundary guard treats as a call outside `lib/password/random.ts`. Reproduces without any 14-04 change. Fix options: reword the FAQ answer (for example "the browser's Web Crypto random source") or teach the guard to ignore string content. Owner: 14-02 follow-up or the phase verification plan (14-08).

**RESOLVED in 14-05 (pre-step, Rule 1):** FAQ Q2 reworded to "your browser's cryptographically secure random number generator (the Web Crypto API)"; `faq-data.test.ts` updated; the boundary guard is untouched. Full `npx vitest run` green (78 files, 1403 tests). The wording is a UAT human-check.
