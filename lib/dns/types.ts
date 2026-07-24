/**
 * Framework-agnostic DNS Lookup type definitions (DNS-06/DNS-07/DNS-09,
 * QUAL-08). No React/Next import — every symbol here is consumed by both
 * `lib/dns/*` (pure logic) and `app/tools/dns/DnsTool.tsx` (the client
 * island), exactly like `lib/subnet/parse.ts`'s `ParsedCidr`/`ParseError`
 * discriminated-union convention.
 *
 * The resolver abstraction is born pluralized from day one (see
 * `04-01-PLAN.md`'s assumption_delta_decision): `resolverUsed` is a
 * first-class `"primary" | "fallback"` field, never a hardcoded/implicit
 * single-resolver assumption.
 */

/** The 6 record types this tool supports (DNS-06). Fixed display order for
 * the segmented control (D-09) — a static array, never derived from object
 * key order. */
export type RecordType = "A" | "AAAA" | "MX" | "TXT" | "NS" | "CNAME";

export const RECORD_TYPES: readonly RecordType[] = [
  "A",
  "AAAA",
  "MX",
  "TXT",
  "NS",
  "CNAME",
];

/** DNS RR-type numeric codes (RFC 1035/3596/974) — used to filter a DoH
 * response's `Answer[]` by the actually-requested type, since a query can
 * return interleaved record types (e.g. an A query for a CNAME-fronted
 * domain also returns the CNAME record, live-verified in 04-RESEARCH.md). */
export const RECORD_TYPE_NUMBERS: Record<RecordType, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  MX: 15,
  TXT: 16,
  AAAA: 28,
};

/** One raw answer entry from a DoH JSON response. */
export type DohAnswer = {
  name: string;
  type: number;
  TTL: number;
  data: string;
};

/** Shared de-facto DoH JSON response shape — both Cloudflare and Google
 * return this same shape (04-RESEARCH.md), though `Answer` is absent for a
 * negative/empty answer. */
export type DohResponse = {
  Status: number;
  Answer?: DohAnswer[];
  Question?: { name: string; type: number }[];
};

/** One normalized, display-ready DNS record (post `lib/dns/parse.ts`
 * normalization — trailing dots stripped, TXT quoting stripped). */
export type NormalizedRecord = {
  name: string;
  ttl: number;
  value: string;
};

export type ResolverUsed = "primary" | "fallback";

export type DnsSuccessResult = {
  domain: string;
  recordType: RecordType;
  records: NormalizedRecord[];
  resolverUsed: ResolverUsed;
  /** Integer milliseconds, total wall-clock time from trigger to final
   * answer (RESEARCH.md Open Question 2, resolved: includes any failed
   * primary attempt before a fallback succeeds). */
  durationMs: number;
};

/**
 * Discriminated union covering every DNS Lookup UI state (QUAL-08's 5 named
 * error states + loading + success). Every non-success, non-idle variant
 * carries `lastValidResult` so the UI can keep the last good result visible
 * at reduced opacity (D-07) rather than blanking — direct precedent from
 * `SubnetTool.tsx`'s `lastValidCidr` field.
 *
 * `nxdomain` / `empty-noerror` / `rate-limited` / `resolver-unavailable`
 * variants are wired for their full copy/behavior in 04-02 — this plan
 * (04-01) only renders `idle` (never reached post-mount, per D-10),
 * `invalid-input` (minimal inline note), `loading`, and `success`.
 */
export type DnsLookupState =
  | { status: "idle" }
  | {
      status: "invalid-input";
      message: string;
      lastValidResult: DnsSuccessResult | null;
    }
  | { status: "loading"; lastValidResult: DnsSuccessResult | null }
  | { status: "success"; result: DnsSuccessResult }
  | {
      status: "nxdomain";
      domain: string;
      lastValidResult: DnsSuccessResult | null;
    }
  | {
      status: "empty-noerror";
      domain: string;
      recordType: RecordType;
      lastValidResult: DnsSuccessResult | null;
    }
  | { status: "rate-limited"; lastValidResult: DnsSuccessResult | null }
  | { status: "resolver-unavailable"; lastValidResult: DnsSuccessResult | null };

/** Thrown by `queryResolver`/`resolveWithFallback` on an HTTP 429 response
 * from either resolver — classified distinctly from a generic resolver
 * failure per D-06/Pitfall 6 (rate-limited vs. resolver-unavailable must
 * never collapse into one generic error branch). */
export class RateLimitError extends Error {
  constructor() {
    super("Rate limited by DNS resolver");
    this.name = "RateLimitError";
  }
}

/** Thrown when a resolver responds with a non-2xx status other than 429 (or
 * a genuine network-level failure) — carries the HTTP status when one is
 * available so callers/tests can distinguish causes without parsing the
 * message string. */
export class ResolverFailureError extends Error {
  status: number | null;

  constructor(status: number | null = null) {
    super(
      status !== null
        ? `DNS resolver responded with HTTP ${status}`
        : "DNS resolver request failed"
    );
    this.name = "ResolverFailureError";
    this.status = status;
  }
}
