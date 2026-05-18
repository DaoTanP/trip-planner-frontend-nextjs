import { apiDelete, apiGet, apiPost } from "@/services/api/request";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

import type { CreateTripPayload, Trip } from "../types/trip.types";

const tripsPath = "/trips";

export async function getTrips(signal?: AbortSignal) {
  const response = await apiGet<ApiResponse<PaginatedResponse<Trip>>>(tripsPath, signal);

  return response.data.items;
}

export async function createTrip(payload: CreateTripPayload) {
  const response = await apiPost<ApiResponse<Trip>, CreateTripPayload>(tripsPath, payload);

  return response.data;
}

export async function deleteTrip(tripId: string) {
  await apiDelete<ApiResponse<void>>(`${tripsPath}/${tripId}`);

  return tripId;
}
