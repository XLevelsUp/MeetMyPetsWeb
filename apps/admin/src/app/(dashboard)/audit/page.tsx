import { redirect } from "next/navigation";

import { AuditTable } from "@/components/audit/audit-table";
import { copy } from "@/config/admin";
import { requireRole } from "@/lib/dal";
import { AUDIT_ROLES } from "@/lib/roles";

/**
 * Audit log viewer. `searchParams` is read server-side (Next 16: it is a
 * Promise) and passed down as an initial filter, so deep links from a user's
 * moderation history work without a client-side `useSearchParams` Suspense
 * boundary.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ targetId?: string }>;
}) {
  const session = await requireRole(...AUDIT_ROLES);
  if (!session.ok) redirect("/");

  const { targetId } = await searchParams;

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{copy.audit.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.audit.subtitle}</p>
        </div>
        <AuditTable initialTargetId={targetId} />
      </div>
    </main>
  );
}
