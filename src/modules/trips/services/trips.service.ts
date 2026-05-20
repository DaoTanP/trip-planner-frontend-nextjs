import { apiDelete, apiGet, apiPost } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type { ApiSuccessResponse } from "@/types/api";

import type { CreateTripPayload, Trip, TripsListMeta } from "../types/trip.types";

export async function getTrips(signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<Trip[], TripsListMeta>>(
    apiEndpoints.trips.list,
    signal
  );

  return {
    items: response.data,
    pagination: response.meta.pagination
  };
}

export async function createTrip(payload: CreateTripPayload) {
  const response = await apiPost<ApiSuccessResponse<{ trip: Trip }>, CreateTripPayload>(
    apiEndpoints.trips.list,
    payload
  );

  return response.data.trip;
}

export async function deleteTrip(tripId: string) {
  await apiDelete<void>(apiEndpoints.trips.detail(tripId));

  return tripId;
}
