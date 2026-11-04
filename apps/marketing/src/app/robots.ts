import type { MetadataRoute } from "next";

import { site } from "@/config/site";

// No data dependency — emitted once at build.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // Draft previews are also noindex and token-gated; this keeps crawlers
    // from spending budget on the path at all.
    // /pet/ and /post/ are app-share fallbacks: one URL per id, all identical copy.
    rules: { userAgent: "*", allow: "/", disallow: ["/blog-preview/", "/pet/", "/post/"] },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
