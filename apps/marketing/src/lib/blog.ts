/**
 * Published blog content, read from Supabase (public.blog_posts) at render
 * time and cached as ISR.
 *
 * WHY THIS IS SAFE WITH A PUBLIC KEY
 * It uses the PUBLISHABLE key (role `anon`). The database decides what that
 * role can see: RLS returns only rows that are published, not deleted and
 * already past `published_at`, and column grants hide drafts' bookkeeping
 * (migration 20261008000000). A bug in this file cannot leak a draft — the
 * query would simply come back without it.
 *
 * FRESHNESS
 * Every fetch is tagged `blog`. The admin calls /api/revalidate/ after each
 * publish / edit / unpublish / delete, which expires the tag, so the next
 * request renders fresh HTML. BLOG_REVALIDATE_SECONDS is the safety net if
 * that call ever fails: stale for at most an hour, never stuck.
 *
 * FAILURE MODES
 * - Unconfigured (no SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY, e.g. CI and
 *   fresh clones): behaves as an empty blog, so builds stay hermetic.
 * - Configured but the request fails: THROWS. During ISR that keeps the last
 *   good page in place instead of caching an empty blog or a false 404; during
 *   `next build` it fails the build rather than shipping a blog with no posts.
 *
 * Server-only by usage: imported from Server Components, route handlers and
 * metadata routes, never from a "use client" file.
 */

import type { BlogDoc } from "@/lib/blog-content";

export const BLOG_TAG = "blog";
/** Must match the literal `revalidate` exports in the blog routes and sitemap. */
export const BLOG_REVALIDATE_SECONDS = 3600;

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BlogCategoryRef = { name: string; slug: string };

export type BlogCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  authorName: string;
  publishedAt: string;
  updatedAt: string;
  canonicalUrl: string | null;
  category: BlogCategoryRef | null;
};

export type BlogArticle = BlogCard & {
  content: BlogDoc;
  faq: { q: string; a: string }[];
  tags: string[];
  featuredImageCaption: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
};

/** A draft opened through a preview link — no SEO fields, and maybe no date yet. */
export type BlogPreview = Omit<BlogArticle, "publishedAt" | "seoTitle" | "seoDescription" | "ogImage" | "canonicalUrl"> & {
  publishedAt: string | null;
  status: string;
};

type Row = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featured_image: string | null;
  featured_image_alt: string | null;
  author_name: string;
  published_at: string;
  updated_at: string;
  canonical_url: string | null;
  category: BlogCategoryRef | null;
  content?: BlogDoc;
  faq?: { q: string; a: string }[];
  tags?: string[];
  featured_image_caption?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image?: string | null;
};

const CARD_COLUMNS =
  "id,slug,title,excerpt,featured_image,featured_image_alt,author_name,published_at,updated_at,canonical_url,category:blog_categories(name,slug)";
const ARTICLE_COLUMNS = `${CARD_COLUMNS},content,faq,tags,featured_image_caption,seo_title,seo_description,og_image`;

/**
 * The list query deliberately leaves `content` out: Next's data cache refuses
 * entries over 2 MB, and a few hundred article bodies would cross it and
 * silently stop caching the blog index.
 */
const LIST_LIMIT = 500;

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

export function isBlogConfigured(): boolean {
  return config() !== null;
}

async function rest<T>(path: string, init: RequestInit & { next?: NextFetchRequestConfig } = {}): Promise<T> {
  const cfg = config();
  if (!cfg) throw new Error("Blog source is not configured.");

  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: cfg.key, Accept: "application/json", ...(init.headers ?? {}) },
    next: init.next ?? { revalidate: BLOG_REVALIDATE_SECONDS, tags: [BLOG_TAG] },
  });
  if (!res.ok) {
    throw new Error(`Blog source returned HTTP ${res.status} for ${path.split("?")[0]}.`);
  }
  return (await res.json()) as T;
}

function toCard(row: Row): BlogCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    featuredImage: row.featured_image,
    featuredImageAlt: row.featured_image_alt,
    authorName: row.author_name,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    canonicalUrl: row.canonical_url,
    category: row.category,
  };
}

function toArticle(row: Row): BlogArticle {
  return {
    ...toCard(row),
    content: row.content ?? { type: "doc", content: [] },
    faq: Array.isArray(row.faq) ? row.faq : [],
    tags: row.tags ?? [],
    featuredImageCaption: row.featured_image_caption ?? null,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    ogImage: row.og_image ?? null,
  };
}

/** Every published post, newest first. Empty when unconfigured. */
export async function listPublishedPosts(): Promise<BlogCard[]> {
  if (!isBlogConfigured()) return [];
  const rows = await rest<Row[]>(
    `blog_posts?select=${CARD_COLUMNS}&order=published_at.desc,id.asc&limit=${LIST_LIMIT}`,
  );
  return rows.map(toCard);
}

export async function getPublishedPost(slug: string): Promise<BlogArticle | null> {
  if (!isBlogConfigured() || !SLUG_RE.test(slug)) return null;
  const rows = await rest<Row[]>(`blog_posts?select=${ARTICLE_COLUMNS}&slug=eq.${slug}&limit=1`);
  return rows[0] ? toArticle(rows[0]) : null;
}

/**
 * The current slug for a retired one, if its post is still published. The
 * embedded post comes back null under RLS when it is not, so an old URL of an
 * unpublished article 404s rather than redirecting to a 404.
 */
export async function resolveOldSlug(slug: string): Promise<string | null> {
  if (!isBlogConfigured() || !SLUG_RE.test(slug)) return null;
  const rows = await rest<{ post: { slug: string } | null }[]>(
    `blog_slug_redirects?select=post:blog_posts(slug)&old_slug=eq.${slug}&limit=1`,
  );
  return rows[0]?.post?.slug ?? null;
}

/**
 * A draft by preview token. Never cached: the token expires, and a cached
 * preview would outlive it.
 */
export async function getPreview(token: string): Promise<BlogPreview | null> {
  if (!isBlogConfigured() || !UUID_RE.test(token)) return null;
  const row = await rest<(Omit<Row, "category"> & { category: BlogCategoryRef | null; status: string }) | null>(
    "rpc/blog_post_preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: token }),
      cache: "no-store",
      next: { revalidate: 0 },
    },
  );
  if (!row) return null;
  const article = toArticle(row as Row);
  return { ...article, publishedAt: row.published_at ?? null, status: row.status };
}

/** Same category first, then the newest of the rest. */
export function relatedPosts(all: BlogCard[], post: { id: string; category: BlogCategoryRef | null }, count = 3): BlogCard[] {
  const others = all.filter((candidate) => candidate.id !== post.id);
  const same = others.filter((candidate) => post.category && candidate.category?.slug === post.category.slug);
  const rest = others.filter((candidate) => !same.includes(candidate));
  return [...same, ...rest].slice(0, count);
}
