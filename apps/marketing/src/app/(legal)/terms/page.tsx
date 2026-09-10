import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { terms } from "@/config/legal";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: terms.title,
  description: terms.description,
  alternates: { canonical: "/terms/" },
  openGraph: {
    type: "article",
    url: "/terms/",
    title: terms.title,
    description: terms.description,
    // See the note in privacy/page.tsx — a page-level `openGraph` replaces the
    // root layout's rather than merging into it.
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return <LegalPage doc={terms} />;
}
