import type { MapMarker } from "@/modules/map/providers/shared/map-marker.types";
import type { MapRoute, MapRoutePoint } from "@/modules/map/providers/shared/map-route.types";
import type { MapViewport } from "@/modules/map/providers/shared/map-provider.types";

export type {
  MapBounds,
  MapProviderId,
  MapViewport
} from "@/modules/map/providers/shared/map-provider.types";
export type { MapMarker } from "@/modules/map/providers/shared/map-marker.types";
export type {
  MapRoute,
  MapRouteLeg,
  MapRoutePoint,
  MapRouteRequest,
  MapTravelMode,
  RoutePoint
} from "@/modules/map/providers/shared/map-route.types";

export interface TripMapProps {
  markers: MapMarker[];
  route: MapRoutePoint[];
  activeRoute?: MapRoutePoint[] | undefined;
  routeResult?: MapRoute | undefined;
  viewport: MapViewport;
  selectedMarkerId?: string | undefined;
  hoveredMarkerId?: string | undefined;
  focusedMarkerIds?: string[] | undefined;
  onViewportChange: (viewport: MapViewport) => void;
  onMarkerSelect: (marker: MapMarker) => void;
  onMarkerHover?: (marker?: MapMarker) => void;
}
