import { redirect } from "next/navigation";

import { BlogEditor } from "@/components/blogs/blog-editor";
import { requireRole } from "@/lib/dal";
import { BLOG_ROLES } from "@/lib/roles";

export default async function NewBlogPage() {
  const session = await requireRole(...BLOG_ROLES);
  if (!session.ok) redirect("/");

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto w-full max-w-screen-2xl">
        <BlogEditor id={null} />
      </div>
    </main>
  );
}
