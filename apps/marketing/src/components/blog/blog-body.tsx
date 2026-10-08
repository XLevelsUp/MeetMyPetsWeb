import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { docBlocks, docHeadings, isSafeHref, nodeText, type BlogNode } from "@/lib/blog-content";

/**
 * Renders a post body (TipTap JSON) as server-rendered HTML — no editor and
 * no client JavaScript ship to the public page.
 *
 * Content comes from the CMS, so it is treated as untrusted: every node type
 * is mapped explicitly, unknown types render nothing, links are re-checked
 * with `isSafeHref`, and there is no `dangerouslySetInnerHTML` anywhere. Text
 * goes through React, which escapes it.
 */
export function BlogBody({ doc }: { doc: unknown }) {
  // H2 ids are handed out in document order from the same list the sidebar
  // TOC uses, so the two always agree (including de-duplicated ids).
  const ids = docHeadings(doc).map((heading) => heading.id);
  let h2 = 0;
  const nextId = () => ids[h2++];

  return (
    <div className="space-y-5">
      {docBlocks(doc).map((node, i) => (
        <Block key={i} node={node} nextId={nextId} />
      ))}
    </div>
  );
}

function Block({ node, nextId }: { node: BlogNode; nextId?: () => string | undefined }): ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p className="text-base leading-relaxed text-ink-soft sm:text-lg">
          <Inline nodes={node.content} />
        </p>
      );

    case "heading": {
      const level = Number(node.attrs?.level);
      if (level === 3) {
        return (
          <h3 className="pt-2 text-xl leading-snug font-semibold sm:text-2xl">
            <Inline nodes={node.content} />
          </h3>
        );
      }
      if (level === 4) {
        return (
          <h4 className="pt-1 text-lg leading-snug font-semibold">
            <Inline nodes={node.content} />
          </h4>
        );
      }
      return (
        // scroll-mt clears the sticky header when jumping from the TOC.
        <h2 id={nextId?.()} className="scroll-mt-28 pt-4 text-2xl leading-snug font-semibold sm:text-3xl">
          <Inline nodes={node.content} />
        </h2>
      );
    }

    case "bulletList":
      return isChecklist(node) ? <Checklist node={node} /> : (
        <ul className="list-disc space-y-2 pl-6 text-base leading-relaxed text-ink-soft marker:text-brand-ink sm:text-lg">
          <ListItems node={node} />
        </ul>
      );

    case "orderedList": {
      const start = Number(node.attrs?.start);
      return (
        <ol
          start={Number.isInteger(start) && start > 1 ? start : undefined}
          className="list-decimal space-y-2 pl-6 text-base leading-relaxed text-ink-soft marker:font-semibold marker:text-brand-ink sm:text-lg"
        >
          <ListItems node={node} />
        </ol>
      );
    }

    case "blockquote":
      return (
        <blockquote className="space-y-3 rounded-r-2xl border-l-4 border-brand bg-brand-soft/30 py-4 pr-5 pl-5 text-ink italic">
          {(node.content ?? []).map((child, i) => (
            <Block key={i} node={child} />
          ))}
        </blockquote>
      );

    case "horizontalRule":
      return <hr className="my-8 border-border" />;

    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      if (!src) return null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      const title = typeof node.attrs?.title === "string" ? node.attrs.title : null;
      return (
        <figure className="py-2">
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={800}
            sizes="(min-width: 1280px) 820px, (min-width: 1024px) 66vw, 100vw"
            className="h-auto w-full rounded-2xl border border-border/70 shadow-soft"
          />
          {title ? <figcaption className="mt-3 text-center text-sm text-ink-soft">{title}</figcaption> : null}
        </figure>
      );
    }

    case "table":
      return (
        // Wide tables scroll inside their own box; the page never scrolls
        // sideways. Words stay whole in cells (the article breaks long words).
        <div className="overflow-x-auto rounded-2xl border border-border/70 shadow-soft [overflow-wrap:normal]">
          <table className="w-full border-collapse text-left text-sm sm:text-base">
            <tbody>
              {(node.content ?? []).map((row, r) => (
                <tr key={r} className="border-b border-border/70 last:border-0">
                  {(row.content ?? []).map((cell, c) => {
                    const Cell = cell.type === "tableHeader" ? "th" : "td";
                    const colSpan = Number(cell.attrs?.colspan) > 1 ? Number(cell.attrs?.colspan) : undefined;
                    const rowSpan = Number(cell.attrs?.rowspan) > 1 ? Number(cell.attrs?.rowspan) : undefined;
                    return (
                      <Cell
                        key={c}
                        colSpan={colSpan}
                        rowSpan={rowSpan}
                        scope={Cell === "th" ? "col" : undefined}
                        className={
                          Cell === "th"
                            ? "bg-muted/60 px-4 py-3 font-semibold text-ink"
                            : "px-4 py-3 align-top text-ink-soft"
                        }
                      >
                        {(cell.content ?? []).map((child, i) => (
                          <Inline key={i} nodes={child.content} />
                        ))}
                      </Cell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "cta": {
      const href = node.attrs?.href;
      const label = typeof node.attrs?.label === "string" ? node.attrs.label : "";
      if (!label || !isSafeHref(href)) return null;
      return (
        <div className="py-2">
          <Link
            href={href}
            className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition-all duration-200 hover:bg-brand-ink hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {label}
            <ArrowRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      );
    }

    default:
      return null;
  }
}

function ListItems({ node }: { node: BlogNode }) {
  return (
    <>
      {(node.content ?? []).map((item, i) => (
        <li key={i} className="pl-1">
          {(item.content ?? []).map((child, j) =>
            child.type === "paragraph" ? (
              <Inline key={j} nodes={child.content} />
            ) : (
              <div key={j} className="mt-2">
                <Block node={child} />
              </div>
            ),
          )}
        </li>
      ))}
    </>
  );
}

/**
 * Flat lists of short single-line items keep the original blog's check-card
 * grid; anything longer or nested reads better as a normal list.
 */
function isChecklist(node: BlogNode): boolean {
  const items = node.content ?? [];
  return (
    items.length > 0 &&
    items.every(
      (item) =>
        item.content?.length === 1 &&
        item.content[0].type === "paragraph" &&
        nodeText(item.content[0]).length <= 120,
    )
  );
}

function Checklist({ node }: { node: BlogNode }) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {(node.content ?? []).map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-ink shadow-soft"
        >
          <Check className="mt-0.5 size-4 shrink-0 text-trust" aria-hidden="true" />
          <span>
            <Inline nodes={item.content?.[0]?.content} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Inline({ nodes }: { nodes?: BlogNode[] }) {
  return (
    <>
      {(nodes ?? []).map((node, i) => {
        if (node.type === "hardBreak") return <br key={i} />;
        if (node.type !== "text" || !node.text) return null;

        let out: ReactNode = node.text;
        const marks = node.marks ?? [];
        if (marks.some((m) => m.type === "italic")) out = <em>{out}</em>;
        if (marks.some((m) => m.type === "bold")) out = <strong className="font-semibold text-ink">{out}</strong>;

        const link = marks.find((m) => m.type === "link");
        const href = link?.attrs?.href;
        if (link && isSafeHref(href)) {
          const internal = href.startsWith("/") || href.startsWith("#");
          out = internal ? (
            <Link href={href} className="font-medium text-brand-ink underline underline-offset-4 hover:no-underline">
              {out}
            </Link>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-ink underline underline-offset-4 hover:no-underline"
            >
              {out}
            </a>
          );
        }
        return <Fragment key={i}>{out}</Fragment>;
      })}
    </>
  );
}
