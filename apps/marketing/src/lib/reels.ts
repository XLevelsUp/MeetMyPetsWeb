import reelsJson from "@/data/reels.json";

/**
 * One Instagram reel, as written by scripts/fetch-reels.mjs at build time.
 *
 * The section renders whatever is in src/data/reels.json. That file is
 * committed with an empty array as its seed: the fetch script overwrites it
 * when a token is present, and leaves it alone when the token is missing or
 * Instagram is down. An empty array hides the section entirely rather than
 * rendering an empty shell.
 */
export type Reel = {
  id: string;
  permalink: string;
  /** Poster frame. Signed CDN URL — expires, so it is re-fetched every build. */
  thumbnail: string | null;
  /** The mp4 itself. Only the featured reel actually loads it. */
  video: string | null;
  caption: string;
  timestamp: string | null;
};

const all = reelsJson as Reel[];

/** Build-time constant, so the page can drop the section without a runtime check. */
export const hasReels = all.length > 0;

/**
 * Reordered so the NEWEST reel sits in the middle slot.
 *
 * Instagram returns newest-first, which would put the freshest reel on the
 * left. The centre is the optical anchor of a three-up row — it is what the
 * eye lands on first and what the featured treatment is built around — so the
 * newest belongs there.
 *
 * [newest, second, third] -> [second, NEWEST, third]
 *
 * Only the exact three-item case is reordered. With one or two reels there is
 * no meaningful "centre", and shuffling them would just scramble the order for
 * no visual gain.
 */
export const reels: Reel[] = all.length === 3 ? [all[1], all[0], all[2]] : all;

/** Index of the featured (largest, autoplaying) card. */
export const featuredIndex = all.length === 3 ? 1 : 0;

/**
 * Instagram captions run long and carry hashtag tails. The card shows a single
 * line as context, not the post itself — the reel is the content, and a wall
 * of hashtags under each thumbnail is noise.
 */
export function captionPreview(caption: string, max = 72): string {
  const firstLine = caption.split("\n").find((line) => line.trim().length > 0) ?? "";
  const clean = firstLine.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}
