import { MarginBlobs } from "@/components/motion/MarginBlobs";
import { Ecosystem } from "@/components/sections/ecosystem";
import { Faq } from "@/components/sections/faq";
import { FeatureBento } from "@/components/sections/feature-bento";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Reels } from "@/components/sections/reels";
import { StatsBanner } from "@/components/sections/stats-banner";
import { VerificationFlow } from "@/components/sections/verification-flow";
import { WaitlistForm } from "@/components/sections/waitlist-form";
import { FaqLd, OrganizationLd, SoftwareApplicationLd } from "@/components/seo/json-ld";

export default function Home() {
  return (
    <>
      <OrganizationLd />
      <SoftwareApplicationLd />
      <FaqLd />

      <Header />
      <main id="main" className="relative flex-1">
        <MarginBlobs />
        <Hero />
        <StatsBanner />
        <Ecosystem />
        <FeatureBento />
        <HowItWorks />
        <VerificationFlow />
        <WaitlistForm />
        <Faq />
        <Reels />
      </main>
      <Footer />
    </>
  );
}
