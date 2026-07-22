import type { MetadataRoute } from "next";
import { tools } from "@/tools/registry";

/**
 * Canonical production origin (project-brief.md §7/§10.3). Exported so
 * app/robots.ts can build the absolute /sitemap.xml URL from a single
 * source instead of duplicating the literal.
 */
export const SITE_URL = "https://packetory.dev";

/**
 * Registry-derived sitemap (QUAL-03, SHELL-04).
 *
 * Tool entries are produced by filtering the imported `tools/registry.ts`
 * array — never by hardcoding a slug/URL here. A tool becomes visible in
 * the sitemap the moment its registry `status` moves off `"planned"`, with
 * no edit to this file required.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const toolEntries: MetadataRoute.Sitemap = tools
    .filter((tool) => tool.status !== "planned")
    .map((tool) => ({
      url: `${SITE_URL}/tools/${tool.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: tool.featured ? 0.9 : 0.7,
    }));

  return [...staticEntries, ...toolEntries];
}
