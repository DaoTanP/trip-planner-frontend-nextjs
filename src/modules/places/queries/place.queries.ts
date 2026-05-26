import { queryOptions } from "@tanstack/react-query";

import {
  geocodePlaces,
  getPlaceDetails,
  getTripPlaces,
  reverseGeocodePlaces,
  searchPlaces
} from "../services/places.service";
import type {
  GeocodeParams,
  PlaceDetailsParams,
  PlaceSearchParams,
  ReverseGeocodeParams
} from "../types/place.types";

export const placeKeys = {
  all: ["places"] as const,
  byTrip: (tripId: string) => [...placeKeys.all, "trip", tripId] as const,
  search: (params: PlaceSearchParams) => [...placeKeys.all, "search", params] as const,
  detail: (params: PlaceDetailsParams) => [...placeKeys.all, "detail", params] as const,
  geocode: (params: GeocodeParams) => [...placeKeys.all, "geocode", params] as const,
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
    enabled: Boolean(params.q?.trim())
  });
}

export function placeDetailQueryOptions(params: PlaceDetailsParams) {
  return queryOptions({
    queryKey: placeKeys.detail(params),
    queryFn: ({ signal }) => getPlaceDetails(params, signal),
    enabled: Boolean(params.placeId)
  });
}

export function geocodeQueryOptions(params: GeocodeParams) {
  return queryOptions({
    queryKey: placeKeys.geocode(params),
    queryFn: ({ signal }) => geocodePlaces(params, signal),
    enabled: Boolean(params.address.trim())
  });
}

export function reverseGeocodeQueryOptions(params: ReverseGeocodeParams) {
  return queryOptions({
    queryKey: placeKeys.reverseGeocode(params),
    queryFn: ({ signal }) => reverseGeocodePlaces(params, signal)
  });
}
