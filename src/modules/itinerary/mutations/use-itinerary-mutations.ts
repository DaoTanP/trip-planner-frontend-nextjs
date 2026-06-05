"use client";

import { type InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";

import { placeKeys } from "@/modules/places/queries/place.queries";
import { runQueuedMutation } from "@/modules/sync/runtime/sync-runtime";
import { tripKeys } from "@/modules/trips/queries/trip.queries";
import type { TripDetail } from "@/modules/trips/types/trip.types";

import { itineraryKeys } from "../queries/itinerary.queries";
import {
  createItineraryItem,
  deleteItineraryItem,
  reorderItineraryItems,
  updateItineraryItem
} from "../services/itinerary.service";
import type {
  CreateItineraryItemPayload,
  DeleteItineraryItemQuery,
  ItineraryItem,
  ItineraryItemsPage,
  ReorderItineraryItemsPayload,
  UpdateItineraryItemPayload
} from "../types/itinerary.types";

type ItineraryItemsInfiniteData = InfiniteData<ItineraryItemsPage, string | undefined>;

const defaultPagination = {
  limit: 50,
  cursorVersion: 1,
  nextCursor: null,
  hasNextPage: false
} satisfies ItineraryItemsPage["pagination"];

const sortItems = (items: ItineraryItem[]) =>
  [...items].sort((left, right) =>
    left.sortOrder === right.sortOrder
      ? left.id.localeCompare(right.id)
      : left.sortOrder - right.sortOrder
  );

const createSinglePage = (item: ItineraryItem): ItineraryItemsInfiniteData => ({
  pages: [{ items: [item], pagination: defaultPagination }],
  pageParams: [undefined]
});

const patchItemsData = (
  data: ItineraryItemsInfiniteData | undefined,
  patch: (items: ItineraryItem[]) => ItineraryItem[]
): ItineraryItemsInfiniteData | undefined => {
  if (!data) {
    return data;
  }

  const pageSizes = data.pages.map((page) => page.items.length);
  const patchedItems = patch(data.pages.flatMap((page) => page.items));
  let offset = 0;

  const pages = data.pages.map((page, index) => {
    const size = pageSizes[index] ?? page.items.length;
    const items = patchedItems.slice(offset, offset + size);
    offset += size;

    return {
      ...page,
      items
    };
  });

  const remainingItems = patchedItems.slice(offset);
  if (remainingItems.length > 0) {
    const lastIndex = pages.length - 1;
    const lastPage = pages[lastIndex];

    if (lastPage) {
      pages[lastIndex] = {
        ...lastPage,
        items: [...lastPage.items, ...remainingItems]
      };
    } else {
      pages.push({ items: remainingItems, pagination: defaultPagination });
    }
  }

  return {
    ...data,
    pages
  };
};

const patchTripDetail = (
  current: TripDetail | undefined,
  patch: (trip: TripDetail) => TripDetail
) => (current ? patch(current) : current);

const getTripRevision = (queryClient: ReturnType<typeof useQueryClient>, tripId: string) =>
  queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId))?.revision;

const getUsableTripRevision = (queryClient: ReturnType<typeof useQueryClient>, tripId: string) => {
  const queryState = queryClient.getQueryState<TripDetail>(tripKeys.detail(tripId));

  if (queryState?.isInvalidated || queryState?.fetchStatus === "fetching") {
    return undefined;
  }

  return getTripRevision(queryClient, tripId);
};

const withItineraryMutationMeta = <
  TPayload extends { clientMutationId?: string; expectedRevision?: string }
>(
  payload: TPayload,
  queryClient: ReturnType<typeof useQueryClient>,
  tripId: string
): TPayload & { clientMutationId: string } => {
  const nextPayload: TPayload & { clientMutationId: string } = {
    ...payload,
    clientMutationId: payload.clientMutationId ?? crypto.randomUUID()
  };
  const expectedRevision = payload.expectedRevision ?? getUsableTripRevision(queryClient, tripId);

  if (expectedRevision !== undefined) {
    nextPayload.expectedRevision = expectedRevision;
  }

  return nextPayload;
};

const normalizeDeleteInput = (
  input: string | { itemId: string; params?: DeleteItineraryItemQuery }
) => (typeof input === "string" ? { itemId: input } : input);

export function useCreateItineraryItemMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateItineraryItemPayload) => {
      const nextPayload = withItineraryMutationMeta(payload, queryClient, tripId);

      return runQueuedMutation({
        tripId,
        clientMutationId: nextPayload.clientMutationId,
        entityType: "ITINERARY_ITEM",
        operation: "ENTITY_CREATED",
        payload: nextPayload as Record<string, unknown>,
        mutationFn: () => createItineraryItem(tripId, nextPayload)
      });
    },
    onSuccess: (result) => {
      const item = result.item;

      queryClient.setQueryData<ItineraryItemsInfiniteData>(
        itineraryKeys.items(tripId),
        (current) =>
          current
            ? patchItemsData(current, (items) => sortItems([...items, item]))
            : createSinglePage(item)
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        patchTripDetail(current, (trip) => ({
          ...trip,
          revision: result.revision,
          itineraryItemCount: trip.itineraryItemCount + 1
        }))
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
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpdateItineraryItemPayload }) => {
      const nextPayload = withItineraryMutationMeta(payload, queryClient, tripId);

      return runQueuedMutation({
        tripId,
        clientMutationId: nextPayload.clientMutationId,
        entityType: "ITINERARY_ITEM",
        entityId: itemId,
        operation: "ENTITY_UPDATED",
        payload: nextPayload as Record<string, unknown>,
        mutationFn: () => updateItineraryItem(itemId, nextPayload)
      });
    },
    onMutate: async ({ itemId, payload }) => {
      await queryClient.cancelQueries({ queryKey: itineraryKeys.items(tripId) });
      const previousData = queryClient.getQueryData<ItineraryItemsInfiniteData>(
        itineraryKeys.items(tripId)
      );

      queryClient.setQueryData<ItineraryItemsInfiniteData>(itineraryKeys.items(tripId), (current) =>
        patchItemsData(current, (items) =>
          sortItems(
            items.map((item) =>
              item.id === itemId ? ({ ...item, ...payload } as ItineraryItem) : item
            )
          )
        )
      );

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousData);
      }
    },
    onSuccess: (result) => {
      const updatedItem = result.item;

      queryClient.setQueryData<ItineraryItemsInfiniteData>(itineraryKeys.items(tripId), (current) =>
        patchItemsData(current, (items) =>
          sortItems(items.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
        )
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        patchTripDetail(current, (trip) => ({ ...trip, revision: result.revision }))
      );
      void queryClient.invalidateQueries({ queryKey: placeKeys.byTrip(tripId) });
    }
  });
}

export function useDeleteItineraryItemMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: string | { itemId: string; params?: DeleteItineraryItemQuery }) => {
      const { itemId, params } = normalizeDeleteInput(input);
      const nextParams = withItineraryMutationMeta(params ?? {}, queryClient, tripId);

      return runQueuedMutation({
        tripId,
        clientMutationId: nextParams.clientMutationId,
        entityType: "ITINERARY_ITEM",
        entityId: itemId,
        operation: "ENTITY_DELETED",
        payload: nextParams as Record<string, unknown>,
        mutationFn: () => deleteItineraryItem(itemId, nextParams)
      });
    },
    onMutate: async (input) => {
      const { itemId } = normalizeDeleteInput(input);
      await queryClient.cancelQueries({ queryKey: itineraryKeys.items(tripId) });
      const previousData = queryClient.getQueryData<ItineraryItemsInfiniteData>(
        itineraryKeys.items(tripId)
      );
      const previousTrip = queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId));

      queryClient.setQueryData<ItineraryItemsInfiniteData>(itineraryKeys.items(tripId), (current) =>
        patchItemsData(current, (items) => items.filter((item) => item.id !== itemId))
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        patchTripDetail(current, (trip) => ({
          ...trip,
          itineraryItemCount: Math.max(0, trip.itineraryItemCount - 1)
        }))
      );

      return { previousData, previousTrip };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousData);
      }
      if (context?.previousTrip) {
        queryClient.setQueryData(tripKeys.detail(tripId), context.previousTrip);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
      void queryClient.invalidateQueries({ queryKey: itineraryKeys.items(tripId) });
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
    }) => {
      const nextPayload = withItineraryMutationMeta(payload, queryClient, tripId);

      return runQueuedMutation({
        tripId,
        clientMutationId: nextPayload.clientMutationId,
        entityType: "ITINERARY_ITEM",
        entityId: nextPayload.itemId,
        operation: "ENTITY_MOVED",
        payload: nextPayload as Record<string, unknown>,
        mutationFn: () => reorderItineraryItems(tripId, nextPayload)
      });
    },
    onMutate: async ({ optimisticItems }) => {
      await queryClient.cancelQueries({ queryKey: itineraryKeys.items(tripId) });
      const previousData = queryClient.getQueryData<ItineraryItemsInfiniteData>(
        itineraryKeys.items(tripId)
      );

      queryClient.setQueryData<ItineraryItemsInfiniteData>(itineraryKeys.items(tripId), (current) =>
        patchItemsData(current, () => sortItems(optimisticItems))
      );

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousData);
      }
      void queryClient.invalidateQueries({ queryKey: itineraryKeys.items(tripId) });
      void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
    },
    onSuccess: ({ affectedItems, item, revision }) => {
      const serverItems = affectedItems && affectedItems.length > 0 ? affectedItems : [item];
      const serverItemMap = new Map(serverItems.map((serverItem) => [serverItem.id, serverItem]));

      queryClient.setQueryData<ItineraryItemsInfiniteData>(itineraryKeys.items(tripId), (current) =>
        patchItemsData(current, (items) =>
          sortItems(items.map((cachedItem) => serverItemMap.get(cachedItem.id) ?? cachedItem))
        )
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        patchTripDetail(current, (trip) => ({ ...trip, revision }))
      );
    }
  });
}
