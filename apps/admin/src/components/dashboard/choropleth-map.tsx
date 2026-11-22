"use client";

import { Chart, Tooltip, type ChartConfiguration } from "chart.js";
import { ChoroplethController, ColorScale, GeoFeature, ProjectionScale } from "chartjs-chart-geo";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { copy } from "@/config/admin";
import type { StateFeature } from "@/lib/geo/india";

Chart.register(ChoroplethController, GeoFeature, ColorScale, ProjectionScale, Tooltip);

const t = copy.dashboard.location;

type Palette = { brand: string; muted: string; border: string; card: string; text: string; subtle: string };

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    brand: v("--brand", "#ff1744"),
    muted: v("--muted", "#efeae3"),
    border: v("--border", "#e3dad0"),
    card: v("--card", "#ffffff"),
    text: v("--popover-foreground", "#1f1a17"),
    subtle: v("--muted-foreground", "#5c5149"),
  };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex) ?? /^#?([0-9a-f]{3})$/i.exec(hex);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

type Point = { feature: StateFeature; value: number };

/** Shades each shape by its count; draws states for India or districts for one state. */
export default function ChoroplethMap({
  features,
  counts,
  label,
  onSelect,
  onError,
}: {
  features: StateFeature[];
  /** Count per shape name; shapes absent from the map draw as "nobody here". */
  counts: ReadonlyMap<string, number>;
  /** Accessible description of what the map shows. */
  label: string;
  /** Called with a shape's name when it is clicked; omit to make the map non-interactive. */
  onSelect?: (name: string) => void;
  onError?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  // Kept in a ref so a new handler identity does not tear down and redraw the chart.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const interactive = Boolean(onSelect);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || features.length === 0) return;

    let chart: Chart<"choropleth", Point[], string> | null = null;
    try {
      const p = readPalette();
      const rgb = hexToRgb(p.brand) ?? [255, 23, 68];
      const nameAt = (index: number | undefined) =>
        index === undefined ? undefined : features[index]?.properties.name;

      const config: ChartConfiguration<"choropleth", Point[], string> = {
        type: "choropleth",
        data: {
          labels: features.map((f) => f.properties.name),
          datasets: [
            {
              label,
              outline: features,
              // NaN routes zero-user shapes to `missing`, so "nobody" reads differently from "few".
              data: features.map((feature) => ({
                feature,
                value: counts.get(feature.properties.name) ?? Number.NaN,
              })),
              borderColor: p.border,
              borderWidth: 0.75,
              hoverBorderColor: p.text,
              hoverBorderWidth: 1.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          showOutline: false,
          showGraticule: false,
          onClick: (_event, elements) => {
            const name = nameAt(elements[0]?.index);
            if (name) onSelectRef.current?.(name);
          },
          onHover: (event, elements) => {
            const target = event.native?.target as HTMLElement | undefined;
            if (target && interactive) target.style.cursor = elements.length ? "pointer" : "default";
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: p.card,
              titleColor: p.text,
              bodyColor: p.subtle,
              borderColor: p.border,
              borderWidth: 1,
              displayColors: false,
              callbacks: {
                // The choropleth leaves `item.label` undefined; the feature carries the name.
                title: (items) => (items[0]?.raw as Point | undefined)?.feature.properties.name ?? "",
                label: (item) => {
                  const value = (item.raw as Point).value;
                  const n = Number.isNaN(value) ? 0 : value;
                  return `${n.toLocaleString("en-IN")} ${t.users}`;
                },
                footer: () => (interactive ? t.clickToOpen : ""),
              },
            },
          },
          scales: {
            projection: { axis: "x", projection: "mercator", padding: 4 },
            color: {
              axis: "x",
              // Zero is drawn as `missing`, so the ramp starts at the first real user.
              min: 1,
              suggestedMax: 2,
              missing: p.muted,
              // Square-root ramp: one dominant shape would otherwise wash every other one out.
              interpolate: (n) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.2 + 0.8 * Math.sqrt(n)})`,
              ticks: { precision: 0, color: p.subtle, font: { size: 11 } },
              legend: { position: "bottom-left", align: "right", length: 140, width: 8, margin: 4 },
            },
          },
        },
      };
      chart = new Chart(canvas, config);
    } catch {
      onError?.();
    }

    return () => chart?.destroy();
  }, [features, counts, label, interactive, resolvedTheme, onError]);

  return <canvas ref={canvasRef} role="img" aria-label={label} />;
}
