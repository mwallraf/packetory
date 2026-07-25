# API Coverage — maclookup.app (v2)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
>
> This phase integrates one external third-party API — `api.maclookup.app/v2`
> — through the internal `/api/mac-vendor` server proxy (D-01/D-02). It is an
> explicitly interim measure sanctioned by project-brief.md §5.4; the long-term
> local build-time OUI dataset stays deferred as MAC-V2-02. The proxy shapes the
> upstream answer down to `{ status, found, company }` and never passes through
> the vendor's address/country/block-type fields (privacy shape-down, Pattern 3).

| capability | decision | reason |
|---|---|---|
| single MAC/OUI lookup (`GET /v2/macs/{oui}`) | INTEGRATE | |
| company name field | INTEGRATE | |
| found/not-found registry status | INTEGRATE | drives the distinct not-found vs unavailable UI states |
| bulk / batch lookup | OPT-OUT | not needed — lookups are human-paced, debounced, and single-OUI |
| company / vendor-prefix search | OPT-OUT | not needed — this tool resolves a known OUI, never searches by name |
| vendor address / country / block-type detail fields | OPT-OUT | privacy shape-down (Pattern 3) — only company name is surfaced; extra fields never leave the proxy |
| upstream `isRand` / `isPrivate` fields | OPT-OUT | MAC-08 requires classification independent of the vendor call — randomization is computed locally in lib/mac/classify.ts, never read from the vendor response |
| API-key / authenticated tier | OPT-OUT | not needed — the unauthenticated tier (10 req/sec, 25K/6h) far exceeds this tool's debounced+cached traffic (05-RESEARCH.md D-02 verification) |
| bulk MAC prefix registry download | OPT-OUT | deferred to MAC-V2-02 (build-time IEEE OUI compaction) — out of scope this phase |
