import { Mail, MessageCircle } from "lucide-react";

import { site, whatsapp } from "@/config/site";
import { cn } from "@/lib/utils";

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

const TILE =
  "grid size-9 place-items-center rounded-xl border border-border bg-card text-ink-soft shadow-soft transition-colors";

/** The one list of socials — footer and blog sidebar both render this so they can't drift apart. */
export function SocialLinks({ idPrefix, className }: { idPrefix: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)} aria-label="Social links">
      <a
        href={site.instagram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="MeetMyPets on Instagram"
        id={`${idPrefix}-social-instagram`}
        className={cn(TILE, "hover:border-brand/40 hover:bg-brand-soft hover:text-brand-ink")}
      >
        <InstagramIcon className="size-4" />
      </a>

      <a
        href={whatsapp.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat on WhatsApp — ${whatsapp.display}`}
        id={`${idPrefix}-social-whatsapp`}
        className={cn(TILE, "hover:border-[#25D366]/40 hover:bg-[#25D366]/10 hover:text-[#25D366]")}
      >
        <MessageCircle className="size-4" aria-hidden="true" />
      </a>

      <a
        href={`mailto:hello@${site.domain}`}
        aria-label="Email MeetMyPets"
        id={`${idPrefix}-social-email`}
        className={cn(TILE, "hover:border-trust/40 hover:bg-trust-soft hover:text-trust")}
      >
        <Mail className="size-4" aria-hidden="true" />
      </a>
    </div>
  );
}
