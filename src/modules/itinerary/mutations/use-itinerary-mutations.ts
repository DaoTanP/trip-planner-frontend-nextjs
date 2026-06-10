"use client";

import { type InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";

import { placeKeys } from "@/modules/places/queries/place.queries";
import { syncMutationQueue } from "@/modules/sync/queue/mutation-queue";
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
const optimisticOrderStride = 65_536;

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

const patchRouteItemsData = (
  data: ItineraryItem[] | undefined,
  patch: (items: ItineraryItem[]) => ItineraryItem[]
) => (data ? sortItems(patch(data)) : data);

const patchTripDetail = (
  current: TripDetail | undefined,
  patch: (trip: TripDetail) => TripDetail
) => (current ? patch(current) : current);

const getTripRevision = (queryClient: ReturnType<typeof useQueryClient>, tripId: string) =>
  queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId))?.revision;

const getUsableTripRevision = (queryClient: ReturnType<typeof useQueryClient>, tripId: string) => {
  const queryState = queryClient.getQueryState<TripDetail>(tripKeys.detail(tripId));
  const hasPendingTripMutation = syncMutationQueue
    .getSnapshot()
    .some((entry) => entry.tripId === tripId && entry.state !== "acknowledged");

  if (
    hasPendingTripMutation ||
    queryState?.isInvalidated ||
    queryState?.fetchStatus === "fetching"
  ) {
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

const toOptimisticItemPatch = (payload: UpdateItineraryItemPayload): Partial<ItineraryItem> => ({
  ...(payload.placeId !== undefined ? { placeId: payload.placeId } : {}),
  ...(payload.types !== undefined ? { types: payload.types } : {}),
  ...(payload.summary !== undefined ? { summary: payload.summary } : {}),
  ...(payload.startsAt !== undefined ? { startsAt: payload.startsAt } : {}),
  ...(payload.durationMinutes !== undefined ? { durationMinutes: payload.durationMinutes } : {}),
  ...(payload.status !== undefined ? { status: payload.status } : {}),
  ...(payload.timezone !== undefined ? { timezone: payload.timezone } : {}),
  ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {})
});

function reorderRouteItemsByIntent(items: ItineraryItem[], payload: ReorderItineraryItemsPayload) {
  const movingItem = items.find((item) => item.id === payload.itemId);

  if (!movingItem) {
    return items;
  }

  const nextItems = items.filter((item) => item.id !== payload.itemId);
  let insertIndex = nextItems.length;

  if (payload.afterItemId) {
    const afterIndex = nextItems.findIndex((item) => item.id === payload.afterItemId);
    if (afterIndex >= 0) {
      insertIndex = afterIndex + 1;
    }
  } else if (payload.beforeItemId) {
    const beforeIndex = nextItems.findIndex((item) => item.id === payload.beforeItemId);
    if (beforeIndex >= 0) {
      insertIndex = beforeIndex;
    }
  }

  nextItems.splice(insertIndex, 0, movingItem);

  const previousItem = nextItems[insertIndex - 1];
  const nextItem = nextItems[insertIndex + 1];
  const lowerSortOrder = previousItem?.sortOrder ?? 0;
  const upperSortOrder = nextItem?.sortOrder ?? lowerSortOrder + defaultPagination.limit * 2;
  const optimisticSortOrder =
    upperSortOrder - lowerSortOrder > 1
      ? lowerSortOrder + Math.floor((upperSortOrder - lowerSortOrder) / 2)
      : (insertIndex + 1) * optimisticOrderStride;

  return nextItems.map((item) =>
    item.id === movingItem.id ? { ...item, sortOrder: optimisticSortOrder } : item
  );
}

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
      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.routeItems(tripId), (current) =>
        patchRouteItemsData(current, (items) => [...items, item])
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
      void queryClient.invalidateQueries({ queryKey: itineraryKeys.routeItems(tripId) });
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
      await queryClient.cancelQueries({ queryKey: itineraryKeys.routeItems(tripId) });
      const previousData = queryClient.getQueryData<ItineraryItemsInfiniteData>(
        itineraryKeys.items(tripId)
      );
      const previousRouteItems = queryClient.getQueryData<ItineraryItem[]>(
        itineraryKeys.routeItems(tripId)
      );

      queryClient.setQueryData<ItineraryItemsInfiniteData>(itineraryKeys.items(tripId), (current) =>
        patchItemsData(current, (items) =>
          sortItems(
            items.map((item) =>
              item.id === itemId ? { ...item, ...toOptimisticItemPatch(payload) } : item
            )
          )
        )
      );
      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.routeItems(tripId), (current) =>
        patchRouteItemsData(current, (items) =>
          items.map((item) =>
            item.id === itemId ? { ...item, ...toOptimisticItemPatch(payload) } : item
          )
        )
      );

      return { previousData, previousRouteItems };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousData);
      }
      if (context?.previousRouteItems) {
        queryClient.setQueryData(itineraryKeys.routeItems(tripId), context.previousRouteItems);
      }
    },
    onSuccess: (result) => {
      const updatedItem = result.item;

      queryClient.setQueryData<ItineraryItemsInfiniteData>(itineraryKeys.items(tripId), (current) =>
        patchItemsData(current, (items) =>
          sortItems(items.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
        )
      );
      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.routeItems(tripId), (current) =>
        patchRouteItemsData(current, (items) =>
          items.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        )
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        patchTripDetail(current, (trip) => ({ ...trip, revision: result.revision }))
      );
      void queryClient.invalidateQueries({ queryKey: placeKeys.byTrip(tripId) });
      void queryClient.invalidateQueries({ queryKey: itineraryKeys.routeItems(tripId) });
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
      await queryClient.cancelQueries({ queryKey: itineraryKeys.routeItems(tripId) });
      const previousData = queryClient.getQueryData<ItineraryItemsInfiniteData>(
        itineraryKeys.items(tripId)
      );
      const previousRouteItems = queryClient.getQueryData<ItineraryItem[]>(
        itineraryKeys.routeItems(tripId)
      );
      const previousTrip = queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId));

      queryClient.setQueryData<ItineraryItemsInfiniteData>(itineraryKeys.items(tripId), (current) =>
        patchItemsData(current, (items) => items.filter((item) => item.id !== itemId))
      );
      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.routeItems(tripId), (current) =>
        patchRouteItemsData(current, (items) => items.filter((item) => item.id !== itemId))
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        patchTripDetail(current, (trip) => ({
          ...trip,
          itineraryItemCount: Math.max(0, trip.itineraryItemCount - 1)
        }))
      );

      return { previousData, previousRouteItems, previousTrip };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousData);
      }
      if (context?.previousRouteItems) {
        queryClient.setQueryData(itineraryKeys.routeItems(tripId), context.previousRouteItems);
      }
      if (context?.previousTrip) {
        queryClient.setQueryData(tripKeys.detail(tripId), context.previousTrip);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
      void queryClient.invalidateQueries({ queryKey: itineraryKeys.items(tripId) });
      void queryClient.invalidateQueries({ queryKey: itineraryKeys.routeItems(tripId) });
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
    onMutate: async ({ optimisticItems, payload }) => {
      await queryClient.cancelQueries({ queryKey: itineraryKeys.items(tripId) });
      await queryClient.cancelQueries({ queryKey: itineraryKeys.routeItems(tripId) });
      const previousData = queryClient.getQueryData<ItineraryItemsInfiniteData>(
        itineraryKeys.items(tripId)
      );
      const previousRouteItems = queryClient.getQueryData<ItineraryItem[]>(
        itineraryKeys.routeItems(tripId)
      );

      queryClient.setQueryData<ItineraryItemsInfiniteData>(itineraryKeys.items(tripId), (current) =>
        patchItemsData(current, () => sortItems(optimisticItems))
      );
      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.routeItems(tripId), (current) =>
        patchRouteItemsData(current, (items) => reorderRouteItemsByIntent(items, payload))
      );

      return { previousData, previousRouteItems };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(itineraryKeys.items(tripId), context.previousData);
      }
      if (context?.previousRouteItems) {
        queryClient.setQueryData(itineraryKeys.routeItems(tripId), context.previousRouteItems);
      }
      void queryClient.invalidateQueries({ queryKey: itineraryKeys.items(tripId) });
      void queryClient.invalidateQueries({ queryKey: itineraryKeys.routeItems(tripId) });
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
      queryClient.setQueryData<ItineraryItem[]>(itineraryKeys.routeItems(tripId), (current) =>
        patchRouteItemsData(current, (items) =>
          items.map((cachedItem) => serverItemMap.get(cachedItem.id) ?? cachedItem)
        )
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        patchTripDetail(current, (trip) => ({ ...trip, revision }))
      );
      void queryClient.invalidateQueries({ queryKey: itineraryKeys.routeItems(tripId) });
    }
  });
}
