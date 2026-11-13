import type { Metadata } from "next";
import { Bricolage_Grotesque, Nunito_Sans } from "next/font/google";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { QueryProgress } from "@/components/layout/query-progress";
import { TooltipProvider } from "@/components/ui/tooltip";
import { admin } from "@/config/admin";
import "./globals.css";

// Same brand fonts as the marketing site, self-hosted at build time by
// next/font — no external request to Google.
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

export const metadata: Metadata = {
  title: {
    default: admin.name,
    template: `%s · ${admin.shortName}`,
  },
  description: admin.description,
  // Internal tool — keep it out of search indexes regardless of robots.txt.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes mutates <html class> before
    // hydration to apply the persisted theme — an expected mismatch.
    <html
      lang="en-IN"
      className={`${display.variable} ${body.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <QueryProvider>
            {/* Inside QueryProvider: it reads the client's in-flight count. */}
            <QueryProgress />
            <TooltipProvider>{children}</TooltipProvider>
            {/* closeButton so a long save can be dismissed; 4s is long enough to read one line. */}
            <Toaster richColors closeButton position="top-right" duration={4000} />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
