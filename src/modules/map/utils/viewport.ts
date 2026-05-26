import { mapConfig } from "@/modules/map/config/map.config";
import type { MapViewport } from "@/modules/map/types/map.types";

export function clampZoom(zoom: number) {
  return Math.min(mapConfig.maxZoom, Math.max(mapConfig.minZoom, zoom));
}

export function normalizeViewport(viewport: MapViewport): MapViewport {
  return {
    latitude: clampLatitude(viewport.latitude),
    longitude: normalizeLongitude(viewport.longitude),
    zoom: clampZoom(viewport.zoom)
  };
}

export function hasViewportChanged(previous: MapViewport, next: MapViewport) {
  return (
    Math.abs(previous.latitude - next.latitude) > 0.00001 ||
    Math.abs(previous.longitude - next.longitude) > 0.00001 ||
    Math.abs(previous.zoom - next.zoom) > 0.01
  );
}

function clampLatitude(latitude: number) {
  return Math.min(85.0511, Math.max(-85.0511, latitude));
}

function normalizeLongitude(longitude: number) {
  if (longitude < -180 || longitude > 180) {
    return ((((longitude + 180) % 360) + 360) % 360) - 180;
  }

  return longitude;
}
