import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { site } from "@/config/site";
import { listPublishedPosts } from "@/lib/blog";

// Built per request so it never freezes; posts still come from the hourly, "blog"-tagged fetch cache.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const posts = await listPublishedPosts();
  const indexable = posts.filter(
    (post) =>
      !post.canonicalUrl ||
      post.canonicalUrl.replace(/^https?:\/\/meetmypets\.app/, site.url) ===
        `${site.url}/blog/${post.slug}/`,
  );
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
    {
      url: `${site.url}/csae-policy/`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${site.url}/our-story/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${site.url}/about/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${site.url}/app-for-pets/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${site.url}/leaderboard/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${site.url}/team-onboarding/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${site.url}/team/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
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
