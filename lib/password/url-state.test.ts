import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS } from "./constants";
import { parseOptions, serializeOptions } from "./url-state";

const nonDefault = {
  ...DEFAULT_OPTIONS,
  length: 32,
  avoidLookalikes: true,
  symbolSet: "!?",
  mode: "passphrase" as const,
  words: 8,
};

describe("URL options codec tracer (D-19, D-20)", () => {
  it("serializes the defaults to an empty query", () => {
    expect(serializeOptions(DEFAULT_OPTIONS)).toBe("");
  });

  it("serializes non-default options in the fixed key order", () => {
    expect(serializeOptions(nonDefault)).toBe(
      "mode=passphrase&len=32&sym=%21%3F&amb=1&words=8",
    );
  });

  it("parses back to the same options, with or without a leading ?", () => {
    const qs = "mode=passphrase&len=32&sym=%21%3F&amb=1&words=8";
    expect(parseOptions(qs)).toEqual(nonDefault);
    expect(parseOptions("?" + qs)).toEqual(nonDefault);
  });

  it("returns a fresh defaults object for an empty search", () => {
    const parsed = parseOptions("");
    expect(parsed).toEqual(DEFAULT_OPTIONS);
    expect(parsed).not.toBe(DEFAULT_OPTIONS);
  });
});
