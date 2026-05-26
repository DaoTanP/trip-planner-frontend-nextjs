"use client";

import type { TripMapProps } from "@/modules/map/types/map.types";

import { MapLibreMap } from "./maplibre-map";

export function MapLibreProvider(props: TripMapProps) {
  return <MapLibreMap {...props} />;
}
