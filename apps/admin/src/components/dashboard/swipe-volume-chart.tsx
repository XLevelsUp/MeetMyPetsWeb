"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  value: { label: "Swipes", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function SwipeVolumeChart({ data }: { data: TimeseriesPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{copy.dashboard.charts.swipeTitle}</CardTitle>
        <CardDescription>{copy.dashboard.charts.swipeDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-56 w-full">
          <BarChart data={data} margin={{ left: -20, right: 4 }}>
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
            <Bar dataKey="value" fill="var(--color-value)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
