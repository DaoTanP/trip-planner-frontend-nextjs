"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { tripKeys } from "../queries/trip.queries";
import { createTrip } from "../services/trips.service";
import type { CreateTripPayload, Trip } from "../types/trip.types";

type TripsListCache = {
  items: Trip[];
};

export function useCreateTripMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations("trip");

  return useMutation({
    mutationFn: (payload: CreateTripPayload) => createTrip(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.lists() });

      const previousTrips = queryClient.getQueryData<TripsListCache>(tripKeys.list());
      const optimisticTrip: Trip = {
        id: `optimistic-${Date.now()}`,
        title: payload.title,
        description: payload.description ?? null,
        startDate: payload.startDate ?? null,
        endDate: payload.endDate ?? null,
        timezone: payload.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        visibility: payload.visibility ?? "PRIVATE",
        status: "DRAFT",
        coverImageUrl: null,
        destinationNames: [],
        collaboratorCount: 0,
        itineraryDayCount: 0,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      queryClient.setQueryData<TripsListCache>(tripKeys.list(), (current) => ({
        ...current,
        items: [optimisticTrip, ...(current?.items ?? [])]
      }));

      return { previousTrips };
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(tripKeys.list(), context?.previousTrips);
    },
    onSuccess: () => {
      toast.success(t("toast.created"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tripKeys.lists() });
    }
  });
}
