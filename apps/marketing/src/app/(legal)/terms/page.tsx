import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { terms } from "@/config/legal";

export const metadata: Metadata = {
  title: terms.title,
  description: terms.description,
  alternates: { canonical: "/terms/" },
  openGraph: {
    type: "article",
    url: "/terms/",
    title: terms.title,
    description: terms.description,
  },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return <LegalPage doc={terms} />;
}
