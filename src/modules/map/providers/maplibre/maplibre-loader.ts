import { MapProviderError } from "@/modules/map/providers/shared/map-provider-error";

import type { MapLib } from "react-map-gl/maplibre";

let mapLibrePromise: Promise<MapLib> | undefined;

export function loadMapLibre() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new MapProviderError({
        code: "MAP_PROVIDER_UNSUPPORTED",
        provider: "maplibre",
        message: "MapLibre can only be loaded in the browser"
      })
    );
  }

  mapLibrePromise ??= import("maplibre-gl").then((module) => module as unknown as MapLib);

  return mapLibrePromise;
}
