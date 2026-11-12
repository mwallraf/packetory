# API Capability Coverage — Phase 11 (Subnet Calculator Compaction)

**Detector result:** `detected: true` (one `(surface) api` signal, a false positive). The "api" mentions in 11-01-PLAN.md are `gh api` reads of GitHub deployment metadata in the Lighthouse capture steps: developer tooling, not product integration. /tools/subnet stays client-only over in-repo `lib/subnet` and makes no network calls.

## Capability Matrix

| capability | decision | reason |
|------------|----------|--------|
| GitHub REST API via `gh api` (deployment lookup) | OPT-OUT | Read-only developer tooling in the Lighthouse capture steps; never called by the site. |
| Any third-party / external network API, SDK, or service | OPT-OUT | CLAUDE.md: no third-party requests for tools that run fully locally. Subnet math is client-side. |
