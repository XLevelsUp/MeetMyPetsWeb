import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
  className,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-brand-ink uppercase">{eyebrow}</p>
      {/* Fluid clamp — see globals.css. Every section uses this component, so
          the old text-3xl/sm:text-4xl step froze all of them at 36px across
          the whole tablet range. */}
      <h2 className="mt-3 text-section font-semibold">{title}</h2>
      {body && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{body}</p>}
    </Reveal>
  );
}
