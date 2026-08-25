import type { ReelDto } from "@/app/api/instagram/reels/route";

/**
 * One Instagram reel, as served by /api/instagram/reels.
 *
 * Fetched at request time, not build time. Instagram's media_url is a signed
 * CDN link that expires within hours, so anything baked into the HTML is dead
 * before most visitors arrive — see the comments in the two route handlers.
 */
export type Reel = ReelDto;

/**
 * Playback source for a reel.
 *
 * Deliberately this app's own path, never Instagram's media_url: the proxy
 * mints a fresh signed URL per request, which is the whole reason playback
 * cannot go stale. The id is permanent and safe to embed.
 */
export function videoSrc(id: string): string {
  return `/api/instagram/reels/video/${id}`;
}

/**
 * Reorders so the NEWEST reel sits in the middle slot.
 *
 * The API returns newest-first, which would put the freshest reel on the left.
 * The centre is the optical anchor of a three-up row — it is what the eye lands
 * on first and what the featured treatment is built around — so the newest
 * belongs there.
 *
 * [newest, second, third] -> [second, NEWEST, third]
 *
 * Only the exact three-item case is reordered. With one or two reels there is
 * no meaningful "centre", and shuffling them would scramble the order for no
 * visual gain.
 */
export function arrangeReels(all: Reel[]): { reels: Reel[]; featuredIndex: number } {
  if (all.length === 3) {
    return { reels: [all[1], all[0], all[2]], featuredIndex: 1 };
  }
  return { reels: all, featuredIndex: 0 };
}

/**
 * Instagram captions run long and carry hashtag tails. The card shows a single
 * line as context, not the post itself — the reel is the content, and a wall of
 * hashtags under each thumbnail is noise.
 */
export function captionPreview(caption: string, max = 72): string {
  const firstLine = caption.split("\n").find((line) => line.trim().length > 0) ?? "";
  const clean = firstLine.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}
