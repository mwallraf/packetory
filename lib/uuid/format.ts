export type UuidCase = "upper" | "lower";

export type FormatUuidsOptions = {
  case: UuidCase;
  hyphens: boolean;
};

/**
 * Reformats already-generated UUID strings (D-02, UUID-04): applies case
 * (upper/lower) and hyphen (on/off) transforms to the values already on
 * screen, in place. This is a pure reformat, never a regenerate — no new
 * randomness, no change to underlying UUID identity. This module NEVER
 * imports from "uuid" (all randomness lives in lib/uuid/generate.ts, D-01)
 * and has no React/Next import (framework-agnostic, project-brief.md §8).
 *
 * Both transforms are total (never throw for a valid input array; empty
 * array in -> empty array out) and commute: applying case then hyphens
 * yields the same result as applying hyphens then case, since case only
 * affects alphabetic hex characters and hyphen placement is computed from
 * fixed positions in the de-hyphenated string, unaffected by casing.
 *
 * Hyphen handling always strips any existing hyphens first, then
 * re-inserts them at the canonical 8-4-4-4-12 positions when
 * `opts.hyphens` is true. Applying the transform in either direction is
 * therefore a true reformat (not just removal), which is what makes the
 * hyphens:false -> hyphens:true round trip restore the byte-identical
 * original value (RESEARCH.md Pitfall 4's concrete round-trip assertion).
 */
export function formatUuids(
  uuids: string[],
  opts: FormatUuidsOptions
): string[] {
  return uuids.map((uuid) =>
    applyHyphens(applyCase(uuid, opts.case), opts.hyphens)
  );
}

function applyCase(uuid: string, uuidCase: UuidCase): string {
  return uuidCase === "upper" ? uuid.toUpperCase() : uuid.toLowerCase();
}

function applyHyphens(uuid: string, hyphens: boolean): string {
  const stripped = uuid.replaceAll("-", "");
  if (!hyphens) return stripped;
  return `${stripped.slice(0, 8)}-${stripped.slice(8, 12)}-${stripped.slice(12, 16)}-${stripped.slice(16, 20)}-${stripped.slice(20)}`;
}
