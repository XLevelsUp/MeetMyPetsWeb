import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { privacy } from "@/config/legal";

export const metadata: Metadata = {
  title: privacy.title,
  description: privacy.description,
  alternates: { canonical: "/privacy/" },
  openGraph: {
    type: "article",
    url: "/privacy/",
    title: privacy.title,
    description: privacy.description,
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return <LegalPage doc={privacy} />;
}
