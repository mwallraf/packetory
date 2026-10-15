// @vitest-environment node
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { SHARE_TEXT_MAX_ENCODED, buildShareLink } from "./share-link";

const ORIGIN = "https://packetory.dev";

describe("buildShareLink (TEXT-04)", () => {
  it("builds an absolute link with encodeURIComponent", () => {
    expect(buildShareLink(ORIGIN, "hello world")).toEqual({
      ok: true,
      url: "https://packetory.dev/tools/hash?text=hello%20world",
    });
  });

  it("exposes the 2,000 cap", () => {
    expect(SHARE_TEXT_MAX_ENCODED).toBe(2000);
  });

  it("the cap is inclusive on the encoded length", () => {
    expect(buildShareLink(ORIGIN, "a".repeat(2000)).ok).toBe(true);
    expect(buildShareLink(ORIGIN, "a".repeat(2001))).toEqual({
      ok: false,
      reason: "too-long",
    });
  });

  it("measures the cap on the encoded output, not the character count", () => {
    // "é" encodes to 6 characters ("%C3%A9").
    expect(buildShareLink(ORIGIN, "é".repeat(333) + "ab").ok).toBe(true);
    expect(buildShareLink(ORIGIN, "é".repeat(333) + "abc")).toEqual({
      ok: false,
      reason: "too-long",
    });
    // A newline costs 3 ("%0A"): 667 newlines are 2,001.
    expect(buildShareLink(ORIGIN, "\n".repeat(667))).toEqual({
      ok: false,
      reason: "too-long",
    });
  });

  it("returns unencodable for a lone surrogate and never throws", () => {
    expect(() => buildShareLink(ORIGIN, "\uD800")).not.toThrow();
    expect(buildShareLink(ORIGIN, "\uD800")).toEqual({
      ok: false,
      reason: "unencodable",
    });
    expect(buildShareLink(ORIGIN, "a\uDC00b")).toEqual({
      ok: false,
      reason: "unencodable",
    });
  });

  it("returns empty for the empty string", () => {
    expect(buildShareLink(ORIGIN, "")).toEqual({ ok: false, reason: "empty" });
  });

  it("is idempotent", () => {
    expect(buildShareLink(ORIGIN, "same text +&?")).toEqual(
      buildShareLink(ORIGIN, "same text +&?"),
    );
  });

  it("round-trips well-formed text through URLSearchParams exactly (property)", () => {
    fc.assert(
      fc.property(
        fc.string({ unit: "grapheme", minLength: 1, maxLength: 200 }),
        (text) => {
          const link = buildShareLink(ORIGIN, text);
          if (!link.ok) return true;
          return new URL(link.url).searchParams.get("text") === text;
        },
      ),
    );
  });
});
