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
  ItineraryItemsPage,
  ReorderItineraryItemsPayload,
  UpdateItineraryItemPayload
} from "../types/itinerary.types";

const sortItems = (items: ItineraryItem[]) =>
  [...items].sort((left, right) => left.sortOrder - right.sortOrder);

const patchItemsPage = (
  page: ItineraryItemsPage | undefined,
  patch: (items: ItineraryItem[]) => ItineraryItem[]
): ItineraryItemsPage | undefined =>
  page
    ? {
        ...page,
        items: patch(page.items)
      }
    : page;

export function useCreateItineraryItemMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateItineraryItemPayload) => createItineraryItem(tripId, payload),
    onSuccess: (item) => {
      queryClient.setQueryData<ItineraryItemsPage>(itineraryKeys.items(tripId), (current) =>
        patchItemsPage(current, (items) => sortItems([...items, item]))
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
      const previousPage = queryClient.getQueryData<ItineraryItemsPage>(
        itineraryKeys.items(tripId)
      );

      queryClient.setQueryData<ItineraryItemsPage>(itineraryKeys.items(tripId), (current) =>
        patchItemsPage(current, (items) =>
          sortItems(
            items.map((item) =>
              item.id === itemId ? ({ ...item, ...payload } as ItineraryItem) : item
            )
          )
        )
      );

      return { previousPage };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPage) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousPage);
      }
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData<ItineraryItemsPage>(itineraryKeys.items(tripId), (current) =>
        patchItemsPage(current, (items) =>
          sortItems(items.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
        )
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
      const previousPage = queryClient.getQueryData<ItineraryItemsPage>(
        itineraryKeys.items(tripId)
      );

      queryClient.setQueryData<ItineraryItemsPage>(itineraryKeys.items(tripId), (current) =>
        patchItemsPage(current, (items) => items.filter((item) => item.id !== itemId))
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current
          ? { ...current, itineraryItemCount: Math.max(0, current.itineraryItemCount - 1) }
          : current
      );

      return { previousPage };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPage) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousPage);
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
      const previousPage = queryClient.getQueryData<ItineraryItemsPage>(
        itineraryKeys.items(tripId)
      );

      queryClient.setQueryData<ItineraryItemsPage>(itineraryKeys.items(tripId), (current) =>
        patchItemsPage(current, () => sortItems(optimisticItems))
      );

      return { previousPage };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousPage) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousPage);
      }
    },
    onSuccess: ({ affectedItems, item }) => {
      const serverItems = affectedItems && affectedItems.length > 0 ? affectedItems : [item];
      const serverItemMap = new Map(serverItems.map((serverItem) => [serverItem.id, serverItem]));
      queryClient.setQueryData<ItineraryItemsPage>(itineraryKeys.items(tripId), (current) =>
        patchItemsPage(current, (items) =>
          sortItems(items.map((cachedItem) => serverItemMap.get(cachedItem.id) ?? cachedItem))
        )
      );
    }
  });
}
