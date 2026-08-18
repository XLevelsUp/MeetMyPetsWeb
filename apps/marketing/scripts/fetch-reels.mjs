/**
 * Fetches the latest Instagram reels into src/data/reels.json at build time.
 *
 * WHY BUILD TIME AND NOT THE BROWSER
 * The access token is a secret, and this app is `output: "export"` — there is
 * no server to hold one. A NEXT_PUBLIC_* token would ship in the JS bundle for
 * anyone to read. So the token stays here, in the build environment, and the
 * browser only ever receives the resulting JSON.
 *
 * The cost is that the feed is as fresh as the last deploy. Schedule a rebuild
 * (Vercel Cron / GitHub Action) to refresh it.
 *
 * FAIL CLOSED: NO FRESH REELS MEANS NO SECTION
 * Any failure — expired token, Instagram outage, network blip — writes an
 * empty array, and the section removes itself from the page. The site never
 * shows reels that could not be re-verified this build.
 *
 * This is a deliberate trade. The alternative (keep the last good data) risks
 * a "latest from Instagram" row silently serving months-old posts after a
 * token lapses, because a build cannot tell stale data from fresh. Here the
 * failure is visible instead: the section is simply gone.
 *
 * The consequence to know about: a transient outage during a deploy drops the
 * section until the next successful build. Nothing alerts you, so watch the
 * "[reels]" lines in the deploy log.
 *
 * NEVER FAILS THE BUILD. Whatever happens to the feed, the rest of the
 * marketing site must still deploy — this always exits 0.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(DIR, "..");
const OUT = path.join(APP_ROOT, "src", "data", "reels.json");

/**
 * Loads .env.local by hand.
 *
 * Next.js reads it automatically, but this is a plain `node` script run before
 * next build — nothing has populated process.env yet. Without this, running it
 * outside CI reports "token not set" even when .env.local has one.
 *
 * Deliberately minimal: real values already in the environment win, so CI (and
 * Vercel, which injects env vars directly) is unaffected.
 */
async function loadEnvLocal() {
  let contents;
  try {
    contents = await readFile(path.join(APP_ROOT, ".env.local"), "utf8");
  } catch {
    return; // No .env.local is normal in CI.
  }

  // Split on the first '=' rather than matching a pattern: token values are
  // opaque and may contain '=' (base64 padding) or regex metacharacters.
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq < 1) continue;

    const key = line.slice(0, eq).trim();
    if (process.env[key]) continue; // Real environment wins.

    let value = line.slice(eq + 1).trim();
    const quoted = value.length > 1 && (value[0] === '"' || value[0] === "'");
    if (quoted && value[value.length - 1] === value[0]) {
      value = value.slice(1, -1);
    }
    if (value) process.env[key] = value;
  }
}

await loadEnvLocal();

/** The section renders exactly three. Over-fetch so filtering still fills it. */
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

/**
 * Returns the reels to write, or null to leave reels.json alone.
 *
 * Every failure returns null rather than throwing. Returning (not exiting)
 * matters: calling process.exit() from inside an async fetch continuation
 * trips a libuv assertion on Windows and exits 127, which would fail the very
 * build this script exists to protect.
 */
async function collectReels() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    console.warn("[reels] INSTAGRAM_ACCESS_TOKEN not set.");
    return null;
  }

  /**
   * `me` resolves to whichever account the token belongs to, so the account id
   * is optional: a token already identifies exactly one Instagram account.
   * Set INSTAGRAM_USER_ID only to target a different account than the token's
   * own — otherwise leaving it unset is one less value to get wrong.
   */
  const account = process.env.INSTAGRAM_USER_ID || "me";

  const url =
    `https://graph.instagram.com/v21.0/${account}/media` +
    `?fields=${FIELDS}&limit=${FETCH_LIMIT}&access_token=${token}`;

  let payload;
  try {
    const response = await fetch(url);
    payload = await response.json();
    if (!response.ok) {
      // Token expiry lands here as a 190. Long-lived tokens last 60 days.
      console.warn(
        `[reels] Instagram returned ${response.status}: ${payload?.error?.message ?? "unknown"}`,
      );
      return null;
    }
  } catch (error) {
    console.warn(`[reels] request failed: ${error.message}`);
    return null;
  }

  const items = Array.isArray(payload?.data) ? payload.data : [];

  /**
   * Reels only.
   *
   * `media_product_type === "REELS"` is the precise test. Checking
   * `media_type === "VIDEO"` alone would also match ordinary video posts and
   * IGTV, and CAROUSEL_ALBUM must never appear — a carousel's media_url is its
   * first child, so one would render as a still image pretending to be a reel.
   */
  const reels = items
    .filter((item) => item.media_product_type === "REELS")
    .slice(0, WANTED)
    .map((item) => ({
      id: item.id,
      permalink: item.permalink,
      // Reels always carry a thumbnail_url; media_url is the mp4. Keeping them
      // separate matters: the thumbnail is the poster frame, and putting an
      // mp4 in an <img> src renders nothing.
      thumbnail: item.thumbnail_url ?? null,
      video: item.media_url ?? null,
      caption: typeof item.caption === "string" ? item.caption.trim() : "",
      timestamp: item.timestamp ?? null,
    }))
    .filter((reel) => reel.thumbnail && reel.permalink);

  if (reels.length === 0) {
    console.warn("[reels] no reels found in the latest media.");
    return null;
  }

  return reels;
}

const reels = await collectReels();

await mkdir(path.dirname(OUT), { recursive: true });

if (reels) {
  await writeFile(OUT, JSON.stringify(reels, null, 2) + "\n", "utf8");
  console.log(`[reels] wrote ${reels.length} reel(s) to src/data/reels.json`);
} else {
  // Fail closed. Writing [] is what removes the section from the built page —
  // leaving the previous file in place would ship reels this build could not
  // verify, which is exactly what this project does not want.
  await writeFile(OUT, "[]\n", "utf8");
  console.warn("[reels] cleared reels.json — the Instagram section will not render.");
}
