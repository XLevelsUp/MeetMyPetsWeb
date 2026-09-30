"use client";

import { ArrowRight, Clock, PawPrint } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { SocialLinks } from "@/components/ui/social-links";
import { blogMeta, type BlogPost } from "@/config/blog";
import { headingId } from "@/lib/blog-utils";
import { cn } from "@/lib/utils";

/** Highlights whichever H2 is currently in view. */
function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Topmost heading inside the band wins, so the highlight never flickers between two.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -65% 0px" },
    );

    const seen = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    seen.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export function BlogSidebar({ post, minutes }: { post: BlogPost; minutes: number }) {
  const headings = post.body
    .filter((b): b is { type: "h2"; text: string } => b.type === "h2")
    .map((b) => ({ text: b.text, id: headingId(b.text) }));
  const active = useActiveHeading(headings.map((h) => h.id));

  return (
    // self-start is load-bearing: without it the aside stretches to grid height and sticky never engages.
    // max-h + overflow so a sidebar taller than the viewport still pins instead of scrolling away on short laptops.
    <aside className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin]">
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
        <p className="text-xs text-ink-soft">Written by</p>
        <p className="mt-0.5 font-semibold text-ink">{blogMeta.author}</p>
        {post.published && (
          <p className="mt-3 text-sm text-ink-soft">
            {new Date(post.published).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
        <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          {minutes} min read
        </p>
      </div>

      {headings.length > 0 && (
        <nav aria-label="On this page" className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
            On this page
          </p>
          <ul className="mt-3 space-y-1">
            {headings.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  aria-current={active === h.id ? "true" : undefined}
                  className={cn(
                    "block border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors",
                    active === h.id
                      ? "border-brand font-medium text-brand-ink"
                      : "border-border text-ink-soft hover:border-brand/40 hover:text-ink",
                  )}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
          Follow us
        </p>
        <SocialLinks idPrefix="blog" className="mt-3" />
      </div>

      <div className="rounded-2xl border border-brand/20 bg-brand-soft/40 p-5 shadow-soft">
        <p className="flex items-center gap-2 font-semibold text-brand-ink">
          <PawPrint className="size-4 shrink-0" aria-hidden="true" />
          Save your pet&rsquo;s spot
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Join early and be part of the first 1,000 pets getting access to MeetMyPets.
        </p>
        <Link
          href="/#waitlist"
          className="group mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lift transition-all duration-200 hover:bg-brand-ink hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Join the waitlist
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </aside>
  );
}
