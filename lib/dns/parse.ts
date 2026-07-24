/**
 * Framework-agnostic DoH JSON response normalization (DNS-06/DNS-07,
 * T-04-01). No React/Next import — pure, no-throw transform functions,
 * mirroring `lib/subnet/format.ts`'s small-named-pure-functions
 * decomposition (04-PATTERNS.md).
 *
 * Handles three live-verified DoH quirks (04-RESEARCH.md Pattern 4): (1)
 * `Answer[]` entries are not guaranteed homogeneous with the requested type
 * (an A query for a CNAME-fronted domain also returns the CNAME record —
 * must filter by numeric RR type); (2) TXT `data` values arrive wrapped in
 * one extra layer of literal double-quotes; (3) Google appends a trailing
 * dot to FQDNs, Cloudflare does not.
 */

import { RECORD_TYPE_NUMBERS, type DohResponse, type NormalizedRecord, type RecordType } from "./types";

/** Strips exactly one trailing dot, if present. Never throws. */
export function stripTrailingDot(s: string): string {
  return s.endsWith(".") ? s.slice(0, -1) : s;
}

/**
 * Normalizes one record's raw `data` value per its record type. TXT values
 * have exactly one layer of surrounding double-quotes stripped (Pitfall 5);
 * NS/CNAME target hostnames have a single trailing dot stripped; MX values
 * pass through unchanged as `"priority exchange"` (the UI splits on the
 * first space if it wants to render the two parts separately); A/AAAA pass
 * through unchanged.
 */
export function normalizeValue(data: string, type: RecordType): string {
  if (type === "TXT") {
    return data.startsWith('"') && data.endsWith('"')
      ? data.slice(1, -1)
      : data;
  }
  if (type === "CNAME" || type === "NS") {
    return stripTrailingDot(data);
  }
  return data;
}

/**
 * Filters a DoH response's `Answer[]` down to only the entries matching
 * `requestedType`'s numeric RR-type code (an A query can return an
 * interleaved CNAME(5) entry — live-verified quirk), then normalizes each
 * surviving entry's `name`/`value`. Returns `[]` (never throws) when
 * `Answer` is absent or empty.
 */
export function normalizeRecords(
  dohResponse: DohResponse,
  requestedType: RecordType
): NormalizedRecord[] {
  const typeNum = RECORD_TYPE_NUMBERS[requestedType];
  return (dohResponse.Answer ?? [])
    .filter((answer) => answer.type === typeNum)
    .map((answer) => ({
      name: stripTrailingDot(answer.name),
      ttl: answer.TTL,
      value: normalizeValue(answer.data, requestedType),
    }));
}
