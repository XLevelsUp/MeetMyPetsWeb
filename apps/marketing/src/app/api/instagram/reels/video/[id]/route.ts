/**
 * Instagram reels — video proxy. This is the file that solves URL expiry.
 *
 * THE PROBLEM
 * Graph API's media_url is not an address, it is a signed CDN link that dies
 * within hours. Any design that hands it to the browser works when you test it
 * and is broken by the time real visitors arrive — the page keeps serving a
 * URL that was valid when it was rendered.
 *
 * THE FIX: STABLE-ID INDIRECTION
 * The <video> element points here, keyed by the reel's Instagram id, which is
 * permanent and safe to embed in HTML. On every request this route resolves a
 * brand-new media_url from Graph, fetches the bytes, and streams them back
 * through this domain. The signed URL only has to survive the few seconds of
 * one server-to-CDN fetch; it never sits in a page waiting to go stale. A
 * visitor can leave the tab open for a week and playback still works.
 *
 * The token never reaches the client, which is the same reason the metadata
 * route exists.
 *
 * THE TRADE
 * Every video request costs an extra Graph round-trip and streams through a
 * serverless function instead of being served from a CDN. Bandwidth and
 * latency, in exchange for links that cannot expire.
 */

const GRAPH = "https://graph.instagram.com/v21.0";

/** Resolves a fresh signed URL for one reel. Never cached — that is the point. */
async function resolveMediaUrl(id: string, token: string): Promise<string | null> {
  try {
    const response = await fetch(`${GRAPH}/${id}?fields=media_url&access_token=${token}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { media_url?: string };
    return body.media_url ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  // Next 16: route params arrive as a Promise and must be awaited.
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  // The id goes straight into a Graph URL, so constrain it to what Instagram
  // actually issues rather than trusting the path segment.
  if (!/^\d{5,25}$/.test(id)) {
    return new Response("Bad reel id", { status: 400 });
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return new Response("Not configured", { status: 404 });

  const mediaUrl = await resolveMediaUrl(id, token);
  // Also the path for a reel Meta will not give a media_url for: the client
  // already renders those as a poster, so a 404 here is expected, not an error.
  if (!mediaUrl) return new Response("Not found", { status: 404 });

  // Forward Range so the browser can seek and play progressively. Without it
  // every seek would re-download the file from the start.
  const range = request.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(mediaUrl, {
      headers: range ? { Range: range } : undefined,
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[reels] CDN fetch failed for ${id}: ${(error as Error).message}`);
    return new Response("Upstream failed", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream failed", { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "video/mp4");
  headers.set("Accept-Ranges", "bytes");

  // Pass the range headers back untouched, or the browser cannot tell which
  // slice it received and seeking breaks.
  for (const header of ["content-length", "content-range"]) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }

  // Cacheable by the CDN even though the upstream URL is not: the bytes for a
  // given reel id do not change, only the link to them does.
  headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");

  // Streamed, not buffered. Reading the whole video into memory first would
  // blow the function's memory limit on a longer reel and delay first frame.
  return new Response(upstream.body, {
    status: upstream.status, // 206 for a range request, 200 otherwise.
    headers,
  });
}
