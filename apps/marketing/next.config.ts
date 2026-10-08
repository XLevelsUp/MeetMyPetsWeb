import path from "node:path";
import type { NextConfig } from "next";

// Blog images uploaded through the admin are served from the public
// `blog-images` bucket. Only that bucket's path is allowlisted for next/image —
// an arbitrary remote URL would turn the optimiser into an open image proxy.
//
// The production project is listed unconditionally: this file is evaluated
// once, when `next dev` / `next build` starts, so a host read only from
// SUPABASE_URL silently vanishes whenever that var is missing at startup —
// and every uploaded image then crashes the page with "hostname is not
// configured". SUPABASE_URL can still ADD a host (a staging project).
const BLOG_IMAGE_HOSTS = [
  ...new Set(
    ["https://owfrnkafevdfzduuqnic.supabase.co", process.env.SUPABASE_URL]
      .map((value) => {
        try {
          return value ? new URL(value).hostname : null;
        } catch {
          return null;
        }
      })
      .filter((host): host is string => Boolean(host)),
  ),
];

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

  images: {
    remotePatterns: BLOG_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
      pathname: "/storage/v1/object/public/blog-images/**",
    })),
  },
};

export default nextConfig;
