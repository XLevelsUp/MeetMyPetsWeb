import type { Metadata } from "next";

import { SharedLinkLanding } from "@/components/sections/shared-link-landing";
import { sharedLink, site } from "@/config/site";

const DESCRIPTION = sharedLink.post.body;

// noindex, for the same reason as /pet/<id>: one URL per id, all identical copy.
export const metadata: Metadata = {
  title: sharedLink.post.title,
  description: DESCRIPTION,
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    title: `${sharedLink.post.title} — ${site.name}`,
    description: DESCRIPTION,
    siteName: site.name,
    locale: site.locale,
  },
};

export default function SharedPostPage() {
  return <SharedLinkLanding kind="post" />;
}
