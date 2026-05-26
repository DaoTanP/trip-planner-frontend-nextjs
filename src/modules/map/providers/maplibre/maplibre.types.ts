import type { MapRef, ViewState } from "react-map-gl/maplibre";

import type { MapViewport } from "@/modules/map/types/map.types";

export type MapLibreMapRef = MapRef;

export type MapLibreViewState = Pick<ViewState, "latitude" | "longitude" | "zoom">;

export function viewportFromViewState(viewState: MapLibreViewState): MapViewport {
  return {
    latitude: viewState.latitude,
    longitude: viewState.longitude,
    zoom: viewState.zoom
  };
}

export function viewportFromMap(map: MapLibreMapRef): MapViewport {
  const center = map.getCenter();

  return {
    latitude: center.lat,
    longitude: center.lng,
    zoom: map.getZoom()
  };
}
