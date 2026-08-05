import { MetricGrid } from "@/components/dashboard/metric-grid";
import { copy } from "@/config/admin";

/**
 * Analytics overview. Data fetching is client-side (React Query with
 * 60s auto-refetch) against the RBAC-gated API routes — the server side
 * of this page only renders chrome.
 */
export default function DashboardPage() {
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold">{copy.dashboard.title}</h1>
        <MetricGrid />
      </div>
    </main>
  );
}
