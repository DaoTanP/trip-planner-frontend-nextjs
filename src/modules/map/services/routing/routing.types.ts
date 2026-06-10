import type { MapRoute, MapRoutePoint, MapRouteRequest } from "@/modules/map/types/map.types";

export type RoutingProviderId = "osrm";

export interface RoutingProvider {
  id: RoutingProviderId;
  isConfigured: () => boolean;
  getRoute: (request: MapRouteRequest, signal?: AbortSignal) => Promise<MapRoute>;
}

export type MapRouteInput = MapRoutePoint[] | MapRouteRequest;
