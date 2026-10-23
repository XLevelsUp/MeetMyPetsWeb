import { Bird, Cat, Dog, Fish, PawPrint, Rabbit, Shell, Turtle } from "lucide-react";

import { cn } from "@/lib/utils";

export type SpeciesKey = "dog" | "cat" | "bird" | "rabbit" | "reptile" | "fish" | "snail";

const GLYPHS = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
  reptile: Turtle,
  fish: Fish,
  // Closest glyph lucide ships — a snail outline would otherwise fall back to a paw.
  snail: Shell,
} as const;

/** Species glyph, always vector — emoji are not themeable and read verbosely. */
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
