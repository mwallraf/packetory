import { describe, expect, it } from "vitest";
import { compareText } from "./engine";
import { MAX_INPUT_LENGTH } from "./limits";
import type { TextDiffRow } from "./types";

function rowsFor(original: string, modified: string): TextDiffRow[] {
  const result = compareText({ original, modified });
  if (result.status !== "done") throw new Error(result.code);
  return result.rows;
}

function assertSource(rows: TextDiffRow[], side: "original" | "modified", source: string) {
  const lines = rows.flatMap((row) => row[side] ?? []);
  expect(lines.map(({ number }) => number)).toEqual(lines.map((_, index) => index + 1));
  const reconstructed = lines.map(({ text, spans, hasNewline }) => {
    expect(spans.map((span) => span.text).join("")).toBe(text);
    return text + (hasNewline ? "\n" : "");
  }).join("");
  expect(reconstructed).toBe(source.replace(/\r\n?/g, "\n"));
}

describe("compareText", () => {
  it("identifies the exact changed digit of an IP address", () => {
    const result = compareText({ original: "192.0.2.1", modified: "192.0.2.2" });
    expect(result).toMatchObject({
      status: "done",
      rows: [{
        kind: "modified",
        original: { number: 1, spans: [{ kind: "equal", text: "192.0.2." }, { kind: "removed", text: "1" }] },
        modified: { number: 1, spans: [{ kind: "equal", text: "192.0.2." }, { kind: "added", text: "2" }] },
      }],
    });
  });

  it.each([
    ["", ""],
    ["", "added\n\n"],
    ["removed\n", ""],
    ["router\r\ninterface\raddress 192.0.2.1\n", "router\ninterface\naddress 192.0.2.1\n"],
    ["\tport 53 \n\npermit\n", "  port 53\n\n\npermit"],
    ["first\nrepeat\nrepeat\nport 53\nlast", "first\nrepeat\nport 54\nrepeat\nlast"],
    ["first\nport 53\nlast\n", "first\nallow dns\nport 54\nlast\n"],
    ["entry 😀\n<em>literal</em>", "entry 🧪\n<b>literal</b>"],
  ])("reconstructs both original streams in source order (%#)", (original, modified) => {
    const rows = rowsFor(original, modified);
    assertSource(rows, "original", original);
    assertSource(rows, "modified", modified);
    expect(rowsFor(original, modified)).toEqual(rows);
  });

  it("normalizes CRLF and lone CR, and detects the absence of a final newline", () => {
    expect(rowsFor("first\r\nlast\r", "first\nlast\n").map((row) => row.kind)).toEqual(["equal", "equal"]);
    expect(rowsFor("permit\n", "permit")).toMatchObject([{
      kind: "modified",
      original: { text: "permit", hasNewline: true },
      modified: { text: "permit", hasNewline: false },
    }]);
  });

  it("marks indentation and trailing spaces as edits", () => {
    expect(rowsFor("\tpermit ", "  permit")).toMatchObject([{
      kind: "modified",
      original: { spans: [{ kind: "removed", text: "\t" }, { kind: "equal", text: "permit" }, { kind: "removed", text: " " }] },
      modified: { spans: [{ kind: "added", text: "  " }, { kind: "equal", text: "permit" }] },
    }]);
    expect(rowsFor("first\n\nlast", "first\nlast").map((row) => row.kind)).toEqual(["equal", "removed", "equal"]);
  });

  it("aligns a related replacement after an insertion and leaves unrelated lines separate", () => {
    expect(rowsFor("port 53\nend", "allow dns\nport 54\nend").map((row) => row.kind))
      .toEqual(["added", "modified", "equal"]);
    expect(rowsFor("route\n", "deny\n").map((row) => row.kind)).toEqual(["removed", "added"]);
  });

  it("highlights whole Unicode code points", () => {
    const [row] = rowsFor("entry 😀", "entry 🧪");
    expect(row.original?.spans.at(-1)).toEqual({ kind: "removed", text: "😀" });
    expect(row.modified?.spans.at(-1)).toEqual({ kind: "added", text: "🧪" });
  });

  it("retains a long related line with whole-line emphasis", () => {
    const shared = "x".repeat(2_500);
    const original = shared + "1";
    const modified = shared + "2";
    expect(rowsFor(original, modified)).toMatchObject([{
      kind: "modified",
      original: { spans: [{ kind: "removed", text: original }] },
      modified: { spans: [{ kind: "added", text: modified }] },
    }]);
  });

  it("returns content-free errors when the size, line count or edit budget is exceeded", () => {
    expect(compareText({ original: "x".repeat(MAX_INPUT_LENGTH + 1), modified: "" }))
      .toEqual({ status: "error", code: "input-limit" });
    expect(compareText({ original: "\n".repeat(5_001), modified: "" }))
      .toEqual({ status: "error", code: "input-limit" });
    expect(compareText({ original: "old\n".repeat(501), modified: "new\n".repeat(501) }))
      .toEqual({ status: "error", code: "comparison-limit" });
  });
});
