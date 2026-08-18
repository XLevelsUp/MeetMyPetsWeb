import { redirect } from "next/navigation";

import { MetricGrid } from "@/components/dashboard/metric-grid";
import { copy } from "@/config/admin";
import { analyticsRangeQuerySchema } from "@/lib/api-contract";
import { searchParamsToQuery } from "@/lib/contract-shared";
import { verifySession } from "@/lib/dal";
import { ANALYTICS_ROLES } from "@/lib/roles";

/**
 * Analytics overview. Data fetching is client-side (React Query with
 * 60s auto-refetch) against the RBAC-gated API routes — the server side
 * of this page only renders chrome.
 *
 * The selected period is parsed HERE from `searchParams` rather than with
 * `useSearchParams` in the client, which would force a Suspense boundary and a
 * second render — the pattern `users/page.tsx` already uses. Every field
 * `.catch()`es, so a stale or hand-edited link degrades to the default period.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Support can't read analytics, so landing them here would show nothing but
  // a 403 card. Send them to the surface they can actually use.
  const session = await verifySession();
  if (session.ok && !ANALYTICS_ROLES.includes(session.role)) {
    redirect("/users");
  }

  // Next 16 hands searchParams in as a promise; flatten the repeated-key form
  // that URLSearchParams would otherwise reject.
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold">{copy.dashboard.title}</h1>
        <MetricGrid initialRange={searchParamsToQuery(analyticsRangeQuerySchema, params)} />
      </div>
    </main>
  );
}
