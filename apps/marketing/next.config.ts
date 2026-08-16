import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // npm-workspaces monorepo: the lockfile lives at the repo root, two levels
  // up. Without this Turbopack has to infer the workspace root and warns
  // about it; tracing also needs the real root to resolve hoisted packages.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // Static export: `next build` emits a fully static site to ./out with no
  // server runtime. Rules out API routes, Server Actions, redirects/headers
  // and the default Image Optimizer — see next/dist/docs static-exports guide.
  output: "export",

  // Required under `output: 'export'` — the default image loader needs a
  // server. Images must therefore be pre-optimised at their final dimensions.
  images: {
    unoptimized: true,
  },

  // Emit /page/index.html instead of /page.html so any static host serves
  // clean URLs without rewrite rules.
  trailingSlash: true,

  productionBrowserSourceMaps: false,
};

export default nextConfig;
