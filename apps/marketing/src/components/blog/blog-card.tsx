import { ArrowRight, CalendarDays, PawPrint } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { BlogCard } from "@/lib/blog";
import { formatPostDate } from "@/lib/blog-utils";

/** One article card — the blog index grid and the "Keep reading" row share it. */
export function BlogCardLink({
  post,
  priority = false,
  headingLevel = "h2",
}: {
  post: BlogCard;
  priority?: boolean;
  /** h3 when the cards sit under their own section heading, so the outline stays nested. */
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <Link
      href={`/blog/${post.slug}/`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-brand-soft/40">
        {post.featuredImage ? (
          <Image
            src={post.featuredImage}
            alt={post.featuredImageAlt ?? ""}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <PawPrint className="absolute top-1/2 left-1/2 size-10 -translate-1/2 text-brand-ink/40" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {post.category && (
          <p className="text-xs font-semibold tracking-[0.12em] text-brand-ink uppercase">{post.category.name}</p>
        )}
        <Heading className="mt-2 text-lg leading-snug font-semibold">{post.title}</Heading>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-ink-soft">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-brand-ink">
            Read more
            <ArrowRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
