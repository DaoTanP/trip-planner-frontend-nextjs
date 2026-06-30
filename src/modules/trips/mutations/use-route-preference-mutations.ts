"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { syncMutationQueue } from "@/modules/sync/queue/mutation-queue";
import { runQueuedMutation } from "@/modules/sync/runtime/sync-runtime";

import { tripKeys } from "../queries/trip.queries";
import { upsertTripRoutePreference } from "../services/trips.service";
import type {
  TripDetail,
  TripRoutePreference,
  UpsertTripRoutePreferencePayload
} from "../types/trip.types";

type UpsertRoutePreferenceVariables = {
  fromItemId: string;
  toItemId: string;
  payload: UpsertTripRoutePreferencePayload;
};

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

  return queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId))?.revision;
};

const withRoutePreferenceMutationMeta = (
  payload: UpsertTripRoutePreferencePayload,
  queryClient: ReturnType<typeof useQueryClient>,
  tripId: string
): UpsertTripRoutePreferencePayload & { clientMutationId: string } => {
  const nextPayload: UpsertTripRoutePreferencePayload & { clientMutationId: string } = {
    ...payload,
    clientMutationId: payload.clientMutationId ?? crypto.randomUUID()
  };
  const expectedRevision = payload.expectedRevision ?? getUsableTripRevision(queryClient, tripId);

  if (expectedRevision !== undefined) {
    nextPayload.expectedRevision = expectedRevision;
  }

  return nextPayload;
};

const routePreferenceMatchesPair = (
  routePreference: TripRoutePreference,
  fromItemId: string,
  toItemId: string
) => routePreference.fromItemId === fromItemId && routePreference.toItemId === toItemId;

const upsertRoutePreferenceInList = (
  current: TripRoutePreference[] | undefined,
  tripId: string,
  fromItemId: string,
  toItemId: string,
  patch: Pick<TripRoutePreference, "travelMode"> & Partial<TripRoutePreference>
) => {
  const now = new Date().toISOString();
  const routePreferences = current ?? [];
  const existing = routePreferences.find((candidate) =>
    routePreferenceMatchesPair(candidate, fromItemId, toItemId)
  );
  const nextPreference: TripRoutePreference = {
    ...(existing ?? {
      id: `optimistic:${fromItemId}:${toItemId}`,
      tripId,
      fromItemId,
      toItemId,
      version: 0,
      createdAt: now,
      updatedAt: now
    }),
    ...patch,
    tripId,
    fromItemId,
    toItemId,
    travelMode: patch.travelMode,
    version: patch.version ?? (existing?.version ?? 0) + 1,
    createdAt: patch.createdAt ?? existing?.createdAt ?? now,
    updatedAt: patch.updatedAt ?? now
  };

  if (!existing) {
    return [...routePreferences, nextPreference];
  }

  return routePreferences.map((candidate) =>
    routePreferenceMatchesPair(candidate, fromItemId, toItemId) ? nextPreference : candidate
  );
};

export function useUpsertTripRoutePreferenceMutation(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fromItemId, toItemId, payload }: UpsertRoutePreferenceVariables) => {
      const nextPayload = withRoutePreferenceMutationMeta(payload, queryClient, tripId);

      return runQueuedMutation({
        tripId,
        clientMutationId: nextPayload.clientMutationId,
        entityType: "TRIP_ROUTE_PREFERENCE",
        operation: "ENTITY_UPDATED",
        payload: {
          fromItemId,
          toItemId,
          ...nextPayload
        },
        mutationFn: () => upsertTripRoutePreference(tripId, fromItemId, toItemId, nextPayload)
      });
    },
    onMutate: async ({ fromItemId, toItemId, payload }) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.routePreferences(tripId) });
      const previousRoutePreferences = queryClient.getQueryData<TripRoutePreference[]>(
        tripKeys.routePreferences(tripId)
      );

      queryClient.setQueryData<TripRoutePreference[]>(
        tripKeys.routePreferences(tripId),
        (current) =>
          upsertRoutePreferenceInList(current, tripId, fromItemId, toItemId, {
            travelMode: payload.travelMode
          })
      );

      return { previousRoutePreferences };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousRoutePreferences === undefined) {
          queryClient.removeQueries({ queryKey: tripKeys.routePreferences(tripId), exact: true });
        } else {
          queryClient.setQueryData(
            tripKeys.routePreferences(tripId),
            context.previousRoutePreferences
          );
        }
      }
    },
    onSuccess: (result, { fromItemId, toItemId }) => {
      queryClient.setQueryData<TripRoutePreference[]>(
        tripKeys.routePreferences(tripId),
        (current) =>
          upsertRoutePreferenceInList(current, tripId, fromItemId, toItemId, result.routePreference)
      );
      queryClient.setQueryData<TripDetail>(tripKeys.detail(tripId), (current) =>
        current ? { ...current, revision: result.revision } : current
      );
    }
  });
}
