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

/** Pure bit-level classification derived from `bytes[0..2]` alone
 * (MAC-04, MAC-05, MAC-06, MAC-07) — produced by `lib/mac/classify.ts`.
 * MUST NEVER be derived from a vendor-API response (MAC-08); every field
 * here is computable offline, synchronously, from the parsed MAC bytes. */
export type MacClassification = {
  /** First 3 bytes, uppercase hex, no separator, e.g. "3C22FB". */
  ouiHex: string;
  /** I/G bit (bit 0 of byte[0]) === 0 — true means unicast, false means
   * multicast/broadcast. */
  isUnicast: boolean;
  /** U/L bit (bit 1 of byte[0]) === 0 — true means universally
   * administered (IEEE-assigned OUI), false means locally administered. */
  isUniversallyAdministered: boolean;
  /** === !isUniversallyAdministered (D-10) — the U/L bit alone, no
   * secondary heuristic. Drives the "Likely randomized (privacy MAC)."
   * hedge badge (MAC-07, D-09). */
  randomizationLikely: boolean;
};

/** A fully-computed, offline-only MAC result: the 4 normalized formats plus
 * the bit-level classification, always completing together the instant a
 * MAC parses valid (MAC-08, no partial-state gap). */
export type MacSuccessResult = {
  formats: MacFormats;
  classification: MacClassification;
};

/** Discriminated union covering MAC Address Inspector UI states, mirroring
 * `lib/dns/types.ts`'s `DnsLookupState` discriminated-union convention
 * (D-07's "keep last valid visible, dimmed" pattern) — every non-idle,
 * non-success variant carries the last valid `MacSuccessResult` so the UI
 * can dim-and-keep rather than blank. Only `idle`/`incomplete-input`/
 * `success` are needed for this plan's offline classification+formatting
 * slice (MAC-04..MAC-08); 05-03 layers vendor-lookup states on top without
 * needing to change this shape. */
export type MacLookupState =
  | { status: "idle" }
  | {
      status: "incomplete-input";
      message: string;
      lastValidResult: MacSuccessResult | null;
    }
  | { status: "success"; result: MacSuccessResult };
