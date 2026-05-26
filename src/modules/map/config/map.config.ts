import type { MapProviderId } from "../types/map.types";

const defaultLatitude = readNumber(process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT, 16.0471);
const defaultLongitude = readNumber(process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG, 108.2068);
const defaultZoom = readNumber(process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM, 12);

export const mapConfig = {
  provider: (process.env.NEXT_PUBLIC_MAP_PROVIDER ?? "maplibre") as MapProviderId,
  osmTileUrl:
    process.env.NEXT_PUBLIC_OSM_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  mapStyleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://demotiles.maplibre.org/style.json",
  defaultViewport: {
    latitude: defaultLatitude,
    longitude: defaultLongitude,
    zoom: defaultZoom
  },
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  googleMapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "",
  googleMapsRegion: process.env.NEXT_PUBLIC_GOOGLE_MAPS_REGION ?? "",
  googleMapsLanguage: process.env.NEXT_PUBLIC_GOOGLE_MAPS_LANGUAGE ?? "",
  minZoom: 3,
  maxZoom: 18
} as const;

function readNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isGoogleMapsConfigured() {
  return mapConfig.provider === "google" && Boolean(mapConfig.googleMapsApiKey);
}

export function isMapLibreConfigured() {
  return mapConfig.provider === "maplibre" && Boolean(mapConfig.mapStyleUrl);
}

export function resolveTileUrl({ x, y, z }: { x: number; y: number; z: number }) {
  return mapConfig.osmTileUrl
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}
