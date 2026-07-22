import type { MetadataRoute } from "next";
import { SITE_URL } from "./sitemap";

/**
 * Allows crawling of all public routes and points crawlers at the
 * registry-derived sitemap (QUAL-03).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
