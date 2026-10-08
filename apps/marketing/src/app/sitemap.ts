import type { MetadataRoute } from "next";

import { site } from "@/config/site";
import { listPublishedPosts } from "@/lib/blog";

/**
 * /sitemap.xml — regenerated from the published posts, not at build time.
 *
 * Cached like the blog pages (ISR, `blog` tag): the admin's revalidation call
 * expires it on every publish / edit / unpublish / delete, and `revalidate`
 * is the hourly fallback. Only posts the public can read are listed — the
 * query runs under RLS, so drafts, unpublished and deleted posts cannot
 * appear. Posts whose canonical URL points elsewhere are left out: a sitemap
 * lists canonical URLs only.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPublishedPosts();
  const indexable = posts.filter((post) => !post.canonicalUrl || post.canonicalUrl === `${site.url}/blog/${post.slug}/`);
  const newest = indexable.reduce<string | null>(
    (latest, post) => (!latest || post.updatedAt > latest ? post.updatedAt : latest),
    null,
  );

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
    // The index is listed only once it has something on it.
    ...(newest
      ? [
          {
            url: `${site.url}/blog/`,
            lastModified: new Date(newest),
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
        ]
      : []),
    // Category filters are client-side and have no URLs: nothing to list.
    ...indexable.map((post) => ({
      url: `${site.url}/blog/${post.slug}/`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
