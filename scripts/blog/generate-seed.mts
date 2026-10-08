/**
 * One-off generator for supabase/migrations/20261008000001_blog_seed.sql.
 *
 * Converts the static posts that shipped in apps/marketing/src/config/blog.ts (since deleted)
 * (commit e4fe7dd) into CMS rows: block list → TipTap JSON, category names →
 * blog_categories. Kept in the repo so the seed can be audited against its
 * source, not because it needs re-running — the data now lives in the CMS.
 *
 *   node scripts/blog/generate-seed.mts <path-to-old-blog.ts> > out.sql
 */
import { pathToFileURL } from "node:url";

const source = process.argv[2];
if (!source) throw new Error("usage: generate-seed.mts <blog.ts>");
const mod = await import(pathToFileURL(source).href);

type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "cta"; label: string; href: string };

const text = (t: string) => (t ? [{ type: "text", text: t }] : []);
const para = (t: string) => ({ type: "paragraph", content: text(t) });

function toNode(block: Block) {
  switch (block.type) {
    case "p":
      return para(block.text);
    case "h2":
      return { type: "heading", attrs: { level: 2 }, content: text(block.text) };
    case "ul":
      return {
        type: "bulletList",
        content: block.items.map((item) => ({ type: "listItem", content: [para(item)] })),
      };
    case "cta":
      return { type: "cta", attrs: { label: block.label, href: block.href } };
  }
}

const q = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (v: string[]) => `array[${v.map(q).join(", ")}]::text[]`;

const out: string[] = [];
out.push(`insert into public.blog_categories (name, slug, sort_order) values`);
out.push(
  (mod.categories as string[])
    .map((name, i) => `  (${q(name)}, ${q(mod.categorySlug(name))}, ${i})`)
    .join(",\n") + `\non conflict (slug) do nothing;\n`,
);

for (const post of mod.blogPosts) {
  const doc = { type: "doc", content: (post.body as Block[]).map(toNode) };
  out.push(`insert into public.blog_posts (
  slug, title, excerpt, content, faq, category_id, tags, author_name,
  featured_image, featured_image_alt, featured_image_caption, status, published_at
)
select
  ${q(post.slug)},
  ${q(post.title)},
  ${q(post.excerpt)},
  ${json(doc)},
  ${json(post.faq)},
  (select id from public.blog_categories where slug = ${q(mod.categorySlug(post.category))}),
  ${arr(post.tags)},
  ${q(mod.blogMeta.author)},
  ${q(post.hero.src)},
  ${q(post.hero.alt)},
  ${q(post.hero.caption)},
  'published',
  ${post.published ? q(post.published) + "::timestamptz" : "now()"}
where not exists (
  select 1 from public.blog_posts where slug = ${q(post.slug)}
);
`);
}

process.stdout.write(out.join("\n"));
