"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateTripRequestDto } from "@/services/api/contracts";

import { createTripNote, reorderTripDays, updateTrip } from "../services/trips.service";
import type { CreateTripNotePayload, TripDay, TripDetail } from "../types/trip.types";
import { tripKeys } from "../queries/trip.queries";

export function useUpdateTripMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTripRequestDto) => updateTrip(tripId, payload),
    onSuccess: (trip) => {
      queryClient.setQueryData(tripKeys.detail(tripId), trip);
      void queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    }
  });
}

export function useReorderTripDaysMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload
    }: {
      payload: Parameters<typeof reorderTripDays>[1];
      optimisticDays: TripDay[];
    }) => reorderTripDays(tripId, payload),
    onMutate: async ({ optimisticDays }) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.detail(tripId) });
      const previousTrip = queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId));

      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current ? { ...current, days: optimisticDays } : current
      );

      return { previousTrip };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTrip) {
        queryClient.setQueryData(tripKeys.detail(tripId), context.previousTrip);
      }
    },
    onSuccess: ({ days }) => {
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current ? { ...current, days } : current
      );
    }
  });
}

export function useCreateTripNoteMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTripNotePayload) => createTripNote(tripId, payload),
    onSuccess: (note) => {
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current ? { ...current, notes: [note, ...current.notes] } : current
      );
    }
  });
}
