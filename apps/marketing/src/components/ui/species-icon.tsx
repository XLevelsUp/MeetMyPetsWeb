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
