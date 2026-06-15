"use client";

import { Layer, Source, type LayerProps } from "react-map-gl/maplibre";
import { memo, useMemo } from "react";

import type { MapRoutePoint } from "@/modules/map/types/map.types";
import { routeColors, routeRenderConfig } from "@/theme";

import { mapLibreMarkerShadowLayerId } from "./maplibre-marker-layer";

const routeSourceId = "trip-route";
export const mapLibreRouteLayerId = "trip-route-line";
const activeRouteSourceId = "trip-active-route";
export const mapLibreActiveRouteLayerId = "trip-active-route-line";
export const mapLibreRouteInteractiveLayerIds = [mapLibreRouteLayerId, mapLibreActiveRouteLayerId];

const routeLayer: LayerProps = {
  id: mapLibreRouteLayerId,
  type: "line",
  source: routeSourceId,
  layout: {
    "line-cap": routeRenderConfig.lineCap,
    "line-join": routeRenderConfig.lineJoin
  },
  paint: {
    "line-color": routeColors.default.hex,
    "line-opacity": routeRenderConfig.default.mapLibreOpacity,
    "line-width": routeRenderConfig.default.width
  }
};

const activeRouteLayer: LayerProps = {
  id: mapLibreActiveRouteLayerId,
  type: "line",
  source: activeRouteSourceId,
  layout: {
    "line-cap": routeRenderConfig.lineCap,
    "line-join": routeRenderConfig.lineJoin
  },
  paint: {
    "line-color": routeColors.active.hex,
    "line-opacity": routeRenderConfig.active.mapLibreOpacity,
    "line-width": routeRenderConfig.active.width
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
          <Layer {...routeLayer} beforeId={mapLibreMarkerShadowLayerId} />
        </Source>
      ) : null}
      {activeRoute.length > 1 ? (
        <Source id={activeRouteSourceId} type="geojson" data={activeRouteData}>
          <Layer {...activeRouteLayer} beforeId={mapLibreMarkerShadowLayerId} />
        </Source>
      ) : null}
    </>
  );
});
