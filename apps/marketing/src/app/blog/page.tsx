import type { Metadata } from "next";

import { BlogFilter } from "@/components/blog/blog-filter";
import { BlogIndexLd } from "@/components/seo/blog-ld";
import { blogMeta, site } from "@/config/site";
import { listPublishedPosts } from "@/lib/blog";

// ISR. Published changes arrive through the `blog` tag (admin → /api/revalidate/);
// this is only the fallback if that call is ever missed. Literal: Next requires
// it to be statically analysable. Keep in step with BLOG_REVALIDATE_SECONDS.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: blogMeta.title,
  description: blogMeta.description,
  alternates: { canonical: `${site.url}/blog/` },
  openGraph: {
    type: "website",
    title: blogMeta.title,
    description: blogMeta.description,
    url: `${site.url}/blog/`,
  },
};

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();

  return (
    <div className="pb-16 sm:pb-20">
      <BlogIndexLd posts={posts} />

      <div className="section-shell pt-10 sm:pt-14">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">MeetMyPets blog</p>
        <h1 className="mt-3 max-w-3xl text-3xl leading-tight font-semibold text-balance sm:text-4xl lg:text-5xl">
          {blogMeta.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{blogMeta.description}</p>

        {posts.length > 0 ? (
          <BlogFilter posts={posts} />
        ) : (
          <p className="mt-12 rounded-2xl border border-dashed border-border p-8 text-center text-ink-soft">
            New articles are on their way. Check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
