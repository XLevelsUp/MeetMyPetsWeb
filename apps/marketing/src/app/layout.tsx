import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Love_Ya_Like_A_Sister, Nunito_Sans } from "next/font/google";
import Script from "next/script";

import { WaitlistPopup } from "@/components/sections/waitlist-popup";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { IntroCurtain } from "@/components/ui/intro-curtain";
import { PawCursorTrail } from "@/components/ui/paw-cursor-trail";
import { WhatsAppDog } from "@/components/ui/whatsapp-dog";
import { site } from "@/config/site";
import "./globals.css";


/**
 * Microsoft Clarity project id.
 *
 * NEXT_PUBLIC_* because it is read in the browser — and that is fine: a
 * Clarity id is a public identifier that ships in the HTML of every page
 * either way, not a secret. The env var exists so the id can differ per
 * environment (or be left unset to disable recording entirely on previews).
 *
 * Inlined at BUILD time, so changing it in Vercel requires a redeploy.
 * Unset, the <Script> below is not rendered at all.
 */
const MS_CLARITY_ID = process.env.NEXT_PUBLIC_MS_CLARITY_ID;

// Self-hosted at build time by next/font — no external request to Google, no
// render-blocking <link>, and `display: swap` prevents invisible text.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

/**
 * The wordmark face — used ONLY for the "MeetMyPets" brand name, never for
 * running text. It is a single-weight handwritten display font: charming as a
 * logotype, unreadable as a paragraph.
 *
 * `weight: "400"` is required — this family ships one weight, and next/font
 * will not infer it for a non-variable font.
 */
const brand = Love_Ya_Like_A_Sister({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: [...site.keywords],
  applicationName: site.name,
  authors: [{ name: site.legalEntity }],
  creator: site.legalEntity,
  publisher: site.legalEntity,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    site: site.twitter,
    creator: site.twitter,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "lifestyle",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom is never disabled — WCAG 1.4.4.
  themeColor: "#faf9f6",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IN"
      className={`${display.variable} ${body.variable} ${brand.variable} h-full antialiased`}
      // The intro-gate script in <head> stamps `data-intro` on this element
      // before React hydrates, so the server HTML and the client DOM differ
      // by that one attribute by design. Scoped to <html>'s own attributes;
      // it does not suppress warnings for any descendant.
      suppressHydrationWarning
    >
      <head>
        {/* Scroll-reveal elements are prerendered at opacity:0. Without JS they
            would never animate in, leaving the page visually blank, so force
            them visible when scripting is unavailable. */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html: "[data-reveal]{opacity:1 !important;transform:none !important}",
            }}
          />
        </noscript>

        {/* Intro curtain pre-paint gate.
​
            IntroCurtain is a client component, so it cannot render until
            React hydrates — which left the landing page visible for a beat
            before the curtain appeared. This runs synchronously in <head>,
            before the browser paints a single pixel, and stamps
            `data-intro="pending"` on <html> when the intro is going to
            play. The CSS rule below that attribute hides the page and
            paints the cream ground, so the first frame a visitor sees is
            already the curtain.

            The decision has to be duplicated here (it cannot import from
            the component — this executes before any bundle), so the two
            must agree; the component reads the same attribute rather than
            re-deciding. Wrapped in try/catch because a thrown error in a
            blocking head script would leave the page permanently hidden.

            The class is cleared by IntroCurtain on dismiss, and by the
            fallback timeout here in case JS fails after this point. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
var d=document.documentElement;
if(sessionStorage.getItem('mmp-intro-played')==='1')return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var c=navigator.connection;
if(c&&(c.saveData===true||/^(slow-)?2g$/.test(c.effectiveType||'')))return;
d.setAttribute('data-intro','pending');
setTimeout(function(){d.removeAttribute('data-intro')},4500);
}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:bg-brand focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <MotionProvider>
          <IntroCurtain />
          {children}

          <PawCursorTrail />
          <WhatsAppDog />
          <WaitlistPopup />
        </MotionProvider>


        {/* Microsoft Clarity — session recordings and heatmaps.
            `afterInteractive` loads it once the page is usable so analytics
            never sits in front of the hero paint.

            Rendered only when the id is set, so an environment without one
            ships no tag rather than a script that requests /tag/undefined. */}
        {MS_CLARITY_ID && (
          <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${MS_CLARITY_ID}");`}
          </Script>
        )}

      </body>
    </html>
  );
}
