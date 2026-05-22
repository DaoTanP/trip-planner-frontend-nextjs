import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type { ApiSuccessResponse } from "@/types/api";

import type {
  CreateTripNotePayload,
  CreateTripPayload,
  ReorderTripDaysPayload,
  Trip,
  TripDetail,
  TripNote,
  TripsListMeta
} from "../types/trip.types";
import type { UpdateTripRequestDto } from "@/services/api/contracts";

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

export async function getTrip(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<{ trip: TripDetail }>>(
    apiEndpoints.trips.detail(tripId),
    signal
  );

  return response.data.trip;
}

export async function updateTrip(tripId: string, payload: UpdateTripRequestDto) {
  const response = await apiPatch<ApiSuccessResponse<{ trip: TripDetail }>, UpdateTripRequestDto>(
    apiEndpoints.trips.detail(tripId),
    payload
  );

  return response.data.trip;
}

export async function reorderTripDays(tripId: string, payload: ReorderTripDaysPayload) {
  const response = await apiPatch<
    ApiSuccessResponse<{ days: TripDetail["days"]; clientMutationId?: string }>,
    ReorderTripDaysPayload
  >(apiEndpoints.trips.reorderDays(tripId), payload);

  return response.data;
}

export async function createTripNote(tripId: string, payload: CreateTripNotePayload) {
  const response = await apiPost<ApiSuccessResponse<{ note: TripNote }>, CreateTripNotePayload>(
    apiEndpoints.trips.notes(tripId),
    payload
  );

  return response.data.note;
}

export async function deleteTrip(tripId: string) {
  await apiDelete<void>(apiEndpoints.trips.detail(tripId));

  return tripId;
}
