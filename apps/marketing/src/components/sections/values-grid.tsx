"use client";

import Image from "next/image";

import { Reveal } from "@/components/motion/Reveal";
import { about } from "@/config/site";
import { cn } from "@/lib/utils";

const ITEMS = about.values.items;

/**
 * Values displayed in a two-column grid.
 *
 * Row 1 → values 1 & 2, Row 2 → values 3 & 4, Row 3 → value 5 centred.
 * Each card keeps the pet cutout overhanging the top edge and the brand bar
 * at the bottom, matching the original carousel cards.
 */
export function ValuesGrid() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 md:grid-cols-2 md:gap-10">
      {ITEMS.map((item, i) => (
        <Reveal
          key={item.id}
          variant="springy"
          delay={0.06 * i}
          className={cn(
            // Centre the last card when it's alone in its row
            ITEMS.length % 2 !== 0 && i === ITEMS.length - 1
              && "md:col-span-2 md:mx-auto md:max-w-[calc(50%-1.25rem)]",
          )}
        >
          <div
            className={cn(
              "group relative flex h-full flex-col items-center rounded-2xl border border-border/70 bg-card px-6 pt-20 pb-8 text-center shadow-soft transition-[transform] duration-300 sm:px-10",
              i % 2 === 0 ? "card-paw" : "card-paw-alt",
            )}
          >
            {/* Pet cutout overhanging the card's top edge */}
            <Image
              src={item.pet.src}
              alt={item.pet.alt}
              width={220}
              height={420}
              className="pointer-events-none absolute -top-16 left-1/2 h-28 w-auto -translate-x-1/2 select-none drop-shadow-md transition-transform duration-500 group-hover:scale-105 sm:h-32"
            />

            <h3 className="text-xl font-semibold tracking-wide text-ink uppercase sm:text-2xl">
              {item.title}
            </h3>
            <p className="mt-3 leading-relaxed text-ink-soft">{item.body}</p>

            {/* Brand bar along the bottom edge */}
            <span
              aria-hidden="true"
              className="absolute inset-x-6 bottom-0 h-1.5 rounded-full bg-gradient-to-r from-brand to-brand-ink sm:inset-x-10"
            />
          </div>
        </Reveal>
      ))}
    </div>
  );
}
