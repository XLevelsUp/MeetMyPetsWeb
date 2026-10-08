import { redirect } from "next/navigation";

import { BlogEditor } from "@/components/blogs/blog-editor";
import { requireRole } from "@/lib/dal";
import { BLOG_ROLES } from "@/lib/roles";

/** The post itself is fetched client-side through the gated API, like every other detail screen. */
export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(...BLOG_ROLES);
  if (!session.ok) redirect("/");

  const { id } = await params;
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto w-full max-w-screen-2xl">
        <BlogEditor id={id} />
      </div>
    </main>
  );
}
