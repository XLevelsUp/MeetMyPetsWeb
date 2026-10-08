/**
 * The blog body format: TipTap / ProseMirror JSON, restricted to a whitelist.
 *
 * Content is stored as structured JSON, never HTML, and the public site renders
 * it by mapping each node type to a React element — so there is no markup
 * string anywhere in the pipeline to inject into. This module is the gate on
 * the way IN: `sanitizeDoc` rebuilds a document from scratch, keeping only the
 * node types, marks and attributes listed here. Anything else an editor build,
 * a paste, or a hand-crafted POST smuggles in is dropped, not escaped.
 *
 * apps/marketing/src/lib/blog-content.ts is the gate on the way OUT and
 * re-applies the same link rule. Keep the two whitelists in step; there is no
 * shared package between the apps yet (same situation as the design tokens).
 *
 * Client-safe: the editor uses `docText` for its word count.
 */

export type BlogMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string } };

export type BlogNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: BlogNode[];
  text?: string;
  marks?: BlogMark[];
};

export type BlogDoc = { type: "doc"; content: BlogNode[] };

export const EMPTY_DOC: BlogDoc = { type: "doc", content: [] };

const BLOCK_CONTAINERS: Record<string, readonly string[]> = {
  doc: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "horizontalRule", "image", "table", "cta"],
  blockquote: ["paragraph", "heading", "bulletList", "orderedList"],
  bulletList: ["listItem"],
  orderedList: ["listItem"],
  listItem: ["paragraph", "bulletList", "orderedList"],
  table: ["tableRow"],
  tableRow: ["tableHeader", "tableCell"],
  tableHeader: ["paragraph"],
  tableCell: ["paragraph"],
};

const INLINE_CONTAINERS = new Set(["paragraph", "heading"]);

const MAX_DEPTH = 12;
const MAX_TEXT = 20_000;

/**
 * Links an editor may create: web pages, email, and same-site paths/anchors.
 * `javascript:`, `data:`, protocol-relative `//host` and everything else fail.
 */
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

/** Optional checker for image sources — the server passes the storage-host rule in. */
export type ImageSrcCheck = (src: string) => boolean;

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function cleanMarks(marks: unknown): BlogMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const out: BlogMark[] = [];
  for (const mark of marks) {
    if (!mark || typeof mark !== "object") continue;
    const { type, attrs } = mark as { type?: unknown; attrs?: Record<string, unknown> };
    if (type === "bold" || type === "italic") {
      if (!out.some((m) => m.type === type)) out.push({ type });
    } else if (type === "link" && isSafeHref(attrs?.href)) {
      if (!out.some((m) => m.type === "link")) {
        out.push({ type: "link", attrs: { href: (attrs!.href as string).trim() } });
      }
    }
  }
  return out.length ? out : undefined;
}

function cleanInline(content: unknown): BlogNode[] {
  if (!Array.isArray(content)) return [];
  const out: BlogNode[] = [];
  for (const node of content) {
    if (!node || typeof node !== "object") continue;
    const n = node as BlogNode;
    if (n.type === "text" && typeof n.text === "string" && n.text.length > 0) {
      const marks = cleanMarks(n.marks);
      out.push(marks ? { type: "text", text: n.text.slice(0, MAX_TEXT), marks } : { type: "text", text: n.text.slice(0, MAX_TEXT) });
    } else if (n.type === "hardBreak") {
      out.push({ type: "hardBreak" });
    }
  }
  return out;
}

function cleanNode(node: unknown, parent: string, depth: number, imageOk?: ImageSrcCheck): BlogNode | null {
  if (!node || typeof node !== "object" || depth > MAX_DEPTH) return null;
  const n = node as BlogNode;
  const allowed = BLOCK_CONTAINERS[parent] ?? [];
  if (!allowed.includes(n.type)) return null;
  const attrs = n.attrs ?? {};

  if (INLINE_CONTAINERS.has(n.type)) {
    const content = cleanInline(n.content);
    if (n.type === "heading") {
      const level = Number(attrs.level);
      // H1 is the article title, rendered by the page — never in the body.
      const safeLevel = level === 3 || level === 4 ? level : 2;
      return { type: "heading", attrs: { level: safeLevel }, content };
    }
    return { type: "paragraph", content };
  }

  switch (n.type) {
    case "horizontalRule":
      return { type: "horizontalRule" };

    case "image": {
      const src = cleanString(attrs.src, 2048);
      if (!src || (imageOk && !imageOk(src))) return null;
      return {
        type: "image",
        attrs: { src, alt: cleanString(attrs.alt, 300) ?? "", title: cleanString(attrs.title, 300) },
      };
    }

    case "cta": {
      const label = cleanString(attrs.label, 80);
      const href = typeof attrs.href === "string" ? attrs.href.trim() : "";
      if (!label || !isSafeHref(href)) return null;
      return { type: "cta", attrs: { label, href } };
    }

    default: {
      const content = (Array.isArray(n.content) ? n.content : [])
        .map((child) => cleanNode(child, n.type, depth + 1, imageOk))
        .filter((child): child is BlogNode => child !== null);
      // A container emptied by sanitising would render as an empty element.
      if (content.length === 0) return null;
      const out: BlogNode = { type: n.type, content };
      if (n.type === "orderedList") {
        const start = Number(attrs.start);
        if (Number.isInteger(start) && start > 1 && start < 10_000) out.attrs = { start };
      }
      if (n.type === "tableHeader" || n.type === "tableCell") {
        const colspan = Number(attrs.colspan);
        const rowspan = Number(attrs.rowspan);
        out.attrs = {
          colspan: Number.isInteger(colspan) && colspan > 1 && colspan <= 20 ? colspan : 1,
          rowspan: Number.isInteger(rowspan) && rowspan > 1 && rowspan <= 50 ? rowspan : 1,
        };
      }
      return out;
    }
  }
}

/** Rebuilds `input` keeping only whitelisted structure. Never throws. */
export function sanitizeDoc(input: unknown, imageOk?: ImageSrcCheck): BlogDoc {
  if (!input || typeof input !== "object" || (input as BlogNode).type !== "doc") return { ...EMPTY_DOC };
  const content = (Array.isArray((input as BlogNode).content) ? (input as BlogNode).content! : [])
    .map((node) => cleanNode(node, "doc", 1, imageOk))
    .filter((node): node is BlogNode => node !== null);
  return { type: "doc", content };
}

/** Plain text of a document, blocks separated by newlines. */
export function docText(node: BlogNode | BlogDoc): string {
  if (node.type === "text") return (node as BlogNode).text ?? "";
  if (node.type === "cta") return "";
  const parts = (node.content ?? []).map((child) => docText(child));
  return parts.join(INLINE_CONTAINERS.has(node.type) ? "" : "\n");
}

export function wordCount(doc: BlogDoc): number {
  const text = docText(doc).trim();
  return text ? text.split(/\s+/).length : 0;
}

/** True when the body has any readable text or an image — the bar for publishing. */
export function hasBody(doc: BlogDoc): boolean {
  return wordCount(doc) > 0 || doc.content.some((node) => node.type === "image");
}
