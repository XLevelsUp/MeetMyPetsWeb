import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholders matching the dashboard's real layout. */
export function MetricGridSkeleton() {
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Card key={i} className="py-3">
          <CardContent className="flex flex-col gap-1.5 px-3.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3.5 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-56" />
        <Skeleton className="h-56 w-full" />
      </CardContent>
    </Card>
  );
}
