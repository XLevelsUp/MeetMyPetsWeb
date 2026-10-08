import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BlogBody } from "@/components/blog/blog-body";
import { BlogCardLink } from "@/components/blog/blog-card";
import { BlogSidebar } from "@/components/blog/blog-sidebar";
import type { BlogArticle, BlogCard, BlogPreview } from "@/lib/blog";
import { docHeadings, readTime } from "@/lib/blog-content";

/**
 * The article layout, shared by /blog/[slug] and the draft preview so an
 * editor previews exactly what will be published. Server Component: the only
 * client JS on the page is the sidebar's active-heading highlight.
 */
export function ArticleView({
  post,
  related = [],
}: {
  post: BlogArticle | BlogPreview;
  related?: BlogCard[];
}) {
  return (
    // overflow-wrap:anywhere — CMS text (title, body, FAQ) can contain a pasted
    // URL or other unbroken string that would push the page wider than a phone.
    <article className="pb-16 [overflow-wrap:anywhere] sm:pb-20">
      <div className="section-shell pt-8 sm:pt-12">
        <Link
          href="/blog/"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-brand-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All articles
        </Link>

        {post.category && (
          <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
            {post.category.name}
          </p>
        )}
        <h1 className="mt-3 max-w-4xl text-3xl leading-tight font-semibold text-balance sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{post.excerpt}</p>

        {post.featuredImage && (
          <figure className="mt-8">
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-border/70 shadow-lift sm:aspect-[2/1]">
              <Image
                src={post.featuredImage}
                alt={post.featuredImageAlt ?? ""}
                fill
                priority
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="object-cover"
              />
            </div>
            {post.featuredImageCaption && (
              <figcaption className="mt-3 text-center text-sm text-ink-soft">{post.featuredImageCaption}</figcaption>
            )}
          </figure>
        )}
      </div>

      {/* Sticky sidebar from lg; below that it stacks under the article. */}
      <div className="section-shell mt-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_300px] lg:gap-12">
          <div className="min-w-0">
            <BlogBody doc={post.content} />

            {post.faq.length > 0 && (
              <section aria-labelledby="post-faq" className="mt-12">
                <h2 id="post-faq" className="text-2xl font-semibold sm:text-3xl">
                  Q&amp;A
                </h2>
                <dl className="mt-5 space-y-5">
                  {post.faq.map((item, i) => (
                    <div key={i} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
                      <dt className="font-semibold text-ink">{item.q}</dt>
                      <dd className="mt-2 leading-relaxed text-ink-soft">{item.a}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          <BlogSidebar
            authorName={post.authorName}
            publishedAt={post.publishedAt}
            minutes={readTime(post.content)}
            headings={docHeadings(post.content)}
          />
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-posts" className="section-shell mt-16">
          <h2 id="related-posts" className="text-2xl font-semibold sm:text-3xl">
            Keep reading
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {related.map((card) => (
              <BlogCardLink key={card.id} post={card} headingLevel="h3" />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
