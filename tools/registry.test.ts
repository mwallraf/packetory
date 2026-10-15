import { describe, expect, it } from "vitest";
import { getSortedTools, getToolBySlug, tools } from "./registry";

describe("tools/registry", () => {
  it("contains exactly the five tool entries (uuid, subnet, dns, mac, hash — hash added in Phase 9 Plan 03)", () => {
    expect(tools).toHaveLength(5);
    const slugs = tools.map((t) => t.slug).sort();
    expect(slugs).toEqual(["dns", "hash", "mac", "subnet", "uuid"]);
  });

  it("getSortedTools() sorts by featured desc, then name asc (case-insensitive)", () => {
    const sorted = getSortedTools();
    expect(sorted.map((t) => t.slug)).toEqual([
      "subnet",
      "uuid",
      "dns",
      "hash",
      "mac",
    ]);
  });

  it("ties within the same featured group break by case-insensitive name localeCompare", () => {
    // Featured group: IP Subnet Calculator vs UUID Generator -> "IP Subnet..." < "UUID..." asc
    // Non-featured group: DNS Lookup, Hash Generator, MAC Address Inspector -> asc
    const sorted = getSortedTools();
    const featured = sorted.filter((t) => t.featured);
    const notFeatured = sorted.filter((t) => !t.featured);

    const featuredNames = featured.map((t) => t.name);
    const sortedFeaturedNames = [...featuredNames].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    expect(featuredNames).toEqual(sortedFeaturedNames);

    const notFeaturedNames = notFeatured.map((t) => t.name);
    const sortedNotFeaturedNames = [...notFeaturedNames].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    expect(notFeaturedNames).toEqual(sortedNotFeaturedNames);
  });

  it("uuid, subnet, dns, mac, and hash are all 'active' (Phase 2 Plan 01, Phase 3 Plan 01, Phase 4 Plan 01, Phase 5 Plan 01, Phase 9 Plan 03)", () => {
    const statuses = Object.fromEntries(
      tools.map((tool) => [tool.slug, tool.status])
    );
    expect(statuses).toEqual({
      uuid: "active",
      subnet: "active",
      dns: "active",
      mac: "active",
      hash: "active",
    });
  });

  it("getToolBySlug() returns the matching entry or undefined", () => {
    expect(getToolBySlug("uuid")?.name).toBe("UUID Generator");
    expect(getToolBySlug("hash")?.name).toBe("Hash Generator");
    expect(getToolBySlug("does-not-exist")).toBeUndefined();
  });

  it("hash description makes no privacy claim beyond 'in your browser' (D-27, T-09-25)", () => {
    const description = getToolBySlug("hash")?.description.toLowerCase() ?? "";
    expect(description).toContain("in your browser");
    for (const forbidden of [
      "tracking",
      "never leaves",
      "never stored",
      "never sent",
      "private",
      "100%",
    ]) {
      expect(description).not.toContain(forbidden);
    }
  });
});
