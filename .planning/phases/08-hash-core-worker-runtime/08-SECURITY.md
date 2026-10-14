---
phase: "8"
slug: "hash-core-worker-runtime"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-14"
---

# Phase 8 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry -> repo | A new third-party runtime dependency (`@noble/hashes`) enters the build | Third-party code (supply chain) |
| main thread -> hash worker | Untrusted user text/Blob crosses into the worker via postMessage; results and errors cross back | User input (potentially sensitive text/files); digests |
| build env -> deployed route | The `HASH_SMOKE` build flag decides whether a test-only route is reachable | Build-time config |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-8-SC | Tampering | `@noble/hashes` install | high | mitigate | Exact pin `"@noble/hashes": "2.4.0"` in `package.json`, single lockfile entry, committed lockfile; later plans installed nothing | closed |
| T-8-01 | Information Disclosure | `app/hash-smoke/page.tsx` | medium | mitigate | `if (process.env.HASH_SMOKE !== "1") notFound()` (page.tsx:18); `robots: { index: false, follow: false }`; absent from registry/sitemap/SiteHeader/MobileNav | closed |
| T-8-02 | Information Disclosure | `lib/hash/worker-core.ts` posted messages | medium | mitigate | No `console.*` calls in non-test `lib/hash`; sentinel test `worker-core.test.ts:184` asserts posts never contain input text | closed |
| T-8-03 | Denial of Service | `runHashJob` / worker lifecycle | medium | mitigate | `job.ts` MessageChannel macrotask yield + AbortSignal; `client.ts` `onerror` terminates/discards worker; prod e2e supersede timing | closed |
| T-8-04 | Tampering | `lib/hash/engine.ts` algorithm selection | high | mitigate | `engine.ts:13` imports only `sha3_256, sha3_512` from `@noble/hashes/sha3.js`; prod tracer pins SHA3 "abc" vectors | closed |
| T-8-05 | Spoofing | worker `onmessage` dispatch | low | accept | See Accepted Risks Log (AR-8-01) | closed |
| T-8-06 | Tampering | SHA3 rows in `lib/hash/engine.ts` | high | mitigate | `engine.test.ts` Keccak-256/512 negative constants; executor mutation check (Keccak swap fails, control passes) | closed |
| T-8-07 | Tampering | CRC32 output (`crc32.ts`, `format.ts`) | medium | mitigate | `engine.test.ts:160` "62" → `0012d20a`, `:318` high-bit → `e8b7be43`; zlib.crc32 property | closed |
| T-8-08 | Tampering | `encodeText` choke point | medium | mitigate | `TextEncoder` only in `lib/hash/source.ts` (non-test); UTF-8 vector tests pass (5) | closed |
| T-8-09 | Repudiation | `ALGORITHMS.notForSecurity` | low | mitigate | `algorithms.test.ts:24` asserts exactly md5, sha1, crc32 flagged | closed |
| T-8-10 | Tampering | `lib/hash/client.ts` result delivery | high | mitigate | `client.ts:81` drops any message whose jobId ≠ current job; cancel posted before new start (`:73`); `client.test.ts` 14 tests | closed |
| T-8-11 | Denial of Service | worker lifecycle / abandoned jobs | medium | mitigate | `dispose`/`terminate` in `client.ts`; loopback supersede test proves worker aborts 8 MiB job | closed |
| T-8-12 | Information Disclosure | `worker-core.ts` error/progress posts | medium | mitigate | Sentinel `SENTINEL-c0ffee-secret` test + console spies (`worker-core.test.ts:178-184`) | closed |
| T-8-13 | Tampering | engine chain imports from UI code | medium | mitigate | `eslint.config.mjs` `no-restricted-imports` for `@noble/hashes`(`/*`); `boundaries.test.ts` importer-set assertions + injected mutants | closed |
| T-8-14 | Information Disclosure | `app/hash-smoke` route | medium | mitigate | `page.test.tsx` (11 tests) + dev e2e `hash-smoke-gate.spec.ts` asserts 404 | closed |
| T-8-15 | Tampering | lint bypass via `require()` / dynamic `import()` | low | mitigate | `boundaries.test.ts:55` specifier regex covers from/bare/`import()`/`require()`; dynamic-import mutant test `:173` | closed |
| T-8-16 | Information Disclosure | hashing in the production page | high | mitigate | Prod e2e network-silence test: all requests same-origin `http://localhost:3101`, non-vacuous | closed |
| T-8-17 | Denial of Service | cancel path in the production worker | medium | mitigate | Prod e2e: superseded 96 MiB job, successor `< 2000` ms (`hash-worker.spec.ts:226`); dispose-is-final test (`:229`) | closed |
| T-8-18 | Tampering | CI coverage of the production proof | medium | mitigate | `.github/workflows/ci.yml:89` `npm run test:e2e:prod` after `npm run test:e2e` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-8-01 | T-8-05 | A dedicated worker only receives messages from its owning same-origin page; unknown message types fall through without action (`worker-core.ts`); Turbopack's worker bootstrap refuses foreign-origin scripts (08-RESEARCH Pattern 4). Low severity, accepted at plan time. | Plan 08-01 threat model | 2026-10-14 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-14 | 19 | 19 | 0 | gsd-secure-phase (orchestrator, ASVS L1 grep-depth; plan-time register) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-14
