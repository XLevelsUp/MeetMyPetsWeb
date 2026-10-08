import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ArticleView } from "@/components/blog/article-view";
import { BlogPostingLd, postUrl } from "@/components/seo/blog-ld";
import { site } from "@/config/site";
import { getPublishedPost, listPublishedPosts, relatedPosts, resolveOldSlug } from "@/lib/blog";
import { absoluteUrl } from "@/lib/blog-utils";

/**
 * One article, as cached HTML (ISR).
 *
 * - Posts published at build time are prerendered by generateStaticParams.
 * - A post published later renders on its first request and is cached from
 *   then on (dynamicParams defaults to true) — no deploy needed.
 * - Every fetch is tagged `blog`, so publish / edit / unpublish / delete in
 *   the admin expires these pages immediately; `revalidate` is the fallback.
 * - An unknown slug is checked against blog_slug_redirects: a renamed post
 *   answers with a 308 to its current URL, anything else 404s.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await listPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};

  const url = post.canonicalUrl ?? postUrl(post.slug);
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt;
  const shareImage = post.ogImage ?? post.featuredImage;
  const image = shareImage ? absoluteUrl(shareImage, site.url) : undefined;
  const imageAlt = post.ogImage ? title : (post.featuredImageAlt ?? title);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: site.name,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      ...(post.category ? { section: post.category.name } : {}),
      ...(post.tags.length ? { tags: post.tags } : {}),
      ...(image ? { images: [{ url: image, alt: imageAlt }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      site: site.twitter,
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    const current = await resolveOldSlug(slug);
    if (current && current !== slug) permanentRedirect(`/blog/${current}/`);
    notFound();
  }

  const related = relatedPosts(await listPublishedPosts(), post);

  return (
    <>
      <BlogPostingLd post={post} />
      <ArticleView post={post} related={related} />
    </>
  );
}
