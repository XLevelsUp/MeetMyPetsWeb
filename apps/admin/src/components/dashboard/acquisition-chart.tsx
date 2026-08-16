"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { copy } from "@/config/admin";
import type { TimeseriesPoint } from "@/lib/api-contract";

const config = {
  value: { label: "Sign-ups", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function AcquisitionChart({ data }: { data: TimeseriesPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{copy.dashboard.charts.acquisitionTitle}</CardTitle>
        <CardDescription>{copy.dashboard.charts.acquisitionDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-56 w-full">
          <AreaChart data={data} margin={{ left: -20, right: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickFormatter={(d: string) => d.slice(5)}
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={52} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              fill="var(--color-value)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
