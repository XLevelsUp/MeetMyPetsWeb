import { Bird, Cat, Dog, PawPrint, Rabbit, Turtle } from "lucide-react";

import { cn } from "@/lib/utils";

export type SpeciesKey = "dog" | "cat" | "bird" | "rabbit" | "reptile";

const GLYPHS = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
  reptile: Turtle,
} as const;

/**
 * Species glyph, always vector.
 *
 * Emoji are deliberately not used as structural icons — they render
 * differently per platform, cannot be themed with design tokens, and are
 * announced verbosely by screen readers.
 */
export function SpeciesIcon({
  species,
  className,
}: {
  species: SpeciesKey | string;
  className?: string;
}) {
  const Glyph = GLYPHS[species as SpeciesKey] ?? PawPrint;
  return <Glyph aria-hidden="true" className={cn("size-full", className)} strokeWidth={1.6} />;
}
