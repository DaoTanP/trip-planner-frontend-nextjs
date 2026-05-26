"use client";

import { Layer, Source, type LayerProps } from "react-map-gl/maplibre";
import { memo, useMemo } from "react";

import type { MapRoutePoint } from "@/modules/map/types/map.types";

const routeSourceId = "trip-route";
const routeLayerId = "trip-route-line";

const routeLayer: LayerProps = {
  id: routeLayerId,
  type: "line",
  source: routeSourceId,
  layout: {
    "line-cap": "round",
    "line-join": "round"
  },
  paint: {
    "line-color": "#2563eb",
    "line-opacity": 0.78,
    "line-width": 5
  }
};

interface MapLibreRouteLayerProps {
  route: MapRoutePoint[];
}

export const MapLibreRouteLayer = memo(function MapLibreRouteLayer({
  route
}: MapLibreRouteLayerProps) {
  const routeData = useMemo(
    () => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: route.map((point) => [point.longitude, point.latitude])
      }
    }),
    [route]
  );

  if (route.length < 2) {
    return null;
  }

  return (
    <Source id={routeSourceId} type="geojson" data={routeData}>
      <Layer {...routeLayer} />
    </Source>
  );
});
