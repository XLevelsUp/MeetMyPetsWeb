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
        logo: `${site.url}/icon.svg`,
        sameAs: [`https://twitter.com/${site.twitter.replace("@", "")}`],
        address: { "@type": "PostalAddress", addressCountry: "IN" },
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
