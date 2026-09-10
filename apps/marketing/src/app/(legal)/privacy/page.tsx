import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { privacy } from "@/config/legal";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: privacy.title,
  description: privacy.description,
  alternates: { canonical: "/privacy/" },
  openGraph: {
    type: "article",
    url: "/privacy/",
    title: privacy.title,
    description: privacy.description,
    // A page-level `openGraph` REPLACES the root layout's wholesale — Next.js
    // does not deep-merge nested metadata objects. Without these two lines the
    // page ships with no og:locale and no og:site_name, which is exactly what
    // production was doing before 2026-09-10.
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return <LegalPage doc={privacy} />;
}
