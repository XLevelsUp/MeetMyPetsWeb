import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogBody } from "@/components/blog/blog-body";
import { BlogSidebar } from "@/components/blog/blog-sidebar";
import { BlogPostingLd } from "@/components/seo/blog-ld";
import { blogPosts, getPost, readTime } from "@/config/blog";
import { site } from "@/config/site";

// Prerenders all five at build time instead of rendering per request.
export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = `${site.url}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url,
      images: [{ url: `${site.url}${post.hero.src}`, width: 1200, height: 800, alt: post.hero.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [`${site.url}${post.hero.src}`],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const minutes = readTime(post);

  return (
    <article className="pb-16 sm:pb-20">
      <BlogPostingLd post={post} />

      <div className="section-shell pt-8 sm:pt-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-brand-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All articles
        </Link>

        <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
          {post.category}
        </p>
        <h1 className="mt-3 max-w-4xl text-3xl leading-tight font-semibold text-balance sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{post.excerpt}</p>

        <figure className="mt-8">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-border/70 shadow-lift sm:aspect-[2/1]">
            <Image
              src={post.hero.src}
              alt={post.hero.alt}
              fill
              priority
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="object-cover"
            />
          </div>
          {post.hero.caption && (
            <figcaption className="mt-3 text-center text-sm text-ink-soft">
              {post.hero.caption}
            </figcaption>
          )}
        </figure>
      </div>

      {/* Sticky sidebar from lg; below that it stacks under the article. */}
      <div className="section-shell mt-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_300px] lg:gap-12">
          <div className="min-w-0">
            <BlogBody blocks={post.body} />

            {post.faq.length > 0 && (
              <section aria-labelledby="post-faq" className="mt-12">
                <h2 id="post-faq" className="text-2xl font-semibold sm:text-3xl">
                  Q&amp;A
                </h2>
                <dl className="mt-5 space-y-5">
                  {post.faq.map((item) => (
                    <div
                      key={item.q}
                      className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft sm:p-6"
                    >
                      <dt className="font-semibold text-ink">{item.q}</dt>
                      <dd className="mt-2 leading-relaxed text-ink-soft">{item.a}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          <BlogSidebar post={post} minutes={minutes} />
        </div>
      </div>
    </article>
  );
}
