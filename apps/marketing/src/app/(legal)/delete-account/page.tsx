import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { deleteAccount } from "@/config/legal";
import { site } from "@/config/site";

/**
 * Public account-deletion instructions.
 *
 * Google Play's Data Safety form has an account-deletion URL field, and the
 * page it points at must be readable WITHOUT signing in. This is a static
 * export with no auth anywhere in the app, so that holds by construction — but
 * do not move this behind anything, and do not set `robots: { index: false }`.
 */
export const metadata: Metadata = {
  title: deleteAccount.title,
  description: deleteAccount.description,
  alternates: { canonical: "/delete-account/" },
  openGraph: {
    type: "article",
    url: "/delete-account/",
    title: deleteAccount.title,
    description: deleteAccount.description,
    // A page-level `openGraph` REPLACES the root layout's wholesale — Next.js
    // does not deep-merge nested metadata objects — so these have to be
    // repeated here or the page ships without them.
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

export default function DeleteAccountPage() {
  return <LegalPage doc={deleteAccount} />;
}
