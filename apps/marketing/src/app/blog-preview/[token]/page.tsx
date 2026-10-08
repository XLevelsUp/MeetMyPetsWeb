import { Eye } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleView } from "@/components/blog/article-view";
import { getPreview } from "@/lib/blog";

/**
 * Draft preview, opened from the admin's "Preview" button.
 *
 * The token in the URL is the only credential: a random UUID minted per
 * request, valid for one hour, resolved by the SECURITY DEFINER function
 * `blog_post_preview()`. Nothing here is cached (a cached page would outlive
 * its token), nothing is indexable, and the route is outside the sitemap and
 * disallowed in robots.txt.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Article preview",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  // No canonical: a preview is not a version of any public URL.
  alternates: { canonical: null },
};

export default async function BlogPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const post = await getPreview(token);
  if (!post) notFound();

  const label =
    post.status === "published"
      ? "Preview of a published article — showing the last saved version."
      : `Preview of an ${post.status === "unpublished" ? "unpublished" : "unpublished draft"} article — not visible to the public.`;

  return (
    <>
      <div role="status" className="border-b border-amber-300 bg-amber-50 text-amber-950">
        <p className="section-shell flex items-center gap-2 py-3 text-sm font-medium">
          <Eye className="size-4 shrink-0" aria-hidden="true" />
          {label} This link expires within an hour.
        </p>
      </div>
      <ArticleView post={post} />
    </>
  );
}
