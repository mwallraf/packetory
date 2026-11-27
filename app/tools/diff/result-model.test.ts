import { describe, expect, it } from "vitest";
import { compareText } from "@/lib/text-diff/engine";
import type { TextDiffLine, TextDiffRow } from "@/lib/text-diff/types";
import { DISPLAY_LIMITS, fitsExpandedResult, groupResultRows } from "./result-model";

function compareRows(original: string[], modified: string[]): TextDiffRow[] {
  const outcome = compareText({ original: original.join("\n"), modified: modified.join("\n") });
  if (outcome.status !== "done") throw new Error(outcome.code);
  return outcome.rows;
}

function unchanged(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`);
}

describe("groupResultRows", () => {
  it("preserves each row and shows three unchanged lines at every changed boundary", () => {
    const head = unchanged("head", 10);
    const middle = unchanged("middle", 10);
    const tail = unchanged("tail", 10);
    const rows = compareRows(
      [...head, "port 53", ...middle, "port 22", ...tail],
      [...head, "port 54", ...middle, "port 23", ...tail],
    );
    const items = groupResultRows(rows);
    expect(items.filter((item) => item.kind === "fold").map((fold) => [
      fold.rows[0].original?.text, fold.rows.at(-1)?.original?.text, fold.rows.length,
    ])).toEqual([
      ["head 1", "head 7", 7],
      ["middle 4", "middle 7", 4],
      ["tail 4", "tail 10", 7],
    ]);
    expect(items.flatMap((item) => item.kind === "row" ? item.row : item.rows)).toEqual(rows);
  });

  it("keeps exactly six intervening lines visible", () => {
    const middle = unchanged("middle", 6);
    const rows = compareRows(["port 53", ...middle, "port 22"], ["port 54", ...middle, "port 23"]);
    expect(groupResultRows(rows).every(({ kind }) => kind === "row")).toBe(true);
  });

  it("keeps an empty diff empty and preserves global indices across additions", () => {
    expect(groupResultRows([])).toEqual([]);
    const rows = compareRows(["start", "end"], ["start", "allow dns", "end"]);
    expect(groupResultRows(rows).map(({ index, kind }) => [index, kind]))
      .toEqual([[0, "row"], [1, "row"], [2, "row"]]);
  });
});

describe("fitsExpandedResult", () => {
  it("counts both sides and hidden context against the line boundary", () => {
    const head = unchanged("head", DISPLAY_LIMITS.lines / 2 - 1);
    const atLimit = compareRows([...head, "port 53"], [...head, "port 54"]);
    expect(groupResultRows(atLimit).some((row) => row.kind === "fold")).toBe(true);
    expect(fitsExpandedResult(atLimit)).toBe(true);

    const over = compareRows([...head, "port 53"], [...head, "allow dns", "port 54"]);
    expect(fitsExpandedResult(over)).toBe(false);
  });

  it("enforces the span boundary independently of text length and lines", () => {
    const spanCount = DISPLAY_LIMITS.spans / 2;
    const makeLine = (count: number): TextDiffLine => ({
      number: 1,
      hasNewline: false,
      spans: Array.from({ length: count }, () => ({ kind: "equal", text: "a" })),
      text: "a".repeat(count),
    });
    expect(fitsExpandedResult([{ kind: "modified", original: makeLine(spanCount), modified: makeLine(spanCount) }])).toBe(true);
    expect(fitsExpandedResult([{ kind: "modified", original: makeLine(spanCount + 1), modified: makeLine(spanCount) }])).toBe(false);
  });

  it("enforces the code-unit boundary independently of spans and lines", () => {
    const common = "x".repeat(DISPLAY_LIMITS.textLength / 2 - 1);
    expect(fitsExpandedResult(compareRows([common + "1"], [common + "2"]))).toBe(true);
    expect(fitsExpandedResult(compareRows([common + "1"], [common + "23"]))).toBe(false);
  });

  it("accepts identical results because they do not mount any rows", () => {
    const same = unchanged("same", DISPLAY_LIMITS.lines);
    expect(fitsExpandedResult(compareRows(same, same))).toBe(true);
  });
});
