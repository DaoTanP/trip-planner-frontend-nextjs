import { queryOptions } from "@tanstack/react-query";

import { isGoogleMapsConfigured } from "@/modules/map/config/map.config";
import { getMapRoute } from "@/modules/map/services/map-route.service";
import type { MapRouteRequest } from "@/modules/map/types/map.types";

export const mapRouteKeys = {
  all: ["map-routes"] as const,
  route: (request: MapRouteRequest) => [...mapRouteKeys.all, "route", request] as const
};

export function mapRouteQueryOptions(request: MapRouteRequest) {
  return queryOptions({
    queryKey: mapRouteKeys.route(request),
    queryFn: ({ signal }) => getMapRoute(request, signal),
    enabled: isGoogleMapsConfigured() && request.points.length >= 2,
    staleTime: 5 * 60 * 1000
  });
}
