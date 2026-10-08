import { z } from "zod";

import { listQuerySchema, paginated, SORT_DIRECTIONS } from "@/lib/contract-shared";

/**
 * Typed contract for the Blogs CMS.
 *
 * Gated by BLOG_ROLES. No end-user PII here — the only personal data is the
 * editor-chosen author display name, which is public on the article anyway.
 */

export const BLOG_STATUSES = ["draft", "published", "unpublished"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

/** Limits shared by the form (maxLength, counters) and the server (zod). */
export const BLOG_LIMITS = {
  title: 200,
  slug: 120,
  excerpt: 320,
  author: 120,
  alt: 300,
  caption: 300,
  seoTitle: 120,
  seoDescription: 320,
  tag: 40,
  tags: 20,
  faq: 20,
  faqQuestion: 300,
  faqAnswer: 2000,
  /** Serialised body size. A long article is ~60 KB; this leaves room for tables. */
  contentBytes: 500_000,
} as const;

/** What search engines display before truncating — advisory counters only. */
export const SEO_GUIDE = { title: 60, description: 160 } as const;

export const DEFAULT_AUTHOR = "MeetMyPets Team";

/** Lowercase words joined by single hyphens — the same rule the DB CHECK enforces. */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "How to Prepare Your Dog's First Playdate!" → "how-to-prepare-your-dogs-first-playdate". */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BLOG_LIMITS.slug)
    .replace(/-+$/g, "");
}

/* -------------------------------------------------------------------------
 * Reads
 * ---------------------------------------------------------------------- */

export const blogCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type BlogCategory = z.infer<typeof blogCategorySchema>;

export const blogCategoriesResponseSchema = z.object({ items: z.array(blogCategorySchema) });

export const blogSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(BLOG_STATUSES),
  authorName: z.string(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
  /** Absolute URL on meetmypets.app — meaningful only while published. */
  publicUrl: z.string(),
});
export type BlogSummary = z.infer<typeof blogSummarySchema>;

export const blogListResponseSchema = paginated(blogSummarySchema);
export type BlogListResponse = z.infer<typeof blogListResponseSchema>;

const faqItemSchema = z.object({
  q: z.string().trim().min(1, "Every FAQ needs a question.").max(BLOG_LIMITS.faqQuestion),
  a: z.string().trim().min(1, "Every FAQ needs an answer.").max(BLOG_LIMITS.faqAnswer),
});
export type BlogFaqItem = z.infer<typeof faqItemSchema>;

export const blogPostSchema = blogSummarySchema.extend({
  excerpt: z.string(),
  content: z.record(z.string(), z.unknown()),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  tags: z.array(z.string()),
  featuredImage: z.string().nullable(),
  featuredImageAlt: z.string().nullable(),
  featuredImageCaption: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
  ogImage: z.string().nullable(),
});
export type BlogPost = z.infer<typeof blogPostSchema>;

export const BLOG_STATUS_FILTERS = ["all", ...BLOG_STATUSES] as const;
export const BLOG_SORTS = ["updated", "created", "published", "title"] as const;
export type BlogSort = (typeof BLOG_SORTS)[number];

export const blogListQuerySchema = listQuerySchema.extend({
  status: z.enum(BLOG_STATUS_FILTERS).catch("all"),
  /** A category id or "all"; a stale id degrades to "all" in the adapter. */
  category: z.string().catch("all"),
  sort: z.enum(BLOG_SORTS).catch("updated"),
  dir: z.enum(SORT_DIRECTIONS).catch("desc"),
});
export type BlogListQuery = z.infer<typeof blogListQuerySchema>;

export const BLOG_LIST_DEFAULTS = {
  page: 1,
  status: "all",
  category: "all",
  sort: "updated",
  dir: "desc",
} as const;

/* -------------------------------------------------------------------------
 * Writes
 * ---------------------------------------------------------------------- */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .nullish()
  .transform((value) => (value ? value : null))
  .refine((value) => {
    if (value === null) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Canonical URL must be a full https:// address.");

/**
 * The editable fields of a post. Image fields are plain strings here; whether
 * a source is on an allowed host is checked by the adapter, which knows the
 * storage origin.
 */
export const blogInputSchema = z.object({
  title: z.string().trim().min(1, "Give the article a title.").max(BLOG_LIMITS.title),
  slug: z
    .string()
    .trim()
    .min(1, "The URL slug can't be empty.")
    .max(BLOG_LIMITS.slug)
    .regex(SLUG_RE, "Slug: lowercase letters, numbers and single hyphens only."),
  excerpt: z
    .string()
    .trim()
    .min(1, "Write a short excerpt — it is the card text and default meta description.")
    .max(BLOG_LIMITS.excerpt),
  content: z.record(z.string(), z.unknown()),
  faq: z.array(faqItemSchema).max(BLOG_LIMITS.faq).default([]),
  tags: z
    .array(z.string().trim().min(1).max(BLOG_LIMITS.tag))
    .max(BLOG_LIMITS.tags)
    .default([])
    .transform((tags) => [...new Set(tags)]),
  authorName: z.string().trim().min(1).max(BLOG_LIMITS.author).default(DEFAULT_AUTHOR),
  categoryId: z.guid("Pick a category.").nullish().transform((value) => value ?? null),
  featuredImage: optionalText(2048),
  featuredImageAlt: optionalText(BLOG_LIMITS.alt),
  featuredImageCaption: optionalText(BLOG_LIMITS.caption),
  seoTitle: optionalText(BLOG_LIMITS.seoTitle),
  seoDescription: optionalText(BLOG_LIMITS.seoDescription),
  canonicalUrl: httpsUrl,
  ogImage: optionalText(2048),
});
export type BlogInput = z.infer<typeof blogInputSchema>;

/**
 * `save` keeps the current status (a new post starts as a draft); `publish`
 * saves and publishes in one step, so the published version is exactly what
 * the editor was looking at.
 */
export const blogSaveBodySchema = blogInputSchema.extend({
  intent: z.enum(["save", "publish"]).default("save"),
});
export type BlogSaveBody = z.input<typeof blogSaveBodySchema>;

export const BLOG_ACTIONS = ["publish", "unpublish", "delete"] as const;
export type BlogAction = (typeof BLOG_ACTIONS)[number];

export const blogActionBodySchema = z
  .object({
    action: z.enum(BLOG_ACTIONS),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((body) => body.action !== "delete" || (body.reason?.length ?? 0) >= 10, {
    message: "Give a reason of at least 10 characters — it goes in the audit log.",
    path: ["reason"],
  });

export const blogCategoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name the category.").max(80),
});

/**
 * Outcome of telling meetmypets.app to drop its cached copy.
 *
 * Reported separately from the save so the UI never says "live" when the
 * public page is still stale: `failed` means the database has the change but
 * visitors may not see it until the next scheduled refresh.
 */
export const revalidationSchema = z.object({
  status: z.enum(["ok", "failed", "skipped", "unconfigured"]),
  message: z.string().optional(),
});
export type Revalidation = z.infer<typeof revalidationSchema>;

export const blogMutationResponseSchema = z.object({
  ok: z.literal(true),
  id: z.string(),
  slug: z.string(),
  status: z.enum(BLOG_STATUSES),
  revalidation: revalidationSchema,
});
export type BlogMutationResponse = z.infer<typeof blogMutationResponseSchema>;

export const blogPreviewResponseSchema = z.object({
  url: z.string(),
  expiresAt: z.string(),
});

export const blogImageUploadResponseSchema = z.object({ url: z.string() });

export const IMAGE_UPLOAD = {
  maxBytes: 5 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
} as const;
