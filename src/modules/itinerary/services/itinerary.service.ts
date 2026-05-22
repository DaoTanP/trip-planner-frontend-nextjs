import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type { ApiSuccessResponse } from "@/types/api";

import type {
  CreateItineraryItemPayload,
  ItineraryItem,
  ReorderItineraryItemsPayload,
  TripDay,
  UpdateItineraryItemPayload
} from "../types/itinerary.types";

export async function getTripDays(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<{ days: TripDay[] }>>(
    apiEndpoints.trips.days(tripId),
    signal
  );

  return response.data.days;
}

export async function createItineraryItem(dayId: string, payload: CreateItineraryItemPayload) {
  const response = await apiPost<
    ApiSuccessResponse<{ item: ItineraryItem }>,
    CreateItineraryItemPayload
  >(apiEndpoints.itinerary.dayItems(dayId), payload);

  return response.data.item;
}

export async function updateItineraryItem(itemId: string, payload: UpdateItineraryItemPayload) {
  const response = await apiPatch<
    ApiSuccessResponse<{ item: ItineraryItem }>,
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
    ApiSuccessResponse<{ days: TripDay[]; clientMutationId?: string }>,
    ReorderItineraryItemsPayload
  >(apiEndpoints.trips.reorderItems(tripId), payload);

  return response.data;
}
