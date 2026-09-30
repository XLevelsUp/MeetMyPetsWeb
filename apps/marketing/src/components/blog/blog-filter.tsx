"use client";

import { ArrowRight, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { categories, readTime, type BlogPost } from "@/config/blog";
import { cn } from "@/lib/utils";

const CHIP =
  "rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** Filters client-side so /blog stays a prerendered file and no ?query URLs get indexed. */
export function BlogFilter({ posts }: { posts: BlogPost[] }) {
  const [active, setActive] = useState<string | null>(null);
  const shown = active ? posts.filter((p) => p.category === active) : posts;

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button
          type="button"
          onClick={() => setActive(null)}
          aria-pressed={active === null}
          className={cn(
            CHIP,
            active === null
              ? "border-brand bg-brand text-white"
              : "border-border bg-card text-ink-soft hover:border-brand/40 hover:text-ink",
          )}
        >
          All posts
        </button>

        {categories.map((category) => {
          const count = posts.filter((p) => p.category === category).length;
          if (count === 0) return null;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActive(category)}
              aria-pressed={active === category}
              className={cn(
                CHIP,
                active === category
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-card text-ink-soft hover:border-brand/40 hover:text-ink",
              )}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* aria-live so a screen reader hears the count change when a filter is applied. */}
      <p className="sr-only" aria-live="polite">
        {shown.length} {shown.length === 1 ? "article" : "articles"} shown
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <div className="relative aspect-[3/2] w-full overflow-hidden">
              <Image
                src={post.hero.src}
                alt={post.hero.alt}
                fill
                sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <p className="text-xs font-semibold tracking-[0.12em] text-brand-ink uppercase">
                {post.category}
              </p>
              <h2 className="mt-2 text-lg leading-snug font-semibold">{post.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-ink-soft">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {readTime(post)} min read
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
        ))}
      </div>
    </>
  );
}
