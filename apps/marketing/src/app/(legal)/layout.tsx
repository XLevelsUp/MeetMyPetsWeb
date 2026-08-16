import { Footer } from "@/components/sections/footer";
import { LegalHeader } from "@/components/legal/LegalHeader";

/**
 * Shared chrome for /privacy and /terms.
 *
 * `(legal)` is a route group — the parentheses mean it contributes no URL
 * segment, so the pages stay at /privacy and /terms.
 *
 * The marketing Footer is reused as-is (its links are absolute and work from
 * any page); the marketing Header is not, because its nav is all in-page
 * anchors that do not exist here.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
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
