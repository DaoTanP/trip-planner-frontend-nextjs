import type { QueryClient } from "@tanstack/react-query";

import { getMutationEvents } from "../services/sync.service";
import {
  applyEntityPatch,
  parseEntityPatchPayload,
  patchTripRevision
} from "../patchers/entity-patchers";
import { logSyncDebug } from "../runtime/sync-dev-logger";
import type { TripMutationEvent, TripMutationEventsPage } from "../types/sync.types";

export function reconcileMutationEvent(queryClient: QueryClient, event: TripMutationEvent) {
  const patch = parseEntityPatchPayload(event);

  patchTripRevision(queryClient, event.tripId, event.revision);

  if (!patch) {
    logSyncDebug("Skipped mutation event without patch payload", {
      eventId: event.id,
      operation: event.operation
    });
    return;
  }

  applyEntityPatch(queryClient, event.tripId, patch);
}

export async function reconcileRevisionGap(
  queryClient: QueryClient,
  tripId: string,
  sinceRevision: string,
  limit = 100,
  signal?: AbortSignal
): Promise<TripMutationEventsPage> {
  let cursor: string | undefined;
  let latestPage: TripMutationEventsPage = {
    events: [],
    latestRevision: sinceRevision,
    hasMore: false,
    nextCursor: null
  };

  do {
    const page = await getMutationEvents(
      tripId,
      {
        sinceRevision,
        ...(cursor ? { cursor } : {}),
        limit
      },
      signal
    );

    page.events.forEach((event) => reconcileMutationEvent(queryClient, event));
    latestPage = page;
    cursor = page.nextCursor ?? undefined;
  } while (latestPage.hasMore && cursor && !signal?.aborted);

  patchTripRevision(queryClient, tripId, latestPage.latestRevision);

  return latestPage;
}

export function rollbackOptimisticMutation<TRollback>(rollback: TRollback | undefined) {
  return rollback;
}
