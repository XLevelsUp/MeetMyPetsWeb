/** Anchor id for an H2 — shared by BlogBody (which sets it) and the sidebar TOC (which links to it). */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
