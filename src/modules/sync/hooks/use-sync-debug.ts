"use client";

import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { tripKeys } from "@/modules/trips/queries/trip.queries";
import type { TripDetail } from "@/modules/trips/types/trip.types";

import { syncMutationQueue } from "../queue/mutation-queue";
import type { SyncMutationQueueEntry } from "../types/sync.types";

const emptyQueueSnapshot: SyncMutationQueueEntry[] = [];

export function useSyncDebug(tripId: string) {
  const queryClient = useQueryClient();
  const queueEntries = useSyncExternalStore(
    (listener) => syncMutationQueue.subscribe(listener),
    () => syncMutationQueue.getSnapshot(),
    () => emptyQueueSnapshot
  );
  const trip = queryClient.getQueryData<TripDetail>(tripKeys.detail(tripId));

  return {
    latestRevision: trip?.revision ?? "0",
    queuedMutationCount: syncMutationQueue.getPendingCount(),
    queueEntries
  };
}
