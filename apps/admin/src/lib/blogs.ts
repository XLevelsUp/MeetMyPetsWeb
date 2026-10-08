import "server-only";

import { writeAuditLog } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit-actions";
import { hasBody, sanitizeDoc, type BlogDoc } from "@/lib/blog-content";
import {
  BLOG_LIMITS,
  slugify,
  type BlogAction,
  type BlogCategory,
  type BlogInput,
  type BlogListQuery,
  type BlogListResponse,
  type BlogPost,
  type BlogStatus,
  type BlogSummary,
  type Revalidation,
} from "@/lib/blog-contract";
import { blogPaths, marketingOrigin, PUBLIC_SITE_URL, revalidateMarketing } from "@/lib/blog-revalidate";
import type { AdminRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/reference";

/**
 * Blog CMS adapter — public.blog_posts, blog_categories, blog_slug_redirects
 * (migration 20261008000000).
 *
 * The service key writes; the marketing site reads published rows with the
 * publishable key under RLS. So what is public is decided by the database
 * policy, and this file's job is to keep `status` / `published_at` /
 * `deleted_at` truthful and to tell the marketing site when they change.
 *
 * Every write runs: validate → write → audit → revalidate. The write is
 * committed before anything reports success; audit and revalidation failures
 * are surfaced, not swallowed.
 *
 * House adapter pattern: discriminated unions, never throws.
 */

export type BlogResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unconfigured" | "not_found" | "query_failed"; message: string };

export type BlogWriteResult =
  | { ok: true; id: string; slug: string; status: BlogStatus; revalidation: Revalidation }
  | {
      ok: false;
      reason: "unconfigured" | "not_found" | "conflict" | "invalid" | "action_failed" | "unaudited";
      message: string;
    };

type Actor = { userId: string; email: string; role: AdminRole };

const POSTS = "blog_posts";
const CATEGORIES = "blog_categories";
const REDIRECTS = "blog_slug_redirects";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Preview links live this long. Long enough to share with a reviewer, short enough to leak harmlessly. */
export const PREVIEW_TTL_MS = 60 * 60 * 1000;

const POST_COLUMNS =
  "id,slug,title,excerpt,content,faq,category_id,tags,author_name,featured_image,featured_image_alt,featured_image_caption,seo_title,seo_description,canonical_url,og_image,status,published_at,created_at,updated_at";
const SUMMARY_COLUMNS = "id,slug,title,status,author_name,category_id,created_at,updated_at,published_at";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: Record<string, unknown>;
  faq: { q: string; a: string }[];
  category_id: string | null;
  tags: string[];
  author_name: string;
  featured_image: string | null;
  featured_image_alt: string | null;
  featured_image_caption: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  og_image: string | null;
  status: BlogStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function db() {
  return createAdminClient();
}

/** Strip PostgREST filter syntax from free text — same rule as users.ts. */
function sanitizeSearch(term: string): string {
  return term.replace(/[,()"\\*%]/g, "").trim();
}

export function publicUrl(slug: string): string {
  return `${PUBLIC_SITE_URL}/blog/${slug}/`;
}

/* -------------------------------------------------------------------------
 * Image sources
 * ---------------------------------------------------------------------- */

export const BLOG_BUCKET = "blog-images";

function storagePrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  return base ? `${base}/storage/v1/object/public/${BLOG_BUCKET}/` : null;
}

/**
 * An image the public site can actually render: an upload in our bucket.
 * Anything else would either break next/image (host not allowlisted) or
 * hotlink a third party, so it is rejected at save time.
 */
export function isAllowedImageSrc(src: string): boolean {
  const prefix = storagePrefix();
  if (!prefix || !src.startsWith(prefix)) return false;
  const rest = src.slice(prefix.length);
  return /^[A-Za-z0-9/_.-]+$/.test(rest) && !rest.includes("..");
}

/* -------------------------------------------------------------------------
 * Reads
 * ---------------------------------------------------------------------- */

async function categoryNames(): Promise<Map<string, string>> {
  const { data, error } = await db().from(CATEGORIES).select("id,name");
  if (error) throw new Error(`${CATEGORIES}: ${error.message}`);
  return new Map(((data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
}

type SummaryRow = Pick<
  PostRow,
  "id" | "slug" | "title" | "status" | "author_name" | "category_id" | "created_at" | "updated_at" | "published_at"
>;

function toSummary(row: SummaryRow, names: Map<string, string>): BlogSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    authorName: row.author_name,
    categoryId: row.category_id,
    categoryName: row.category_id ? (names.get(row.category_id) ?? null) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    publicUrl: publicUrl(row.slug),
  };
}

export async function listBlogPosts(query: BlogListQuery): Promise<BlogResult<BlogListResponse>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  try {
    const { page, pageSize, q, status, category, sort, dir } = query;
    const offset = (page - 1) * pageSize;

    let request = db().from(POSTS).select(SUMMARY_COLUMNS, { count: "exact" }).is("deleted_at", null);
    if (status !== "all") request = request.eq("status", status);
    if (category !== "all" && UUID_RE.test(category)) request = request.eq("category_id", category);
    if (q) {
      const term = sanitizeSearch(q);
      if (term) request = request.ilike("title", `%${term}%`);
    }

    const column = { updated: "updated_at", created: "created_at", published: "published_at", title: "title" }[sort];
    const { data, count, error } = await request
      .order(column, { ascending: dir === "asc", nullsFirst: false })
      // Tie-break so equal timestamps don't reshuffle between pages.
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`${POSTS}: ${error.message}`);

    const names = await categoryNames();
    const items = ((data ?? []) as PostRow[]).map((row) => toSummary(row, names));
    return { ok: true, data: { items, page, pageSize, total: count ?? 0 } };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

async function readPost(id: string): Promise<PostRow | null> {
  const { data, error } = await db()
    .from(POSTS)
    .select(POST_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`${POSTS}: ${error.message}`);
  return (data as PostRow | null) ?? null;
}

export async function getBlogPost(id: string): Promise<BlogResult<BlogPost>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(id)) return { ok: false, reason: "not_found", message: "No article with that id." };

  try {
    const row = await readPost(id);
    if (!row) return { ok: false, reason: "not_found", message: "No article with that id." };
    const names = await categoryNames();
    return {
      ok: true,
      data: {
        ...toSummary(row, names),
        excerpt: row.excerpt,
        content: row.content,
        faq: row.faq ?? [],
        tags: row.tags ?? [],
        featuredImage: row.featured_image,
        featuredImageAlt: row.featured_image_alt,
        featuredImageCaption: row.featured_image_caption,
        seoTitle: row.seo_title,
        seoDescription: row.seo_description,
        canonicalUrl: row.canonical_url,
        ogImage: row.og_image,
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

export async function listBlogCategories(): Promise<BlogResult<BlogCategory[]>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  try {
    const { data, error } = await db()
      .from(CATEGORIES)
      .select("id,name,slug")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(`${CATEGORIES}: ${error.message}`);
    return { ok: true, data: (data ?? []) as BlogCategory[] };
  } catch (error) {
    return {
      ok: false,
      reason: "query_failed",
      message: error instanceof Error ? error.message : "Unknown query failure.",
    };
  }
}

/* -------------------------------------------------------------------------
 * Writes
 * ---------------------------------------------------------------------- */

async function audit(
  actor: Actor,
  action: AuditAction,
  targetType: "blog_post" | "blog_category",
  targetId: string,
  reason: string,
  metadata: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return writeAuditLog({
    actorId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    targetType,
    targetId,
    reason,
    metadata,
  });
}

function failure(error: unknown): BlogWriteResult {
  const message = error instanceof Error ? error.message : "Unknown action failure.";
  // 23505 = unique_violation: two editors claimed one slug at the same moment.
  if (/duplicate key|23505/.test(message)) {
    return { ok: false, reason: "conflict", message: "That URL slug is already used by another article." };
  }
  return { ok: false, reason: "action_failed", message };
}

/** Validates what Zod can't: image hosts, body size, and the bar for going public. */
function prepare(
  input: BlogInput,
  publishing: boolean,
): { ok: true; doc: BlogDoc } | { ok: false; message: string } {
  for (const [label, src] of [
    ["Featured image", input.featuredImage],
    ["Social share image", input.ogImage],
  ] as const) {
    if (src && !isAllowedImageSrc(src)) {
      return { ok: false, message: `${label} must be uploaded here, not linked from another site.` };
    }
  }

  const doc = sanitizeDoc(input.content, isAllowedImageSrc);
  if (JSON.stringify(doc).length > BLOG_LIMITS.contentBytes) {
    return { ok: false, message: "The article body is too large. Split it, or remove some images or tables." };
  }

  if (publishing) {
    if (!hasBody(doc)) return { ok: false, message: "Add some body text before publishing." };
    if (input.featuredImage && !input.featuredImageAlt) {
      return { ok: false, message: "Describe the featured image (alt text) before publishing." };
    }
    if (!input.categoryId) return { ok: false, message: "Pick a category before publishing." };
  }
  return { ok: true, doc };
}

async function slugTaken(slug: string, excludeId?: string): Promise<string | null> {
  let request = db().from(POSTS).select("id,title").eq("slug", slug).is("deleted_at", null);
  if (excludeId) request = request.neq("id", excludeId);
  const { data, error } = await request.limit(1);
  if (error) throw new Error(`${POSTS}: ${error.message}`);
  const hit = (data ?? [])[0] as { id: string; title: string } | undefined;
  return hit ? hit.title : null;
}

function columnsFrom(input: BlogInput, doc: BlogDoc) {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content: doc,
    faq: input.faq,
    tags: input.tags,
    author_name: input.authorName,
    category_id: input.categoryId,
    featured_image: input.featuredImage,
    featured_image_alt: input.featuredImageAlt,
    featured_image_caption: input.featuredImageCaption,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    canonical_url: input.canonicalUrl,
    og_image: input.ogImage,
  };
}

/**
 * A live post now owns `slug`, so any redirect FROM that slug is dead weight
 * (the marketing route resolves posts before redirects, but a stale row would
 * resurface the moment this post is deleted).
 */
async function claimSlug(slug: string): Promise<void> {
  const { error } = await db().from(REDIRECTS).delete().eq("old_slug", slug);
  if (error) throw new Error(`${REDIRECTS}: ${error.message}`);
}

/** Wraps the post-write steps every mutation shares. */
async function finish(
  actor: Actor,
  action: AuditAction,
  row: { id: string; slug: string; status: BlogStatus },
  reason: string,
  metadata: Record<string, unknown>,
  touchesPublic: boolean,
  extraSlugs: string[] = [],
): Promise<BlogWriteResult> {
  const audited = await audit(actor, action, "blog_post", row.id, reason, metadata);
  const revalidation: Revalidation = touchesPublic
    ? await revalidateMarketing(blogPaths([row.slug, ...extraSlugs]))
    : { status: "skipped" };

  if (!audited.ok) {
    return {
      ok: false,
      reason: "unaudited",
      message: `Saved, but the audit write failed: ${audited.message}`,
    };
  }
  return { ok: true, ...row, revalidation };
}

export async function createBlogPost(
  input: BlogInput,
  intent: "save" | "publish",
  actor: Actor,
): Promise<BlogWriteResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }

  const publishing = intent === "publish";
  const prepared = prepare(input, publishing);
  if (!prepared.ok) return { ok: false, reason: "invalid", message: prepared.message };

  try {
    const owner = await slugTaken(input.slug);
    if (owner) {
      return { ok: false, reason: "conflict", message: `The URL slug is already used by “${owner}”.` };
    }

    const now = new Date().toISOString();
    const status: BlogStatus = publishing ? "published" : "draft";
    const { data, error } = await db()
      .from(POSTS)
      .insert({
        ...columnsFrom(input, prepared.doc),
        status,
        published_at: publishing ? now : null,
        created_at: now,
        updated_at: now,
        created_by: actor.userId,
        updated_by: actor.userId,
      })
      .select("id,slug,status")
      .maybeSingle();
    if (error) throw new Error(`${POSTS}: ${error.message}`);
    const row = data as { id: string; slug: string; status: BlogStatus } | null;
    if (!row) throw new Error(`${POSTS}: insert returned no row.`);

    if (publishing) await claimSlug(row.slug);

    return await finish(
      actor,
      publishing ? "blog.publish" : "blog.create",
      row,
      publishing ? "Created and published." : "Created as a draft.",
      { title: input.title, slug: row.slug, status },
      publishing,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function updateBlogPost(
  id: string,
  input: BlogInput,
  intent: "save" | "publish",
  actor: Actor,
): Promise<BlogWriteResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(id)) return { ok: false, reason: "not_found", message: "No article with that id." };

  try {
    const before = await readPost(id);
    if (!before) return { ok: false, reason: "not_found", message: "No article with that id." };

    const publishing = intent === "publish";
    // Saving a published article re-checks the publish bar: an edit must not
    // leave a live page without a body or with an undescribed hero image.
    const prepared = prepare(input, publishing || before.status === "published");
    if (!prepared.ok) return { ok: false, reason: "invalid", message: prepared.message };

    const slugChanged = input.slug !== before.slug;
    if (slugChanged) {
      const owner = await slugTaken(input.slug, id);
      if (owner) {
        return { ok: false, reason: "conflict", message: `The URL slug is already used by “${owner}”.` };
      }
    }

    const now = new Date().toISOString();
    const status: BlogStatus = publishing ? "published" : before.status;
    const { data, error } = await db()
      .from(POSTS)
      .update({
        ...columnsFrom(input, prepared.doc),
        status,
        published_at: publishing ? (before.published_at ?? now) : before.published_at,
        updated_at: now,
        updated_by: actor.userId,
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id,slug,status");
    if (error) throw new Error(`${POSTS}: ${error.message}`);
    const row = (data ?? [])[0] as { id: string; slug: string; status: BlogStatus } | undefined;
    if (!row) return { ok: false, reason: "not_found", message: "No article with that id." };

    // An address that has ever been public may be linked or indexed: keep it
    // alive as a 308 to the post. A never-published draft's old slug is not.
    if (slugChanged && before.published_at) {
      await claimSlug(before.slug);
      const { error: redirectError } = await db()
        .from(REDIRECTS)
        .insert({ old_slug: before.slug, post_id: id });
      if (redirectError) throw new Error(`${REDIRECTS}: ${redirectError.message}`);
    }
    if (status === "published") await claimSlug(row.slug);

    const wasPublic = before.status === "published";
    return await finish(
      actor,
      publishing && !wasPublic ? "blog.publish" : "blog.update",
      row,
      publishing && !wasPublic ? "Published." : "Edited.",
      {
        title: input.title,
        slug: row.slug,
        ...(slugChanged ? { previousSlug: before.slug } : {}),
        previousStatus: before.status,
        status,
      },
      wasPublic || status === "published",
      slugChanged ? [before.slug] : [],
    );
  } catch (error) {
    return failure(error);
  }
}

export async function applyBlogAction(
  id: string,
  action: BlogAction,
  reason: string | undefined,
  actor: Actor,
): Promise<BlogWriteResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  if (!UUID_RE.test(id)) return { ok: false, reason: "not_found", message: "No article with that id." };

  try {
    const before = await readPost(id);
    if (!before) return { ok: false, reason: "not_found", message: "No article with that id." };

    const now = new Date().toISOString();
    let patch: Record<string, unknown>;
    let auditAction: AuditAction;
    let auditReason: string;

    if (action === "publish") {
      if (before.status === "published") {
        return { ok: false, reason: "conflict", message: "This article is already published." };
      }
      // Re-validate what is stored: it was saved as a draft, under a lower bar.
      const prepared = prepare(
        {
          title: before.title,
          slug: before.slug,
          excerpt: before.excerpt,
          content: before.content,
          faq: before.faq ?? [],
          tags: before.tags ?? [],
          authorName: before.author_name,
          categoryId: before.category_id,
          featuredImage: before.featured_image,
          featuredImageAlt: before.featured_image_alt,
          featuredImageCaption: before.featured_image_caption,
          seoTitle: before.seo_title,
          seoDescription: before.seo_description,
          canonicalUrl: before.canonical_url,
          ogImage: before.og_image,
        },
        true,
      );
      if (!prepared.ok) return { ok: false, reason: "invalid", message: prepared.message };
      patch = { status: "published", published_at: before.published_at ?? now };
      auditAction = "blog.publish";
      auditReason = reason || "Published.";
    } else if (action === "unpublish") {
      if (before.status !== "published") {
        return { ok: false, reason: "conflict", message: "Only a published article can be unpublished." };
      }
      patch = { status: "unpublished" };
      auditAction = "blog.unpublish";
      auditReason = reason || "Unpublished.";
    } else {
      patch = { deleted_at: now, deleted_by: actor.userId, preview_token: null, preview_token_expires_at: null };
      auditAction = "blog.delete";
      auditReason = reason ?? "Deleted.";
    }

    const { data, error } = await db()
      .from(POSTS)
      .update({ ...patch, updated_at: now, updated_by: actor.userId })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id,slug,status");
    if (error) throw new Error(`${POSTS}: ${error.message}`);
    const row = (data ?? [])[0] as { id: string; slug: string; status: BlogStatus } | undefined;
    if (!row) return { ok: false, reason: "not_found", message: "No article with that id." };

    if (action === "publish") await claimSlug(row.slug);

    return await finish(
      actor,
      auditAction,
      row,
      auditReason,
      { title: before.title, slug: before.slug, previousStatus: before.status },
      before.status === "published" || action === "publish",
    );
  } catch (error) {
    return failure(error);
  }
}

export async function createBlogCategory(
  name: string,
  actor: Actor,
): Promise<{ ok: true; data: BlogCategory } | { ok: false; reason: "unconfigured" | "conflict" | "invalid" | "action_failed"; message: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  const slug = slugify(name).slice(0, 80);
  if (!slug) return { ok: false, reason: "invalid", message: "Use letters or numbers in the name." };

  try {
    const { data: existing, error: readError } = await db().from(CATEGORIES).select("id,name,slug");
    if (readError) throw new Error(`${CATEGORIES}: ${readError.message}`);
    const rows = (existing ?? []) as BlogCategory[];
    const clash = rows.find((row) => row.slug === slug || row.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (clash) return { ok: false, reason: "conflict", message: `“${clash.name}” already exists.` };

    const { data, error } = await db()
      .from(CATEGORIES)
      .insert({ name: name.trim(), slug, sort_order: rows.length })
      .select("id,name,slug")
      .maybeSingle();
    if (error) throw new Error(`${CATEGORIES}: ${error.message}`);
    const row = data as BlogCategory | null;
    if (!row) throw new Error(`${CATEGORIES}: insert returned no row.`);

    // Category names show on public cards, but a new one has no posts yet, so
    // nothing public changes and no revalidation is needed.
    await audit(actor, "blog_category.create", "blog_category", row.id, "Category added.", { name: row.name, slug });
    return { ok: true, data: row };
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}

/**
 * Mints a one-hour preview link. The token is the only credential: the
 * marketing preview route hands it to `blog_post_preview()`, a SECURITY
 * DEFINER function that returns the row only while the token is unexpired.
 * Minting a new one invalidates the previous link.
 */
export async function createPreview(
  id: string,
): Promise<{ ok: true; data: { url: string; expiresAt: string } } | { ok: false; reason: "unconfigured" | "not_found" | "action_failed"; message: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "unconfigured", message: "Supabase env vars are not set." };
  }
  const origin = marketingOrigin();
  if (!origin) {
    return { ok: false, reason: "unconfigured", message: "MARKETING_SITE_URL is not set, so there is nowhere to preview." };
  }
  if (!UUID_RE.test(id)) return { ok: false, reason: "not_found", message: "No article with that id." };

  try {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS).toISOString();
    const { data, error } = await db()
      .from(POSTS)
      .update({ preview_token: token, preview_token_expires_at: expiresAt })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");
    if (error) throw new Error(`${POSTS}: ${error.message}`);
    if ((data ?? []).length === 0) return { ok: false, reason: "not_found", message: "No article with that id." };
    return { ok: true, data: { url: `${origin}/blog-preview/${token}/`, expiresAt } };
  } catch (error) {
    return {
      ok: false,
      reason: "action_failed",
      message: error instanceof Error ? error.message : "Unknown action failure.",
    };
  }
}
