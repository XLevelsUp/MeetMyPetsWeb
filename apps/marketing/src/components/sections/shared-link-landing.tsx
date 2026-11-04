import { ArrowRight, Smartphone } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { PawScatter } from "@/components/ui/paw-scatter";
import { appStore, sharedLink } from "@/config/site";

/**
 * Fallback for the links the app shares out (/pet/<id>, /post/<id>).
 *
 * On a device with the app installed the OS intercepts these URLs before the
 * browser ever loads — see the apple-app-site-association route and
 * public/.well-known/assetlinks.json. This page is what everyone else gets:
 * previously a 404, which is the one audience sharing is meant to reach.
 *
 * It deliberately renders no pet data. Fetching a profile for anyone holding a
 * link would make every shared pet public and crawlable, which is a privacy
 * decision that has not been taken.
 */
export function SharedLinkLanding({ kind }: { kind: "pet" | "post" }) {
  const copy = sharedLink[kind];

  return (
    <section className="relative flex min-h-[78svh] items-center overflow-hidden py-16 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60rem 36rem at 50% 18%, var(--brand-soft), transparent 72%), var(--background)",
        }}
      />
      <PawScatter
        paws={[
          { className: "top-[14%] left-[6%] -rotate-[16deg]", size: 56 },
          { className: "bottom-[16%] right-[7%] rotate-[14deg]", size: 48 },
        ]}
      />

      <div className="section-shell relative">
        <div className="mx-auto max-w-xl text-center">
          <Reveal>
            <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 font-heading text-3xl leading-tight font-bold tracking-tight text-balance text-ink sm:text-4xl lg:text-5xl">
              {copy.title}
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
              {copy.body}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-9 flex flex-col items-center gap-3">
              <a
                href={appStore.android}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-brand px-8 py-3.5 text-sm font-bold text-white shadow-lift transition-all duration-200 hover:bg-brand-ink hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Smartphone className="size-4" aria-hidden="true" />
                {sharedLink.ctaLabel}
              </a>

              <Link
                href="/"
                className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {sharedLink.secondary}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
