"use client";

import { useState } from "react";

import { BlogCardLink } from "@/components/blog/blog-card";
import type { BlogCard } from "@/lib/blog";
import { cn } from "@/lib/utils";

const CHIP =
  "rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/**
 * Filters client-side so /blog stays one cached page and no ?query URLs get
 * indexed. Every card is in the server HTML, so crawlers see every link
 * whatever the filter state.
 */
export function BlogFilter({ posts }: { posts: BlogCard[] }) {
  const [active, setActive] = useState<string | null>(null);
  const shown = active ? posts.filter((p) => p.category?.slug === active) : posts;

  // Categories that actually have posts, in first-seen order.
  const categories = [
    ...new Map(posts.filter((p) => p.category).map((p) => [p.category!.slug, p.category!.name])),
  ];

  return (
    <>
      {categories.length > 1 && (
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

          {categories.map(([slug, name]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setActive(slug)}
              aria-pressed={active === slug}
              className={cn(
                CHIP,
                active === slug
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-card text-ink-soft hover:border-brand/40 hover:text-ink",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* aria-live so a screen reader hears the count change when a filter is applied. */}
      <p className="sr-only" aria-live="polite">
        {shown.length} {shown.length === 1 ? "article" : "articles"} shown
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((post, i) => (
          // The first row is above the fold on desktop: load it eagerly for LCP.
          <BlogCardLink key={post.id} post={post} priority={i < 3} />
        ))}
      </div>
    </>
  );
}
