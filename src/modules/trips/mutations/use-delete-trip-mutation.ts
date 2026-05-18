"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { tripKeys } from "../queries/trip.queries";
import { deleteTrip } from "../services/trips.service";
import type { Trip } from "../types/trip.types";

export function useDeleteTripMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations("trip");

  return useMutation({
    mutationFn: (tripId: string) => deleteTrip(tripId),
    onMutate: async (tripId) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.lists() });
      const previousTrips = queryClient.getQueryData<Trip[]>(tripKeys.lists());

      queryClient.setQueryData<Trip[]>(tripKeys.lists(), (current = []) =>
        current.filter((trip) => trip.id !== tripId)
      );

      return { previousTrips };
    },
    onError: (_error, _tripId, context) => {
      queryClient.setQueryData(tripKeys.lists(), context?.previousTrips);
    },
    onSuccess: () => {
      toast.success(t("toast.deleted"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    }
  });
}
