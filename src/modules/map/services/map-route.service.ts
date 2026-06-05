import { isGoogleMapsConfigured, mapConfig } from "@/modules/map/config/map.config";
import { getGoogleRoute } from "@/modules/map/providers/google/google-directions.service";
import { MapProviderError } from "@/modules/map/providers/shared/map-provider-error";
import type { MapRoute, MapRouteRequest } from "@/modules/map/types/map.types";

export async function getMapRoute(
  request: MapRouteRequest,
  signal?: AbortSignal
): Promise<MapRoute> {
  if (mapConfig.provider === "google" && isGoogleMapsConfigured()) {
    return getGoogleRoute(request, signal);
  }

  throw new MapProviderError({
    code: "MAP_PROVIDER_UNSUPPORTED",
    provider: mapConfig.provider,
    message: "The active map provider does not support routing"
  });
}
