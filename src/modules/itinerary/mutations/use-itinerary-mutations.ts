"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripKeys } from "@/modules/trips/queries/trip.queries";
import type { TripDetail } from "@/modules/trips/types/trip.types";

import {
  createItineraryItem,
  deleteItineraryItem,
  reorderItineraryItems,
  updateItineraryItem
} from "../services/itinerary.service";
import type {
  CreateItineraryItemPayload,
  ItineraryItem,
  ReorderItineraryItemsPayload,
  TripDay,
  UpdateItineraryItemPayload
} from "../types/itinerary.types";

export function useCreateItineraryItemMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dayId, payload }: { dayId: string; payload: CreateItineraryItemPayload }) =>
      createItineraryItem(dayId, payload),
    onSuccess: (item) => {
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current
          ? {
              ...current,
              days: current.days.map((day) =>
                day.id === item.dayId
                  ? { ...day, items: [...day.items, item].sort((a, b) => a.order - b.order) }
                  : day
              )
            }
          : current
      );
    }
  });
}

export function useUpdateItineraryItemMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpdateItineraryItemPayload }) =>
      updateItineraryItem(itemId, payload),
    onMutate: async ({ itemId, payload }) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.detail(tripId) });
      const previousTrip = queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId));

      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current
          ? {
              ...current,
              days: current.days.map((day) => ({
                ...day,
                items: day.items.map((item) =>
                  item.id === itemId ? ({ ...item, ...payload } as ItineraryItem) : item
                )
              }))
            }
          : current
      );

      return { previousTrip };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTrip) {
        queryClient.setQueryData(tripKeys.detail(tripId), context.previousTrip);
      }
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current
          ? {
              ...current,
              days: current.days.map((day) => ({
                ...day,
                items: day.items.map((item) => (item.id === updatedItem.id ? updatedItem : item))
              }))
            }
          : current
      );
    }
  });
}

export function useDeleteItineraryItemMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteItineraryItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.detail(tripId) });
      const previousTrip = queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId));

      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current
          ? {
              ...current,
              days: current.days.map((day) => ({
                ...day,
                items: day.items.filter((item) => item.id !== itemId)
              }))
            }
          : current
      );

      return { previousTrip };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTrip) {
        queryClient.setQueryData(tripKeys.detail(tripId), context.previousTrip);
      }
    }
  });
}

export function useReorderItineraryItemsMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload
    }: {
      payload: ReorderItineraryItemsPayload;
      optimisticDays: TripDay[];
    }) => reorderItineraryItems(tripId, payload),
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
