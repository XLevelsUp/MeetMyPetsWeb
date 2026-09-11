import { Mail, PawPrint } from "lucide-react";

import { MagneticButton } from "@/components/motion/MagneticButton";
import { Reveal } from "@/components/motion/Reveal";
import { cta } from "@/config/site";
import { cn } from "@/lib/utils";

// Same address as the footer's Contact link (footerColumns in site.ts).
const CONTACT_HREF = "mailto:hello@meetmypets.app";

/** End-of-section nudge; `withEmail` adds a contact button for the FAQ close-out. */
export function SectionCta({
  text,
  buttonLabel = cta.primary,
  withEmail = false,
  className,
}: {
  /** Short, specific to the section above it — not a repeat of the global tagline. */
  text: string;
  /** Defaults to the global "Join the Waitlist" — override so five of these
   * in a row don't all read as the identical button. */
  buttonLabel?: string;
  withEmail?: boolean;
  className?: string;
}) {
  return (
    <Reveal
      variant="springy"
      className={cn("mx-auto mt-14 flex max-w-md flex-col items-center gap-4 text-center", className)}
    >
      <PawPrint aria-hidden="true" className="size-6 -rotate-12 text-brand-ink opacity-70" />
      <p className="text-base leading-relaxed font-medium text-ink">{text}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <MagneticButton href={cta.waitlistHref} className="h-11 px-6 text-sm">
          {buttonLabel}
        </MagneticButton>
        {withEmail && (
          <MagneticButton href={CONTACT_HREF} variant="outline" className="h-11 px-6 text-sm">
            <Mail className="size-4" aria-hidden="true" />
            Email us instead
          </MagneticButton>
        )}
      </div>
    </Reveal>
  );
}
