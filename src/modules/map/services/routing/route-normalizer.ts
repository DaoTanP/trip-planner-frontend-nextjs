import { mapConfig } from "@/modules/map/config/map.config";
import type { MapProviderId, MapRoute, MapRoutePoint } from "@/modules/map/types/map.types";
import { decodePolyline } from "@/modules/map/utils/polyline";

export function normalizeRouteFromPoints(
  points: MapRoutePoint[],
  provider: MapProviderId = mapConfig.provider
): MapRoute {
  return {
    provider,
    points,
    distanceMeters: null,
    durationSeconds: null,
    legs: []
  };
}

export function getRouteRenderPoints(route: MapRoute | undefined, fallback: MapRoutePoint[]) {
  if (route?.points.length) {
    return route.points;
  }

  if (route?.encodedPolyline) {
    return decodePolyline(route.encodedPolyline);
  }

  return fallback;
}
