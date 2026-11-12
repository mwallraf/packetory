import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { DEFAULT_SYMBOLS, DIGITS, LOWERCASE, UPPERCASE } from "@/lib/password";
import { kindOf, segmentRuns } from "./runs";

describe("segmentRuns (PWD-08)", () => {
  it("returns no runs for the empty string", () => {
    expect(segmentRuns("")).toEqual([]);
  });

  it("splits Aa0! into letter, digit and symbol runs", () => {
    expect(segmentRuns("Aa0!")).toEqual([
      { kind: "letter", text: "Aa" },
      { kind: "digit", text: "0" },
      { kind: "symbol", text: "!" },
    ]);
  });

  it("groups consecutive characters of the same class", () => {
    expect(segmentRuns("AAbb12!!")).toEqual([
      { kind: "letter", text: "AAbb" },
      { kind: "digit", text: "12" },
      { kind: "symbol", text: "!!" },
    ]);
  });

  it("gives a single-class value exactly one run", () => {
    expect(segmentRuns("1234")).toEqual([{ kind: "digit", text: "1234" }]);
  });

  it("does not merge non-adjacent runs of the same class", () => {
    expect(segmentRuns("a1a")).toHaveLength(3);
  });
});

describe("kindOf (PWD-08, classification by character code)", () => {
  it("classifies every letter as letter", () => {
    for (const ch of UPPERCASE + LOWERCASE) expect(kindOf(ch)).toBe("letter");
  });

  it("classifies every digit as digit", () => {
    for (const ch of DIGITS) expect(kindOf(ch)).toBe("digit");
  });

  it("classifies every default symbol as symbol", () => {
    for (const ch of DEFAULT_SYMBOLS) expect(kindOf(ch)).toBe("symbol");
  });

  it("classifies | ~ backtick and backslash as symbol", () => {
    for (const ch of ["|", "~", "`", "\\"]) expect(kindOf(ch)).toBe("symbol");
  });
});

const printable = fc.string({
  unit: fc.integer({ min: 0x21, max: 0x7e }).map((c) => String.fromCharCode(c)),
  maxLength: 128,
});

describe("segmentRuns properties", () => {
  fcIt.prop([printable])(
    "runs are non-empty, adjacent runs differ, kinds match and joined runs equal the input",
    (value) => {
      const runs = segmentRuns(value);
      expect(runs.map((r) => r.text).join("")).toBe(value);
      runs.forEach((run, i) => {
        expect(run.text.length).toBeGreaterThan(0);
        for (const ch of run.text) expect(kindOf(ch)).toBe(run.kind);
        if (i > 0) expect(run.kind).not.toBe(runs[i - 1]!.kind);
      });
    },
  );
});
