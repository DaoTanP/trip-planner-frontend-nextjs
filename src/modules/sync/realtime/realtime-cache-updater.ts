"use client";

import type { QueryClient } from "@tanstack/react-query";

import { recordActivityEvent } from "@/modules/collaboration/activity.store";
import type { PresenceSocketEvent } from "@/modules/collaboration/types/presence.types";
import { tripKeys } from "@/modules/trips/queries/trip.queries";
import type { TripDetail } from "@/modules/trips/types/trip.types";

import { applyEntityPatch, patchTripRevision } from "../patchers/entity-patchers";
import { syncMutationQueue } from "../queue/mutation-queue";
import { reconcileMutationEvent, reconcileRevisionGap } from "../reconciliation/reconciliation";
import { logSyncDebug } from "../runtime/sync-dev-logger";
import type { EntityPatchPayload, TripMutationEvent } from "../types/sync.types";

type TripUpdatedSocketEvent = Extract<PresenceSocketEvent, { type: "trip.updated" }>;

function parseRevision(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function isNextRevision(currentRevision: string | undefined, incomingRevision: string | undefined) {
  const current = parseRevision(currentRevision);
  const incoming = parseRevision(incomingRevision);

  if (current === null || incoming === null) {
    return false;
  }

  return incoming === current + 1n;
}

function isStaleRevision(
  currentRevision: string | undefined,
  incomingRevision: string | undefined
) {
  const current = parseRevision(currentRevision);
  const incoming = parseRevision(incomingRevision);

  return current !== null && incoming !== null && incoming <= current;
}

function toPatch(event: TripUpdatedSocketEvent): EntityPatchPayload | null {
  if (!event.patch || !event.entityType || !event.revision) {
    return null;
  }

  const payload = event.patch.payload;
  const fields =
    payload?.fields && typeof payload.fields === "object" && !Array.isArray(payload.fields)
      ? (payload.fields as Record<string, unknown>)
      : undefined;
  const tombstone =
    payload?.tombstone && typeof payload.tombstone === "object" && !Array.isArray(payload.tombstone)
      ? (payload.tombstone as Record<string, unknown>)
      : undefined;

  return {
    patchType: event.operation as EntityPatchPayload["patchType"],
    entityType: event.entityType,
    entityId: event.entityId ?? event.patch.entityId ?? "",
    ...(fields ? { fields } : {}),
    ...(tombstone ? { tombstone } : {})
  };
}

export async function applyRealtimeTripUpdate(
  queryClient: QueryClient,
  event: TripUpdatedSocketEvent
) {
  const incomingRevision = event.event?.revision ?? event.revision ?? event.latestRevision;
  const currentRevision = queryClient.getQueryData<TripDetail>(
    tripKeys.detail(event.tripId)
  )?.revision;

  if (event.clientMutationId) {
    syncMutationQueue.acknowledge(event.clientMutationId);
  }

  if (isStaleRevision(currentRevision, incomingRevision)) {
    return;
  }

  if (event.event) {
    recordActivityEvent(event.event);

    if (!currentRevision || isNextRevision(currentRevision, event.event.revision)) {
      reconcileMutationEvent(queryClient, event.event as TripMutationEvent);
      return;
    }

    await reconcileRevisionGap(queryClient, event.tripId, currentRevision);
    return;
  }

  const patch = toPatch(event);

  if (patch && (!currentRevision || isNextRevision(currentRevision, incomingRevision))) {
    applyEntityPatch(queryClient, event.tripId, patch);

    if (incomingRevision) {
      patchTripRevision(queryClient, event.tripId, incomingRevision);
    }

    return;
  }

  if (currentRevision && incomingRevision && currentRevision !== incomingRevision) {
    await reconcileRevisionGap(queryClient, event.tripId, currentRevision);
    return;
  }

  logSyncDebug("Skipped realtime trip update without patchable payload", {
    tripId: event.tripId,
    revision: incomingRevision,
    operation: event.operation
  });
}
