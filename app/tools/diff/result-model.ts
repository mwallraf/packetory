import type { TextDiffRow } from "@/lib/text-diff/types";

const CONTEXT_LINES = 3;
export const DISPLAY_LIMITS = { lines: 240, spans: 1_200, textLength: 64_000 } as const;

export type ResultItem =
  | { kind: "row"; index: number; row: TextDiffRow }
  | { kind: "fold"; index: number; rows: TextDiffRow[] };

export function groupResultRows(rows: TextDiffRow[]): ResultItem[] {
  const items: ResultItem[] = [];
  for (let index = 0; index < rows.length;) {
    if (rows[index].kind !== "equal") {
      items.push({ kind: "row", index, row: rows[index] });
      index++;
      continue;
    }

    let end = index + 1;
    while (end < rows.length && rows[end].kind === "equal") end++;
    const leadingContext = index > 0 ? CONTEXT_LINES : 0;
    const trailingContext = end < rows.length ? CONTEXT_LINES : 0;
    const hiddenStart = index + leadingContext;
    const hiddenEnd = end - trailingContext;

    while (index < end) {
      if (index === hiddenStart && hiddenStart < hiddenEnd) {
        items.push({ kind: "fold", index, rows: rows.slice(hiddenStart, hiddenEnd) });
        index = hiddenEnd;
      } else {
        items.push({ kind: "row", index, row: rows[index] });
        index++;
      }
    }
  }
  return items;
}

/** Count both populated sides, including lines behind collapsed context. */
export function fitsExpandedResult(rows: TextDiffRow[]): boolean {
  if (rows.every((row) => row.kind === "equal")) return true;

  let lines = 0;
  let spans = 0;
  let textLength = 0;
  for (const row of rows) {
    for (const line of [row.original, row.modified]) {
      if (!line) continue;
      lines++;
      spans += line.spans.length;
      textLength += line.text.length;
      if (lines > DISPLAY_LIMITS.lines || spans > DISPLAY_LIMITS.spans || textLength > DISPLAY_LIMITS.textLength) {
        return false;
      }
    }
  }
  return true;
}
