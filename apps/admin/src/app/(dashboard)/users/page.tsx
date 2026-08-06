import { redirect } from "next/navigation";

import { UsersTabs } from "@/components/users/users-tabs";
import { copy } from "@/config/admin";
import { requireRole } from "@/lib/dal";
import { USERS_VIEW_ROLES } from "@/lib/roles";

/**
 * Users & Pets moderation. The role is resolved server-side via the DAL and
 * passed down so the client only renders actions the caller can perform — the
 * API enforces the same allowlist independently.
 */
export default async function UsersPage() {
  const session = await requireRole(...USERS_VIEW_ROLES);
  if (!session.ok) redirect("/");

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{copy.users.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.users.subtitle}</p>
        </div>
        <UsersTabs role={session.role} />
      </div>
    </main>
  );
}
