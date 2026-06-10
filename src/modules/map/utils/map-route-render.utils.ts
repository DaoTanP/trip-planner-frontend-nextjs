import type { MapRoute } from "@/modules/map/types/map.types";
import { decodePolyline } from "@/modules/map/utils/polyline";

export function getRouteRenderPoints(route: MapRoute | undefined) {
  if (route?.points.length) {
    return route.points;
  }

  if (route?.encodedPolyline) {
    return decodePolyline(route.encodedPolyline);
  }

  return [];
}
