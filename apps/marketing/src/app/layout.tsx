import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Love_Ya_Like_A_Sister, Nunito_Sans } from "next/font/google";

import { WaitlistPopup } from "@/components/sections/waitlist-popup";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { IntroCurtain } from "@/components/ui/intro-curtain";
import { PawCursorTrail } from "@/components/ui/paw-cursor-trail";
import { WhatsAppDog } from "@/components/ui/whatsapp-dog";
import { site } from "@/config/site";
import "./globals.css";


/**
 * ⚠️ NO ANALYTICS OR SESSION-RECORDING SCRIPTS ON THIS SITE.
 *
 * Microsoft Clarity used to load here. It was removed because the published
 * privacy policy (§15, src/config/legal.ts) states that meetmypets.app runs
 * none — a claim the DPDP Act attaches penalties to. Anything added back here
 * must be disclosed in privacy §8 (processors), §14 (transfers) and §15 in the
 * same change, or the policy becomes false the moment it deploys.
 */

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
      // The head script stamps `data-intro` before hydration, so server and
      // client differ by that one attribute by design.
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

        {/* Intro pre-paint gate. IntroCurtain can only mount after
            hydration, which left the page visible for a beat first. This runs
            before the first paint and stamps `data-intro="pending"` on
            <html>; CSS on that attribute hides the page until the curtain is
            up. The component reads the verdict rather than re-deciding.
            try/catch — a throw here would hide the page permanently. */}
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
      </body>
    </html>
  );
}
