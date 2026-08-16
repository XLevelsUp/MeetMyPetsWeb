import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { copy } from "@/config/admin";
import type { SpeciesCount } from "@/lib/api-contract";

/**
 * Horizontal proportion bars — at ≤10 species a table-with-bars reads
 * faster than a pie chart at desk-density.
 */
export function SpeciesBreakdown({ data }: { data: SpeciesCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{copy.dashboard.charts.speciesTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.dashboard.noData}</p>
        ) : (
          data.map((row) => (
            <div key={row.species} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-sm capitalize">{row.species}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                {row.count.toLocaleString("en-IN")}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
