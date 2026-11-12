---
phase: "12"
slug: "password-core-library"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
validated: "2026-11-11"
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + fast-check 4.9.0 / @fast-check/vitest 0.4.1 (jsdom default; node env for fs/hash suites) |
| **Config file** | `vitest.config.ts` (no change needed) |
| **Quick run command** | `npx vitest run lib/password lib/analytics` |
| **Full suite command** | `npm test && npm run typecheck && npm run lint` |
| **Estimated runtime** | ~2 seconds (quick), ~12 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/password lib/analytics`
- **After every plan wave:** Run `npm test && npm run typecheck && npm run lint`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | PWD-04 / SC1 | — | Default password end to end via Web Crypto, randomInt, resampling | unit | `npx vitest run lib/password/generate.test.ts` | ✅ | ✅ green |
| 12-01-02 | 01 | 1 | SC3 (PWD-05/06 lib half) | — | Symbol normalization (dedupe, printable ASCII, cap, default restore), look-alike removal before pool size | unit + property | `npx vitest run lib/password/charset.test.ts` | ✅ | ✅ green |
| 12-01-03 | 01 | 1 | PWD-04 / SC1 | — | Full-option-space property; whole-password resampling (no patching); exhaustion at exactly 10,000 attempts leaks no chars | property + unit | `npx vitest run lib/password/generate.test.ts` | ✅ | ✅ green |
| 12-02-01 | 02 | 2 | SC2 / D-04 | — | Max batch x max length through byte-capped fill; count clamping | unit | `npx vitest run lib/password/generate.test.ts` | ✅ | ✅ green |
| 12-02-02 | 02 | 2 | SC2 | — | No modulo bias at rejection boundaries; hard 65,536-byte cap | unit + property | `npx vitest run lib/password/random.test.ts lib/password/nyquist.test.ts` | ✅ | ✅ green |
| 12-02-03 | 02 | 2 | SC2 (PWD-07 lib) | — | Web Crypto absent -> CryptoUnavailableError, no Math.random fallback; nothing draws at import | unit | `npx vitest run lib/password/random.test.ts` | ✅ | ✅ green |
| 12-03-01 | 03 | 2 | SC4 | — | Entropy from options only -> label -> crack text | unit | `npx vitest run lib/password/entropy.test.ts` | ✅ | ✅ green |
| 12-03-02 | 03 | 2 | SC1 bound / SC4 | — | Exact entropy fixtures (~128 bits, 6x log2(7776) + log2(10)), thresholds 40/75/100, acceptance >= 0.5% | unit + property | `npx vitest run lib/password/entropy.test.ts` | ✅ | ✅ green |
| 12-03-03 | 03 | 2 | SC4 | — | Log-space crack time, fast/slow scenarios, finite at L=128, bucket boundaries | unit + property | `npx vitest run lib/password/crack-time.test.ts` | ✅ | ✅ green |
| 12-04-01 | 04 | 2 | SC3 (PHR-03 lib) | — | Generation script, vendored list, memoized dynamic import, passphrase tracer | unit | `npx vitest run lib/password/wordlist.test.ts lib/password/passphrase.test.ts` | ✅ | ✅ green |
| 12-04-02 | 04 | 2 | SC3 | — | Count + SHA-256 pinned, CC BY header strings, deterministic script, loader retry | unit (node) | `npx vitest run lib/password/wordlist.test.ts` | ✅ | ✅ green |
| 12-04-03 | 04 | 2 | SC3 (PHR-01/02 lib) | — | Separators, capitalize, append number, 3-20 clamp, rejection redraw, integrity guard | unit + property | `npx vitest run lib/password/passphrase.test.ts` | ✅ | ✅ green |
| 12-05-01 | 05 | 3 | SC5 (POUT-03 lib) | — | Non-default options through barrel into redaction -> nothing reported, allow-list unchanged | unit | `npx vitest run lib/password/url-state.test.ts lib/analytics/redact.test.ts` | ✅ | ✅ green |
| 12-05-02 | 05 | 3 | SC5 | — | Hostile/malformed params clamp; round trip; idempotence; key whitelist; no output field (type-level) | unit + property + typecheck | `npx vitest run lib/password/url-state.test.ts && npm run typecheck` | ✅ | ✅ green |
| 12-05-03 | 05 | 3 | SC2 / D-04 / D-05 | — | Barrel surface; Math.random / RNG / wordlist / framework guards with in-memory teeth | source guard (node) | `npx vitest run lib/password/boundaries.test.ts lib/password/index.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements (Vitest + fast-check already installed and configured).

Nyquist audit (2026-11-11) added `lib/password/nyquist.test.ts` to close a PARTIAL on SC2's byte cap: the 65,536-byte limit was only proven on the happy password path; it is now also proven on the max passphrase batch (20 x 20 words + number) and under a source that rejects every other draw.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EFF wordlist licence header wording is acceptable (EFF credited under CC BY, both EFF pages linked, "unmodified" stated, CC BY 4.0 International and CC BY 3.0 US named) | SC3 / PHR-03 | Legal/attribution judgement; tests only pin that the strings are present | Open `lib/password/wordlist/eff-large.ts` header and confirm the attribution wording meets CC BY requirements |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 12s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-11
