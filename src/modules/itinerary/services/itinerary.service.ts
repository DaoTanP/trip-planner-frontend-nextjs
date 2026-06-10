import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type { ApiSuccessResponse } from "@/types/api";

import type {
  CreateItineraryItemPayload,
  DeleteItineraryItemQuery,
  ItineraryItemMutationResult,
  ItineraryItem,
  ItineraryItemsPage,
  ReorderItineraryItemsPayload,
  ReorderItineraryItemsResult,
  UpdateItineraryItemPayload
} from "../types/itinerary.types";

type CursorParams = {
  cursor?: string | undefined;
  limit?: number | undefined;
};

const routeDataPageLimit = 200;
const maxRouteDataPages = 100;

function withCursorParams(url: string, params?: CursorParams) {
  const searchParams = new URLSearchParams();

  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function withDeleteParams(url: string, params?: DeleteItineraryItemQuery) {
  const searchParams = new URLSearchParams();

  if (params?.expectedRevision) searchParams.set("expectedRevision", params.expectedRevision);
  if (params?.clientMutationId) searchParams.set("clientMutationId", params.clientMutationId);
  if (params?.deviceId) searchParams.set("deviceId", params.deviceId);

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

export async function getItineraryItems(
  tripId: string,
  params?: CursorParams,
  signal?: AbortSignal
) {
  const response = await apiGet<
    ApiSuccessResponse<{ items: ItineraryItem[] }, { pagination: ItineraryItemsPage["pagination"] }>
  >(withCursorParams(apiEndpoints.trips.itinerary(tripId), params), signal);

  return {
    items: response.data.items,
    pagination: response.meta.pagination
  } satisfies ItineraryItemsPage;
}

export async function getAllItineraryItemsForRoute(tripId: string, signal?: AbortSignal) {
  const items: ItineraryItem[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  let pageCount = 0;

  do {
    if (cursor) {
      if (seenCursors.has(cursor)) {
        throw new Error("Itinerary route data pagination repeated a cursor");
      }
      seenCursors.add(cursor);
    }

    const page = await getItineraryItems(tripId, { cursor, limit: routeDataPageLimit }, signal);

    items.push(...page.items);
    cursor = page.pagination.nextCursor ?? undefined;
    pageCount += 1;

    if (pageCount >= maxRouteDataPages && cursor) {
      throw new Error("Itinerary route data pagination exceeded the safety limit");
    }
  } while (cursor);

  return items;
}

export async function createItineraryItem(tripId: string, payload: CreateItineraryItemPayload) {
  const response = await apiPost<
    ApiSuccessResponse<ItineraryItemMutationResult>,
    CreateItineraryItemPayload
  >(apiEndpoints.trips.itinerary(tripId), payload);

  return response.data;
}

export async function updateItineraryItem(itemId: string, payload: UpdateItineraryItemPayload) {
  const response = await apiPatch<
    ApiSuccessResponse<ItineraryItemMutationResult>,
    UpdateItineraryItemPayload
  >(apiEndpoints.itinerary.item(itemId), payload);

  return response.data;
}

export async function deleteItineraryItem(itemId: string, params?: DeleteItineraryItemQuery) {
  await apiDelete<void>(withDeleteParams(apiEndpoints.itinerary.item(itemId), params));

  return itemId;
}

export async function reorderItineraryItems(tripId: string, payload: ReorderItineraryItemsPayload) {
  const response = await apiPatch<
    ApiSuccessResponse<ReorderItineraryItemsResult>,
    ReorderItineraryItemsPayload
  >(apiEndpoints.trips.reorderItinerary(tripId), payload);

  return response.data;
}
