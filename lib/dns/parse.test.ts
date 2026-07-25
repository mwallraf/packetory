import { describe, expect, it } from "vitest";
import { normalizeRecords, normalizeValue, stripTrailingDot } from "./parse";
import type { DohResponse } from "./types";

describe("stripTrailingDot", () => {
  it("strips exactly one trailing dot", () => {
    expect(stripTrailingDot("cloudflare.com.")).toBe("cloudflare.com");
  });

  it("leaves a string with no trailing dot unchanged", () => {
    expect(stripTrailingDot("cloudflare.com")).toBe("cloudflare.com");
  });
});

describe("normalizeValue", () => {
  it("strips exactly one layer of surrounding double-quotes from a TXT value (Pitfall 5)", () => {
    expect(normalizeValue('"v=spf1 -all"', "TXT")).toBe("v=spf1 -all");
  });

  it("leaves an already-unquoted TXT value unchanged", () => {
    expect(normalizeValue("v=spf1 -all", "TXT")).toBe("v=spf1 -all");
  });

  it("joins a multi-segment quoted TXT value without leaving stray embedded quotes (WR-01)", () => {
    expect(normalizeValue('"first-255-bytes" "rest"', "TXT")).toBe(
      "first-255-bytesrest"
    );
  });

  it("passes an MX value through as \"priority exchange\"", () => {
    expect(normalizeValue("10 mxa.example.com.", "MX")).toBe(
      "10 mxa.example.com."
    );
  });

  it("strips a trailing dot from a CNAME value", () => {
    expect(normalizeValue("target.example.com.", "CNAME")).toBe(
      "target.example.com"
    );
  });

  it("strips a trailing dot from an NS value", () => {
    expect(normalizeValue("ns1.example.com.", "NS")).toBe("ns1.example.com");
  });

  it("passes an A value through unchanged", () => {
    expect(normalizeValue("104.16.132.229", "A")).toBe("104.16.132.229");
  });
});

describe("normalizeRecords", () => {
  it("filters out an interleaved CNAME(5) entry from an A(1)-type query (live-verified quirk)", () => {
    const dohResponse: DohResponse = {
      Status: 0,
      Answer: [
        { name: "www.example.com", type: 5, TTL: 300, data: "example.com." },
        { name: "example.com", type: 1, TTL: 300, data: "104.16.132.229" },
      ],
    };

    const records = normalizeRecords(dohResponse, "A");

    expect(records).toHaveLength(1);
    expect(records[0].value).toBe("104.16.132.229");
  });

  it("strips a single layer of quoting from a TXT record's value (Pitfall 5)", () => {
    const dohResponse: DohResponse = {
      Status: 0,
      Answer: [
        {
          name: "cloudflare.com",
          type: 16,
          TTL: 300,
          data: '"v=spf1 -all"',
        },
      ],
    };

    const records = normalizeRecords(dohResponse, "TXT");

    expect(records[0].value).toBe("v=spf1 -all");
  });

  it("strips a single trailing dot from the record name (Google FQDN convention, Pitfall 4)", () => {
    const dohResponse: DohResponse = {
      Status: 0,
      Answer: [
        {
          name: "cloudflare.com.",
          type: 1,
          TTL: 300,
          data: "104.16.132.229",
        },
      ],
    };

    const records = normalizeRecords(dohResponse, "A");

    expect(records[0].name).toBe("cloudflare.com");
  });

  it("returns an empty array when Answer is absent", () => {
    const dohResponse: DohResponse = { Status: 3 };
    expect(normalizeRecords(dohResponse, "A")).toEqual([]);
  });

  it("passes TTL through unchanged", () => {
    const dohResponse: DohResponse = {
      Status: 0,
      Answer: [
        { name: "cloudflare.com", type: 1, TTL: 3600, data: "104.16.132.229" },
      ],
    };
    expect(normalizeRecords(dohResponse, "A")[0].ttl).toBe(3600);
  });
});
