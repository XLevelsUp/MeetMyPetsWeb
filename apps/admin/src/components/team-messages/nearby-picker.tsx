"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import type { MapPoint } from "@/components/team-messages/nearby-map";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/config/admin";
import { TEAM_MAX_RADIUS_KM } from "@/lib/team-messages-constants";

const NearbyMap = dynamic(() => import("@/components/team-messages/nearby-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full md:h-96" />,
});

export type NearbySelection = { point: MapPoint | null; radiusKm: number };

const n = copy.teamMessages.composer.nearby;

const round = (v: number) => Math.round(v * 10_000) / 10_000;

// Map for pointing, plus number fields so the point can be typed or fine-tuned without a mouse.
export function NearbyPicker({ value, onChange }: { value: NearbySelection; onChange: (next: NearbySelection) => void }) {
  const [lat, setLat] = useState(value.point ? String(round(value.point.lat)) : "");
  const [lng, setLng] = useState(value.point ? String(round(value.point.lng)) : "");
  const [radius, setRadius] = useState(String(value.radiusKm));

  function pickFromMap(point: MapPoint) {
    const next = { lat: round(point.lat), lng: round(point.lng) };
    setLat(String(next.lat));
    setLng(String(next.lng));
    onChange({ ...value, point: next });
  }

  function commitPoint(nextLat: string, nextLng: string) {
    const a = Number(nextLat);
    const b = Number(nextLng);
    const ok = nextLat !== "" && nextLng !== "" && Math.abs(a) <= 90 && Math.abs(b) <= 180;
    if (ok) onChange({ ...value, point: { lat: a, lng: b } });
  }

  function commitRadius(next: string) {
    setRadius(next);
    const km = Number(next);
    if (km > 0 && km <= TEAM_MAX_RADIUS_KM) onChange({ ...value, radiusKm: km });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-xs text-muted-foreground">{n.intro}</p>
      <NearbyMap
        point={value.point}
        radiusKm={value.radiusKm}
        onPick={pickFromMap}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="team-lat">{n.lat}</Label>
          <Input
            id="team-lat"
            type="number"
            inputMode="decimal"
            step="0.0001"
            min={-90}
            max={90}
            value={lat}
            placeholder="11.0168"
            onChange={(event) => {
              setLat(event.target.value);
              commitPoint(event.target.value, lng);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="team-lng">{n.lng}</Label>
          <Input
            id="team-lng"
            type="number"
            inputMode="decimal"
            step="0.0001"
            min={-180}
            max={180}
            value={lng}
            placeholder="76.9558"
            onChange={(event) => {
              setLng(event.target.value);
              commitPoint(lat, event.target.value);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="team-radius">{n.radius}</Label>
          <Input
            id="team-radius"
            type="number"
            inputMode="decimal"
            min={0.1}
            max={TEAM_MAX_RADIUS_KM}
            step="any"
            value={radius}
            onChange={(event) => commitRadius(event.target.value)}
          />
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={200}
        step={1}
        value={Math.min(value.radiusKm, 200)}
        aria-label={n.radius}
        onChange={(event) => commitRadius(event.target.value)}
        className="w-full accent-primary"
      />
      <p className="text-xs text-muted-foreground">
        {value.point ? null : `${n.noPin} `}
        {n.noLocation}
      </p>
    </div>
  );
}
