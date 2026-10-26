"use client";

import { useEffect, useRef } from "react";

import { GA_READY, trackEvent } from "@/lib/analytics";

/**
 * `blog_article_view` — once per article opened. GA's page_view already counts
 * views; this adds what page_view lacks (slug + category as parameters) so
 * articles can be compared by category without URL parsing.
 *
 * If the visitor accepts cookies while reading, it fires then — otherwise the
 * article they consented on would never be counted.
 */
export function ArticleViewTracker({ slug, category }: { slug: string; category: string | null }) {
  const sent = useRef<string | null>(null);

  useEffect(() => {
    const send = () => {
      if (sent.current === slug) return;
      if (trackEvent("blog_article_view", { article_slug: slug, content_category: category ?? "uncategorised" })) {
        sent.current = slug;
      }
    };
    send();
    window.addEventListener(GA_READY, send);
    return () => window.removeEventListener(GA_READY, send);
  }, [slug, category]);

  return null;
}
