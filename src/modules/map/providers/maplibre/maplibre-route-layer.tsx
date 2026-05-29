"use client";

import { Layer, Source, type LayerProps } from "react-map-gl/maplibre";
import { memo, useMemo } from "react";

import type { MapRoutePoint } from "@/modules/map/types/map.types";

const routeSourceId = "trip-route";
const routeLayerId = "trip-route-line";
const activeRouteSourceId = "trip-active-route";
const activeRouteLayerId = "trip-active-route-line";

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

const activeRouteLayer: LayerProps = {
  id: activeRouteLayerId,
  type: "line",
  source: activeRouteSourceId,
  layout: {
    "line-cap": "round",
    "line-join": "round"
  },
  paint: {
    "line-color": "#f97316",
    "line-opacity": 0.92,
    "line-width": 7
  }
};

interface MapLibreRouteLayerProps {
  route: MapRoutePoint[];
  activeRoute?: MapRoutePoint[] | undefined;
}

export const MapLibreRouteLayer = memo(function MapLibreRouteLayer({
  route,
  activeRoute = []
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
  const activeRouteData = useMemo(
    () => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: activeRoute.map((point) => [point.longitude, point.latitude])
      }
    }),
    [activeRoute]
  );

  if (route.length < 2 && activeRoute.length < 2) {
    return null;
  }

  return (
    <>
      {route.length > 1 ? (
        <Source id={routeSourceId} type="geojson" data={routeData}>
          <Layer {...routeLayer} />
        </Source>
      ) : null}
      {activeRoute.length > 1 ? (
        <Source id={activeRouteSourceId} type="geojson" data={activeRouteData}>
          <Layer {...activeRouteLayer} />
        </Source>
      ) : null}
    </>
  );
});
