import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeSupabaseMock, type SupabaseMock, type TableResult } from "@/test/supabase-mock";

const holder = vi.hoisted(() => ({
  admin: null as SupabaseMock | null,
  configured: true,
  revalidations: [] as string[][],
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => holder.admin }));
vi.mock("@/lib/supabase/reference", () => ({ isSupabaseConfigured: () => holder.configured }));
vi.mock("@/lib/blog-revalidate", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/blog-revalidate")>();
  return {
    ...real,
    revalidateMarketing: async (paths: string[]) => {
      holder.revalidations.push(paths);
      return { status: "ok" as const };
    },
  };
});

import { applyBlogAction, createBlogPost, isAllowedImageSrc, updateBlogPost } from "@/lib/blogs";
import type { BlogInput } from "@/lib/blog-contract";

const ID = "11111111-1111-4111-8111-111111111111";
const CAT = "22222222-2222-4222-8222-222222222222";
const ACTOR = { userId: "99999999-9999-4999-8999-999999999999", email: "mod@meetmypets.dev", role: "moderator" as const };

const BODY = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Real words here." }] }] };

const input = (overrides: Partial<BlogInput> = {}): BlogInput => ({
  title: "First playdate",
  slug: "first-playdate",
  excerpt: "How to prepare.",
  content: BODY,
  faq: [],
  tags: [],
  authorName: "MeetMyPets Team",
  categoryId: CAT,
  featuredImage: null,
  featuredImageAlt: null,
  featuredImageCaption: null,
  seoTitle: null,
  seoDescription: null,
  canonicalUrl: null,
  ogImage: null,
  ...overrides,
});

const row = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  slug: "first-playdate",
  title: "First playdate",
  excerpt: "How to prepare.",
  content: BODY,
  faq: [],
  category_id: CAT,
  tags: [],
  author_name: "MeetMyPets Team",
  featured_image: null,
  featured_image_alt: null,
  featured_image_caption: null,
  seo_title: null,
  seo_description: null,
  canonical_url: null,
  og_image: null,
  status: "draft",
  published_at: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  ...overrides,
});

function setup(tables: Record<string, TableResult>) {
  holder.admin = makeSupabaseMock(tables);
  return holder.admin;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
  holder.revalidations = [];
});

afterEach(() => {
  holder.configured = true;
});

describe("isAllowedImageSrc", () => {
  it.each([
    ["https://proj.supabase.co/storage/v1/object/public/blog-images/2026/10/a.webp", true],
    // The static blog's local images were removed; only bucket uploads remain valid.
    ["/blog/why-pet-socialisation-matters.webp", false],
    ["https://proj.supabase.co/storage/v1/object/public/avatars/a.webp", false],
    ["https://proj.supabase.co/storage/v1/object/public/blog-images/../avatars/a.webp", false],
    ["https://evil.example/a.webp", false],
    ["//evil.example/a.webp", false],
    ["/blog/../../etc/passwd", false],
    ["/blog/page.html", false],
  ])("%s → %s", (src, expected) => {
    expect(isAllowedImageSrc(src)).toBe(expected);
  });
});

describe("createBlogPost", () => {
  it("saves a draft, audits it, and does NOT touch the public site", async () => {
    const db = setup({
      "public.blog_posts#select": { rows: [] },
      "public.blog_posts#insert": { single: { id: ID, slug: "first-playdate", status: "draft" } },
      "public.blog_categories": { rows: [] },
    });

    const result = await createBlogPost(input(), "save", ACTOR);

    expect(result).toEqual({
      ok: true,
      id: ID,
      slug: "first-playdate",
      status: "draft",
      revalidation: { status: "skipped" },
    });
    const insert = db.calls.find((c) => c.op === "insert" && c.key === "public.blog_posts");
    expect(insert?.values).toMatchObject({ status: "draft", published_at: null, created_by: ACTOR.userId });
    const audit = db.calls.find((c) => c.key === "public.admin_audit_logs");
    expect(audit?.values).toMatchObject({ action: "blog.create", target_type: "blog_post", target_id: ID });
    expect(holder.revalidations).toEqual([]);
  });

  it("publishing sets published_at and revalidates the listing, the post and the sitemap", async () => {
    const db = setup({
      "public.blog_posts#select": { rows: [] },
      "public.blog_posts#insert": { single: { id: ID, slug: "first-playdate", status: "published" } },
    });

    const result = await createBlogPost(input(), "publish", ACTOR);

    expect(result.ok).toBe(true);
    const insert = db.calls.find((c) => c.op === "insert" && c.key === "public.blog_posts");
    expect((insert?.values as { published_at: string }).published_at).toEqual(expect.any(String));
    expect(holder.revalidations).toEqual([["/blog/", "/sitemap.xml", "/blog/first-playdate/"]]);
    // A slug a live post now owns cannot also be a redirect.
    expect(db.calls.some((c) => c.op === "delete" && c.key === "public.blog_slug_redirects")).toBe(true);
  });

  it("refuses a slug another live post already uses", async () => {
    setup({ "public.blog_posts#select": { rows: [{ id: "other", title: "Older post" }] } });
    const result = await createBlogPost(input(), "save", ACTOR);
    expect(result).toMatchObject({ ok: false, reason: "conflict" });
  });

  it("maps a unique-index race to a conflict, not a 500", async () => {
    setup({
      "public.blog_posts#select": { rows: [] },
      "public.blog_posts#insert": { error: { message: 'duplicate key value violates unique constraint "blog_posts_slug_live_key"' } },
    });
    const result = await createBlogPost(input(), "save", ACTOR);
    expect(result).toMatchObject({ ok: false, reason: "conflict" });
  });

  it.each([
    ["an empty body", { content: { type: "doc", content: [] } }, /body text/],
    [
      "a featured image without alt text",
      { featuredImage: "https://proj.supabase.co/storage/v1/object/public/blog-images/2026/10/a.webp" },
      /alt text/,
    ],
    ["no category", { categoryId: null }, /category/],
  ])("will not publish with %s", async (_label, overrides, message) => {
    const db = setup({ "public.blog_posts#select": { rows: [] } });
    const result = await createBlogPost(input(overrides as Partial<BlogInput>), "publish", ACTOR);
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(!result.ok && result.message).toMatch(message);
    expect(db.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("rejects an image hotlinked from another host", async () => {
    setup({ "public.blog_posts#select": { rows: [] } });
    const result = await createBlogPost(input({ featuredImage: "https://evil.example/a.png", featuredImageAlt: "x" }), "save", ACTOR);
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("stores the sanitised body, not what was posted", async () => {
    const db = setup({
      "public.blog_posts#select": { rows: [] },
      "public.blog_posts#insert": { single: { id: ID, slug: "first-playdate", status: "draft" } },
    });
    const dirty = {
      type: "doc",
      content: [
        { type: "script", text: "alert(1)" },
        { type: "paragraph", content: [{ type: "text", text: "hi", marks: [{ type: "link", attrs: { href: "javascript:x" } }] }] },
      ],
    };
    await createBlogPost(input({ content: dirty }), "save", ACTOR);
    const insert = db.calls.find((c) => c.op === "insert" && c.key === "public.blog_posts");
    expect((insert?.values as { content: unknown }).content).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
    });
  });
});

describe("updateBlogPost", () => {
  it("renaming a published post's slug records a redirect and refreshes both URLs", async () => {
    const db = setup({
      // `single` feeds the read of the post; `rows: []` the slug-collision check.
      "public.blog_posts#select": { single: row({ status: "published", published_at: "2026-10-02T00:00:00Z" }), rows: [] },
      "public.blog_posts#update": { rows: [{ id: ID, slug: "new-slug", status: "published" }] },
    });

    const result = await updateBlogPost(ID, input({ slug: "new-slug" }), "save", ACTOR);

    expect(result).toMatchObject({ ok: true, slug: "new-slug", status: "published" });
    const redirect = db.calls.find((c) => c.op === "insert" && c.key === "public.blog_slug_redirects");
    expect(redirect?.values).toEqual({ old_slug: "first-playdate", post_id: ID });
    expect(holder.revalidations).toEqual([["/blog/", "/sitemap.xml", "/blog/new-slug/", "/blog/first-playdate/"]]);
    const update = db.calls.find((c) => c.op === "update" && c.key === "public.blog_posts");
    // First-publication date is preserved across edits.
    expect(update?.values).toMatchObject({ published_at: "2026-10-02T00:00:00Z", status: "published" });
  });

  it("does not create a redirect for a draft that was never public", async () => {
    const db = setup({
      "public.blog_posts#select": { single: row(), rows: [] },
      "public.blog_posts#update": { rows: [{ id: ID, slug: "new-slug", status: "draft" }] },
    });
    await updateBlogPost(ID, input({ slug: "new-slug" }), "save", ACTOR);
    expect(db.calls.some((c) => c.key === "public.blog_slug_redirects" && c.op === "insert")).toBe(false);
    expect(holder.revalidations).toEqual([]);
  });

  it("holds an edit to a live post to the publishing bar", async () => {
    setup({ "public.blog_posts#select": { single: row({ status: "published", published_at: "2026-10-02T00:00:00Z" }), rows: [] } });
    const result = await updateBlogPost(ID, input({ content: { type: "doc", content: [] } }), "save", ACTOR);
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("404s on a malformed id without querying", async () => {
    const db = setup({});
    expect(await updateBlogPost("not-a-uuid", input(), "save", ACTOR)).toMatchObject({ ok: false, reason: "not_found" });
    expect(db.calls).toEqual([]);
  });
});

describe("applyBlogAction", () => {
  it("unpublish moves status, keeps published_at, and refreshes the site", async () => {
    const db = setup({
      "public.blog_posts#select": { single: row({ status: "published", published_at: "2026-10-02T00:00:00Z" }) },
      "public.blog_posts#update": { rows: [{ id: ID, slug: "first-playdate", status: "unpublished" }] },
    });
    const result = await applyBlogAction(ID, "unpublish", undefined, ACTOR);
    expect(result).toMatchObject({ ok: true, status: "unpublished", revalidation: { status: "ok" } });
    const update = db.calls.find((c) => c.op === "update");
    expect(update?.values).toMatchObject({ status: "unpublished" });
    expect(update?.values).not.toHaveProperty("published_at");
  });

  it("refuses to unpublish a draft", async () => {
    setup({ "public.blog_posts#select": { single: row() } });
    expect(await applyBlogAction(ID, "unpublish", undefined, ACTOR)).toMatchObject({ ok: false, reason: "conflict" });
  });

  it("publishing a stored draft re-validates it first", async () => {
    setup({ "public.blog_posts#select": { single: row({ content: { type: "doc", content: [] } }) } });
    expect(await applyBlogAction(ID, "publish", undefined, ACTOR)).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("republishing keeps the original publication date", async () => {
    const db = setup({
      "public.blog_posts#select": { single: row({ status: "unpublished", published_at: "2026-10-02T00:00:00Z" }) },
      "public.blog_posts#update": { rows: [{ id: ID, slug: "first-playdate", status: "published" }] },
    });
    await applyBlogAction(ID, "publish", undefined, ACTOR);
    expect(db.calls.find((c) => c.op === "update")?.values).toMatchObject({
      status: "published",
      published_at: "2026-10-02T00:00:00Z",
    });
  });

  it("delete is soft, clears the preview token, audits the reason, and refreshes a live post", async () => {
    const db = setup({
      "public.blog_posts#select": { single: row({ status: "published", published_at: "2026-10-02T00:00:00Z" }) },
      "public.blog_posts#update": { rows: [{ id: ID, slug: "first-playdate", status: "published" }] },
    });
    const result = await applyBlogAction(ID, "delete", "Duplicate of another guide.", ACTOR);
    expect(result.ok).toBe(true);
    expect(db.calls.find((c) => c.op === "update")?.values).toMatchObject({
      deleted_at: expect.any(String),
      deleted_by: ACTOR.userId,
      preview_token: null,
    });
    expect(db.calls.some((c) => c.op === "delete" && c.key === "public.blog_posts")).toBe(false);
    expect(db.calls.find((c) => c.key === "public.admin_audit_logs")?.values).toMatchObject({
      action: "blog.delete",
      reason: "Duplicate of another guide.",
    });
    expect(holder.revalidations).toHaveLength(1);
  });

  it("deleting a never-published draft does not ping the public site", async () => {
    setup({
      "public.blog_posts#select": { single: row() },
      "public.blog_posts#update": { rows: [{ id: ID, slug: "first-playdate", status: "draft" }] },
    });
    await applyBlogAction(ID, "delete", "Abandoned draft, not needed.", ACTOR);
    expect(holder.revalidations).toEqual([]);
  });

  it("reports `unaudited` when the write landed but the audit row did not", async () => {
    setup({
      "public.blog_posts#select": { single: row({ status: "published", published_at: "2026-10-02T00:00:00Z" }) },
      "public.blog_posts#update": { rows: [{ id: ID, slug: "first-playdate", status: "unpublished" }] },
      "public.admin_audit_logs": { error: { message: "permission denied" } },
    });
    expect(await applyBlogAction(ID, "unpublish", undefined, ACTOR)).toMatchObject({ ok: false, reason: "unaudited" });
    // The public site is still told — the change is real even if unaudited.
    expect(holder.revalidations).toHaveLength(1);
  });

  it("is a clean failure when Supabase is not configured", async () => {
    holder.configured = false;
    setup({});
    expect(await applyBlogAction(ID, "publish", undefined, ACTOR)).toMatchObject({ ok: false, reason: "unconfigured" });
  });
});
