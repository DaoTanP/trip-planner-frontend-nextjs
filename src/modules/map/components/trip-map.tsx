"use client";

import { mapConfig } from "@/modules/map/config/map.config";
import { GoogleMapProvider } from "@/modules/map/providers/google/google-map-provider";
import { OpenStreetMapProvider } from "@/modules/map/providers/osm/open-street-map-provider";
import type { TripMapProps } from "@/modules/map/types/map.types";

export function TripMap(props: TripMapProps) {
  if (mapConfig.provider === "google") {
    return <GoogleMapProvider {...props} />;
  }

  return <OpenStreetMapProvider {...props} />;
}
