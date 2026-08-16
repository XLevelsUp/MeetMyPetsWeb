import { Ecosystem } from "@/components/sections/ecosystem";
import { Faq } from "@/components/sections/faq";
import { FeatureBento } from "@/components/sections/feature-bento";
import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
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
      <main id="main" className="flex-1">
        <Hero />
        <Ecosystem />
        <FeatureBento />
        <HowItWorks />
        <VerificationFlow />
        <WaitlistForm />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
