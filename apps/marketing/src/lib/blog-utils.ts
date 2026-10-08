/** Anchor id for an H2 — shared by BlogBody (which sets it) and the sidebar TOC (which links to it). */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Site-relative image paths (the migrated posts' /blog/*.webp) made absolute for metadata and JSON-LD. */
export function absoluteUrl(src: string, origin: string): string {
  return src.startsWith("/") ? `${origin}${src}` : src;
}

// Pinned time zone: the cards render on the server and hydrate in the
// browser, and a date near midnight UTC would otherwise print as two different
// days and fail hydration.
const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function formatPostDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE.format(date);
}
