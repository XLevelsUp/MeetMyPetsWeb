import { NextResponse } from "next/server";

/**
 * Instagram reels — metadata stage.
 *
 * Returns the newest reels as JSON for the client component to render. The
 * `mediaUrl` here is metadata only; the browser never plays it. Playback goes
 * through /api/instagram/reels/video/[id], which mints a fresh signed URL per
 * request. See that file for why.
 *
 * The access token is read server-side and never reaches the client. That is
 * the whole reason this route exists rather than the browser calling Graph
 * directly — anything in the bundle is readable by anyone.
 */

/** Rendered per request: the token lives in the server environment. */
export const dynamic = "force-dynamic";

const GRAPH = "https://graph.instagram.com/v21.0";

/** The section shows three. Over-fetch so filtering still fills it. */
const WANTED = 3;
const FETCH_LIMIT = 25;

const FIELDS = [
  "id",
  "media_type",
  "media_product_type",
  "media_url",
  "permalink",
  "thumbnail_url",
  "caption",
  "timestamp",
].join(",");

export type ReelDto = {
  id: string;
  permalink: string;
  thumbnail: string | null;
  caption: string;
  timestamp: string | null;
  /**
   * Whether this reel can play inline.
   *
   * Meta returns HTTP 200 while omitting media_url for a large share of reels.
   * Requiring it would silently drop most of the feed, so a reel with only a
   * thumbnail is kept and rendered as a poster that opens the permalink.
   */
  playable: boolean;
};

type GraphItem = {
  id?: string;
  media_product_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  caption?: string;
  timestamp?: string;
};

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    // 200 with an empty list, not an error: the section hides itself when the
    // feed is empty, and a 500 here would put a red line in the browser
    // console for a configuration state the visitor cannot do anything about.
    return NextResponse.json({ reels: [] as ReelDto[] });
  }

  const account = process.env.INSTAGRAM_USER_ID || "me";
  const url = `${GRAPH}/${account}/media?fields=${FIELDS}&limit=${FETCH_LIMIT}&access_token=${token}`;

  let payload: { data?: GraphItem[]; error?: { message?: string } };
  try {
    const response = await fetch(url, { cache: "no-store" });
    payload = await response.json();
    if (!response.ok) {
      console.error(`[reels] Graph ${response.status}: ${payload?.error?.message ?? "unknown"}`);
      return NextResponse.json({ reels: [] as ReelDto[] });
    }
  } catch (error) {
    console.error(`[reels] Graph request failed: ${(error as Error).message}`);
    return NextResponse.json({ reels: [] as ReelDto[] });
  }

  const items = Array.isArray(payload.data) ? payload.data : [];

  /**
   * Reels only.
   *
   * media_product_type === "REELS" is the precise test. media_type === "VIDEO"
   * would also match ordinary video posts and IGTV, and a carousel's media_url
   * is its first child, so one would render as a still pretending to be a reel.
   */
  const reels: ReelDto[] = items
    .filter((item) => item.media_product_type === "REELS")
    .filter((item): item is GraphItem & { id: string; permalink: string } =>
      Boolean(item.id && item.permalink && (item.media_url || item.thumbnail_url)),
    )
    .map((item) => ({
      id: item.id,
      permalink: item.permalink,
      thumbnail: item.thumbnail_url ?? null,
      caption: typeof item.caption === "string" ? item.caption.trim() : "",
      timestamp: item.timestamp ?? null,
      playable: Boolean(item.media_url),
    }));

  // Promote the newest playable reel to the front, so the centre stage always
  // has real video even when Meta withheld media_url for the latest post.
  const firstPlayable = reels.findIndex((reel) => reel.playable);
  if (firstPlayable > 0) {
    const [promoted] = reels.splice(firstPlayable, 1);
    reels.unshift(promoted);
  }

  return NextResponse.json(
    { reels: reels.slice(0, WANTED) },
    {
      headers: {
        // Shared cache only. Five minutes keeps Graph calls off the critical
        // path under traffic; stale-while-revalidate means a cache miss serves
        // the old list rather than blocking on Instagram.
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
