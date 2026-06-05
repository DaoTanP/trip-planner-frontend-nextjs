"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { PlaceDto } from "@/services/api/contracts";

import { placeKeys } from "../queries/place.queries";
import { resolvePlace } from "../services/places.service";
import type { ResolvablePlaceInput } from "../types/place.types";

export function upsertTripPlaceInCache(queryClient: QueryClient, tripId: string, place: PlaceDto) {
  queryClient.setQueryData<PlaceDto[]>(placeKeys.byTrip(tripId), (current) => {
    if (!current) {
      return [place];
    }

    const existingIndex = current.findIndex((candidate) => candidate.id === place.id);
    if (existingIndex < 0) {
      return [...current, place];
    }

    return current.map((candidate) => (candidate.id === place.id ? place : candidate));
  });
}

export function useResolvePlaceMutation(tripId?: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolvablePlaceInput) => resolvePlace(input),
    onSuccess: (place) => {
      if (tripId) {
        upsertTripPlaceInCache(queryClient, tripId, place);
      }
    }
  });
}
