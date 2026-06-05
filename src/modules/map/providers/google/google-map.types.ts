import type { MapRoutePoint } from "@/modules/map/types/map.types";

export interface GoogleLatLng {
  lat: () => number;
  lng: () => number;
}

export interface GoogleLatLngLiteral {
  lat: number;
  lng: number;
}

export interface GoogleMapsEventListener {
  remove: () => void;
}

export interface GoogleMapMouseEvent {
  latLng?: GoogleLatLng;
}

export interface GoogleMap {
  addListener: (
    eventName: string,
    handler: (event?: GoogleMapMouseEvent) => void
  ) => GoogleMapsEventListener;
  fitBounds: (bounds: GoogleLatLngBounds) => void;
  getCenter: () => GoogleLatLng | undefined;
  getZoom: () => number | undefined;
  setCenter: (center: GoogleLatLngLiteral) => void;
  setZoom: (zoom: number) => void;
}

export interface GoogleLatLngBounds {
  extend: (point: GoogleLatLngLiteral) => void;
}

export interface GoogleMarker {
  addListener: (eventName: string, handler: () => void) => GoogleMapsEventListener;
  setIcon: (icon: GoogleMarkerIcon) => void;
  setLabel: (label: GoogleMarkerLabel) => void;
  setMap: (map: GoogleMap | null) => void;
  setPosition: (position: GoogleLatLngLiteral) => void;
  setTitle: (title: string) => void;
  setZIndex: (zIndex: number) => void;
}

export interface GooglePolyline {
  setMap: (map: GoogleMap | null) => void;
  setOptions: (options: GooglePolylineOptions) => void;
  setPath: (path: GoogleLatLngLiteral[]) => void;
}

export interface GoogleMarkerLabel {
  text: string;
  color: string;
  fontSize: string;
  fontWeight: string;
}

export interface GoogleMarkerIcon {
  path: string;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWeight: number;
  scale: number;
  anchor: unknown;
}

export interface GooglePolylineOptions {
  clickable?: boolean;
  geodesic?: boolean;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
}

export interface GoogleMapOptions {
  center: GoogleLatLngLiteral;
  clickableIcons?: boolean;
  controlSize?: number;
  disableDefaultUI?: boolean;
  fullscreenControl?: boolean;
  gestureHandling?: "auto" | "cooperative" | "greedy" | "none";
  mapId?: string;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  zoom: number;
  zoomControl?: boolean;
}

export interface GoogleGeocoder {
  geocode: (
    request: GoogleGeocoderRequest,
    callback: (results: GoogleGeocoderResult[] | null, status: string) => void
  ) => void;
}

export interface GoogleGeocoderRequest {
  address?: string;
  componentRestrictions?: {
    country?: string;
  };
  language?: string;
  location?: GoogleLatLngLiteral;
  region?: string;
}

export interface GoogleGeocoderResult {
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
  geometry?: {
    location?: GoogleLatLng;
  };
  place_id?: string;
  types?: string[];
}

export interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface GoogleAutocompletePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  terms?: Array<{ value: string }>;
  types?: string[];
}

export interface GoogleAutocompleteRequest {
  componentRestrictions?: {
    country?: string;
  };
  input: string;
  language?: string;
  location?: GoogleLatLngLiteral;
  radius?: number;
  region?: string;
  types?: string[];
}

export interface GoogleAutocompleteService {
  getPlacePredictions: (
    request: GoogleAutocompleteRequest,
    callback: (predictions: GoogleAutocompletePrediction[] | null, status: string) => void
  ) => void;
}

export interface GooglePlaceResult {
  address_components?: GoogleAddressComponent[];
  formatted_address?: string;
  geometry?: {
    location?: GoogleLatLng;
  };
  international_phone_number?: string;
  name?: string;
  place_id?: string;
  types?: string[];
  url?: string;
  utc_offset_minutes?: number;
  website?: string;
}

export interface GooglePlacesService {
  getDetails: (
    request: {
      fields: string[];
      language?: string;
      placeId: string;
      region?: string;
    },
    callback: (result: GooglePlaceResult | null, status: string) => void
  ) => void;
}

export interface GoogleDirectionsService {
  route: (
    request: GoogleDirectionsRequest,
    callback: (result: GoogleDirectionsResult | null, status: string) => void
  ) => void;
}

export interface GoogleDirectionsRequest {
  destination: GoogleLatLngLiteral;
  optimizeWaypoints?: boolean;
  origin: GoogleLatLngLiteral;
  region?: string;
  travelMode: string;
  unitSystem?: number;
  waypoints?: Array<{
    location: GoogleLatLngLiteral;
    stopover: boolean;
  }>;
}

export interface GoogleDirectionsResult {
  routes?: GoogleDirectionsRoute[];
}

export interface GoogleDirectionsRoute {
  legs?: GoogleDirectionsLeg[];
  overview_path?: GoogleLatLng[];
  overview_polyline?: string;
}

export interface GoogleDirectionsLeg {
  distance?: {
    value?: number;
  };
  duration?: {
    value?: number;
  };
  end_location?: GoogleLatLng;
  start_location?: GoogleLatLng;
}

export interface GoogleMapsApi {
  DirectionsService: new () => GoogleDirectionsService;
  Geocoder: new () => GoogleGeocoder;
  LatLngBounds: new () => GoogleLatLngBounds;
  Map: new (container: HTMLElement, options: GoogleMapOptions) => GoogleMap;
  Marker: new (options: {
    icon: GoogleMarkerIcon;
    label: GoogleMarkerLabel;
    map: GoogleMap;
    optimized?: boolean;
    position: GoogleLatLngLiteral;
    title: string;
    zIndex?: number;
  }) => GoogleMarker;
  Point: new (x: number, y: number) => unknown;
  Polyline: new (
    options: GooglePolylineOptions & { map?: GoogleMap; path: GoogleLatLngLiteral[] }
  ) => GooglePolyline;
  TravelMode: {
    BICYCLING: string;
    DRIVING: string;
    TRANSIT: string;
    WALKING: string;
  };
  UnitSystem: {
    METRIC: number;
  };
  event: {
    clearInstanceListeners: (instance: unknown) => void;
  };
  places: {
    AutocompleteService: new () => GoogleAutocompleteService;
    PlacesService: new (container: HTMLElement) => GooglePlacesService;
  };
}

declare global {
  interface Window {
    __tripPlannerGoogleMapsPromise?: Promise<GoogleMapsApi>;
  }
}

export function toGoogleLatLngLiteral(point: MapRoutePoint): GoogleLatLngLiteral {
  return {
    lat: point.latitude,
    lng: point.longitude
  };
}

export function fromGoogleLatLng(point: GoogleLatLng): MapRoutePoint {
  return {
    latitude: point.lat(),
    longitude: point.lng()
  };
}
