import { faq, isLaunched, site } from "@/config/site";

/**
 * Structured data for rich results.
 *
 * Rendered as a Server Component so the JSON is in the prerendered HTML and
 * costs nothing at runtime. Every claim here mirrors visible page content —
 * Google penalises structured data that describes things a user cannot see.
 */

function Ld({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Content is authored locally in this repo, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationLd() {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: site.name,
        legalName: site.legalEntity,
        url: site.url,
        description: site.description,
        logo: `${site.url}/brand-mark.webp`,
        sameAs: [`https://twitter.com/${site.twitter.replace("@", "")}`, site.instagram],
        address: { "@type": "PostalAddress", addressCountry: "IN" },
        // Structured-data-only location signal — Tamil Nadu is the initial
        // launch region. Kept out of visible page copy on purpose; this is
        // the sanctioned place for location relevance, not on-page text.
        areaServed: [
          { "@type": "State", name: "Tamil Nadu" },
          { "@type": "Country", name: "India" },
        ],
      }}
    />
  );
}

export function SoftwareApplicationLd() {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: site.name,
        applicationCategory: "SocialNetworkingApplication",
        operatingSystem: "iOS, Android",
        description: site.description,
        url: site.url,
        publisher: { "@type": "Organization", name: site.legalEntity },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          // Pre-launch: PreOrder, not InStock. Claiming availability for an
          // unreleased app is exactly the kind of thing that gets structured
          // data flagged as spam.
          availability: isLaunched
            ? "https://schema.org/InStock"
            : "https://schema.org/PreOrder",
        },
      }}
    />
  );
}

/**
 * WebPage + BreadcrumbList for the legal documents. Both are emitted from one
 * component so a page can never ship one without the other.
 */
export function LegalPageLd({
  slug,
  title,
  description,
  updatedIso,
}: {
  slug: string;
  title: string;
  description: string;
  /**
   * ISO 8601, NOT the human date shown on the page. `dateModified` is a
   * schema.org Date field — "10 September 2026" is not one, and Google drops
   * the whole property rather than telling you.
   */
  updatedIso: string;
}) {
  const url = `${site.url}/${slug}/`;
  return (
    <>
      <Ld
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: title,
          description,
          url,
          inLanguage: "en-IN",
          isPartOf: { "@type": "WebSite", name: site.name, url: site.url },
          publisher: { "@type": "Organization", name: site.legalEntity, url: site.url },
          dateModified: updatedIso,
        }}
      />
      <Ld
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
            { "@type": "ListItem", position: 2, name: title, item: url },
          ],
        }}
      />
    </>
  );
}

export function FaqLd() {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      }}
    />
  );
}
