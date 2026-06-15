import type { MapRouteProviderId } from "./map-provider.types";

export const mapTravelModes = ["driving", "walking", "bicycling", "transit"] as const;

export type MapTravelMode = (typeof mapTravelModes)[number];

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
  points?: RoutePoint[] | undefined;
}

export interface MapRoute {
  provider: MapRouteProviderId;
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
