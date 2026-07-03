import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/services/api/request";
import { apiEndpoints } from "@/services/api/endpoints";
import type { ApiSuccessResponse } from "@/types/api";

import type {
  CreateTripPayload,
  Trip,
  TripCollaborator,
  TripDetail,
  TripMutationEventsPage,
  TripRoutePreference,
  TripsListMeta
} from "../types/trip.types";
import type {
  ListMutationEventsQueryDto,
  OptimizeTripRequestDto,
  PlanningAnalysisResponseDto,
  PlanningEngineResponseDto,
  PlanningInsightsResponseDto,
  PlanningOptimizationResponseDto,
  PlanningRecommendationsResponseDto,
  UpdateTripRequestDto,
  UpsertTripRoutePreferenceRequestDto,
  UpsertTripRoutePreferenceResponseDto
} from "@/services/api/contracts";

function withMutationEventParams(url: string, params?: ListMutationEventsQueryDto) {
  const searchParams = new URLSearchParams();

  if (params?.afterRevision) searchParams.set("afterRevision", params.afterRevision);
  if (params?.sinceRevision) searchParams.set("sinceRevision", params.sinceRevision);
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

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

export async function getTripCollaborators(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<{ collaborators: TripCollaborator[] }>>(
    apiEndpoints.trips.collaborators(tripId),
    signal
  );

  return response.data.collaborators;
}

export async function getTripMutationEvents(
  tripId: string,
  params?: ListMutationEventsQueryDto,
  signal?: AbortSignal
) {
  const response = await apiGet<ApiSuccessResponse<TripMutationEventsPage>>(
    withMutationEventParams(apiEndpoints.trips.mutationEvents(tripId), params),
    signal
  );

  return response.data;
}

export async function getTripRoutePreferences(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<{ routePreferences: TripRoutePreference[] }>>(
    apiEndpoints.trips.routePreferences(tripId),
    signal
  );

  return response.data.routePreferences;
}

export async function getTripPlanningAnalysis(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<PlanningAnalysisResponseDto>>(
    apiEndpoints.trips.analysis(tripId),
    signal
  );

  return response.data.analysis;
}

export async function getTripPlanningRecommendations(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<PlanningRecommendationsResponseDto>>(
    apiEndpoints.trips.recommendations(tripId),
    signal
  );

  return response.data.recommendations;
}

export async function getTripRouteOptimization(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<PlanningOptimizationResponseDto>>(
    apiEndpoints.trips.optimization(tripId),
    signal
  );

  return response.data.optimization;
}

export async function getTripPlanningInsights(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<PlanningInsightsResponseDto>>(
    apiEndpoints.trips.insights(tripId),
    signal
  );

  return response.data.insights;
}

export async function getTripPlanning(tripId: string, signal?: AbortSignal) {
  const response = await apiGet<ApiSuccessResponse<PlanningEngineResponseDto>>(
    apiEndpoints.trips.planning(tripId),
    signal
  );

  return response.data.planning;
}

export async function optimizeTripPreview(tripId: string, payload: OptimizeTripRequestDto) {
  const response = await apiPost<
    ApiSuccessResponse<PlanningOptimizationResponseDto>,
    OptimizeTripRequestDto
  >(apiEndpoints.trips.optimize(tripId), payload);

  return response.data.optimization;
}

export async function upsertTripRoutePreference(
  tripId: string,
  fromItemId: string,
  toItemId: string,
  payload: UpsertTripRoutePreferenceRequestDto
) {
  const response = await apiPut<
    ApiSuccessResponse<UpsertTripRoutePreferenceResponseDto>,
    UpsertTripRoutePreferenceRequestDto
  >(apiEndpoints.trips.routePreference(tripId, fromItemId, toItemId), payload);

  return response.data;
}

export async function deleteTrip(tripId: string) {
  await apiDelete<void>(apiEndpoints.trips.detail(tripId));

  return tripId;
}
