"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { placeKeys } from "@/modules/places/queries/place.queries";
import { tripKeys } from "@/modules/trips/queries/trip.queries";
import type { TripDetail } from "@/modules/trips/types/trip.types";

import {
  createItineraryItem,
  deleteItineraryItem,
  reorderItineraryItems,
  updateItineraryItem
} from "../services/itinerary.service";
import { itineraryKeys } from "../queries/itinerary.queries";
import type {
  CreateItineraryItemPayload,
  ItineraryItem,
  ReorderItineraryItemsPayload,
  UpdateItineraryItemPayload
} from "../types/itinerary.types";

const sortItems = (items: ItineraryItem[]) =>
  [...items].sort((left, right) => left.sortOrder - right.sortOrder);

export function useCreateItineraryItemMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateItineraryItemPayload) => createItineraryItem(tripId, payload),
    onSuccess: (item) => {
      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.items(tripId), (current) =>
        sortItems([...(current ?? []), item])
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current ? { ...current, itineraryItemCount: current.itineraryItemCount + 1 } : current
      );
      if (item.placeId) {
        void queryClient.invalidateQueries({ queryKey: placeKeys.byTrip(tripId) });
      }
    }
  });
}

export function useUpdateItineraryItemMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpdateItineraryItemPayload }) =>
      updateItineraryItem(itemId, payload),
    onMutate: async ({ itemId, payload }) => {
      await queryClient.cancelQueries({ queryKey: itineraryKeys.items(tripId) });
      const previousItems = queryClient.getQueryData<ItineraryItem[]>(itineraryKeys.items(tripId));

      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.items(tripId), (current) =>
        current
          ? sortItems(
              current.map((item) =>
                item.id === itemId ? ({ ...item, ...payload } as ItineraryItem) : item
              )
            )
          : current
      );

      return { previousItems };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousItems);
      }
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.items(tripId), (current) =>
        current
          ? sortItems(current.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
          : current
      );
      void queryClient.invalidateQueries({ queryKey: placeKeys.byTrip(tripId) });
    }
  });
}

export function useDeleteItineraryItemMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteItineraryItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: itineraryKeys.items(tripId) });
      const previousItems = queryClient.getQueryData<ItineraryItem[]>(itineraryKeys.items(tripId));

      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.items(tripId), (current) =>
        current ? current.filter((item) => item.id !== itemId) : current
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current
          ? { ...current, itineraryItemCount: Math.max(0, current.itineraryItemCount - 1) }
          : current
      );

      return { previousItems };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousItems);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: placeKeys.byTrip(tripId) });
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
      optimisticItems: ItineraryItem[];
    }) => reorderItineraryItems(tripId, payload),
    onMutate: async ({ optimisticItems }) => {
      await queryClient.cancelQueries({ queryKey: itineraryKeys.items(tripId) });
      const previousItems = queryClient.getQueryData<ItineraryItem[]>(itineraryKeys.items(tripId));

      queryClient.setQueryData<ItineraryItem[]>(
        itineraryKeys.items(tripId),
        sortItems(optimisticItems)
      );

      return { previousItems };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousItems);
      }
    },
    onSuccess: ({ items }) => {
      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.items(tripId), sortItems(items));
    }
  });
}
