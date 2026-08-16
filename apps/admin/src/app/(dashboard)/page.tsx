import { redirect } from "next/navigation";

import { MetricGrid } from "@/components/dashboard/metric-grid";
import { copy } from "@/config/admin";
import { verifySession } from "@/lib/dal";
import { ANALYTICS_ROLES } from "@/lib/roles";

/**
 * Analytics overview. Data fetching is client-side (React Query with
 * 60s auto-refetch) against the RBAC-gated API routes — the server side
 * of this page only renders chrome.
 */
export default async function DashboardPage() {
  // Support can't read analytics, so landing them here would show nothing but
  // a 403 card. Send them to the surface they can actually use.
  const session = await verifySession();
  if (session.ok && !ANALYTICS_ROLES.includes(session.role)) {
    redirect("/users");
  }

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold">{copy.dashboard.title}</h1>
        <MetricGrid />
      </div>
    </main>
  );
}
