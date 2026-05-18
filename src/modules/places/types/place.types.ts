export type MapProvider = "google" | "mapbox" | "openStreetMap";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  location: GeoPoint;
  provider: MapProvider;
}

export interface PlaceSearchParams {
  query: string;
  near?: GeoPoint;
}
