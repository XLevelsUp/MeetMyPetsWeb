/**
 * Blog body model on the public side: the TipTap JSON the admin stores in
 * public.blog_posts.content. The admin sanitises it against a whitelist before
 * saving (apps/admin/src/lib/blog-content.ts); the renderer here maps only
 * the same node types to elements and re-checks every link, so content is
 * never trusted as markup on either side. Keep the two whitelists in step.
 */

import { headingId } from "@/lib/blog-utils";

export type BlogMark = { type: string; attrs?: { href?: unknown } };

export type BlogNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: BlogNode[];
  text?: string;
  marks?: BlogMark[];
};

export type BlogDoc = { type: "doc"; content?: BlogNode[] };

/** Same rule as the admin: web, mailto, and same-site paths/anchors only. */
export function isSafeHref(href: unknown): href is string {
  if (typeof href !== "string") return false;
  const value = href.trim();
  if (!value || value.length > 2048) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");
  if (value.startsWith("#")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

export function nodeText(node: BlogNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "cta") return "";
  const inline = node.type === "paragraph" || node.type === "heading";
  return (node.content ?? []).map(nodeText).join(inline ? "" : "\n");
}

export function docBlocks(doc: unknown): BlogNode[] {
  if (!doc || typeof doc !== "object" || (doc as BlogDoc).type !== "doc") return [];
  const content = (doc as BlogDoc).content;
  return Array.isArray(content) ? content : [];
}

/** ~200 words per minute, floored at 1 — same rule the static blog used. */
export function readTime(doc: unknown): number {
  const words = docBlocks(doc)
    .map(nodeText)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * The top-level H2s in document order, for the "On this page" sidebar. The
 * renderer assigns ids from this same list, in the same order, so a TOC link
 * can never point at an id the page does not have. Repeated headings get a
 * numeric suffix rather than a duplicate id.
 */
export function docHeadings(doc: unknown): { text: string; id: string }[] {
  const seen = new Map<string, number>();
  return docBlocks(doc)
    .filter((node) => node.type === "heading" && Number(node.attrs?.level ?? 2) === 2)
    .map((node) => {
      const text = nodeText(node).trim();
      const base = headingId(text) || "section";
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      return { text, id: count === 1 ? base : `${base}-${count}` };
    });
}
