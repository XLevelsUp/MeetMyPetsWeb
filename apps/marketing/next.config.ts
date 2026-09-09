import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // npm-workspaces monorepo: the lockfile lives at the repo root, two levels
  // up. Without this Turbopack has to infer the workspace root and warns
  // about it; tracing also needs the real root to resolve hoisted packages.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // NOT a static export any more.
  //
  // `output: "export"` forbids Route Handlers, and the Instagram section needs
  // two of them. Instagram's media_url is a signed CDN link that expires within
  // hours, so a build-time fetch bakes a URL into the HTML that is dead before
  // most visitors arrive. The proxy in src/app/api/instagram/ resolves a fresh
  // one per request instead — see the comments there.
  //
  // Consequence: this app now needs a Node runtime. `next start`, not a static
  // file host.

  // Kept from the static-export era on purpose: the site has been live at
  // /privacy/ and /terms/ with trailing slashes, and dropping this would change
  // every URL that has already been shared or indexed.
  trailingSlash: true,

  productionBrowserSourceMaps: false,
};

export default nextConfig;
