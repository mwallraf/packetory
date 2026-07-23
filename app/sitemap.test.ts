import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const BASE_URL = "https://packetory.dev";

describe("app/sitemap", () => {
  afterEach(() => {
    vi.doUnmock("@/tools/registry");
    vi.resetModules();
  });

  it("includes the homepage URL and the /privacy URL", async () => {
    vi.resetModules();
    const { default: sitemap } = await import("./sitemap");
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain(BASE_URL);
    expect(urls).toContain(`${BASE_URL}/privacy`);
  });

  it("contains no /tools/* entries when every registry tool is 'planned' (Phase 1 state)", async () => {
    vi.resetModules();
    const { default: sitemap } = await import("./sitemap");
    const toolUrls = sitemap()
      .map((entry) => entry.url)
      .filter((url) => url.includes("/tools/"));

    expect(toolUrls).toHaveLength(0);
  });

  it("auto-includes a synthetic 'active' registry entry's /tools/<slug> URL with no other change (SHELL-04)", async () => {
    vi.resetModules();
    vi.doMock("@/tools/registry", () => ({
      tools: [
        {
          slug: "synthetic-active",
          name: "Synthetic Active Tool",
          shortName: "Synth",
          description: "A synthetic tool used only to verify sitemap derivation.",
          category: "network",
          keywords: ["synthetic"],
          icon: "Test",
          status: "active",
          clientOnly: true,
          featured: false,
        },
        {
          slug: "synthetic-planned",
          name: "Synthetic Planned Tool",
          shortName: "Synth2",
          description: "A synthetic planned tool that must NOT appear.",
          category: "network",
          keywords: ["synthetic"],
          icon: "Test",
          status: "planned",
          clientOnly: true,
          featured: false,
        },
      ],
    }));

    const { default: sitemap } = await import("./sitemap");
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain(`${BASE_URL}/tools/synthetic-active`);
    expect(urls).not.toContain(`${BASE_URL}/tools/synthetic-planned`);
    // Homepage and /privacy must still be present unchanged.
    expect(urls).toContain(BASE_URL);
    expect(urls).toContain(`${BASE_URL}/privacy`);
  });

  it("does not hardcode a tool slug literal in app/sitemap.ts (registry-derived only)", () => {
    const source = readFileSync(path.join(__dirname, "sitemap.ts"), "utf-8");
    const registrySlugs = ["uuid", "subnet", "dns", "mac"];

    for (const slug of registrySlugs) {
      const quotedLiteral = new RegExp(`["'\`]${slug}["'\`]`);
      expect(source).not.toMatch(quotedLiteral);
    }
  });
});
