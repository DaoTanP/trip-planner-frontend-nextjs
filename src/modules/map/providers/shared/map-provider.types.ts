export type MapProviderId = "maplibre" | "openStreetMap" | "google" | "mapbox" | "here";
export type MapRouteProviderId = MapProviderId | "osrm";

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
