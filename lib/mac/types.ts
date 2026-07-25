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

/** The vendor/OUI-lookup result (MAC-03, MAC-08, MAC-10, D-11, D-12).
 * Resolves 05-RESEARCH.md Open Question 1: a genuine "not found in the OUI
 * registry" answer (`not-found`) is its own state, distinct from a failed
 * lookup (`unavailable`) — a working lookup returning a negative result must
 * never be misrepresented as broken, and a failure must never be disguised
 * as a clean miss (05-RESEARCH.md Pitfall 3). `not-applicable` covers D-12:
 * a locally-administered/likely-randomized MAC skips the lookup entirely
 * rather than surfacing a coincidental match as if it were the device's real
 * hardware vendor. There is deliberately no "pending"/"loading" member here
 * — the in-flight "Looking up vendor…" state is orchestration state owned
 * by the UI layer (`app/tools/mac/MacTool.tsx`), not a resolved outcome of
 * the lookup itself. */
export type VendorState =
  | { kind: "found"; company: string }
  | { kind: "not-found" }
  | { kind: "unavailable" }
  | { kind: "not-applicable" };

/** A fully-computed, offline-only MAC result: the 4 normalized formats plus
 * the bit-level classification, always completing together the instant a
 * MAC parses valid (MAC-08, no partial-state gap) — plus the current vendor
 * lookup outcome (MAC-03), which completes independently and later, never
 * gating the two offline fields above (MAC-08's isolation guarantee). */
export type MacSuccessResult = {
  formats: MacFormats;
  classification: MacClassification;
  vendor: VendorState;
};

/** Discriminated union covering MAC Address Inspector UI states, mirroring
 * `lib/dns/types.ts`'s `DnsLookupState` discriminated-union convention
 * (D-07's "keep last valid visible, dimmed" pattern) — every non-idle,
 * non-success variant carries the last valid `MacSuccessResult` so the UI
 * can dim-and-keep rather than blank. `idle`/`incomplete-input`/`success`
 * were sufficient for 05-02's offline classification+formatting slice
 * (MAC-04..MAC-08); this shape itself did not need to change for 05-03's
 * vendor lookup — only `MacSuccessResult` (embedded in the last two
 * variants) grew a `vendor: VendorState` field, so both `incomplete-input`'s
 * dimmed carry-over and `success`'s live result automatically include the
 * current vendor outcome with no structural change here. */
export type MacLookupState =
  | { status: "idle" }
  | {
      status: "incomplete-input";
      message: string;
      lastValidResult: MacSuccessResult | null;
    }
  | { status: "success"; result: MacSuccessResult };
