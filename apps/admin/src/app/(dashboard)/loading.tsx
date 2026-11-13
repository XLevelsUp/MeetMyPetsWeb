import { MetricGridSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Matches the dashboard's own layout, so the swap to real data does not jump. */
export default function DashboardLoading() {
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-72" />
        <MetricGridSkeleton />
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    </main>
  );
}
