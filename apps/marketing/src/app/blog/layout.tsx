import { Footer } from "@/components/sections/footer";
import { LegalHeader } from "@/components/legal/LegalHeader";

// Same chrome as the legal pages: the marketing Header's nav is all in-page anchors that dead-end here.
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LegalHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
