import { ChevronDown } from "lucide-react";

import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { faq } from "@/config/site";

/**
 * FAQ accordion built on native <details>/<summary>.
 *
 * Chosen over the Base UI primitive deliberately: this ships zero JavaScript,
 * works before hydration and with scripting off, is found by the browser's
 * own Ctrl+F (which expands the matching panel), and gets correct
 * button/expanded semantics from the platform rather than from ARIA we would
 * have to maintain. Dropping the primitive also removed @base-ui/react from
 * the bundle entirely.
 *
 * The open/close height transition uses `interpolate-size: allow-keywords`
 * plus `::details-content` (see globals.css). Where unsupported it simply
 * snaps open — the content is never hidden or broken.
 *
 * The same `faq` array feeds the FAQPage JSON-LD in page.tsx, so the rich
 * snippet cannot drift from what is rendered.
 */
export function Faq() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="section-shell">
        <SectionHeading eyebrow="Questions" title="Answers before you sign up" />

        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div className="divide-y divide-border border-y border-border">
            {faq.map((item) => (
              <details key={item.q} name="faq" className="group">
                <summary
                  className={
                    "flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 " +
                    "py-5 text-base font-semibold transition-colors hover:text-brand-ink sm:text-lg " +
                    "[&::-webkit-details-marker]:hidden"
                  }
                >
                  {item.q}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-ink-soft transition-transform duration-300 group-open:-rotate-180"
                  />
                </summary>
                <div className="pb-5 text-base leading-relaxed text-ink-soft">{item.a}</div>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
