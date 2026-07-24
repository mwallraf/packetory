export type ExportFormat = "text" | "csv" | "json";

export type ExportFileMeta = {
  filename: string;
  mime: string;
};

/**
 * Serializes already-generated/formatted UUID strings for Copy All and
 * Download (UUID-05, UUID-06). Framework-agnostic — no DOM/React/Next
 * import — so it is independently unit-testable and reusable from both the
 * client component and any future API route (project-brief.md §8).
 *
 * D-08: outputs contain ONLY the raw UUID strings — no index, version, or
 * timestamp metadata columns/fields. D-07: one `format` value selects which
 * of these three serializers runs, and that same selection drives BOTH Copy
 * All and Download in the consuming component — there is no second format
 * picker.
 *
 * All three serializers are total: they never throw for a valid string
 * array, including a single-element array (count=1, the minimum reachable
 * batch size — an empty array is out-of-contract because the UI clamps
 * batch count to 1-100, but these functions do not assume non-emptiness).
 */

/** Newline-joined values, no header (plain-text export). */
export function toPlainText(uuids: string[]): string {
  return uuids.join("\n");
}

/**
 * A single `uuid` header row followed by the newline-joined values
 * (Assumption A2) — no index/version/timestamp columns (D-08). The UUID
 * alphabet (hex digits + hyphen) can never contain a comma, quote, or
 * newline, so no CSV-escaping library is needed (RESEARCH Don't Hand-Roll;
 * threat T-02-06 accepted on this basis).
 */
export function toCsv(uuids: string[]): string {
  return ["uuid", ...uuids].join("\n");
}

/**
 * A 2-space-indented JSON array of the raw strings — no wrapper object, no
 * metadata fields (D-08).
 */
export function toJson(uuids: string[]): string {
  return JSON.stringify(uuids, null, 2);
}

/** Dispatches to the serializer matching `format` (D-07: one selector drives output). */
export function serializeUuids(uuids: string[], format: ExportFormat): string {
  switch (format) {
    case "csv":
      return toCsv(uuids);
    case "json":
      return toJson(uuids);
    case "text":
    default:
      return toPlainText(uuids);
  }
}

/** Filename + MIME type per export format (Assumption A3). */
export const EXPORT_FILE: Record<ExportFormat, ExportFileMeta> = {
  text: { filename: "uuids.txt", mime: "text/plain" },
  csv: { filename: "uuids.csv", mime: "text/csv" },
  json: { filename: "uuids.json", mime: "application/json" },
};
