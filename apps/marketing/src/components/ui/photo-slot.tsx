import { ImagePlus } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * A real photo, or a visible slot waiting for one.
 *
 * The Our Story page is about specific animals and specific people, so stock
 * pets undercut it. Until the real photos exist, this renders an obvious
 * placeholder naming the shot needed — deliberately impossible to mistake for
 * finished design, so it cannot ship unnoticed.
 *
 * To fill a slot: drop the file in public/our-story/ and set `src`.
 */
export function PhotoSlot({
  src,
  alt,
  brief,
  caption,
  className,
  aspect = "aspect-[4/5]",
  priority = false,
}: {
  /** Leave undefined until the real photo exists. */
  src?: string;
  alt: string;
  /** What the photo should show — rendered in the placeholder while `src` is absent. */
  brief?: string;
  /** Shown under a real photo. Naming the animal is what makes it a story, not a stock shot. */
  caption?: string;
  className?: string;
  aspect?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <figure className={className}>
        <div className={cn("relative overflow-hidden rounded-[2rem] shadow-lift", aspect)}>
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 480px, (min-width: 768px) 60vw, 90vw"
            className="object-cover"
          />
        </div>
        {caption && (
          <figcaption className="mt-3 text-center text-sm text-ink-soft">{caption}</figcaption>
        )}
      </figure>
    );
  }

  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-[2rem] border-2 border-dashed border-brand/30 bg-brand-soft/20 p-6 text-center",
        aspect,
        className,
      )}
    >
      <div className="max-w-[18rem]">
        <ImagePlus className="mx-auto size-7 text-brand-ink/50" aria-hidden="true" />
        <p className="mt-3 text-xs font-semibold tracking-[0.14em] text-brand-ink/70 uppercase">
          Photo to come
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{brief}</p>
      </div>
    </div>
  );
}
