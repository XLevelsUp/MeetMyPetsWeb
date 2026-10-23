import { Footer } from "@/components/sections/footer";
import { Header } from "@/components/sections/header";

// The real marketing header, not LegalHeader: nav hrefs are absolute, so they work from here.
export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="relative flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
