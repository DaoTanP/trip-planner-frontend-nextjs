import type { MapMarker } from "@/modules/map/providers/shared/map-marker.types";
import type {
  MapRoute,
  MapRoutePoint,
  MapTravelMode
} from "@/modules/map/providers/shared/map-route.types";
import type { MapViewport } from "@/modules/map/providers/shared/map-provider.types";

export type {
  MapBounds,
  MapProviderId,
  MapRouteProviderId,
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
export { mapTravelModes } from "@/modules/map/providers/shared/map-route.types";

export interface TripMapProps {
  markers: MapMarker[];
  route: MapRoutePoint[];
  activeRoute?: MapRoutePoint[] | undefined;
  routeResult?: MapRoute | undefined;
  viewport: MapViewport;
  selectedMarkerId?: string | undefined;
  hoveredMarkerId?: string | undefined;
  focusedMarkerIds?: string[] | undefined;
  markerPresence?: MapMarkerPresence[] | undefined;
  autoFitMarkerBoundsKey?: string | undefined;
  onViewportChange: (viewport: MapViewport) => void;
  onMarkerSelect: (marker: MapMarker) => void;
  onMarkerHover?: (marker?: MapMarker) => void;
  onMapContextChange?: (() => void) | undefined;
  onMapClick?: ((point: MapRoutePoint) => void) | undefined;
}

export type MapMarkerPresence = {
  markerId: string;
  entries: MapMarkerPresenceEntry[];
};

export type MapMarkerPresenceEntry = {
  userName: string;
  state: "VIEWING" | "EDITING" | "REPLYING";
};

export type DerivedRouteLeg = {
  id: string;
  fromItemId: string;
  toItemId: string;
  fromPlaceId: string;
  toPlaceId: string;
  travelMode: MapTravelMode;
  distanceMeters?: number | undefined;
  durationSeconds?: number | undefined;
  geometry?: {
    type: "LineString";
    coordinates: [number, number][];
  };
};
