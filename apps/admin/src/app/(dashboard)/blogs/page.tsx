import { redirect } from "next/navigation";

import { BlogsTable } from "@/components/blogs/blogs-table";
import { copy } from "@/config/admin";
import { blogListQuerySchema } from "@/lib/blog-contract";
import { searchParamsToQuery } from "@/lib/contract-shared";
import { requireRole } from "@/lib/dal";
import { BLOG_ROLES } from "@/lib/roles";

/**
 * Blog CMS list. Filters and sort live in the URL (parsed here, server-side,
 * so the client needs no `useSearchParams` Suspense boundary — the pattern
 * reports/page.tsx uses).
 */
export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(...BLOG_ROLES);
  if (!session.ok) redirect("/");

  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{copy.blogs.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.blogs.subtitle}</p>
        </div>
        <BlogsTable initialQuery={searchParamsToQuery(blogListQuerySchema, params)} />
      </div>
    </main>
  );
}
