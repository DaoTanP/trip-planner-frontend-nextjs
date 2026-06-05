import { queryOptions } from "@tanstack/react-query";

import {
  getPlaceDetails,
  getTripPlaces,
  reverseGeocodePlaces,
  searchBackendPlaces,
  searchPlaces
} from "../services/places.service";
import type {
  PlaceDetailsParams,
  PlaceSearchParams,
  ReverseGeocodeParams
} from "../types/place.types";

export const placeKeys = {
  all: ["places"] as const,
  byTrip: (tripId: string) => [...placeKeys.all, "trip", tripId] as const,
  search: (params: PlaceSearchParams) => [...placeKeys.all, "search", params] as const,
  providerSearch: (params: PlaceSearchParams) =>
    [...placeKeys.all, "provider-search", params] as const,
  backendSearch: (params: PlaceSearchParams) =>
    [...placeKeys.all, "backend-search", params] as const,
  detail: (params: PlaceDetailsParams) => [...placeKeys.all, "detail", params] as const,
  reverseGeocode: (params: ReverseGeocodeParams) =>
    [...placeKeys.all, "reverse-geocode", params] as const
};

export function tripPlacesQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: placeKeys.byTrip(tripId),
    queryFn: ({ signal }) => getTripPlaces(tripId, signal),
    staleTime: 30_000
  });
}

export function placeSearchQueryOptions(params: PlaceSearchParams) {
  return queryOptions({
    queryKey: placeKeys.search(params),
    queryFn: ({ signal }) => searchPlaces(params, signal),
    enabled: Boolean(params.q?.trim()),
    staleTime: 30_000
  });
}

export function providerPlaceSearchQueryOptions(params: PlaceSearchParams) {
  return queryOptions({
    queryKey: placeKeys.providerSearch(params),
    queryFn: ({ signal }) => searchPlaces(params, signal),
    enabled: Boolean(params.q?.trim()),
    staleTime: 15_000,
    gcTime: 60_000
  });
}

export function backendPlaceSearchQueryOptions(params: PlaceSearchParams) {
  return queryOptions({
    queryKey: placeKeys.backendSearch(params),
    queryFn: ({ signal }) => searchBackendPlaces(params, signal),
    enabled: Boolean(params.q?.trim()),
    staleTime: 30_000
  });
}

export function placeDetailQueryOptions(params: PlaceDetailsParams) {
  return queryOptions({
    queryKey: placeKeys.detail(params),
    queryFn: ({ signal }) => getPlaceDetails(params, signal),
    enabled: Boolean(params.placeId)
  });
}

export function reverseGeocodeQueryOptions(params: ReverseGeocodeParams) {
  return queryOptions({
    queryKey: placeKeys.reverseGeocode(params),
    queryFn: ({ signal }) => reverseGeocodePlaces(params, signal),
    staleTime: 15_000,
    gcTime: 60_000
  });
}
