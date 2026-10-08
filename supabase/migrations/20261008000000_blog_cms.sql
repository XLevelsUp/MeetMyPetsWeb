-- Blog CMS: posts, categories, slug redirects, image bucket, preview RPC.
--
-- WHO WRITES, WHO READS
--   apps/admin (service_role, server-only) is the only writer. Every mutation
--   goes through an RBAC-gated route handler and lands in admin_audit_logs.
--   apps/marketing reads with the PUBLISHABLE key (role `anon`), so the public
--   surface is defined here by GRANT + RLS rather than by application code:
--   an anon caller can see exactly the published, non-deleted posts, and only
--   the columns a public page renders. A draft is invisible to PostgREST
--   whatever query the caller writes.
--
-- SCHEMA CHOICE: `public`, same reasoning as 20260806000003 — PostgREST only
-- serves exposed schemas and adding one is a dashboard toggle.
--
-- ⚠️ Supabase DEFAULT PRIVILEGES on `public` grant every new table AND every
-- new function to anon, authenticated and service_role (verified live
-- 2026-10-08). Every object below is followed by explicit REVOKEs; without them
-- drafts would be readable with the browser key.
--
-- Soft delete: posts are never DELETEd (no grant). `deleted_at` hides a post
-- from the public policy, and the partial unique index frees its slug.

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.blog_categories is
  'Blog categories. Written by apps/admin (service_role); readable by anon for the public blog.';

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  excerpt text not null check (char_length(btrim(excerpt)) between 1 and 320),
  -- TipTap/ProseMirror JSON, sanitised server-side to a fixed node whitelist
  -- before it is stored. Never HTML: the public renderer maps node types to
  -- React elements, so there is no markup string to inject into.
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  -- [{ "q": "...", "a": "..." }] — rendered on the page and as FAQPage JSON-LD.
  faq jsonb not null default '[]'::jsonb check (jsonb_typeof(faq) = 'array'),
  category_id uuid references public.blog_categories (id) on delete restrict,
  tags text[] not null default '{}',
  author_name text not null default 'MeetMyPets Team'
    check (char_length(btrim(author_name)) between 1 and 120),
  featured_image text,
  featured_image_alt text,
  featured_image_caption text,
  seo_title text,
  seo_description text,
  -- Null = self-canonical. Set only to point at a different canonical URL, in
  -- which case the post is also left out of the sitemap.
  canonical_url text,
  og_image text,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  -- Set on FIRST publish and kept across unpublish/republish, so the public
  -- date does not jump every time an editor toggles visibility.
  published_at timestamptz,
  created_at timestamptz not null default now(),
  -- Bumped by the admin on every save; drives sitemap <lastmod> and
  -- BlogPosting.dateModified.
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  -- Draft preview: a random token with a short expiry, minted on demand by the
  -- admin and resolved only through blog_post_preview() below.
  preview_token uuid,
  preview_token_expires_at timestamptz,
  constraint blog_posts_published_has_date check (status <> 'published' or published_at is not null)
);

comment on table public.blog_posts is
  'Blog articles. Written by apps/admin (service_role). anon sees published, non-deleted rows only (RLS) and only public columns (column grants).';

-- A slug is unique among live posts; a soft-deleted post releases it.
create unique index if not exists blog_posts_slug_live_key
  on public.blog_posts (slug) where deleted_at is null;
-- The public listing / sitemap query.
create index if not exists blog_posts_public_idx
  on public.blog_posts (published_at desc) where status = 'published' and deleted_at is null;
create index if not exists blog_posts_category_idx on public.blog_posts (category_id);
create index if not exists blog_posts_updated_idx on public.blog_posts (updated_at desc);
create unique index if not exists blog_posts_preview_token_key
  on public.blog_posts (preview_token) where preview_token is not null;

-- ---------------------------------------------------------------------------
-- Slug redirects — old slug of a post that was public → the post.
--
-- Points at the POST, not at a slug, so A→B→C stays one hop: /blog/A/
-- resolves to the post's current slug. If the post is no longer published, the
-- embedded lookup comes back empty under RLS and the old URL 404s.
-- ---------------------------------------------------------------------------
create table if not exists public.blog_slug_redirects (
  old_slug text primary key check (old_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists blog_slug_redirects_post_idx on public.blog_slug_redirects (post_id);

comment on table public.blog_slug_redirects is
  'Permanent redirects for blog slugs that changed after publication. Written by apps/admin; read by apps/marketing (anon).';

-- ---------------------------------------------------------------------------
-- Privileges. Revoke everything Supabase's default privileges handed out,
-- then grant back the minimum.
-- ---------------------------------------------------------------------------
revoke all on public.blog_categories, public.blog_posts, public.blog_slug_redirects
  from anon, authenticated, service_role;

-- Admin (service_role). No DELETE on posts: deletion is soft.
grant select, insert, update on public.blog_categories to service_role;
grant select, insert, update on public.blog_posts to service_role;
-- DELETE here so a slug reclaimed by a live post can drop its stale redirect.
grant select, insert, delete on public.blog_slug_redirects to service_role;

-- Public (anon). Column-scoped: authorship uuids, preview tokens, status and
-- soft-delete bookkeeping are not readable even on a published row.
grant select (id, name, slug, sort_order) on public.blog_categories to anon;
grant select (
  id, slug, title, excerpt, content, faq, category_id, tags, author_name,
  featured_image, featured_image_alt, featured_image_caption, seo_title,
  seo_description, canonical_url,
  og_image, published_at, updated_at
) on public.blog_posts to anon;
grant select (old_slug, post_id) on public.blog_slug_redirects to anon;

alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_slug_redirects enable row level security;

drop policy if exists "Public can read categories" on public.blog_categories;
create policy "Public can read categories" on public.blog_categories
  for select to anon using (true);

drop policy if exists "Public can read published posts" on public.blog_posts;
create policy "Public can read published posts" on public.blog_posts
  for select to anon
  using (status = 'published' and deleted_at is null and published_at <= now());

drop policy if exists "Public can read slug redirects" on public.blog_slug_redirects;
create policy "Public can read slug redirects" on public.blog_slug_redirects
  for select to anon using (true);

-- ---------------------------------------------------------------------------
-- Draft preview.
--
-- SECURITY DEFINER on purpose: it is the one way anon can read an unpublished
-- row, and the only thing it trusts is an unexpired random token (122 bits)
-- that the admin mints per request. It returns public columns only. The
-- marketing preview route that calls it is noindex and outside the sitemap.
-- ---------------------------------------------------------------------------
create or replace function public.blog_post_preview(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'title', p.title,
    'excerpt', p.excerpt,
    'content', p.content,
    'faq', p.faq,
    'tags', p.tags,
    'author_name', p.author_name,
    'featured_image', p.featured_image,
    'featured_image_alt', p.featured_image_alt,
    'featured_image_caption', p.featured_image_caption,
    'published_at', p.published_at,
    'updated_at', p.updated_at,
    'status', p.status,
    'category', case when c.id is null then null
                     else jsonb_build_object('name', c.name, 'slug', c.slug) end
  )
  from public.blog_posts p
  left join public.blog_categories c on c.id = p.category_id
  where p_token is not null
    and p.preview_token = p_token
    and p.preview_token_expires_at > now()
    and p.deleted_at is null
$$;

revoke all on function public.blog_post_preview(uuid) from public, anon, authenticated, service_role;
grant execute on function public.blog_post_preview(uuid) to anon;

-- ---------------------------------------------------------------------------
-- Image bucket. Public read (images are embedded in public pages); no
-- storage.objects policies are created, so only service_role — i.e. the admin
-- upload route, after its own type/size checks — can write.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do nothing;
