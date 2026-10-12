import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { csaePolicy } from "@/config/legal";
import { site } from "@/config/site";

/**
 * Public child safety (CSAE) standards.
 *
 * Google Play requires apps with social features to publish these at a URL
 * readable WITHOUT signing in. Do not move this behind anything, and do not
 * set `robots: { index: false }`.
 */
export const metadata: Metadata = {
  title: csaePolicy.title,
  description: csaePolicy.description,
  alternates: { canonical: "/csae-policy/" },
  openGraph: {
    type: "article",
    url: "/csae-policy/",
    title: csaePolicy.title,
    description: csaePolicy.description,
    // A page-level `openGraph` REPLACES the root layout's wholesale, so these
    // have to be repeated here (see delete-account/page.tsx).
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

export default function CsaePolicyPage() {
  return <LegalPage doc={csaePolicy} />;
}
