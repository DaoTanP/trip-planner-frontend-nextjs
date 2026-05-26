import type { MapProviderId } from "./map-provider.types";

export type MapTravelMode = "driving" | "walking" | "bicycling" | "transit";

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export type MapRoutePoint = RoutePoint;

export interface MapRouteLeg {
  start: RoutePoint;
  end: RoutePoint;
  distanceMeters: number | null;
  durationSeconds: number | null;
}

export interface MapRoute {
  provider: MapProviderId;
  points: RoutePoint[];
  encodedPolyline?: string | undefined;
  distanceMeters: number | null;
  durationSeconds: number | null;
  legs: MapRouteLeg[];
}

export interface MapRouteRequest {
  points: RoutePoint[];
  travelMode?: MapTravelMode | undefined;
  optimizeWaypoints?: boolean | undefined;
  language?: string | undefined;
  region?: string | undefined;
}
