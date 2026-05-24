import { mapConfig, isGoogleMapsConfigured } from "@/modules/map/config/map.config";
import { apiGet, apiPost } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type { ApiSuccessResponse } from "@/types/api";
import type { CreatePlaceRequestDto, PlaceDto, PlaceSourceDto } from "@/services/api/contracts";

import {
  geocodeGooglePlace,
  getGooglePlaceDetails,
  reverseGeocodeGooglePlace,
  searchGooglePlaces
} from "./google-places.service";
import type {
  GeocodeParams,
  GeocodeResult,
  Place,
  PlaceDetails,
  PlaceDetailsParams,
  PlaceProvider,
  PlaceSearchParams,
  PlaceSearchResult,
  ReverseGeocodeParams
} from "../types/place.types";

export async function searchPlaces(
  params: PlaceSearchParams,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  if (shouldUseGooglePlaces(params.provider)) {
    return searchGooglePlaces(params, signal);
  }

  const searchParams = new URLSearchParams();

  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.countryCode) {
    searchParams.set("countryCode", params.countryCode);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.near) {
    searchParams.set("lat", String(params.near.latitude));
    searchParams.set("lng", String(params.near.longitude));
  }

  const response = await apiGet<ApiSuccessResponse<{ places: Place[] }>>(
    `${apiEndpoints.places.search}?${searchParams.toString()}`,
    signal
  );

  return response.data.places.map(mapPlaceDtoToSearchResult);
}

export async function getPlaceDetails(
  params: PlaceDetailsParams,
  signal?: AbortSignal
): Promise<PlaceDetails> {
  if (params.provider === "google" && !params.storedPlaceId) {
    return getGooglePlaceDetails(params, signal);
  }

  const response = await apiGet<ApiSuccessResponse<{ place: Place }>>(
    apiEndpoints.places.detail(params.storedPlaceId ?? params.placeId),
    signal
  );

  return mapPlaceDtoToDetails(response.data.place);
}

export async function createPlace(payload: CreatePlaceRequestDto) {
  const response = await apiPost<ApiSuccessResponse<{ place: Place }>, CreatePlaceRequestDto>(
    apiEndpoints.places.list,
    payload
  );

  return response.data.place;
}

export async function createPlaceFromDetails(details: PlaceDetails) {
  if (details.storedPlaceId) {
    return getStoredPlace(details.storedPlaceId);
  }

  return createPlace(toCreatePlacePayload(details));
}

export async function geocodePlaces(
  params: GeocodeParams,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  if (isGoogleMapsConfigured()) {
    return geocodeGooglePlace(params, signal);
  }

  return [];
}

export async function reverseGeocodePlaces(
  params: ReverseGeocodeParams,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  if (isGoogleMapsConfigured()) {
    return reverseGeocodeGooglePlace(params, signal);
  }

  return [];
}

async function getStoredPlace(placeId: string) {
  const response = await apiGet<ApiSuccessResponse<{ place: Place }>>(
    apiEndpoints.places.detail(placeId)
  );

  return response.data.place;
}

function shouldUseGooglePlaces(provider?: PlaceProvider) {
  if (provider === "google") {
    return isGoogleMapsConfigured();
  }

  return mapConfig.provider === "google" && isGoogleMapsConfigured();
}

function mapPlaceDtoToSearchResult(place: PlaceDto): PlaceSearchResult {
  return {
    id: place.id,
    provider: providerFromSource(place.source),
    source: place.source,
    storedPlaceId: place.id,
    providerPlaceId: place.externalId ?? undefined,
    name: place.name,
    formattedAddress: place.formattedAddress,
    countryCode: place.countryCode,
    latitude: place.latitude,
    longitude: place.longitude,
    websiteUrl: place.websiteUrl,
    phoneNumber: place.phoneNumber,
    timezone: place.timezone,
    categories: place.categories
  };
}

function mapPlaceDtoToDetails(place: PlaceDto): PlaceDetails {
  return {
    ...mapPlaceDtoToSearchResult(place),
    metadata: place.metadata ?? undefined
  };
}

function providerFromSource(source: PlaceSourceDto): PlaceProvider {
  if (source === "GOOGLE") {
    return "google";
  }
  if (source === "MAPBOX") {
    return "mapbox";
  }
  if (source === "OSM") {
    return "openStreetMap";
  }

  return "internal";
}

function toCreatePlacePayload(details: PlaceDetails): CreatePlaceRequestDto {
  const payload: CreatePlaceRequestDto = {
    name: details.name,
    source: details.source
  };

  if (details.providerPlaceId) {
    payload.externalId = details.providerPlaceId;
  }
  if (details.formattedAddress) {
    payload.formattedAddress = details.formattedAddress;
  }
  if (details.countryCode) {
    payload.countryCode = details.countryCode;
  }
  if (details.latitude !== null) {
    payload.latitude = details.latitude;
  }
  if (details.longitude !== null) {
    payload.longitude = details.longitude;
  }
  if (details.websiteUrl) {
    payload.websiteUrl = details.websiteUrl;
  }
  if (details.phoneNumber) {
    payload.phoneNumber = details.phoneNumber;
  }
  if (details.timezone) {
    payload.timezone = details.timezone;
  }
  if (details.categories.length > 0) {
    payload.categories = details.categories;
  }
  if (details.sourcePayload) {
    payload.sourcePayload = details.sourcePayload;
  }
  if (details.metadata) {
    payload.metadata = details.metadata;
  }

  return payload;
}
