import type { Metadata } from "next";

import { BlogFilter } from "@/components/blog/blog-filter";
import { BlogIndexLd } from "@/components/seo/blog-ld";
import { blogMeta, blogPosts } from "@/config/blog";
import { site } from "@/config/site";

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

export default function BlogIndexPage() {
  return (
    <div className="pb-16 sm:pb-20">
      <BlogIndexLd posts={blogPosts} />

      <div className="section-shell pt-10 sm:pt-14">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
          MeetMyPets blog
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl leading-tight font-semibold text-balance sm:text-4xl lg:text-5xl">
          {blogMeta.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {blogMeta.description}
        </p>

        <BlogFilter posts={blogPosts} />
      </div>
    </div>
  );
}
