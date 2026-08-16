"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes with attribute="class" — toggles `.dark` on <html>, which is
 * exactly what globals.css' `@custom-variant dark (&:is(.dark *))` and the
 * `.dark` token block expect.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
