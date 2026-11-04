import type { Metadata } from "next";

import { TeamOnboardingHero } from "@/components/sections/team-onboarding-hero";
import { site } from "@/config/site";

const DESCRIPTION =
  "Meet the people building MeetMyPets — a small team in Coimbatore making the place we wished existed for our own pets.";

export const metadata: Metadata = {
  title: "Meet the Team",
  description: DESCRIPTION,
  alternates: { canonical: "/team-onboarding/" },
  openGraph: {
    type: "website",
    url: "/team-onboarding/",
    title: `Meet the Team — ${site.name}`,
    description: DESCRIPTION,
    // A page-level `openGraph` REPLACES the root layout's wholesale (see csae-policy/page.tsx).
    siteName: site.name,
    locale: site.locale,
  },
  robots: { index: true, follow: true },
};

export default function TeamOnboardingPage() {
  return <TeamOnboardingHero />;
}
