import { describe, expect, it } from "vitest";
import { DEFAULT_ALLOW_LIST, redactParams } from "./redact";

describe("redactParams", () => {
  it("reports zero params when the allow-list is empty (Phase 1 default, safe-by-default)", () => {
    const result = redactParams("?cidr=10.0.0.0/24&mac=AA:BB:CC:DD:EE:FF", []);
    expect(result).toEqual({});
  });

  it("uses DEFAULT_ALLOW_LIST (empty in Phase 1) when no allow-list is passed", () => {
    const result = redactParams("?foo=bar");
    expect(result).toEqual({});
    expect(DEFAULT_ALLOW_LIST).toEqual([]);
  });

  it("retains a param whose name exactly matches an allow-list entry, with its value intact", () => {
    const result = redactParams("?type=A&name=example.com", ["type"]);
    expect(result).toEqual({ type: "A" });
  });

  it("drops every param not explicitly on the allow-list (allow-list is the only inclusion mechanism)", () => {
    const result = redactParams("?type=A&secret=xyz&cidr=192.168.1.0/24", [
      "type",
    ]);
    expect(result).toEqual({ type: "A" });
    expect(result).not.toHaveProperty("secret");
    expect(result).not.toHaveProperty("cidr");
  });

  it("is not fooled by prefix/substring matches — a param differing by any character is redacted (exact match only, adjacency edge)", () => {
    const result = redactParams("?typeX=A&Type=B&type=C", ["type"]);
    expect(result).toEqual({ type: "C" });
  });

  it("auto-excludes a brand-new, never-before-seen sensitive param with zero code change (e.g. a fake ?mac= or ?secret=)", () => {
    const result = redactParams("?mac=AA:BB:CC:DD:EE:FF&secret=topsecret", []);
    expect(result).toEqual({});
  });

  it("is deterministic and independent of input param order", () => {
    const a = redactParams("?type=A&name=B&ttl=60", ["type", "ttl"]);
    const b = redactParams("?ttl=60&name=B&type=A", ["type", "ttl"]);
    expect(a).toEqual(b);
    expect(Object.keys(a)).toEqual(Object.keys(b));
  });

  it("returns an empty result and never throws for a query string with no params", () => {
    expect(() => redactParams("", ["type"])).not.toThrow();
    expect(redactParams("", ["type"])).toEqual({});
  });

  it("returns an empty result and never throws for a bare URL with no query string", () => {
    expect(redactParams("https://packetory.dev/tools/dns", ["type"])).toEqual(
      {}
    );
  });

  it("accepts a URLSearchParams instance", () => {
    const params = new URLSearchParams("type=A&name=example.com");
    expect(redactParams(params, ["type"])).toEqual({ type: "A" });
  });

  it("accepts a plain record", () => {
    expect(
      redactParams({ type: "A", name: "example.com" }, ["type"])
    ).toEqual({ type: "A" });
  });

  it("never treats the allow-list as a block-list — a param not previously seen requires no edit to be excluded, and a param IS included the moment it's added to the allow-list", () => {
    const withoutAllow = redactParams("?newParam=value", []);
    expect(withoutAllow).toEqual({});

    const withAllow = redactParams("?newParam=value", ["newParam"]);
    expect(withAllow).toEqual({ newParam: "value" });
  });

  it("MAC-10 regression: DEFAULT_ALLOW_LIST does not include 'mac' or 'oui' — the full MAC address / OUI must never reach analytics", () => {
    expect(DEFAULT_ALLOW_LIST).not.toContain("mac");
    expect(DEFAULT_ALLOW_LIST).not.toContain("oui");
    // Belt-and-suspenders: even if a future `?mac=`/`?oui=` URL-state param
    // were ever added to a page (05-RESEARCH.md Open Question 2 left this
    // optional/undecided), redactParams itself would still exclude it by
    // default — the allow-list is the sole inclusion mechanism (no
    // block-list), so a fake `?mac=`/`?oui=` param is dropped automatically
    // with zero code change, exactly like Phase 3's `cidr` precedent.
    const result = redactParams(
      "?mac=AA:BB:CC:DD:EE:FF&oui=AABBCC",
      DEFAULT_ALLOW_LIST
    );
    expect(result).toEqual({});
  });
});
