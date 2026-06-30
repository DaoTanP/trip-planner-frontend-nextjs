import type { MapRoute, MapRouteRequest } from "@/modules/map/types/map.types";

import { osrmRoutingProvider } from "./providers/osrm-routing.provider";
import type { RoutingProvider } from "./routing.types";

const defaultRoutingProvider: RoutingProvider = osrmRoutingProvider;

export function isMapRoutingConfigured() {
  return defaultRoutingProvider.isConfigured();
}

export function getRoutingProviderId() {
  return defaultRoutingProvider.id;
}

export async function getMapRoute(
  request: MapRouteRequest,
  signal?: AbortSignal
): Promise<MapRoute> {
  return defaultRoutingProvider.getRoute(request, signal);
}
