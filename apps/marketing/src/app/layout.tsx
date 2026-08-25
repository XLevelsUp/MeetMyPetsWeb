import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Love_Ya_Like_A_Sister, Nunito_Sans } from "next/font/google";
import Script from "next/script";

import { site } from "@/config/site";
import "./globals.css";

/**
 * Meta (Facebook) Pixel. Hardcoded rather than read from an env var: it is a
 * public identifier that ships in the HTML of every page either way, and
 * NEXT_PUBLIC_* values are inlined at build time, so an env var would add a
 * deploy-time failure mode (blank pixel on a stale build) and hide nothing.
 */
const META_PIXEL_ID = "1615323050153590";

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
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:bg-brand focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        {children}

        {/* Meta Pixel. `afterInteractive` loads it once the page is usable —
            the pixel is analytics, and must never delay the hero paint. */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
        </Script>

        {/* Microsoft Clarity — session recordings and heatmaps. Same
            `afterInteractive` reasoning as the pixel above: analytics must
            never sit in front of the hero paint.

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

        {/* Fallback for visitors with JavaScript disabled. Plain <img>, not
            next/image: it is a 1x1 tracking beacon, not content to optimise. */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      </body>
    </html>
  );
}
