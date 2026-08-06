import { redirect } from "next/navigation";

import { UserDetail } from "@/components/users/user-detail";
import { requireRole } from "@/lib/dal";
import { USERS_VIEW_ROLES } from "@/lib/roles";

// Next 16: route params are async.
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(...USERS_VIEW_ROLES);
  if (!session.ok) redirect("/");

  const { id } = await params;

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto w-full max-w-screen-2xl">
        <UserDetail id={id} role={session.role} />
      </div>
    </main>
  );
}
