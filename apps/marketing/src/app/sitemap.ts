import type { MetadataRoute } from "next";

import { blogPosts } from "@/config/blog";
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
    {
      url: `${site.url}/delete-account/`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${site.url}/blog/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // Tag-filtered URLs are deliberately absent: same posts, thin duplicate pages.
    ...blogPosts.map((post) => ({
      url: `${site.url}/blog/${post.slug}/`,
      lastModified: post.published ? new Date(post.published) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
