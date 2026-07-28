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
  ];
}
