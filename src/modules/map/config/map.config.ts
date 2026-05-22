import type { MapProviderId } from "../types/map.types";

export const mapConfig = {
  provider: (process.env.NEXT_PUBLIC_MAP_PROVIDER ?? "openStreetMap") as MapProviderId,
  osmTileUrl:
    process.env.NEXT_PUBLIC_OSM_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  minZoom: 3,
  maxZoom: 18
} as const;

export function resolveTileUrl({ x, y, z }: { x: number; y: number; z: number }) {
  return mapConfig.osmTileUrl
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}
