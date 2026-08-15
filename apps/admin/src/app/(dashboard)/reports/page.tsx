import { redirect } from "next/navigation";

import { ReportsTable } from "@/components/reports/reports-table";
import { copy } from "@/config/admin";
import { requireRole } from "@/lib/dal";
import { REPORTS_ROLES } from "@/lib/roles";
import { reportsQuerySchema, type ReportsQuery } from "@/lib/reports-contract";

/**
 * Moderation report queue over the backend's `matching.pet_reports`.
 *
 * `searchParams` is read server-side (Next 16: it is a Promise) and passed down
 * as the initial status filter, so a link like /reports?status=actioned works
 * without a client-side `useSearchParams` Suspense boundary. The value is run
 * through the contract's enum, which `.catch()`-defaults — a hand-edited URL
 * degrades to the pending queue rather than erroring.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRole(...REPORTS_ROLES);
  if (!session.ok) redirect("/");

  const { status } = await searchParams;
  const initialStatus: ReportsQuery["status"] = reportsQuerySchema.shape.status.parse(status);

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{copy.reports.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.reports.description}</p>
        </div>
        <ReportsTable initialStatus={initialStatus} />
      </div>
    </main>
  );
}
