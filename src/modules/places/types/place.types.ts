import type {
  PlaceDto,
  PlaceProviderDto,
  ReverseGeocodePlaceDto,
  ResolvePlaceRequestDto,
  PlaceSourceDto,
  SearchPlacesQueryDto
} from "@/services/api/contracts";

export type PlaceSearchProvider = "google" | "mapbox" | "openStreetMap" | "internal";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type Place = PlaceDto;
export type PlaceSearchParams = SearchPlacesQueryDto & {
  near?: GeoPoint;
  language?: string;
  provider?: PlaceSearchProvider;
  region?: string;
};

export interface NormalizedPlace {
  id: string;
  provider: PlaceSearchProvider;
  source: PlaceSourceDto;
  storedPlaceId?: string | undefined;
  providerPlaceId?: string | undefined;
  name: string;
  formattedAddress: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  websiteUrl: string | null;
  phoneNumber: string | null;
  timezone: string | null;
  categories: string[];
}

export type PlaceSearchResult = NormalizedPlace;

export interface PlaceDetails extends NormalizedPlace {
  sourcePayload?: ResolvePlaceRequestDto["sourcePayload"] | undefined;
  metadata?: ResolvePlaceRequestDto["metadata"] | undefined;
}

export interface PlaceDetailsParams {
  placeId: string;
  provider: PlaceSearchProvider;
  storedPlaceId?: string | undefined;
  language?: string | undefined;
  region?: string | undefined;
}

export interface GeocodeParams {
  address: string;
  countryCode?: string | undefined;
  language?: string | undefined;
  region?: string | undefined;
}

export interface ReverseGeocodeParams {
  point: GeoPoint;
  language?: string | undefined;
  region?: string | undefined;
}

export type GeocodeResult = PlaceDetails;
export type ReverseGeocodeResult = ReverseGeocodePlaceDto;
export type ResolvePlacePayload = ResolvePlaceRequestDto;
export type ResolvablePlaceInput =
  | Place
  | PlaceDetails
  | PlaceSearchResult
  | ReverseGeocodeResult
  | ResolvePlacePayload;

export function isBackendPlace(value: ResolvablePlaceInput): value is Place {
  return "id" in value && "createdAt" in value && "updatedAt" in value;
}

export function mapSearchProviderToBackendProvider(
  provider: PlaceSearchProvider
): PlaceProviderDto {
  switch (provider) {
    case "google":
      return "GOOGLE";
    case "mapbox":
      return "MAPBOX";
    case "openStreetMap":
      return "OSM";
    case "internal":
      return "INTERNAL";
  }
}
