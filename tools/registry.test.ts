import { describe, expect, it } from "vitest";
import { getSortedTools, getToolBySlug, tools } from "./registry";

describe("tools/registry", () => {
  it("contains exactly the four v1 tool entries", () => {
    expect(tools).toHaveLength(4);
    const slugs = tools.map((t) => t.slug).sort();
    expect(slugs).toEqual(["dns", "mac", "subnet", "uuid"]);
  });

  it("getSortedTools() sorts by featured desc, then name asc (case-insensitive)", () => {
    const sorted = getSortedTools();
    expect(sorted.map((t) => t.slug)).toEqual(["subnet", "uuid", "dns", "mac"]);
  });

  it("ties within the same featured group break by case-insensitive name localeCompare", () => {
    // Featured group: IP Subnet Calculator vs UUID Generator -> "IP Subnet..." < "UUID..." asc
    // Non-featured group: DNS Lookup vs MAC Address Inspector -> "DNS..." < "MAC..." asc
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

  it("every entry has status 'planned' in Phase 1 (no tool logic ships yet)", () => {
    for (const tool of tools) {
      expect(tool.status).toBe("planned");
    }
  });

  it("getToolBySlug() returns the matching entry or undefined", () => {
    expect(getToolBySlug("uuid")?.name).toBe("UUID Generator");
    expect(getToolBySlug("does-not-exist")).toBeUndefined();
  });
});
