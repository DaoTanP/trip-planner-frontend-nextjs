import type { MapViewport } from "@/stores/use-planner-store";

export type MapProviderId = "openStreetMap" | "google" | "mapbox";

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

export interface TripMapProps {
  markers: MapMarker[];
  route: MapRoutePoint[];
  viewport: MapViewport;
  selectedMarkerId?: string | undefined;
  hoveredMarkerId?: string | undefined;
  onViewportChange: (viewport: MapViewport) => void;
  onMarkerSelect: (marker: MapMarker) => void;
}
