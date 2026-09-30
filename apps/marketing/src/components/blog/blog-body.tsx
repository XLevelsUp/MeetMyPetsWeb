import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import type { BlogBlock } from "@/config/blog";
import { headingId } from "@/lib/blog-utils";

/** Renders a post's block list. One renderer, five posts — see config/blog.ts. */
export function BlogBody({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              // id matches the sidebar TOC anchor; scroll-mt clears the sticky header.
              <h2
                key={i}
                id={headingId(block.text)}
                className="scroll-mt-28 pt-4 text-2xl leading-snug font-semibold sm:text-3xl"
              >
                {block.text}
              </h2>
            );

          case "p":
            return (
              <p key={i} className="text-base leading-relaxed text-ink-soft sm:text-lg">
                {block.text}
              </p>
            );

          case "ul":
            return (
              <ul key={i} className="grid gap-2.5 sm:grid-cols-2">
                {block.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-ink shadow-soft"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-trust" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            );

          case "cta":
            return (
              <div key={i} className="py-2">
                <Link
                  href={block.href}
                  className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition-all duration-200 hover:bg-brand-ink hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {block.label}
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            );
        }
      })}
    </div>
  );
}
