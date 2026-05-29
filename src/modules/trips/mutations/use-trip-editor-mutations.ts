"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateTripRequestDto } from "@/services/api/contracts";

import { tripKeys } from "../queries/trip.queries";
import { updateTrip } from "../services/trips.service";

export function useUpdateTripMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTripRequestDto) =>
      updateTrip(tripId, {
        ...payload,
        clientMutationId: payload.clientMutationId ?? crypto.randomUUID()
      }),
    onSuccess: (trip) => {
      queryClient.setQueryData(tripKeys.detail(tripId), trip);
      void queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    }
  });
}
