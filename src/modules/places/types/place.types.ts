import type {
  CreatePlaceRequestDto,
  PlaceDto,
  PlaceSourceDto,
  SearchPlacesQueryDto
} from "@/services/api/contracts";

export type PlaceProvider = "google" | "mapbox" | "openStreetMap" | "here" | "internal";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type Place = PlaceDto;
export type PlaceSearchParams = SearchPlacesQueryDto & {
  near?: GeoPoint;
  language?: string;
  provider?: PlaceProvider;
  region?: string;
};

export interface NormalizedPlace {
  id: string;
  provider: PlaceProvider;
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
  sourcePayload?: CreatePlaceRequestDto["sourcePayload"] | undefined;
  metadata?: CreatePlaceRequestDto["metadata"] | undefined;
}

export interface PlaceDetailsParams {
  placeId: string;
  provider: PlaceProvider;
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
