/**
 * /.well-known/apple-app-site-association — the iOS app's claim on this domain.
 *
 * `applinks` lets shared /pet/ and /post/ links open in the app; `webcredentials`
 * is what lets the app sign in against meetmypets.app (password AutoFill /
 * passkeys). Both list the same app IDs, read from APPLE_APP_IDS
 * (comma-separated `TEAMID.bundle.id`).
 *
 * Unset falls back to the production app rather than serving an empty file:
 * Apple caches this through its CDN, so a missing var would quietly break
 * sign-in on every device for up to a day.
 *
 * Apple requires a 200 at this exact path with no redirect. `trailingSlash`
 * does not apply under /.well-known/, so it is served as-is.
 */
export const dynamic = "force-dynamic";

const DEFAULT_APP_IDS = ["HKP5LBM5G7.com.xlu.meetmypets"];

function appIds(): string[] {
  const ids = (process.env.APPLE_APP_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length ? ids : DEFAULT_APP_IDS;
}

export function GET() {
  const ids = appIds();
  return Response.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: ids,
            components: [
              { "/": "/pet/*", comment: "Public pet profiles shared out of the app" },
              { "/": "/post/*", comment: "Public posts shared out of the app" },
            ],
          },
        ],
      },
      webcredentials: { apps: ids },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
