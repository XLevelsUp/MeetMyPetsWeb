import type { MetadataRoute } from "next";

import { site } from "@/config/site";

/**
 * Emitted as a static /sitemap.xml during `next build`.
 *
 * `force-static` is mandatory under `output: 'export'`: Next.js 16 refuses to
 * collect page data for a metadata route without it.
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${site.url}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    // Trailing slashes match `trailingSlash: true` and the footer's hrefs, so
    // crawlers are never sent through a redirect to reach these.
    {
      url: `${site.url}/privacy/`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${site.url}/terms/`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
