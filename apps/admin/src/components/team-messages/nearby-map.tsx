"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";

import { copy } from "@/config/admin";

export type MapPoint = { lat: number; lng: number };

const INDIA: L.LatLngExpression = [22.5, 79];
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// Primary-ish red that reads on both OSM's light tiles and in dark mode.
const STROKE = "#e11d48";

// Browser-only (loaded with ssr: false). Circle markers avoid Leaflet's default icon images, which bundlers break.
export default function NearbyMap({
  point,
  radiusKm,
  onPick,
}: {
  point: MapPoint | null;
  radiusKm: number;
  onPick: (point: MapPoint) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!host.current || map.current) return;
    const m = L.map(host.current, { center: INDIA, zoom: 4, worldCopyJump: true });
    L.tileLayer(TILES, { maxZoom: 18, attribution: copy.teamMessages.composer.nearby.attribution }).addTo(m);
    m.on("click", (event: L.LeafletMouseEvent) => pick.current({ lat: event.latlng.lat, lng: event.latlng.lng }));
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    // The container can change size after mount (sidebar, grid); Leaflet caches its size otherwise.
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const group = layer.current;
    if (!m || !group) return;
    group.clearLayers();
    if (!point) return;
    const circle = L.circle([point.lat, point.lng], { radius: radiusKm * 1000, color: STROKE, weight: 2, fillOpacity: 0.12 });
    group.addLayer(circle);
    group.addLayer(L.circleMarker([point.lat, point.lng], { radius: 6, color: "#fff", weight: 2, fillColor: STROKE, fillOpacity: 1 }));
    m.fitBounds(circle.getBounds(), { padding: [24, 24], maxZoom: 13 });
  }, [point, radiusKm]);

  return (
    <div
      ref={host}
      role="application"
      aria-label={copy.teamMessages.composer.nearby.mapLabel}
      className="isolate h-72 w-full cursor-crosshair overflow-hidden rounded-md border md:h-96"
    />
  );
}
