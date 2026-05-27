import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type { ApiSuccessResponse } from "@/types/api";

import type {
  CreateItineraryItemPayload,
  ItineraryItem,
  ItineraryItemsPage,
  ReorderItineraryItemsPayload,
  ReorderItineraryItemsResult,
  UpdateItineraryItemPayload
} from "../types/itinerary.types";

export async function getItineraryItems(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<
    ApiSuccessResponse<{ items: ItineraryItem[] }, { pagination: ItineraryItemsPage["pagination"] }>
  >(apiEndpoints.trips.itinerary(tripId), signal);

  return {
    items: response.data.items,
    pagination: response.meta.pagination
  } satisfies ItineraryItemsPage;
}

export async function createItineraryItem(tripId: string, payload: CreateItineraryItemPayload) {
  const response = await apiPost<
    ApiSuccessResponse<{ item: ItineraryItem; clientMutationId?: string }>,
    CreateItineraryItemPayload
  >(apiEndpoints.trips.itinerary(tripId), payload);

  return response.data.item;
}

export async function updateItineraryItem(itemId: string, payload: UpdateItineraryItemPayload) {
  const response = await apiPatch<
    ApiSuccessResponse<{ item: ItineraryItem; clientMutationId?: string }>,
    UpdateItineraryItemPayload
  >(apiEndpoints.itinerary.item(itemId), payload);

  return response.data.item;
}

export async function deleteItineraryItem(itemId: string) {
  await apiDelete<void>(apiEndpoints.itinerary.item(itemId));

  return itemId;
}

export async function reorderItineraryItems(tripId: string, payload: ReorderItineraryItemsPayload) {
  const response = await apiPatch<
    ApiSuccessResponse<ReorderItineraryItemsResult>,
    ReorderItineraryItemsPayload
  >(apiEndpoints.trips.reorderItinerary(tripId), payload);

  return response.data;
}
