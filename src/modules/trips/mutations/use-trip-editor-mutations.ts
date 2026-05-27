"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateTripRequestDto } from "@/services/api/contracts";

import { createNote, updateTrip } from "../services/trips.service";
import type {
  CreateNotePayload,
  CursorPage,
  TripDetail,
  TripEditorNote
} from "../types/trip.types";
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

export function useCreateNoteMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateNotePayload) => createNote(tripId, payload),
    onSuccess: (note) => {
      queryClient.setQueryData<CursorPage<TripEditorNote>>(tripKeys.notes(tripId), (current) =>
        current
          ? {
              ...current,
              items: [note, ...current.items]
            }
          : {
              items: [note],
              pagination: { limit: 50, nextCursor: null, hasNextPage: false }
            }
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current ? { ...current, noteCount: current.noteCount + 1 } : current
      );
    }
  });
}
