"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { runQueuedMutation } from "@/modules/sync/runtime/sync-runtime";
import type { UpdateTripRequestDto } from "@/services/api/contracts";

import { tripKeys } from "../queries/trip.queries";
import { updateTrip } from "../services/trips.service";

export function useUpdateTripMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTripRequestDto) => {
      const currentTrip = queryClient.getQueryData(tripKeys.detail(tripId)) as
        | { revision?: string }
        | undefined;
      const nextPayload: UpdateTripRequestDto & { clientMutationId: string } = {
        ...payload,
        clientMutationId: payload.clientMutationId ?? crypto.randomUUID()
      };
      const expectedRevision = payload.expectedRevision ?? currentTrip?.revision;

      if (expectedRevision !== undefined) {
        nextPayload.expectedRevision = expectedRevision;
      }

      return runQueuedMutation({
        tripId,
        clientMutationId: nextPayload.clientMutationId,
        entityType: "TRIP",
        entityId: tripId,
        operation: "ENTITY_UPDATED",
        payload: nextPayload as Record<string, unknown>,
        mutationFn: () => updateTrip(tripId, nextPayload)
      });
    },
    onSuccess: (trip) => {
      queryClient.setQueryData(tripKeys.detail(tripId), trip);
      void queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    }
  });
}
