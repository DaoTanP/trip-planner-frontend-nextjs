import { mapConfig, isGoogleMapsConfigured } from "@/modules/map/config/map.config";
import { apiGet, apiPost } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  PlaceDto,
  PlaceProviderDto,
  PlaceSourceDto,
  ResolvePlaceRequestDto
} from "@/services/api/contracts";

import { getGooglePlaceDetails, searchGooglePlaces } from "./google-places.service";
import type {
  Place,
  PlaceDetails,
  PlaceDetailsParams,
  PlaceSearchProvider,
  PlaceSearchParams,
  PlaceSearchResult,
  ResolvablePlaceInput,
  ReverseGeocodeResult,
  ReverseGeocodeParams
} from "../types/place.types";
import { isBackendPlace, mapSearchProviderToBackendProvider } from "../types/place.types";

export async function searchPlaces(
  params: PlaceSearchParams,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const provider = params.provider ?? getDefaultSearchProvider();

  if (provider !== "internal") {
    try {
      const providerResults = await searchProviderPlaces(params, provider, signal);

      if (providerResults.length > 0) {
        return providerResults;
      }
    } catch {
      // Backend persisted-place search is the fallback discovery path.
    }
  }

  return searchBackendPlaces(params, signal);
}

export async function searchBackendPlaces(
  params: PlaceSearchParams,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
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

export async function searchProviderPlaces(
  params: PlaceSearchParams,
  provider: PlaceSearchProvider,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  if (provider === "google") {
    return isGoogleMapsConfigured() ? searchGooglePlaces(params, signal) : [];
  }

  if (provider === "mapbox") {
    return searchMapboxPlaces(params, signal);
  }

  if (provider === "openStreetMap") {
    return searchOpenStreetMapPlaces(params, signal);
  }

  return searchBackendPlaces(params, signal);
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

export async function getTripPlaces(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<{ places: Place[] }>>(
    apiEndpoints.trips.places(tripId),
    signal
  );

  return response.data.places;
}

export async function reverseGeocodePlaces(
  params: ReverseGeocodeParams,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  const searchParams = new URLSearchParams({
    lat: String(params.point.latitude),
    lng: String(params.point.longitude)
  });

  const response = await apiGet<ApiSuccessResponse<{ place: ReverseGeocodeResult }>>(
    `${apiEndpoints.places.reverseGeocode}?${searchParams.toString()}`,
    signal
  );

  return response.data.place;
}

export async function resolvePlace(input: ResolvablePlaceInput): Promise<Place> {
  if (isBackendPlace(input)) {
    return input;
  }

  if ("storedPlaceId" in input && input.storedPlaceId) {
    return getStoredPlace(input.storedPlaceId);
  }

  const payload = toResolvePlacePayload(input);
  const response = await apiPost<
    ApiSuccessResponse<{ place: Place; created: boolean }>,
    ResolvePlaceRequestDto
  >(apiEndpoints.places.resolve, payload);

  return response.data.place;
}

async function getStoredPlace(placeId: string) {
  const response = await apiGet<ApiSuccessResponse<{ place: Place }>>(
    apiEndpoints.places.detail(placeId)
  );

  return response.data.place;
}

function getDefaultSearchProvider(): PlaceSearchProvider {
  if (mapConfig.provider === "google" && isGoogleMapsConfigured()) {
    return "google";
  }
  if (mapConfig.provider === "mapbox" && mapConfig.mapboxAccessToken) {
    return "mapbox";
  }
  if (mapConfig.provider === "openStreetMap" || mapConfig.provider === "maplibre") {
    return "openStreetMap";
  }

  return "internal";
}

function mapPlaceDtoToSearchResult(place: PlaceDto): PlaceSearchResult {
  return {
    id: place.id,
    provider: providerFromSource(place.provider),
    source: place.provider,
    storedPlaceId: place.id,
    providerPlaceId: place.providerPlaceId ?? undefined,
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

type PlaceProvider = PlaceSearchProvider;

function toResolvePlacePayload(
  input: Exclude<ResolvablePlaceInput, Place>
): ResolvePlaceRequestDto {
  if (isResolvePlacePayload(input)) {
    return input;
  }

  if (isReverseGeocodeResult(input)) {
    const name =
      input.name ??
      input.formattedAddress ??
      `${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`;
    const payload: ResolvePlaceRequestDto = {
      provider: input.provider,
      source: input.provider,
      name,
      latitude: input.latitude,
      longitude: input.longitude
    };

    if (input.formattedAddress !== null) payload.formattedAddress = input.formattedAddress;
    if (input.countryCode !== null) payload.countryCode = input.countryCode;
    if (input.timezone !== undefined) payload.timezone = input.timezone;
    if (input.providerPlaceId !== undefined) payload.providerPlaceId = input.providerPlaceId;
    if (input.providerPayload !== undefined) payload.providerPayload = input.providerPayload;

    return payload;
  }

  const details = input as PlaceDetails | PlaceSearchResult;
  const provider = details.source ?? mapSearchProviderToBackendProvider(details.provider);
  const sourcePayload = "sourcePayload" in details ? details.sourcePayload : undefined;
  const metadata = "metadata" in details ? details.metadata : undefined;
  const payload: ResolvePlaceRequestDto = {
    provider,
    source: provider,
    name: details.name
  };

  if (details.providerPlaceId !== undefined) payload.providerPlaceId = details.providerPlaceId;
  if (details.formattedAddress !== null) {
    payload.formattedAddress = details.formattedAddress;
    payload.address = details.formattedAddress;
  }
  if (details.countryCode !== null) payload.countryCode = details.countryCode;
  if (details.latitude !== null) payload.latitude = details.latitude;
  if (details.longitude !== null) payload.longitude = details.longitude;
  if (details.websiteUrl !== null) payload.websiteUrl = details.websiteUrl;
  if (details.phoneNumber !== null) payload.phoneNumber = details.phoneNumber;
  if (details.timezone !== null) payload.timezone = details.timezone;
  if (details.categories.length > 0) payload.categories = details.categories;
  if (sourcePayload !== undefined) {
    payload.providerPayload = sourcePayload;
    payload.sourcePayload = sourcePayload;
  }
  if (metadata !== undefined) payload.metadata = metadata;

  return payload;
}

function isResolvePlacePayload(
  input: Exclude<ResolvablePlaceInput, Place>
): input is ResolvePlaceRequestDto {
  return (
    "provider" in input &&
    isBackendProvider(input.provider) &&
    ("address" in input || "source" in input || input.provider === "MANUAL")
  );
}

function isReverseGeocodeResult(
  input: Exclude<ResolvablePlaceInput, Place>
): input is ReverseGeocodeResult {
  return "provider" in input && isBackendProvider(input.provider) && !("source" in input);
}

function isBackendProvider(provider: unknown): provider is PlaceProviderDto {
  return (
    provider === "MANUAL" ||
    provider === "GOOGLE" ||
    provider === "MAPBOX" ||
    provider === "OSM" ||
    provider === "INTERNAL"
  );
}

type NominatimPlace = {
  osm_type?: string;
  osm_id?: number;
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  class?: string;
  address?: {
    country_code?: string;
  };
};

async function searchOpenStreetMapPlaces(
  params: PlaceSearchParams,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const query = params.q?.trim();

  if (!query) {
    return [];
  }

  const searchParams = new URLSearchParams({
    addressdetails: "1",
    format: "jsonv2",
    limit: String(params.limit ?? 8),
    q: query
  });

  if (params.countryCode) {
    searchParams.set("countrycodes", params.countryCode.toLowerCase());
  }
  if (params.language) {
    searchParams.set("accept-language", params.language);
  }

  const response = await fetch(
    `${mapConfig.nominatimSearchUrl}?${searchParams.toString()}`,
    signal ? { signal } : undefined
  );

  if (!response.ok) {
    throw new Error("OpenStreetMap place search failed");
  }

  const results = (await response.json()) as NominatimPlace[];

  return results.map((result) => {
    const providerPlaceId =
      result.osm_type && result.osm_id
        ? `${result.osm_type}:${result.osm_id}`
        : String(result.place_id ?? result.display_name ?? crypto.randomUUID());
    const categories = [result.class, result.type].filter(
      (value): value is string => typeof value === "string" && value.length > 0
    );

    return {
      id: `osm:${providerPlaceId}`,
      provider: "openStreetMap",
      source: "OSM",
      providerPlaceId,
      name: result.display_name ?? query,
      formattedAddress: result.display_name ?? null,
      countryCode: result.address?.country_code?.toUpperCase() ?? null,
      latitude: result.lat ? Number(result.lat) : null,
      longitude: result.lon ? Number(result.lon) : null,
      websiteUrl: null,
      phoneNumber: null,
      timezone: null,
      categories,
      sourcePayload: result
    };
  });
}

type MapboxFeature = {
  id: string;
  text?: string;
  place_name?: string;
  center?: [number, number];
  place_type?: string[];
  properties?: Record<string, unknown>;
  context?: Array<{ id?: string; short_code?: string; text?: string }>;
};

type MapboxSearchResponse = {
  features?: MapboxFeature[];
};

async function searchMapboxPlaces(
  params: PlaceSearchParams,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const query = params.q?.trim();

  if (!query || !mapConfig.mapboxAccessToken) {
    return [];
  }

  const searchParams = new URLSearchParams({
    access_token: mapConfig.mapboxAccessToken,
    limit: String(params.limit ?? 8)
  });

  if (params.language) {
    searchParams.set("language", params.language);
  }
  if (params.countryCode) {
    searchParams.set("country", params.countryCode.toUpperCase());
  }
  if (params.near) {
    searchParams.set("proximity", `${params.near.longitude},${params.near.latitude}`);
  }

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?${searchParams.toString()}`,
    signal ? { signal } : undefined
  );

  if (!response.ok) {
    throw new Error("Mapbox place search failed");
  }

  const payload = (await response.json()) as MapboxSearchResponse;

  return (payload.features ?? []).map((feature) => {
    const longitude = feature.center?.[0] ?? null;
    const latitude = feature.center?.[1] ?? null;

    return {
      id: `mapbox:${feature.id}`,
      provider: "mapbox",
      source: "MAPBOX",
      providerPlaceId: feature.id,
      name: feature.text ?? feature.place_name ?? query,
      formattedAddress: feature.place_name ?? feature.text ?? null,
      countryCode: getMapboxCountryCode(feature),
      latitude,
      longitude,
      websiteUrl: null,
      phoneNumber: null,
      timezone: null,
      categories: feature.place_type ?? [],
      sourcePayload: feature as unknown as Record<string, unknown>
    };
  });
}

function getMapboxCountryCode(feature: MapboxFeature) {
  return (
    feature.context?.find((entry) => entry.id?.startsWith("country."))?.short_code?.toUpperCase() ??
    null
  );
}
