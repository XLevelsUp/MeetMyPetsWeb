"use client";

import { useState } from "react";

import type { PickedEntity } from "@/components/team-messages/entity-picker";

const initials = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

// Pets: their photo, else sky initials. People: indigo initials. Same hues as the reach figures.
export function EntityAvatar({ item, size = "md" }: { item: PickedEntity; size?: "sm" | "md" }) {
  const [broken, setBroken] = useState(false);
  const dims = size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs";
  const isPerson = item.kind === "person";
  if (item.image && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs change per request; next/image would cache a dead one.
      <img
        src={item.image}
        alt=""
        onError={() => setBroken(true)}
        className={`${dims} shrink-0 rounded-full object-cover ring-2 ring-background`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-background ${isPerson ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300" : "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300"}`}
    >
      {initials(item.label)}
    </span>
  );
}
