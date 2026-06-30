import { queryOptions } from "@tanstack/react-query";

import { getMapRoute } from "@/modules/map/services/map-route.service";
import type { MapRoutePoint, MapRouteRequest } from "@/modules/map/types/map.types";

export const mapRouteKeys = {
  all: ["map-routes"] as const,
  route: (request: MapRouteRequest) =>
    [...mapRouteKeys.all, "route", normalizeRouteRequest(request)] as const
};

export function mapRouteQueryOptions(request: MapRouteRequest) {
  const normalizedRequest = normalizeRouteRequest(request);

  return queryOptions({
    queryKey: mapRouteKeys.route(normalizedRequest),
    queryFn: ({ signal }) => getMapRoute(normalizedRequest, signal),
    enabled: normalizedRequest.points.length >= 2,
    retry: false,
    staleTime: 5 * 60 * 1000
  });
}

function normalizeRouteRequest(request: MapRouteRequest): MapRouteRequest {
  return {
    points: request.points.filter(isValidRoutePoint).map(normalizeRoutePoint),
    travelMode: request.travelMode,
    ...(request.optimizeWaypoints ? { optimizeWaypoints: true } : {})
  };
}

function normalizeRoutePoint(point: MapRoutePoint): MapRoutePoint {
  return {
    latitude: Number(point.latitude.toFixed(6)),
    longitude: Number(point.longitude.toFixed(6))
  };
}

function isValidRoutePoint(point: MapRoutePoint) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}
