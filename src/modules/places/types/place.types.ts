import type { PlaceDto, SearchPlacesQueryDto } from "@/services/api/contracts";

export type MapProvider = "google" | "mapbox" | "openStreetMap";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type Place = PlaceDto;
export type PlaceSearchParams = SearchPlacesQueryDto & {
  near?: GeoPoint;
};
