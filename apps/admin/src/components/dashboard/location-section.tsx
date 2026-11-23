"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useId, useMemo, useState } from "react";

import { QueryErrorCard } from "@/components/shared/query-error-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copy } from "@/config/admin";
import { useLocationBreakdown } from "@/hooks/use-analytics";
import type { LocationBreakdown } from "@/lib/api-contract";
import { INDIA_STATE_NAMES } from "@/lib/geo/state-names";

const t = copy.dashboard.location;
const MAX_LISTED = 6;

type View = "india" | "state";

// Chart.js, d3-geo and the outlines load lazily, keeping them off the dashboard's first paint.
const LocationMap = dynamic(() => import("@/components/dashboard/location-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
});

const fmt = (n: number) => n.toLocaleString("en-IN");
const pct = (n: number, of: number) => (of === 0 ? 0 : Math.round((n / of) * 100));

type Row = { key: string; label: string; hint?: string | null; count: number };

function RankedList({ title, rows, total }: { title: string; rows: Row[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.dashboard.noData}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  {row.label}
                  {row.hint ? <span className="text-muted-foreground"> · {row.hint}</span> : null}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {fmt(row.count)} <span className="text-xs">({pct(row.count, total)}%)</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.max((row.count / max) * 100, 2)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CountTable({
  columns,
  rows,
}: {
  columns: [string, string, string];
  rows: { key: string; cells: [string, string, string]; muted?: boolean }[];
}) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columns[0]}</TableHead>
            <TableHead className="text-right">{columns[1]}</TableHead>
            <TableHead className="text-right">{columns[2]}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className={row.muted ? "text-muted-foreground" : undefined}>{row.cells[0]}</TableCell>
              <TableCell className="text-right tabular-nums">{row.cells[1]}</TableCell>
              <TableCell className="text-right tabular-nums">{row.cells[2]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function LocationSection() {
  const query = useLocationBreakdown();

  if (query.isPending) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-64" />
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (query.isError) {
    return <QueryErrorCard message={query.error.message} onRetry={() => query.refetch()} />;
  }

  return <LocationCard data={query.data} />;
}

export function LocationCard({ data }: { data: LocationBreakdown }) {
  const [view, setView] = useState<View>("india");
  const [picked, setPicked] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const onMapError = useCallback(() => setMapFailed(true), []);
  const tableId = useId();
  const pickerId = useId();

  // Until someone picks, the state view opens on the busiest state rather than alphabetically first.
  const state = picked ?? data.byState[0]?.state ?? INDIA_STATE_NAMES[0];

  const openState = useCallback((name: string) => {
    setPicked(name);
    setView("state");
    setMapFailed(false);
  }, []);

  const stateCount = useMemo(
    () => new Map(data.byState.map((r) => [r.state, r.count])),
    [data.byState],
  );
  // States with users first, busiest on top; the rest stay alphabetical so any state can be found.
  const pickerOrder = useMemo(
    () => [
      ...data.byState.map((r) => r.state),
      ...INDIA_STATE_NAMES.filter((name) => !stateCount.has(name)),
    ],
    [data.byState, stateCount],
  );

  const inState = stateCount.get(state) ?? 0;
  const districts = data.byDistrict.filter((r) => r.state === state);
  const unplacedInState = Math.max(0, inState - districts.reduce((sum, r) => sum + r.count, 0));
  const citiesInState = data.byCity.filter((r) => r.state === state);

  const coverage = t.coverage
    .replace("{located}", fmt(data.located))
    .replace("{total}", fmt(data.totalAccounts));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>
        <Tabs
          value={view}
          onValueChange={(next) => {
            setView(next as View);
            setMapFailed(false);
          }}
        >
          <TabsList>
            <TabsTrigger value="india">{t.viewIndia}</TabsTrigger>
            <TabsTrigger value="state">{t.viewState}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {data.located === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noLocations}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[26rem_minmax(0,1fr)] lg:gap-8">
            <div className="flex min-w-0 flex-col gap-2">
              {view === "state" ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Label htmlFor={pickerId}>{t.pickState}</Label>
                    <Select value={state} onValueChange={(value) => value && openState(String(value))}>
                      <SelectTrigger id={pickerId} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} align="start" className="max-h-72">
                        {pickerOrder.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                            {stateCount.has(name) ? ` (${fmt(stateCount.get(name) ?? 0)})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView("india")}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <ArrowLeft className="size-3.5" aria-hidden />
                    {t.backToIndia}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t.indiaHint}</p>
              )}

              {/* Fixed heights: a canvas in an auto-height box measures 0 and never draws. */}
              <div className="relative mx-auto h-80 w-full max-w-md md:h-96 lg:h-[28rem]">
                {mapFailed ? (
                  <p className="flex h-full items-center justify-center rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">
                    {t.mapFailed}
                  </p>
                ) : (
                  <LocationMap
                    view={view}
                    state={state}
                    byState={data.byState}
                    byDistrict={data.byDistrict}
                    onSelectState={openState}
                    onError={onMapError}
                  />
                )}
              </div>
            </div>

            {view === "india" ? (
              <div className="grid grid-cols-1 content-start gap-5 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 xl:gap-8">
                <RankedList
                  title={t.topStates}
                  total={data.totalAccounts}
                  rows={data.byState.slice(0, MAX_LISTED).map((row) => ({
                    key: row.state,
                    label: row.state,
                    count: row.count,
                  }))}
                />
                <RankedList
                  title={t.topCities}
                  total={data.totalAccounts}
                  rows={data.byCity.slice(0, MAX_LISTED).map((row) => ({
                    key: `${row.city}|${row.state ?? ""}`,
                    label: row.city,
                    hint: row.state,
                    count: row.count,
                  }))}
                />
              </div>
            ) : (
              <div className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-heading text-lg font-semibold">{state}</h3>
                  <p className="text-sm text-muted-foreground">
                    {inState === 0
                      ? t.stateEmpty
                      : t.stateTotal
                          .replace("{count}", fmt(inState))
                          .replace("{share}", String(pct(inState, data.totalAccounts)))}
                  </p>
                </div>
                {inState > 0 ? (
                  <div className="grid grid-cols-1 content-start gap-5 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 xl:gap-8">
                    {/* Shares here are of the state's users, which is what a state view is for. */}
                    <RankedList
                      title={t.topDistricts}
                      total={inState}
                      rows={[
                        ...districts.slice(0, MAX_LISTED).map((row) => ({
                          key: row.district,
                          label: row.district,
                          count: row.count,
                        })),
                        ...(unplacedInState > 0
                          ? [{ key: "_unplaced", label: t.noDistrict, count: unplacedInState }]
                          : []),
                      ]}
                    />
                    <RankedList
                      title={t.topCities}
                      total={inState}
                      rows={citiesInState.slice(0, MAX_LISTED).map((row) => ({
                        key: row.city,
                        label: row.city,
                        count: row.count,
                      }))}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <div className="flex gap-1">
            <dt className="sr-only">{t.title}</dt>
            <dd className="font-medium text-foreground">{coverage}</dd>
          </div>
          <div className="flex gap-1">
            <dt>{t.fromGps}</dt>
            <dd className="tabular-nums">{fmt(data.fromCoordinates)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>{t.fromText}</dt>
            <dd className="tabular-nums">{fmt(data.fromText)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>{t.outsideIndia}</dt>
            <dd className="tabular-nums">{fmt(data.outsideIndia)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>{t.unknown}</dt>
            <dd className="tabular-nums">{fmt(data.unknown)}</dd>
          </div>
        </dl>

        <div>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            aria-controls={tableId}
            className="rounded-md text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {showTable ? copy.dashboard.charts.hideData : copy.dashboard.charts.showData}
          </button>
          {showTable ? (
            <div id={tableId} className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              {view === "india" ? (
                <>
                  <CountTable
                    columns={[t.tableState, t.tableUsers, t.tableShare]}
                    rows={[
                      ...data.byState.map((r) => ({
                        key: r.state,
                        cells: [r.state, fmt(r.count), `${pct(r.count, data.totalAccounts)}%`] as [string, string, string],
                      })),
                      {
                        key: "_outside",
                        muted: true,
                        cells: [t.outsideIndia, fmt(data.outsideIndia), `${pct(data.outsideIndia, data.totalAccounts)}%`],
                      },
                      {
                        key: "_unknown",
                        muted: true,
                        cells: [t.unknown, fmt(data.unknown), `${pct(data.unknown, data.totalAccounts)}%`],
                      },
                    ]}
                  />
                  <CountTable
                    columns={[t.tableCity, t.tableUsers, t.tableShare]}
                    rows={data.byCity.map((r) => ({
                      key: `${r.city}|${r.state ?? ""}`,
                      cells: [
                        r.state ? `${r.city} · ${r.state}` : r.city,
                        fmt(r.count),
                        `${pct(r.count, data.totalAccounts)}%`,
                      ],
                    }))}
                  />
                </>
              ) : (
                <>
                  <CountTable
                    columns={[t.tableDistrict, t.tableUsers, t.tableShare]}
                    rows={[
                      ...districts.map((r) => ({
                        key: r.district,
                        cells: [r.district, fmt(r.count), `${pct(r.count, inState)}%`] as [string, string, string],
                      })),
                      ...(unplacedInState > 0
                        ? [{
                            key: "_unplaced",
                            muted: true,
                            cells: [t.noDistrict, fmt(unplacedInState), `${pct(unplacedInState, inState)}%`] as [string, string, string],
                          }]
                        : []),
                    ]}
                  />
                  <CountTable
                    columns={[t.tableCity, t.tableUsers, t.tableShare]}
                    rows={citiesInState.map((r) => ({
                      key: r.city,
                      cells: [r.city, fmt(r.count), `${pct(r.count, inState)}%`],
                    }))}
                  />
                </>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
