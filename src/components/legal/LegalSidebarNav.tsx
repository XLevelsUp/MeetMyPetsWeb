import { legalDocs } from "@/config/legal";
import { cn } from "@/lib/utils";

/**
 * Switches between the legal documents. Server Component — the active state is
 * known at build time from the page that renders it, so no client-side routing
 * hook is needed.
 */
export function LegalSidebarNav({
  current,
  className,
}: {
  current: "privacy" | "terms";
  className?: string;
}) {
  return (
    <nav aria-label="Legal documents" className={className}>
      <p className="text-xs font-semibold tracking-[0.12em] text-ink-soft uppercase">Legal</p>
      <ul className="mt-4 grid gap-1.5">
        {legalDocs.map((doc) => {
          const isActive = doc.slug === current;
          return (
            <li key={doc.slug}>
              <a
                href={`/${doc.slug}/`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-soft text-brand-ink"
                    : "text-ink-soft hover:bg-accent hover:text-ink",
                )}
              >
                {doc.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
