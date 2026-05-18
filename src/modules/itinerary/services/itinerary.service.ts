import { apiGet, apiPatch } from "@/services/api/request";
import type { ApiResponse } from "@/types/api";

import type { ItineraryStop, ReorderItineraryStopPayload } from "../types/itinerary.types";

export async function getItineraryStops(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiResponse<ItineraryStop[]>>(`/trips/${tripId}/itinerary`, signal);

  return response.data;
}

export async function reorderItineraryStop(tripId: string, payload: ReorderItineraryStopPayload) {
  const response = await apiPatch<ApiResponse<ItineraryStop>, ReorderItineraryStopPayload>(
    `/trips/${tripId}/itinerary/${payload.stopId}/position`,
    payload
  );

  return response.data;
}
