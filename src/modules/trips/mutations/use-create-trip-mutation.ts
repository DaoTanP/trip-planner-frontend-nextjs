"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { tripKeys } from "../queries/trip.queries";
import { createTrip } from "../services/trips.service";
import type { CreateTripPayload, Trip } from "../types/trip.types";

export function useCreateTripMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations("trip");

  return useMutation({
    mutationFn: (payload: CreateTripPayload) => createTrip(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.lists() });

      const previousTrips = queryClient.getQueryData<Trip[]>(tripKeys.lists());
      const optimisticTrip: Trip = {
        id: `optimistic-${Date.now()}`,
        name: payload.name,
        destination: payload.destination,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: "draft",
        collaboratorCount: 0,
        stopCount: 0,
        updatedAt: new Date().toISOString()
      };

      queryClient.setQueryData<Trip[]>(tripKeys.lists(), (current = []) => [
        optimisticTrip,
        ...current
      ]);

      return { previousTrips };
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(tripKeys.lists(), context?.previousTrips);
    },
    onSuccess: () => {
      toast.success(t("toast.created"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    }
  });
}
