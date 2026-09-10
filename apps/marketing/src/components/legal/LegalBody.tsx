import type { LegalBlock, LegalSection } from "@/config/legal";

/**
 * Renders legal document sections.
 *
 * The two pieces of real logic here both rewrite plain strings, so the legal
 * copy in src/config/legal.ts stays plain text with no markup to proofread:
 *
 *   - `withMarkers` wraps any `[TO BE CONFIRMED …]` placeholder in a loud
 *     highlight, so an unresolved fact cannot be mistaken for finished copy.
 *   - `withLinks` turns a written-out path on our own site into a real anchor.
 *     Privacy §10 points at meetmypets.app/delete-account/, and Google Play
 *     requires that page to be reachable — a dead string would not satisfy it.
 */

// Global flag is required for split() to keep the delimiters. These must NOT be
// reused for testing: RegExp.test() on a /g regex advances lastIndex, so
// consecutive calls alternate true/false. Hence the plain checks below.
const TODO_PATTERN = /(\[TO BE CONFIRMED[^\]]*\])/g;
const isMarker = (part: string) => part.startsWith("[TO BE CONFIRMED");

// Only our own site, only a single lower-case path segment, and the trailing
// slash is mandatory — `trailingSlash: true` means /delete-account without it
// is a redirect. Deliberately narrow: this is legal copy, not user content.
const SITE_PATH_PATTERN = /(meetmypets\.app\/[a-z][a-z-]*\/)/g;
const isSitePath = (part: string) => part.startsWith("meetmypets.app/");

/** Splits on `pattern`, mapping the delimiters through `render`. */
function split(
  nodes: React.ReactNode[],
  pattern: RegExp,
  matches: (part: string) => boolean,
  render: (part: string, key: string) => React.ReactNode,
) {
  return nodes.flatMap((node, nodeIndex) => {
    if (typeof node !== "string") return node;
    return node
      .split(pattern)
      .map((part, index) =>
        matches(part) ? render(part, `${nodeIndex}-${index}`) : part,
      );
  });
}

function withMarkers(text: string) {
  let nodes: React.ReactNode[] = [text];

  nodes = split(nodes, TODO_PATTERN, isMarker, (part, key) => (
    <mark key={`todo-${key}`} className="legal-todo">
      {part}
    </mark>
  ));

  nodes = split(nodes, SITE_PATH_PATTERN, isSitePath, (part, key) => (
    // Rendered as a root-relative href so it works on previews and on the
    // apex/www variants alike, while the visible text stays the full URL the
    // legal copy committed to.
    <a key={`link-${key}`} href={part.replace("meetmypets.app", "")}>
      {part}
    </a>
  ));

  return nodes.length === 1 ? nodes[0] : nodes;
}

function Block({ block }: { block: LegalBlock }) {
  if (block.type === "h3") {
    return <h3>{withMarkers(block.text)}</h3>;
  }

  if (block.type === "ul") {
    return (
      <ul>
        {block.items.map((item) => (
          <li key={item}>{withMarkers(item)}</li>
        ))}
      </ul>
    );
  }

  return <p>{withMarkers(block.text)}</p>;
}

export function LegalBody({ sections }: { sections: readonly LegalSection[] }) {
  return (
    <div className="prose prose-legal max-w-none prose-headings:font-heading prose-h2:scroll-mt-28 prose-h2:text-2xl prose-h3:text-lg">
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={section.id}>
          <h2 id={section.id}>{section.title}</h2>
          {section.body.map((block, index) => (
            // Blocks have no stable id of their own and never reorder at runtime.
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
    </div>
  );
}
