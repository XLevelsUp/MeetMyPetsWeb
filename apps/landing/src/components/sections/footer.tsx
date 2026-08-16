import { Logo } from "@/components/ui/logo";
import { footer, footerColumns, site } from "@/config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="section-shell py-14 sm:py-20">
        {/* Brand block full-width on tablet with the three link columns beneath
            it, rather than four blocks stacked. */}
        <div className="grid gap-10 md:grid-cols-3 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="md:col-span-3 lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">{footer.blurb}</p>
            <p className="mt-4 text-sm font-medium text-ink-soft">{footer.note}</p>
          </div>

          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-heading text-sm font-semibold">{column.title}</h2>
              <ul className="mt-4 grid gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="inline-flex min-h-9 items-center rounded text-sm text-ink-soft transition-colors hover:text-brand-ink"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-soft">
            &copy; {year} {site.legalEntity}. All rights reserved.
          </p>
          <p className="max-w-md text-xs leading-relaxed text-ink-soft">{footer.compliance}</p>
        </div>
      </div>
    </footer>
  );
}
