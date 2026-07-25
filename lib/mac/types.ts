/**
 * Framework-agnostic MAC address type definitions (MAC-01, MAC-02). No
 * React/Next import — mirrors `lib/dns/types.ts`'s discriminated-union
 * doc-comment convention.
 *
 * Unlike DNS's domain-label validation (`lib/dns/validate.ts`), MAC input
 * needs NO bounded/backtracking-safe regex: a MAC address is fixed-length
 * (12 hex digits) with no nested-quantifier structure at all, so parsing is
 * a single strip-then-length-check operation, never a bounded pattern
 * (05-RESEARCH.md Pitfall 4).
 */

/** Total-function parse result (05-RESEARCH.md Pattern 1) — `parseMacInput`
 * never throws; on success it carries the parsed 6-byte tuple, closer to
 * `lib/subnet/parse.ts`'s `ParsedCidr`/`ParseError` shape than to
 * `lib/dns/validate.ts`'s plain boolean return, since callers need the
 * bytes on success. */
export type ParsedMac =
  | { valid: true; bytes: [number, number, number, number, number, number] }
  | { valid: false };

/** All 4 simultaneous normalized format variants (D-05, MAC-02) — every
 * value uppercase hex, each byte zero-padded to 2 hex digits. */
export type MacFormats = {
  colon: string; // "3C:22:FB:AA:BB:CC"
  dash: string; // "3C-22-FB-AA-BB-CC"
  dot: string; // "3C22.FBAA.BBCC" (Cisco-style, 4-hex-digit groups)
  none: string; // "3C22FBAABBCC"
};
