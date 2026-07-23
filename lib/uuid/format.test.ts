import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { generateBatch } from "./generate";
import { formatUuids } from "./format";

describe("formatUuids", () => {
  it("returns canonical lowercase hyphenated form unchanged for case:lower,hyphens:true (D-02, UUID-04)", () => {
    const uuids = generateBatch({ version: "v4", count: 3 });
    expect(formatUuids(uuids, { case: "lower", hyphens: true })).toEqual(
      uuids
    );
  });

  it("uppercases hex characters when case:upper (D-02, UUID-04)", () => {
    const uuids = generateBatch({ version: "v4", count: 3 });
    const result = formatUuids(uuids, { case: "upper", hyphens: true });
    result.forEach((value, i) => {
      expect(value).toBe(uuids[i]!.toUpperCase());
    });
  });

  it("removes all hyphens when hyphens:false, leaving 32 chars (D-02, UUID-04)", () => {
    const uuids = generateBatch({ version: "v4", count: 3 });
    const result = formatUuids(uuids, { case: "lower", hyphens: false });
    result.forEach((value) => {
      expect(value).not.toContain("-");
      expect(value).toHaveLength(32);
    });
  });

  it("never throws for a valid input array; empty array in -> empty array out (Total, D-02)", () => {
    expect(formatUuids([], { case: "lower", hyphens: true })).toEqual([]);
  });

  fcIt.prop([
    fc.integer({ min: 1, max: 20 }),
    fc.constantFrom("v4" as const, "v7" as const),
  ])(
    "double case toggle (upper then lower) restores the byte-identical original array (round-trip identity, D-02 Pitfall 4)",
    (count, version) => {
      const original = generateBatch({ version, count });
      const toggled = formatUuids(original, {
        case: "upper",
        hyphens: true,
      });
      const restored = formatUuids(toggled, {
        case: "lower",
        hyphens: true,
      });
      expect(restored).toEqual(original);
    }
  );

  fcIt.prop([
    fc.integer({ min: 1, max: 20 }),
    fc.constantFrom("v4" as const, "v7" as const),
  ])(
    "double hyphen toggle (off then on) restores the byte-identical original array (round-trip identity, D-02 Pitfall 4)",
    (count, version) => {
      const original = generateBatch({ version, count });
      const toggled = formatUuids(original, {
        case: "lower",
        hyphens: false,
      });
      const restored = formatUuids(toggled, {
        case: "lower",
        hyphens: true,
      });
      expect(restored).toEqual(original);
    }
  );

  fcIt.prop([
    fc.integer({ min: 1, max: 20 }),
    fc.constantFrom("v4" as const, "v7" as const),
    fc.constantFrom("upper" as const, "lower" as const),
    fc.boolean(),
  ])(
    "applying case then hyphens equals applying hyphens then case — the two transforms commute (D-02)",
    (count, version, uuidCase, hyphens) => {
      const original = generateBatch({ version, count });
      const caseFirst = formatUuids(
        formatUuids(original, { case: uuidCase, hyphens: true }),
        { case: uuidCase, hyphens }
      );
      const hyphensFirst = formatUuids(
        formatUuids(original, { case: "lower", hyphens }),
        { case: uuidCase, hyphens }
      );
      expect(caseFirst).toEqual(hyphensFirst);
    }
  );
});
