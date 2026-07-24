import { describe, expect, it } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { validate, version } from "uuid";
import { generateBatch, generateOne } from "./generate";

describe("generateBatch", () => {
  it("returns a single valid v4 UUID for count=1 (UUID-01)", () => {
    const [result] = generateBatch({ version: "v4", count: 1 });
    expect(result).toBeDefined();
    expect(validate(result!)).toBe(true);
    expect(version(result!)).toBe(4);
  });

  it("returns N valid v7 UUIDs for a given count (UUID-02)", () => {
    const results = generateBatch({ version: "v7", count: 5 });
    expect(results).toHaveLength(5);
    for (const uuid of results) {
      expect(validate(uuid)).toBe(true);
      expect(version(uuid)).toBe(7);
    }
  });

  it("count=1 -> length 1 (UUID-03 batch boundary)", () => {
    expect(generateBatch({ version: "v4", count: 1 })).toHaveLength(1);
  });

  it("count=100 -> length 100 (UUID-03 batch boundary)", () => {
    expect(generateBatch({ version: "v4", count: 100 })).toHaveLength(100);
  });

  it("clamps count=0 up to a minimum of 1, never throwing (defensive totality)", () => {
    expect(generateBatch({ version: "v4", count: 0 })).toHaveLength(1);
  });

  it("clamps count=101 down to a maximum of 100, never throwing (defensive totality)", () => {
    expect(generateBatch({ version: "v4", count: 101 })).toHaveLength(100);
  });

  it("clamps a non-integer count by flooring", () => {
    expect(generateBatch({ version: "v4", count: 3.9 })).toHaveLength(3);
  });

  it("clamps a negative count up to a minimum of 1", () => {
    expect(generateBatch({ version: "v4", count: -5 })).toHaveLength(1);
  });

  it("returns canonical lowercase hyphenated 36-char strings", () => {
    const [result] = generateBatch({ version: "v4", count: 1 });
    expect(result).toHaveLength(36);
    expect(result).toBe(result!.toLowerCase());
    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  fcIt.prop([
    fc.integer({ min: 1, max: 100 }),
    fc.constantFrom("v4" as const, "v7" as const),
  ])(
    "every element in the batch is valid and distinct, for any count in [1,100] and either version (property)",
    (count, uuidVersion) => {
      const results = generateBatch({ version: uuidVersion, count });
      expect(results).toHaveLength(count);
      expect(new Set(results).size).toBe(count);
      for (const uuid of results) {
        expect(validate(uuid)).toBe(true);
      }
    }
  );
});

describe("generateOne", () => {
  it("returns a single valid UUID for the given version", () => {
    const result = generateOne("v7");
    expect(validate(result)).toBe(true);
    expect(version(result)).toBe(7);
  });
});
