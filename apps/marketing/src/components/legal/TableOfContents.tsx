"use client";

import { useEffect, useState } from "react";

import type { LegalSection } from "@/config/legal";
import { cn } from "@/lib/utils";

/**
 * Scroll-spy table of contents.
 *
 * Progressive enhancement: every entry is a real anchor, so navigation works
 * fully before hydration and with JS disabled. The observer only adds the
 * "you are here" highlight on top of that.
 *
 * `scroll-padding-top` is set globally in globals.css, so anchor jumps clear
 * the sticky header without any JS scroll maths.
 */
export function TableOfContents({
  sections,
  className,
}: {
  sections: readonly LegalSection[];
  className?: string;
}) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Of everything currently in the band, highlight the one nearest the
        // top — otherwise a tall section below would steal the highlight.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setActive(visible[0].target.id);
      },
      {
        // Band sits just under the sticky header and ignores the lower 70% of
        // the viewport, so the active entry changes as a heading reaches the top.
        rootMargin: "-88px 0px -70% 0px",
        threshold: 0,
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this page" className={className}>
      <p className="text-xs font-semibold tracking-[0.12em] text-ink-soft uppercase">
        On this page
      </p>
      <ul className="mt-4 space-y-1 border-l border-border">
        {sections.map((section) => {
          const isActive = section.id === active;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "-ml-px block border-l-2 py-1.5 pl-4 text-sm transition-colors",
                  isActive
                    ? "border-brand font-semibold text-brand-ink"
                    : "border-transparent text-ink-soft hover:border-border hover:text-ink",
                )}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
