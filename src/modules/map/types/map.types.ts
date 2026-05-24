import type { MapViewport } from "@/stores/use-planner-store";

export type MapProviderId = "openStreetMap" | "google" | "mapbox" | "here";

export type MapTravelMode = "driving" | "walking" | "bicycling" | "transit";

export interface MapMarker {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  itemId?: string | undefined;
  placeId?: string | undefined;
}

export interface MapRoutePoint {
  latitude: number;
  longitude: number;
}

export interface MapRouteLeg {
  start: MapRoutePoint;
  end: MapRoutePoint;
  distanceMeters: number | null;
  durationSeconds: number | null;
}

export interface MapRoute {
  provider: MapProviderId;
  points: MapRoutePoint[];
  encodedPolyline?: string | undefined;
  distanceMeters: number | null;
  durationSeconds: number | null;
  legs: MapRouteLeg[];
}

export interface MapRouteRequest {
  points: MapRoutePoint[];
  travelMode?: MapTravelMode | undefined;
  optimizeWaypoints?: boolean | undefined;
  language?: string | undefined;
  region?: string | undefined;
}

export interface TripMapProps {
  markers: MapMarker[];
  route: MapRoutePoint[];
  routeResult?: MapRoute | undefined;
  viewport: MapViewport;
  selectedMarkerId?: string | undefined;
  hoveredMarkerId?: string | undefined;
  onViewportChange: (viewport: MapViewport) => void;
  onMarkerSelect: (marker: MapMarker) => void;
  onMarkerHover?: (marker?: MapMarker) => void;
}
