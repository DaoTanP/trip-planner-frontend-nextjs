import type { MapRoute, MapRouteRequest } from "@/modules/map/types/map.types";

export type RoutingProviderId = "osrm";

export interface RoutingProvider {
  id: RoutingProviderId;
  isConfigured: () => boolean;
  getRoute: (request: MapRouteRequest, signal?: AbortSignal) => Promise<MapRoute>;
}
