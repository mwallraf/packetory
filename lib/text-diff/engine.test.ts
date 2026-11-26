import { describe, expect, it } from "vitest";
import { compareText } from "./engine";

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
});
