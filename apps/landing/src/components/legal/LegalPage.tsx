import { LegalBody } from "@/components/legal/LegalBody";
import { LegalSidebarNav } from "@/components/legal/LegalSidebarNav";
import { TableOfContents } from "@/components/legal/TableOfContents";
import { LegalPageLd } from "@/components/seo/json-ld";
import type { LegalDoc } from "@/config/legal";

/**
 * Shared shell for both legal documents. Everything is driven from the
 * LegalDoc object, so /privacy and /terms cannot diverge structurally.
 */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <LegalPageLd
        slug={doc.slug}
        title={doc.title}
        description={doc.description}
        updated={doc.updated}
      />

      <div className="section-shell py-12 sm:py-16">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
            {doc.shortTitle}
          </p>
          <h1 className="mt-3 text-4xl leading-tight font-semibold sm:text-5xl">{doc.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">{doc.intro}</p>
          <p className="mt-6 text-sm text-ink-soft">
            Last updated:{" "}
            {doc.updated.startsWith("[") ? (
              <mark className="legal-todo">{doc.updated}</mark>
            ) : (
              doc.updated
            )}
          </p>
        </header>

        <div className="mt-12 grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
          {/* Sticky rail. Ordered after the body in the DOM would be better for
              reading order, but it is before it visually and semantically as a
              navigation landmark, which is what screen reader users expect. */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <LegalSidebarNav current={doc.slug} />
            <TableOfContents sections={doc.sections} className="mt-10 hidden lg:block" />
          </aside>

          <div className="min-w-0">
            <LegalBody sections={doc.sections} />
          </div>
        </div>
      </div>
    </>
  );
}
