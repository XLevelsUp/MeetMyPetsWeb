import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Unlike apps/landing this app is server-rendered: RBAC needs proxy.ts,
  // cookies() and Route Handlers, all of which `output: "export"` forbids.

  // npm-workspaces monorepo: the lockfile lives at the repo root, two levels
  // up. Without this Turbopack has to infer the workspace root and warns
  // about it; tracing also needs the real root to resolve hoisted packages.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  productionBrowserSourceMaps: false,
};

export default nextConfig;
