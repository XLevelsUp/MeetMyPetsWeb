import type { LegalBlock, LegalSection } from "@/config/legal";

/**
 * Renders legal document sections.
 *
 * The one piece of real logic here is `withMarkers`: any `[TO BE CONFIRMED …]`
 * placeholder is wrapped in a loud highlight so an unresolved fact cannot be
 * mistaken for finished copy by whoever proofreads this. See src/config/legal.ts.
 */

// Global flag is required for split() to keep the delimiters. It must NOT be
// reused for testing: RegExp.test() on a /g regex advances lastIndex, so
// consecutive calls alternate true/false. Hence the plain prefix check below.
const TODO_PATTERN = /(\[TO BE CONFIRMED[^\]]*\])/g;
const isMarker = (part: string) => part.startsWith("[TO BE CONFIRMED");

function withMarkers(text: string) {
  const parts = text.split(TODO_PATTERN);
  if (parts.length === 1) return text;

  return parts.map((part, index) =>
    isMarker(part) ? (
      <mark key={index} className="legal-todo">
        {part}
      </mark>
    ) : (
      part
    ),
  );
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
