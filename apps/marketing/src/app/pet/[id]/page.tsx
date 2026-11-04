import type { Metadata } from "next";

import { SharedLinkLanding } from "@/components/sections/shared-link-landing";
import { sharedLink, site } from "@/config/site";

const DESCRIPTION = sharedLink.pet.body;

// noindex: every id is a different URL for identical copy, and the ids themselves
// are not ours to publish. The page is for people following a link, not for search.
export const metadata: Metadata = {
  title: sharedLink.pet.title,
  description: DESCRIPTION,
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    title: `${sharedLink.pet.title} — ${site.name}`,
    description: DESCRIPTION,
    // A page-level `openGraph` REPLACES the root layout's wholesale (see csae-policy/page.tsx).
    siteName: site.name,
    locale: site.locale,
  },
};

export default function SharedPetPage() {
  return <SharedLinkLanding kind="pet" />;
}
