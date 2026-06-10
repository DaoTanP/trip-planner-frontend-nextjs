import type { MapRoute, MapRouteRequest } from "@/modules/map/types/map.types";

import { osrmRoutingProvider } from "./providers/osrm-routing.provider";
import type { MapRouteInput, RoutingProvider } from "./routing.types";

const defaultRoutingProvider: RoutingProvider = osrmRoutingProvider;

export function isMapRoutingConfigured() {
  return defaultRoutingProvider.isConfigured();
}

export function getRoutingProviderId() {
  return defaultRoutingProvider.id;
}

export async function getMapRoute(input: MapRouteInput, signal?: AbortSignal): Promise<MapRoute> {
  return defaultRoutingProvider.getRoute(toRouteRequest(input), signal);
}

function toRouteRequest(input: MapRouteInput): MapRouteRequest {
  return Array.isArray(input) ? { points: input, travelMode: "driving" } : input;
}
