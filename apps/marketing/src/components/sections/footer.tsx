import {
  BadgeCheck,
  Building2,
  FileText,
  Globe,
  Heart,
  Layers,
  Lock,
  Mail,
  MessageCircle,
  PawPrint,
  Shield,
  Smartphone,
  Star,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";

import { Logo } from "@/components/ui/logo";
import { footer, footerColumns, site, whatsapp } from "@/config/site";

/** Instagram glyph — lucide-react (this version) doesn't ship brand icons. */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}


/**
 * Community snapshot — a row of overlapping circular pet photos that appear
 * above the link columns. These are the same public-folder pet images used
 * across the marketing site; appearing here in the footer as a "community
 * wall" reinforces the idea that real animals (and their owners) are waiting
 * inside the app.
 */
const COMMUNITY_PHOTOS = [
  { src: "/pet-yorkshire-terrier.webp", alt: "Yorkshire Terrier" },
  { src: "/pet-corgi-puppy.webp", alt: "Corgi Puppy" },
  { src: "/pet-cat-ginger-longhair.webp", alt: "Ginger Longhair Cat" },
  { src: "/pet-golden-retriever.webp", alt: "Golden Retriever" },
  { src: "/pet-maine-coon.webp", alt: "Maine Coon" },
  { src: "/pet-samoyed-puppy.webp", alt: "Samoyed Puppy" },
  { src: "/pet-dachshund-bows.webp", alt: "Dachshund" },
];

/**
 * One lucide icon per footer link — keyed by link label. Keeps the icon
 * selection co-located with the link it annotates rather than scattering
 * icon arrays across the file.
 */
const LINK_ICONS: Record<string, React.ElementType> = {
  Features: Layers,
  Ecosystem: Globe,
  Verification: BadgeCheck,
  "How it works": Zap,
  "For pet parents": Heart,
  "For pet lovers": Star,
  "For businesses": Building2,
  "Join the waitlist": Mail,
  "Privacy policy": Shield,
  "Terms of service": FileText,
  "Data protection": Lock,
  Contact: Mail,
};

const COLUMN_ICONS: Record<string, React.ElementType> = {
  Product: Layers,
  Platform: Users,
  Legal: Shield,
};

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border">
      {/* Warm ambient gradient — mirrors the hero/waitlist brand-soft wash so
          the footer feels like a deliberate landing, not a hard stop. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 30rem at 10% 0%, var(--brand-soft), transparent 60%), radial-gradient(40rem 20rem at 90% 100%, var(--trust-soft), transparent 70%)",
        }}
      />

      {/* ── CTA banner ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-brand/[0.04]">
        <div className="section-shell py-10 sm:py-12">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">
                Early access
              </p>
              <h2 className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">
                Be first through the door when MeetMyPets opens.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                iOS and Android apps are in development. Join the waitlist and we&rsquo;ll reach out
                the moment they&rsquo;re ready — nothing else, ever.
              </p>
              <a
                href="#waitlist"
                id="footer-cta-waitlist"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition-all duration-200 hover:bg-brand-ink hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <PawPrint className="size-4" aria-hidden="true" />
                Join the Waitlist
              </a>
            </div>

            {/* Community photo wall — overlapping circles of pet photos.
                Each circle is a real pet from the public folder so this reads
                as "here are animals already waiting in the community" rather
                than generic stock photography. The strip scrolls on very small
                screens (< 375px) rather than wrapping, which would break the
                overlap rhythm. At md+ it sits comfortably in its column. */}
            <div className="flex items-center" aria-label="Community pets preview">
              <div className="flex -space-x-3">
                {COMMUNITY_PHOTOS.map((photo, i) => (
                  <div
                    key={photo.src}
                    className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-card shadow-soft sm:size-14"
                    style={{ zIndex: COMMUNITY_PHOTOS.length - i }}
                  >
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                ))}
                {/* "+more" badge after the photo strip */}
                <div
                  className="relative flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-card bg-brand text-xs font-bold text-white shadow-soft sm:size-14"
                  style={{ zIndex: 0 }}
                  aria-hidden="true"
                >
                  +more
                </div>
              </div>
              <p className="ml-4 text-sm leading-snug text-ink-soft">
                <span className="font-semibold text-ink">Hundreds of pet owners</span>
                <br />
                already on the list
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main link grid ─────────────────────────────────────────────────── */}
      <div className="section-shell py-10 sm:py-14">
        {/* Brand block full-width on tablet with the three link columns beneath
            it, rather than four blocks stacked. */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="md:col-span-3 lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">{footer.blurb}</p>
            <p className="mt-4 text-sm font-medium text-ink-soft">{footer.note}</p>

            {/* App platform badges */}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-ink-soft shadow-soft">
                <Smartphone className="size-3.5 text-brand-ink" aria-hidden="true" />
                iOS — Coming soon
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-ink-soft shadow-soft">
                <Smartphone className="size-3.5 text-trust" aria-hidden="true" />
                Android — Coming soon
              </span>
            </div>
          </div>

          {footerColumns.map((column) => {
            const ColIcon = COLUMN_ICONS[column.title];
            return (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="flex items-center gap-2 font-heading text-sm font-semibold">
                  {ColIcon && (
                    <span className="grid size-6 place-items-center rounded-lg bg-brand-soft text-brand-ink">
                      <ColIcon className="size-3.5" aria-hidden="true" />
                    </span>
                  )}
                  {column.title}
                </h2>
                <ul className="mt-4 grid gap-1.5">
                  {column.links.map((link) => {
                    const LinkIcon = LINK_ICONS[link.label];
                    return (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="group inline-flex min-h-9 items-center gap-2 rounded text-sm text-ink-soft transition-colors hover:text-brand-ink"
                        >
                          {LinkIcon && (
                            <LinkIcon
                              className="size-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100"
                              aria-hidden="true"
                            />
                          )}
                          {link.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            );
          })}
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      <div className="border-t border-border">
        <div className="section-shell flex flex-col gap-4 py-6 pb-24 sm:flex-row sm:items-center sm:justify-between sm:pb-6 sm:pr-24 lg:pr-28">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-ink-soft">
              &copy; {year} {site.legalEntity}. All rights reserved.
            </p>
            <p className="max-w-md text-xs leading-relaxed text-ink-soft">{footer.compliance}</p>
          </div>

          {/* Social links + "Made with 🐾" */}
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-xs text-ink-soft">
              Made with{" "}
              <PawPrint className="inline size-3 text-brand" aria-label="paw" /> in India
            </p>

            <div className="flex items-center gap-2" aria-label="Social links">
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MeetMyPets on Instagram"
                id="footer-social-instagram"
                className="grid size-9 place-items-center rounded-xl border border-border bg-card text-ink-soft shadow-soft transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand-ink"
              >
                <InstagramIcon className="size-4" />
              </a>

              <a
                href={whatsapp.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Chat on WhatsApp — ${whatsapp.display}`}
                id="footer-social-whatsapp"
                className="grid size-9 place-items-center rounded-xl border border-border bg-card text-ink-soft shadow-soft transition-colors hover:border-[#25D366]/40 hover:bg-[#25D366]/10 hover:text-[#25D366]"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
              </a>

              <a
                href={`mailto:hello@${site.domain}`}
                aria-label="Email MeetMyPets"
                id="footer-social-email"
                className="grid size-9 place-items-center rounded-xl border border-border bg-card text-ink-soft shadow-soft transition-colors hover:border-trust/40 hover:bg-trust-soft hover:text-trust"
              >
                <Mail className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
