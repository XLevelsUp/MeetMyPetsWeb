"use client";

import { m, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Reveals a line one word at a time as it enters view.
 *
 * Reserved for the few lines that carry the emotional weight of a page — used
 * everywhere it becomes noise. The whole string stays in one element for
 * screen readers and copy/paste; only the visual spans are split.
 */
export function WordReveal({
  text,
  className,
  delay = 0,
  as: Tag = "p",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "p" | "h2" | "h3" | "span" | "blockquote";
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  if (reduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className}>
      {/* The accessible copy: one uninterrupted string, hidden from sight. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <m.span
            key={`${word}-${i}`}
            // inline-block so the y-translate works; the trailing space keeps the line breakable.
            className="inline-block"
            initial={{ opacity: 0, y: "0.4em" }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: 0.5,
              delay: delay + i * 0.055,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </m.span>
        ))}
      </span>
    </Tag>
  );
}

/** A line of short items that land one after another — "bunnies. chickens. thirty lovebirds." */
export function StaggerList({
  items,
  className,
  itemClassName,
}: {
  items: readonly string[];
  className?: string;
  itemClassName?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <ul className={cn("flex flex-wrap justify-center gap-x-6 gap-y-3", className)}>
      {items.map((item, i) => (
        <m.li
          key={item}
          className={itemClassName}
          initial={reduced ? undefined : { opacity: 0, y: 10, scale: 0.96 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: i * 0.09 }}
        >
          {item}
        </m.li>
      ))}
    </ul>
  );
}
