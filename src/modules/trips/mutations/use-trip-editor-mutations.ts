"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateTripRequestDto } from "@/services/api/contracts";

import { createTripNote, updateTrip } from "../services/trips.service";
import type { CreateTripNotePayload, TripDetail, TripNote } from "../types/trip.types";
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

export function useCreateTripNoteMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTripNotePayload) => createTripNote(tripId, payload),
    onSuccess: (note) => {
      queryClient.setQueryData<TripNote[]>(tripKeys.notes(tripId), (current) =>
        current ? [note, ...current] : [note]
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current ? { ...current, noteCount: current.noteCount + 1 } : current
      );
    }
  });
}
