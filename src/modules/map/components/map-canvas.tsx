"use client";

import { mapConfig } from "@/modules/map/config/map.config";
import { GoogleMapProvider } from "@/modules/map/providers/google/google-map-provider";
import { MapLibreProvider } from "@/modules/map/providers/maplibre/maplibre-provider";
import { OpenStreetMapProvider } from "@/modules/map/providers/osm/open-street-map-provider";
import type { TripMapProps } from "@/modules/map/types/map.types";

export function MapCanvas(props: TripMapProps) {
  if (mapConfig.provider === "google") {
    return <GoogleMapProvider {...props} />;
  }

  if (mapConfig.provider === "maplibre") {
    return <MapLibreProvider {...props} />;
  }

  return <OpenStreetMapProvider {...props} />;
}
